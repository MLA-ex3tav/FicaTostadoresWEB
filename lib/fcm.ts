import { randomUUID } from "node:crypto";
import { getMessaging } from "firebase-admin/messaging";
import {
  getFirebaseAdminApp,
  getFirebaseAdminFirestore,
} from "@/lib/firebase-admin";

/**
 * Registro de dispositivos para notificaciones push (FCM) y envío a los
 * dispositivos del staff (app móvil). El token se registra vía la API
 * protegida (/api/electron/fcm-token) y se guarda en Firestore; los envíos se
 * hacen con firebase-admin (los tokens no se exponen a las reglas públicas).
 */

const FCM_TOKENS_COLLECTION = "dispositivos_fcm";
const MAX_DEVICE_ID_LENGTH = 128;
const MAX_TEXT_LENGTH = 300;

/** Códigos de FCM que indican que el token ya no sirve. */
const INVALID_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

export interface FCMDeviceRecord {
  deviceId: string;
  token: string;
  platform: string;
  app: "movil";
  deviceModel: string | null;
  appVersion: string | null;
  lastIp: string | null;
  pais: string | null;
  region: string | null;
  ciudad: string | null;
  latitud: string | null;
  longitud: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
}

/** Vista sin el token, para el panel admin. */
export interface FCMDeviceView {
  deviceId: string;
  platform: string;
  app: string;
  deviceModel: string | null;
  appVersion: string | null;
  lastIp: string | null;
  pais: string | null;
  region: string | null;
  ciudad: string | null;
  latitud: string | null;
  longitud: string | null;
  userAgent: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  lastSeenAt: string | null;
}

function cleanText(value: unknown, max = MAX_TEXT_LENGTH): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function normalizeDeviceId(value: unknown): string {
  const candidate = cleanText(value, MAX_DEVICE_ID_LENGTH);

  if (candidate && /^[A-Za-z0-9._:-]{8,128}$/.test(candidate)) {
    return candidate;
  }

  return randomUUID();
}

function serializeDevice(doc: {
  id: string;
  data: () => Record<string, unknown>;
}): FCMDeviceView | null {
  const data = doc.data();

  if (typeof data.token !== "string" || !data.token) {
    return null;
  }

  return {
    deviceId: typeof data.deviceId === "string" ? data.deviceId : doc.id,
    platform: typeof data.platform === "string" ? data.platform : "desconocida",
    app: typeof data.app === "string" ? data.app : "movil",
    deviceModel: cleanText(data.deviceModel),
    appVersion: cleanText(data.appVersion),
    lastIp: cleanText(data.lastIp),
    pais: cleanText(data.pais),
    region: cleanText(data.region),
    ciudad: cleanText(data.ciudad),
    latitud: cleanText(data.latitud),
    longitud: cleanText(data.longitud),
    userAgent: cleanText(data.userAgent),
    createdAt: typeof data.createdAt === "string" ? data.createdAt : null,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null,
    lastSeenAt: typeof data.lastSeenAt === "string" ? data.lastSeenAt : null,
  };
}

export interface UpsertTokenFCMInput {
  /** UUID estable por dispositivo; si falta se genera uno. */
  deviceId?: string | null;
  token: string;
  platform: string;
  deviceModel?: string | null;
  appVersion?: string | null;
  lastIp?: string | null;
  pais?: string | null;
  region?: string | null;
  ciudad?: string | null;
  latitud?: string | null;
  longitud?: string | null;
  userAgent?: string | null;
}

/**
 * Registra o actualiza un dispositivo. Un mismo token FCM nunca queda
 * asociado a dos deviceId: si se repite, se elimina el registro anterior.
 */
export async function upsertTokenFCM(
  input: UpsertTokenFCMInput,
): Promise<{ deviceId: string }> {
  const db = getFirebaseAdminFirestore();
  const deviceId = normalizeDeviceId(input.deviceId);

  if (!db) {
    return { deviceId };
  }

  const ref = db.collection(FCM_TOKENS_COLLECTION).doc(deviceId);
  const [existing, duplicates] = await Promise.all([
    ref.get(),
    db
      .collection(FCM_TOKENS_COLLECTION)
      .where("token", "==", input.token)
      .get(),
  ]);

  const now = new Date().toISOString();
  const batch = db.batch();

  for (const doc of duplicates.docs) {
    if (doc.id !== deviceId) {
      batch.delete(doc.ref);
    }
  }

  const record: FCMDeviceRecord = {
    deviceId,
    token: input.token,
    platform: input.platform,
    app: "movil",
    deviceModel: cleanText(input.deviceModel),
    appVersion: cleanText(input.appVersion),
    lastIp: cleanText(input.lastIp),
    pais: cleanText(input.pais),
    region: cleanText(input.region),
    ciudad: cleanText(input.ciudad),
    latitud: cleanText(input.latitud),
    longitud: cleanText(input.longitud),
    userAgent: cleanText(input.userAgent),
    createdAt:
      typeof existing.data()?.createdAt === "string"
        ? (existing.data()?.createdAt as string)
        : now,
    updatedAt: now,
    lastSeenAt: now,
  };

  batch.set(ref, record, { merge: true });
  await batch.commit();

  return { deviceId };
}

