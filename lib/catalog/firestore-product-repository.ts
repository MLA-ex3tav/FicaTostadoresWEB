import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import {
  PRODUCTOS_COLLECTION,
  PRODUCTOS_PRECIOS_COLLECTION,
} from "@/lib/catalog/constants";
import {
  extractPricesFromProduct,
  hasProductPrices,
  mergePricesIntoProduct,
  stripProductPrices,
  type ProductPrices,
} from "@/lib/catalog/product-prices";
import {
  getFirebaseAdminFirestore,
  isFirebaseAdminConfigured,
} from "@/lib/firebase-admin";
import { isLocalDevMode } from "@/lib/local-dev/mode";
import {
  readLocalJson,
  writeLocalJson,
} from "@/lib/local-dev/server-data";
import {
  normalizeProductRecord,
  normalizeProductRecords,
} from "@/lib/products/normalize-product";
import { defaultProducts, type Product } from "@/lib/products";

const LOCAL_PRODUCTS_FILE = "products.json";

async function readLocalProducts(): Promise<Product[]> {
  const products = await readLocalJson<Product[]>(LOCAL_PRODUCTS_FILE, () =>
    normalizeProductRecords(defaultProducts),
  );

  return normalizeProductRecords(products);
}

async function writeLocalProducts(products: Product[]): Promise<void> {
  await writeLocalJson(LOCAL_PRODUCTS_FILE, normalizeProductRecords(products));
}

/** Combina precios existentes con los que llegan en una escritura parcial. */
function mergeIncomingPrices(
  existing: ProductPrices | null | undefined,
  incoming: ProductPrices,
  variacionesProvided: boolean,
): ProductPrices {
  const merged: ProductPrices = { ...(existing ?? {}) };

  if (incoming.listPrice !== undefined) {
    merged.listPrice = incoming.listPrice;
  }

  if (incoming.priceUsd !== undefined) {
    merged.priceUsd = incoming.priceUsd;
  }

  if (incoming.priceUpdatedAt !== undefined) {
    merged.priceUpdatedAt = incoming.priceUpdatedAt;
  }

  if (incoming.priceUsdUpdatedAt !== undefined) {
    merged.priceUsdUpdatedAt = incoming.priceUsdUpdatedAt;
  }

  if (variacionesProvided) {
    // Los clientes antiguos leen las variaciones sin precios (0). Si el payload
    // no trae ningún precio de variación, se conservan los precios existentes.
    if (Object.keys(incoming.variaciones ?? {}).length > 0) {
      merged.variaciones = { ...(incoming.variaciones ?? {}) };
    }
  } else if (incoming.variaciones) {
    merged.variaciones = {
      ...(merged.variaciones ?? {}),
      ...incoming.variaciones,
    };
  }

  return merged;
}

/** Detecta un Timestamp de Firestore (tiene forma {_seconds, _nanoseconds}). */
function isFirestoreTimestamp(
  value: unknown,
): value is { _seconds: number; _nanoseconds: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    "_seconds" in value &&
    "_nanoseconds" in value
  );
}

/**
 * Convierte un documento de Firestore en un objeto plano serializable para
 * pasar a Client Components (Next.js exige objetos planos; los Timestamp y
 * otros valores tipo clase rompen el prerender). Los timestamps se vuelven
 * cadenas ISO.
 */
function toSerializable(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(toSerializable);
  }

  if (typeof value === "object") {
    if (isFirestoreTimestamp(value)) {
      return new Date(
        value._seconds * 1000 + value._nanoseconds / 1e6,
      ).toISOString();
    }

    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(
      value as Record<string, unknown>,
    )) {
      result[key] = toSerializable(entry);
    }
    return result;
  }

  return value;
}

function mapDocToProduct(
  id: string,
  data: DocumentData,
): Product | null {
  const {
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    priceUpdatedAt: _priceUpdatedAt,
    listPrice: _listPrice,
    price: _price,
    precio: _precio,
    priceUsd: _priceUsd,
    listPriceUsd: _listPriceUsd,
    precioUsd: _precioUsd,
    priceUsdUpdatedAt: _priceUsdUpdatedAt,
    ...rest
  } = data;
  if (typeof rest.name !== "string") {
    return null;
  }

  return stripProductPrices(
    normalizeProductRecord(
      toSerializable({
        ...rest,
        id: typeof rest.id === "string" ? rest.id : id,
      }) as Product,
    ),
  );
}
export async function readProductsFromFirestore(): Promise<Product[] | null> {
  if (isLocalDevMode()) {
    return (await readLocalProducts()).map((product) =>
      stripProductPrices(product),
    );
  }

  if (!isFirebaseAdminConfigured()) {
    return null;
  }

  try {
    const db = getFirebaseAdminFirestore();
    if (!db) {
      return null;
    }

    const snapshot = await db.collection(PRODUCTOS_COLLECTION).get();

    const products = snapshot.docs
      .map((doc) => mapDocToProduct(doc.id, doc.data()))
      .filter((product): product is Product => product !== null);

    return products;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Cuota de Firestore agotada (RESOURCE_EXHAUSTED): se degrada a la caché
    // en memoria sin spamear la consola con errores.
    if (/RESOURCE_EXHAUSTED|quota/i.test(message)) {
      console.warn(
        "[products] Cuota de Firestore agotada; se usa la caché local del catálogo.",
      );
    } else {
      console.error("Error al leer productos desde Firestore:", error);
    }

    return null;
  }
}

