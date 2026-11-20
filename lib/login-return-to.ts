export function sanitizeReturnTo(value: string | null | undefined): string {
  if (!value) {
    return "/";
  }

  const path = value.trim();

  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.startsWith("/iniciar-sesion") ||
    path.startsWith("/registro") ||
    path.startsWith("/admin/login")
  ) {
    return "/";
  }

  return path;
}

const GUEST_RESTRICTED_PREFIXES = ["/perfil", "/mis-solicitudes", "/admin"];

export function resolveGuestReturnTo(value: string | null | undefined): string {
  const path = sanitizeReturnTo(value);

  if (GUEST_RESTRICTED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return "/cotizar";
  }

  return path;
}

export function buildLoginHref(returnTo: string): string {
  return `/iniciar-sesion?returnTo=${encodeURIComponent(sanitizeReturnTo(returnTo))}`;
}

export function buildRegisterHref(returnTo: string): string {
  return `/registro?returnTo=${encodeURIComponent(sanitizeReturnTo(returnTo))}`;
}
