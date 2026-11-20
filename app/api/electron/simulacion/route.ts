import {
  extractElectronSecretFromRequest,
  isElectronSecretConfigured,
  verifyElectronAppSecret,
} from "@/lib/electron-presence";
import { electronJson, electronOptionsResponse } from "@/lib/electron-cors";
import { getFirebaseAdminFirestore } from "@/lib/firebase-admin";
import {
  esModoSimulacion,
  setModoSimulacion,
  simulacionForzadaPorEnv,
} from "@/lib/cotizaciones/folio";

/**
 * GET /api/electron/simulacion
 *   Devuelve el estado actual del modo simulación de folios.
 *
 * POST /api/electron/simulacion  { "activo": true|false }
 *   Activa/desactiva el modo simulación de forma persistente (Firestore),
 *   para que todas las apps (escritorio, móvil) y la web usen el mismo valor.
 *
 * Ambas rutas están protegidas con el secreto compartido de la app
 * (Authorization: Bearer COTIZACIONES_APP_SECRET).
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

  const db = getFirebaseAdminFirestore();

  if (!db) {
    return electronJson(
      {
        error:
          "Firebase Admin no configurado. Defina FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_PATH.",
      },
      { status: 503 },
    );
  }

  try {
    const simulacion = await esModoSimulacion(db);

    return electronJson({
      ok: true,
      simulacion,
      forzadaPorEnv: simulacionForzadaPorEnv(),
    });
  } catch (error) {
    console.error("[electron/simulacion GET]", error);

    return electronJson(
      { error: "No se pudo leer el estado del modo simulación." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!verifyElectronAppSecret(extractElectronSecretFromRequest(request))) {
    return unauthorizedOrUnavailable();
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

  if (typeof body.activo !== "boolean") {
    return electronJson(
      { error: 'Campo "activo" (booleano) requerido.' },
      { status: 400 },
    );
  }

  const db = getFirebaseAdminFirestore();

  if (!db) {
    return electronJson(
      {
        error:
          "Firebase Admin no configurado. Defina FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_PATH.",
      },
      { status: 503 },
    );
  }

  try {
    await setModoSimulacion(db, body.activo);

    const simulacion = await esModoSimulacion(db);

    return electronJson({
      ok: true,
      simulacion,
      forzadaPorEnv: simulacionForzadaPorEnv(),
    });
  } catch (error) {
    console.error("[electron/simulacion POST]", error);

    return electronJson(
      { error: "No se pudo guardar el modo simulación." },
      { status: 500 },
    );
  }
}
