/** Chooses local or authorized remote inventory. Remote errors NEVER fall back to local writes. */
import * as local from "./skinaoAdminLocal";
import { inventoryRequest, uploadInventoryPhoto } from "./skinaoInventory.functions";
import type { AdminPage, AdminStats, Vehicle, VehicleDraft, VehiclePhoto } from "./skinaoInventoryTypes";
export * from "./skinaoInventoryTypes";
let remote = false;
const urls = new Map<string,string>();
export function setRemoteInventory(value: boolean) { remote=value; urls.clear(); }
async function request<T>(data: Parameters<typeof inventoryRequest>[0]["data"]): Promise<T> {
  return (await inventoryRequest({ data })).value as T;
}
export const listVehiclePage = (page: number, search: string): Promise<AdminPage> => remote ? request({ action:"list",page,search }) : local.listVehiclePage(page,search);
export const getAdminStats = (): Promise<AdminStats> => remote ? request({ action:"stats" }) : local.getAdminStats();
export async function listPhotosForVehicles(ids: string[]): Promise<VehiclePhoto[]> {
  if (!remote) return local.listPhotosForVehicles(ids);
  const photos = await request<(VehiclePhoto & { public_url:string; cropped_url:string|null })[]>({ action:"photos",ids });
  for (const p of photos) { urls.set(p.storage_path,p.public_url); if(p.cropped_storage_path && p.cropped_url) urls.set(p.cropped_storage_path,p.cropped_url); }
  return photos;
}
export const saveVehicle = (draft: VehicleDraft, id?: string): Promise<Vehicle> => remote ? request({ action:"save",draft,...(id ? {id} : {}) }) : local.saveVehicle(draft,id);
export const deleteVehicle = (id: string) => remote ? request<void>({ action:"deleteVehicle",id }) : local.deleteVehicle(id);
export const addPhoto = (photo: Omit<VehiclePhoto,"id">): Promise<VehiclePhoto> => remote ? request({ action:"addPhoto",photo }) : local.addPhoto(photo);
export const deletePhoto = (id: string) => remote ? request<void>({ action:"deletePhoto",id }) : local.deletePhoto(id);
export const setCoverPhoto = (id: string) => remote ? request<void>({ action:"cover",id }) : local.setCoverPhoto(id);
export const updatePhoto = (id: string, changes: Parameters<typeof local.updatePhoto>[1]): Promise<VehiclePhoto> => remote ? request({ action:"updatePhoto",id,changes }) : local.updatePhoto(id,changes);
export async function uploadPhoto(vehicleId: string, file: File) {
  if (!remote) return local.uploadPhoto(vehicleId,file);
  const data = new FormData(); data.set("vehicleId",vehicleId); data.set("file",file);
  return uploadInventoryPhoto({ data });
}
export const removeStoredPhotos = (paths: string[]) => remote ? request<void>({ action:"removeStored",paths }) : local.removeStoredPhotos(paths);
export function photoUrl(path: string, externalUrl?: string|null) { return remote ? urls.get(path) ?? "/favicon.png" : local.photoUrl(path,externalUrl); }
export function displayPhotoUrl(photo: VehiclePhoto) { return photoUrl(photo.cropped_storage_path || photo.storage_path,photo.cropped_storage_path ? null : photo.external_url); }