export async function readProductFromFirestore(
  productId: string,
): Promise<Product | null> {
  if (isLocalDevMode()) {
    const products = await readLocalProducts();
    const product = products.find((entry) => entry.id === productId) ?? null;
    return product ? stripProductPrices(product) : null;
  }

  if (!isFirebaseAdminConfigured()) {
    return null;
  }

  try {
    const db = getFirebaseAdminFirestore();
    if (!db) {
      return null;
    }

    const snapshot = await db
      .collection(PRODUCTOS_COLLECTION)
      .doc(productId)
      .get();

    if (!snapshot.exists) {
      return null;
    }

    const data = snapshot.data();

    if (!data) {
      return null;
    }

    return mapDocToProduct(snapshot.id, data);
  } catch (error) {
    console.error("Error al leer producto desde Firestore:", error);
    return null;
  }
}

function pricesFromPrivateDoc(data: DocumentData | undefined): ProductPrices {
  if (!data) {
    return {};
  }

  const rawVariaciones = data.variaciones;
  const variaciones =
    rawVariaciones &&
    typeof rawVariaciones === "object" &&
    !Array.isArray(rawVariaciones)
      ? Object.entries(rawVariaciones as Record<string, unknown>).map(
          ([id, value]) => ({
            id,
            ...(value && typeof value === "object" ? value : {}),
          }),
        )
      : undefined;

  return extractPricesFromProduct({ ...data, variaciones });
}

/** Precios privados de un producto (nunca se exponen en lecturas públicas). */
export async function readProductPricesFromFirestore(
  productId: string,
): Promise<ProductPrices | null> {
  if (isLocalDevMode()) {
    const products = await readLocalProducts();
    const product = products.find((entry) => entry.id === productId);

    if (!product) {
      return null;
    }

    const prices = extractPricesFromProduct(product);
    return hasProductPrices(prices) ? prices : {};
  }

  if (!isFirebaseAdminConfigured()) {
    return null;
  }

  try {
    const db = getFirebaseAdminFirestore();

    if (!db) {
      return null;
    }

    const snapshot = await db
      .collection(PRODUCTOS_PRECIOS_COLLECTION)
      .doc(productId)
      .get();

    if (!snapshot.exists) {
      return null;
    }

    return pricesFromPrivateDoc(snapshot.data());
  } catch (error) {
    console.error("Error al leer precios desde Firestore:", error);
    return null;
  }
}

export async function readAllProductPricesFromFirestore(): Promise<
  Record<string, ProductPrices>
> {
  const result: Record<string, ProductPrices> = {};

  if (isLocalDevMode()) {
    for (const product of await readLocalProducts()) {
      const prices = extractPricesFromProduct(product);

      if (hasProductPrices(prices)) {
        result[product.id] = prices;
      }
    }

    return result;
  }

  if (!isFirebaseAdminConfigured()) {
    return result;
  }

  try {
    const db = getFirebaseAdminFirestore();

    if (!db) {
      return result;
    }

    const snapshot = await db.collection(PRODUCTOS_PRECIOS_COLLECTION).get();

    for (const doc of snapshot.docs) {
      const prices = pricesFromPrivateDoc(doc.data());

      if (hasProductPrices(prices)) {
        result[doc.id] = prices;
      }
    }
  } catch (error) {
    console.error("Error al leer precios desde Firestore:", error);
  }

  return result;
}

