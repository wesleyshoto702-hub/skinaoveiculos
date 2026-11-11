import { describe, expect, it } from "vitest";
import { assertPublication, safeStoragePath, imageUrl, publicVehicle } from "./skinaoInventoryRules";
import { catalogStatement } from "./skinaoRepository.server";
import type { Vehicle, VehiclePhoto } from "./skinaoInventoryTypes";

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

describe("sincronização da vitrine demonstrativa", () => {
  it("consulta os exemplos reais do Neon mesmo sem publicação de anúncio", () => {
    const filters = { query:"",brand:"",type:"",transmission:"",maxPrice:"",order:"featured" };
    const [count, listings] = catalogStatement(filters, 0, 12, true);
    expect(count.query).toContain("is_demo = true");
    expect(listings.query).toContain("status IN ('available','reserved')");
    expect(listings.query).not.toContain("is_published = true");
  });

  it("mostra no site as fotografias e os detalhes importados do painel", () => {
    const vehicle: Vehicle = {
      id:vehicleId, brand:"Volkswagen", model:"Polo", version:"1.0 TSI",
      year:2023, km:28600, transmission:"Automático", fuel:"Flex",
      type:"Hatch", color:"Prata", price:84900, description:"Texto atualizado pelo painel",
      features:["Ar-condicionado"], badge:"DESTAQUE", status:"available",
      is_published:false, is_featured:true, is_demo:true, demo_source_id:1,
      created_at:"2026-11-11T12:00:00Z", updated_at:"2026-11-11T12:00:00Z",
    };
    const url = "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1400&q=82";
    const result = publicVehicle(vehicle,[{
      ...photo, external_url:url, crop_x:75, crop_y:30, crop_zoom:135, crop_rotation:0,
    }],"https://storage.example/vehicle-images");
    expect(result.isDemo).toBe(true);
    expect(result.photo).toBe(url);
    expect(result.description).toBe("Texto atualizado pelo painel");
    expect(result.price).toBe(84900);
    expect(result.coverEdits?.crop_zoom).toBe(135);
  });

  it("não confia em URLs externas arbitrárias na galeria", () => {
    const vehicle: Vehicle = {
      id:vehicleId, brand:"Chevrolet", model:"Onix", version:"LT", year:2022, km:0,
      transmission:"Manual", fuel:"Flex", type:"Hatch", color:"Branco",
      price:72900, description:"", features:[], badge:null,
      status:"available", is_published:false, is_featured:false,
      is_demo:true, demo_source_id:2,
      created_at:"2026-11-11T12:00:00Z", updated_at:"2026-11-11T12:00:00Z",
    };
    const result = publicVehicle(vehicle,[{
      ...photo, external_url:"https://evil.example/track.jpg",
    }],"https://storage.example/vehicle-images");
    expect(result.photo).toContain("/vehicles/");
    expect(result.photo).not.toContain("evil.example");
  });
});
