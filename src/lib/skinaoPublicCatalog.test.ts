import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./skinaoInventory.functions", () => ({
  publicCatalog: vi.fn(),
  publicFacets: vi.fn(),
}));
import { publicCatalog, publicFacets } from "./skinaoInventory.functions";
import { CATALOG_PAGE_SIZE, loadCatalogFacets, loadPublicVehiclesPage, type CatalogFilters } from "./skinaoPublicCatalog";

const emptyFilters: CatalogFilters = {
  query: "", brand: "", type: "", transmission: "", maxPrice: "", order: "featured",
};
const car = {
  id: "9209f439-af44-4bd7-8369-f307ebedb485", brand: "Volkswagen", model: "Polo",
  version: "TSI", year: "2024", km: 24000, transmission: "Automático",
  fuel: "Flex", price: 80000, type: "Hatch", color: "Preto",
  photo: "https://example.com/front.jpg", gallery: ["https://example.com/front.jpg"],
  features: [], isDemo: false, isFeatured: false,
};

afterEach(() => vi.resetAllMocks());

describe("catálogo público via server functions do Neon", () => {
  it("mantém paginação em 12 veículos", () => {
    expect(CATALOG_PAGE_SIZE).toBe(12);
  });

  it("carrega facetas sem fazer chamadas diretas ao antigo Supabase", async () => {
    vi.mocked(publicFacets).mockResolvedValue({
      isDemo: false, brands: ["Fiat", "Volkswagen"], types: ["Hatch"],
      transmissions: ["Manual", "Automático"],
    });
    const options = await loadCatalogFacets();
    expect(options.brands).toEqual(["Fiat", "Volkswagen"]);
    expect(options.isDemo).toBe(false);
    expect(publicFacets).toHaveBeenCalledOnce();
  });

  it("encaminha filtros e página ao backend autorizado de leitura", async () => {
    vi.mocked(publicCatalog).mockResolvedValue({
      fallback: false, vehicles: [car], total: 13, hasMore: true,
    });
    const filters = { ...emptyFilters, query: "Polo", brand: "Volkswagen",
      transmission: "Automático", maxPrice: "100000", order: "low" };
    const result = await loadPublicVehiclesPage(filters, 0, false);
    expect(publicCatalog).toHaveBeenCalledWith({ data: { filters, page: 0 } });
    expect(result.vehicles[0].model).toBe("Polo");
    expect(result.total).toBe(13);
    expect(result.hasMore).toBe(true);
  });

  it("deixa o fallback demonstrativo explícito quando o Neon não contém anúncios", async () => {
    vi.mocked(publicCatalog).mockResolvedValue({
      fallback: true, vehicles: [], total: 0, hasMore: false,
    });
    const result = await loadPublicVehiclesPage(emptyFilters, 0, true);
    expect(result.fallback).toBe(true);
    expect(result.vehicles).toEqual([]);
  });

  it("normaliza ordenação desconhecida sem SQL dinâmico de cliente", async () => {
    vi.mocked(publicCatalog).mockResolvedValue({
      fallback: true, vehicles: [], total: 0, hasMore: false,
    });
    await loadPublicVehiclesPage({ ...emptyFilters, order: "custom-sql" }, 1);
    expect(publicCatalog).toHaveBeenCalledWith({
      data: { filters: { ...emptyFilters, order: "featured" }, page: 1 },
    });
  });
});
