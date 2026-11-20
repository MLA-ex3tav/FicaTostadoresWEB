import {
  extractElectronSecretFromRequest,
  isElectronSecretConfigured,
  verifyElectronAppSecret,
} from "@/lib/electron-presence";
import { electronJson, electronOptionsResponse } from "@/lib/electron-cors";
import { getFirebaseAdminFirestore } from "@/lib/firebase-admin";
import { bumpSolicitudesVersion } from "@/lib/solicitudes-sync";
import { SOLICITUDES_COTIZACION_COLLECTION } from "@/lib/cotizaciones/constants";
import { requireOperadorActivo } from "@/lib/operadores/session";

export function OPTIONS() {
  return electronOptionsResponse();
}

/** Una sola marca compartida; no asigna responsabilidad ni cambia el estado. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifyElectronAppSecret(extractElectronSecretFromRequest(request))) {
    return electronJson({ error: "Secreto de app inválido o no configurado." }, {
      status: isElectronSecretConfigured() ? 401 : 503,
    });
  }

  const { id } = await params;
  if (!id?.trim() || id.includes("/")) {
    return electronJson({ error: "ID de solicitud inválido." }, { status: 400 });
  }
  const db = getFirebaseAdminFirestore();
  if (!db) return electronJson({ error: "Servicio no disponible." }, { status: 503 });

  try {
    const operador = await requireOperadorActivo(request);
    if (!operador) {
      return electronJson({ error: "Sesión de operador inválida." }, { status: 401 });
    }

    const ref = db.collection(SOLICITUDES_COTIZACION_COLLECTION).doc(id);
    const result = await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) return null;
      const anterior = snapshot.data()?.primeraVista;
      if (anterior) return { primeraVista: anterior, created: false };

      // Firestore vuelve a leer en caso de apertura concurrente: el segundo
      // intento devuelve la marca ganadora, sin sobrescribirla ni escribir más.
      const vista = { operadorId: operador.opId, nombre: operador.nombre, vistaAt: Date.now() };
      tx.update(ref, { primeraVista: vista });
      return { primeraVista: vista, created: true };
    });

    if (!result) {
      return electronJson({ error: "Solicitud no encontrada." }, { status: 404 });
    }

    if (result.created) {
      await bumpSolicitudesVersion(db);
    }

    return electronJson({ ok: true, primeraVista: result.primeraVista });
  } catch (error) {
    console.error("[electron/solicitudes/visto]", error);
    return electronJson({ error: "No se pudo registrar la vista." }, { status: 500 });
  }
}
