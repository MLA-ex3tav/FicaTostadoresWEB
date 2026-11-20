import { timingSafeEqual } from "node:crypto";
import { Redis } from "@upstash/redis";

/**
 * Presencia de las apps que envían heartbeat (escritorio y móvil).
 *
 * Variables de entorno:
 * - COTIZACIONES_APP_SECRET (preferida) o ELECTRON_APP_SECRET: secreto compartido
 *   para POST /api/electron/heartbeat (header Authorization: Bearer …).
 * - COTIZACIONES_APP_HEARTBEAT_TIMEOUT_SEC (opcional, default 90): segundos sin
 *   heartbeat antes de considerar una app desconectada.
 * - UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN: persistencia compartida
 *   entre instancias (recomendado en producción); sin ellas se usa memoria local.
 */

const REDIS_DEVICES_KEY = "fica:electron:devices";
const DEFAULT_HEARTBEAT_TIMEOUT_SEC = 90;
const DEVICE_RETENTION_DAYS = 365;
const DEVICE_RETENTION_SEC = DEVICE_RETENTION_DAYS * 24 * 60 * 60;

export interface ElectronHeartbeatPayload {
  appId?: "appv2" | "movil";
  platform?: string;
  operatorName?: string | null;
  version?: string;
  instanceId?: string;
  hostname?: string;
  /** true si este equipo tiene activado PC Master. */
  pcMaster?: boolean;
}

export interface ElectronDeviceRecord {
  firstSeenAt?: string;
  lastSeenAt: string;
  appId?: "appv2" | "movil";
  platform?: string;
  operatorName?: string | null;
  version?: string;
  instanceId?: string;
  hostname?: string;
  /** Nombre asignado desde el panel admin; el heartbeat no lo sobrescribe. */
  alias?: string;
  pcMaster: boolean;
}

/** Compatibilidad con el nombre anterior de un registro de presencia. */
export type ElectronPresenceRecord = ElectronDeviceRecord;

export interface ElectronDeviceStatus {
  firstSeenAt: string | null;
  instanceId: string | null;
  hostname: string | null;
  alias: string | null;
  appId: "appv2" | "movil" | null;
  platform: string | null;
  operatorName: string | null;
  version: string | null;
  pcMaster: boolean;
  lastSeenAt: string;
  secondsSinceLastSeen: number;
  connected: boolean;
}

export interface ElectronPresenceStatus {
  connected: boolean;
  lastSeenAt: string | null;
  version: string | null;
  instanceId: string | null;
  hostname: string | null;
  pcMaster: boolean | null;
  secondsSinceLastSeen: number | null;
  heartbeatTimeoutSec: number;
  secretConfigured: boolean;
  storage: "redis" | "memory";
  deviceCount: number;
}

type DeviceMap = Record<string, ElectronDeviceRecord>;

let memoryDevices: DeviceMap = {};

function isUpstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

function getRedisClient(): Redis | null {
  if (!isUpstashConfigured()) {
    return null;
  }

  return Redis.fromEnv();
}

export function getElectronHeartbeatTimeoutSec(): number {
  const raw = process.env.COTIZACIONES_APP_HEARTBEAT_TIMEOUT_SEC?.trim();

  if (!raw) {
    return DEFAULT_HEARTBEAT_TIMEOUT_SEC;
  }

  const parsed = Number.parseInt(raw, 10);

  if (!Number.isFinite(parsed) || parsed < 30 || parsed > 600) {
    return DEFAULT_HEARTBEAT_TIMEOUT_SEC;
  }

  return parsed;
}

export function getElectronAppSecret(): string | null {
  const primary = process.env.COTIZACIONES_APP_SECRET?.trim();
  const fallback = process.env.ELECTRON_APP_SECRET?.trim();

  return primary || fallback || null;
}

export function isElectronSecretConfigured(): boolean {
  return getElectronAppSecret() !== null;
}

function secretsMatch(expected: string, provided: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export function verifyElectronAppSecret(provided: string | null): boolean {
  const secret = getElectronAppSecret();

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  if (!provided?.trim()) {
    return false;
  }

  return secretsMatch(secret, provided.trim());
}

export function extractElectronSecretFromRequest(request: Request): string | null {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim() || null;
  }

  const headerSecret = request.headers.get("x-cotizaciones-app-secret")?.trim();

  if (headerSecret) {
    return headerSecret;
  }

  return request.headers.get("x-electron-app-secret")?.trim() || null;
}

