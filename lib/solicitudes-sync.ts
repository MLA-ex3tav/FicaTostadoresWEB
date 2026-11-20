import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { getFirebaseAdminFirestore } from "@/lib/firebase-admin";

const SYNC_COLLECTION = "config";
const SYNC_DOC_ID = "solicitudes_sync";

/**
 * Marca global para que la app de escritorio sepa si las solicitudes cambiaron
 * sin releer las colecciones completas en cada polling.
 */
export async function readSolicitudesVersion(
  db: Firestore | null = getFirebaseAdminFirestore(),
): Promise<number> {
  if (!db) {
    return 0;
  }

  try {
    const snapshot = await db
      .collection(SYNC_COLLECTION)
      .doc(SYNC_DOC_ID)
      .get();
    const version = snapshot.data()?.version;
    return typeof version === "number" && Number.isFinite(version)
      ? version
      : 0;
  } catch (error) {
    console.error("[solicitudes-sync] no se pudo leer la versión:", error);
    throw error;
  }
}

/**
 * Incrementa la versión cuando se crea, actualiza o elimina una solicitud.
 * Es best-effort: un fallo aquí no debe hacer fallar la operación principal.
 */
export async function bumpSolicitudesVersion(
  db: Firestore | null = getFirebaseAdminFirestore(),
): Promise<void> {
  if (!db) {
    return;
  }

  try {
    await db
      .collection(SYNC_COLLECTION)
      .doc(SYNC_DOC_ID)
      .set(
        {
          version: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  } catch (error) {
    console.error("[solicitudes-sync] no se pudo incrementar la versión:", error);
  }
}
