import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/admin-api-guard";
import { setElectronDeviceAlias } from "@/lib/electron-presence";

function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const guard = await requireStaffApi(request, "write");

  if (!guard.ok) {
    return guard.response;
  }

  const { key } = await params;
  const deviceKey = (key ?? "").trim();

  if (!deviceKey) {
    return badRequest("Dispositivo requerido.");
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Cuerpo JSON inválido.");
  }

  if (!("alias" in body)) {
    return badRequest("Falta el alias.");
  }

  const alias = body.alias;

  if (alias !== null && typeof alias !== "string") {
    return badRequest("El alias debe ser texto o null.");
  }

  if (typeof alias === "string" && alias.trim().length > 40) {
    return badRequest("El alias supera los 40 caracteres.");
  }

  try {
    const device = await setElectronDeviceAlias(deviceKey, alias);

    if (!device) {
      return NextResponse.json(
        { error: "Dispositivo no encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, device });
  } catch (error) {
    console.error("[admin/dispositivos/alias PATCH]", error);
    return NextResponse.json(
      { error: "No se pudo guardar el alias." },
      { status: 500 },
    );
  }
}
