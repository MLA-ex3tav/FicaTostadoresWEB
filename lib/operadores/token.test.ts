import { describe, it, expect } from "vitest";
import { signOperadorToken, verifyOperadorToken } from "./token";

const payload = { opId: "juan", nombre: "Juan", iat: 1000, exp: 2000 };

describe("operador token", () => {
  it("firma y verifica", () => {
    const t = signOperadorToken(payload, "s3cr3t");
    expect(verifyOperadorToken(t, "s3cr3t", 1500)?.opId).toBe("juan");
  });

  it("rechaza firma manipulada o secreto distinto", () => {
    const t = signOperadorToken(payload, "s3cr3t");
    expect(verifyOperadorToken(t, "otro", 1500)).toBeNull();
    expect(verifyOperadorToken(t.slice(0, -2) + "xx", "s3cr3t", 1500)).toBeNull();
  });

  it("rechaza token expirado", () => {
    const t = signOperadorToken(payload, "s3cr3t");
    expect(verifyOperadorToken(t, "s3cr3t", 2001)).toBeNull();
  });
});
