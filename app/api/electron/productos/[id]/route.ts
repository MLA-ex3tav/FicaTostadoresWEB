import {
  extractElectronSecretFromRequest,
  isElectronSecretConfigured,
  verifyElectronAppSecret,
} from "@/lib/electron-presence";
import { electronJson, electronOptionsResponse } from "@/lib/electron-cors";
import { getFirebaseAdminFirestore } from "@/lib/firebase-admin";
import {
  PRODUCTOS_COLLECTION,
  PRODUCTOS_PRECIOS_COLLECTION,
} from "@/lib/catalog/constants";
import { readProductsFromFirestore } from "@/lib/catalog/firestore-product-repository";
import { splitVariantPrices } from "@/lib/catalog/product-prices";
import {
  deleteUnusedProductImages,
  getRawImageUrls,
} from "@/lib/blob-cleanup";
import { FieldValue } from "firebase-admin/firestore";
import { revalidateProductPages } from "@/lib/revalidate-products";
import { slugifyProductId } from "@/lib/product-utils";
import { sanitizeTechnicalDetails } from "@/lib/technical-details";

/**
 * DELETE /api/electron/productos/[id]
 *
 * Elimina un producto del catálogo (documento de Firestore). Protegido con el
 * secreto compartido (Authorization: Bearer COTIZACIONES_APP_SECRET).
 *
 * Respuesta: { ok: true, id }
 * 404 si el producto no existe.
 *
 * PATCH /api/electron/productos/[id]
 *
 * Actualiza campos editables de un producto (nombre, modelo, catálogo,
 * categoría, capacidad, descripciones, especificaciones, características,
 * serie, visibilidad y promociones). No administra imágenes. Protegido con el
 * mismo secreto.
 *
 * Body: objeto parcial con cualquiera de estos campos:
 *  - name, modelo, serie: string (≤160)
 *  - catalog, catalogo, category, categoria, capacity, description,
 *    longDescription: string (límites distintos)
 *  - specs, features, disabledColors: string[]
 *  - isOutOfStock, disableColors, isFeatured: boolean
 */

const TEXT_FIELDS: Record<string, number> = {
  name: 160,
  modelo: 120,
  serie: 120,
  catalog: 120,
  category: 120,
  capacity: 120,
  description: 500,
  longDescription: 5000,
};

const STRING_ARRAY_FIELDS = ["specs", "features", "disabledColors"] as const;

const PRICE_FIELDS = ["listPrice", "priceUsd"] as const;

function migrateLegacyFields(body: Record<string, unknown>): void {
  if (body["catalog"] === undefined && body["catalogo"] !== undefined) {
    body["catalog"] = body["catalogo"];
  }
  if (body["category"] === undefined && body["categoria"] !== undefined) {
    body["category"] = body["categoria"];
  }
  if (body["listPrice"] === undefined) {
    body["listPrice"] = body["price"] ?? body["precio"];
  }
  if (body["priceUsd"] === undefined) {
    body["priceUsd"] = body["listPriceUsd"] ?? body["precioUsd"];
  }
}

const BOOLEAN_FIELDS = [
  "isOutOfStock",
  "disableColors",
  "isFeatured",
] as const;

function cleanText(value: unknown, max: number): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  return text.slice(0, max);
}

function cleanPrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return null;
}

function cleanVariaciones(value: unknown): { id: string; name: string; description?: string; price?: number; priceUsd?: number }[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const variaciones: { id: string; name: string; description?: string; price?: number; priceUsd?: number }[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const name = cleanText(record.name, 120);
    if (!name) continue;

    const rawId = cleanText(record.id, 80);
    const id = rawId && slugifyProductId(rawId) ? rawId : slugifyProductId(name);
    if (!id) continue;

    const description = cleanText(record.description, 300) ?? undefined;
    const price = cleanPrice(record.price);
    const priceUsdRaw = cleanPrice(record.priceUsd);
    const priceUsd =
      priceUsdRaw !== null ? Math.round(priceUsdRaw * 100) / 100 : null;

    variaciones.push({
      id,
      name,
      ...(description ? { description } : {}),
      ...(price !== null && price > 0 ? { price } : {}),
      ...(priceUsd !== null && priceUsd > 0 ? { priceUsd } : {}),
    });
  }

  return variaciones.slice(0, 20);
}

