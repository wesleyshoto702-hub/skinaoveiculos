import type { Transport, Statement } from "./skinaoNeonTransport.server";
import { assertPublication, PUBLIC_WHERE, publicVehicle } from "./skinaoInventoryRules";
import type { Vehicle, VehicleDraft, VehiclePhoto } from "./skinaoInventoryTypes";
import type { CatalogFilters } from "./skinaoPublicCatalog";

const VEHICLE_COLUMNS = "id,brand,model,version,year,km,transmission,fuel,type,color,price,description,features,badge,status,is_published,is_featured,is_demo,demo_source_id,created_at,updated_at";
const PHOTO_COLUMNS = "id,vehicle_id,storage_path,alt_text,sort_order,is_cover,external_url,crop_x,crop_y,crop_zoom,crop_rotation,cropped_storage_path";
export function catalogStatement(f: CatalogFilters, page: number, size = 12) {
  const params: unknown[] = [];
  const conditions = [PUBLIC_WHERE];
  const bind = (value: unknown) => { params.push(value); return "$" + params.length; };
  if (f.query.trim()) {
    const term = bind("%" + f.query.trim().replace(/[\\%_]/g, "\\$&") + "%");
    conditions.push(`(brand ILIKE ${term} OR model ILIKE ${term} OR version ILIKE ${term})`);
  }
  for (const col of ["brand","type","transmission"] as const) if (f[col]) conditions.push(`${col} = ${bind(f[col])}`);
  if (Number(f.maxPrice) > 0) conditions.push(`price <= ${bind(Number(f.maxPrice))}`);
  const where = conditions.join(" AND ");
  const order = ({ low:"price ASC,id ASC", high:"price DESC,id ASC", new:"created_at DESC,id DESC" } as Record<string,string>)[f.order] || "is_featured DESC,created_at DESC,id DESC";
  const count: Statement = { query: `SELECT count(*) AS total FROM vehicles WHERE ${where}`, params: [...params] };
  return [count, { query: `SELECT ${VEHICLE_COLUMNS} FROM vehicles WHERE ${where} ORDER BY ${order} LIMIT ${bind(size)} OFFSET ${bind(page*size)}`, params }];
}
export function repository(run: Transport) {
  const rows = async <T>(query: string, params: unknown[] = [], write = false): Promise<T[]> =>
    ((await run([{ query, params }], write))[0]?.rows ?? []) as T[];
  const photos = (ids: string[]) => ids.length ? rows<VehiclePhoto>(`SELECT ${PHOTO_COLUMNS} FROM vehicle_images WHERE vehicle_id = ANY($1::uuid[]) ORDER BY vehicle_id,is_cover DESC,sort_order,id LIMIT 2000`, [ids]) : Promise.resolve([]);
  const getVehicle = async (id: string) => {
    const v = (await rows<Vehicle>(`SELECT ${VEHICLE_COLUMNS} FROM vehicles WHERE id=$1 LIMIT 1`, [id]))[0];
    if (!v) throw new Error("Veículo não encontrado.");
    return v;
  };
  return { rows, photos, getVehicle,
    async catalog(f: CatalogFilters, page: number, base: string) {
      const results = await run(catalogStatement(f,page), false);
      const total = Number(results[0]?.rows[0]?.total ?? 0);
      const vehicles = (results[1]?.rows ?? []) as unknown as Vehicle[];
      const pictures = await photos(vehicles.map(v=>v.id));
      return { total, hasMore: (page+1)*12<total, vehicles: vehicles.map(v=>publicVehicle(v,pictures.filter(p=>p.vehicle_id===v.id),base)) };
    },
    async save(draft: VehicleDraft, id: string) {
      // Database constraint in the statement repeats the publication check atomically.
      assertPublication(draft, await photos([id]));
      const keys = Object.keys(draft) as (keyof VehicleDraft)[];
      const columns = keys.map(k=>'"'+k+'"').join(',');
      const params = [id,...keys.map(k=>draft[k])];
      const values = params.map((_,i)=>'$'+(i+1)).join(',');
      const publishing = params.length+1; params.push(draft.is_published as never);
      const result = await rows<Vehicle>(`INSERT INTO vehicles (id,${columns},created_at,updated_at)
        SELECT ${values},now(),now() WHERE NOT $${publishing}::boolean OR EXISTS
        (SELECT 1 FROM vehicle_images WHERE vehicle_id=$1 AND external_url IS NULL)
        ON CONFLICT(id) DO UPDATE SET ${keys.map(k=>'"'+k+'"=EXCLUDED."'+k+'"').join(',')},updated_at=now()
        RETURNING ${VEHICLE_COLUMNS}`, params, true);
      if (!result[0]) throw new Error("Publicação recusada: inclua fotos reais.");
      return { ...result[0], price:Number(result[0].price) };
    },
  };
}