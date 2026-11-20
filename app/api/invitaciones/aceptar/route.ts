import { NextResponse } from "next/server";
import {
  getRequestIdToken,
  verifyFirebaseUser,
} from "@/lib/firebase-user-session";
import { assertRateLimits, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/sanitize";
import {
  aceptarInvitacionEnlace,
  StaffRepositoryError,
} from "@/lib/staff/repository";
import type { AceptarInvitacionFailureReason } from "@/lib/staff/types";

const FAILURE_STATUS: Record<AceptarInvitacionFailureReason, number> = {
  no_valida: 404,
  usada: 409,
  expirada: 410,
  correo_no_coincide: 403,
};

const FAILURE_MESSAGE: Record<AceptarInvitacionFailureReason, string> = {
  no_valida: "Invitación no válida.",
  usada: "Esta invitación ya fue utilizada.",
  expirada: "Esta invitación expiró.",
  correo_no_coincide: "Esta invitación fue emitida para otro correo.",
};

export async function POST(request: Request) {
  const user = await verifyFirebaseUser(request);
  const token = getRequestIdToken(request);

  if (!user || !token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = await assertRateLimits(
    [`invite-ip:${ip}`, `invite-user:${user.uid}`],
    RATE_LIMITS.staffInviteRedeem,
  );

  if (!rateLimit.ok) {
    return rateLimitResponse(rateLimit.retryAfterSeconds);
  }

  if (!user.emailVerified) {
    return NextResponse.json(
      { error: "Debe verificar su correo antes de aceptar la invitación." },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Cuerpo JSON inválido." },
      { status: 400 },
    );
  }

  const invitacionToken =
    typeof body.token === "string" ? body.token.trim() : "";

  if (!invitacionToken) {
    return NextResponse.json(
      { error: "Token de invitación requerido." },
      { status: 400 },
    );
  }

  try {
    const result = await aceptarInvitacionEnlace({
      token: invitacionToken,
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: FAILURE_MESSAGE[result.reason] },
        { status: FAILURE_STATUS[result.reason] },
      );
    }

    return NextResponse.json({ ok: true, role: result.role });
  } catch (error) {
    if (error instanceof StaffRepositoryError) {
      const status = error.message.includes("utilizada")
        ? 409
        : error.message.includes("expiró")
          ? 410
          : error.message.includes("no existe") ||
              error.message.includes("revocada")
            ? 404
            : 503;
      return NextResponse.json({ error: error.message }, { status });
    }

    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
