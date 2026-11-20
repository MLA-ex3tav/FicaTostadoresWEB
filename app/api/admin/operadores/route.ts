import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/admin-api-guard";
import {
  crearOperador,
  listOperadores,
  OperadoresRepositoryError,
} from "@/lib/operadores/repository";

function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

function repositoryErrorResponse(error: unknown): NextResponse {
  if (error instanceof OperadoresRepositoryError) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }

  const message = error instanceof Error ? error.message : "Error inesperado.";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET(request: Request) {
  const guard = await requireStaffApi(request, "read");

  if (!guard.ok) {
    return guard.response;
  }

  try {
    const operadores = await listOperadores();
    return NextResponse.json({ operadores });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const guard = await requireStaffApi(request, "write");

  if (!guard.ok) {
    return guard.response;
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Cuerpo JSON inválido.");
  }

  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
  const color = typeof body.color === "string" ? body.color.trim() : undefined;

  if (!nombre || nombre.length > 80) {
    return badRequest("El nombre es requerido (máx. 80 caracteres).");
  }

  try {
    const operador = await crearOperador({ nombre, color });
    return NextResponse.json({ operador }, { status: 201 });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}
