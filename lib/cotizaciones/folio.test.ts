import { describe, expect, it } from "vitest";
import type { Firestore } from "firebase-admin/firestore";
import {
  actualizarContadoresFolios,
  formatFolio,
  formatFolioOt,
  parseNumeroFolio,
} from "./folio";

function fakeDb(initial: Record<string, number>) {
  const docs = new Map<string, Record<string, unknown>>(
    Object.entries(initial).map(([path, next]) => [path, { next }]),
  );

  const ref = (path: string) => ({
    path,
    id: path.split("/").at(-1)!,
    get: async () => ({
      exists: docs.has(path),
      data: () => docs.get(path),
    }),
  });

  const db = {
    collection: (name: string) => ({
      doc: (id: string) => ref(`${name}/${id}`),
    }),
    runTransaction: async (callback: (tx: unknown) => Promise<unknown>) => {
      const writes: Array<[string, Record<string, unknown>]> = [];
      const tx = {
        get: async (target: { path: string }) => ({
          exists: docs.has(target.path),
          data: () => docs.get(target.path),
        }),
        set: (
          target: { path: string },
          data: Record<string, unknown>,
        ) => {
          writes.push([target.path, data]);
        },
      };

      const result = await callback(tx);
      for (const [path, data] of writes) {
        docs.set(path, { ...docs.get(path), ...data });
      }
      return result;
    },
  };

  return { db: db as unknown as Firestore, docs };
}

describe("numeración CO / OT", () => {
  it("formatea cotizaciones con 5 dígitos y OT con 4", () => {
    expect(formatFolio(3240)).toBe("CO 03240");
    expect(formatFolio(126)).toBe("CO 00126");
    expect(formatFolioOt(1286)).toBe("OT 1286");
    expect(formatFolioOt(1)).toBe("OT 0001");
  });

  it("parsea los formatos visibles y rechaza prefijos cruzados", () => {
    expect(parseNumeroFolio("CO 03240")).toBe(3240);
    expect(parseNumeroFolio("co-3240")).toBe(3240);
    expect(parseNumeroFolio("CT150")).toBe(150);
    expect(parseNumeroFolio("3240")).toBe(3240);
    expect(parseNumeroFolio("OT 1286")).toBeNull();
    expect(parseNumeroFolio("OT 1286", "ot")).toBe(1286);
    expect(parseNumeroFolio("CO 03240", "ot")).toBeNull();
    expect(parseNumeroFolio("abc")).toBeNull();
    expect(parseNumeroFolio("0")).toBeNull();
  });

  it("guarda los próximos números del contador activo", async () => {
    const { db, docs } = fakeDb({
      "config/folios_cotizaciones": 3240,
      "config/folios_ot": 1286,
    });

    const result = await actualizarContadoresFolios(db, false, {
      cotizacion: 3300,
      ot: 1300,
    });

    expect(result).toEqual({ cotizacion: 3300, ot: 1300 });
    expect(docs.get("config/folios_cotizaciones")?.next).toBe(3300);
    expect(docs.get("config/folios_ot")?.next).toBe(1300);
  });

  it("permite colocar cualquier número, incluso hacia atrás", async () => {
    const { db, docs } = fakeDb({
      "config/folios_cotizaciones": 3240,
      "config/folios_ot": 1286,
    });

    const result = await actualizarContadoresFolios(db, false, {
      cotizacion: 1000,
      ot: 1000,
    });

    expect(result).toEqual({ cotizacion: 1000, ot: 1000 });
    expect(docs.get("config/folios_cotizaciones")?.next).toBe(1000);
    expect(docs.get("config/folios_ot")?.next).toBe(1000);
  });

  it("usa contadores distintos en modo simulación", async () => {
    const { db, docs } = fakeDb({
      "config/folios_cotizaciones": 3240,
      "config/folios_ot": 1286,
      "config/folios_cotizaciones_simulacion": 100,
      "config/folios_ot_simulacion": 50,
    });

    const result = await actualizarContadoresFolios(db, true, {
      cotizacion: 120,
      ot: 60,
    });

    expect(result).toEqual({ cotizacion: 120, ot: 60 });
    expect(docs.get("config/folios_cotizaciones")?.next).toBe(3240);
    expect(docs.get("config/folios_ot")?.next).toBe(1286);
    expect(docs.get("config/folios_cotizaciones_simulacion")?.next).toBe(120);
    expect(docs.get("config/folios_ot_simulacion")?.next).toBe(60);
  });
});
