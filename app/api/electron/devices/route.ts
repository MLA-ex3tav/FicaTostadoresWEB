import {
  extractElectronSecretFromRequest,
  getElectronDevices,
  isElectronSecretConfigured,
  verifyElectronAppSecret,
} from "@/lib/electron-presence";
import { electronJson, electronOptionsResponse } from "@/lib/electron-cors";

/**
 * GET /api/electron/devices
 *   Lista los equipos que han enviado heartbeat en los últimos 365 días,
 *   indicando cuáles tienen PC Master activo y cuáles están conectados.
 *
 * Protegido con el secreto compartido de la app.
 */

function unauthorizedOrUnavailable(): Response {
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

export function OPTIONS() {
  return electronOptionsResponse();
}

export async function GET(request: Request) {
  if (!verifyElectronAppSecret(extractElectronSecretFromRequest(request))) {
    return unauthorizedOrUnavailable();
  }

  try {
    const devices = await getElectronDevices();

    return electronJson({ ok: true, devices });
  } catch (error) {
    console.error("[electron/devices GET]", error);

    return electronJson(
      { error: "No se pudo leer la lista de equipos." },
      { status: 500 },
    );
  }
}
