import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

/**
 * Envía una notificación push de prueba a los dispositivos registrados.
 *
 * Uso:
 *   npm run fcm:test                  (envía al dispositivo actualizado más recientemente)
 *   npm run fcm:test -- --all         (envía a todos los dispositivos)
 *   npm run fcm:test -- --device <deviceId>
 *   npm run fcm:test -- --title "Título" --body "Mensaje"
 *
 * Cierra o bloquea la app móvil antes de ejecutarlo: la notificación debe
 * aparecer aunque la app no esté abierta.
 */

const COLLECTION = "dispositivos_fcm";

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1]?.trim() : undefined;
}

const deviceFilter = argValue("--device");
const sendAll = process.argv.includes("--all");
const title = argValue("--title") || "Prueba de notificación";
const body =
  argValue("--body") ||
  "Si ves este aviso con la app cerrada, las notificaciones push funcionan.";

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

async function getFirebaseAdmin() {
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

  return {
    db: getFirestore(),
    messaging: getMessaging(),
  };
}

async function main() {
  const { db, messaging } = await getFirebaseAdmin();
  const snapshot = await db
    .collection(COLLECTION)
    .orderBy("updatedAt", "desc")
    .get();
  const allDevices = snapshot.docs
    .map((doc) => ({ id: doc.id, data: doc.data() }))
    .filter(({ data }) => typeof data.token === "string" && data.token);

  const devices = deviceFilter
    ? allDevices.filter(
        ({ id, data }) => id === deviceFilter || data.deviceId === deviceFilter,
      )
    : sendAll
      ? allDevices
      : allDevices.slice(0, 1);

  if (devices.length === 0) {
    console.log(
      deviceFilter
        ? `No se encontró el dispositivo ${deviceFilter}.`
        : "No hay dispositivos registrados. Abre la app móvil y acepta las notificaciones.",
    );
    return;
  }

  const testId = `test-${Date.now()}`;
  const tokens = devices.map(({ data }) => data.token);
  console.log(`Enviando a ${tokens.length} dispositivo(s)…`);

  const result = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    android: {
      priority: "high",
      notification: {
        title,
        body,
        sound: "default",
        channelId: "solicitudes",
        tag: `test:${testId}`,
      },
    },
    apns: { payload: { aps: { sound: "default" } } },
    data: {
      tipo: "cotizacion",
      id: testId,
      notificacion: "nueva_solicitud",
    },
  });

  console.log(`Éxitos: ${result.successCount} · Fallos: ${result.failureCount}`);

  result.responses.forEach((response, index) => {
    if (response.success) {
      const device = devices[index];
      console.log(
        `  OK  ${device.data.deviceModel ?? device.data.deviceId ?? device.id}`,
      );
      return;
    }

    const code = response.error?.code ?? "error-desconocido";
    console.log(`  FALLO ${devices[index].id}: ${code}`);
  });

  if (result.failureCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
