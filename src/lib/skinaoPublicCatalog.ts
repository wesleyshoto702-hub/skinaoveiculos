import { SKINAO_SUPABASE_URL as BASE, SKINAO_SUPABASE_PUBLIC_KEY as KEY } from "./skinaoAdminConfig";
import { normalizeAdjustments, type PhotoAdjustments } from "./skinaoPhotoAdjust";

/** Fetch 12 listings per page, and fetch only the photos for that page. */
export const CATALOG_PAGE_SIZE = 12;
const PHOTO_BATCH_SIZE = 500;

type InventoryRow = {
  id: string; brand: string; model: string; version: string; description: string | null; year: number; km: number;
  transmission: string; fuel: string; price: number; type: string; color: string;
  badge: string | null; status: string; features: string[]; is_featured: boolean; is_demo: boolean;
};
type PhotoRow = {
  vehicle_id: string; storage_path: string; external_url: string | null;
  sort_order: number; is_cover: boolean;
  crop_x: number; crop_y: number; crop_zoom: number; crop_rotation: number;
  cropped_storage_path: string | null;
};
export type PublicVehicle = {
  id: string; brand: string; model: string; version: string; year: string;
  km: number; transmission: string; fuel: string; price: number; type: string;
  color: string; badge?: string; description?: string; photo: string; gallery: string[]; features: string[];
  coverEdits?: PhotoAdjustments; galleryEdits?: PhotoAdjustments[];
  isFeatured?: boolean; isDemo?: boolean;
};
export type CatalogFacets = {
  isDemo: boolean; brands: string[]; types: string[]; transmissions: string[];
};
export type CatalogFilters = {
  query: string; brand: string; type: string; transmission: string; maxPrice: string; order: string;
};
export type CatalogPage = { vehicles: PublicVehicle[]; total: number; hasMore: boolean };

const urlFor = (photo: PhotoRow) => {
  const cropped = photo.cropped_storage_path;
  if (cropped) return BASE + "/storage/v1/object/public/vehicle-images/" +
    cropped.split("/").map(encodeURIComponent).join("/");
  return photo.external_url?.startsWith("https://images.unsplash.com/photo-")
    ? photo.external_url
    : BASE + "/storage/v1/object/public/vehicle-images/" +
      photo.storage_path.split("/").map(encodeURIComponent).join("/");
};

const api = async (path: string, extraHeaders: Record<string, string> = {}): Promise<Response> => {
  const response = await fetch(BASE + "/rest/v1/" + path, {
    headers: { apikey: KEY, ...extraHeaders },
  });
  if (!response.ok) throw new Error("Não foi possível carregar o catálogo da Skinão.");
  return response;
};

/**
 * SECURITY INVOKER RPC: only published, unsold vehicles exposed by RLS are visible.
 * Facets come from the full catalog, not only the currently visible page.
 */
export async function loadCatalogFacets(): Promise<CatalogFacets> {
  const response = await api("rpc/skinao_catalog_facets");
  const value = await response.json() as CatalogFacets;
  return {
    isDemo: Boolean(value.isDemo),
    brands: Array.isArray(value.brands) ? value.brands : [],
    types: Array.isArray(value.types) ? value.types : [],
    transmissions: Array.isArray(value.transmissions) ? value.transmissions : [],
  };
}

const sortFor = (order: string) => {
  if (order === "low") return "price.asc,id.asc";
  if (order === "high") return "price.desc,id.asc";
  if (order === "new") return "created_at.desc,id.asc";
  return "is_featured.desc,created_at.desc,id.asc";
};

