import { revalidateTag, unstable_cache } from "next/cache";
import { isFirebaseAdminConfigured } from "@/lib/firebase-admin";
import { isLocalDevMode } from "@/lib/local-dev/mode";
import {
  readCatalogConfigFromFirestore,
  writeCatalogConfigToFirestore,
} from "@/lib/catalog/firestore-catalog-config-repository";
import {
  defaultCatalogConfig,
  type CatalogConfig,
} from "@/lib/catalog-config";

const CATALOG_CONFIG_CACHE_TTL_SECONDS =
  Number(process.env.CATALOG_CONFIG_CACHE_TTL_SECONDS ?? "3600") || 3600;

const CATALOG_CONFIG_CACHE_TAG = "catalog-config";

async function fetchCatalogConfig(): Promise<CatalogConfig> {
  if (isFirebaseAdminConfigured()) {
    const fromFirestore = await readCatalogConfigFromFirestore();
    if (fromFirestore) {
      return fromFirestore;
    }
  }

  return defaultCatalogConfig;
}

const getCachedCatalogConfig = unstable_cache(
  fetchCatalogConfig,
  [CATALOG_CONFIG_CACHE_TAG],
  {
    revalidate: CATALOG_CONFIG_CACHE_TTL_SECONDS,
    tags: [CATALOG_CONFIG_CACHE_TAG],
  },
);

export async function loadCatalogConfig(): Promise<CatalogConfig> {
  if (isLocalDevMode()) {
    return (await readCatalogConfigFromFirestore()) ?? defaultCatalogConfig;
  }

  try {
    return await getCachedCatalogConfig();
  } catch {
    console.warn(
      `[cache] ${CATALOG_CONFIG_CACHE_TAG}: usando configuración por defecto.`,
    );
    return defaultCatalogConfig;
  }
}

export async function saveCatalogConfig(config: CatalogConfig): Promise<void> {
  if (!isLocalDevMode() && !isFirebaseAdminConfigured()) {
    throw new Error("Firebase Admin no está configurado.");
  }

  await writeCatalogConfigToFirestore(config);
  invalidateCatalogConfigCache();
}

export function canPersistCatalogConfig(): boolean {
  return isLocalDevMode() || isFirebaseAdminConfigured();
}

/** Limpia la caché de la configuración de catálogos. */
export function invalidateCatalogConfigCache(): void {
  if (isLocalDevMode()) {
    return;
  }

  try {
    revalidateTag(CATALOG_CONFIG_CACHE_TAG, "max");
  } catch {
    // Fuera de un request de Next (p. ej. scripts) no hay tags que invalidar.
  }
}
