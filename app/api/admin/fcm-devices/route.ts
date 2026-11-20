import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/admin-api-guard";
import {
  deleteAllFCMDevices,
  deleteStaleFCMDevices,
  listFCMDevices,
} from "@/lib/fcm";

function errorResponse(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : "Error inesperado.";

  return NextResponse.json({ error: message }, { status: 503 });
}

export async function GET(request: Request) {
  const guard = await requireStaffApi(request, "read");

  if (!guard.ok) {
    return guard.response;
  }

  try {
    const devices = await listFCMDevices();
    return NextResponse.json({ devices });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const guard = await requireStaffApi(request, "write");

  if (!guard.ok) {
    return guard.response;
  }

  const url = new URL(request.url);
  const all = url.searchParams.get("all") === "true";
  const staleDaysRaw = url.searchParams.get("staleDays");
  const staleDays = staleDaysRaw === null ? null : Number(staleDaysRaw);

  try {
    if (all) {
      const deleted = await deleteAllFCMDevices();
      return NextResponse.json({ ok: true, deleted });
    }

    if (staleDays !== null && Number.isFinite(staleDays) && staleDays > 0) {
      const deleted = await deleteStaleFCMDevices(staleDays);
      return NextResponse.json({ ok: true, deleted });
    }

    return NextResponse.json(
      { error: "Indique all=true o staleDays." },
      { status: 400 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
