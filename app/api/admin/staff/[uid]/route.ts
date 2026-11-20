import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/admin-api-guard";
import {
  actualizarRolStaff,
  contarAdmins,
  eliminarStaff,
  listStaff,
  StaffRepositoryError,
} from "@/lib/staff/repository";
import { isStaffRoleValue } from "@/lib/staff/types";

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ uid: string }> },
) {
  const guard = await requireSuperAdminApi(request, "write");

  if (!guard.ok) {
    return guard.response;
  }

  const { uid } = await params;

  if (!uid?.trim()) {
    return badRequest("UID requerido.");
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Cuerpo JSON inválido.");
  }

  if (!isStaffRoleValue(body.role)) {
    return badRequest("El rol debe ser Editor o Administrador.");
  }

  if (uid === guard.session.uid) {
    return badRequest("No puede cambiar su propio rol.");
  }

  try {
    const staff = await listStaff();
    const target = staff.find((entry) => entry.uid === uid);

    if (!target) {
      return NextResponse.json(
        { error: "Miembro del equipo no encontrado." },
        { status: 404 },
      );
    }

    if (target.role === "admin" && body.role !== "admin") {
      const admins = await contarAdmins();

      if (admins <= 1) {
        return badRequest("Debe existir al menos un administrador.");
      }
    }

    await actualizarRolStaff(uid, body.role);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ uid: string }> },
) {
  const guard = await requireSuperAdminApi(request, "write");

  if (!guard.ok) {
    return guard.response;
  }

  const { uid } = await params;

  if (!uid?.trim()) {
    return badRequest("UID requerido.");
  }

  if (uid === guard.session.uid) {
    return badRequest("No puede quitarse su propio acceso.");
  }

  try {
    const staff = await listStaff();
    const target = staff.find((entry) => entry.uid === uid);

    if (!target) {
      return NextResponse.json(
        { error: "Miembro del equipo no encontrado." },
        { status: 404 },
      );
    }

    if (target.role === "admin") {
      const admins = await contarAdmins();

      if (admins <= 1) {
        return badRequest("Debe existir al menos un administrador.");
      }
    }

    await eliminarStaff(uid);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}
