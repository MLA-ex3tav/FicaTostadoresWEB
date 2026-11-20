import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

/**
 * Migra los roles editor/admin legacy de `clientes` a `staff`, elimina el
 * campo `role` de `clientes` y borra los documentos placeholder (sin
 * shippingProfile).
 *
 * Uso:
 *   node --env-file-if-exists=.env --env-file-if-exists=.env.local scripts/migrate-staff-legacy.mjs
 *   node --env-file-if-exists=.env --env-file-if-exists=.env.local scripts/migrate-staff-legacy.mjs --apply
 *
 * Sin --apply solo muestra lo que haría (dry-run).
 */

const CLIENTES_COLLECTION = "clientes";
const STAFF_COLLECTION = "staff";
const APPLY = process.argv.includes("--apply");
const STAFF_ROLES = new Set(["editor", "admin"]);
const CAMPOS_PERMITIDOS_SIN_DESPACHO = new Set([
  "email",
  "role",
  "loginSource",
  "createdAt",
  "uid",
  "displayName",
  "photoURL",
  "lastLoginAt",
]);

function stripEnvQuotes(value) {
  return value?.trim().replace(/^["']|["']$/g, "") ?? "";
}

function parseServiceAccountFromEnvJson() {
  const raw = stripEnvQuotes(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

  if (!raw) {
    return null;
  }

  try {
    const jsonText = raw.startsWith("{")
      ? raw
      : Buffer.from(raw, "base64").toString("utf8");
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

async function parseServiceAccountFromPath() {
  const pathValue = stripEnvQuotes(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

  if (!pathValue) {
    return null;
  }

  try {
    const absolutePath = isAbsolute(pathValue)
      ? pathValue
      : resolve(process.cwd(), pathValue);
    const jsonText = await readFile(absolutePath, "utf8");
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

async function getFirestoreDb() {
  const serviceAccount =
    parseServiceAccountFromEnvJson() ?? (await parseServiceAccountFromPath());

  if (!serviceAccount) {
    throw new Error(
      "Defina FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_PATH.",
    );
  }

  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) });
  }

  return getFirestore();
}

function esVisible(doc) {
  const keys = Object.keys(doc);
  return (
    !Object.prototype.hasOwnProperty.call(doc, "shippingProfile") &&
    keys.every((key) => CAMPOS_PERMITIDOS_SIN_DESPACHO.has(key))
  );
}

async function main() {
  const db = await getFirestoreDb();
  const clientes = await db.collection(CLIENTES_COLLECTION).get();
  const staffSnap = await db.collection(STAFF_COLLECTION).get();
  const staffIds = new Set(staffSnap.docs.map((doc) => doc.id));

  let migrados = 0;
  let rolesEliminados = 0;
  let borrados = 0;

  for (const doc of clientes.docs) {
    const data = doc.data();
    const role = typeof data.role === "string" ? data.role : null;
    const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";

    if (role && STAFF_ROLES.has(role) && !staffIds.has(doc.id)) {
      console.log(
        `${APPLY ? "migrando" : "pendiente migrar"} ${doc.id}: role=${role} email=${email || "(sin email)"}`,
      );

      if (APPLY) {
        let displayName = null;

        try {
          const authUser = await getAuth().getUser(doc.id);
          displayName = authUser.displayName ?? null;
        } catch {
          // El usuario puede no existir ya en Firebase Auth.
        }

        await db.collection(STAFF_COLLECTION).doc(doc.id).set({
          uid: doc.id,
          email,
          displayName,
          role,
          creadoPor: "migracion",
          creadoAt: FieldValue.serverTimestamp(),
          actualizadoAt: FieldValue.serverTimestamp(),
        });
      }

      migrados += 1;
      staffIds.add(doc.id);
    }

    if (role) {
      console.log(`${APPLY ? "quitando role" : "pendiente quitar role"} ${doc.id}: ${role}`);

      if (APPLY) {
        await doc.ref.update({ role: FieldValue.delete() });
      }

      rolesEliminados += 1;
    }

    if (esVisible(data)) {
      console.log(`${APPLY ? "borrando" : "pendiente borrar"} ${doc.id} (placeholder)`);

      if (APPLY) {
        await doc.ref.delete();
      }

      borrados += 1;
    }
  }

  console.log(
    `\n${APPLY ? "Aplicado" : "Dry-run"}: staff migrados=${migrados}, roles eliminados=${rolesEliminados}, clientes borrados=${borrados} (de ${clientes.size}).`,
  );

  if (!APPLY) {
    console.log("Ejecute de nuevo con --apply para aplicar los cambios.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
