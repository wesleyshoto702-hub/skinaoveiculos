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

