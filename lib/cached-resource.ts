export interface CachedResource<T> {
  /** Devuelve el valor cacheado o el último bueno si falla la fuente. */
  get: () => Promise<T | null>;
  /** Limpia la caché local. */
  invalidate: () => void;
}

interface CreateCachedResourceOptions<T> {
  /** Identificador para logs. */
  key: string;
  /** TTL en segundos. */
  ttlSeconds: number;
  fetcher: () => Promise<T>;
}

/**
 * Caché de servidor en memoria con TTL. Deduplica llamadas concurrentes y
 * devuelve la última copia buena si la fuente falla (p. ej. cuota de Firestore
 * agotada). Reduce drásticamente las lecturas a Firestore.
 */
export function createCachedResource<T>({
  key,
  ttlSeconds,
  fetcher,
}: CreateCachedResourceOptions<T>): CachedResource<T> {
  let memory: { data: T; expires: number } | null = null;
  let inFlight: Promise<T | null> | null = null;
  const ttlMs = ttlSeconds * 1000;

  return {
    async get(): Promise<T | null> {
      const now = Date.now();
      if (memory && now < memory.expires) {
        return memory.data;
      }

      // Deduplica lecturas concurrentes (varios componentes pidiendo lo mismo).
      if (inFlight) {
        return inFlight;
      }

      inFlight = (async () => {
        try {
          const data = await fetcher();
          memory = { data, expires: Date.now() + ttlMs };
          return data;
        } catch {
          console.warn(
            `[cache] ${key}: usando caché local por error de la fuente.`,
          );
          return memory?.data ?? null;
        } finally {
          inFlight = null;
        }
      })();

      return inFlight;
    },

    invalidate(): void {
      memory = null;
    },
  };
}
