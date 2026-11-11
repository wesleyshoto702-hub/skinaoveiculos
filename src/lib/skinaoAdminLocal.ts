/**
 * Local-only inventory adapter.
 * No authentication, Supabase calls, or public write access.
 * Inventory and image Blobs are stored in this browser's IndexedDB.
 * This DOES NOT publish vehicles to the public website or synchronize devices.
 */
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
  crop_x?: number; crop_y?: number; crop_zoom?: number; crop_rotation?: number;
  cropped_storage_path?: string | null;
};
export type AdminStats = { total: number; published: number; reserved: number; sold: number; demos: number };
export type AdminPage = { vehicles: Vehicle[]; total: number; hasMore: boolean };
export const ADMIN_PAGE_SIZE = 20;

type StoreName = "vehicles" | "photos" | "images";
const DATABASE_NAME = "skinao-admin-local-v1";
const previewUrls = new Map<string, string>();

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("Este navegador não disponibiliza armazenamento local (IndexedDB)."));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("vehicles")) db.createObjectStore("vehicles", { keyPath: "id" });
      if (!db.objectStoreNames.contains("photos")) db.createObjectStore("photos", { keyPath: "id" });
      if (!db.objectStoreNames.contains("images")) db.createObjectStore("images");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Não foi possível abrir o estoque local. Verifique as permissões do navegador."));
    request.onblocked = () => reject(new Error("Feche outras abas do painel e tente novamente."));
  });
}

async function storeRequest<T>(
  name: StoreName, mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(name, mode);
    let value: T;
    const request = operation(transaction.objectStore(name));
    request.onsuccess = () => { value = request.result as T; };
    transaction.oncomplete = () => { db.close(); resolve(value); };
    transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error("Não foi possível salvar os dados locais.")); };
    transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error("Operação local cancelada.")); };
  });
}
const all = <T>(name: StoreName) => storeRequest<T[]>(name, "readonly", store => store.getAll());
const get = <T>(name: StoreName, id: string) =>
  storeRequest<T | undefined>(name, "readonly", store => store.get(id));
const put = (name: StoreName, record: unknown, key?: string) =>
  storeRequest<IDBValidKey>(name, "readwrite", store =>
    key ? store.put(record, key) : store.put(record));
const remove = (name: StoreName, id: string) =>
  storeRequest<undefined>(name, "readwrite", store => store.delete(id));

export async function listVehiclePage(page: number, search: string): Promise<AdminPage> {
  const term = search.trim().toLocaleLowerCase("pt-BR");
  const matching = (await all<Vehicle>("vehicles"))
    .filter(vehicle => !term || [vehicle.brand, vehicle.model, vehicle.version]
      .some(value => value.toLocaleLowerCase("pt-BR").includes(term)))
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id));
  const offset = Math.max(0, page) * ADMIN_PAGE_SIZE;
  return {
    total: matching.length,
    vehicles: matching.slice(offset, offset + ADMIN_PAGE_SIZE),
    hasMore: offset + ADMIN_PAGE_SIZE < matching.length,
  };
}

async function cacheLocalImages(paths: string[]): Promise<void> {
  await Promise.all([...new Set(paths.filter(p => p.startsWith("local/")))].map(async path => {
    if (previewUrls.has(path)) return;
    const image = await get<Blob>("images", path);
    if (image) previewUrls.set(path, URL.createObjectURL(image));
  }));
}
export async function listPhotosForVehicles(ids: string[]): Promise<VehiclePhoto[]> {
  if (!ids.length) return [];
  const selected = new Set(ids);
  const photos = (await all<VehiclePhoto>("photos"))
    .filter(photo => selected.has(photo.vehicle_id))
    .sort((a, b) => a.vehicle_id.localeCompare(b.vehicle_id) ||
      Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order);
  await cacheLocalImages(photos.flatMap(photo =>
    [photo.storage_path, ...(photo.cropped_storage_path ? [photo.cropped_storage_path] : [])]));
  return photos;
}

