import { list } from "@vercel/blob";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { getBlobCommandOptions, isVercelBlobConfigured } from "@/lib/blob-storage";
import { FieldPath } from "firebase-admin/firestore";
import { extractElectronSecretFromRequest, verifyElectronAppSecret } from "@/lib/electron-presence";
import { electronJson, electronOptionsResponse } from "@/lib/electron-cors";
import { getFirebaseAdminFirestore } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
export function OPTIONS() { return electronOptionsResponse(); }

/** Exportación paginada de solo lectura, sin el límite de las listas de la UI. */
export async function GET(request: Request) {
  if (!verifyElectronAppSecret(extractElectronSecretFromRequest(request))) {
    return electronJson({ error: "Acceso no autorizado." }, { status: 401 });
  }
  const db = getFirebaseAdminFirestore();
  if (!db) return electronJson({ error: "Base de datos no disponible." }, { status: 503 });
  try {
    const url = new URL(request.url);
    if (url.searchParams.get("assets") === "1") {
      if (isVercelBlobConfigured()) {
        const result = await list({ ...getBlobCommandOptions(), limit: 100, cursor: url.searchParams.get("after") ?? undefined });
        return electronJson({ ok: true, assets: result.blobs.map(blob => ({ url: blob.url, name: blob.pathname, size: blob.size })), next: result.hasMore ? result.cursor : null }, { headers: { "Cache-Control": "no-store" } });
      }
      let files: string[] = [];
      try { files = await readdir(join(process.cwd(), "public", "uploads", "products")); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
      return electronJson({ ok: true, assets: files.filter(name => /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i.test(name)).map(name => ({ url: `/uploads/products/${encodeURIComponent(name)}`, name })), next: null }, { headers: { "Cache-Control": "no-store" } });
    }
    const path = url.searchParams.get("collection");
    if (!path) {
      const collections = await db.listCollections();
      return electronJson({ ok: true, collections: collections.map(c => c.path) }, { headers: { "Cache-Control": "no-store" } });
    }
    if (path.split("/").length % 2 !== 1 || path.split("/").some(part => !part || part === "." || part === "..")) {
      return electronJson({ error: "Colección inválida." }, { status: 400 });
    }
    let query = db.collection(path).orderBy(FieldPath.documentId()).limit(100);
    const after = url.searchParams.get("after");
    if (after) query = query.startAfter(after);
    const snapshot = await query.get();
    const documents = await Promise.all(snapshot.docs.map(async document => ({
      path: document.ref.path,
      data: document.data(),
      collections: (await document.ref.listCollections()).map(c => c.path),
    })));
    return electronJson({ ok: true, documents, next: snapshot.size === 100 ? snapshot.docs.at(-1)!.id : null }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return electronJson({ error: "No se pudo completar la lectura del respaldo." }, { status: 500 });
  }
}
