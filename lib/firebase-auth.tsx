"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Auth, User } from "firebase/auth";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { isLocalDevMode } from "@/lib/local-dev/mode";
import {
  getFirebaseAuthErrorMessage,
  isAuthFlowCancelled,
} from "@/lib/firebase-auth-errors";
import type { UserRole } from "@/lib/permissions";

const AUTH_SESSION_SYNC_TIMEOUT_MS = 12_000;

const LOCAL_USER = {
  uid: "localdev0001",
  email: "local@fica.local",
  displayName: "Desarrollo local",
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  providerData: [],
  getIdToken: async () => "local-dev-token",
} as unknown as User;

type FirebaseAuthApi = typeof import("firebase/auth");

interface LoadedAuth {
  api: FirebaseAuthApi;
  auth: Auth;
}

let authLoadPromise: Promise<LoadedAuth | null> | null = null;

/**
 * Carga firebase/auth + el inicializador mínimo (sin Firestore) solo cuando
 * hace falta. Así los visitantes anónimos no descargan el SDK completo.
 */
function loadAuthModule(): Promise<LoadedAuth | null> {
  if (!authLoadPromise) {
    authLoadPromise = (async () => {
      const [api, client] = await Promise.all([
        import("firebase/auth"),
        import("@/lib/firebase/auth-client"),
      ]);
      const auth = client.getFirebaseAuthOnly();
      return auth ? { api, auth } : null;
    })();
  }

  return authLoadPromise;
}

async function syncAuthSessionWithTimeout(user: User) {
  const { syncAuthSession } = await import("@/lib/auth-sync");

  return Promise.race([
    syncAuthSession(user),
    new Promise<never>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error("Tiempo de espera agotado al verificar la sesión."));
      }, AUTH_SESSION_SYNC_TIMEOUT_MS);
    }),
  ]);
}

function isAuthRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/iniciar-sesion") ||
    pathname.startsWith("/registro") ||
    pathname.startsWith("/perfil") ||
    pathname.startsWith("/mis-solicitudes") ||
    pathname.startsWith("/admin")
  );
}

