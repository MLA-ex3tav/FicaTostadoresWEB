import { describe, expect, it } from "vitest";
import { defaultCatalogConfig } from "@/lib/catalog-config";
import { searchProducts } from "@/lib/catalog-search";
import { defaultProducts } from "@/lib/products";
import type { Product } from "@/lib/products";

function search(query: string) {
  return searchProducts(defaultProducts, query, defaultCatalogConfig);
}

function ids(query: string) {
  return search(query).products.map((product) => product.id);
}

describe("searchProducts", () => {
  it("entiende 'tostador de cafe' aunque el modelo no diga tostador", () => {
    const result = search("tostador de cafe");

    expect(result.approximate).toBe(false);
    expect(result.products.length).toBeGreaterThan(0);
    expect(result.products.every((product) => product.catalog === "cafe")).toBe(
      true,
    );
    expect(ids("tostador de cafe")).toContain("tlc-5kg");
  });

  it("encuentra equipos por aplicación aunque no esté en el nombre", () => {
    const result = ids("avellanas");

    expect(result).toContain("partidor-avellanas");
    expect(result).toContain("comercial-5kg-lena");
    expect(result).toContain("molino-piedra");
    expect(result).toContain("descascarador-europea");
    expect(result).not.toContain("tlc-700g");
  });

  it("interpreta la acción de partir avellanas", () => {
    const result = search("maquina para partir avellanas");

    expect(result.products.length).toBeGreaterThan(0);
    expect(result.products[0].id.startsWith("partidor")).toBe(true);
    expect(
      result.products.every((product) => product.id.startsWith("partidor")),
    ).toBe(true);
  });

  it("no mezcla café cuando se piden tostadores de avellanas", () => {
    const result = ids("tostador de avellanas");

    expect(result).toContain("comercial-5kg-gas");
    expect(result).toContain("industrial-50");
    expect(result).not.toContain("tlc-700g");
  });

  it("prioriza el modelo exacto", () => {
    expect(ids("tlc 5")[0]).toBe("tlc-5kg");
  });

  it("tolera errores de tipeo", () => {
    const result = search("avellna");

    expect(result.approximate).toBe(true);
    expect(result.products.map((product) => product.id)).toContain(
      "partidor-avellanas",
    );
  });

  it("relaciona harina tostada con molinos y tostadores a leña", () => {
    const result = ids("harina tostada");

    expect(result).toContain("molino-piedra");
    expect(result).toContain("comercial-5kg-lena");
  });

  it("relaciona moler con molinos", () => {
    const result = ids("moler trigo");

    expect(result).toContain("molino-martillo");
    expect(result).toContain("molino-piedra");
    expect(result).not.toContain("tlc-5kg");
  });

  it("devuelve vacío sin términos útiles", () => {
    expect(search("").products).toEqual([]);
    expect(search("de para la").products).toEqual([]);
  });

  it("mantiene la búsqueda por uso en productos antiguos sin aplicaciones", () => {
    const legacyProducts = defaultProducts.map((product) => ({
      ...product,
      applications: [],
    }));
    const result = searchProducts(
      legacyProducts,
      "avellanas",
      defaultCatalogConfig,
    ).products.map((product) => product.id);

    expect(result).toContain("comercial-5kg-gas");
    expect(result).toContain("industrial-50");
    expect(result).not.toContain("tlc-5kg");
  });

  it("distingue tostadores a leña de los a gas", () => {
    const result = ids("tostador a leña");

    expect(result).toContain("comercial-5kg-lena");
    expect(result).not.toContain("comercial-5kg-gas");
  });

  it("no falla con campos de texto faltantes en productos antiguos", () => {
    const legacy = defaultProducts.map((product, index) =>
      index === 0
        ? {
            ...product,
            capacity: undefined as unknown as string,
            description: undefined as unknown as string,
            specs: undefined as unknown as string[],
            features: undefined as unknown as string[],
            technicalDetails: undefined as unknown as Product["technicalDetails"],
            addOns: undefined as unknown as Product["addOns"],
          }
        : product,
    );

    expect(() =>
      searchProducts(legacy, "tostador de cafe", defaultCatalogConfig),
    ).not.toThrow();
  });
});
