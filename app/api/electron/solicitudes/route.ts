import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import {
  extractElectronSecretFromRequest,
  isElectronSecretConfigured,
  verifyElectronAppSecret,
} from "@/lib/electron-presence";
import { electronJson, electronOptionsResponse } from "@/lib/electron-cors";
import { getFirebaseAdminFirestore } from "@/lib/firebase-admin";
import { readSolicitudesVersion, bumpSolicitudesVersion } from "@/lib/solicitudes-sync";
import { SOLICITUDES_COTIZACION_COLLECTION } from "@/lib/cotizaciones/constants";
import { SOLICITUDES_SOPORTE_TECNICO_COLLECTION } from "@/lib/soporte-tecnico/constants";
import {
  cleanText,
  computePricing,
  parseAplicaIva,
  parseMoneda,
  parseProductInputLines,
  parseTipoCambio,
  roundMoney,
  toNumber,
} from "@/lib/electron-solicitud-input";
import {
  counterDocs,
  esModoSimulacion,
  formatFolio,
  formatFolioOt,
  FOLIO_INICIAL,
  FOLIO_MAX,
  readNext,
  obtenerProximoFolioOtEnTransaccion,
  obtenerProximoFolioYOtEnTransaccion,
  parseNumeroFolio,
} from "@/lib/cotizaciones/folio";

/**
 * GET /api/electron/solicitudes?tipo=cotizaciones|soporte
 *
 * Lectura de solicitudes para la app de escritorio (Tauri). La app no tiene
 * login de Firebase y las reglas de Firestore exigen rol staff, así que la
 * lectura se hace aquí con Admin SDK y se protege con el secreto compartido
 * (Authorization: Bearer COTIZACIONES_APP_SECRET), igual que el heartbeat.
 *
 * POST /api/electron/solicitudes
 *
 * Registra una orden de trabajo (OT) creada desde la app móvil. El documento
 * queda en solicitudes_cotizacion con estado "aprobada_ot" y enOT: true, para
 * que aparezca directamente en la pestaña Órdenes de Trabajo de la app de
 * escritorio y del admin web.
 */

const COLLECTIONS_BY_TIPO: Record<string, string> = {
  cotizaciones: SOLICITUDES_COTIZACION_COLLECTION,
  soporte: SOLICITUDES_SOPORTE_TECNICO_COLLECTION,
};

const MAX_SOLICITUDES = 100;

function isFirestoreQuotaError(error: unknown): boolean {
  const value = error && typeof error === "object"
    ? error as { code?: unknown; message?: unknown }
    : null;
  const code = String(value?.code ?? "").toLowerCase();
  const message = String(value?.message ?? error ?? "").toLowerCase();

  return code === "8" ||
    code.includes("resource-exhausted") ||
    code.includes("quota-exceeded") ||
    message.includes("resource_exhausted") ||
    message.includes("resource exhausted") ||
    message.includes("quota exceeded");
}

function solicitudesReadErrorMessage(error: unknown): string {
  return isFirestoreQuotaError(error)
    ? "Se alcanzó el límite de uso de Firebase (Firestore). Revisa la cuota del proyecto y vuelve a intentarlo cuando se restablezca."
    : "No se pudieron leer las solicitudes.";
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.\-]/g, "");
}

function productsKey(products: unknown): string {
  if (!Array.isArray(products)) return "";
  return products
    .map((p) => {
      const rec = p && typeof p === "object" ? (p as Record<string, unknown>) : {};
      return `${normalizeText(rec.name)}x${rec.quantity ?? rec.cantidad ?? 1}:${normalizeText(rec.tipoMantenimiento)}`;
    })
    .sort()
    .join("|");
}

function isoDay(value: unknown): string {
  return String(value ?? "").slice(0, 10);
}

function serializeFirestoreValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value ?? null;
  }

  if (Array.isArray(value)) {
    return value.map(serializeFirestoreValue);
  }

  if (typeof value === "object") {
    const maybeTimestamp = value as { toDate?: () => Date };

    if (typeof maybeTimestamp.toDate === "function") {
      return maybeTimestamp.toDate().toISOString();
    }

    const output: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      output[key] = serializeFirestoreValue(entry);
    }

    return output;
  }

  return value;
}

export function OPTIONS() {
  return electronOptionsResponse();
}

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const tipo = url.searchParams.get("tipo") ?? "cotizaciones";
  const rawVersion = url.searchParams.get("version");
  const clientVersion =
    rawVersion && /^\d+$/.test(rawVersion) ? Number(rawVersion) : null;

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

  // Solo el sondeo incremental de `tipo=all` necesita leer el documento de
  // versión. Las sondas y consultas de una sola colección no deben pagar esa
  // lectura adicional.
  let currentVersion = 0;
  if (tipo === "all") {
    try {
      currentVersion = await readSolicitudesVersion(db);
    } catch (error) {
      console.error("[electron/solicitudes:version]", error);
      return electronJson(
        { error: solicitudesReadErrorMessage(error) },
        { status: isFirestoreQuotaError(error) ? 429 : 500 },
      );
    }
  }

  if (
    tipo === "all" &&
    clientVersion !== null &&
    clientVersion === currentVersion
  ) {
    return electronJson({
      ok: true,
      changed: false,
      version: currentVersion,
    });
  }

  // tipo=all devuelve ambas colecciones en una sola respuesta para reducir
  // el consumo de Redis (rate-limit) en la app de escritorio.
  if (tipo === "all") {
    try {
      const [cotSnap, sopSnap] = await Promise.all([
        db.collection(SOLICITUDES_COTIZACION_COLLECTION).orderBy("createdAt", "desc").limit(MAX_SOLICITUDES).get(),
        db.collection(SOLICITUDES_SOPORTE_TECNICO_COLLECTION).orderBy("createdAt", "desc").limit(MAX_SOLICITUDES).get(),
      ]);

      const dedup = (snapshot: FirebaseFirestore.QuerySnapshot) => {
        const seen = new Map<string, Record<string, unknown>>();
        snapshot.docs.forEach((doc) => {
          const data = (serializeFirestoreValue(doc.data()) as Record<string, unknown>) ?? {};
          const canonicalId = doc.id;
          const visibleId = String(data.id ?? canonicalId).trim() || canonicalId;
          const item = { ...data, id: canonicalId, docId: canonicalId, folio: visibleId };
          const sig = [normalizeText(visibleId), normalizeText(data.clientName), normalizeText(data.clientPhone), productsKey(data.products), isoDay(data.createdAt)].join("::");
          const existing = seen.get(sig);
          if (!existing || canonicalId === visibleId) {
            seen.set(sig, item);
          }
        });
        return Array.from(seen.values());
      };

      const cotizaciones = dedup(cotSnap);
      const soporte = dedup(sopSnap);

      return electronJson({
        ok: true,
        changed: true,
        version: currentVersion,
        tipo: "all",
        cotizaciones: { count: cotizaciones.length, solicitudes: cotizaciones },
        soporte: { count: soporte.length, solicitudes: soporte },
      });
    } catch (error) {
      console.error("[electron/solicitudes:all]", error);
      return electronJson(
        { error: solicitudesReadErrorMessage(error) },
        { status: 500 },
      );
    }
  }

  const collectionName = COLLECTIONS_BY_TIPO[tipo];

  if (!collectionName) {
    return electronJson(
      { error: `Tipo inválido: ${tipo}. Use cotizaciones|soporte|all.` },
      { status: 400 },
    );
  }

  try {
    const snapshot = await db
      .collection(collectionName)
      .orderBy("createdAt", "desc")
      .limit(MAX_SOLICITUDES)
      .get();

    const seen = new Map<string, Record<string, unknown>>();

    snapshot.docs.forEach((doc) => {
      const data = (serializeFirestoreValue(doc.data()) as Record<string, unknown>) ?? {};
      const canonicalId = doc.id;
      const visibleId = String(data.id ?? canonicalId).trim() || canonicalId;

      // El id de respuesta es el id del documento (único) para que borrar /
      // aprobar / rechazar apunten a la cotización correcta, incluso en modo
      // simulación donde varias cotizaciones comparten el folio visible (CO 03240).
      // El folio visible viaja aparte en el campo `folio`.
      const item = {
        ...data,
        id: canonicalId,
        docId: canonicalId,
        folio: visibleId,
      };

      // Deduplica cotizaciones que quedaron repetidas (p. ej. por reintentos del
      // backend antiguo que creaba un documento por edición): mismo folio +
      // mismo cliente + mismos productos el mismo día se consideran la misma
      // solicitud y se conserva la más reciente.
      const sig = [
        normalizeText(visibleId),
        normalizeText(data.clientName),
        normalizeText(data.clientPhone),
        productsKey(data.products),
        isoDay(data.createdAt),
      ].join("::");

      const existing = seen.get(sig);

      if (!existing || canonicalId === visibleId) {
        seen.set(sig, item);
      }
    });

    const solicitudes = Array.from(seen.values());

    return electronJson({
      ok: true,
      changed: true,
      version: currentVersion,
      tipo,
      count: solicitudes.length,
      solicitudes,
    });
  } catch (error) {
    console.error(`[electron/solicitudes:${tipo}]`, error);

    return electronJson(
      { error: solicitudesReadErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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

  let body: Record<string, unknown> = {};

  try {
    const text = await request.text();

    if (text.trim()) {
      body = JSON.parse(text) as Record<string, unknown>;
    }
  } catch {
    return electronJson({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }

  const numeroTexto = String(body.numeroCotizacion ?? "").trim();
  const numeroManual = numeroTexto ? parseNumeroFolio(numeroTexto) : null;
  if (numeroTexto && numeroManual === null) {
    return electronJson({ error: "Número de cotización inválido. Usa el formato CO 03240." }, { status: 400 });
  }
  const numeroOtTexto = String(body.numeroOtManual ?? "").trim();
  const numeroOtManual = numeroOtTexto ? parseNumeroFolio(numeroOtTexto, "ot") : null;
  if (numeroOtTexto && (numeroOtManual === null || numeroOtManual >= FOLIO_MAX)) {
    return electronJson({ error: "Número de OT inválido. Usa el formato OT 1286." }, { status: 400 });
  }
  const clientName = cleanText(body.clientName, 120);
  const clientPhone = cleanText(body.clientPhone, 32);
  const products = parseProductInputLines(body.products);
  const esMantenimiento = body.esMantenimiento === true;
  const precioMantenimiento = toNumber(body.precioMantenimiento);

  if (!clientName) {
    return electronJson(
      { error: 'Campo "clientName" requerido.' },
      { status: 400 },
    );
  }

  if (products.length === 0) {
    return electronJson(
      { error: 'Campo "products" requerido con al menos un producto.' },
      { status: 400 },
    );
  }

  const moneda = parseMoneda(body.moneda);
  const tipoCambio = moneda === "USD" ? parseTipoCambio(body.tipoCambio) : null;
  const aplicaIva = parseAplicaIva(body.aplicaIva, true);

  if (moneda === "USD" && tipoCambio === null) {
    return electronJson(
      { error: 'Para cotizaciones en USD se requiere un "tipoCambio" válido (CLP por 1 USD).' },
      { status: 400 },
    );
  }

  const tipoCambioFecha =
    cleanText(body.tipoCambioFecha, 20) || new Date().toISOString().slice(0, 10);

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

  const pricing = computePricing(
    esMantenimiento && precioMantenimiento !== null && precioMantenimiento > 0
      ? [{ productId: "mantenimiento", name: "Mantención", quantity: 1, unitPrice: precioMantenimiento }]
      : products,
    { moneda, tipoCambio, aplicaIva },
  );
  const subtotal = pricing.subtotal;

  try {
    const customId = cleanText(body.id, 100);
    const collection = db.collection(SOLICITUDES_COTIZACION_COLLECTION);
    const simulation = await esModoSimulacion(db);
    const result = await db.runTransaction(async (tx) => {

      let docRef: DocumentReference | null = null;
      let isUpdate = false;
      let existingData: Record<string, unknown> | null = null;

      const requestedEstado = cleanText(body.estado, 40);
      const estado = requestedEstado || "pendiente";
      const enOT = typeof body.enOT === "boolean"
        ? body.enOT
        : estado === "aprobada_ot";

      // El id visible lo asigna el servidor (CO 03240, CO 03241…). El id que
      // manda la app (COT-xxxxx) se usa solo como clave de origen para que un
      // reintento offline o una edición caigan sobre el mismo documento.
      if (customId) {
        const byDocId = await tx.get(collection.doc(customId));

        if (byDocId.exists) {
          docRef = byDocId.ref;
          isUpdate = true;
        } else {
          const byIdField = await tx.get(collection.where("id", "==", customId).limit(1));

          if (!byIdField.empty) {
            docRef = byIdField.docs[0].ref;
            isUpdate = true;
          } else {
            const byOrigen = await tx.get(collection.where("clienteAppId", "==", customId).limit(1));

            if (!byOrigen.empty) {
              docRef = byOrigen.docs[0].ref;
              isUpdate = true;
            }
          }
        }
      }

      let folio: string;
      let folioOt: string | null = null;
      let folioOtManual = false;

      if (numeroOtManual !== null) {
        const requestedOt = formatFolioOt(numeroOtManual);
        const occupiedOt = await tx.get(collection.where("folioOt", "==", requestedOt).limit(5));
        if (occupiedOt.docs.some((doc) => doc.id !== docRef?.id)) {
          throw new Error("FOLIO_OT_OCUPADO");
        }
      }

      if (docRef) {
        const existing = await tx.get(docRef);
        existingData = existing.data() ?? null;

        // Protección de despliegue: una versión antigua no envía `moneda` y
        // guardaría precios CLP dentro de un documento USD.
        if (parseMoneda(existingData?.moneda) === "USD" && body.moneda === undefined) {
          throw new Error("DOCUMENTO_USD_REQUIERE_APP");
        }

        folio = String(existingData?.folio ?? existingData?.id ?? docRef.id);
        folioOt = typeof existingData?.folioOt === "string" && existingData.folioOt.trim()
          ? existingData.folioOt.trim()
          : null;
        folioOtManual = existingData?.folioOtManual === true;

        // Una edición de una OT antigua que aún no tenía número propio recibe
        // uno nuevo una sola vez.
        if (enOT && !folioOt) {
          folioOt = await obtenerProximoFolioOtEnTransaccion(tx, db, simulation, numeroOtManual ?? undefined);
          folioOtManual = numeroOtManual !== null;
        }
      } else {
        if (numeroManual !== null) {
          const requested = formatFolio(numeroManual);
          const legacy = `CT${numeroManual}`;

          for (const candidate of [requested, legacy]) {
            const occupied = await tx.get(collection.doc(candidate));
            const byId = await tx.get(collection.where("id", "==", candidate).limit(1));
            const byFolio = await tx.get(collection.where("folio", "==", candidate).limit(1));

            if (occupied.exists || !byId.empty || !byFolio.empty) {
              throw new Error("FOLIO_OCUPADO");
            }
          }
        }

        if (!docRef) {
          // Resolver el id ANTES de reservar: la transacción debe leer todo
          // antes de escribir. Antes se leía aquí después del tx.set de folios.
          if (simulation) {
            docRef = collection.doc();
          } else {
            const counterSnapshot = await tx.get(counterDocs(db, false).cotizacion);
            const actual = readNext(counterSnapshot.data()?.next, FOLIO_INICIAL);
            const candidate = collection.doc(formatFolio(numeroManual ?? actual));
            const occupiedDoc = await tx.get(candidate);
            docRef = occupiedDoc.exists ? collection.doc() : candidate;
          }
        }

        const reserved = await obtenerProximoFolioYOtEnTransaccion(
          tx,
          db,
          simulation,
          numeroManual ?? undefined,
          enOT,
          numeroOtManual ?? undefined,
        );
        folio = reserved.folio;
        folioOt = reserved.folioOt;
        folioOtManual = numeroOtManual !== null;
      }


      // El número visible siempre es el folio (el id del documento puede ser
      // único cuando hay folios repetidos).
      const idVisible = folio;

      const now = FieldValue.serverTimestamp();

      const productsData = products.map((line) => {
        const unitPriceClp =
          line.unitPriceClp ??
          (moneda === "USD" && tipoCambio !== null
            ? Math.round(line.unitPrice * tipoCambio)
            : line.unitPrice);

        return {
          productId: line.productId || null,
          name: line.name,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          unitPriceClp,
          lineTotal: roundMoney(line.unitPrice * line.quantity, moneda),
          ...(line.precioManual === true ? { precioManual: true } : {}),
          selectedColorId: line.selectedColorId || null,
          selectedColor: line.selectedColor || null,
          variacionId: line.variacionId || null,
          variacionName: line.variacionName || null,
          ...(line.tipoMantenimiento ? { tipoMantenimiento: line.tipoMantenimiento } : {}),
          catalog: "movil",
        };
      });

      tx.set(docRef,
        {
          id: idVisible,
          ...(isUpdate ? {} : { source: "movil" }),
          ...(isUpdate ? {} : { clienteAppId: customId || null }),
          clientName,
          clientPhone: clientPhone || null,
          clientRut: cleanText(body.clientRut, 24) || null,
          clientEmail: cleanText(body.clientEmail, 200) || null,
          clientComuna: cleanText(body.clientComuna, 100) || null,
          clientAddress: cleanText(body.clientAddress, 240) || null,
          clienteTipo: cleanText(body.clienteTipo, 20) || "persona",
          ...(esMantenimiento ? { esMantenimiento: true } : {}),
          ...(esMantenimiento && precioMantenimiento !== null && precioMantenimiento > 0
            ? { precioMantenimiento }
            : {}),
          falla: cleanText(body.falla, 1000) || null,
          message: cleanText(body.message, 1000) || null,
          shipping: body.shipping && typeof body.shipping === "object" ? body.shipping : null,
          products: productsData,
          pricing,
          subtotal,
          total: pricing.total,
          moneda,
          aplicaIva,
          ...(moneda === "USD" && tipoCambio !== null
            ? { tipoCambio, tipoCambioFecha }
            : {}),
          estado,
          cotizacionEstado: estado,
          cotizacionEstadoLabel: estado === "aprobada_ot" ? "Aprobada (OT)" : "Pendiente",
          enOT,
          ...(folioOt ? { folioOt } : {}),
          ...(folioOt ? { folioOtManual } : {}),
          actualizadoEn: now,
          ...(isUpdate
            ? {}
            : {
                createdAt: now,
                produccion: false,
                produccionEtapa: "por_iniciar",
                produccionEtapaLabel: "Por iniciar",
                aprobadaAt: enOT ? now : null,
              }),
        },
        { merge: true },
      );

      return { id: idVisible, estado, folio, folioOt };
    });

    await bumpSolicitudesVersion(db);

    return electronJson(
      { ok: true, ...result },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "FOLIO_OCUPADO") {
      return electronJson({ error: "Ese número de cotización ya está ocupado. Elige otro o deja el campo vacío." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "FOLIO_OT_OCUPADO") {
      return electronJson({ error: "Ese número de OT ya está ocupado. Elige otro." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "DOCUMENTO_USD_REQUIERE_APP") {
      return electronJson(
        { error: "Este documento está en USD. Actualiza la app para editarlo." },
        { status: 409 },
      );
    }
    console.error("[electron/solicitudes POST]", error);

    return electronJson(
      { error: "No se pudo registrar la orden de trabajo." },
      { status: 500 },
    );
  }
}
