"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  LogOut,
  User,
} from "lucide-react";
import { Blobatar } from "@/components/ui/blobatar";
import GuestContinueButton from "@/components/GuestContinueButton";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { getFirebaseAuthErrorMessage } from "@/lib/firebase-auth-errors";
import { resolveGuestReturnTo, sanitizeReturnTo } from "@/lib/login-return-to";
import { motionDuration, motionEase } from "@/lib/motion";
import { cn } from "@/lib/utils";

const POST_LOGIN_RETURN_KEY = "fica-post-login-return";

function readPostLoginReturn(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return sessionStorage.getItem(POST_LOGIN_RETURN_KEY);
}

function clearPostLoginReturn(): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(POST_LOGIN_RETURN_KEY);
}

function savePostLoginReturn(path: string): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(POST_LOGIN_RETURN_KEY, path);
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

interface GoogleLoginCardProps {
  title?: string;
  subtitle?: string;
  badge?: string;
  adminRedirect?: boolean;
  /** True cuando la tarjeta vive dentro de un AuthShell (sin borde/card propio). */
  embedded?: boolean;
  /** Muestra la opción de continuar como invitado (solo en el login público). */
  allowGuest?: boolean;
}

export default function GoogleLoginCard({
  title = "Iniciar sesión",
  subtitle = "Ingrese con su cuenta de Google para continuar.",
  badge = "Acceso",
  adminRedirect = false,
  embedded = false,
  allowGuest = false,
}: GoogleLoginCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));
  const {
    user,
    role,
    isStaff,
    emailVerified,
    loading,
    configured,
    pendingAuthError,
    clearPendingAuthError,
    signInWithGoogle,
    signOut,
    sendEmailVerification,
  } = useFirebaseAuth();
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const pendingPostLoginRedirectRef = useRef(false);

  useEffect(() => {
    if (pendingAuthError) {
      const raf = requestAnimationFrame(() => {
        setError(pendingAuthError);
        clearPendingAuthError();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [pendingAuthError, clearPendingAuthError]);

  useEffect(() => {
    if (adminRedirect || loading || !user) {
      return;
    }

    if (!pendingPostLoginRedirectRef.current && !readPostLoginReturn()) {
      return;
    }

    // Login exitoso: muestra la animación de tick y redirige a la cuenta.
    pendingPostLoginRedirectRef.current = false;
    setSuccess(true);

    const timer = window.setTimeout(() => {
      clearPostLoginReturn();
      router.replace("/perfil");
    }, 1700);

    return () => window.clearTimeout(timer);
  }, [adminRedirect, loading, router, user]);

  useEffect(() => {
    if (!adminRedirect || loading || !user || !isStaff) {
      return;
    }

    window.location.assign("/admin/productos");
  }, [adminRedirect, isStaff, loading, router, user]);

  function handleSignInStart() {
    setError("");
    savePostLoginReturn(returnTo);
    pendingPostLoginRedirectRef.current = true;
  }

  function handleSignInError(message: string) {
    pendingPostLoginRedirectRef.current = false;
    clearPostLoginReturn();
    setGoogleLoading(false);
    setError(message);
  }

  async function handleGoogleSignIn() {
    if (googleLoading) {
      return;
    }

    setError("");
    setGoogleLoading(true);
    handleSignInStart();

    try {
      await signInWithGoogle();
      // Si el login no completó (popup cancelado), restaurar el botón.
      setGoogleLoading(false);
    } catch (signInError) {
      handleSignInError(
        getFirebaseAuthErrorMessage(signInError) ??
          "No se pudo iniciar sesión con Google.",
      );
    }
  }

  async function handleSignOut() {
    setError("");
    setSigningOut(true);
    pendingPostLoginRedirectRef.current = false;
    clearPostLoginReturn();

    try {
      await signOut();
    } catch (signOutError) {
      const message = getFirebaseAuthErrorMessage(signOutError);
      if (message) {
        setError(message);
      }
    } finally {
      setSigningOut(false);
    }
  }

  async function handleResendVerification() {
    setError("");
    setResendingVerification(true);

    try {
      await sendEmailVerification();
      setError("Correo de verificación enviado. Revise su bandeja de entrada.");
    } catch (verificationError) {
      const message = getFirebaseAuthErrorMessage(verificationError);
      if (message) {
        setError(message);
      }
    } finally {
      setResendingVerification(false);
    }
  }

  function handleContinue() {
    if (adminRedirect) {
      if (isStaff) {
        window.location.assign("/admin/productos");
      }
      return;
    }

    router.replace(returnTo);
  }

  const showLoginOptions = !user;
  const showLoggedInActions = Boolean(user) && !loading;
  const displayName = user?.displayName ?? "Cuenta conectada";
  const avatarName = user?.displayName?.trim() || user?.email || user?.uid || "Cuenta";

  const heading = user ? "Sesión iniciada" : title;
  const subheading = user
    ? "Su cuenta se encuentra conectada correctamente. Presione continuar para seguir navegando."
    : subtitle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionDuration.base, ease: motionEase }}
      className="mx-auto w-full max-w-md"
    >
      <div
        className={cn(
          "relative",
          embedded
            ? ""
            : "overflow-hidden rounded-2xl border border-white/[0.08] bg-panel p-6 md:p-8",
        )}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-steel-dark">{badge}</p>
        </div>

        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {heading}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-steel-mid">
          {subheading}
        </p>

        <AnimatePresence mode="wait">
          {user && !loading && (
            <motion.div
              key="user-badge"
              initial={{ opacity: 0, height: 0, y: 10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: motionDuration.fast, ease: motionEase }}
              className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
            >
              <div className="flex items-center gap-3.5">
                <Blobatar
                  name={avatarName}
                  src={user.photoURL ?? undefined}
                  alt={displayName}
                  className="size-11 shrink-0 shadow-md ring-2 ring-orange/50"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">
                    {displayName}
                  </p>
                  <p className="truncate text-xs font-medium text-steel-mid">
                    {user.email}
                  </p>
                  {isStaff ? (
                    emailVerified ? (
                      <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Email verificado
                      </span>
                    ) : (
                      <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-steel-mid">
                        <User className="h-3 w-3" /> Verificación de correo
                        pendiente
                      </span>
                    )
                  ) : null}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-300"
            role="alert"
          >
            {error}
          </motion.p>
        )}

        {adminRedirect && user && !loading && !isStaff && !pendingAuthError && !error && (
          <p
            className="mt-4 rounded-xl border border-orange/20 bg-orange/10 px-4 py-3 text-xs font-medium text-orange"
            role="alert"
          >
            Esta cuenta no tiene habilitado el acceso de equipo. Solicite que la agreguen al personal autorizado.
          </p>
        )}

        {!configured && (
          <p className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-steel-mid">
            Firebase no está configurado. Copie <code>.env.example</code> a{" "}
            <code>.env.local</code> y complete las variables{" "}
            <code>NEXT_PUBLIC_FIREBASE_*</code> y{" "}
            <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>.
          </p>
        )}

        {loading && (
          <div className="mt-6 flex items-center justify-center gap-3 py-4 text-xs font-medium text-steel-mid">
            <Loader2 className="h-4 w-4 animate-spin text-orange" />
            Verificando credenciales…
          </div>
        )}

        <AnimatePresence mode="wait">
          {showLoginOptions && !loading && (
            <motion.div
              key="login-methods"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <button
                type="button"
                disabled={!configured || googleLoading}
                onClick={() => void handleGoogleSignIn()}
                className="group mt-6 inline-flex h-12 w-full items-center justify-center gap-3 rounded-md border border-white/[0.08] px-5 text-sm font-medium text-steel-light transition-colors hover:border-orange hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-orange" />
                ) : (
                  <GoogleIcon />
                )}
                <span>
                  {googleLoading ? "Conectando…" : "Continuar con Google"}
                </span>
              </button>

              {allowGuest ? (
                <GuestContinueButton
                  redirectTo={resolveGuestReturnTo(returnTo)}
                  className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-white/[0.08] px-5 text-sm font-medium text-steel-light transition-colors hover:border-orange hover:bg-white/[0.04] hover:text-white"
                />
              ) : null}

              <p className="mx-auto mt-5 max-w-[19rem] text-center text-xs leading-relaxed text-steel-dark">
                Al continuar, acepta nuestros{" "}
                <Link
                  href="/terminos"
                  className="font-medium text-orange underline underline-offset-4 transition-colors hover:text-orange-hover"
                >
                  Términos y condiciones
                </Link>{" "}
                y la{" "}
                <Link
                  href="/privacidad"
                  className="font-medium text-orange underline underline-offset-4 transition-colors hover:text-orange-hover"
                >
                  Política de privacidad
                </Link>
                .
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {showLoggedInActions && (
            <motion.div
              key="logged-in-actions"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mt-6 flex flex-wrap items-center justify-between gap-3"
            >
              {(role === "editor" || role === "admin") && !emailVerified ? (
                <div className="flex w-full flex-col gap-3 rounded-xl border border-orange/20 bg-orange/10 p-4">
                  <p className="text-xs font-medium text-orange">
                    Verifique su correo para habilitar el acceso al panel.
                    Revise su bandeja de entrada o reenvíe el enlace.
                  </p>
                  <button
                    type="button"
                    disabled={resendingVerification}
                    onClick={() => void handleResendVerification()}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-white/[0.12] px-4 text-sm font-medium text-steel-light transition-colors hover:bg-white/[0.04] disabled:opacity-60"
                  >
                    {resendingVerification ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Reenviar correo de verificación"
                    )}
                  </button>
                </div>
              ) : (adminRedirect ? isStaff : true) ? (
                <button
                  type="button"
                  onClick={handleContinue}
                  className="group order-2 inline-flex h-11 w-auto items-center justify-center gap-2 rounded-md bg-orange px-5 text-sm font-medium text-white transition-colors hover:bg-orange-hover"
                >
                  <span>Continuar</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              ) : null}
              <button
                type="button"
                disabled={signingOut}
                onClick={() => void handleSignOut()}
                className="inline-flex order-1 h-11 w-auto items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium text-steel-dark transition-colors hover:text-red-300 disabled:opacity-50"
              >
                {signingOut ? (
                  <Loader2 className="block h-3.5 w-3.5 shrink-0 animate-spin text-red-400" />
                ) : (
                  <LogOut className="block h-3.5 w-3.5 shrink-0 text-red-400" />
                )}
                <span className="leading-none">
                  {signingOut ? "Cerrando…" : "Cerrar sesión"}
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {success && (
          <div className="success-overlay" role="status" aria-live="polite">
            <div className="success-box">
              <svg className="h-20 w-20" viewBox="0 0 52 52">
                <circle className="success-circle" cx="26" cy="26" r="24" />
                <path className="success-check" d="M14 27l8 8 16-16" />
              </svg>
              <p className="success-box__title">Sesión iniciada</p>
              <p className="success-box__subtitle">
                Redirigiendo a tu cuenta…
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
