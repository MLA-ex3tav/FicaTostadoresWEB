import {
  extractElectronSecretFromRequest,
  isElectronSecretConfigured,
  verifyElectronAppSecret,
} from "@/lib/electron-presence";
import { electronJson, electronOptionsResponse } from "@/lib/electron-cors";
import { getFirebaseAdminFirestore } from "@/lib/firebase-admin";
import {
  actualizarContadoresFolios,
  detectarFoliosOcupados,
  esModoSimulacion,
  formatFolio,
  formatFolioOt,
  leerContadoresFolios,
  parseNumeroFolio,
  simulacionForzadaPorEnv,
  type FolioCounters,
} from "@/lib/cotizaciones/folio";

/**
 * GET /api/electron/folios
 *   Devuelve los próximos números de cotización y OT del contador activo
 *   (normal o simulación).
 *
 * POST /api/electron/folios  { "cotizacion"?: "CO 03240", "ot"?: "OT 1286" }
 *   Define desde qué número arrancan las nuevas cotizaciones y OT. Permite
 *   cualquier número válido (incluso hacia atrás). Si el número ya está en uso,
 *   se guarda igualmente y se devuelve una advertencia en `advertencias`.
 *
 * Ambas rutas están protegidas con el secreto compartido de la app.
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

function stateResponse(
  counters: FolioCounters,
  simulacion: boolean,
  advertencias: string[] = [],
): Record<string, unknown> {
  return {
    ok: true,
    simulacion,
    forzadaPorEnv: simulacionForzadaPorEnv(),
    cotizacion: {
      next: counters.cotizacion,
      folio: formatFolio(counters.cotizacion),
    },
    ot: {
      next: counters.ot,
      folio: formatFolioOt(counters.ot),
    },
    advertencias,
  };
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
    const counters = await leerContadoresFolios(db, simulacion);

    return electronJson(stateResponse(counters, simulacion));
  } catch (error) {
    console.error("[electron/folios GET]", error);

    return electronJson(
      { error: "No se pudo leer la numeración." },
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

  const tieneCotizacion = body.cotizacion !== undefined && body.cotizacion !== null;
  const tieneOt = body.ot !== undefined && body.ot !== null;

  if (!tieneCotizacion && !tieneOt) {
    return electronJson(
      { error: 'Envía "cotizacion" y/o "ot" con el próximo número.' },
      { status: 400 },
    );
  }

  const patch: Partial<FolioCounters> = {};

  if (tieneCotizacion) {
    const numero = parseNumeroFolio(body.cotizacion);
    if (numero === null) {
      return electronJson(
        { error: "Número de cotización inválido. Usa el formato CO 03240." },
        { status: 400 },
      );
    }
    patch.cotizacion = numero;
  }

  if (tieneOt) {
    const numero = parseNumeroFolio(body.ot, "ot");
    if (numero === null) {
      return electronJson(
        { error: "Número de OT inválido. Usa el formato OT 1286." },
        { status: 400 },
      );
    }
    patch.ot = numero;
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

    // Modo verificación: calcula si los números ya están en uso sin guardar.
    // La app lo usa para advertir antes de confirmar el cambio.
    if (body.preview === true) {
      const actual = await leerContadoresFolios(db, simulacion);
      const propuesto: FolioCounters = {
        cotizacion: patch.cotizacion ?? actual.cotizacion,
        ot: patch.ot ?? actual.ot,
      };
      const advertencias = await detectarFoliosOcupados(db, propuesto);

      return electronJson({ ok: true, preview: true, advertencias });
    }

    const counters = await actualizarContadoresFolios(db, simulacion, patch);
    const advertencias = await detectarFoliosOcupados(db, counters);

    return electronJson(stateResponse(counters, simulacion, advertencias));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "FOLIO_COTIZACION_INVALIDO") {
      return electronJson(
        { error: "Número de cotización inválido. Usa el formato CO 03240." },
        { status: 400 },
      );
    }
    if (message === "FOLIO_OT_INVALIDO") {
      return electronJson(
        { error: "Número de OT inválido. Usa el formato OT 1286." },
        { status: 400 },
      );
    }

    console.error("[electron/folios POST]", error);

    return electronJson(
      { error: "No se pudo guardar la numeración." },
      { status: 500 },
    );
  }
}
