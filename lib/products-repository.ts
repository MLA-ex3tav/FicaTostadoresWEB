import { unstable_cache, revalidateTag } from "next/cache";
import { isFirebaseAdminConfigured } from "@/lib/firebase-admin";
import { isLocalDevMode } from "@/lib/local-dev/mode";
import {
  readProductsFromFirestore,
  writeProductsToFirestore,
} from "@/lib/catalog/firestore-product-repository";
import { normalizeProductRecords } from "@/lib/products/normalize-product";
import { defaultProducts, type Product } from "@/lib/products";

/**
 * TTL de la caché del catálogo. Los cambios desde el panel de admin invalidan
 * la caché al instante; este TTL acota los cambios hechos por fuera (app
 * móvil/escritorio que actualizan precios directo en Firestore).
 */
const PRODUCTS_CACHE_TTL_SECONDS =
  Number(process.env.PRODUCTS_CACHE_TTL_SECONDS ?? "3600") || 3600;

const PRODUCTS_CACHE_TAG = "products-catalog";

let lastGoodProducts: Product[] | null = null;

async function fetchProducts(): Promise<Product[]> {
  if (isFirebaseAdminConfigured()) {
    const fromFirestore = await readProductsFromFirestore();
    if (fromFirestore) {
      lastGoodProducts = fromFirestore;
      return fromFirestore;
    }
    // Error de lectura (p. ej. cuota agotada): usa la última copia buena.
    if (lastGoodProducts) {
      return lastGoodProducts;
    }
    throw new Error("No se pudo leer el catálogo desde Firestore.");
  }

  return normalizeProductRecords(defaultProducts);
}

const getCachedProducts = unstable_cache(fetchProducts, [PRODUCTS_CACHE_TAG], {
  revalidate: PRODUCTS_CACHE_TTL_SECONDS,
  tags: [PRODUCTS_CACHE_TAG],
});

export async function loadProducts(): Promise<Product[]> {
  if (isLocalDevMode()) {
    return (await readProductsFromFirestore()) ?? [];
  }

  try {
    return await getCachedProducts();
  } catch (error) {
    if (lastGoodProducts) {
      console.warn(
        `[cache] ${PRODUCTS_CACHE_TAG}: usando última copia buena por error de la fuente.`,
      );
      return lastGoodProducts;
    }

    console.warn(
      `[cache] ${PRODUCTS_CACHE_TAG}: fuente no disponible y sin caché local.`,
      error,
    );
    throw error;
  }
}

export async function saveProducts(products: Product[]): Promise<void> {
  if (!isLocalDevMode() && !isFirebaseAdminConfigured()) {
    throw new Error("Firebase Admin no está configurado.");
  }

  const normalized = normalizeProductRecords(products);
  await writeProductsToFirestore(normalized);
  invalidateProductsCache();
}

export function canPersistProducts(): boolean {
  return isLocalDevMode() || isFirebaseAdminConfigured();
}

/** Limpia la caché del catálogo (tras guardar, importar o borrar). */
export function invalidateProductsCache(): void {
  if (isLocalDevMode()) {
    return;
  }

  try {
    revalidateTag(PRODUCTS_CACHE_TAG, "max");
  } catch {
    // Fuera de un request de Next (p. ej. scripts) no hay tags que invalidar.
  }
}
