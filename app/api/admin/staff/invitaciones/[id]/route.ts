import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/admin-api-guard";
import { revocarInvitacion, StaffRepositoryError } from "@/lib/staff/repository";

function repositoryErrorResponse(error: unknown): NextResponse {
  if (error instanceof StaffRepositoryError) {
    const status = error.message.includes("no encontrad") ? 404 : 503;
    return NextResponse.json({ error: error.message }, { status });
  }

  const message = error instanceof Error ? error.message : "Error inesperado.";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireSuperAdminApi(request, "write");

  if (!guard.ok) {
    return guard.response;
  }

  const { id } = await params;

  if (!id?.trim()) {
    return NextResponse.json(
      { error: "ID de invitación requerido." },
      { status: 400 },
    );
  }

  try {
    await revocarInvitacion(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}
