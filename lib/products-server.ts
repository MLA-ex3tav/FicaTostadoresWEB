import { cache } from "react";
import {
  deleteProductFromFirestore,
  deleteProductsFromFirestore,
  readProductFromFirestore,
  readProductPricesFromFirestore,
  upsertProductInFirestore,
} from "@/lib/catalog/firestore-product-repository";
import { mergePricesIntoProduct } from "@/lib/catalog/product-prices";
import {
  deleteUnusedProductImages,
  getProductImageUrls,
} from "@/lib/blob-cleanup";
import {
  invalidateProductsCache,
  loadProducts,
  saveProducts,
} from "@/lib/products-repository";
import { normalizeProductRecord } from "@/lib/products/normalize-product";
import type { Product } from "@/lib/products";

export async function getProducts(): Promise<Product[]> {
  return loadProducts();
}

export const getProductById = cache(
  async (id: string): Promise<Product | undefined> => {
    const fresh = await readProductFromFirestore(id);

    if (fresh) {
      return fresh;
    }

    const products = await loadProducts();
    return products.find((product) => product.id === id);
  },
);

/**
 * Variante para páginas y APIs públicas: resuelve el producto desde el catálogo
 * cacheado, evitando una lectura a Firestore por request.
 */
export const getPublicProductById = cache(
  async (id: string): Promise<Product | undefined> => {
    const products = await loadProducts();
    return products.find((product) => product.id === id);
  },
);

/**
 * Producto con precios privados para el panel administrativo. No usar en
 * páginas ni APIs públicas.
 */
export const getAdminProductById = cache(
  async (id: string): Promise<Product | undefined> => {
    const product = await getProductById(id);

    if (!product) {
      return undefined;
    }

    const prices = await readProductPricesFromFirestore(id);
    return prices ? mergePricesIntoProduct(product, prices) : product;
  },
);

export async function getProductsByCategory(
  category: string,
): Promise<Product[]> {
  const products = await loadProducts();
  return products.filter((product) => product.category === category);
}

export async function getProductsByCatalog(
  catalog: string,
): Promise<Product[]> {
  const products = await loadProducts();
  return products.filter((product) => product.catalog === catalog);
}

export async function createProduct(product: Product): Promise<Product> {
  const normalized = normalizeProductRecord(product);
  const products = await loadProducts();

  if (products.some((item) => item.id === normalized.id)) {
    throw new Error("Ya existe un producto con ese identificador.");
  }

  await upsertProductInFirestore(normalized);
  invalidateProductsCache();
  return normalized;
}

export async function updateProduct(
  id: string,
  product: Product,
): Promise<Product> {
  const normalized = normalizeProductRecord(product);
  const products = await loadProducts();
  const index = products.findIndex((item) => item.id === id);

  if (index === -1) {
    throw new Error("Producto no encontrado.");
  }

  if (
    normalized.id !== id &&
    products.some((item) => item.id === normalized.id)
  ) {
    throw new Error("Ya existe un producto con ese identificador.");
  }

  const previous = products[index];
  const remainingProducts = products
    .filter((item) => item.id !== id && item.id !== normalized.id)
    .concat(normalized);

  if (normalized.id !== id) {
    // Conserva precios de app/móvil al renombrar el ID, luego borra el doc viejo.
    await upsertProductInFirestore(normalized, { preservePricesFromId: id });
    await deleteProductFromFirestore(id);
  } else {
    await upsertProductInFirestore(normalized);
  }

  invalidateProductsCache();

  const nextUrls = new Set(getProductImageUrls(normalized));
  const removedUrls = getProductImageUrls(previous).filter(
    (url) => !nextUrls.has(url),
  );

  await deleteUnusedProductImages(removedUrls, remainingProducts);

  return normalized;
}

export async function deleteProduct(id: string): Promise<void> {
  const products = await loadProducts();
  const product = products.find((item) => item.id === id);

  if (!product) {
    throw new Error("Producto no encontrado.");
  }

  await deleteProductFromFirestore(id);
  invalidateProductsCache();

  await deleteUnusedProductImages(
    getProductImageUrls(product),
    products.filter((item) => item.id !== id),
  );
}

export async function deleteProducts(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const products = await loadProducts();
  const existingIds = new Set(products.map((item) => item.id));

  if (ids.some((id) => !existingIds.has(id))) {
    throw new Error("Algunos productos no existen.");
  }

  const toDelete = new Set(ids);
  const deletedProducts = products.filter((item) => toDelete.has(item.id));
  const remainingProducts = products.filter((item) => !toDelete.has(item.id));

  await deleteProductsFromFirestore(ids);
  invalidateProductsCache();

  await deleteUnusedProductImages(
    deletedProducts.flatMap((item) => getProductImageUrls(item)),
    remainingProducts,
  );
}

/** Reemplaza todo el catálogo (solo migraciones o mantenimiento). */
export async function replaceAllProducts(products: Product[]): Promise<void> {
  await saveProducts(products);
}
