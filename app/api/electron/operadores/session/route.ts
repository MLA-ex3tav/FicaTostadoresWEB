import {
  extractElectronSecretFromRequest,
  isElectronSecretConfigured,
  verifyElectronAppSecret,
} from "@/lib/electron-presence";
import { electronJson, electronOptionsResponse } from "@/lib/electron-cors";
import {
  obtenerOperadorActivo,
  OperadoresRepositoryError,
} from "@/lib/operadores/repository";
import { getOperadorSecret, signOperadorToken } from "@/lib/operadores/token";
import { assertRateLimits, RATE_LIMITS } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/sanitize";

/**
 * POST /api/electron/operadores/session
 *
 * Emite una sesión (token firmado) para el perfil elegido. Modelo tipo "perfiles
 * de Netflix": no hay PIN; el perfil se elige libremente y la sesión no expira
 * (el token dura ~100 años). El token permite atribuir la revisión con el nombre
 * firmado por el servidor y validar que el perfil siga activo.
 *
 * Body: { operadorId }
 */

const SESSION_TTL_MS = 100 * 365 * 24 * 60 * 60 * 1000;

export function OPTIONS() {
  return electronOptionsResponse();
}

export async function POST(request: Request) {
  if (!verifyElectronAppSecret(extractElectronSecretFromRequest(request))) {
    const status = isElectronSecretConfigured() ? 401 : 503;

    return electronJson(
      {
        error:
          status === 401
            ? "Secreto de app inválido o ausente."
            : "COTIZACIONES_APP_SECRET no configurado en el servidor.",
      },
      { status },
    );
  }

  let body: Record<string, unknown> = {};

  try {
    const text = await request.text();
    if (text.trim()) {
      body = JSON.parse(text) as Record<string, unknown>;
    }
  } catch {
    return electronJson({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }

  const operadorId = typeof body.operadorId === "string" ? body.operadorId.trim() : "";

  if (!operadorId) {
    return electronJson({ error: "operadorId es requerido." }, { status: 400 });
  }

  const ip = getClientIp(request);
  const rateLimit = await assertRateLimits(
    [`operador-session-ip:${ip}`],
    RATE_LIMITS.operadorLogin,
  );

  if (!rateLimit.ok) {
    return electronJson(
      { error: "Demasiadas solicitudes. Intente de nuevo en unos minutos." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds ?? 60) } },
    );
  }

  const secret = getOperadorSecret();

  if (!secret) {
    return electronJson(
      { error: "OPERADOR_SESSION_SECRET no configurado en el servidor." },
      { status: 503 },
    );
  }

  try {
    const operador = await obtenerOperadorActivo(operadorId);

    if (!operador) {
      return electronJson({ error: "Perfil no encontrado o inactivo." }, { status: 404 });
    }

    const now = Date.now();
    const exp = now + SESSION_TTL_MS;
    const token = signOperadorToken(
      { opId: operador.id, nombre: operador.nombre, iat: now, exp },
      secret,
    );

    return electronJson({
      ok: true,
      token,
      nombre: operador.nombre,
      color: operador.color,
      expiraAt: exp,
    });
  } catch (error) {
    if (error instanceof OperadoresRepositoryError) {
      return electronJson({ error: error.message }, { status: 503 });
    }

    console.error("[electron/operadores/session]", error);
    return electronJson({ error: "No se pudo iniciar la sesión del perfil." }, { status: 500 });
  }
}