export async function getAdminStats(): Promise<AdminStats> {
  const vehicles = await all<Vehicle>("vehicles");
  return {
    total: vehicles.length,
    published: vehicles.filter(v => v.is_published && v.status !== "sold").length,
    reserved: vehicles.filter(v => v.status === "reserved").length,
    sold: vehicles.filter(v => v.status === "sold").length,
    demos: vehicles.filter(v => v.is_demo).length,
  };
}
export async function saveVehicle(draft: VehicleDraft, id?: string): Promise<Vehicle> {
  const previous = id ? await get<Vehicle>("vehicles", id) : undefined;
  if (id && !previous) throw new Error("O veículo não foi encontrado neste navegador.");
  const now = new Date().toISOString();
  const vehicle: Vehicle = {
    ...draft, id: id ?? crypto.randomUUID(), demo_source_id: previous?.demo_source_id ?? null,
    created_at: previous?.created_at ?? now, updated_at: now,
  };
  await put("vehicles", vehicle);
  return vehicle;
}
export const deleteVehicle = (id: string) => remove("vehicles", id);

export async function addPhoto(photo: Omit<VehiclePhoto, "id">): Promise<VehiclePhoto> {
  const record = { ...photo, id: crypto.randomUUID() };
  await put("photos", record);
  return record;
}
export const deletePhoto = (id: string) => remove("photos", id);
export async function updatePhoto(
  id: string,
  changes: Partial<Pick<VehiclePhoto, "sort_order" | "crop_x" | "crop_y" | "crop_zoom" | "crop_rotation" | "cropped_storage_path">>,
): Promise<VehiclePhoto> {
  const previous = await get<VehiclePhoto>("photos", id);
  if (!previous) throw new Error("A fotografia não foi encontrada neste navegador.");
  const next = { ...previous, ...changes };
  await put("photos", next);
  return next;
}
export async function setCoverPhoto(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("photos", "readwrite");
    const store = transaction.objectStore("photos");
    const request = store.getAll();
    request.onsuccess = () => {
      const photos = request.result as VehiclePhoto[];
      const selected = photos.find(photo => photo.id === id);
      if (!selected) { transaction.abort(); return; }
      for (const photo of photos) {
        if (photo.vehicle_id !== selected.vehicle_id) continue;
        const shouldCover = photo.id === id;
        if (photo.is_cover !== shouldCover) store.put({ ...photo, is_cover: shouldCover });
      }
    };
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error("Falha ao atualizar a foto de capa.")); };
    transaction.onabort = () => { db.close(); reject(new Error("A fotografia não foi encontrada.")); };
  });
}

export function photoUrl(path: string, externalUrl?: string | null): string {
  if (externalUrl?.startsWith("https://images.unsplash.com/photo-")) return externalUrl;
  return previewUrls.get(path) ?? "/favicon.png";
}
export function displayPhotoUrl(photo: VehiclePhoto): string {
  return photo.cropped_storage_path
    ? photoUrl(photo.cropped_storage_path) : photoUrl(photo.storage_path, photo.external_url);
}
const allowed: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif",
};
export async function uploadPhoto(vehicleId: string, photo: File): Promise<string> {
  if (!allowed[photo.type]) throw new Error("Formato não aceito: utilize JPG, PNG, WebP ou AVIF.");
  if (photo.size > 8 * 1024 * 1024) throw new Error("Cada imagem deve ter até 8 MB.");
  const path = "local/" + vehicleId + "/" + crypto.randomUUID() + "." + allowed[photo.type];
  await put("images", photo, path);
  previewUrls.set(path, URL.createObjectURL(photo));
  return path;
}
export async function removeStoredPhotos(paths: string[]): Promise<void> {
  await Promise.all(paths.filter(p => p.startsWith("local/")).map(async path => {
    await remove("images", path);
    const url = previewUrls.get(path);
    if (url) URL.revokeObjectURL(url);
    previewUrls.delete(path);
  }));
}
