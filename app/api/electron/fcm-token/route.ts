import { electronJson, electronOptionsResponse } from "@/lib/electron-cors";
import {
  extractElectronSecretFromRequest,
  isElectronSecretConfigured,
  verifyElectronAppSecret,
} from "@/lib/electron-presence";
import { removeTokenFCM, upsertTokenFCM } from "@/lib/fcm";
import { getClientIp } from "@/lib/sanitize";

/**
 * Registro de tokens de notificaciones push (FCM) de los dispositivos del
 * staff (app móvil). Misma protección que el heartbeat: Authorization: Bearer
 * con el secreto compartido. El token se guarda en Firestore vía Admin SDK.
 *
 * El `deviceId` debe ser un UUID estable por instalación. Si no se envía, el
 * servidor genera uno y lo devuelve en la respuesta para que la app lo guarde.
 */

export function OPTIONS() {
  return electronOptionsResponse();
}

function unauthorized() {
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

function readHeader(request: Request, name: string): string | null {
  const value = request.headers.get(name)?.trim();

  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function POST(request: Request) {
  if (!verifyElectronAppSecret(extractElectronSecretFromRequest(request))) {
    return unauthorized();
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return electronJson({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }

  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const token = typeof record.token === "string" ? record.token.trim() : "";
  const deviceId =
    typeof record.deviceId === "string" ? record.deviceId.trim() : "";
  const platform =
    typeof record.platform === "string" && record.platform.trim()
      ? record.platform.trim().slice(0, 16)
      : "android";
  const deviceModel =
    typeof record.deviceModel === "string"
      ? record.deviceModel
      : typeof record.model === "string"
        ? record.model
        : null;
  const appVersion =
    typeof record.appVersion === "string"
      ? record.appVersion
      : typeof record.version === "string"
        ? record.version
        : null;

  if (!token) {
    return electronJson({ error: "token es obligatorio." }, { status: 400 });
  }

  if (token.length > 512 || deviceId.length > 128) {
    return electronJson(
      { error: "token o deviceId demasiado largos." },
      { status: 400 },
    );
  }

  const clientIp = getClientIp(request);

  const result = await upsertTokenFCM({
    deviceId: deviceId || null,
    token,
    platform,
    deviceModel,
    appVersion,
    lastIp: clientIp === "unknown" ? null : clientIp,
    pais: readHeader(request, "x-vercel-ip-country"),
    region: readHeader(request, "x-vercel-ip-country-region"),
    ciudad: readHeader(request, "x-vercel-ip-city"),
    latitud: readHeader(request, "x-vercel-ip-latitude"),
    longitud: readHeader(request, "x-vercel-ip-longitude"),
    userAgent: request.headers.get("user-agent"),
  });

  return electronJson({ ok: true, deviceId: result.deviceId });
}

export async function DELETE(request: Request) {
  if (!verifyElectronAppSecret(extractElectronSecretFromRequest(request))) {
    return unauthorized();
  }

  const url = new URL(request.url);
  const deviceId = url.searchParams.get("deviceId")?.trim() ?? "";

  if (!deviceId || deviceId.length > 128) {
    return electronJson(
      { error: "deviceId es obligatorio." },
      { status: 400 },
    );
  }

  await removeTokenFCM(deviceId);

  return electronJson({ ok: true });
}
