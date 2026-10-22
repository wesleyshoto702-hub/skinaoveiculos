import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CATALOG_PAGE_SIZE, loadCatalogFacets, loadPublicVehiclesPage,
  type CatalogFilters,
} from "./skinaoPublicCatalog";

const emptyFilters: CatalogFilters = {
  query: "", brand: "", type: "", transmission: "", maxPrice: "", order: "featured",
};

const car = (id: string) => ({
  id, brand: "Volkswagen", model: "Polo", version: "TSI", year: 2024, km: 24000,
  transmission: "Automático", fuel: "Flex", price: 80000, type: "Hatch", color: "Preto",
  badge: null, status: "available", description: "  Teste de descrição do anúncio  ", features: [], is_featured: false, is_demo: true,
});

afterEach(() => vi.unstubAllGlobals());

describe("public vehicle catalog", () => {
  it("fetches global filter options without relying on the first page", async () => {
    const fetchMock = vi.fn(async (_input: string) => new Response(JSON.stringify({
      isDemo: true, brands: ["Fiat", "Jeep", "Volkswagen"],
      types: ["Hatch", "SUV"], transmissions: ["Manual", "Automático"],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const options = await loadCatalogFacets();
    expect(options.brands).toEqual(["Fiat", "Jeep", "Volkswagen"]);
    expect(options.isDemo).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/rpc/skinao_catalog_facets");
  });

  it("applies filters in Supabase, limits the page and only fetches those images", async () => {
    const called: URL[] = [];
    const visible = Array.from({ length: CATALOG_PAGE_SIZE + 1 }, (_, i) => car("vehicle-" + i));
    const fetchMock = vi.fn(async (input: string) => {
      const url = new URL(String(input));
      called.push(url);
      if (url.pathname.endsWith("/vehicles")) {
        return new Response(JSON.stringify(visible), {
          status: 206, headers: { "content-range": "0-12/32" },
        });
      }
      if (url.pathname.endsWith("/vehicle_images")) {
        return new Response(JSON.stringify([
          { vehicle_id: "vehicle-0", storage_path: "vehicles/vehicle-0/front.jpg",
            external_url: null, sort_order: 1, is_cover: true },
          { vehicle_id: "vehicle-0", storage_path: "vehicles/vehicle-0/back.jpg",
            external_url: null, sort_order: 0, is_cover: false },
        ]), { status: 200 });
      }
      throw new Error("Unexpected endpoint");
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await loadPublicVehiclesPage({
      ...emptyFilters, query: "Polo", brand: "Volkswagen",
      transmission: "Automático", maxPrice: "100000", order: "low",
    }, 0, true);
    expect(result.vehicles).toHaveLength(CATALOG_PAGE_SIZE);
    expect(result.total).toBe(32);
    expect(result.hasMore).toBe(true);
    expect(result.vehicles[0].description).toBe("Teste de descrição do anúncio");
    expect(result.vehicles[0].gallery).toHaveLength(2);
    expect(result.vehicles[0].gallery[0]).toContain("/front.jpg");
    const listings = called[0].searchParams;
    expect(listings.get("limit")).toBe(String(CATALOG_PAGE_SIZE + 1));
    expect(listings.get("is_demo")).toBe("eq.true");
    expect(listings.get("brand")).toBe("eq.Volkswagen");
    expect(listings.get("transmission")).toBe("eq.Automático");
    expect(listings.get("price")).toBe("lte.100000");
    expect(listings.get("select")).toContain("description");
    expect(listings.get("order")).toBe("price.asc,id.asc");
    expect(listings.get("or")).toContain("brand.ilike.*Polo*");
    expect(called[1].searchParams.get("vehicle_id")).not.toContain("vehicle-12");
  });

  it("uses the requested offset and shows no next page at the end", async () => {
    const paths: URL[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string) => {
      const url = new URL(input);
      paths.push(url);
      if (url.pathname.endsWith("/vehicles"))
        return new Response(JSON.stringify([car("last")]), {
          status: 206, headers: { "content-range": "12-12/13" },
        });
      return new Response(JSON.stringify([]), { status: 200 });
    }));
    const result = await loadPublicVehiclesPage(emptyFilters, 1, true);
    expect(paths[0].searchParams.get("offset")).toBe("12");
    expect(result.vehicles).toHaveLength(1);
    expect(result.hasMore).toBe(false);
    expect(result.total).toBe(13);
  });
});
