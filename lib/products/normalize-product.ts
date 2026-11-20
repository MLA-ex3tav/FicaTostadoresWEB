import { resolveStorageImageUrl } from "@/lib/blob-storage";
import { normalizeProductImages } from "@/lib/product-images";
import type { Product } from "@/lib/products";

export function normalizeProductRecord(product: Product): Product {
  return {
    ...product,
    specs: Array.isArray(product.specs) ? product.specs : [],
    features: Array.isArray(product.features) ? product.features : [],
    technicalDetails: Array.isArray(product.technicalDetails)
      ? product.technicalDetails
      : [],
    addOns: Array.isArray(product.addOns) ? product.addOns : [],
    applications: Array.isArray(product.applications)
      ? product.applications
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
    variaciones: Array.isArray(product.variaciones) ? product.variaciones : [],
    disabledColors: Array.isArray(product.disabledColors)
      ? product.disabledColors
      : [],
    longDescription:
      typeof product.longDescription === "string"
        ? product.longDescription
        : "",
    images: normalizeProductImages(product.images).map((image) => ({
      carousel: {
        ...image.carousel,
        src: resolveStorageImageUrl(image.carousel.src),
      },
      product: {
        ...image.product,
        src: resolveStorageImageUrl(image.product.src),
      },
    })),
  };
}

export function normalizeProductRecords(products: Product[]): Product[] {
  return products.map(normalizeProductRecord);
}