export async function removeTokenFCM(deviceId: string): Promise<void> {
  const db = getFirebaseAdminFirestore();
  if (!db) return;

  await db.collection(FCM_TOKENS_COLLECTION).doc(deviceId).delete();
}

export async function listFCMDevices(): Promise<FCMDeviceView[]> {
  const db = getFirebaseAdminFirestore();

  if (!db) {
    return [];
  }

  const snapshot = await db.collection(FCM_TOKENS_COLLECTION).get();

  return snapshot.docs
    .map((doc) => serializeDevice(doc))
    .filter((device): device is FCMDeviceView => device !== null)
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}

export async function deleteFCMDevice(deviceId: string): Promise<void> {
  const db = getFirebaseAdminFirestore();

  if (!db) {
    throw new Error("Firebase Admin no configurado.");
  }

  await db.collection(FCM_TOKENS_COLLECTION).doc(deviceId).delete();
}

/** Elimina dispositivos que no se conectan desde hace `days` días. */
export async function deleteStaleFCMDevices(days: number): Promise<number> {
  const db = getFirebaseAdminFirestore();

  if (!db) {
    throw new Error("Firebase Admin no configurado.");
  }

  const safeDays = Math.min(Math.max(Math.round(days), 1), 3650);
  const cutoff = new Date(Date.now() - safeDays * 86_400_000).toISOString();
  const snapshot = await db.collection(FCM_TOKENS_COLLECTION).get();
  const stale = snapshot.docs.filter((doc) => {
    const updatedAt = doc.data().updatedAt;
    return typeof updatedAt === "string" && updatedAt < cutoff;
  });

  for (let index = 0; index < stale.length; index += 400) {
    const batch = db.batch();

    for (const doc of stale.slice(index, index + 400)) {
      batch.delete(doc.ref);
    }

    await batch.commit();
  }

  return stale.length;
}

export async function deleteAllFCMDevices(): Promise<number> {
  const db = getFirebaseAdminFirestore();

  if (!db) {
    throw new Error("Firebase Admin no configurado.");
  }

  const snapshot = await db.collection(FCM_TOKENS_COLLECTION).get();

  for (let index = 0; index < snapshot.docs.length; index += 400) {
    const batch = db.batch();

    for (const doc of snapshot.docs.slice(index, index + 400)) {
      batch.delete(doc.ref);
    }

    await batch.commit();
  }

  return snapshot.size;
}

export interface NuevaSolicitudNotification {
  tipo: "cotizacion" | "soporte";
  id: string;
  cliente?: string;
  resumen?: string;
}

/**
 * Envía una notificación push a todos los dispositivos registrados del staff.
 * El llamador espera el envío; los fallos no impiden guardar la solicitud.
 * Los tokens rechazados por FCM se eliminan para no acumular dispositivos muertos.
 */
export async function enviarNotificacionNuevaSolicitud(
  opts: NuevaSolicitudNotification,
): Promise<void> {
  const app = getFirebaseAdminApp();
  const db = getFirebaseAdminFirestore();

  if (!app || !db) return;

  try {
    const snapshot = await db.collection(FCM_TOKENS_COLLECTION).get();
    const devices = snapshot.docs.filter((doc) => {
      const token = doc.data().token;
      return typeof token === "string" && token.length > 0;
    });
    const tokens = devices.map((doc) => doc.data().token as string);

    if (tokens.length === 0) return;

    const title =
      opts.tipo === "cotizacion" ? "Nueva cotización" : "Soporte técnico";
    const body = opts.cliente
      ? `${opts.cliente}${opts.resumen ? ` — ${opts.resumen}` : ""}`
      : opts.resumen ?? "Se ha recibido una nueva solicitud.";

    const messaging = getMessaging(app);

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
          tag: `${opts.tipo}:${opts.id}`,
        },
      },
      apns: { payload: { aps: { sound: "default" } } },
      data: {
        tipo: opts.tipo,
        id: opts.id,
        notificacion: "nueva_solicitud",
      },
    });

    if (result.failureCount === 0) {
      return;
    }

    const invalidDevices = devices.filter((_, index) => {
      const response = result.responses[index];
      const code = response?.error?.code;
      return !response?.success && Boolean(code && INVALID_TOKEN_CODES.has(code));
    });

    console.warn(
      "[fcm] Envíos rechazados:",
      result.responses
        .filter((response) => !response.success)
        .map((response) => response.error?.code ?? "unknown"),
    );

    if (invalidDevices.length > 0) {
      const batch = db.batch();

      for (const doc of invalidDevices) {
        batch.delete(doc.ref);
      }

      await batch.commit();
      console.warn(
        `[fcm] ${invalidDevices.length} token(s) inválido(s) eliminados.`,
      );
    }
  } catch (error) {
    console.error("[fcm] No se pudo enviar notificaciones push:", error);
  }
}
