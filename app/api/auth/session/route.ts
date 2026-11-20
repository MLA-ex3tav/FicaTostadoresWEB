import { NextResponse } from "next/server";
import {
  getRequestIdToken,
  getUserRoleFromStaff,
  verifyFirebaseUser,
} from "@/lib/firebase-user-session";
import { assertRateLimits, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/sanitize";
import { hashForRateLimit } from "@/lib/security/token-hash";
import {
  createStaffGateToken,
  STAFF_GATE_COOKIE,
  STAFF_GATE_MAX_AGE_SECONDS,
} from "@/lib/staff/gate-token";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/**
 * Emite la cookie firmada que permite ver el sitio público durante la etapa
 * de construcción. Solo se entrega a usuarios con rol editor/admin.
 */
export async function POST(request: Request) {
  const idToken = getRequestIdToken(request);
  const user = await verifyFirebaseUser(request);

  if (!idToken || !user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const tokenHash = await hashForRateLimit(idToken);
  const rateLimit = await assertRateLimits(
    [`staff-gate-ip:${ip}`, `staff-gate-token:${tokenHash}`],
    RATE_LIMITS.auth,
  );

  if (!rateLimit.ok) {
    return rateLimitResponse(rateLimit.retryAfterSeconds);
  }

  if (!user.emailVerified) {
    return NextResponse.json(
      { error: "Debe verificar su correo." },
      { status: 403 },
    );
  }

  const role = await getUserRoleFromStaff(user.uid);

  if (role !== "editor" && role !== "admin") {
    return NextResponse.json(
      { error: "No tiene acceso al panel." },
      { status: 403 },
    );
  }

  const token = await createStaffGateToken({ uid: user.uid, role });

  if (!token) {
    return NextResponse.json(
      { error: "Falta configurar STAFF_GATE_SECRET u OPERADOR_SESSION_SECRET." },
      { status: 503 },
    );
  }

  const response = NextResponse.json({ ok: true, role });
  response.cookies.set({
    ...COOKIE_OPTIONS,
    name: STAFF_GATE_COOKIE,
    value: token,
    maxAge: STAFF_GATE_MAX_AGE_SECONDS,
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    ...COOKIE_OPTIONS,
    name: STAFF_GATE_COOKIE,
    value: "",
    maxAge: 0,
  });

  return response;
}
