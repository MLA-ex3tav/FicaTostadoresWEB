"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  LogIn,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { getFirebaseAuthErrorMessage } from "@/lib/firebase-auth-errors";

type Estado = "idle" | "aceptando" | "ok" | "error";

interface AceptarInvitacionPanelProps {
  token: string;
}

export default function AceptarInvitacionPanel({
  token,
}: AceptarInvitacionPanelProps) {
  const { user, loading, signInWithGoogle, signOut } = useFirebaseAuth();
  const [estado, setEstado] = useState<Estado>("idle");
  const [mensaje, setMensaje] = useState("");
  const [authError, setAuthError] = useState("");
  const intentadoPara = useRef<string | null>(null);

  const aceptar = useCallback(
    async (currentUser: NonNullable<typeof user>) => {
      setEstado("aceptando");
      setMensaje("");

      try {
        const idToken = await currentUser.getIdToken();
        const response = await fetch("/api/invitaciones/aceptar", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });
        const data = (await response.json()) as { error?: string };

        if (!response.ok) {
          setEstado("error");
          setMensaje(
            data.error ?? "No se pudo aceptar la invitación. Solicite una nueva.",
          );
          return;
        }

        setEstado("ok");
        setMensaje("Acceso concedido. Redirigiendo al panel…");

        window.setTimeout(() => {
          window.location.assign("/admin");
        }, 1200);
      } catch {
        setEstado("error");
        setMensaje("Error de conexión al aceptar la invitación.");
      }
    },
    [token],
  );

  useEffect(() => {
    if (loading || !user) {
      return;
    }

    if (intentadoPara.current === user.uid) {
      return;
    }

    intentadoPara.current = user.uid;
    void aceptar(user);
  }, [aceptar, loading, user]);

  async function iniciarSesion() {
    setAuthError("");

    try {
      await signInWithGoogle();
    } catch (error) {
      setAuthError(getFirebaseAuthErrorMessage(error));
    }
  }

  async function cambiarCuenta() {
    intentadoPara.current = null;
    setEstado("idle");
    setMensaje("");
    await signOut();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-16">
      <div className="w-full rounded-3xl border border-white/[0.08] bg-[#121519]/80 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-orange/10 text-orange">
          <ShieldCheck className="h-5 w-5" aria-hidden />
        </div>

        <p className="text-xs font-medium uppercase tracking-[0.2em] text-steel-dark">
          Invitación de equipo
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
          Acceso al panel
        </h1>

        {loading ? (
          <p className="mt-5 flex items-center gap-2 text-sm text-steel-mid">
            <Loader2 className="h-4 w-4 animate-spin text-orange" aria-hidden />
            Verificando sesión…
          </p>
        ) : !user ? (
          <>
            <p className="mt-3 text-sm leading-relaxed text-steel-mid">
              Inicie sesión con la cuenta de Google autorizada para activar su
              acceso.
            </p>

            {authError ? (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-300">
                {authError}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void iniciarSesion()}
              className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange px-5 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-orange-hover"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              Continuar con Google
            </button>
          </>
        ) : estado === "ok" ? (
          <div className="mt-5 space-y-3">
            <p className="flex items-start gap-2 text-sm font-medium text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {mensaje}
            </p>
          </div>
        ) : estado === "error" ? (
          <div className="mt-5 space-y-4">
            <p className="flex items-start gap-2 text-sm font-medium text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {mensaje}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void aceptar(user)}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange px-4 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-orange-hover"
              >
                Reintentar
              </button>
              <button
                type="button"
                onClick={() => void cambiarCuenta()}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/[0.1] px-4 text-xs font-semibold text-steel-mid transition-colors hover:text-white"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Usar otra cuenta
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-5 flex items-center gap-2 text-sm text-steel-mid">
            <Loader2 className="h-4 w-4 animate-spin text-orange" aria-hidden />
            Activando acceso para {user.email ?? "su cuenta"}…
          </p>
        )}

        {user && estado !== "ok" ? (
          <p className="mt-6 border-t border-white/[0.06] pt-4 font-mono text-xs text-steel-dark">
            Sesión: {user.email ?? user.uid}
          </p>
        ) : null}
      </div>
    </div>
  );
}
