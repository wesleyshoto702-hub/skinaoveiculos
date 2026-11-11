import { createHash } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { adminSession, authRevision, passwordMatches, requireAdmin } from "./skinaoAuth.server";
import { neonTransport, neonTransportReady } from "./skinaoNeonTransport.server";
import { repository } from "./skinaoRepository.server";
import { storage } from "./skinaoStorage.server";
import { draftSchema, uuid, safeStoragePath, PUBLIC_WHERE, DEMO_WHERE, imageUrl } from "./skinaoInventoryRules";
import type { VehiclePhoto } from "./skinaoInventoryTypes";

const filters = z.object({ query:z.string().max(100), brand:z.string().max(100), type:z.string().max(100),
  transmission:z.string().max(100), maxPrice:z.string().max(30), order:z.enum(["featured","low","high","new"]) });
const page = z.number().int().min(0).max(100000);
const photoSchema = z.object({ vehicle_id:uuid, storage_path:z.string().max(300), alt_text:z.string().max(300),
  sort_order:z.number().int().min(0).max(1000), is_cover:z.boolean(), external_url:z.string().nullable().optional() });
const changesSchema = z.object({ sort_order:z.number().int().min(0).max(1000).optional(), crop_x:z.number().min(0).max(100).optional(),
  crop_y:z.number().min(0).max(100).optional(), crop_zoom:z.number().min(100).max(250).optional(),
  crop_rotation:z.union([z.literal(0),z.literal(90),z.literal(180),z.literal(270)]).optional(),
  cropped_storage_path:z.string().max(300).nullable().optional() });

export const getInventoryMode = createServerFn({ method:"GET" }).handler(async () => {
  const key = process.env['SKINAO_ADMIN_ACCESS_KEY'];
  const secret = process.env['SKINAO_SESSION_SECRET'];
  const configured = neonTransportReady && Boolean(process.env['DATABASE_URL']);
  let unlocked = false;
  if (key && secret) {
    try {
      const session = await requireAdmin(key, secret);
      unlocked = true;
      // Reissue the signed HttpOnly cookie so an active trusted browser stays unlocked.
      // Clearing cookies, revoking the key or using "Bloquear edição" still ends access.
      await session.update({ unlocked: true, revision: authRevision(key) });
    } catch { /* locked or cookies unavailable */ }
  }
  setResponseHeader("Cache-Control","no-store");
  return { configured, unlocked:configured && unlocked,
    storageConfigured:Boolean(process.env['AWS_ENDPOINT_URL_S3'] && process.env['AWS_REGION'] && process.env['AWS_ACCESS_KEY_ID'] && process.env['AWS_SECRET_ACCESS_KEY']) };
});
/** Single administrator sign-in. Password stays server-side, never in the JS bundle.
 * Login attempt throttling is persisted in PostgreSQL across serverless invocations.
 */
const signInSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(1024),
});
export const loginInventory = createServerFn({ method:"POST" }).inputValidator(signInSchema)
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    const expectedUser = process.env["SKINAO_ADMIN_USERNAME"] || "admin";
    const expectedPassword = process.env["SKINAO_ADMIN_ACCESS_KEY"];
    const secret = process.env["SKINAO_SESSION_SECRET"];
    if (!expectedPassword || !secret || !process.env["DATABASE_URL"])
      return { ok:false, reason:"unavailable" as const };

    // Use the trusted reverse-proxy IP if present. Never store IPs or passwords.
    const headers = getRequest().headers;
    const source = (headers.get("x-vercel-forwarded-for")
      || headers.get("x-real-ip")
      || headers.get("x-forwarded-for")
      || "unknown").split(",")[0].trim().slice(0,128);
    const fingerprint = createHash("sha256").update(secret + ":" + source).digest("hex");
    try {
      const repo = repository(neonTransport);
      const recent = await repo.rows<{ attempt_count:number }>(
        `INSERT INTO skinao_admin_login_limits (fingerprint,attempt_count,window_started)
           VALUES ($1,1,now())
         ON CONFLICT (fingerprint) DO UPDATE
           SET attempt_count = CASE
             WHEN skinao_admin_login_limits.window_started < now() - interval '15 minutes' THEN 1
             ELSE skinao_admin_login_limits.attempt_count + 1 END,
             window_started = CASE
             WHEN skinao_admin_login_limits.window_started < now() - interval '15 minutes' THEN now()
             ELSE skinao_admin_login_limits.window_started END
         RETURNING attempt_count`,
        [fingerprint], true
      );
      const blocked = Number(recent[0]?.attempt_count ?? 99) > 10;
      // Evaluate both comparisons even if one fails, to avoid leaking the username.
      const userValid = passwordMatches(data.username, expectedUser);
      const passwordValid = passwordMatches(data.password, expectedPassword);
      if (blocked || !userValid || !passwordValid) return { ok:false, reason:"invalid" as const };
      const session = await adminSession(secret);
      await session.update({ unlocked:true, revision:authRevision(expectedPassword) });
      await repo.rows("DELETE FROM skinao_admin_login_limits WHERE fingerprint=$1", [fingerprint], true);
      return { ok:true, reason:"success" as const };
    } catch (error) {
      console.error("Admin login unavailable", error);
      return { ok:false, reason:"unavailable" as const };
    }
  });

