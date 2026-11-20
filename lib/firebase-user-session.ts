import type { UserRole } from "@/lib/permissions";
import { getFirebaseAdminAuth } from "@/lib/firebase-admin";
import { isLocalDevMode } from "@/lib/local-dev/mode";
import { getStaffRole } from "@/lib/staff/repository";

export interface FirebaseUserSession {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization");

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7).trim();
}

/**
 * Verifica el ID token localmente con Firebase Admin (firma y claims), sin
 * llamar a Identity Toolkit en cada request.
 */
export async function verifyFirebaseUser(
  request: Request,
): Promise<FirebaseUserSession | null> {
  if (isLocalDevMode()) {
    return {
      uid: "localdev0001",
      email: "local@fica.local",
      displayName: "Desarrollo local",
      photoURL: null,
      emailVerified: true,
    };
  }

  const token = getBearerToken(request);
  const auth = await getFirebaseAdminAuth();

  if (!token || !auth) {
    return null;
  }

  try {
    const decoded = await auth.verifyIdToken(token);

    if (!decoded.uid) {
      return null;
    }

    return {
      uid: decoded.uid,
      email: decoded.email ?? "",
      displayName: decoded.name ?? null,
      photoURL: decoded.picture ?? null,
      emailVerified: Boolean(decoded.email_verified),
    };
  } catch {
    return null;
  }
}

/** Rol efectivo del usuario: `staff` es la única fuente de verdad. */
export async function getUserRoleFromStaff(
  uid: string,
): Promise<UserRole | null> {
  return getStaffRole(uid);
}

export function getRequestIdToken(request: Request): string | null {
  return getBearerToken(request);
}