export async function writeProductsToFirestore(
  products: Product[],
): Promise<void> {
  if (isLocalDevMode()) {
    const existing = await readLocalProducts();
    const existingById = new Map(existing.map((product) => [product.id, product]));

    await writeLocalProducts(
      products.map((product) => {
        const mergedPrices = mergeIncomingPrices(
          extractPricesFromProduct(existingById.get(product.id)),
          extractPricesFromProduct(product),
          false,
        );

        return mergePricesIntoProduct(
          stripProductPrices(product),
          mergedPrices,
        );
      }),
    );
    return;
  }

  if (!isFirebaseAdminConfigured()) {
    throw new Error("Firebase Admin no está configurado.");
  }

  const db = getFirebaseAdminFirestore();
  if (!db) {
    throw new Error("Firebase Admin no está configurado.");
  }

  const collection = db.collection(PRODUCTOS_COLLECTION);
  const pricesCollection = db.collection(PRODUCTOS_PRECIOS_COLLECTION);
  const [existing, existingPrices] = await Promise.all([
    collection.get(),
    pricesCollection.get(),
  ]);
  const existingPriceById = new Map(
    existingPrices.docs.map((doc) => [doc.id, pricesFromPrivateDoc(doc.data())]),
  );
  const nextIds = new Set(products.map((product) => product.id));

  const batch = db.batch();

  for (const doc of existing.docs) {
    if (!nextIds.has(doc.id)) {
      batch.delete(doc.ref);
      batch.delete(pricesCollection.doc(doc.id));
    }
  }

  for (const product of products) {
    const prices = mergeIncomingPrices(
      existingPriceById.get(product.id),
      extractPricesFromProduct(product),
      false,
    );
    const sanitized = stripProductPrices(product);

    batch.set(collection.doc(product.id), {
      ...sanitized,
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (hasProductPrices(prices)) {
      batch.set(pricesCollection.doc(product.id), {
        ...prices,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      batch.delete(pricesCollection.doc(product.id));
    }
  }

  await batch.commit();
}

export async function upsertProductInFirestore(
  product: Product,
  options?: { preservePricesFromId?: string },
): Promise<void> {
  const sourceId = options?.preservePricesFromId ?? product.id;
  const incomingPrices = extractPricesFromProduct(product);

  if (isLocalDevMode()) {
    const products = await readLocalProducts();
    const source = products.find((entry) => entry.id === sourceId);
    const mergedPrices = mergeIncomingPrices(
      source ? extractPricesFromProduct(source) : null,
      incomingPrices,
      true,
    );
    const nextProduct = mergePricesIntoProduct(
      stripProductPrices(product),
      mergedPrices,
    );
    const index = products.findIndex((entry) => entry.id === product.id);

    if (index >= 0) {
      products[index] = nextProduct;
    } else {
      products.push(nextProduct);
    }

    await writeLocalProducts(products);
    return;
  }

  if (!isFirebaseAdminConfigured()) {
    throw new Error("Firebase Admin no está configurado.");
  }

  const db = getFirebaseAdminFirestore();
  if (!db) {
    throw new Error("Firebase Admin no está configurado.");
  }

  const ref = db.collection(PRODUCTOS_COLLECTION).doc(product.id);
  const pricesRef = db
    .collection(PRODUCTOS_PRECIOS_COLLECTION)
    .doc(product.id);
  const sourcePricesRef =
    sourceId === product.id
      ? pricesRef
      : db.collection(PRODUCTOS_PRECIOS_COLLECTION).doc(sourceId);
  const existingPricesSnapshot =
    sourceId === product.id
      ? await pricesRef.get()
      : await sourcePricesRef.get();
  const existingPrices = existingPricesSnapshot.exists
    ? pricesFromPrivateDoc(existingPricesSnapshot.data())
    : null;
  const mergedPrices = mergeIncomingPrices(
    existingPrices,
    incomingPrices,
    true,
  );

  const batch = db.batch();

  batch.set(ref, {
    ...stripProductPrices(product),
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (hasProductPrices(mergedPrices)) {
    batch.set(pricesRef, {
      ...mergedPrices,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    batch.delete(pricesRef);
  }

  if (sourceId !== product.id) {
    batch.delete(sourcePricesRef);
  }

  await batch.commit();
}

export async function deleteProductFromFirestore(
  productId: string,
): Promise<void> {
  if (isLocalDevMode()) {
    const products = await readLocalProducts();
    await writeLocalProducts(
      products.filter((product) => product.id !== productId),
    );
    return;
  }

  if (!isFirebaseAdminConfigured()) {
    throw new Error("Firebase Admin no está configurado.");
  }

  const db = getFirebaseAdminFirestore();
  if (!db) {
    throw new Error("Firebase Admin no está configurado.");
  }

  const batch = db.batch();
  batch.delete(db.collection(PRODUCTOS_COLLECTION).doc(productId));
  batch.delete(
    db.collection(PRODUCTOS_PRECIOS_COLLECTION).doc(productId),
  );
  await batch.commit();
}

export async function deleteProductsFromFirestore(
  productIds: string[],
): Promise<void> {
  if (isLocalDevMode()) {
    const products = await readLocalProducts();
    const ids = new Set(productIds);
    await writeLocalProducts(
      products.filter((product) => !ids.has(product.id)),
    );
    return;
  }

  if (productIds.length === 0) {
    return;
  }

  const db = getFirebaseAdminFirestore();
  if (!db) {
    throw new Error("Firebase Admin no está configurado.");
  }

  const collection = db.collection(PRODUCTOS_COLLECTION);
  const pricesCollection = db.collection(PRODUCTOS_PRECIOS_COLLECTION);
  const batch = db.batch();

  for (const id of productIds) {
    batch.delete(collection.doc(id));
    batch.delete(pricesCollection.doc(id));
  }

  await batch.commit();
}

export async function hasProductsInFirestore(): Promise<boolean> {
  if (isLocalDevMode()) {
    const products = await readLocalProducts();
    return products.length > 0;
  }

  if (!isFirebaseAdminConfigured()) {
    return false;
  }

  try {
    const db = getFirebaseAdminFirestore();
    if (!db) {
      return false;
    }

    const snapshot = await db
      .collection(PRODUCTOS_COLLECTION)
      .limit(1)
      .get();
    return !snapshot.empty;
  } catch {
    return false;
  }
}