export function OPTIONS() {
  return electronOptionsResponse();
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifyElectronAppSecret(extractElectronSecretFromRequest(request))) {
    const status = isElectronSecretConfigured() ? 401 : 503;

    return electronJson(
      {
        error:
          status === 401
            ? "Secreto de app inválido o ausente."
            : "COTIZACIONES_APP_SECRET no configurado en el servidor.",
      },
      { status },
    );
  }

  const { id } = await params;

  if (!id || typeof id !== "string" || !id.trim()) {
    return electronJson({ error: "ID de producto requerido." }, { status: 400 });
  }

  let body: Record<string, unknown> = {};

  try {
    const text = await request.text();

    if (text.trim()) {
      body = JSON.parse(text) as Record<string, unknown>;
    }
  } catch {
    return electronJson({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  migrateLegacyFields(body);

  for (const [field, max] of Object.entries(TEXT_FIELDS)) {
    if (body[field] === undefined) continue;
    updates[field] = cleanText(body[field], max) ?? "";
  }

  for (const field of STRING_ARRAY_FIELDS) {
    if (body[field] === undefined) continue;

    if (!Array.isArray(body[field])) {
      return electronJson(
        { error: `El campo ${field} debe ser una lista de textos.` },
        { status: 400 },
      );
    }

    updates[field] = body[field]
      .map((value) => cleanText(value, 300))
      .filter(Boolean);
  }

  for (const field of BOOLEAN_FIELDS) {
    if (body[field] === undefined) continue;
    updates[field] = Boolean(body[field]);
  }

  const priceUpdates: Record<string, unknown> = {};

  for (const field of PRICE_FIELDS) {
    if (body[field] === undefined) continue;
    const price = cleanPrice(body[field]);
    if (price === null) continue;
    const isUsd = field.toLowerCase().includes("usd");
    priceUpdates[field] = isUsd ? Math.round(price * 100) / 100 : Math.round(price);
    priceUpdates[isUsd ? "priceUsdUpdatedAt" : "priceUpdatedAt"] =
      FieldValue.serverTimestamp();
  }

  // Detalles técnicos (Rendimiento, Sacos, etc.) desde el importador de precios.
  if (body["technicalDetails"] !== undefined) {
    updates["technicalDetails"] = sanitizeTechnicalDetails(
      body["technicalDetails"],
    );
  }

  // Variaciones (versiones del mismo equipo con precio distinto, ej. con/sin software).
  if (body["variaciones"] !== undefined) {
    const variaciones = cleanVariaciones(body["variaciones"]);
    if (variaciones === null) {
      return electronJson(
        { error: "El campo variaciones debe ser una lista de variaciones." },
        { status: 400 },
      );
    }

    const { sanitized, prices } = splitVariantPrices(variaciones);
    updates["variaciones"] = sanitized;

    // Compatibilidad con apps antiguas: si envían variaciones sin precios
    // (porque ya no vienen en el documento público), no se borran los precios.
    if (Object.keys(prices).length > 0) {
      priceUpdates["variaciones"] = prices;
    }
  }

  // Imágenes (desde el editor de la app de escritorio).
  if (body["images"] !== undefined) {
    if (!Array.isArray(body["images"])) {
      return electronJson(
        { error: "El campo images debe ser una lista de imágenes." },
        { status: 400 },
      );
    }

    updates["images"] = body["images"]
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const record = item as Record<string, unknown>;
        const carousel = (record.carousel as Record<string, unknown> | null)?.src;
        const product = (record.product as Record<string, unknown> | null)?.src;
        const carouselSrc =
          typeof carousel === "string" && carousel.trim()
            ? carousel.trim()
            : null;
        const productSrc =
          typeof product === "string" && product.trim() ? product.trim() : null;

        if (!carouselSrc && !productSrc) return null;

        const readFocus = (view: Record<string, unknown> | null) => {
          if (!view || typeof view.focus !== "object" || view.focus === null) {
            return undefined;
          }
          const f = view.focus as Record<string, unknown>;
          const x = Number(f.x);
          const y = Number(f.y);
          if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
          return {
            x: Math.min(100, Math.max(0, Math.round(x))),
            y: Math.min(100, Math.max(0, Math.round(y))),
          };
        };

        return {
          carousel: {
            src: carouselSrc ?? productSrc!,
            ...(readFocus(record.carousel as Record<string, unknown> | null)
              ? { focus: readFocus(record.carousel as Record<string, unknown> | null) }
              : {}),
          },
          product: {
            src: productSrc ?? carouselSrc!,
            ...(readFocus(record.product as Record<string, unknown> | null)
              ? { focus: readFocus(record.product as Record<string, unknown> | null) }
              : {}),
          },
        };
      })
      .filter(Boolean)
      .slice(0, 20);
  }

  if (
    Object.keys(updates).length === 0 &&
    Object.keys(priceUpdates).length === 0
  ) {
    return electronJson(
      {
        error:
          "Al menos un campo editable requerido (nombre, modelo, catálogo, categoría, capacidad, descripción, especificaciones, características, visibilidad…).",
      },
      { status: 400 },
    );
  }

  const db = getFirebaseAdminFirestore();

  if (!db) {
    return electronJson(
      {
        error:
          "Firebase Admin no configurado. Defina FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_PATH.",
      },
      { status: 503 },
    );
  }

  try {
    const ref = db.collection(PRODUCTOS_COLLECTION).doc(id);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return electronJson(
        { error: `Producto no encontrado con ID: ${id}` },
        { status: 404 },
      );
    }

    if (Object.keys(updates).length > 0) {
      await ref.update({
        ...updates,
        updatedAt: FieldValue.serverTimestamp(),
      });

      revalidateProductPages(id);
    }

    if (Object.keys(priceUpdates).length > 0) {
      await db
        .collection(PRODUCTOS_PRECIOS_COLLECTION)
        .doc(id)
        .set(
          { ...priceUpdates, updatedAt: FieldValue.serverTimestamp() },
          { merge: true },
        );
    }

    if (body["images"] !== undefined) {
      const previousImages = getRawImageUrls(snapshot.data()?.images);
      const nextImages = getRawImageUrls(updates["images"]);
      const nextSet = new Set(nextImages);
      const removedImages = previousImages.filter((url) => !nextSet.has(url));

      if (removedImages.length > 0) {
        const remainingProducts = await readProductsFromFirestore();

        if (remainingProducts) {
          await deleteUnusedProductImages(removedImages, remainingProducts);
        }
      }
    }

    return electronJson({ ok: true, id, updated: updates });
  } catch (error) {
    console.error(`[electron/productos/${id}/patch]`, error);

    return electronJson(
      { error: "No se pudo actualizar el producto." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifyElectronAppSecret(extractElectronSecretFromRequest(_request))) {
    const status = isElectronSecretConfigured() ? 401 : 503;

    return electronJson(
      {
        error:
          status === 401
            ? "Secreto de app inválido o ausente."
            : "COTIZACIONES_APP_SECRET no configurado en el servidor.",
      },
      { status },
    );
  }

  const { id } = await params;

  if (!id || typeof id !== "string" || !id.trim()) {
    return electronJson({ error: "ID de producto requerido." }, { status: 400 });
  }

  const db = getFirebaseAdminFirestore();

  if (!db) {
    return electronJson(
      {
        error:
          "Firebase Admin no configurado. Defina FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_PATH.",
      },
      { status: 503 },
    );
  }

  try {
    const ref = db.collection(PRODUCTOS_COLLECTION).doc(id);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return electronJson(
        { error: `Producto no encontrado con ID: ${id}` },
        { status: 404 },
      );
    }

    const batch = db.batch();
    batch.delete(ref);
    batch.delete(db.collection(PRODUCTOS_PRECIOS_COLLECTION).doc(id));
    await batch.commit();
    revalidateProductPages(id);

    const removedImages = getRawImageUrls(snapshot.data()?.images);
    const remainingProducts = await readProductsFromFirestore();

    if (remainingProducts) {
      await deleteUnusedProductImages(removedImages, remainingProducts);
    }

    return electronJson({ ok: true, id });
  } catch (error) {
    console.error(`[electron/productos/${id}/delete]`, error);

    return electronJson(
      { error: "No se pudo eliminar el producto del catálogo." },
      { status: 500 },
    );
  }
}