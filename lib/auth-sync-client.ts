"use client";

import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { CLIENTES_COLLECTION } from "@/lib/firestore-collections";
import { parseUserRole, type UserRole } from "@/lib/permissions";
import type { ClienteShippingProfile } from "@/lib/shipping-profile";
import { readClienteShippingProfile, sanitizeClienteShippingProfile } from "@/lib/shipping-profile";
import { getFirebaseFirestore } from "@/lib/firebase/client";

export async function getClienteShippingProfile(
  uid: string,
): Promise<ClienteShippingProfile | null> {
  const db = getFirebaseFirestore();

  if (!db) {
    return null;
  }

  const snapshot = await getDoc(doc(db, CLIENTES_COLLECTION, uid));

  if (!snapshot.exists()) {
    return null;
  }

  return readClienteShippingProfile(snapshot.data() as Record<string, unknown>);
}

export async function saveClienteShippingProfile(
  user: User,
  profile: ClienteShippingProfile,
): Promise<void> {
  const db = getFirebaseFirestore();

  if (!db) {
    return;
  }

  const sanitized = sanitizeClienteShippingProfile(profile);

  if (!sanitized) {
    return;
  }

  await setDoc(
    doc(db, CLIENTES_COLLECTION, user.uid),
    {
      shippingProfile: sanitized,
      shippingProfileUpdatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

interface AuthSessionResponse {
  role?: string | null;
  isStaff?: boolean;
  isAdmin?: boolean;
}

interface AuthSession {
  role: UserRole | null;
  isStaff: boolean;
  isAdmin: boolean;
  verificationError?: string;
}

interface CachedAuthSession extends AuthSession {
  uid: string;
  expiresAt: number;
}

const SESSION_CACHE_KEY = "fica-auth-session";
const SESSION_CACHE_TTL_MS = 5 * 60 * 1000;

function readCachedAuthSession(uid: string): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(SESSION_CACHE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<CachedAuthSession> | null;

    if (
      !parsed ||
      parsed.uid !== uid ||
      typeof parsed.expiresAt !== "number" ||
      Date.now() >= parsed.expiresAt
    ) {
      clearAuthSessionCache();
      return null;
    }

    return {
      role: parseUserRole(parsed.role ?? null),
      isStaff: Boolean(parsed.isStaff),
      isAdmin: Boolean(parsed.isAdmin),
    };
  } catch {
    return null;
  }
}

function writeCachedAuthSession(uid: string, session: AuthSession): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const cached: CachedAuthSession = {
      ...session,
      uid,
      expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
    };
    window.sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cached));
  } catch {
    // sessionStorage puede no estar disponible.
  }
}

export function clearAuthSessionCache(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(SESSION_CACHE_KEY);
  } catch {
    // Ignorar.
  }
}

async function fetchAuthSession(
  user: User,
): Promise<AuthSession> {
  const token = await user.getIdToken();
  const response = await fetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as
      | { error?: unknown }
      | null;
    return {
      role: null,
      isStaff: false,
      isAdmin: false,
      verificationError:
        typeof body?.error === "string"
          ? body.error
          : "No se pudo verificar el acceso de equipo en este momento. Inténtalo nuevamente más tarde.",
    };
  }

  const data = (await response.json()) as AuthSessionResponse;
  const role = parseUserRole(data.role ?? null);

  return {
    role,
    isStaff: Boolean(data.isStaff) && user.emailVerified,
    isAdmin: Boolean(data.isAdmin) && user.emailVerified,
  };
}

async function syncStaffSessionCookie(user: User): Promise<void> {
  try {
    const token = await user.getIdToken(true);
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "same-origin",
    });

    if (!response.ok) {
      console.warn(
        "[auth-sync] no se pudo crear la sesión de staff:",
        response.status,
      );
    }
  } catch (error) {
    console.warn("[auth-sync] no se pudo crear la sesión de staff:", error);
  }
}

export async function syncAuthSessionClient(
  user: User,
): Promise<AuthSession> {
  const cached = readCachedAuthSession(user.uid);

  if (cached) {
    return cached;
  }

  try {
    const session = await fetchAuthSession(user);

    if (session.verificationError) {
      return session;
    }

    if (session.isStaff) {
      await syncStaffSessionCookie(user);
    }

    writeCachedAuthSession(user.uid, session);
    return session;
  } catch (error) {
    console.error("[auth-sync] no se pudo consultar la sesión al servidor:", error);
    return {
      role: null,
      isStaff: false,
      isAdmin: false,
      verificationError:
        "No se pudo verificar el acceso de equipo. Revisa tu conexión e inténtalo nuevamente.",
    };
  }
}
