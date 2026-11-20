import { FieldValue } from "firebase-admin/firestore";
import {
  SOLICITUDES_SOPORTE_TECNICO_COLLECTION,
  SOLICITUDES_IDEMPOTENCIA_COLLECTION,
} from "@/lib/soporte-tecnico/constants";
import type { TechnicalIssueCategoryId } from "@/lib/soporte-tecnico/issue-categories";
import { serializeClientSolicitudSoporte } from "@/lib/soporte-tecnico/serialize-client-soporte";
import type { ClientSolicitudSoporteTecnico } from "@/lib/soporte-tecnico/types";
import type { CreateSolicitudSoporteTecnicoInput } from "@/lib/validation/soporte-tecnico-input";
import { getFirebaseAdminFirestore } from "@/lib/firebase-admin";
import { isLocalDevMode } from "@/lib/local-dev/mode";
import {
  appendLocalSolicitud,
  listLocalSolicitudes,
  nextLocalFolio,
} from "@/lib/local-dev/solicitudes-store";
import { bumpSolicitudesVersion } from "@/lib/solicitudes-sync";
import type { Transaction } from "firebase-admin/firestore";

export class SoporteTecnicoRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SoporteTecnicoRepositoryError";
  }
}

function buildSolicitudDocData(
  docId: string,
  input: CreateSolicitudSoporteTecnicoInput,
): Record<string, unknown> {
  return {
    id: docId,
    source: "web",
    clientName: input.name,
    clientPhone: input.phone,
    clientEmail: input.email,
    clientCountry: input.clientCountry,
    clientUserId: input.clientUserId,
    equipmentModel: input.equipmentModel,
    productId: input.productId,
    issueCategory: input.issueCategory as TechnicalIssueCategoryId,
    issueDescription: input.issueDescription,
    equipmentLocation: input.equipmentLocation,
    idempotencyKey: input.idempotencyKey,
    createdAt: FieldValue.serverTimestamp(),
  };
}

/**
 * Crea una solicitud de soporte técnico con idempotencia atómica: el guard y
 * la solicitud se escriben en una única transacción. Si dos peticiones con la
 * misma clave llegan a la vez, una sola gana la escritura del guard y las
 * demás devuelven la solicitud ya creada, evitando duplicados.
 */
export async function createSolicitudSoporteTecnico(
  input: CreateSolicitudSoporteTecnicoInput,
): Promise<{ id: string }> {
  if (isLocalDevMode()) {
    const existing = await listLocalSolicitudes("soporte");

    if (input.idempotencyKey) {
      const duplicate = existing.find(
        (record) => record.idempotencyKey === input.idempotencyKey,
      );

      if (duplicate?.id) {
        return { id: String(duplicate.id) };
      }
    }

    const now = new Date().toISOString();
    const numero = await nextLocalFolio("soporte");
    const id = `SOP ${String(numero).padStart(4, "0")}`;

    await appendLocalSolicitud("soporte", {
      id,
      source: "web",
      clientName: input.name,
      clientPhone: input.phone,
      clientEmail: input.email,
      clientCountry: input.clientCountry,
      clientUserId: input.clientUserId,
      equipmentModel: input.equipmentModel,
      productId: input.productId,
      issueCategory: input.issueCategory,
      issueDescription: input.issueDescription,
      equipmentLocation: input.equipmentLocation,
      idempotencyKey: input.idempotencyKey ?? null,
      createdAt: now,
      updatedAt: now,
    });

    return { id };
  }

  const db = getFirebaseAdminFirestore();

  if (!db) {
    throw new SoporteTecnicoRepositoryError(
      "Firebase Admin no configurado. Defina FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_PATH en .env.local.",
    );
  }

  if (!input.idempotencyKey) {
    const docRef = db.collection(SOLICITUDES_SOPORTE_TECNICO_COLLECTION).doc();

    await docRef.set(buildSolicitudDocData(docRef.id, input));
    await bumpSolicitudesVersion(db);

    return { id: docRef.id };
  }

  const guardRef = db
    .collection(SOLICITUDES_IDEMPOTENCIA_COLLECTION)
    .doc(input.idempotencyKey);

  return db.runTransaction(async (tx: Transaction) => {
    const guard = await tx.get(guardRef);

    if (guard.exists) {
      const solicitudId = guard.get("solicitudId");
      return { id: String(solicitudId) };
    }

    const docRef = db.collection(SOLICITUDES_SOPORTE_TECNICO_COLLECTION).doc();

    tx.set(guardRef, {
      tipo: "soporte",
      solicitudId: docRef.id,
      createdAt: FieldValue.serverTimestamp(),
    });

    tx.set(docRef, buildSolicitudDocData(docRef.id, input));

    return { id: docRef.id };
  }).then(async (result) => {
    await bumpSolicitudesVersion(db);
    return result;
  });
}

export async function listSolicitudesSoporteByClientUserId(
  clientUserId: string,
): Promise<ClientSolicitudSoporteTecnico[]> {
  if (isLocalDevMode()) {
    const records = await listLocalSolicitudes("soporte");
    const solicitudes = records
      .filter((record) => record.clientUserId === clientUserId)
      .map((record) =>
        serializeClientSolicitudSoporte(
          String(record.id ?? "local"),
          record,
        ),
      );

    solicitudes.sort((left, right) => {
      const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0;
      const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0;
      return rightTime - leftTime;
    });

    return solicitudes;
  }

  const db = getFirebaseAdminFirestore();

  if (!db) {
    throw new SoporteTecnicoRepositoryError(
      "Firebase Admin no configurado. Defina FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_PATH en .env.local.",
    );
  }

  const snapshot = await db
    .collection(SOLICITUDES_SOPORTE_TECNICO_COLLECTION)
    .where("clientUserId", "==", clientUserId)
    .limit(100)
    .get();

  const solicitudes = snapshot.docs.map((doc) =>
    serializeClientSolicitudSoporte(doc.id, doc.data() as Record<string, unknown>),
  );

  solicitudes.sort((left, right) => {
    const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0;
    const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0;
    return rightTime - leftTime;
  });

  return solicitudes;
}