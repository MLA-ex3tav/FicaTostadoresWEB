import {
  extractElectronSecretFromRequest,
  isElectronSecretConfigured,
  verifyElectronAppSecret,
} from "@/lib/electron-presence";
import { electronJson, electronOptionsResponse } from "@/lib/electron-cors";
import { getFirebaseAdminFirestore } from "@/lib/firebase-admin";
import { bumpSolicitudesVersion } from "@/lib/solicitudes-sync";
import { SOLICITUDES_COTIZACION_COLLECTION } from "@/lib/cotizaciones/constants";
import { SOLICITUDES_SOPORTE_TECNICO_COLLECTION } from "@/lib/soporte-tecnico/constants";
import { FieldValue } from "firebase-admin/firestore";
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

/**
 * PATCH /api/electron/solicitudes/[id]
 *
 * Edita una cotización existente en el MISMO documento (no crea una copia).
 * Resuelve el documento por su ID de documento o por el campo `id` normalizado,
 * actualiza únicamente los campos enviados y conserva `createdAt` / `source`.
 *
 * DELETE /api/electron/solicitudes/[id]
 *
 * Elimina permanentemente una solicitud (cotización o soporte técnico) de
 * Firestore. Protegido con el secreto compartido de la app de escritorio.
 *
 * Busca el documento en ambas colecciones (cotizaciones y soporte) y lo borra
 * de la que corresponda.
 */

const COLLECTIONS = [SOLICITUDES_COTIZACION_COLLECTION, SOLICITUDES_SOPORTE_TECNICO_COLLECTION];

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

function missingDb(): Response {
  return electronJson(
    {
      error:
        "Firebase Admin no configurado. Defina FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_PATH.",
    },
    { status: 503 },
  );
}

