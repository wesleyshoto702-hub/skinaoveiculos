import { SKINAO_SUPABASE_URL as BASE, SKINAO_SUPABASE_PUBLIC_KEY as KEY } from "./skinaoAdminConfig";

/** Read-only public inventory. RLS permits only published, unsold listings. */
type InventoryRow = {
  id: string; brand: string; model: string; version: string; year: number; km: number;
  transmission: string; fuel: string; price: number; type: string; color: string;
  badge: string | null; status: string; features: string[]; is_featured: boolean;
};
type PhotoRow = { vehicle_id: string; storage_path: string; sort_order: number; is_cover: boolean };
export type PublicVehicle = {
  id: string; brand: string; model: string; version: string; year: string;
  km: number; transmission: string; fuel: string; price: number; type: string;
  color: string; badge?: string; photo: string; gallery: string[]; features: string[];
  isFeatured?: boolean;
};
const headers = { apikey: KEY };
const get = async <T,>(path: string): Promise<T> => {
  const response = await fetch(BASE + "/rest/v1/" + path, { headers });
  if (!response.ok) throw new Error("O estoque não pôde ser carregado.");
  return response.json() as Promise<T>;
};
const urlFor = (path: string) => BASE + "/storage/v1/object/public/vehicle-images/" +
  path.split("/").map(encodeURIComponent).join("/");
/** Anonymous users cannot query drafts; no secret keys, sessions or staff info. */
export async function loadPublicVehicles(): Promise<PublicVehicle[]> {
  const [rows, photos] = await Promise.all([
    get<InventoryRow[]>("vehicles?select=id,brand,model,version,year,km,transmission,fuel,price,type,color,badge,status,features,is_featured&is_published=eq.true&status=in.(available,reserved)&order=created_at.desc"),
    get<PhotoRow[]>("vehicle_images?select=vehicle_id,storage_path,sort_order,is_cover&order=sort_order.asc"),
  ]);
  const byVehicle = new Map<string, PhotoRow[]>();
  for (const p of photos) {
    const previous = byVehicle.get(p.vehicle_id) || [];
    previous.push(p);
    byVehicle.set(p.vehicle_id, previous);
  }
  return rows.map(row => {
    const images = (byVehicle.get(row.id) || []).sort((a,b) =>
      Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order);
    const gallery = images.map(p => urlFor(p.storage_path));
    return {
      id: row.id, brand: row.brand, model: row.model, version: row.version,
      year: String(row.year), km: row.km, transmission: row.transmission, fuel: row.fuel,
      price: Number(row.price), type: row.type, color: row.color,
      badge: row.badge || undefined, photo: gallery[0] || "/favicon.png",
      gallery: gallery.length ? gallery : ["/favicon.png"],
      features: row.features ?? [], isFeatured: row.is_featured,
    };
  });
}