interface FirebaseAuthContextValue {
  configured: boolean;
  user: User | null;
  role: UserRole | null;
  isStaff: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  emailVerified: boolean;
  loading: boolean;
  pendingAuthError: string | null;
  clearPendingAuthError: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleCredential: (idToken: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  signOut: () => Promise<void>;
  adminFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextValue | null>(null);

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const localMode = isLocalDevMode();
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(localMode ? LOCAL_USER : null);
  const [role, setRole] = useState<UserRole | null>(
    localMode ? "admin" : null,
  );
  const [isStaff, setIsStaff] = useState(localMode);
  const [isAdmin, setIsAdmin] = useState(localMode);
  const [loading, setLoading] = useState(localMode ? false : configured);
  const [pendingAuthError, setPendingAuthError] = useState<string | null>(null);

  const loadedRef = useRef<LoadedAuth | null>(null);
  const loadPromiseRef = useRef<Promise<LoadedAuth | null> | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const clearPendingAuthError = useCallback(() => {
    setPendingAuthError(null);
  }, []);

  const handleAuthState = useCallback((nextUser: User | null) => {
    void (async () => {
      setUser(nextUser);

      if (!nextUser) {
        setRole(null);
        setIsStaff(false);
        setIsAdmin(false);
        setPendingAuthError(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const session = await syncAuthSessionWithTimeout(nextUser);
        setRole(session.role);
        setIsStaff(session.isStaff);
        setIsAdmin(session.isAdmin);
        setPendingAuthError(session.verificationError ?? null);
      } catch (error) {
        console.error("[firebase-auth]", getFirebaseAuthErrorMessage(error));
        setRole(null);
        setIsStaff(false);
        setIsAdmin(false);
        setPendingAuthError(
          "No se pudo verificar el acceso de equipo en este momento. Revisa tu conexión e inténtalo nuevamente.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const ensureAuthLoaded = useCallback(() => {
    if (localMode) {
      return Promise.resolve(null);
    }

    if (loadedRef.current) {
      return Promise.resolve(loadedRef.current);
    }

    if (!loadPromiseRef.current) {
      loadPromiseRef.current = (async () => {
        const loaded = await loadAuthModule();

        if (!loaded) {
          setLoading(false);
          return null;
        }

        loadedRef.current = loaded;

        if (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim()) {
          void import("@/lib/firebase/client").then(({ initAppCheck }) => {
            initAppCheck();
          });
        }

        void loaded.api.getRedirectResult(loaded.auth).catch((error) => {
          if (isAuthFlowCancelled(error)) {
            return;
          }

          setPendingAuthError(getFirebaseAuthErrorMessage(error));
        });

        if (!unsubscribeRef.current) {
          unsubscribeRef.current = loaded.api.onAuthStateChanged(
            loaded.auth,
            handleAuthState,
          );
        }

        return loaded;
      })().catch((error) => {
        loadPromiseRef.current = null;
        console.error("[firebase-auth] No se pudo cargar Firebase:", error);
        setLoading(false);
        return null;
      });
    }

    return loadPromiseRef.current;
  }, [handleAuthState, localMode]);

  useEffect(() => {
    if (!configured) {
      return;
    }

    let cancelled = false;

    const start = () => {
      if (!cancelled) {
        void ensureAuthLoaded();
      }
    };

    const isAuthPage = isAuthRoute(pathname);
    const hasIdle = typeof window.requestIdleCallback === "function";
    const idleId = isAuthPage
      ? window.setTimeout(start, 0)
      : hasIdle
        ? window.requestIdleCallback(start, { timeout: 2500 })
        : window.setTimeout(start, 1200);

    return () => {
      cancelled = true;

      if (isAuthPage || !hasIdle) {
        window.clearTimeout(idleId as number);
      } else if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId as number);
      }
    };
  }, [configured, ensureAuthLoaded, pathname]);

  useEffect(() => {
    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, []);

  const requireAuth = useCallback(async () => {
    const loaded = await ensureAuthLoaded();

    if (!loaded) {
      throw new Error(
        "Firebase no está configurado. Agregue las variables NEXT_PUBLIC_FIREBASE_* en .env.local",
      );
    }

    return loaded;
  }, [ensureAuthLoaded]);

  const signInWithGoogleCredential = useCallback(
    async (idToken: string) => {
      const { api, auth } = await requireAuth();
      const credential = api.GoogleAuthProvider.credential(idToken);
      await api.signInWithCredential(auth, credential);
    },
    [requireAuth],
  );

  const signInWithGoogle = useCallback(async () => {
    const { api, auth } = await requireAuth();
    const provider = new api.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      await api.signInWithPopup(auth, provider);
    } catch (error) {
      if (isAuthFlowCancelled(error)) {
        return;
      }

      const code =
        typeof error === "object" && error !== null && "code" in error
          ? (error as { code?: unknown }).code
          : null;

      if (
        code === "auth/popup-blocked" ||
        code === "auth/operation-not-supported-in-this-environment"
      ) {
        await api.signInWithRedirect(auth, provider);
        return;
      }

      throw new Error(getFirebaseAuthErrorMessage(error));
    }
  }, [requireAuth]);

  const signOut = useCallback(async () => {
    if (localMode) {
      setRole(null);
      setIsStaff(false);
      setIsAdmin(false);
      setUser(null);
      return;
    }

    try {
      const { clearAuthSessionCache } = await import("@/lib/auth-sync-client");
      clearAuthSessionCache();
    } catch {
      // La caché es solo una optimización de UI.
    }

    try {
      await fetch("/api/auth/session", {
        method: "DELETE",
        credentials: "same-origin",
        cache: "no-store",
      });
    } catch {
      // La cookie también expira sola; no bloqueamos el cierre de sesión.
    }

    const loaded = loadedRef.current;

    if (loaded) {
      try {
        await loaded.api.signOut(loaded.auth);
      } catch {
        // Ignorar: igual limpiamos el estado local.
      }
    }

    setRole(null);
    setIsStaff(false);
    setIsAdmin(false);
    setUser(null);
  }, [localMode]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const { api, auth } = await requireAuth();
      const normalizedEmail = email.trim().toLowerCase();
      await api.signInWithEmailAndPassword(auth, normalizedEmail, password);
    },
    [requireAuth],
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string) => {
      const { api, auth } = await requireAuth();
      const normalizedEmail = email.trim().toLowerCase();
      const credential = await api.createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        password,
      );

      try {
        await api.sendEmailVerification(credential.user);
      } catch {
        // Ignorar; el usuario puede reenviar desde el panel si es staff.
      }
    },
    [requireAuth],
  );

  const sendPasswordResetEmail = useCallback(
    async (email: string) => {
      const { api, auth } = await requireAuth();
      const normalizedEmail = email.trim().toLowerCase();
      await api.sendPasswordResetEmail(auth, normalizedEmail);
    },
    [requireAuth],
  );

  const sendEmailVerification = useCallback(async () => {
    const { api, auth } = await requireAuth();

    if (!auth.currentUser) {
      throw new Error("Debe iniciar sesión para continuar.");
    }

    await api.sendEmailVerification(auth.currentUser);
  }, [requireAuth]);

  const adminFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      if (localMode) {
        const headers = new Headers(init?.headers);

        if (init?.body && !headers.has("Content-Type")) {
          if (!(init.body instanceof FormData)) {
            headers.set("Content-Type", "application/json");
          }
        }

        return fetch(input, { ...init, headers });
      }

      const loaded = loadedRef.current ?? (await ensureAuthLoaded());
      const currentUser = loaded?.auth.currentUser;

      if (!currentUser) {
        throw new Error("Debe iniciar sesión para continuar.");
      }

      const token = await currentUser.getIdToken();
      const headers = new Headers(init?.headers);
      headers.set("Authorization", `Bearer ${token}`);

      if (init?.body && !headers.has("Content-Type")) {
        if (!(init.body instanceof FormData)) {
          headers.set("Content-Type", "application/json");
        }
      }

      return fetch(input, { ...init, headers });
    },
    [ensureAuthLoaded, localMode],
  );

  const value = useMemo(
    () => ({
      configured: localMode ? true : configured,
      user,
      role,
      isStaff,
      isAdmin,
      isSuperAdmin: isAdmin,
      emailVerified: localMode ? true : (user?.emailVerified ?? false),
      loading,
      pendingAuthError,
      clearPendingAuthError,
      signInWithGoogle,
      signInWithGoogleCredential,
      signInWithEmail,
      signUpWithEmail,
      sendPasswordResetEmail,
      sendEmailVerification,
      signOut,
      adminFetch,
    }),
    [
      configured,
      localMode,
      user,
      role,
      isStaff,
      isAdmin,
      loading,
      pendingAuthError,
      clearPendingAuthError,
      signInWithGoogle,
      signInWithGoogleCredential,
      signInWithEmail,
      signUpWithEmail,
      sendPasswordResetEmail,
      sendEmailVerification,
      signOut,
      adminFetch,
    ],
  );

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  );
}

export function useFirebaseAuth() {
  const context = useContext(FirebaseAuthContext);

  if (!context) {
    throw new Error("useFirebaseAuth debe usarse dentro de FirebaseAuthProvider.");
  }

  return context;
}
