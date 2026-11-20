import type { Timestamp } from "firebase-admin/firestore";
import type { TechnicalIssueCategoryId } from "@/lib/soporte-tecnico/issue-categories";

export interface WebSolicitudSoporteTecnicoRecord {
  source: "web";
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  clientCountry: string | null;
  clientUserId: string | null;
  equipmentModel: string;
  productId: string | null;
  issueCategory: TechnicalIssueCategoryId;
  issueDescription: string;
  equipmentLocation: string | null;
  createdAt: Timestamp;
}

/** Vista de una solicitud de soporte/servicio técnico para el cliente autenticado. */
export interface ClientSolicitudSoporteTecnico {
  id: string;
  createdAt: string | null;
  equipmentModel: string;
  productId?: string | null;
  issueCategory: string;
  issueCategoryLabel: string;
  issueDescription: string;
  equipmentLocation?: string | null;
  estado?: string | null;
  estadoLabel?: string | null;
  enOT?: boolean;
  otFolio?: string | null;
  otNumero?: string | null;
  produccionEtapa?: string | null;
  produccionEtapaLabel?: string | null;
  estadoActualizadoAt?: string | null;
}

