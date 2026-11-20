import type { UserRole } from "@/lib/permissions";

export type StaffRole = Extract<UserRole, "editor" | "admin">;

export type StaffInvitacionTipo = "enlace" | "correo";

export interface StaffMember {
  uid: string;
  email: string;
  displayName: string | null;
  role: StaffRole;
  creadoAt: string | null;
  actualizadoAt: string | null;
  creadoPor: string | null;
}

export interface StaffInvitacion {
  id: string;
  tipo: StaffInvitacionTipo;
  rol: StaffRole;
  email: string | null;
  creadoPor: string | null;
  creadoAt: string | null;
  expiraAt: string | null;
  usadoAt: string | null;
  revocadaAt: string | null;
}

export interface CrearInvitacionResult {
  invitacion: StaffInvitacion;
  /** Enlace con el token; solo se devuelve al crearlo. */
  enlace: string | null;
}

export type AceptarInvitacionFailureReason =
  | "no_valida"
  | "usada"
  | "expirada"
  | "correo_no_coincide";

export type AceptarInvitacionResult =
  | { ok: true; role: StaffRole; invitacionId: string }
  | { ok: false; reason: AceptarInvitacionFailureReason };

export const STAFF_ROLES: StaffRole[] = ["editor", "admin"];

export function isStaffRoleValue(value: unknown): value is StaffRole {
  return value === "editor" || value === "admin";
}
