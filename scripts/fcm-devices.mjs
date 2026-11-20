import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Lista o elimina los dispositivos registrados para notificaciones push.
 *
 * Uso:
 *   node --env-file-if-exists=.env --env-file-if-exists=.env.local scripts/fcm-devices.mjs
 *   node --env-file-if-exists=.env --env-file-if-exists=.env.local scripts/fcm-devices.mjs --delete-all --apply
 */

const COLLECTION = "dispositivos_fcm";
const DELETE_ALL = process.argv.includes("--delete-all");
const APPLY = process.argv.includes("--apply");

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

function tokenHint(value) {
  if (typeof value !== "string" || value.length === 0) {
    return "(sin token)";
  }

  return `${value.slice(0, 6)}…${value.slice(-4)} (${value.length})`;
}

async function main() {
  const db = await getFirestoreDb();
  const snapshot = await db.collection(COLLECTION).orderBy("updatedAt", "desc").get();

  console.log(`Dispositivos: ${snapshot.size}\n`);

  for (const doc of snapshot.docs) {
    const data = doc.data();
    console.log(
      [
        `doc=${doc.id}`,
        `deviceId=${data.deviceId ?? "?"}`,
        `platform=${data.platform ?? "?"}`,
        `app=${data.app ?? "?"}`,
        `modelo=${data.deviceModel ?? "?"}`,
        `version=${data.appVersion ?? "?"}`,
        `ciudad=${data.ciudad ?? "?"}`,
        `pais=${data.pais ?? "?"}`,
        `ip=${data.lastIp ?? "?"}`,
        `updatedAt=${data.updatedAt ?? "?"}`,
        `token=${tokenHint(data.token)}`,
      ].join(" | "),
    );
  }

  if (!DELETE_ALL) {
    return;
  }

  console.log(
    `\n${APPLY ? "Eliminando" : "Se eliminarían"} ${snapshot.size} dispositivos.`,
  );

  if (!APPLY) {
    console.log("Ejecute de nuevo con --delete-all --apply para borrar.");
    return;
  }

  const batch = db.batch();

  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
  }

  await batch.commit();
  console.log("Dispositivos eliminados.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
