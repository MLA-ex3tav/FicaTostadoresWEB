import { operadorEstaActivo } from "@/lib/operadores/repository";
import {
  getOperadorSecret,
  verifyOperadorToken,
  type OperadorTokenPayload,
} from "@/lib/operadores/token";

/**
 * Extrae y valida el header X-Operador-Token. Devuelve el payload firmado o
 * `null` si falta, está manipulado o expiró.
 */
export function requireOperadorToken(request: Request): OperadorTokenPayload | null {
  const secret = getOperadorSecret();

  if (!secret) {
    return null;
  }

  const header = request.headers.get("x-operador-token")?.trim();

  if (!header) {
    return null;
  }

  return verifyOperadorToken(header, secret);
}

/**
 * Igual que `requireOperadorToken` pero además exige que el operador siga
 * activo (para invalidar tokens de operadores desactivados).
 */
export async function requireOperadorActivo(
  request: Request,
): Promise<OperadorTokenPayload | null> {
  const payload = requireOperadorToken(request);

  if (!payload) {
    return null;
  }

  if (!(await operadorEstaActivo(payload.opId))) {
    return null;
  }

  return payload;
}
