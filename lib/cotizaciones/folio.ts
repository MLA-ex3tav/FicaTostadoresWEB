import type { Firestore, Transaction } from "firebase-admin/firestore";
import { SOLICITUDES_COTIZACION_COLLECTION } from "@/lib/cotizaciones/constants";

/**
 * Numeración de cotizaciones y órdenes de trabajo.
 *
 * Formatos visibles:
 * - Cotización: CO + 5 dígitos (CO 03240).
 * - OT: OT + 4 dígitos (OT 1286).
 *
 * Cotizaciones y OT usan contadores independientes, y cada uno tiene su
 * variante de simulación para no consumir la numeración real.
 */

export const FOLIO_PREFIX = "CO";
export const FOLIO_INICIAL = 126;

export const FOLIO_OT_PREFIX = "OT";
export const FOLIO_OT_INICIAL = 1;

export const FOLIO_MAX = 999_999_999;

const FOLIO_COUNTER_COLLECTION = "config";
const FOLIO_COUNTER_DOC = "folios_cotizaciones";
/** Contador independiente usado mientras el modo simulación está activo. */
const FOLIO_SIM_COUNTER_DOC = "folios_cotizaciones_simulacion";
const FOLIO_OT_COUNTER_DOC = "folios_ot";
const FOLIO_OT_SIM_COUNTER_DOC = "folios_ot_simulacion";

const APP_SETTINGS_COLLECTION = "config";
const APP_SETTINGS_DOC = "app_settings";
const APP_SETTINGS_FIELD = "simulacionFolios";

export interface FolioCounters {
  cotizacion: number;
  ot: number;
}

export interface FolioCounterState {
  next: number;
  folio: string;
}

export function readNext(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : fallback;
}

export function counterDocs(db: Firestore, simulation: boolean) {
  const collection = db.collection(FOLIO_COUNTER_COLLECTION);

  return {
    cotizacion: collection.doc(
      simulation ? FOLIO_SIM_COUNTER_DOC : FOLIO_COUNTER_DOC,
    ),
    ot: collection.doc(simulation ? FOLIO_OT_SIM_COUNTER_DOC : FOLIO_OT_COUNTER_DOC),
  };
}

/** Formatea el número de cotización: 3240 → "CO 03240". */
export function formatFolio(numero: number): string {
  return `${FOLIO_PREFIX} ${String(numero).padStart(5, "0")}`;
}

/** Formatea el número de OT: 1286 → "OT 1286"; 1 → "OT 0001". */
export function formatFolioOt(numero: number): string {
  return `${FOLIO_OT_PREFIX} ${String(numero).padStart(4, "0")}`;
}

/**
 * Acepta "CO 03240", "CO03240", "CT150", "OT 1286" o "3240" y devuelve el
 * número. El prefijo debe corresponder al tipo indicado. Devuelve `null` si el
 * valor no es un entero positivo válido.
 */
export function parseNumeroFolio(
  value: unknown,
  tipo: "cotizacion" | "ot" = "cotizacion",
): number | null {
  const text = String(value ?? "").trim().toUpperCase();
  if (!text) return null;

  const prefijo = text.match(/^(CO|CT|OT)[\s-]*/i);

  if (prefijo) {
    const encontrado = prefijo[1].toUpperCase();
    if (tipo === "cotizacion" && encontrado === FOLIO_OT_PREFIX) return null;
    if (tipo === "ot" && encontrado !== FOLIO_OT_PREFIX) return null;
  }

  const digits = text.replace(/^(?:CO|CT|OT)[\s-]*/i, "").trim();
  if (!/^\d{1,9}$/.test(digits)) return null;

  const numero = Number(digits);
  return Number.isSafeInteger(numero) && numero >= 1 && numero <= FOLIO_MAX
    ? numero
    : null;
}

/**
 * Modo simulación / desarrollo. Mientras está activo, las cotizaciones y OT
 * usan contadores propios, sin consumir la numeración real. Al desactivarlo se
 * vuelve al contador real (que sigue intacto).
 */
