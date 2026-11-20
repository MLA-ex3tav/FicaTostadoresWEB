"use client";

import { useEffect, useState } from "react";
import { Globe, Loader2 } from "lucide-react";
import { useFirebaseAuth } from "@/lib/firebase-auth";

type SiteMode = "live" | "construction";

interface SiteModeState {
  mode: SiteMode;
  persistent: boolean;
}

export default function SiteModePanel() {
  const { adminFetch } = useFirebaseAuth();
  const [state, setState] = useState<SiteModeState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;

    void adminFetch("/api/admin/site-mode")
      .then(async (response) => {
        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error ?? "No se pudo cargar el estado.");
        }
        return response.json() as Promise<SiteModeState>;
      })
      .then((data) => {
        if (active) {
          setState(data);
          setError("");
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Error al cargar el estado.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [adminFetch]);

  async function toggleMode() {
    if (!state || !state.persistent) {
      return;
    }

    const next: SiteMode =
      state.mode === "construction" ? "live" : "construction";

    if (
      next === "construction" &&
      !window.confirm(
        "¿Activar el modo en construcción? Solo el equipo con sesión iniciada podrá ver el sitio público.",
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await adminFetch("/api/admin/site-mode", {
        method: "PUT",
        body: JSON.stringify({ mode: next }),
      });

      const data = (await response.json()) as SiteModeState & {
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar el modo del sitio.");
        return;
      }

      setState(data);
      setNotice(
        next === "live"
          ? "Sitio publicado. Los visitantes ya pueden ver la web."
          : "Modo en construcción activado. El sitio quedó oculto al público.",
      );
    } catch {
      setError("Error de conexión al guardar el modo del sitio.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-xs text-steel-mid">
        <Loader2 className="h-4 w-4 animate-spin text-orange" aria-hidden />
        Cargando estado del sitio…
      </div>
    );
  }

  const enConstruccion = state?.mode === "construction";
  const persistent = state?.persistent ?? false;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 shadow-xl space-y-5">
      <div className="flex items-center gap-3.5 border-b border-white/[0.06] pb-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-orange">
          <Globe className="h-4 w-4" aria-hidden />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">
            Sitio en construcción
          </h3>
          <p className="mt-0.5 text-xs text-steel-dark">
            Visibilidad pública de la web
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-6 py-2">
        <div className="max-w-xl space-y-1">
          <p className="text-sm font-semibold text-white">
            {enConstruccion
              ? "Solo el equipo puede ver el sitio"
              : "El sitio es visible para todos"}
          </p>
          <p className="text-xs leading-relaxed text-steel-mid">
            Con el modo activo, cualquier visitante ve la pantalla “Muy pronto”.
            Al desactivarlo, el catálogo, la cotización y el resto de las
            páginas quedan disponibles públicamente.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enConstruccion}
          aria-label="Activar modo en construcción"
          disabled={saving || !persistent}
          onClick={() => void toggleMode()}
          className={`relative h-7 w-14 shrink-0 rounded-full transition-colors ${
            enConstruccion ? "bg-orange" : "bg-white/10"
          } ${saving || !persistent ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
              enConstruccion ? "left-8" : "left-1"
            }`}
          />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4 text-xs">
        <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-steel-dark">
          Estado actual:
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
            enConstruccion
              ? "border-orange/30 bg-orange/10 text-orange"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
          {enConstruccion ? "En construcción" : "Publicado"}
        </span>
      </div>

      {!persistent ? (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-xs text-steel-mid">
          Configure{" "}
          <code className="font-mono text-white">
            UPSTASH_REDIS_REST_URL
          </code>{" "}
          y{" "}
          <code className="font-mono text-white">
            UPSTASH_REDIS_REST_TOKEN
          </code>{" "}
          para poder guardar este ajuste. El interruptor permanece bloqueado.
        </div>
      ) : (
        <p className="text-[11px] leading-relaxed text-steel-dark">
          El cambio se aplica en unos segundos. El equipo con sesión iniciada
          mantiene acceso al sitio aunque esté en construcción.
        </p>
      )}

      {notice ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-300">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-300">
          {error}
        </div>
      ) : null}
    </div>
  );
}
