import { getFirebaseAdminFirestore } from "@/lib/firebase-admin";
import { verifyCronRequest } from "@/lib/cron-auth";

/**
 * Cron de uptime: se autocomprueba y registra el resultado en Firestore
 * (colección uptime_checks). Ejecutado por Vercel Cron (ver vercel.json).
 * Idempotente y sin efectos secundarios.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getBaseUrl(): string | null {
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/$/, "")}`;
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return siteUrl ? siteUrl.replace(/\/$/, "") : null;
}

export async function GET(request: Request) {
  const denied = verifyCronRequest(request);

  if (denied) {
    return denied;
  }

  const started = Date.now();
  const base = getBaseUrl();
  let ok = false;
  let status = 0;
  let error: string | null = null;

  if (base) {
    try {
      const response = await fetch(`${base}/api/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      status = response.status;
      ok = response.ok;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }
  } else {
    error = "Sin URL base configurada.";
  }

  const db = getFirebaseAdminFirestore();
  const latencyMs = Date.now() - started;
  let recorded = false;

  if (db) {
    await db
      .collection("uptime_checks")
      .add({
        checkedAt: new Date().toISOString(),
        ok,
        status: status || null,
        latencyMs,
        error,
        environment: process.env.VERCEL_ENV ?? "unknown",
      })
      .then(() => {
        recorded = true;
      })
      .catch((cause) => {
        console.error("[cron/uptime] No se pudo registrar:", cause);
      });
  }

  return Response.json({
    ok,
    status: status || null,
    latencyMs,
    error,
    recorded,
  });
}
