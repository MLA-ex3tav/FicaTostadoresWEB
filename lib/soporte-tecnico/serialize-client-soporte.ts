import type { Timestamp } from "firebase-admin/firestore";
import {
  getTechnicalIssueCategoryLabel,
  isTechnicalIssueCategoryId,
} from "@/lib/soporte-tecnico/issue-categories";
import type { ClientSolicitudSoporteTecnico } from "@/lib/soporte-tecnico/types";

function serializeTimestamp(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as Timestamp).toDate === "function"
  ) {
    return (value as Timestamp).toDate().toISOString();
  }

  return null;
}

function readBoolean(value: unknown): boolean {
  return value === true;
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

export function serializeClientSolicitudSoporte(
  id: string,
  data: Record<string, unknown>,
): ClientSolicitudSoporteTecnico {
  const rawCategory = readString(data.issueCategory) ?? readString(data.categoria) ?? "otro";
  const issueCategoryLabel = isTechnicalIssueCategoryId(rawCategory)
    ? getTechnicalIssueCategoryLabel(rawCategory)
    : rawCategory;

  const equipmentModel =
    readString(data.equipmentModel) ??
    readString(data.modelo) ??
    readString(data.equipo) ??
    "Equipo Fica";

  const issueDescription =
    readString(data.issueDescription) ??
    readString(data.descripcion) ??
    readString(data.detalle) ??
    readString(data.message) ??
    "";

  return {
    id,
    createdAt: serializeTimestamp(data.createdAt) ?? serializeTimestamp(data.fecha),
    equipmentModel,
    productId: readString(data.productId),
    issueCategory: rawCategory,
    issueCategoryLabel,
    issueDescription,
    equipmentLocation: readString(data.equipmentLocation) ?? readString(data.ubicacion),
    estado: readString(data.estado) ?? readString(data.estadoSoporte),
    estadoLabel: readString(data.estadoLabel) ?? readString(data.estadoSoporteLabel),
    enOT: readBoolean(data.enOT),
    otFolio: readString(data.otFolio) ?? readString(data.otNumero),
    otNumero: readString(data.otNumero) ?? readString(data.otFolio),
    produccionEtapa: readString(data.produccionEtapa),
    produccionEtapaLabel: readString(data.produccionEtapaLabel),
    estadoActualizadoAt: serializeTimestamp(data.estadoActualizadoAt) ?? serializeTimestamp(data.actualizadoEn),
  };
}
