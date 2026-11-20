import { readFileSync } from "node:fs";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { del, list } from "@vercel/blob";

/**
 * Borra de Vercel Blob las imágenes de producto que ya no referencia ningún
 * producto. Por defecto solo muestra qué borraría.
 *
 * Uso:
 *   node --env-file=.env --env-file=.env.local scripts/cleanup-orphan-blob-images.mjs
 *   node --env-file=.env --env-file=.env.local scripts/cleanup-orphan-blob-images.mjs --apply
 */

const APPLY = process.argv.includes("--apply");
const PREFIX = "product-images/";

function parseServiceAccount(raw) {
  const text = raw.trim();

  if (!text) {
    return null;
  }

  const json = text.startsWith("{")
    ? text
    : Buffer.from(text, "base64").toString("utf8");

  return JSON.parse(json);
}

function getCredential() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (json) {
    return cert(parseServiceAccount(json));
  }

  if (path) {
    return cert(
      parseServiceAccount(readFileSync(path.replace(/^["']|["']$/g, ""), "utf8")),
    );
  }

  throw new Error(
    "Falta FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_PATH.",
  );
}

function getBlobOptions() {
  const strip = (value) => value?.trim().replace(/^["']|["']$/g, "") ?? "";
  const token = strip(process.env.BLOB_READ_WRITE_TOKEN);
  const storeId = strip(process.env.BLOB_STORE_ID);
  const oidcToken = strip(process.env.VERCEL_OIDC_TOKEN);

  if (token) {
    return { token };
  }

  if (storeId && oidcToken) {
    return { storeId, oidcToken };
  }

  if (storeId) {
    return { storeId };
  }

  throw new Error(
    "Falta BLOB_READ_WRITE_TOKEN o BLOB_STORE_ID en el entorno.",
  );
}

if (!getApps().length) {
  initializeApp({ credential: getCredential() });
}

const db = getFirestore();
const snapshot = await db.collection("productos").get();
const referenced = new Set();

for (const doc of snapshot.docs) {
  const images = doc.data()?.images;

  if (!Array.isArray(images)) {
    continue;
  }

  for (const image of images) {
    if (!image || typeof image !== "object") {
      continue;
    }

    for (const view of [image.carousel, image.product]) {
      const src = view && typeof view === "object" ? view.src : null;

      if (typeof src === "string" && src.trim()) {
        referenced.add(src.trim());
      }
    }
  }
}

const blobs = [];
let cursor;
let hasMore = true;

while (hasMore) {
  const page = await list({
    ...getBlobOptions(),
    prefix: PREFIX,
    limit: 1000,
    cursor,
  });

  blobs.push(...page.blobs);
  cursor = page.cursor;
  hasMore = page.hasMore;
}

const orphans = blobs.filter((blob) => !referenced.has(blob.url));

console.log(`Productos revisados: ${snapshot.size}`);
console.log(`Imágenes referenciadas: ${referenced.size}`);
console.log(`Archivos en ${PREFIX}: ${blobs.length}`);
console.log(`Huérfanos: ${orphans.length}`);

for (const blob of orphans.slice(0, 20)) {
  console.log(`  ${blob.url}`);
}

if (!APPLY) {
  console.log(
    "\nModo simulación. Ejecuta con --apply para borrar estos archivos.",
  );
  process.exit(0);
}

for (const blob of orphans) {
  try {
    await del(blob.url, getBlobOptions());
    console.log(`Borrado: ${blob.url}`);
  } catch (error) {
    console.error(`No se pudo borrar ${blob.url}:`, error);
  }
}
