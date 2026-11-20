import { slugifyProductId } from "@/lib/product-utils";
import type { Product, ProductAddOn, ProductVariant } from "@/lib/products";
import {
  normalizeProductImages,
  type ProductImage,
} from "@/lib/product-images";
import {
  sanitizeSlug,
  sanitizeStringArray,
  sanitizeText,
} from "@/lib/sanitize";
import { RequestValidationError } from "@/lib/validation/parse-request";

function sanitizeAddOns(value: unknown): ProductAddOn[] {
  if (!Array.isArray(value)) {
    return [];
  }

  if (value.length > 20) {
    throw new RequestValidationError("Demasiados complementos.");
  }

  const addOns: ProductAddOn[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      throw new RequestValidationError("Complemento inválido.");
    }

    const record = item as Record<string, unknown>;
    const id =
      sanitizeSlug(record.id, 80) ??
      (sanitizeText(record.name, 200, { required: true })
        ? slugifyProductId(String(record.name))
        : null);
    const name = sanitizeText(record.name, 200, { required: true });
    const description = sanitizeText(record.description, 500) ?? "";

    if (!id || !name) {
      throw new RequestValidationError("Complemento inválido.");
    }

    addOns.push({
      id,
      name,
      description,
    });
  }

  return addOns;
}

function sanitizeVariaciones(value: unknown): ProductVariant[] {
  if (!Array.isArray(value)) {
    return [];
  }

  if (value.length > 20) {
    throw new RequestValidationError("Demasiadas variaciones.");
  }

  const variaciones: ProductVariant[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      throw new RequestValidationError("Variación inválida.");
    }

    const record = item as Record<string, unknown>;
    const name = sanitizeText(record.name, 120, { required: true });

    if (!name) {
      throw new RequestValidationError("Variación sin nombre.");
    }

    const id =
      sanitizeSlug(record.id, 80) ?? slugifyProductId(name);
    const description = sanitizeText(record.description, 300) ?? undefined;
    const rawPrice =
      typeof record.price === "number" && Number.isFinite(record.price)
        ? record.price
        : typeof record.price === "string"
          ? Number(record.price.replace(/[^0-9.-]/g, ""))
          : NaN;
    const rawPriceUsd =
      typeof record.priceUsd === "number" && Number.isFinite(record.priceUsd)
        ? record.priceUsd
        : typeof record.priceUsd === "string"
          ? Number(record.priceUsd.replace(/[^0-9.-]/g, ""))
          : NaN;

    const price =
      Number.isFinite(rawPrice) && rawPrice > 0 ? Math.round(rawPrice) : undefined;
    const priceUsd =
      Number.isFinite(rawPriceUsd) && rawPriceUsd > 0
        ? Math.round(rawPriceUsd * 100) / 100
        : undefined;

    variaciones.push({
      id,
      name,
      ...(description ? { description } : {}),
      ...(price !== undefined ? { price } : {}),
      ...(priceUsd !== undefined ? { priceUsd } : {}),
    });
  }

  return variaciones;
}

function sanitizeProductImagesInput(value: unknown): ProductImage[] {
  if (value !== undefined && value !== null && !Array.isArray(value)) {
    throw new RequestValidationError("Imágenes inválidas.");
  }

  if (Array.isArray(value) && value.length > 20) {
    throw new RequestValidationError("Demasiadas imágenes.");
  }

  return normalizeProductImages(value);
}

function sanitizeTechnicalDetails(
  value: unknown,
): Product["technicalDetails"] {
  if (!Array.isArray(value)) {
    return [];
  }

  if (value.length > 30) {
    throw new RequestValidationError("Demasiados detalles técnicos.");
  }

  const details: Product["technicalDetails"] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      throw new RequestValidationError("Detalle técnico inválido.");
    }

    const record = item as Record<string, unknown>;
    const label = sanitizeText(record.label, 100, { required: true });
    const detailValue = sanitizeText(record.value, 200, { required: true });

    if (!label || !detailValue) {
      throw new RequestValidationError("Detalle técnico inválido.");
    }

    details.push({ label, value: detailValue });
  }

  return details;
}

export function parseProductInput(body: unknown): Product {
  if (!body || typeof body !== "object") {
    throw new RequestValidationError("Producto inválido.");
  }

  const record = body as Record<string, unknown>;
  const name = sanitizeText(record.name, 200, { required: true });
  const catalog = sanitizeSlug(record.catalog, 50);
  const category = sanitizeSlug(record.category, 50);
  const capacity = sanitizeText(record.capacity, 100, { required: true });
  const description = sanitizeText(record.description, 500, { required: true });
  const longDescription = sanitizeText(record.longDescription, 5000) ?? "";

  if (!name || !catalog || !category || !capacity || !description) {
    throw new RequestValidationError("Faltan campos obligatorios del producto.");
  }

  const requestedId = sanitizeText(record.id, 80);
  const id =
    requestedId && sanitizeSlug(requestedId)
      ? requestedId
      : slugifyProductId(name);

  if (!sanitizeSlug(id)) {
    throw new RequestValidationError("ID de producto inválido.");
  }

  const specs =
    sanitizeStringArray(record.specs, 50, 200) ??
    (() => {
      throw new RequestValidationError("Especificaciones inválidas.");
    })();

  const features =
    sanitizeStringArray(record.features, 50, 300) ??
    (() => {
      throw new RequestValidationError("Características inválidas.");
    })();

  const disabledColors = Array.isArray(record.disabledColors)
    ? record.disabledColors
        .map((color) => sanitizeSlug(color, 50))
        .filter((color): color is string => Boolean(color))
    : [];

  const applications =
    sanitizeStringArray(record.applications, 20, 60) ?? [];

  return {
    id,
    catalog,
    category,
    name,
    capacity,
    description,
    longDescription,
    specs,
    features,
    applications,
    technicalDetails: sanitizeTechnicalDetails(record.technicalDetails),
    addOns: sanitizeAddOns(record.addOns),
    variaciones: sanitizeVariaciones(record.variaciones),
    images: sanitizeProductImagesInput(record.images),
    isOutOfStock: Boolean(record.isOutOfStock),
    disableColors: Boolean(record.disableColors),
    disabledColors,
    isFeatured: Boolean(record.isFeatured),
  };
}

export function parseProductIdParam(value: string): string {
  const id = sanitizeSlug(value, 80);

  if (!id) {
    throw new RequestValidationError("ID de producto inválido.");
  }

  return id;
}
