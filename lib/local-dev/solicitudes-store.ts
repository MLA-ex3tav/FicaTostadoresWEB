import { readLocalJson, writeLocalJson } from "@/lib/local-dev/server-data";

export type LocalSolicitudKind = "cotizaciones" | "soporte";

const FILES: Record<LocalSolicitudKind, string> = {
  cotizaciones: "solicitudes-cotizacion.json",
  soporte: "solicitudes-soporte.json",
};

interface LocalFolioState {
  cotizacion: number;
  soporte: number;
}

const FOLIO_FILE = "folio-state.json";

export async function listLocalSolicitudes(
  kind: LocalSolicitudKind,
): Promise<Record<string, unknown>[]> {
  return readLocalJson<Record<string, unknown>[]>(FILES[kind], () => []);
}

export async function appendLocalSolicitud(
  kind: LocalSolicitudKind,
  record: Record<string, unknown>,
): Promise<void> {
  const current = await listLocalSolicitudes(kind);
  await writeLocalJson(FILES[kind], [record, ...current]);
}

export async function nextLocalFolio(
  kind: LocalSolicitudKind,
): Promise<number> {
  const state = await readLocalJson<LocalFolioState>(FOLIO_FILE, () => ({
    cotizacion: 3239,
    soporte: 0,
  }));

  if (kind === "cotizaciones") {
    state.cotizacion += 1;
    await writeLocalJson(FOLIO_FILE, state);
    return state.cotizacion;
  }

  state.soporte += 1;
  await writeLocalJson(FOLIO_FILE, state);
  return state.soporte;
}
