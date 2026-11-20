export interface ProductVariantPrice {
  price?: number;
  priceUsd?: number;
}

/**
 * Precios privados de un producto. Viven fuera del documento público
 * (`productos`) para que la lectura anónima de Firestore nunca los exponga.
 */
export interface ProductPrices {
  listPrice?: number;
  priceUsd?: number;
  priceUpdatedAt?: unknown;
  priceUsdUpdatedAt?: unknown;
  variaciones?: Record<string, ProductVariantPrice>;
}

const TOP_LEVEL_PRICE_KEYS = [
  "listPrice",
  "price",
  "precio",
  "unitPrice",
  "priceUsd",
  "listPriceUsd",
  "precioUsd",
  "unitPriceUsd",
  "priceUpdatedAt",
  "priceUsdUpdatedAt",
] as const;

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function finitePrice(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  return null;
}

function firstPrice(values: unknown[]): number | undefined {
  for (const value of values) {
    const price = finitePrice(value);
    if (price !== null) {
      return price;
    }
  }

  return undefined;
}

export function extractPricesFromProduct(product: unknown): ProductPrices {
  const record = asRecord(product);

  if (!record) {
    return {};
  }

  const prices: ProductPrices = {};

  const listPrice = firstPrice([
    record.listPrice,
    record.price,
    record.precio,
    record.unitPrice,
  ]);

  if (listPrice !== undefined) {
    prices.listPrice = listPrice;
  }

  const priceUsd = firstPrice([
    record.priceUsd,
    record.listPriceUsd,
    record.precioUsd,
    record.unitPriceUsd,
  ]);

  if (priceUsd !== undefined) {
    prices.priceUsd = priceUsd;
  }

  if (record.priceUpdatedAt !== undefined) {
    prices.priceUpdatedAt = record.priceUpdatedAt;
  }

  if (record.priceUsdUpdatedAt !== undefined) {
    prices.priceUsdUpdatedAt = record.priceUsdUpdatedAt;
  }

  if (Array.isArray(record.variaciones)) {
    const variaciones: Record<string, ProductVariantPrice> = {};

    for (const item of record.variaciones) {
      const variant = asRecord(item);
      const id = typeof variant?.id === "string" ? variant.id.trim() : "";

      if (!variant || !id) {
        continue;
      }

      const price = finitePrice(variant.price);
      const priceUsd = finitePrice(variant.priceUsd);

      if (price !== null || priceUsd !== null) {
        variaciones[id] = {
          ...(price !== null ? { price } : {}),
          ...(priceUsd !== null ? { priceUsd } : {}),
        };
      }
    }

    if (Object.keys(variaciones).length > 0) {
      prices.variaciones = variaciones;
    }
  }

  return prices;
}

export function hasProductPrices(prices: ProductPrices): boolean {
  return (
    prices.listPrice !== undefined ||
    prices.priceUsd !== undefined ||
    Object.keys(prices.variaciones ?? {}).length > 0
  );
}

/**
 * Devuelve una copia del producto sin ningún precio. Se usa en lecturas
 * públicas y antes de escribir el documento público de Firestore.
 */
export function stripProductPrices<T extends object>(product: T): T {
  const clone = { ...product } as Record<string, unknown>;

  for (const key of TOP_LEVEL_PRICE_KEYS) {
    delete clone[key];
  }

  if (Array.isArray(clone.variaciones)) {
    clone.variaciones = clone.variaciones.map((item) => {
      const variant = asRecord(item);

      if (!variant) {
        return item;
      }

      const clean = { ...variant };
      delete clean.price;
      delete clean.priceUsd;
      return clean;
    });
  }

  return clone as T;
}

/** Agrega los precios privados a un producto público (solo uso admin/apps). */
export function mergePricesIntoProduct<T extends object>(
  product: T,
  prices: ProductPrices | null | undefined,
): T {
  if (!prices) {
    return product;
  }

  const clone = { ...product } as Record<string, unknown>;

  if (prices.listPrice !== undefined) {
    clone.listPrice = prices.listPrice;
  }

  if (prices.priceUsd !== undefined) {
    clone.priceUsd = prices.priceUsd;
  }

  if (prices.variaciones && Object.keys(prices.variaciones).length > 0) {
    const variaciones = Array.isArray(clone.variaciones)
      ? clone.variaciones
      : [];

    clone.variaciones = variaciones.map((item) => {
      const variant = asRecord(item);

      if (!variant) {
        return item;
      }

      const id = typeof variant.id === "string" ? variant.id : "";
      const extra = prices.variaciones?.[id];

      return extra ? { ...variant, ...extra } : variant;
    });
  }

  return clone as T;
}

/** Precios de variaciones separados del resto del producto. */
export function splitVariantPrices(
  variaciones: unknown,
): { sanitized: UnknownRecord[]; prices: Record<string, ProductVariantPrice> } {
  const sanitized: UnknownRecord[] = [];
  const prices: Record<string, ProductVariantPrice> = {};

  if (!Array.isArray(variaciones)) {
    return { sanitized, prices };
  }

  for (const item of variaciones) {
    const variant = asRecord(item);

    if (!variant) {
      continue;
    }

    const id = typeof variant.id === "string" ? variant.id : "";
    const price = finitePrice(variant.price);
    const priceUsd = finitePrice(variant.priceUsd);
    const clean = { ...variant };
    delete clean.price;
    delete clean.priceUsd;
    sanitized.push(clean);

    if (id && (price !== null || priceUsd !== null)) {
      prices[id] = {
        ...(price !== null ? { price } : {}),
        ...(priceUsd !== null ? { priceUsd } : {}),
      };
    }
  }

  return { sanitized, prices };
}
