/**
 * Utilidades para el RUT chileno. Compatibles con client y server.
 * El valor se normaliza a formato estándar (XX.XXX.XXX-X) antes de guardarlo.
 */

const NON_RUT_CHARS = /[^0-9kK]/g;

/** Deja solo dígitos y la letra K (mayúscula). */
export function cleanRut(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).replace(NON_RUT_CHARS, "").toUpperCase();
}

/** Verifica formato de RUT chileno (largo y dígito verificador). */
export function isValidRutFormat(value: unknown): boolean {
  const cleaned = cleanRut(value);

  if (cleaned.length < 7 || cleaned.length > 9) {
    return false;
  }

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  return /^\d+$/.test(body) && /^[0-9K]$/.test(dv);
}

/**
 * Valida un RUT chileno calculando el dígito verificador (módulo 11).
 * Devuelve `false` si está incompleto o el DV no corresponde.
 */
export function validarRut(value: unknown): boolean {
  const cleaned = cleanRut(value);

  if (cleaned.length < 2) {
    return false;
  }

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  if (!/^\d+$/.test(body)) {
    return false;
  }

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const rest = 11 - (sum % 11);
  const expected = rest === 11 ? "0" : rest === 10 ? "K" : String(rest);

  return dv === expected;
}

/**
 * Formatea un RUT chileno en formato estándar (XX.XXX.XXX-X).
 * Acepta valores parciales para usarse mientras el usuario escribe.
 */
export function formatRut(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const raw = String(value).trim();

  if (!raw) {
    return "";
  }

  const cleaned = cleanRut(raw);

  if (cleaned.length < 2) {
    return cleaned;
  }

  const dv = cleaned.slice(-1);
  const body = cleaned.slice(0, -1);
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${formattedBody}-${dv}`;
}
