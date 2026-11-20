/** Perfil de despacho del cliente. Los roles NO viven aquí (ver `staff`). */
export const CLIENTES_COLLECTION = "clientes";

/** Personal con acceso al panel (fuente de verdad del rol). Solo Admin SDK. */
export const STAFF_COLLECTION = "staff";

/** Invitaciones de enlace y correos autorizados. Solo Admin SDK. */
export const STAFF_INVITACIONES_COLLECTION = "staff_invitaciones";

export { SOLICITUDES_COTIZACION_COLLECTION } from "@/lib/cotizaciones/constants";
export { SOLICITUDES_SOPORTE_TECNICO_COLLECTION } from "@/lib/soporte-tecnico/constants";

export type { UserRole } from "@/lib/permissions";
export {
  canAccessAdminPanel,
  canManageCatalog,
  canManageUsers,
  isAdminRole,
  isStaffRole,
  isSuperAdminRole,
  parseUserRole,
  USER_ROLES,
} from "@/lib/permissions";
