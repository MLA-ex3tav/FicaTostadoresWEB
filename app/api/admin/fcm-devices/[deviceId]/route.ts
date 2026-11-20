import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/admin-api-guard";
import { deleteFCMDevice } from "@/lib/fcm";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ deviceId: string }> },
) {
  const guard = await requireStaffApi(request, "write");

  if (!guard.ok) {
    return guard.response;
  }

  const { deviceId } = await params;

  if (!deviceId?.trim() || deviceId.length > 128) {
    return NextResponse.json(
      { error: "deviceId inválido." },
      { status: 400 },
    );
  }

  try {
    await deleteFCMDevice(deviceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
