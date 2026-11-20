import { describe, it, expect } from "vitest";
import {
  computePricing,
  parseAplicaIva,
  parseMoneda,
  parseProductInputLines,
  parseTipoCambio,
  roundMoney,
  type LineaProducto,
} from "./electron-solicitud-input";

function line(unitPrice: number, quantity = 1): LineaProducto {
  return { productId: "p1", name: "Producto", quantity, unitPrice };
}

describe("electron-solicitud-input", () => {
  it("normaliza moneda y tipo de cambio", () => {
    expect(parseMoneda("USD")).toBe("USD");
    expect(parseMoneda(" usd ")).toBe("USD");
    expect(parseMoneda("CLP")).toBe("CLP");
    expect(parseMoneda(undefined)).toBe("CLP");
    expect(parseTipoCambio("950,25")).toBe(950.25);
    expect(parseTipoCambio(950.25)).toBe(950.25);
    expect(parseTipoCambio("0")).toBeNull();
    expect(parseTipoCambio("abc")).toBeNull();
  });

  it("interpreta el modo de IVA", () => {
    expect(parseAplicaIva(true)).toBe(true);
    expect(parseAplicaIva("exento")).toBe(false);
    expect(parseAplicaIva("false")).toBe(false);
    expect(parseAplicaIva(undefined)).toBe(true);
    expect(parseAplicaIva(undefined, false)).toBe(false);
  });

  it("conserva unitPriceClp y precioManual en las líneas", () => {
    const lines = parseProductInputLines([
      {
        productId: "p1",
        name: "Tostador",
        quantity: 2,
        unitPrice: 1250.5,
        unitPriceClp: 1189000,
        precioManual: true,
        tipoMantenimiento: "Mantención preventiva",
      },
    ]);

    expect(lines).toHaveLength(1);
    expect(lines[0].unitPriceClp).toBe(1189000);
    expect(lines[0].precioManual).toBe(true);
    expect(lines[0].tipoMantenimiento).toBe("Mantención preventiva");
  });

  it("calcula totales CLP con IVA incluido", () => {
    const pricing = computePricing([line(1190000)]);
    expect(pricing.subtotal).toBe(1190000);
    expect(pricing.neto).toBe(1000000);
    expect(pricing.iva).toBe(190000);
    expect(pricing.total).toBe(1190000);
  });

  it("redondea totales USD a dos decimales", () => {
    const pricing = computePricing([line(1000.5, 2)], {
      moneda: "USD",
      tipoCambio: 950,
    });

    expect(pricing.subtotal).toBe(2001);
    expect(pricing.neto).toBe(2001);
    expect(pricing.iva).toBe(420.21);
    expect(pricing.total).toBe(2421.21);
  });

  it("calcula el IVA USD del 21% sobre el precio lista neto", () => {
    const pricing = computePricing([line(2250)], {
      moneda: "USD",
      tipoCambio: 950,
    });

    expect(pricing.neto).toBe(2250);
    expect(pricing.iva).toBe(472.5);
    expect(pricing.total).toBe(2722.5);
  });

  it("calcula documentos exentos sin desglosar IVA", () => {
    const pricing = computePricing([line(2000.25)], {
      moneda: "USD",
      aplicaIva: false,
    });

    expect(pricing.subtotal).toBe(2000.25);
    expect(pricing.neto).toBe(2000.25);
    expect(pricing.iva).toBe(0);
    expect(pricing.total).toBe(2000.25);
  });

  it("redondea según la moneda", () => {
    expect(roundMoney(1500.6, "CLP")).toBe(1501);
    expect(roundMoney(1500.555, "USD")).toBe(1500.56);
  });
});
