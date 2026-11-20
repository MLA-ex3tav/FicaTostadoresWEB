export const PERSON_NAME_MIN_LENGTH = 3;
export const PERSON_NAME_MAX_LENGTH = 120;

/**
 * Nombre compuesto por letras (incluye acentos), espacios y separadores
 * habituales (punto, apóstrofo, guion, coma, paréntesis, ampersand y barra).
 * Debe contener al menos 3 letras para descartar entradas como "d".
 */
const PERSON_NAME_ALLOWED = /^[\p{L}\p{M}][\p{L}\p{M}\s.'&,()/-]*$/u;
const COMPANY_NAME_ALLOWED = /^[\p{L}\p{N}\p{M}][\p{L}\p{N}\p{M}\s.'&,()/#+-]*$/u;
const LETTER_PATTERN = /\p{L}/gu;

export type ClienteTipo = "empresa" | "persona";

export function isValidPersonName(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }

  const name = value.trim().replace(/\s+/g, " ");

  if (
    name.length < PERSON_NAME_MIN_LENGTH ||
    name.length > PERSON_NAME_MAX_LENGTH
  ) {
    return false;
  }

  if (!PERSON_NAME_ALLOWED.test(name)) {
    return false;
  }

  const letters = name.match(LETTER_PATTERN);

  return (letters?.length ?? 0) >= PERSON_NAME_MIN_LENGTH;
}

/** Razón social: admite dígitos y más separadores que un nombre de persona. */
export function isValidCompanyName(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }

  const name = value.trim().replace(/\s+/g, " ");

  if (
    name.length < PERSON_NAME_MIN_LENGTH ||
    name.length > PERSON_NAME_MAX_LENGTH
  ) {
    return false;
  }

  if (!COMPANY_NAME_ALLOWED.test(name)) {
    return false;
  }

  const letters = name.match(LETTER_PATTERN);

  return (letters?.length ?? 0) >= 2;
}

export function isValidClientName(value: unknown, tipo: ClienteTipo): boolean {
  return tipo === "empresa"
    ? isValidCompanyName(value)
    : isValidPersonName(value);
}
