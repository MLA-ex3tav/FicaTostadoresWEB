import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/electron-presence", () => ({
  extractElectronSecretFromRequest: () => "test",
  verifyElectronAppSecret: () => true,
  isElectronSecretConfigured: () => true,
}));
vi.mock("@/lib/electron-cors", () => ({
  electronJson: (body: unknown, init?: ResponseInit) => Response.json(body, init),
  electronOptionsResponse: () => new Response(null, { status: 204 }),
}));
vi.mock("@/lib/firebase-admin", () => ({ getFirebaseAdminFirestore: vi.fn() }));
import { getFirebaseAdminFirestore } from "@/lib/firebase-admin";
import { POST } from "@/app/api/electron/solicitudes/route";

type Data = Record<string, unknown>;
let docs: Map<string, Data>;
const counter = "config/folios_cotizaciones";
const otCounter = "config/folios_ot";
function ref(path: string) {
  return { path, id: path.split("/").at(-1)!, get: async () => snapshot(path) };
}
function snapshot(path: string) {
  return { exists: docs.has(path), data: () => docs.get(path), ref: ref(path), id: ref(path).id };
}
function query(collection: string, field: string, value: unknown) {
  return { collection, field, value, limit() { return this; } };
}
beforeEach(() => {
  docs = new Map([[counter, { next: 150 }], [otCounter, { next: 1286 }]]);
  const db = {
    collection: (name: string) => ({
      doc: (id = "random") => ref(`${name}/${id}`),
      where: (field: string, _op: string, value: unknown) => query(name, field, value),
    }),
    runTransaction: async (callback: (tx: unknown) => Promise<unknown>) => {
      const writes: Array<[string, Data]> = [];
      const result = await callback({
        get: async (target: ReturnType<typeof ref> | ReturnType<typeof query>) => {
          if ("path" in target) return snapshot(target.path);
          const found = [...docs].filter(([path, data]) => path.startsWith(target.collection + "/") && data[target.field] === target.value);
          return { empty: found.length === 0, docs: found.map(([path]) => snapshot(path)) };
        },
        set: (target: ReturnType<typeof ref>, data: Data) => writes.push([target.path, data]),
      });
      for (const [path, data] of writes) docs.set(path, { ...docs.get(path), ...data });
      return result;
    },
  };
  vi.mocked(getFirebaseAdminFirestore).mockReturnValue(db as unknown as NonNullable<ReturnType<typeof getFirebaseAdminFirestore>>);
});
function create(
  numeroCotizacion?: string,
  id = "COT-test",
  extra: Data = {},
) {
  return POST(new Request("http://localhost/api/electron/solicitudes", {
    method: "POST", body: JSON.stringify({ id, numeroCotizacion, clientName: "Cliente", products: [{ name: "Equipo", quantity: 1, unitPrice: 100 }], ...extra }),
  }));
}
it("uses the Firebase sequence when blank", async () => {
  const response = await create("");
  expect(response.status).toBe(201);
  expect((await response.json()).id).toBe("CO 00150");
  expect(docs.get(counter)?.next).toBe(151);
});
it("accepts a manual folio and continues after it", async () => {
  expect((await (await create("ct200")).json()).id).toBe("CO 00200");
  expect((await (await create(undefined, "COT-second")).json()).id).toBe("CO 00201");
});
it("does not move the counter backwards", async () => {
  expect((await (await create("140")).json()).id).toBe("CO 00140");
  expect(docs.get(counter)?.next).toBe(150);
});
it("rejects occupied numbers without overwriting or advancing", async () => {
  docs.set("solicitudes_cotizacion/CT160", { id: "CT160", clientName: "Original" });
  expect((await create("160")).status).toBe(409);
  expect(docs.get("solicitudes_cotizacion/CT160")?.clientName).toBe("Original");
  expect(docs.get(counter)?.next).toBe(150);
});
it("detects legacy documents whose folio differs from their document id", async () => {
  docs.set("solicitudes_cotizacion/legacy", { folio: "CT160" });
  expect((await create("160")).status).toBe(409);
});
it("retries preserve the assigned number without consuming another", async () => {
  await create("200");
  expect((await (await create("200")).json()).id).toBe("CO 00200");
  expect(docs.get(counter)?.next).toBe(201);
});
it("assigns an independent OT number when created directly as OT", async () => {
  const response = await create(undefined, "COT-ot", { estado: "aprobada_ot", enOT: true });
  const body = await response.json();
  expect(response.status).toBe(201);
  expect(body.folio).toBe("CO 00150");
  expect(body.folioOt).toBe("OT 1286");
  expect(docs.get(counter)?.next).toBe(151);
  expect(docs.get(otCounter)?.next).toBe(1287);
});
it.each(["0", "-1", "1.5", "abc", "1000000000"])("rejects invalid number %s", async value => {
  expect((await create(value)).status).toBe(400);
  expect(docs.get(counter)?.next).toBe(150);
});
