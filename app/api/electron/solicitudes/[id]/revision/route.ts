import { FieldValue } from "firebase-admin/firestore";
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
import { resolverRevision, type RevisionDoc } from "@/lib/operadores/revision";

/**
 * POST /api/electron/solicitudes/[id]/revision
 *
 * Claim + sello de revisión de una cotización. Requiere el secreto compartido
 * (Authorization: Bearer) y un token de operador válido (X-Operador-Token).
 * El claim se resuelve en una transacción para evitar carreras.
 *
 * Body: { accion: "tomar"|"renovar"|"liberar"|"forzar"|"completar",
 *         revisadaEstado?: "aprobada_ot"|"rechazada" }
 */

const ACCIONES = ["tomar", "renovar", "liberar", "forzar", "completar"] as const;
type Accion = (typeof ACCIONES)[number];

const ESTADOS_COMPLETAR = new Set(["aprobada_ot", "rechazada"]);
const REVISION_TTL_MS = 15 * 60 * 1000;

export function OPTIONS() {
  return electronOptionsResponse();
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;

  if (!id?.trim()) {
    return electronJson({ error: "ID de solicitud requerido." }, { status: 400 });
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

  const accion = body.accion;

  if (typeof accion !== "string" || !ACCIONES.includes(accion as Accion)) {
    return electronJson(
      { error: `Acción no válida. Use: ${ACCIONES.join(", ")}.` },
      { status: 400 },
    );
  }

  const revisadaEstado =
    typeof body.revisadaEstado === "string" ? body.revisadaEstado : undefined;

  if (accion === "completar" && revisadaEstado && !ESTADOS_COMPLETAR.has(revisadaEstado)) {
    return electronJson(
      { error: 'revisadaEstado debe ser "aprobada_ot" o "rechazada".' },
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

  const operador = await requireOperadorActivo(request);

  if (!operador) {
    return electronJson(
      { error: "Sesión de operador inválida o expirada. Vuelva a iniciar sesión." },
      { status: 401 },
    );
  }

  const collection = db.collection(SOLICITUDES_COTIZACION_COLLECTION);
  let docRef = collection.doc(id);
  const direct = await docRef.get();

  if (!direct.exists) {
    const byIdField = await collection.where("id", "==", id).limit(1).get();

    if (byIdField.empty) {
      return electronJson(
        { error: `Solicitud no encontrada con ID: ${id}` },
        { status: 404 },
      );
    }

    docRef = byIdField.docs[0].ref;
  }

  const outcome: { conflict?: { por: string; expiraAt: number } } = {};
  const now = Date.now();

  try {
    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(docRef);
      const data = (snapshot.data() ?? {}) as RevisionDoc;
      const estado = resolverRevision(data, operador.opId, now);

      if (accion === "liberar") {
        if (estado.kind === "otro") {
          outcome.conflict = { por: estado.nombre ?? "otro operador", expiraAt: estado.expiraAt ?? 0 };
          return;
        }
        tx.set(
          docRef,
          {
            revisionOperadorId: null,
            revisionOperadorNombre: null,
            revisionIniciadaAt: null,
            revisionExpiraAt: null,
          },
          { merge: true },
        );
        return;
      }

      if (accion === "completar") {
        tx.set(
          docRef,
          {
            revisadaPorId: operador.opId,
            revisadaPorNombre: operador.nombre,
            revisadaAt: FieldValue.serverTimestamp(),
            revisadaEstado: revisadaEstado ?? null,
            revisionOperadorId: null,
            revisionOperadorNombre: null,
            revisionIniciadaAt: null,
            revisionExpiraAt: null,
            actualizadoEn: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        return;
      }

      // tomar / renovar / forzar
      if (estado.kind === "otro" && accion !== "forzar") {
        outcome.conflict = { por: estado.nombre ?? "otro operador", expiraAt: estado.expiraAt ?? 0 };
        return;
      }

      const update: Record<string, unknown> = {
        revisionOperadorId: operador.opId,
        revisionOperadorNombre: operador.nombre,
        revisionExpiraAt: now + REVISION_TTL_MS,
      };

      if (accion !== "renovar") {
        update.revisionIniciadaAt = FieldValue.serverTimestamp();
      }

      if (accion === "forzar") {
        update.revisionForzadaPor = operador.nombre;
      }

      tx.set(docRef, update, { merge: true });
    });
  } catch (error) {
    console.error(`[electron/solicitudes/${id}/revision]`, error);
    return electronJson({ error: "No se pudo actualizar la revisión." }, { status: 500 });
  }

  if (outcome.conflict) {
    return electronJson(
      {
        ok: false,
        error: `La cotización está en revisión por ${outcome.conflict.por}.`,
        por: outcome.conflict.por,
        expiraAt: outcome.conflict.expiraAt,
      },
      { status: 409 },
    );
  }

  if (accion !== "renovar") {
    await bumpSolicitudesVersion(db);
  }

  return electronJson({ ok: true });
}
