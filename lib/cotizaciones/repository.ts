import { FieldValue } from "firebase-admin/firestore";
import {
  SOLICITUDES_COTIZACION_COLLECTION,
  SOLICITUDES_IDEMPOTENCIA_COLLECTION,
} from "@/lib/cotizaciones/constants";
import { serializeClientSolicitudCotizacion } from "@/lib/cotizaciones/serialize-client-solicitud";
import type { ClientSolicitudCotizacion } from "@/lib/cotizaciones/types";
import {
  esModoSimulacion,
  formatFolio,
  obtenerProximoFolio,
  obtenerProximoFolioEnTransaccion,
} from "@/lib/cotizaciones/folio";
import { enrichCotizacionProducts } from "@/lib/quote-product";
import type { CreateSolicitudCotizacionInput } from "@/lib/validation/cotizacion-input";
import { getFirebaseAdminFirestore } from "@/lib/firebase-admin";
import { isLocalDevMode } from "@/lib/local-dev/mode";
import {
  appendLocalSolicitud,
  listLocalSolicitudes,
  nextLocalFolio,
} from "@/lib/local-dev/solicitudes-store";
import { getProducts } from "@/lib/products-server";
import { bumpSolicitudesVersion } from "@/lib/solicitudes-sync";
import type {
  Firestore,
  Transaction,
} from "firebase-admin/firestore";

export class CotizacionesRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CotizacionesRepositoryError";
  }
}

function buildSolicitudDocData(
  folio: string,
  input: CreateSolicitudCotizacionInput,
  products: ReturnType<typeof enrichCotizacionProducts>,
): Record<string, unknown> {
  return {
    id: folio,
    source: "web",
    clientName: input.name,
    clienteTipo: input.clienteTipo,
    clientPhone: input.phone,
    clientRut: input.rut,
    clientEmail: input.email,
    clientCountry: input.clientCountry,
    message: input.message,
    shipping: input.shipping,
    clientUserId: input.clientUserId,
    idempotencyKey: input.idempotencyKey,
    products,
    estado: "en_revision",
    cotizacionEstado: "en_revision",
    cotizacionEstadoLabel: "En revisión",
    createdAt: FieldValue.serverTimestamp(),
  };
}

function resolveSolicitudDocRef(
  db: Firestore,
  folio: string,
  simulation: boolean,
) {
  return simulation
    ? db.collection(SOLICITUDES_COTIZACION_COLLECTION).doc()
    : db.collection(SOLICITUDES_COTIZACION_COLLECTION).doc(folio);
}

/**
 * Crea la solicitud sin clave de idempotencia (no se puede deduplicar).
 * Mantiene el comportamiento original por si algún cliente no envía clave.
 */
async function crearSolicitudSinIdempotencia(
  db: Firestore,
  input: CreateSolicitudCotizacionInput,
  products: ReturnType<typeof enrichCotizacionProducts>,
): Promise<{ id: string }> {
  const folio = await obtenerProximoFolio(db);
  const simulation = await esModoSimulacion(db);
  const docRef = resolveSolicitudDocRef(db, folio, simulation);

  await docRef.set(buildSolicitudDocData(folio, input, products));
  await bumpSolicitudesVersion(db);

  return { id: folio };
}

/**
 * Crea una solicitud con idempotencia atómica. El guard de idempotencia y la
 * solicitud se escriben en una única transacción: si dos peticiones con la
 * misma clave llegan a la vez (doble submit o reintento tras timeout), una sola
 * transacción gana la escritura del guard y las demás devuelven la solicitud ya
 * creada, evitando cotizaciones duplicadas.
 */
async function crearSolicitudConIdempotencia(
  db: Firestore,
  input: CreateSolicitudCotizacionInput,
  products: ReturnType<typeof enrichCotizacionProducts>,
): Promise<{ id: string }> {
  const simulation = await esModoSimulacion(db);
  const guardRef = db
    .collection(SOLICITUDES_IDEMPOTENCIA_COLLECTION)
    .doc(input.idempotencyKey as string);

  return db.runTransaction(async (tx: Transaction) => {
    const guard = await tx.get(guardRef);

    if (guard.exists) {
      const solicitudId = guard.get("solicitudId");
      return { id: String(solicitudId) };
    }

    const folio = await obtenerProximoFolioEnTransaccion(tx, db, simulation);
    const docRef = resolveSolicitudDocRef(db, folio, simulation);

    tx.set(guardRef, {
      tipo: "cotizacion",
      solicitudId: folio,
      createdAt: FieldValue.serverTimestamp(),
    });

    tx.set(docRef, buildSolicitudDocData(folio, input, products));

    return { id: folio };
  }).then(async (result) => {
    await bumpSolicitudesVersion(db);
    return result;
  });
}

export async function createSolicitudCotizacion(
  input: CreateSolicitudCotizacionInput,
): Promise<{ id: string }> {
  if (isLocalDevMode()) {
    const catalog = await getProducts();
    const products = enrichCotizacionProducts(input.products, catalog);
    const existing = await listLocalSolicitudes("cotizaciones");

    if (input.idempotencyKey) {
      const duplicate = existing.find(
        (record) => record.idempotencyKey === input.idempotencyKey,
      );

      if (duplicate?.id) {
        return { id: String(duplicate.id) };
      }
    }

    const now = new Date().toISOString();
    const folio = formatFolio(await nextLocalFolio("cotizaciones"));

    await appendLocalSolicitud("cotizaciones", {
      id: folio,
      source: "web",
      clientName: input.name,
      clienteTipo: input.clienteTipo,
      clientPhone: input.phone,
      clientRut: input.rut ?? null,
      clientEmail: input.email,
      clientCountry: input.clientCountry,
      message: input.message,
      shipping: input.shipping,
      clientUserId: input.clientUserId,
      idempotencyKey: input.idempotencyKey ?? null,
      products,
      estado: "en_revision",
      cotizacionEstado: "en_revision",
      cotizacionEstadoLabel: "En revisión",
      createdAt: now,
      updatedAt: now,
    });

    return { id: folio };
  }

  const db = getFirebaseAdminFirestore();

  if (!db) {
    throw new CotizacionesRepositoryError(
      "Firebase Admin no configurado. Defina FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_PATH en .env.local.",
    );
  }

  const catalog = await getProducts();
  const products = enrichCotizacionProducts(input.products, catalog);

  if (input.idempotencyKey) {
    return crearSolicitudConIdempotencia(db, input, products);
  }

  return crearSolicitudSinIdempotencia(db, input, products);
}

export async function listSolicitudesByClientUserId(
  clientUserId: string,
): Promise<ClientSolicitudCotizacion[]> {
  if (isLocalDevMode()) {
    const records = await listLocalSolicitudes("cotizaciones");
    const solicitudes = records
      .filter((record) => record.clientUserId === clientUserId)
      .map((record) =>
        serializeClientSolicitudCotizacion(
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
    throw new CotizacionesRepositoryError(
      "Firebase Admin no configurado. Defina FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_PATH en .env.local.",
    );
  }

  const snapshot = await db
    .collection(SOLICITUDES_COTIZACION_COLLECTION)
    .where("clientUserId", "==", clientUserId)
    .limit(100)
    .get();

  const solicitudes = snapshot.docs.map((doc) =>
    serializeClientSolicitudCotizacion(doc.id, doc.data() as Record<string, unknown>),
  );

  solicitudes.sort((left, right) => {
    const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0;
    const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0;
    return rightTime - leftTime;
  });

  return solicitudes;
}