export function simulacionForzadaPorEnv(): boolean {
  return process.env.VITE_SIMULACION_MODE === "true";
}

export async function esModoSimulacion(db: Firestore): Promise<boolean> {
  if (simulacionForzadaPorEnv()) {
    return true;
  }

  try {
    const snapshot = await db
      .collection(APP_SETTINGS_COLLECTION)
      .doc(APP_SETTINGS_DOC)
      .get();

    return snapshot.data()?.[APP_SETTINGS_FIELD] === true;
  } catch {
    return false;
  }
}

/** Persiste el estado del modo simulación para que sea compartido por las apps. */
export async function setModoSimulacion(
  db: Firestore,
  activo: boolean,
): Promise<void> {
  await db
    .collection(APP_SETTINGS_COLLECTION)
    .doc(APP_SETTINGS_DOC)
    .set({ [APP_SETTINGS_FIELD]: activo }, { merge: true });
}

/**
 * Lee los próximos números (cotización y OT) del contador activo.
 */
export async function leerContadoresFolios(
  db: Firestore,
  simulation: boolean,
): Promise<FolioCounters> {
  const refs = counterDocs(db, simulation);
  const [cotizacion, ot] = await Promise.all([
    refs.cotizacion.get(),
    refs.ot.get(),
  ]);

  return {
    cotizacion: readNext(cotizacion.data()?.next, FOLIO_INICIAL),
    ot: readNext(ot.data()?.next, FOLIO_OT_INICIAL),
  };
}

/**
 * Guarda los próximos números del contador activo.
 *
 * Permite cualquier número válido, incluso hacia atrás o uno ya usado: el
 * llamador decide si advierte. Esto deja ajustar la numeración manualmente sin
 * bloquear el flujo (la advertencia de "número ocupado" se calcula aparte).
 */
export async function actualizarContadoresFolios(
  db: Firestore,
  simulation: boolean,
  patch: Partial<FolioCounters>,
): Promise<FolioCounters> {
  const refs = counterDocs(db, simulation);

  return db.runTransaction(async (tx) => {
    const cotizacionSnapshot = await tx.get(refs.cotizacion);
    const otSnapshot = await tx.get(refs.ot);

    const actual: FolioCounters = {
      cotizacion: readNext(cotizacionSnapshot.data()?.next, FOLIO_INICIAL),
      ot: readNext(otSnapshot.data()?.next, FOLIO_OT_INICIAL),
    };

    const siguiente: FolioCounters = {
      cotizacion: patch.cotizacion ?? actual.cotizacion,
      ot: patch.ot ?? actual.ot,
    };

    if (!Number.isInteger(siguiente.cotizacion) || siguiente.cotizacion < 1 || siguiente.cotizacion > FOLIO_MAX) {
      throw new Error("FOLIO_COTIZACION_INVALIDO");
    }
    if (!Number.isInteger(siguiente.ot) || siguiente.ot < 1 || siguiente.ot > FOLIO_MAX) {
      throw new Error("FOLIO_OT_INVALIDO");
    }

    tx.set(refs.cotizacion, { next: siguiente.cotizacion }, { merge: true });
    tx.set(refs.ot, { next: siguiente.ot }, { merge: true });

    return siguiente;
  });
}

/**
 * Comprueba si los próximos números ya están usados por alguna cotización/OT.
 * Devuelve mensajes de advertencia (vacío si están libres). No bloquea: solo
 * informa para que la app avise al usuario.
 */
export async function detectarFoliosOcupados(
  db: Firestore,
  counters: FolioCounters,
): Promise<string[]> {
  const collection = db.collection(SOLICITUDES_COTIZACION_COLLECTION);
  const folioCotizacion = formatFolio(counters.cotizacion);
  const folioOt = formatFolioOt(counters.ot);

  const [cotizacionPorId, cotizacionPorFolio, otPorFolio] = await Promise.all([
    collection.where("id", "==", folioCotizacion).limit(1).get(),
    collection.where("folio", "==", folioCotizacion).limit(1).get(),
    collection.where("folioOt", "==", folioOt).limit(1).get(),
  ]);

  const advertencias: string[] = [];

  if (!cotizacionPorId.empty || !cotizacionPorFolio.empty) {
    advertencias.push(`La cotización ${folioCotizacion} ya está en uso.`);
  }

  if (!otPorFolio.empty) {
    advertencias.push(`La OT ${folioOt} ya está en uso.`);
  }

  return advertencias;
}