function sanitizeOptionalField(
  value: unknown,
  maxLength: number,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed.slice(0, maxLength);
}

export function normalizeElectronHeartbeatPayload(
  body: unknown,
): ElectronHeartbeatPayload {
  if (!body || typeof body !== "object") {
    return {};
  }

  const record = body as Record<string, unknown>;

  return {
    appId: record.appId === "appv2" || record.appId === "movil"
      ? record.appId
      : undefined,
    platform: sanitizeOptionalField(record.platform, 32),
    operatorName: record.operatorName === null
      ? null
      : sanitizeOptionalField(record.operatorName, 80) ?? null,
    version: sanitizeOptionalField(record.version, 64),
    instanceId: sanitizeOptionalField(record.instanceId, 128),
    hostname: sanitizeOptionalField(record.hostname, 128),
    pcMaster: record.pcMaster === true,
  };
}

function deviceKey(record: ElectronDeviceRecord): string {
  return (
    record.instanceId?.trim() ||
    record.hostname?.trim() ||
    "unknown"
  );
}

function pruneDevices(map: DeviceMap): DeviceMap {
  const cutoff = Date.now() - DEVICE_RETENTION_SEC * 1000;
  const pruned: DeviceMap = {};

  for (const [key, record] of Object.entries(map)) {
    const seenAt = Date.parse(record.lastSeenAt);

    if (!Number.isFinite(seenAt) || seenAt < cutoff) {
      continue;
    }

    pruned[key] = record;
  }

  return pruned;
}

async function readDevices(): Promise<{
  devices: DeviceMap;
  storage: "redis" | "memory";
}> {
  const redis = getRedisClient();

  if (redis) {
    try {
      const raw = await redis.get<DeviceMap | string>(REDIS_DEVICES_KEY);
      let map: DeviceMap = {};

      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw) as unknown;
          if (parsed && typeof parsed === "object") {
            map = parsed as DeviceMap;
          }
        } catch {
          map = {};
        }
      } else if (raw && typeof raw === "object") {
        map = raw;
      }

      return { devices: pruneDevices(map), storage: "redis" };
    } catch (error) {
      console.warn(
        "[electron-presence] Falló lectura en Redis (usando memoria local):",
        error,
      );
    }
  }

  return { devices: pruneDevices(memoryDevices), storage: "memory" };
}

async function writeDevices(
  map: DeviceMap,
): Promise<"redis" | "memory"> {
  const pruned = pruneDevices(map);
  const redis = getRedisClient();

  if (redis) {
    try {
      await redis.set(REDIS_DEVICES_KEY, pruned, {
        ex: DEVICE_RETENTION_SEC,
      });
      memoryDevices = pruned;
      return "redis";
    } catch (error) {
      console.warn(
        "[electron-presence] Falló escritura en Redis (usando memoria local):",
        error,
      );
    }
  }

  memoryDevices = pruned;
  return "memory";
}

export async function recordElectronHeartbeat(
  payload: ElectronHeartbeatPayload = {},
): Promise<ElectronPresenceRecord> {
  const now = new Date().toISOString();
  const record: ElectronDeviceRecord = {
    lastSeenAt: now,
    firstSeenAt: now,
    ...(payload.appId ? { appId: payload.appId } : {}),
    ...(payload.platform ? { platform: payload.platform } : {}),
    ...(payload.operatorName !== undefined
      ? { operatorName: payload.operatorName }
      : {}),
    ...(payload.version ? { version: payload.version } : {}),
    ...(payload.instanceId ? { instanceId: payload.instanceId } : {}),
    ...(payload.hostname ? { hostname: payload.hostname } : {}),
    pcMaster: payload.pcMaster === true,
  };

  const { devices } = await readDevices();
  const key = deviceKey(record);
  const previous = devices[key];
  devices[key] = {
    ...record,
    firstSeenAt: previous?.firstSeenAt ?? previous?.lastSeenAt ?? record.firstSeenAt,
    ...(payload.appId ? { appId: payload.appId } : previous?.appId ? { appId: previous.appId } : {}),
    ...(payload.platform ? { platform: payload.platform } : previous?.platform ? { platform: previous.platform } : {}),
    ...(payload.operatorName !== undefined
      ? { operatorName: payload.operatorName }
      : previous?.operatorName !== undefined
        ? { operatorName: previous.operatorName }
        : {}),
    ...(payload.hostname ? { hostname: payload.hostname } : previous?.hostname ? { hostname: previous.hostname } : {}),
    ...(payload.version ? { version: payload.version } : previous?.version ? { version: previous.version } : {}),
    ...(previous?.alias ? { alias: previous.alias } : {}),
    pcMaster: payload.pcMaster ?? previous?.pcMaster ?? false,
  };
  await writeDevices(devices);

  return devices[key];
}

