import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const PRODUCTOS_COLLECTION = "productos";
const PAGE_SIZE = 400;
const APPLY = process.argv.includes("--apply");
const VERBOSE = process.argv.includes("--verbose");
const MAX_LINES = VERBOSE ? Infinity : 20;

const TEXT_ALIASES = {
  catalog: ["catalogo"],
  category: ["categoria"],
};

const PRICE_ALIASES = {
  listPrice: ["price", "precio"],
  priceUsd: ["listPriceUsd", "precioUsd"],
};

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
      "Defina FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_PATH en .env.",
    );
  }

  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) });
  }

  return getFirestore();
}

function isValidText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidPrice(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function planDoc(id, data) {
  const patch = {};
  const removals = [];
  const conflicts = [];

  for (const [canonical, aliases] of Object.entries(TEXT_ALIASES)) {
    const present = aliases.filter(
      (alias) => Object.prototype.hasOwnProperty.call(data, alias),
    );

    if (present.length === 0) {
      continue;
    }

    if (!Object.prototype.hasOwnProperty.call(data, canonical)) {
      const source = present.find((alias) => isValidText(data[alias]));

      if (source) {
        patch[canonical] = data[source];
        removals.push(...present);
      } else {
        conflicts.push(`${id}: ${present.join("/")} sin valor válido`);
      }
      continue;
    }

    for (const alias of present) {
      if (data[alias] === data[canonical]) {
        removals.push(alias);
      } else {
        conflicts.push(
          `${id}: ${alias}=${JSON.stringify(data[alias])} no coincide con ${canonical}=${JSON.stringify(data[canonical])}`,
        );
      }
    }
  }

  for (const [canonical, aliases] of Object.entries(PRICE_ALIASES)) {
    const present = aliases.filter(
      (alias) => Object.prototype.hasOwnProperty.call(data, alias),
    );

    if (present.length === 0) {
      continue;
    }

    if (!Object.prototype.hasOwnProperty.call(data, canonical)) {
      const source = present.find((alias) => isValidPrice(data[alias]));

      if (source) {
        patch[canonical] = data[source];
        removals.push(...present);
      } else {
        conflicts.push(`${id}: ${present.join("/")} sin valor válido`);
      }
      continue;
    }

    for (const alias of present) {
      if (data[alias] === data[canonical]) {
        removals.push(alias);
      } else {
        conflicts.push(
          `${id}: ${alias}=${JSON.stringify(data[alias])} no coincide con ${canonical}=${JSON.stringify(data[canonical])}`,
        );
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(data, "id")) {
    if (data.id === id) {
      removals.push("id");
    } else {
      conflicts.push(
        `${id}: id=${JSON.stringify(data.id)} no coincide con el id del documento`,
      );
    }
  }

  return { patch, removals: [...new Set(removals)], conflicts };
}

async function main() {
  const db = await getFirestoreDb();
  let procesados = 0;
  let modificados = 0;
  let conflictos = 0;
  let mostrados = 0;
  let ultimo = null;
  const porCampo = new Map();

  while (true) {
    let query = db
      .collection(PRODUCTOS_COLLECTION)
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
      const { patch, removals, conflicts } = planDoc(doc.id, data);

      for (const conflict of conflicts) {
        conflictos += 1;
        console.log(`CONFLICTO ${conflict}`);
      }

      if (removals.length === 0 && Object.keys(patch).length === 0) {
        continue;
      }

      modificados += 1;

      for (const field of removals) {
        porCampo.set(field, (porCampo.get(field) ?? 0) + 1);
      }

      if (mostrados < MAX_LINES) {
        mostrados += 1;
        const canonicals = Object.keys(patch);
        const detail = [
          removals.length > 0 ? `borrar: ${removals.join(", ")}` : null,
          canonicals.length > 0 ? `completar: ${canonicals.join(", ")}` : null,
        ]
          .filter(Boolean)
          .join(" | ");
        console.log(`${APPLY ? "limpiando" : "pendiente"} ${doc.id}: ${detail}`);
      }

      if (APPLY) {
        const update = { ...patch };

        for (const field of removals) {
          update[field] = FieldValue.delete();
        }

        batch.update(doc.ref, update);
        operaciones += 1;
      }
    }

    if (APPLY && operaciones > 0) {
      await batch.commit();
    }

    ultimo = snapshot.docs[snapshot.docs.length - 1];
  }

  console.log(
    `\n${APPLY ? "Aplicado" : "Dry-run"}: ${modificados} de ${procesados} documentos ${APPLY ? "limpiados" : "por limpiar"}; conflictos: ${conflictos}.`,
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
