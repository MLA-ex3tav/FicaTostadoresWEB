/**
 * Parser común para los endpoints /api/electron/solicitudes*.
 *
 * Normaliza el input que envían las apps movil/escritorio:
 * - text: limpieza de strings acotada.
 * - products: líneas de producto { productId, name, quantity, unitPrice, unitPriceClp }.
 * - pricing: cálculo de subtotal / IVA / total en la moneda del documento.
 *
 * `unitPrice` está siempre en la moneda del documento (CLP o USD) y se asume
 * con IVA incluido cuando `aplicaIva` es true, igual que los PDF oficiales.
 * `unitPriceClp` conserva el equivalente en CLP para no perder la referencia
 * cuando la cotización/OT se emite en USD.
 */

export const IVA_RATE = 0.19;
export const IVA_RATE_USD = 0.21;

export type MonedaDocumento = "CLP" | "USD";

export function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Moneda del documento. Cualquier valor no reconocido se interpreta como CLP. */
export function parseMoneda(value: unknown): MonedaDocumento {
  return typeof value === "string" && value.trim().toUpperCase() === "USD"
    ? "USD"
    : "CLP";
}

/** Tipo de cambio CLP por 1 USD. Devuelve null si no es un número positivo. */
export function parseTipoCambio(value: unknown): number | null {
  let parsed: number | null = null;

  if (typeof value === "number") {
    parsed = Number.isFinite(value) ? value : null;
  } else if (typeof value === "string" && value.trim()) {
    let cleaned = value.replace(/[^\d.,-]/g, "").trim();
    const hasDot = cleaned.includes(".");
    const hasComma = cleaned.includes(",");

    if (hasDot && hasComma) {
      const lastDot = cleaned.lastIndexOf(".");
      const lastComma = cleaned.lastIndexOf(",");
      cleaned =
        lastComma > lastDot
          ? cleaned.replace(/\./g, "").replace(",", ".")
          : cleaned.replace(/,/g, "");
    } else if (hasComma) {
      cleaned = cleaned.replace(/,/g, ".");
    }

    const numberValue = Number(cleaned);
    parsed = Number.isFinite(numberValue) ? numberValue : null;
  }

  return parsed !== null && parsed > 0 ? parsed : null;
}

export function parseAplicaIva(value: unknown, fallback = true): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["false", "0", "no", "exento", "exportacion", "exportación"].includes(normalized)) {
      return false;
    }
    if (["true", "1", "si", "sí"].includes(normalized)) return true;
  }
  return fallback;
}

/** Redondeo monetario: CLP sin decimales, USD con 2 decimales. */
export function roundMoney(value: number, moneda: MonedaDocumento): number {
  if (!Number.isFinite(value)) return 0;
  const factor = moneda === "CLP" ? 1 : 100;
  return Math.round(value * factor) / factor;
}

export interface LineaProducto {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unitPriceClp?: number;
  precioManual?: boolean;
  selectedColorId?: string | null;
  selectedColor?: string | null;
  variacionId?: string | null;
  variacionName?: string | null;
  tipoMantenimiento?: string;
}

export function parseProductInputLines(
  value: unknown,
  maxLines = 20,
): LineaProducto[] {
  if (!Array.isArray(value)) return [];

  const lines: LineaProducto[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const name = cleanText(record.name, 200);
    const productId = cleanText(record.productId ?? record.id, 120);

    if (!name && !productId) continue;

    const quantity = Math.max(
      1,
      Math.round(toNumber(record.quantity ?? record.cantidad) ?? 1),
    );
    const unitPrice = Math.max(
      0,
      toNumber(record.unitPrice ?? record.price ?? record.precio) ?? 0,
    );
    const unitPriceClpRaw = toNumber(record.unitPriceClp);
    const unitPriceClp =
      unitPriceClpRaw !== null && Number.isFinite(unitPriceClpRaw) && unitPriceClpRaw >= 0
        ? unitPriceClpRaw
        : undefined;

    lines.push({
      productId,
      name,
      quantity,
      unitPrice,
      ...(unitPriceClp !== undefined ? { unitPriceClp } : {}),
      ...(record.precioManual === true ? { precioManual: true } : {}),
      selectedColorId:
        typeof record.selectedColorId === "string" && record.selectedColorId.trim()
          ? record.selectedColorId.trim().slice(0, 60)
          : null,
      selectedColor:
        typeof record.selectedColor === "string" && record.selectedColor.trim()
          ? record.selectedColor.trim().slice(0, 120)
          : null,
      variacionId:
        typeof record.variacionId === "string" && record.variacionId.trim()
          ? record.variacionId.trim().slice(0, 80)
          : null,
      ...(cleanText(record.tipoMantenimiento, 160)
        ? { tipoMantenimiento: cleanText(record.tipoMantenimiento, 160) }
        : {}),
      variacionName:
        typeof record.variacionName === "string" && record.variacionName.trim()
          ? record.variacionName.trim().slice(0, 200)
          : null,
    });
  }

  return lines.slice(0, maxLines);
}

export interface PricingOptions {
  moneda?: MonedaDocumento;
  tipoCambio?: number | null;
  aplicaIva?: boolean;
}

export interface PricingResult {
  subtotal: number;
  precioFinal: number;
  neto: number;
  iva: number;
  total: number;
  moneda: MonedaDocumento;
  tipoCambio: number | null;
  aplicaIva: boolean;
}

/**
 * Calcula los totales del documento. `unitPrice` se interpreta con IVA
 * incluido cuando `aplicaIva` es true; si es exento, el precio unitario es
 * el valor neto y no se desglosa impuesto.
 */
export function computePricing(
  products: LineaProducto[],
  options: PricingOptions = {},
): PricingResult {
  const moneda = options.moneda ?? "CLP";
  const aplicaIva = options.aplicaIva ?? true;
  const subtotal = roundMoney(
    products.reduce(
      (sum, line) => sum + line.quantity * line.unitPrice,
      0,
    ),
    moneda,
  );

  if (!aplicaIva) {
    return {
      subtotal,
      precioFinal: subtotal,
      neto: subtotal,
      iva: 0,
      total: subtotal,
      moneda,
      tipoCambio: options.tipoCambio ?? null,
      aplicaIva,
    };
  }

  if (moneda === "USD") {
    const neto = subtotal;
    const iva = roundMoney(subtotal * IVA_RATE_USD, "USD");
    const total = roundMoney(subtotal + iva, "USD");
    return {
      subtotal,
      precioFinal: subtotal,
      neto,
      iva,
      total,
      moneda,
      tipoCambio: options.tipoCambio ?? null,
      aplicaIva,
    };
  }

  const neto = roundMoney(subtotal / (1 + IVA_RATE), moneda);
  const iva = roundMoney(subtotal - neto, moneda);

  return {
    subtotal,
    precioFinal: subtotal,
    neto,
    iva,
    total: subtotal,
    moneda,
    tipoCambio: options.tipoCambio ?? null,
    aplicaIva,
  };
}
