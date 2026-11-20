import type { StaffRole } from "@/lib/staff/types";

/**
 * Cookie firmada (HMAC) que permite a middleware decidir si un usuario puede
 * ver el sitio público. Es independiente de la cookie de sesión de Firebase y
 * funciona en Edge Runtime.
 */
export const STAFF_GATE_COOKIE = "fica_staff_gate";
export const STAFF_GATE_MAX_AGE_SECONDS = 60 * 60 * 12;
const TOKEN_PREFIX = "staff1";

export interface StaffGatePayload {
  uid: string;
  role: StaffRole;
  exp: number;
}

let cachedKey: { secret: string; key: Promise<CryptoKey> } | null = null;

export function getStaffGateSecret(): string | null {
  return (
    process.env.STAFF_GATE_SECRET?.trim() ||
    process.env.OPERADOR_SESSION_SECRET?.trim() ||
    null
  );
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function importKey(secret: string): Promise<CryptoKey> {
  if (cachedKey?.secret === secret) {
    return cachedKey.key;
  }

  const key = crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

  cachedKey = { secret, key };
  return key;
}

export async function createStaffGateToken(input: {
  uid: string;
  role: StaffRole;
}): Promise<string | null> {
  const secret = getStaffGateSecret();

  if (!secret) {
    return null;
  }

  const payload: StaffGatePayload = {
    uid: input.uid,
    role: input.role,
    exp: Math.floor(Date.now() / 1000) + STAFF_GATE_MAX_AGE_SECONDS,
  };

  const body = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${TOKEN_PREFIX}.${body}`),
  );

  return `${TOKEN_PREFIX}.${body}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifyStaffGateToken(
  token: string,
): Promise<StaffGatePayload | null> {
  const secret = getStaffGateSecret();

  if (!secret) {
    return null;
  }

  const parts = token.split(".");

  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) {
    return null;
  }

  const [, body, signature] = parts;

  try {
    const key = await importKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(signature),
      new TextEncoder().encode(`${TOKEN_PREFIX}.${body}`),
    );

    if (!valid) {
      return null;
    }

    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(body)),
    ) as StaffGatePayload;

    if (
      !payload ||
      typeof payload.uid !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    if (payload.role !== "admin" && payload.role !== "editor") {
      return null;
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
