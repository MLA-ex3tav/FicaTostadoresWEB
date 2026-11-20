import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/electron-presence", () => ({
  extractElectronSecretFromRequest: vi.fn(() => "test"),
  verifyElectronAppSecret: vi.fn(() => true),
  isElectronSecretConfigured: vi.fn(() => true),
}));
vi.mock("@/lib/electron-cors", () => ({
  electronJson: (body: unknown, init?: ResponseInit) => Response.json(body, init),
  electronOptionsResponse: () => new Response(null, { status: 204 }),
}));
vi.mock("@/lib/firebase-admin", () => ({ getFirebaseAdminFirestore: vi.fn() }));
vi.mock("@/lib/operadores/session", () => ({ requireOperadorActivo: vi.fn() }));

import { POST } from "@/app/api/electron/solicitudes/[id]/visto/route";
import { getFirebaseAdminFirestore } from "@/lib/firebase-admin";
import { requireOperadorActivo } from "@/lib/operadores/session";
import { verifyElectronAppSecret } from "@/lib/electron-presence";

let document: Record<string, unknown> | null;
let version: number;
let writes: number;
let attempts: number;
const ref = {};
type Transaction = { get: (ref: unknown) => Promise<unknown>; update: (ref: unknown, patch: Record<string, unknown>) => void };
const transaction = vi.fn(async (callback: (tx: Transaction) => Promise<unknown>) => {
  // Simula la detección de conflictos de Firestore y la reejecución del callback.
  for (;;) {
    attempts++;
    const readVersion = version;
    const snapshot = document ? structuredClone(document) : null;
    let update: Record<string, unknown> | undefined;
    const result = await callback({
      get: async () => ({ exists: snapshot !== null, data: () => snapshot }),
      update: (_ref, patch) => { update = patch; },
    });
    if (readVersion !== version) continue;
    if (update) { document = { ...document, ...update }; version++; writes++; }
    return result;
  }
});

beforeEach(() => {
  vi.clearAllMocks();
  document = { estado: "en_revision" };
  version = writes = attempts = 0;
  vi.mocked(verifyElectronAppSecret).mockReturnValue(true);
  vi.mocked(getFirebaseAdminFirestore).mockReturnValue({
    collection: () => ({ doc: () => ref }), runTransaction: transaction,
  } as unknown as NonNullable<ReturnType<typeof getFirebaseAdminFirestore>>);
  vi.mocked(requireOperadorActivo).mockImplementation(async request => ({
    opId: request.headers.get("X-Operador-Token")!,
    nombre: request.headers.get("X-Operador-Token")!,
  }) as Awaited<ReturnType<typeof requireOperadorActivo>>);
});

const open = (profile: string, id = "cot-1") => POST(new Request("https://test.invalid/visto", {
  method: "POST", headers: { "X-Operador-Token": profile },
}), { params: Promise.resolve({ id }) });

describe("primera vista compartida", () => {
  it("dos aperturas concurrentes reciben el mismo visor y solo hay una escritura", async () => {
    const [desktop, mobile] = await Promise.all([open("Ana"), open("Juan")]);
    const first = await desktop.json();
    expect(await mobile.json()).toEqual(first);
    expect(first.primeraVista.nombre).toBe("Ana");
    expect(writes).toBe(1);
    expect(attempts).toBe(3);
    expect(document?.estado).toBe("en_revision");
    expect(Object.keys(document!)).toEqual(["estado", "primeraVista"]);
  });

  it("una apertura con lista desactualizada devuelve la marca sin sobrescribir", async () => {
    const first = await (await open("Ana")).json();
    expect(await (await open("Juan")).json()).toEqual(first);
    expect(writes).toBe(1);
  });

  it("no recrea una cotización eliminada", async () => {
    document = null;
    expect((await open("Ana")).status).toBe(404);
    expect(writes).toBe(0);
  });

  it("rechaza peticiones sin autorización de app", async () => {
    vi.mocked(verifyElectronAppSecret).mockReturnValue(false);
    expect((await open("Ana")).status).toBe(401);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rechaza perfiles no válidos", async () => {
    vi.mocked(requireOperadorActivo).mockResolvedValue(null);
    expect((await open("Ana")).status).toBe(401);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rechaza rutas de documentos no válidas", async () => {
    expect((await open("Ana", "otro/documento")).status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });
});
