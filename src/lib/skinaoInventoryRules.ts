import { z } from "zod";
import { normalizeAdjustments } from "./skinaoPhotoAdjust";
import type { Vehicle, VehiclePhoto } from "./skinaoInventoryTypes";

export const uuid = z.string().uuid();
export const draftSchema = z.object({
  brand: z.string().trim().min(1).max(100), model: z.string().trim().min(1).max(100),
  version: z.string().max(200), year: z.number().int().min(1900).max(2100),
  km: z.number().int().min(0).max(10000000), price: z.number().finite().positive().max(100000000),
  transmission: z.string().min(1).max(100), fuel: z.string().min(1).max(100),
  type: z.string().min(1).max(100), color: z.string().max(100), description: z.string().max(20000),
  features: z.array(z.string().trim().min(1).max(200)).max(100), badge: z.string().max(100).nullable(),
  status: z.enum(["available", "reserved", "sold"]), is_published: z.boolean(),
  is_featured: z.boolean(), is_demo: z.boolean(),
});
export const PUBLIC_WHERE = "is_published = true AND status IN ('available','reserved') AND is_demo = false";
/** Demonstrative inventory remains visibly labelled and never requires real publication. */
export const DEMO_WHERE = "is_demo = true AND status IN ('available','reserved')";
export function assertPublication(vehicle: Pick<Vehicle, "is_published" | "is_demo" | "status">, photos: VehiclePhoto[]) {
  if (!vehicle.is_published) return;
  if (vehicle.is_demo || vehicle.status === "sold") throw new Error("Exemplos e veículos vendidos não podem ser publicados.");
  if (!photos.length || photos.some(p => p.external_url)) throw new Error("Inclua fotografias reais antes de publicar.");
}
export function safeStoragePath(path: string, vehicleId?: string) {
  const match = /^vehicles\/([0-9a-f-]{36})\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/.exec(path);
  if (!match || (vehicleId && match[1] !== vehicleId)) throw new Error("Caminho de fotografia inválido.");
  return path;
}
export function imageUrl(path: string, base: string) {
  if (!base.startsWith("https://")) throw new Error("Endereço público das fotos não configurado.");
  safeStoragePath(path);
  return base.replace(/\/$/, "") + "/" + path.split("/").map(encodeURIComponent).join("/");
}
export function publicVehicle(vehicle: Vehicle, photos: VehiclePhoto[], base: string) {
  const ordered = [...photos].sort((a,b) => Number(b.is_cover)-Number(a.is_cover) || a.sort_order-b.sort_order || a.id.localeCompare(b.id));
  const gallery = ordered.map(p => {
    if (p.cropped_storage_path) return imageUrl(p.cropped_storage_path, base);
    // Only allow existing Unsplash references for illustrative demo records.
    if (vehicle.is_demo && /^https:\/\/images\.unsplash\.com\/photo-[\w-]+(?:\?[^#]*)?$/.test(p.external_url ?? ""))
      return p.external_url!;
    return imageUrl(p.storage_path, base);
  });
  // PostgreSQL numeric fields are returned as strings by the Neon driver.
  // Convert them before applying image transforms so saved cropping remains visible.
  const galleryEdits = ordered.map(p => normalizeAdjustments({
    crop_x: Number(p.crop_x), crop_y: Number(p.crop_y),
    crop_zoom: Number(p.crop_zoom), crop_rotation: Number(p.crop_rotation),
  }));
  return { id: vehicle.id, brand: vehicle.brand, model: vehicle.model, version: vehicle.version,
    year: String(vehicle.year), km: Number(vehicle.km), price: Number(vehicle.price),
    transmission: vehicle.transmission, fuel: vehicle.fuel, type: vehicle.type, color: vehicle.color,
    features: vehicle.features ?? [], gallery, photo: gallery[0] || "/favicon.png", galleryEdits,
    ...(galleryEdits[0] ? { coverEdits: galleryEdits[0] } : {}),
    ...(vehicle.badge ? { badge: vehicle.badge } : {}),
    ...(vehicle.description?.trim() ? { description: vehicle.description.trim() } : {}),
    isFeatured: vehicle.is_featured, isDemo: vehicle.is_demo };
}