/**
 * Devuelve el próximo folio de cotización (CO 03240, CO 03241…) de forma
 * atómica. Un número manual adelanta el contador si es mayor, pero nunca lo
 * retrocede. El llamador comprueba que el folio manual esté libre.
 */
export async function obtenerProximoFolio(db: Firestore): Promise<string> {
  const simulation = await esModoSimulacion(db);

  return db.runTransaction((tx) =>
    obtenerProximoFolioEnTransaccion(tx, db, simulation),
  );
}

/**
 * Variante que participa en una transacción ya abierta (evita transacciones
 * anidadas). La usa la creación idempotente de solicitudes, donde el folio,
 * el guard de idempotencia y el documento de la solicitud se escriben de
 * forma atómica en una sola transacción.
 */
export async function obtenerProximoFolioEnTransaccion(
  tx: Transaction,
  db: Firestore,
  simulation: boolean,
  numeroManual?: number,
): Promise<string> {
  const ref = counterDocs(db, simulation).cotizacion;

  const snapshot = await tx.get(ref);
  const data = snapshot.data();
  const actual = readNext(data?.next, FOLIO_INICIAL);

  const numero = numeroManual ?? actual;
  tx.set(ref, { next: Math.max(actual, numero + 1) }, { merge: true });

  return formatFolio(numero);
}

/**
 * Reserva en una sola transacción el folio de cotización y, si corresponde,
 * el número de OT. Lee ambos contadores antes de escribir para respetar la
 * regla de Firestore de "todas las lecturas antes de las escrituras".
 */
export async function obtenerProximoFolioYOtEnTransaccion(
  tx: Transaction,
  db: Firestore,
  simulation: boolean,
  numeroManual: number | undefined,
  incluirOt: boolean,
  numeroOtManual?: number,
): Promise<{ folio: string; folioOt: string | null }> {
  const refs = counterDocs(db, simulation);

  const cotizacionSnapshot = await tx.get(refs.cotizacion);
  const otSnapshot = incluirOt ? await tx.get(refs.ot) : null;

  const cotizacionActual = readNext(
    cotizacionSnapshot.data()?.next,
    FOLIO_INICIAL,
  );
  const numeroCotizacion = numeroManual ?? cotizacionActual;
  const otActual = otSnapshot
    ? readNext(otSnapshot.data()?.next, FOLIO_OT_INICIAL)
    : null;
  const numeroOt = numeroOtManual ?? otActual;

  tx.set(
    refs.cotizacion,
    { next: Math.max(cotizacionActual, numeroCotizacion + 1) },
    { merge: true },
  );

  if (otSnapshot && otActual !== null && numeroOt !== null) {
    tx.set(refs.ot, { next: Math.max(otActual, numeroOt + 1) }, { merge: true });
  }

  return {
    folio: formatFolio(numeroCotizacion),
    folioOt: numeroOt !== null ? formatFolioOt(numeroOt) : null,
  };
}

/**
 * Devuelve el próximo número de OT (OT 1286, OT 1287…) de forma atómica y lo
 * reserva. El contador de OT es independiente del de cotizaciones.
 */
export async function obtenerProximoFolioOtEnTransaccion(
  tx: Transaction,
  db: Firestore,
  simulation: boolean,
  numeroManual?: number,
): Promise<string> {
  const ref = counterDocs(db, simulation).ot;

  const snapshot = await tx.get(ref);
  const data = snapshot.data();
  const actual = readNext(data?.next, FOLIO_OT_INICIAL);
  const numero = numeroManual ?? actual;

  tx.set(ref, { next: Math.max(actual, numero + 1) }, { merge: true });

  return formatFolioOt(numero);
}
