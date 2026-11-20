import { NextResponse } from "next/server";
import {
  getRequestIdToken,
  getUserRoleFromStaff,
  verifyFirebaseUser,
} from "@/lib/firebase-user-session";
import { isStaffRole, isSuperAdminRole } from "@/lib/permissions";
import { assertRateLimits, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/sanitize";
import { hashForRateLimit } from "@/lib/security/token-hash";
import { aplicarInvitacionPorCorreo } from "@/lib/staff/repository";

function isFirestoreUsageLimitError(error: unknown): boolean {
  const value = error && typeof error === "object"
    ? error as { code?: unknown; message?: unknown }
    : null;
  const code = String(value?.code ?? "").toLowerCase();
  const message = String(value?.message ?? error ?? "").toLowerCase();

  return code === "8" ||
    code.includes("resource-exhausted") ||
    code.includes("quota-exceeded") ||
    message.includes("resource_exhausted") ||
    message.includes("resource exhausted") ||
    message.includes("quota exceeded");
}

export async function GET(request: Request) {
  const token = getRequestIdToken(request);
  const user = await verifyFirebaseUser(request);

  if (!user || !token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const tokenHash = await hashForRateLimit(token);
  const rateLimit = await assertRateLimits(
    [`auth-ip:${ip}`, `auth-user:${user.uid}`, `auth-token:${tokenHash}`],
    RATE_LIMITS.auth,
  );

  if (!rateLimit.ok) {
    return rateLimitResponse(rateLimit.retryAfterSeconds);
  }

  let role;
  try {
    role = await getUserRoleFromStaff(user.uid);

    // Autorización por correo: solo se consulta si el usuario aún no es staff.
    if (!role && user.emailVerified) {
      const rolInvitado = await aplicarInvitacionPorCorreo({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      });

      if (rolInvitado) {
        role = rolInvitado;
      }
    }
  } catch (error) {
    const quotaExceeded = isFirestoreUsageLimitError(error);
    console.error("[auth/me] no se pudo comprobar el acceso de equipo:", error);
    return NextResponse.json(
      {
        code: quotaExceeded ? "FIRESTORE_QUOTA_EXCEEDED" : "STAFF_LOOKUP_UNAVAILABLE",
        error: quotaExceeded
          ? "Firebase alcanzó el límite de uso de Firestore. No se pudo verificar el acceso de equipo; inténtalo nuevamente cuando la cuota se restablezca."
          : "No se pudo verificar el acceso de equipo en este momento. Inténtalo nuevamente más tarde.",
      },
      { status: 503 },
    );
  }

  const isStaff = isStaffRole(role) && user.emailVerified;
  const isAdmin = isSuperAdminRole(role) && user.emailVerified;

  return NextResponse.json({
    user: {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
    },
    role,
    isStaff,
    isAdmin,
    isSuperAdmin: isAdmin,
  });
}
