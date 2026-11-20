function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Hash SHA-256 completo (64 hex). Usar para tokens de un solo uso. */
export async function hashToken(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return toHex(hash);
}

export async function hashForRateLimit(value: string): Promise<string> {
  return (await hashToken(value)).slice(0, 16);
}
