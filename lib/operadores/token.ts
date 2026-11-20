import { createHmac, timingSafeEqual } from "node:crypto";

export interface OperadorTokenPayload {
  opId: string;
  nombre: string;
  iat: number;
  exp: number;
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64");
}

function sign(data: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(data).digest();
}

/** Firma un token de sesión de operador: `base64url(payload).base64url(hmac)`. */
export function signOperadorToken(payload: OperadorTokenPayload, secret: string): string {
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = base64UrlEncode(sign(body, secret));
  return `${body}.${signature}`;
}

/** Verifica firma y expiración. Devuelve el payload o `null` si es inválido. */
export function verifyOperadorToken(
  token: string,
  secret: string,
  now: number = Date.now(),
): OperadorTokenPayload | null {
  try {
    const [body, signature] = token.split(".");

    if (!body || !signature) {
      return null;
    }

    const expected = sign(body, secret);
    const provided = base64UrlDecode(signature);

    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(body).toString("utf8")) as OperadorTokenPayload;

    if (typeof payload.opId !== "string" || typeof payload.exp !== "number") {
      return null;
    }

    if (payload.exp <= now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/** Secreto de firma de sesión de operador (env, gitignored). */
export function getOperadorSecret(): string | null {
  return process.env.OPERADOR_SESSION_SECRET?.trim() || null;
}
