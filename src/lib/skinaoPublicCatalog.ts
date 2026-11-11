import { publicCatalog, publicFacets } from "./skinaoInventory.functions";
import type { PhotoAdjustments } from "./skinaoPhotoAdjust";
export const CATALOG_PAGE_SIZE = 12;
export type PublicVehicle = {
  id:string; brand:string; model:string; version:string; year:string; km:number; transmission:string;
  fuel:string; price:number; type:string; color:string; badge?:string; description?:string;
  photo:string; gallery:string[]; features:string[]; coverEdits?:PhotoAdjustments;
  galleryEdits?:PhotoAdjustments[]; isFeatured?:boolean; isDemo?:boolean;
};
export type CatalogFacets = { isDemo:boolean; brands:string[]; types:string[]; transmissions:string[] };
export type CatalogFilters = { query:string; brand:string; type:string; transmission:string; maxPrice:string; order:string };
export type CatalogPage = { vehicles:PublicVehicle[]; total:number; hasMore:boolean; fallback?:boolean };
export const loadCatalogFacets = () => publicFacets();
export async function loadPublicVehiclesPage(filters:CatalogFilters,page:number,_isDemo=false): Promise<CatalogPage> {
  const order = ["featured","low","high","new"].includes(filters.order) ? filters.order : "featured";
  return publicCatalog({ data:{ filters:{ ...filters,order:order as "featured"|"low"|"high"|"new" },page } });
}