export const logoutInventory = createServerFn({ method:"POST" }).handler(async () => {
  const secret = process.env["SKINAO_SESSION_SECRET"];
  if (secret) await (await adminSession(secret)).clear();
  setResponseHeader("Cache-Control","no-store");
  return { ok:true };
});

export const publicCatalog = createServerFn({ method:"GET" }).inputValidator(z.object({ filters, page })).handler(async ({ data }) => {
  if (!neonTransportReady || !process.env['DATABASE_URL']) return { fallback:true, vehicles:[], total:0, hasMore:false };
  try {
    const repo = repository(neonTransport);
    const base = process.env['SKINAO_IMAGES_PUBLIC_URL'] ?? "https://br-wandering-mountain-besgf38z.storage.c-9.us-east-2.aws.neon.tech/vehicle-images";
    // Prefer published real inventory. When there is none, use the editable
    // demonstrative records from Neon; keep the hard-coded examples only as a last fallback.
    // The global decision must not change when a visitor applies filters or pagination.
    const availability = (await repo.rows<{ real:string; demos:string }>(
      `SELECT count(*) FILTER (WHERE ${PUBLIC_WHERE}) AS real,
              count(*) FILTER (WHERE ${DEMO_WHERE}) AS demos FROM vehicles`))[0];
    const hasReal = Number(availability?.real) > 0;
    const hasDemo = Number(availability?.demos) > 0;
    // Once connected, the database is authoritative: deleting all records must
    // not silently resurrect the six hard-coded example cards.
    if (!hasReal && !hasDemo) return { fallback:false, vehicles:[], total:0, hasMore:false };
    return { fallback:false, ...await repo.catalog(data.filters,data.page,base,!hasReal) };
  } catch (error) {
    console.error("Catalog request failed", error);
    throw new Error("Não foi possível consultar o estoque real. Tente novamente.");
  }
});
export const publicFacets = createServerFn({ method:"GET" }).handler(async () => {
  if (!neonTransportReady || !process.env['DATABASE_URL']) return { isDemo:true, brands:[],types:[],transmissions:[] };
  const repo = repository(neonTransport);
  const availability = (await repo.rows<{ total:string }>(
    `SELECT count(*) AS total FROM vehicles WHERE ${PUBLIC_WHERE}`))[0];
  const isDemo = !Number(availability?.total);
  const where = isDemo ? DEMO_WHERE : PUBLIC_WHERE;
  const result = await repo.rows<{ brands:string[];types:string[];transmissions:string[] }>(
    `SELECT array_agg(DISTINCT brand ORDER BY brand) AS brands,
       array_agg(DISTINCT type ORDER BY type) AS types,
       array_agg(DISTINCT transmission ORDER BY transmission) AS transmissions
     FROM vehicles WHERE ${where}`);
  const r = result[0];
  return { isDemo, brands:r?.brands ?? [], types:r?.types ?? [], transmissions:r?.transmissions ?? [] };
});