export function OPTIONS() {
  return electronOptionsResponse();
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifyElectronAppSecret(extractElectronSecretFromRequest(request))) {
    return unauthorizedOrUnavailable();
  }

  const { id } = await params;

  if (!id || typeof id !== "string" || !id.trim()) {
    return electronJson({ error: "ID de solicitud requerido." }, { status: 400 });
  }

  const db = getFirebaseAdminFirestore();

  if (!db) {
    return missingDb();
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

  try {
    const collection = db.collection(SOLICITUDES_COTIZACION_COLLECTION);
    let docRef;
    let existingId: string | null = null;
    let existingData: Record<string, unknown> | null = null;

    const byDocId = await collection.doc(id).get();

    if (byDocId.exists) {
      docRef = byDocId.ref;
      const data = byDocId.data() as Record<string, unknown> | undefined;
      existingData = data ?? null;
      existingId =
        typeof data?.id === "string" && data.id.trim() ? data.id : null;
    } else {
      const byIdField = await collection.where("id", "==", id).limit(1).get();

      if (!byIdField.empty) {
        docRef = byIdField.docs[0].ref;
        const data = byIdField.docs[0].data() as Record<string, unknown> | undefined;
        existingData = data ?? null;
        existingId =
          typeof data?.id === "string" && data.id.trim() ? data.id : null;
      }
    }

    if (!docRef) {
      return electronJson(
        { error: `Solicitud no encontrada con ID: ${id}` },
        { status: 404 },
      );
    }

    const update: Record<string, unknown> = {
      // Conserva el folio visible (p. ej. CO 03240 en modo simulación): no se
      // reemplaza por el id del documento, que en simulación es aleatorio.
      id: existingId || docRef.id,
      actualizadoEn: FieldValue.serverTimestamp(),
    };


    if (body.clientName !== undefined && body.clientName !== null) {
      update.clientName = cleanText(body.clientName, 120);
    }

    if (body.clientPhone !== undefined) {
      update.clientPhone = cleanText(body.clientPhone, 32) || null;
    }

    if (body.clientRut !== undefined) {
      update.clientRut = cleanText(body.clientRut, 24) || null;
    }

    if (body.clientEmail !== undefined) {
      update.clientEmail = cleanText(body.clientEmail, 200) || null;
    }

    if (body.clientComuna !== undefined) {
      update.clientComuna = cleanText(body.clientComuna, 100) || null;
    }

    if (body.clientAddress !== undefined) {
      update.clientAddress = cleanText(body.clientAddress, 240) || null;
    }

    if (body.clienteTipo !== undefined) {
      update.clienteTipo = cleanText(body.clienteTipo, 20) || "persona";
    }

    if (body.esMantenimiento === true) {
      update.esMantenimiento = true;
    }

    if (body.precioMantenimiento !== undefined) {
      update.precioMantenimiento = toNumber(body.precioMantenimiento) ?? 0;
    }

    if (body.message !== undefined) {
      update.message = cleanText(body.message, 1000) || null;
    }

    if (body.falla !== undefined) {
      update.falla = cleanText(body.falla, 1000) || null;
    }

    if (body.shipping !== undefined) {
      update.shipping =
        body.shipping && typeof body.shipping === "object" ? body.shipping : null;
    }

    const existingMoneda = parseMoneda(existingData?.moneda);
    const moneda =
      body.moneda !== undefined ? parseMoneda(body.moneda) : existingMoneda;
    const existingTipoCambio = toNumber(existingData?.tipoCambio);
    const tipoCambio =
      moneda === "USD"
        ? body.tipoCambio !== undefined
          ? parseTipoCambio(body.tipoCambio)
          : existingTipoCambio
        : null;
    const aplicaIva =
      body.aplicaIva !== undefined
        ? parseAplicaIva(body.aplicaIva, true)
        : parseAplicaIva(existingData?.aplicaIva, true);

    if (moneda === "USD" && (tipoCambio === null || tipoCambio <= 0)) {
      return electronJson(
        { error: 'Para documentos en USD se requiere un "tipoCambio" válido (CLP por 1 USD).' },
        { status: 400 },
      );
    }

    if (body.moneda !== undefined) {
      if (body.products === undefined && moneda !== existingMoneda) {
        return electronJson(
          { error: "Para cambiar la moneda debes enviar también los productos actualizados." },
          { status: 400 },
        );
      }
      update.moneda = moneda;
      if (moneda === "CLP") {
        update.tipoCambio = null;
        update.tipoCambioFecha = null;
      }
    }

    if (body.aplicaIva !== undefined) {
      update.aplicaIva = aplicaIva;
    }

    if (moneda === "USD") {
      if (body.tipoCambio !== undefined && body.products === undefined) {
        return electronJson(
          { error: "Para cambiar el tipo de cambio debes enviar también los productos actualizados." },
          { status: 400 },
        );
      }
      update.tipoCambio = tipoCambio;
      update.tipoCambioFecha =
        cleanText(body.tipoCambioFecha, 20) ||
        (typeof existingData?.tipoCambioFecha === "string"
          ? existingData.tipoCambioFecha
          : new Date().toISOString().slice(0, 10));
    }

    if (body.products !== undefined) {
      // Protección de despliegue: una versión antigua de la app no envía
      // `moneda` y guardaría precios CLP dentro de un documento USD.
      if (existingMoneda === "USD" && body.moneda === undefined) {
        return electronJson(
          { error: "Este documento está en USD. Actualiza la app para editarlo." },
          { status: 409 },
        );
      }

      const products = parseProductInputLines(body.products);

      if (products.length > 0) {
        update.products = products.map((line) => {
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
        const esMantenimiento =
          body.esMantenimiento === true || existingData?.esMantenimiento === true;
        const precioMantenimiento = toNumber(
          body.precioMantenimiento ?? existingData?.precioMantenimiento,
        );
        const pricing = computePricing(
          esMantenimiento && precioMantenimiento !== null && precioMantenimiento > 0
            ? [{ productId: "mantenimiento", name: "Mantención", quantity: 1, unitPrice: precioMantenimiento }]
            : products,
          {
            moneda,
            tipoCambio,
            aplicaIva,
          },
        );

        update.pricing = pricing;
        update.subtotal = pricing.subtotal;
        update.total = pricing.total;
      }
    }

    if (typeof body.enOT === "boolean") {
      update.enOT = body.enOT;
      update.aprobadaAt = body.enOT ? FieldValue.serverTimestamp() : null;
    }

    if (body.estado !== undefined && body.estado !== null && body.estado !== "") {
      const estado = cleanText(body.estado, 40);

      if (estado) {
        update.estado = estado;
        update.cotizacionEstado = estado;
        update.cotizacionEstadoLabel =
          estado === "aprobada_ot"
            ? "Aprobada (OT)"
            : estado === "aprobada"
              ? "Aprobada"
              : estado === "rechazada"
                ? "Rechazada"
                : estado === "entregada"
                  ? "Entregada"
                  : "Pendiente";
      }
    }

    if (body.fechaEntrega !== undefined) {
      update.fechaEntrega = cleanText(body.fechaEntrega, 60) || null;
    }

    if (body.fechaDespacho !== undefined) {
      update.fechaDespacho = cleanText(body.fechaDespacho, 60) || null;
    }

    if (body.formaEntrega !== undefined) {
      update.formaEntrega = cleanText(body.formaEntrega, 100) || null;
    }

    if (body.ubicacion !== undefined) {
      update.ubicacion = cleanText(body.ubicacion, 100) || null;
    }

    if (body.direccionDespacho !== undefined) {
      update.direccionDespacho = cleanText(body.direccionDespacho, 240) || null;
    }

    if (body.contactoDespacho !== undefined) {
      update.contactoDespacho = cleanText(body.contactoDespacho, 120) || null;
    }

    if (body.valorDespacho !== undefined) {
      update.valorDespacho = body.valorDespacho;
    }

    if (body.pagos !== undefined) {
      update.pagos = Array.isArray(body.pagos) ? body.pagos : [];
    }

    if (body.saldoAbonado !== undefined) {
      update.saldoAbonado = Number(body.saldoAbonado) || 0;
    }

    if (body.saldoPendiente !== undefined) {
      update.saldoPendiente = Number(body.saldoPendiente) || 0;
    }

    if (body.numeroFactura !== undefined) {
      update.numeroFactura = cleanText(body.numeroFactura, 60) || null;
    }

    if (body.capacitacion !== undefined) {
      update.capacitacion = cleanText(body.capacitacion, 100) || null;
    }

    if (body.garantia !== undefined) {
      update.garantia = cleanText(body.garantia, 100) || null;
    }

    if (body.numeroSerie !== undefined) {
      update.numeroSerie = cleanText(body.numeroSerie, 100) || null;
    }

    if (body.actividad !== undefined) {
      update.actividad = cleanText(body.actividad, 150) || null;
    }

    if (typeof body.necesitaModificacion === "boolean") {
      update.necesitaModificacion = body.necesitaModificacion;
      if (body.necesitaModificacion) {
        update.modificacionSolicitadaAt = FieldValue.serverTimestamp();
      } else {
        update.modificacionResueltaAt = FieldValue.serverTimestamp();
      }
    }

    if (body.motivoModificacion !== undefined) {
      update.motivoModificacion = cleanText(body.motivoModificacion, 500) || null;
    }

    await docRef.set(update, { merge: true });

    const dupeQuery = await collection.where("id", "==", docRef.id).get();

    for (const dupeDoc of dupeQuery.docs) {
      if (dupeDoc.id !== docRef.id) {
        await dupeDoc.ref.delete().catch(() => {});
      }
    }

    await bumpSolicitudesVersion(db);

    return electronJson({ ok: true, id: docRef.id });
  } catch (error) {
    console.error(`[electron/solicitudes/${id}]`, error);

    return electronJson(
      { error: "No se pudo actualizar la solicitud." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifyElectronAppSecret(extractElectronSecretFromRequest(request))) {
    return unauthorizedOrUnavailable();
  }

  const { id } = await params;

  if (!id || typeof id !== "string" || !id.trim()) {
    return electronJson({ error: "ID de solicitud requerido." }, { status: 400 });
  }

  const db = getFirebaseAdminFirestore();

  if (!db) {
    return missingDb();
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let docRef: any = null;

    for (const collectionName of COLLECTIONS) {
      const ref = db.collection(collectionName).doc(id);
      const snapshot = await ref.get();

      if (snapshot.exists) {
        docRef = ref;
        break;
      }
    }

    // En modo simulación el folio visible (CO 03240) no es el id del documento:
    // resolver por el campo `id` como respaldo, en ambas colecciones.
    if (!docRef) {
      for (const collectionName of COLLECTIONS) {
        const byIdField = await db
          .collection(collectionName)
          .where("id", "==", id)
          .limit(1)
          .get();

        if (!byIdField.empty) {
          docRef = byIdField.docs[0].ref;
          break;
        }
      }
    }

    if (!docRef) {
      return electronJson(
        { error: `Solicitud no encontrada con ID: ${id}` },
        { status: 404 },
      );
    }

    await docRef.delete();
    await bumpSolicitudesVersion(db);

    return electronJson({ ok: true, id, deleted: true });
  } catch (error) {
    console.error(`[electron/solicitudes/${id}]`, error);

    return electronJson(
      { error: "No se pudo eliminar la solicitud." },
      { status: 500 },
    );
  }
}
