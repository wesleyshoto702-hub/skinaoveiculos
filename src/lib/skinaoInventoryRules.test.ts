import { describe, expect, it } from "vitest";
import { assertPublication, safeStoragePath, imageUrl } from "./skinaoInventoryRules";
import { catalogStatement } from "./skinaoRepository.server";
import type { VehiclePhoto } from "./skinaoInventoryTypes";

const vehicleId = "d0c014c6-1db9-4afc-ac1a-c97832aa3252";
const imageId = "baed9f55-1111-45b6-883e-e15e543baf0a";
const validPath = "vehicles/" + vehicleId + "/" + imageId + ".jpg";
const photo: VehiclePhoto = {
  id: imageId, vehicle_id: vehicleId, storage_path: validPath,
  alt_text: "Foto real", sort_order: 0, is_cover: true, external_url: null,
};

describe("segurança da publicação e do armazenamento", () => {
  it("recusa publicação sem fotos reais", () => {
    expect(() => assertPublication({
      is_published: true, is_demo: false, status: "available",
    }, [])).toThrow(/fotografias reais/);
  });

  it("recusa publicar exemplo ou veículo vendido", () => {
    expect(() => assertPublication({
      is_published: true, is_demo: true, status: "available",
    }, [photo])).toThrow();
    expect(() => assertPublication({
      is_published: true, is_demo: false, status: "sold",
    }, [photo])).toThrow();
  });

  it("autoriza anúncio real com fotos e preserva rascunhos", () => {
    expect(() => assertPublication({
      is_published: true, is_demo: false, status: "reserved",
    }, [photo])).not.toThrow();
    expect(() => assertPublication({
      is_published: false, is_demo: false, status: "available",
    }, [])).not.toThrow();
  });

  it("recusa caminho externo, traversal e foto de outro veículo", () => {
    expect(safeStoragePath(validPath, vehicleId)).toBe(validPath);
    expect(() => safeStoragePath("../secrets")).toThrow();
    expect(() => safeStoragePath("https://other.example/photo.jpg")).toThrow();
    expect(() => safeStoragePath(validPath, "e1c014c6-1db9-4afc-ac1a-c97832aa3252")).toThrow();
  });

  it("monta URL pública somente para caminho válido", () => {
    expect(imageUrl(validPath, "https://storage.example/vehicle-images"))
      .toBe("https://storage.example/vehicle-images/" + validPath);
    expect(() => imageUrl(validPath, "javascript:alert(1)")).toThrow();
  });
});

describe("consulta SQL do catálogo", () => {
  const filters = {
    query: "x' OR 1=1 --", brand: "Volkswagen", type: "", transmission: "",
    maxPrice: "100000", order: "low",
  };

  it("usa placeholders, preserva filtros em parâmetros e aplica a página", () => {
    const [count, listings] = catalogStatement(filters, 2);
    expect(count.query).toContain("is_published = true");
    expect(count.query).toContain("is_demo = false");
    expect(listings.query).toContain("LIMIT $");
    expect(listings.query).toContain("OFFSET $");
    expect(listings.query).toContain("ORDER BY price ASC");
    expect(listings.query).not.toContain("1=1 --");
    expect(listings.params).toContain("%x' OR 1=1 --%");
    expect(listings.params?.slice(-2)).toEqual([12, 24]);
  });

  it("não permite ordenar por SQL fornecido pelo visitante", () => {
    const [, listings] = catalogStatement({ ...filters, order: "DROP TABLE vehicles" }, 0);
    expect(listings.query).not.toContain("DROP TABLE");
    expect(listings.query).toContain("ORDER BY is_featured DESC");
  });
});
