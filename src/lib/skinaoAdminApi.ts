import { SKINAO_SUPABASE_URL as BASE, SKINAO_SUPABASE_PUBLIC_KEY as KEY } from "./skinaoAdminConfig";

/** The public key is not an administrator credential. Supabase RLS enforces access. */
export type AdminRole = "owner" | "staff";
export type VehicleStatus = "available" | "reserved" | "sold";
export type Vehicle = {
  id: string; brand: string; model: string; version: string; year: number;
  km: number; transmission: string; fuel: string; type: string; color: string;
  price: number; description: string; features: string[]; badge: string | null;
  status: VehicleStatus; is_published: boolean; is_featured: boolean;
  is_demo: boolean; demo_source_id: number | null;
  created_at: string; updated_at: string;
};
export type VehicleDraft = Omit<Vehicle, "id" | "created_at" | "updated_at" | "demo_source_id">;
export type VehiclePhoto = {
  id: string; vehicle_id: string; storage_path: string; alt_text: string;
  sort_order: number; is_cover: boolean; external_url?: string | null;
};
type User = { id: string; email?: string };
export type Session = {
  access_token: string; refresh_token: string; expires_at: number; user: User;
};
type AuthResult = Partial<Session> & { expires_in?: number };
const STORE = "skinao-admin-v1";
const getStored = (): Session | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE);
    if (!raw) return null;
    const v = JSON.parse(raw) as Session;
    return v.access_token && v.refresh_token && v.user?.id && v.expires_at ? v : null;
  } catch { return null; }
};
const persist = (session: Session | null) => {
  if (typeof window === "undefined") return;
  if (!session) sessionStorage.removeItem(STORE);
  else sessionStorage.setItem(STORE, JSON.stringify(session));
};
async function result(response: Response): Promise<any> {
  const body = await response.text();
  let parsed: any = {};
  if (body) { try { parsed = JSON.parse(body); } catch { parsed = { message: body }; } }
  if (!response.ok) throw new Error(String(parsed.msg || parsed.message || parsed.error_description || parsed.error || "Falha no Supabase."));
  return parsed;
}
function asSession(v: AuthResult): Session {
  if (!v.access_token || !v.refresh_token || !v.user?.id) throw new Error("Sessão inválida.");
  return { access_token: v.access_token, refresh_token: v.refresh_token,
    expires_at: v.expires_at || Math.floor(Date.now() / 1000) + (v.expires_in || 3600),
    user: v.user };
}
async function auth(path: string, body: unknown): Promise<AuthResult> {
  return result(await fetch(BASE + "/auth/v1/" + path, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
}
export async function signIn(email: string, password: string) {
  const session = asSession(await auth("token?grant_type=password", { email, password }));
  persist(session);
  return session;
}
export async function signUp(email: string, password: string) {
  const data = await auth("signup", { email, password });
  if (data.access_token) { persist(asSession(data)); return true; }
  return false; // A confirmation email is required.
}
let refreshPending: Promise<Session | null> | null = null;
export async function currentSession(): Promise<Session | null> {
  const existing = getStored();
  if (!existing) return null;
  if (existing.expires_at > Date.now() / 1000 + 60) return existing;
  if (refreshPending) return refreshPending;
  refreshPending = (async () => {
    try {
      const fresh = asSession(await auth("token?grant_type=refresh_token", {
        refresh_token: existing.refresh_token,
      }));
      persist(fresh);
      return fresh;
    } catch {
      persist(null);
      return null;
    } finally { refreshPending = null; }
  })();
  return refreshPending;
}
export async function signOut() {
  const previous = getStored();
  persist(null);
  if (!previous) return;
  try {
    await fetch(BASE + "/auth/v1/logout", {
      method: "POST", headers: { apikey: KEY, Authorization: "Bearer " + previous.access_token },
    });
  } catch { /* Local session has already been cleared. */ }
}
async function secureHeaders(extra: Record<string, string> = {}) {
  const session = await currentSession();
  if (!session) throw new Error("Sessão expirada. Entre novamente.");
  return { apikey: KEY, Authorization: "Bearer " + session.access_token, ...extra };
}
async function db<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(BASE + "/rest/v1/" + path, {
    method,
    headers: await secureHeaders({ "Content-Type": "application/json",
      ...(method === "POST" || method === "PATCH" ? { Prefer: "return=representation" } : {}) }),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return result(response) as Promise<T>;
}
export async function myRole(id: string): Promise<AdminRole | null> {
  const rows = await db<Array<{ role: AdminRole }>>(
    "GET", "admin_users?select=role&user_id=eq." + encodeURIComponent(id),
  );
  return rows[0]?.role ?? null;
}
export const listVehicles = () => db<Vehicle[]>("GET", "vehicles?select=*&order=created_at.desc");
export const listPhotos = () => db<VehiclePhoto[]>("GET", "vehicle_images?select=*&order=sort_order.asc");
export async function saveVehicle(v: VehicleDraft, id?: string): Promise<Vehicle> {
  const rows = await db<Vehicle[]>(id ? "PATCH" : "POST",
    id ? "vehicles?id=eq." + encodeURIComponent(id) : "vehicles", v);
  if (!rows[0]) throw new Error("Veículo não foi salvo.");
  return rows[0];
}
export const deleteVehicle = (id: string) =>
  db<void>("DELETE", "vehicles?id=eq." + encodeURIComponent(id));
export const addPhoto = (row: Omit<VehiclePhoto, "id">) => db("POST", "vehicle_images", row);
export const deletePhoto = (id: string) =>
  db<void>("DELETE", "vehicle_images?id=eq." + encodeURIComponent(id));
export function photoUrl(path: string, externalUrl?: string | null) {
  // Existing illustrative images were hosted on Unsplash, not in Supabase Storage.
  if (externalUrl?.startsWith("https://images.unsplash.com/photo-")) return externalUrl;
  return BASE + "/storage/v1/object/public/vehicle-images/" +
    path.split("/").map(encodeURIComponent).join("/");
}
const allowed: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif",
};
export async function uploadPhoto(vehicleId: string, photo: File): Promise<string> {
  if (!allowed[photo.type]) throw new Error("Formato não aceito: utilize JPG, PNG, WebP ou AVIF.");
  if (photo.size > 8 * 1024 * 1024) throw new Error("Cada imagem deve ter até 8 MB.");
  const path = "vehicles/" + vehicleId + "/" + crypto.randomUUID() + "." + allowed[photo.type];
  const upload = await fetch(BASE + "/storage/v1/object/vehicle-images/" + path, {
    method: "POST",
    headers: await secureHeaders({ "Content-Type": photo.type, "x-upsert": "false" }),
    body: photo,
  });
  await result(upload);
  return path;
}
export async function removeStoredPhotos(paths: string[]): Promise<void> {
  // Illustrative references have no corresponding object in Supabase Storage.
  const storagePaths = paths.filter(path => path.startsWith("vehicles/"));
  if (!storagePaths.length) return;
  const response = await fetch(BASE + "/storage/v1/object/vehicle-images", {
    method: "DELETE",
    headers: await secureHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ prefixes: storagePaths }),
  });
  await result(response);
}
