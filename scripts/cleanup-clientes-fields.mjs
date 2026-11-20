import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

/**
 * Elimina de `clientes` los campos que ya viven en Firebase Auth (Google):
 * uid, displayName, photoURL y lastLoginAt.
 *
 * Uso:
 *   node --env-file=.env.local scripts/cleanup-clientes-fields.mjs
 *   node --env-file=.env.local scripts/cleanup-clientes-fields.mjs --apply
 *
 * Sin --apply solo muestra qué se borraría (dry-run).
 */

const CLIENTES_COLLECTION = "clientes";
const CAMPOS_REDUNDANTES = ["uid", "displayName", "photoURL", "lastLoginAt"];
const PAGE_SIZE = 400;
const APPLY = process.argv.includes("--apply");
const VERBOSE = process.argv.includes("--verbose");
const MAX_LINES = VERBOSE ? Infinity : 20;

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
      "Defina FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_PATH en .env.local.",
    );
  }

  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) });
  }

  return getFirestore();
}

async function main() {
  const db = await getFirestoreDb();
  let procesados = 0;
  let modificados = 0;
  let mostrados = 0;
  let ultimo = null;
  const porCampo = new Map(CAMPOS_REDUNDANTES.map((campo) => [campo, 0]));

  while (true) {
    let query = db
      .collection(CLIENTES_COLLECTION)
      .orderBy("__name__")
      .limit(PAGE_SIZE);

    if (ultimo) {
      query = query.startAfter(ultimo);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();
    let operaciones = 0;

    for (const doc of snapshot.docs) {
      procesados += 1;
      const data = doc.data();
      const presentes = CAMPOS_REDUNDANTES.filter(
        (campo) => Object.prototype.hasOwnProperty.call(data, campo),
      );

      if (presentes.length === 0) {
        continue;
      }

      modificados += 1;

      for (const campo of presentes) {
        porCampo.set(campo, (porCampo.get(campo) ?? 0) + 1);
      }

      if (mostrados < MAX_LINES) {
        mostrados += 1;
        console.log(
          `${APPLY ? "limpiando" : "pendiente"} ${doc.id}: ${presentes.join(", ")}`,
        );
      }

      if (APPLY) {
        const patch = {};

        for (const campo of presentes) {
          patch[campo] = FieldValue.delete();
        }

        batch.update(doc.ref, patch);
        operaciones += 1;
      }
    }

    if (APPLY && operaciones > 0) {
      await batch.commit();
    }

    ultimo = snapshot.docs[snapshot.docs.length - 1];
  }

  console.log(
    `\n${APPLY ? "Aplicado" : "Dry-run"}: ${modificados} de ${procesados} documentos ${APPLY ? "limpiados" : "por limpiar"}.`,
  );

  for (const [campo, total] of porCampo) {
    console.log(`  ${campo}: ${total}`);
  }

  if (!APPLY) {
    console.log("\nEjecute de nuevo con --apply para borrar los campos.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