function buildVehicleParams(filters: CatalogFilters, page: number, isDemo: boolean): URLSearchParams {
  const p = new URLSearchParams({
    select: "id,brand,model,version,description,year,km,transmission,fuel,price,type,color,badge,status,features,is_featured,is_demo",
    is_published: "eq.true",
    status: "in.(available,reserved)",
    is_demo: "eq." + String(isDemo),
    order: sortFor(filters.order),
    limit: String(CATALOG_PAGE_SIZE + 1),
    offset: String(Math.max(0, page) * CATALOG_PAGE_SIZE),
  });
  // Strip PostgREST filter punctuation from text entered by the visitor.
  const term = filters.query.trim().slice(0, 100).replace(/[,()*%".\\]/g, " ").replace(/\s+/g, " ").trim();
  if (term) p.set("or", "(brand.ilike.*" + term + "*,model.ilike.*" + term + "*,version.ilike.*" + term + "*)");
  if (filters.brand) p.set("brand", "eq." + filters.brand);
  if (filters.type) p.set("type", "eq." + filters.type);
  if (filters.transmission) p.set("transmission", "eq." + filters.transmission);
  if (filters.maxPrice && Number(filters.maxPrice) > 0)
    p.set("price", "lte." + Number(filters.maxPrice));
  return p;
}

async function photosForVisibleVehicles(ids: string[]): Promise<PhotoRow[]> {
  if (!ids.length) return [];
  const photos: PhotoRow[] = [];
  // Include only this page's IDs. Batch photo metadata to avoid Supabase's default 1000-row cap.
  for (let offset = 0; ; offset += PHOTO_BATCH_SIZE) {
    const p = new URLSearchParams({
      select: "vehicle_id,storage_path,external_url,sort_order,is_cover,crop_x,crop_y,crop_zoom,crop_rotation,cropped_storage_path",
      vehicle_id: "in.(" + ids.join(",") + ")",
      order: "vehicle_id.asc,is_cover.desc,sort_order.asc",
      limit: String(PHOTO_BATCH_SIZE),
      offset: String(offset),
    });
    const rows = await (await api("vehicle_images?" + p)).json() as PhotoRow[];
    photos.push(...rows);
    if (rows.length < PHOTO_BATCH_SIZE) break;
  }
  return photos;
}

export async function loadPublicVehiclesPage(
  filters: CatalogFilters, page: number, isDemo: boolean,
): Promise<CatalogPage> {
  const response = await api("vehicles?" + buildVehicleParams(filters, page, isDemo), { Prefer: "count=exact" });
  const rows = await response.json() as InventoryRow[];
  const visibleRows = rows.slice(0, CATALOG_PAGE_SIZE);
  const range = response.headers.get("content-range")?.split("/")[1];
  const count = range !== undefined && range !== "*" ? Number(range) : NaN;
  const hasMore = Number.isFinite(count)
    ? (page + 1) * CATALOG_PAGE_SIZE < count : rows.length > CATALOG_PAGE_SIZE;
  const total = Number.isFinite(count)
    ? count : page * CATALOG_PAGE_SIZE + visibleRows.length + (hasMore ? 1 : 0);
  const photos = await photosForVisibleVehicles(visibleRows.map(row => row.id));
  const byVehicle = new Map<string, PhotoRow[]>();
  for (const photo of photos) {
    const previous = byVehicle.get(photo.vehicle_id) ?? [];
    previous.push(photo);
    byVehicle.set(photo.vehicle_id, previous);
  }
  return {
    total, hasMore,
    vehicles: visibleRows.map(row => {
      const ordered = (byVehicle.get(row.id) ?? []).sort((a, b) =>
        Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order);
      const gallery = ordered.map(urlFor);
      const galleryEdits = ordered.map(normalizeAdjustments);
      return {
        id: row.id, brand: row.brand, model: row.model, version: row.version,
        description: row.description?.trim() || undefined,
        year: String(row.year), km: row.km, transmission: row.transmission,
        fuel: row.fuel, price: Number(row.price), type: row.type, color: row.color,
        badge: row.badge || undefined, photo: gallery[0] || "/favicon.png",
        gallery: gallery.length ? gallery : ["/favicon.png"],
        coverEdits: galleryEdits[0], galleryEdits,
        features: row.features ?? [], isFeatured: row.is_featured, isDemo: row.is_demo,
      };
    }),
  };
}
