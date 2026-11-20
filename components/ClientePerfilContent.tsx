"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { googleLogout } from "@react-oauth/google";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Headphones,
  Layers,
  Loader2,
  LogOut,
  Mail,
  Plus,
  ShieldCheck,
  ShoppingBag,
  User,
  Wrench,
} from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import { Blobatar } from "@/components/ui/blobatar";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { getFirebaseAuthErrorMessage } from "@/lib/firebase-auth-errors";
import { isGoogleOAuthConfigured } from "@/lib/google-oauth-config";
import { buildLoginHref } from "@/lib/login-return-to";

export default function ClientePerfilContent() {
  const router = useRouter();
  const { user, isStaff, loading, configured, signOut } = useFirebaseAuth();
  const [signingOut, setSigningOut] = useState(false);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="mb-3 h-7 w-7 animate-spin text-orange" />
        <p className="text-sm font-medium text-steel-mid">Cargando su perfil…</p>
      </div>
    );
  }

  if (!configured || !user) {
    router.replace(buildLoginHref("/perfil"));
    return null;
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      if (isGoogleOAuthConfigured()) {
        try {
          googleLogout();
        } catch {
          // Ignorar si GIS no está disponible
        }
      }
      await signOut();
      router.replace("/");
    } catch (err) {
      console.error(getFirebaseAuthErrorMessage(err));
    } finally {
      setSigningOut(false);
    }
  }

  const displayName = user.displayName ?? "Mi cuenta";
  const avatarName = user.displayName?.trim() || user.email || user.uid;

  return (
    <div className="space-y-8">
      {/* Tarjeta de Identidad y Sesión */}
      <Reveal>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <Blobatar
                name={avatarName}
                src={user.photoURL ?? undefined}
                alt={displayName}
                size="lg"
                className="size-16 shrink-0 ring-1 ring-white/10 shadow-lg md:size-20"
              />

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-semibold text-white sm:text-2xl">
                    {displayName}
                  </h2>
                  {isStaff ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                      <ShieldCheck className="h-3.5 w-3.5" /> Staff
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-sm text-steel-mid">{user.email}</p>
                <p className="mt-1 text-xs text-steel-dark">
                  Identificador: <span className="font-mono text-xs text-steel-mid">{user.uid.slice(0, 12)}…</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4 md:border-t-0 md:pt-0">
              <Link
                href="/mis-solicitudes"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange px-4 text-xs font-semibold   text-white shadow-sm transition-all hover:bg-orange-hover active:scale-[0.98]"
              >
                <Layers className="h-4 w-4" />
                Mis Solicitudes
              </Link>

              <button
                type="button"
                disabled={signingOut}
                onClick={() => void handleSignOut()}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 text-xs font-semibold   text-red-400 transition-all hover:border-red-500/30 hover:bg-red-500/15 hover:text-red-300 disabled:opacity-50"
                title="Cerrar sesión"
              >
                {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                <span className="hidden sm:inline">Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Acceso destacado al centro de solicitudes */}
      <Reveal delay={0.05}>
        <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-r from-orange/10 via-white/[0.02] to-transparent p-6 sm:p-8 transition-all duration-300 hover:border-white/[0.14]">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange/15 text-orange">
                  <FileText className="h-3.5 w-3.5" />
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
                  <Wrench className="h-3.5 w-3.5" />
                </span>
                <p className="text-xs font-medium   text-orange">
                  Cotizaciones & Soporte de Taller
                </p>
              </div>

              <h3 className="text-lg font-semibold text-white sm:text-xl">
                Centro de Seguimiento de Solicitudes
              </h3>

              <p className="text-sm leading-relaxed text-steel-mid">
                Revise en tiempo real las cotizaciones de tostadores solicitadas y el estado de sus órdenes de servicio técnico y mantención.
              </p>
            </div>

            <Link
              href="/mis-solicitudes"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-orange transition-colors hover:text-orange-hover shrink-0"
            >
              <span>Ver mis solicitudes</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </Reveal>

      {/* Grid de 2 columnas: Datos de cuenta & Accesos rápidos */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Columna 1: Información de cuenta */}
        <Reveal delay={0.1}>
          <div className="h-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-steel-light">
                <User className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold text-white">
                Datos de la Cuenta
              </h3>
            </div>

            <dl className="divide-y divide-white/[0.06] text-sm">
              <div className="flex justify-between gap-4 py-3">
                <dt className="shrink-0 text-xs font-medium   text-steel-dark">Nombre</dt>
                <dd className="min-w-0 truncate text-right font-medium text-white">{displayName}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="shrink-0 text-xs font-medium   text-steel-dark">Correo</dt>
                <dd className="min-w-0 truncate text-right font-medium text-steel-light">{user.email}</dd>
              </div>
              {isStaff ? (
                <>
                  <div className="flex justify-between py-3">
                    <dt className="text-xs font-medium   text-steel-dark">Rol</dt>
                    <dd className="font-medium text-orange">
                      Administrador / Staff
                    </dd>
                  </div>
                  <div className="flex justify-between py-3">
                    <dt className="text-xs font-medium   text-steel-dark">Estado</dt>
                    <dd className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Operativo
                    </dd>
                  </div>
                </>
              ) : null}
            </dl>
          </div>
        </Reveal>

        {/* Columna 2: Gestiones rápidas */}
        <Reveal delay={0.15}>
          <div className="h-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-steel-light">
                <Plus className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold text-white">
                Nuevas Gestiones
              </h3>
            </div>

            <div className="space-y-2.5">
              <Link
                href="/contacto"
                className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 text-sm transition-all hover:border-orange hover:bg-white/[0.05]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange/10 text-orange">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-white group-hover:text-orange transition-colors">
                      Solicitar Cotización
                    </p>
                    <p className="text-xs text-steel-dark">Tostadores industriales a medida</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-steel-dark transition-transform group-hover:translate-x-0.5 group-hover:text-white" strokeWidth={1.5} />
              </Link>

              <Link
                href="/servicio-tecnico"
                className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 text-sm transition-all hover:border-orange hover:bg-white/[0.05]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300">
                    <Wrench className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-white group-hover:text-amber-300 transition-colors">
                      Servicio Técnico
                    </p>
                    <p className="text-xs text-steel-dark">Fallas, mantención y repuestos</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-steel-dark transition-transform group-hover:translate-x-0.5 group-hover:text-white" strokeWidth={1.5} />
              </Link>

              <Link
                href="/productos"
                className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 text-sm transition-all hover:border-orange hover:bg-white/[0.05]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-steel-mid">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-white group-hover:text-white transition-colors">
                      Catálogo de Productos
                    </p>
                    <p className="text-xs text-steel-dark">Línea TLC y accesorios</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-steel-dark transition-transform group-hover:translate-x-0.5 group-hover:text-white" strokeWidth={1.5} />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Enlaces de soporte y contacto */}
      <Reveal delay={0.2}>
          <div className="grid grid-cols-1 gap-4 border-t border-white/[0.06] pt-6 sm:grid-cols-2">
          <Link
            href="/contacto"
            className="group flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-orange hover:bg-white/[0.04]"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-steel-mid group-hover:text-white transition-colors">
                <Headphones className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Canal de Asistencia</p>
                <p className="text-xs text-steel-dark">Consulte con nuestros ejecutivos</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-steel-dark transition-transform group-hover:translate-x-1 group-hover:text-white" strokeWidth={1.5} />
          </Link>

          <a
            href="mailto:ventas@ficatostadores.cl"
            className="group flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-orange hover:bg-white/[0.04]"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-steel-mid group-hover:text-white transition-colors">
                <Mail className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">ventas@ficatostadores.cl</p>
                <p className="text-xs text-steel-dark">Correo oficial de atención</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-steel-dark transition-transform group-hover:translate-x-1 group-hover:text-white" strokeWidth={1.5} />
          </a>
        </div>
      </Reveal>
    </div>
  );
}
