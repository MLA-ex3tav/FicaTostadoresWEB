import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/admin-api-guard";
import {
  crearInvitacion,
  invitacionPendientePorEmail,
  listInvitacionesPendientes,
  listStaff,
  normalizeEmail,
  StaffRepositoryError,
  staffExistePorEmail,
} from "@/lib/staff/repository";
import { isStaffRoleValue } from "@/lib/staff/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

function repositoryErrorResponse(error: unknown): NextResponse {
  if (error instanceof StaffRepositoryError) {
    const status = error.message.includes("no encontrad") ? 404 : 503;
    return NextResponse.json({ error: error.message }, { status });
  }

  const message = error instanceof Error ? error.message : "Error inesperado.";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET(request: Request) {
  const guard = await requireSuperAdminApi(request, "read");

  if (!guard.ok) {
    return guard.response;
  }

  try {
    const [staff, invitaciones] = await Promise.all([
      listStaff(),
      listInvitacionesPendientes(),
    ]);

    return NextResponse.json({ staff, invitaciones });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const guard = await requireSuperAdminApi(request, "write");

  if (!guard.ok) {
    return guard.response;
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Cuerpo JSON inválido.");
  }

  const tipo = body.tipo === "enlace" || body.tipo === "correo" ? body.tipo : null;
  const rol = body.rol;
  const emailRaw = typeof body.email === "string" ? body.email.trim() : "";

  if (!tipo) {
    return badRequest("Tipo de invitación inválido.");
  }

  if (!isStaffRoleValue(rol)) {
    return badRequest("El rol debe ser Editor o Administrador.");
  }

  if (tipo === "correo" && !emailRaw) {
    return badRequest("El correo es obligatorio para autorizar por correo.");
  }

  if (emailRaw && !EMAIL_PATTERN.test(emailRaw)) {
    return badRequest("El correo no es válido.");
  }

  const email = emailRaw ? normalizeEmail(emailRaw) : null;
  const expiraHoras =
    typeof body.expiraHoras === "number" && Number.isFinite(body.expiraHoras)
      ? body.expiraHoras
      : undefined;

  try {
    if (email && tipo === "correo") {
      if (await staffExistePorEmail(email)) {
        return badRequest("Ese correo ya tiene acceso al panel.");
      }

      if (await invitacionPendientePorEmail(email)) {
        return NextResponse.json(
          { error: "Ya existe una autorización pendiente para ese correo." },
          { status: 409 },
        );
      }
    }

    const result = await crearInvitacion({
      tipo,
      rol,
      email,
      expiraHoras,
      creadoPor: guard.session.email,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}
