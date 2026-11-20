import { unlink } from "node:fs/promises";
import path from "node:path";
import { del } from "@vercel/blob";
import {
  getBlobCommandOptions,
  getBlobStoreHostname,
  isBlobStorageImageUrl,
  isLocalProductUploadPath,
} from "@/lib/blob-storage";
import { isLocalDevMode } from "@/lib/local-dev/mode";
import type { Product } from "@/lib/products";

const LOCAL_UPLOAD_PREFIX = "/uploads/products/";
const LOCAL_UPLOAD_DIR = path.join(
  process.cwd(),
  "public",
  "uploads",
  "products",
);

function readViewSrc(view: unknown): string[] {
  if (!view || typeof view !== "object") {
    return [];
  }

  const src = (view as { src?: unknown }).src;
  return typeof src === "string" && src.trim() ? [src.trim()] : [];
}

export function getProductImageUrls(product: Product | null | undefined): string[] {
  if (!product?.images) {
    return [];
  }

  return product.images.flatMap((image) => [
    ...readViewSrc(image.carousel),
    ...readViewSrc(image.product),
  ]);
}

/** URLs de imágenes a partir de los datos crudos de Firestore/JSON. */
export function getRawImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((image) => {
    if (!image || typeof image !== "object") {
      return [];
    }

    const record = image as Record<string, unknown>;
    return [...readViewSrc(record.carousel), ...readViewSrc(record.product)];
  });
}

async function deleteLocalUpload(url: string): Promise<void> {
  if (!isLocalDevMode() || !isLocalProductUploadPath(url)) {
    return;
  }

  const filename = url.slice(LOCAL_UPLOAD_PREFIX.length);

  if (!/^[a-z0-9-]+\.(jpe?g|png|gif|webp|heic|heif|avif)$/i.test(filename)) {
    return;
  }

  await unlink(path.join(LOCAL_UPLOAD_DIR, filename));
}

async function deleteBlobImage(url: string): Promise<void> {
  if (isLocalDevMode() || !isBlobStorageImageUrl(url)) {
    return;
  }

  const storeHostname = getBlobStoreHostname();

  if (!storeHostname) {
    return;
  }

  let hostname: string;

  try {
    hostname = new URL(url).hostname;
  } catch {
    return;
  }

  if (hostname !== storeHostname) {
    return;
  }

  await del(url, getBlobCommandOptions());
}

async function deleteImage(url: string): Promise<void> {
  if (isLocalProductUploadPath(url)) {
    await deleteLocalUpload(url);
    return;
  }

  await deleteBlobImage(url);
}

/**
 * Borra archivos que ya no referencia ningún producto. Solo toca imágenes
 * locales y blobs del store configurado; cualquier fallo se registra sin
 * afectar el guardado principal.
 */
export async function deleteUnusedProductImages(
  removedUrls: string[],
  remainingProducts: Product[],
): Promise<void> {
  const remaining = new Set(
    remainingProducts.flatMap((product) => getProductImageUrls(product)),
  );

  const urls = [...new Set(removedUrls)].filter(
    (url) => url && !remaining.has(url),
  );

  await Promise.all(
    urls.map(async (url) => {
      try {
        await deleteImage(url);
      } catch (error) {
        console.warn("[blob-cleanup] no se pudo borrar la imagen:", url, error);
      }
    }),
  );
}
