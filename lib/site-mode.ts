import { Redis } from "@upstash/redis";
import { isLocalDevMode } from "@/lib/local-dev/mode";

/**
 * Modo del sitio público:
 * - `live`: visible para cualquier visitante.
 * - `construction`: solo el staff con cookie firmada puede verlo.
 *
 * Se guarda en Upstash Redis para poder leerlo desde el middleware (Edge).
 */
export type SiteMode = "live" | "construction";

export const SITE_MODE_KEY = "fica:site:mode";

const CACHE_TTL_MS = 10_000;

let redisClient: Redis | null = null;
let cachedMode: { mode: SiteMode; expiresAt: number } | null = null;

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

  if (!redisClient) {
    redisClient = Redis.fromEnv();
  }

  return redisClient;
}

export function isSiteMode(value: unknown): value is SiteMode {
  return value === "live" || value === "construction";
}

function fallbackMode(): SiteMode {
  const raw = process.env.SITE_MODE?.trim().toLowerCase();

  return raw === "construction" || raw === "construccion" || raw === "maintenance"
    ? "construction"
    : "live";
}

/** Indica si el modo se puede persistir (Upstash configurado). */
export function isSiteModePersistent(): boolean {
  return !isLocalDevMode() && isUpstashConfigured();
}

/** Modo actual del sitio. Si Redis falla o no está configurado, usa SITE_MODE. */
export async function getSiteMode(): Promise<SiteMode> {
  if (isLocalDevMode()) {
    return "live";
  }

  const now = Date.now();

  if (cachedMode && cachedMode.expiresAt > now) {
    return cachedMode.mode;
  }

  const redis = getRedisClient();

  if (!redis) {
    return fallbackMode();
  }

  try {
    const raw = await redis.get<string>(SITE_MODE_KEY);
    const mode = isSiteMode(raw) ? raw : fallbackMode();

    cachedMode = { mode, expiresAt: now + CACHE_TTL_MS };
    return mode;
  } catch (error) {
    console.error("[site-mode] Falló la lectura en Redis:", error);
    return fallbackMode();
  }
}

export async function setSiteMode(mode: SiteMode): Promise<void> {
  if (isLocalDevMode()) {
    return;
  }

  const redis = getRedisClient();

  if (!redis) {
    throw new Error(
      "Upstash Redis no está configurado (UPSTASH_REDIS_REST_URL/TOKEN).",
    );
  }

  await redis.set(SITE_MODE_KEY, mode);
  cachedMode = { mode, expiresAt: Date.now() + CACHE_TTL_MS };
}
