import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/admin-api-guard";
import {
  getSiteMode,
  isSiteMode,
  isSiteModePersistent,
  setSiteMode,
} from "@/lib/site-mode";

/**
 * GET /api/admin/site-mode
 *   Devuelve el modo actual del sitio público (live | construction).
 *
 * PUT /api/admin/site-mode  { "mode": "live" | "construction" }
 *   Activa o desactiva el modo "en construcción" de forma persistente.
 */

const NOT_CONFIGURED_MESSAGE =
  "Upstash Redis no está configurado (UPSTASH_REDIS_REST_URL/TOKEN); no se puede guardar el modo del sitio.";

export async function GET(request: Request) {
  const guard = await requireStaffApi(request, "read");

  if (!guard.ok) {
    return guard.response;
  }

  const mode = await getSiteMode();

  return NextResponse.json({ mode, persistent: isSiteModePersistent() });
}

export async function PUT(request: Request) {
  const guard = await requireStaffApi(request, "write");

  if (!guard.ok) {
    return guard.response;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }

  const mode = (body as Record<string, unknown> | null)?.mode;

  if (!isSiteMode(mode)) {
    return NextResponse.json(
      { error: 'El campo "mode" debe ser "live" o "construction".' },
      { status: 400 },
    );
  }

  if (!isSiteModePersistent()) {
    return NextResponse.json({ error: NOT_CONFIGURED_MESSAGE }, { status: 503 });
  }

  try {
    await setSiteMode(mode);

    return NextResponse.json({ mode, persistent: true });
  } catch (error) {
    console.error("[admin/site-mode PUT]", error);

    return NextResponse.json(
      { error: "No se pudo guardar el modo del sitio." },
      { status: 500 },
    );
  }
}