const requestSchema = z.discriminatedUnion("action",[
  z.object({ action:z.literal("list"), page, search:z.string().max(100) }),
  z.object({ action:z.literal("stats") }),
  z.object({ action:z.literal("photos"), ids:z.array(uuid).max(20) }),
  z.object({ action:z.literal("save"), id:uuid.optional(), draft:draftSchema }),
  z.object({ action:z.literal("deleteVehicle"), id:uuid }),
  z.object({ action:z.literal("addPhoto"), photo:photoSchema }),
  z.object({ action:z.literal("deletePhoto"), id:uuid }),
  z.object({ action:z.literal("cover"), id:uuid }),
  z.object({ action:z.literal("updatePhoto"), id:uuid, changes:changesSchema }),
  z.object({ action:z.literal("removeStored"), paths:z.array(z.string().max(300)).max(100) }),
]);
export const inventoryRequest = createServerFn({ method:"POST" }).inputValidator(requestSchema).handler(async ({ data }) => {
  await requireAdmin(process.env['SKINAO_ADMIN_ACCESS_KEY'],process.env['SKINAO_SESSION_SECRET']);
  const repo = repository(neonTransport);
  const s3 = () => storage({ endpoint:process.env['AWS_ENDPOINT_URL_S3'] ?? "", region:process.env['AWS_REGION'] ?? "",
    accessKeyId:process.env['AWS_ACCESS_KEY_ID'] ?? "", secretAccessKey:process.env['AWS_SECRET_ACCESS_KEY'] ?? "" });
  const getPhoto = async (id: string) => {
    const p = (await repo.rows<VehiclePhoto>("SELECT * FROM vehicle_images WHERE id=$1 LIMIT 1",[id]))[0];
    if (!p) throw new Error("Fotografia não encontrada.");
    return p;
  };
  const result = (value: unknown) => ({ value });
  try {
    switch (data.action) {
      case "list": {
        const term = "%"+data.search.trim().replace(/[\\%_]/g,"\\$&")+"%";
        const results = await neonTransport([
          { query:"SELECT count(*) AS total FROM vehicles WHERE brand ILIKE $1 OR model ILIKE $1 OR version ILIKE $1",params:[term] },
          { query:"SELECT * FROM vehicles WHERE brand ILIKE $1 OR model ILIKE $1 OR version ILIKE $1 ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET $2",params:[term,data.page*20] },
        ],false);
        const total = Number(results[0]?.rows[0]?.total ?? 0);
        return result({ vehicles:(results[1]?.rows ?? []).map(v=>({...v,price:Number(v.price)})), total, hasMore:(data.page+1)*20<total });
      }
      case "stats": {
        const r = (await repo.rows<Record<string,string>>(`SELECT count(*) AS total,
          count(*) FILTER (WHERE is_published AND status!='sold') AS published,count(*) FILTER (WHERE status='reserved') AS reserved,
          count(*) FILTER (WHERE status='sold') AS sold,count(*) FILTER (WHERE is_demo) AS demos FROM vehicles`))[0] ?? {};
        return result(Object.fromEntries(Object.entries(r).map(([k,v])=>[k,Number(v)])));
      }
      case "photos": {
        const base = process.env['SKINAO_IMAGES_PUBLIC_URL'] ?? "https://br-wandering-mountain-besgf38z.storage.c-9.us-east-2.aws.neon.tech/vehicle-images";
        return result((await repo.photos(data.ids)).map(p=>({...p,
          crop_x:Number(p.crop_x), crop_y:Number(p.crop_y),
          crop_zoom:Number(p.crop_zoom), crop_rotation:Number(p.crop_rotation),
          public_url:p.external_url?.startsWith("https://images.unsplash.com/photo-") ? p.external_url : imageUrl(p.storage_path,base),
          cropped_url:p.cropped_storage_path ? imageUrl(p.cropped_storage_path,base) : null })));
      }
      case "save": return result(await repo.save(data.draft,data.id ?? crypto.randomUUID()));
      case "deleteVehicle": {
        const existing = await repo.getVehicle(data.id);
        const oldPhotos = await repo.photos([existing.id]);
        // Vehicle photos are deleted in PostgreSQL by ON DELETE CASCADE.
        const deleted = await repo.rows<{ id:string }>(
          "DELETE FROM vehicles WHERE id=$1 RETURNING id", [data.id], true
        );
        if (!deleted.length) throw new Error("Veículo não encontrado. Atualize o estoque.");
        // Never attempt to delete illustrative external photos from our S3 bucket.
        const ownPaths = [...new Set(oldPhotos.flatMap(p => [
          ...(p.external_url ? [] : [p.storage_path]),
          ...(p.cropped_storage_path ? [p.cropped_storage_path] : []),
        ]))];
        let cleanupFailed = 0;
        // Limit concurrency so removing a photo-heavy vehicle does not overload S3.
        for (let i=0; i<ownPaths.length; i+=5) {
          const results = await Promise.allSettled(ownPaths.slice(i,i+5).map(path => s3().remove(path)));
          cleanupFailed += results.filter(r=>r.status==="rejected").length;
        }
        if (cleanupFailed) console.error("Some orphaned vehicle photos could not be removed", { vehicleId:data.id, cleanupFailed });
        return result({ cleanupFailed });
      }
      case "addPhoto": {
        if (data.photo.external_url) throw new Error("Fotografias ilustrativas não podem ser adicionadas ao estoque real.");
        safeStoragePath(data.photo.storage_path,data.photo.vehicle_id);
        await repo.getVehicle(data.photo.vehicle_id);
        await s3().verify(data.photo.storage_path,data.photo.vehicle_id);
        const count = await repo.rows<{ total:string }>("SELECT count(*) AS total FROM vehicle_images WHERE vehicle_id=$1",[data.photo.vehicle_id]);
        if (Number(count[0]?.total)>=100) throw new Error("Limite de 100 fotografias por veículo.");
        const p = data.photo;
        // The cover is switched separately in a transaction; first image becomes cover.
        const added = (await repo.rows<VehiclePhoto>(`INSERT INTO vehicle_images
          (id,vehicle_id,storage_path,alt_text,sort_order,is_cover,created_at) VALUES ($1,$2,$3,$4,$5,
          NOT EXISTS(SELECT 1 FROM vehicle_images WHERE vehicle_id=$2),now()) RETURNING *`,
          [crypto.randomUUID(),p.vehicle_id,p.storage_path,p.alt_text,p.sort_order],true))[0];
        if (!added) throw new Error("Não foi possível cadastrar a fotografia.");
        return result(added);
      }
      case "cover": {
        const p = await getPhoto(data.id);
        await neonTransport([
          {query:"SELECT id FROM vehicles WHERE id=$1 FOR UPDATE",params:[p.vehicle_id]},
          {query:"UPDATE vehicle_images SET is_cover=false WHERE vehicle_id=$1 AND is_cover",params:[p.vehicle_id]},
          {query:"UPDATE vehicle_images SET is_cover=true WHERE id=$1",params:[p.id]},
        ],true);
        return result(null);
      }
      case "updatePhoto": {
        const p = await getPhoto(data.id);
        if (data.changes.cropped_storage_path) {
          safeStoragePath(data.changes.cropped_storage_path,p.vehicle_id);
          await s3().verify(data.changes.cropped_storage_path,p.vehicle_id);
        }
        const keys = Object.keys(data.changes) as (keyof typeof data.changes)[];
        if (!keys.length) return result(p);
        return result((await repo.rows<VehiclePhoto>(`UPDATE vehicle_images SET ${keys.map((k,i)=>'"'+k+'"=$'+(i+2)).join(',')} WHERE id=$1 RETURNING *`,[p.id,...keys.map(k=>data.changes[k])],true))[0]);
      }
      case "deletePhoto": {
        const p = await getPhoto(data.id);
        // Unpublish atomically if removing the last photograph; original object deleted later.
        await neonTransport([
          {query:"SELECT id FROM vehicles WHERE id=$1 FOR UPDATE",params:[p.vehicle_id]},
          {query:"DELETE FROM vehicle_images WHERE id=$1",params:[p.id]},
          {query:"UPDATE vehicles SET is_published=false,updated_at=now() WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM vehicle_images WHERE vehicle_id=$1)",params:[p.vehicle_id]},
          {query:"UPDATE vehicle_images SET is_cover=true WHERE id=(SELECT id FROM vehicle_images WHERE vehicle_id=$1 ORDER BY sort_order,id LIMIT 1) AND NOT EXISTS(SELECT 1 FROM vehicle_images WHERE vehicle_id=$1 AND is_cover)",params:[p.vehicle_id]},
        ],true);
        return result(null);
      }
      case "removeStored": {
        for (const path of data.paths) {
          safeStoragePath(path);
          const refs = await repo.rows("SELECT id FROM vehicle_images WHERE storage_path=$1 OR cropped_storage_path=$1 LIMIT 1",[path]);
          if (refs.length) throw new Error("A imagem ainda está em uso; remova sua referência antes de excluí-la.");
          await s3().remove(path);
        }
        return result(null);
      }
    }
  } catch (error) {
    console.error("Inventory operation failed",error);
    throw error instanceof Error ? error : new Error("Não foi possível concluir a operação.");
  }
});
export const uploadInventoryPhoto = createServerFn({ method:"POST" }).inputValidator((v: unknown) => {
  if (!(v instanceof FormData)) throw new Error("Arquivo inválido."); return v;
}).handler(async ({ data }) => {
  await requireAdmin(process.env['SKINAO_ADMIN_ACCESS_KEY'],process.env['SKINAO_SESSION_SECRET']);
  const vehicleId = uuid.parse(data.get("vehicleId"));
  await repository(neonTransport).getVehicle(vehicleId);
  const file = data.get("file");
  if (!file || typeof file === "string" || file.size>8*1024*1024) throw new Error("Selecione uma fotografia até 8 MB.");
  const s3 = storage({ endpoint:process.env['AWS_ENDPOINT_URL_S3'] ?? "", region:process.env['AWS_REGION'] ?? "",
    accessKeyId:process.env['AWS_ACCESS_KEY_ID'] ?? "", secretAccessKey:process.env['AWS_SECRET_ACCESS_KEY'] ?? "" });
  try { return await s3.upload(vehicleId,new Uint8Array(await file.arrayBuffer()),file.type); }
  catch (error) { console.error("Photo upload failed",error); throw new Error("Não foi possível enviar a fotografia. Verifique o armazenamento e tente novamente."); }
});