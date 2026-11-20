import { describe, it, expect } from "vitest";
import { resolverRevision } from "./revision";

describe("resolverRevision", () => {
  it("libre sin dueño", () => {
    expect(resolverRevision({}, "ana", 1000).kind).toBe("libre");
  });

  it("mio si el dueño soy yo y no ha expirado", () => {
    const r = resolverRevision(
      { revisionOperadorId: "ana", revisionExpiraAt: 2000 },
      "ana",
      1000,
    );
    expect(r.kind).toBe("mio");
  });

  it("otro si es de alguien más y está vigente", () => {
    expect(
      resolverRevision(
        { revisionOperadorId: "juan", revisionExpiraAt: 2000 },
        "ana",
        1000,
      ).kind,
    ).toBe("otro");
  });

  it("expirado si venció (aunque sea de otro)", () => {
    expect(
      resolverRevision(
        { revisionOperadorId: "juan", revisionExpiraAt: 500 },
        "ana",
        1000,
      ).kind,
    ).toBe("expirado");
  });
});
