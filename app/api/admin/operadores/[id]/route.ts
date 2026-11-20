import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/admin-api-guard";
import {
  actualizarOperador,
  desactivarOperador,
  OperadoresRepositoryError,
} from "@/lib/operadores/repository";

function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

function repositoryErrorResponse(error: unknown): NextResponse {
  if (error instanceof OperadoresRepositoryError) {
    const status = error.message.includes("no encontrado") ? 404 : 503;
    return NextResponse.json({ error: error.message }, { status });
  }

  const message = error instanceof Error ? error.message : "Error inesperado.";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi(request, "write");

  if (!guard.ok) {
    return guard.response;
  }

  const { id } = await params;

  if (!id?.trim()) {
    return badRequest("ID de operador requerido.");
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Cuerpo JSON inválido.");
  }

  const input: { nombre?: string; color?: string; activo?: boolean } = {};

  if (typeof body.nombre === "string") {
    const nombre = body.nombre.trim();
    if (!nombre || nombre.length > 80) {
      return badRequest("El nombre es inválido (máx. 80 caracteres).");
    }
    input.nombre = nombre;
  }

  if (typeof body.color === "string") {
    input.color = body.color.trim();
  }

  if (typeof body.activo === "boolean") {
    input.activo = body.activo;
  }

  try {
    const operador = await actualizarOperador(id, input);
    return NextResponse.json({ operador });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi(request, "write");

  if (!guard.ok) {
    return guard.response;
  }

  const { id } = await params;

  if (!id?.trim()) {
    return badRequest("ID de operador requerido.");
  }

  try {
    await desactivarOperador(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}