function buildDeviceStatus(
  record: ElectronDeviceRecord,
): ElectronDeviceStatus {
  const timeoutSec = getElectronHeartbeatTimeoutSec();
  const lastSeenMs = Date.parse(record.lastSeenAt);
  const secondsSinceLastSeen = Number.isFinite(lastSeenMs)
    ? Math.max(0, Math.floor((Date.now() - lastSeenMs) / 1000))
    : 0;

  return {
    firstSeenAt: record.firstSeenAt ?? null,
    instanceId: record.instanceId ?? null,
    hostname: record.hostname ?? null,
    alias: record.alias ?? null,
    appId: record.appId ?? null,
    platform: record.platform ?? null,
    operatorName: record.operatorName ?? null,
    version: record.version ?? null,
    pcMaster: record.pcMaster === true,
    lastSeenAt: record.lastSeenAt,
    secondsSinceLastSeen,
    connected: secondsSinceLastSeen <= timeoutSec,
  };
}

/** Lista todos los dispositivos vistos durante el último año. */
export async function getElectronDevices(): Promise<ElectronDeviceStatus[]> {
  const { devices } = await readDevices();

  return Object.values(devices)
    .map(buildDeviceStatus)
    .sort((a, b) => Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt));
}

/**
 * Asigna (o limpia, con `null`) el alias legible de un equipo desde el panel
 * admin. La clave es la misma con la que se guarda el heartbeat (instanceId o,
 * en registros antiguos, hostname). El alias vive en Redis: no cuesta lecturas
 * ni escrituras de Firestore y el heartbeat lo conserva.
 */
export async function setElectronDeviceAlias(
  key: string,
  alias: string | null,
): Promise<ElectronDeviceStatus | null> {
  const normalizedKey = key.trim();

  if (!normalizedKey) {
    return null;
  }

  const { devices } = await readDevices();
  const previous = devices[normalizedKey];

  if (!previous) {
    return null;
  }

  const normalizedAlias = sanitizeOptionalField(alias, 40) ?? null;

  if (normalizedAlias) {
    devices[normalizedKey] = { ...previous, alias: normalizedAlias };
  } else {
    const updated = { ...previous };
    delete updated.alias;
    devices[normalizedKey] = updated;
  }

  await writeDevices(devices);

  return buildDeviceStatus(devices[normalizedKey]);
}

export async function getElectronPresenceStatus(): Promise<ElectronPresenceStatus> {
  const { devices, storage } = await readDevices();
  const list = Object.values(devices)
    .map(buildDeviceStatus)
    .sort((a, b) => Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt));
  const latest = list.find((device) => Boolean(device.hostname)) ?? list[0] ?? null;
  const heartbeatTimeoutSec = getElectronHeartbeatTimeoutSec();
  const secretConfigured = isElectronSecretConfigured();

  if (!latest) {
    return {
      connected: false,
      lastSeenAt: null,
      version: null,
      instanceId: null,
      hostname: null,
      pcMaster: null,
      secondsSinceLastSeen: null,
      heartbeatTimeoutSec,
      secretConfigured,
      storage,
      deviceCount: 0,
    };
  }

  return {
    connected: latest.connected,
    lastSeenAt: latest.lastSeenAt,
    version: latest.version,
    instanceId: latest.instanceId,
    hostname: latest.hostname,
    pcMaster: latest.pcMaster,
    secondsSinceLastSeen: latest.secondsSinceLastSeen,
    heartbeatTimeoutSec,
    secretConfigured,
    storage,
    deviceCount: list.length,
  };
}
