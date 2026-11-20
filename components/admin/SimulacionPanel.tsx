"use client";

import { useEffect, useState } from "react";
import { FlaskConical, Loader2 } from "lucide-react";
import { useFirebaseAuth } from "@/lib/firebase-auth";

interface SimulacionState {
  simulacion: boolean;
  forzadaPorEnv: boolean;
}

export default function SimulacionPanel() {
  const { adminFetch } = useFirebaseAuth();
  const [state, setState] = useState<SimulacionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void adminFetch("/api/admin/simulacion")
      .then(async (response) => {
        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error ?? "No se pudo cargar el estado.");
        }
        return response.json() as Promise<SimulacionState>;
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

  async function toggleSimulacion() {
    if (!state || state.forzadaPorEnv) {
      return;
    }

    const next = !state.simulacion;
    setSaving(true);
    setError("");

    try {
      const response = await adminFetch("/api/admin/simulacion", {
        method: "PUT",
        body: JSON.stringify({ activo: next }),
      });

      const data = (await response.json()) as SimulacionState & {
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar el modo simulación.");
        return;
      }

      setState(data);
    } catch {
      setError("Error de conexión al guardar el modo simulación.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-xs text-steel-mid">
        <Loader2 className="h-4 w-4 animate-spin text-orange" aria-hidden />
        Cargando estado de simulación…
      </div>
    );
  }

  const activo = state?.simulacion ?? false;
  const forzada = state?.forzadaPorEnv ?? false;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 shadow-xl space-y-5">
      <div className="flex items-center gap-3.5 border-b border-white/[0.06] pb-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-orange">
          <FlaskConical className="h-4 w-4" aria-hidden />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">
            Modo Simulación de Folios
          </h3>
          <p className="mt-0.5 text-xs text-steel-dark">
            Contadores simulados de prueba para cotizaciones (CO) y OT
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-6 py-2">
        <div className="max-w-xl space-y-1">
          <p className="text-sm font-semibold text-white">
            Contadores simulados independientes (CO / OT)
          </p>
          <p className="text-xs leading-relaxed text-steel-mid">
            Con el modo activo, las cotizaciones nuevas generadas por la web, app móvil y app de escritorio usarán folios de prueba independientes. Al desactivarlo, el sistema retoma el correlativo real de producción sin saltos ni alteraciones.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={activo}
          aria-label="Activar modo simulación de folios"
          disabled={saving || forzada}
          onClick={() => void toggleSimulacion()}
          className={`relative h-7 w-14 shrink-0 rounded-full transition-colors ${
            activo ? "bg-orange" : "bg-white/10"
          } ${saving || forzada ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
              activo ? "left-8" : "left-1"
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
            activo
              ? "border-orange/30 bg-orange/10 text-orange"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
          {activo ? "Activo (Contador simulado)" : "Desactivado (Producción real)"}
        </span>
      </div>

      {forzada ? (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-xs text-steel-mid">
          El modo simulación está forzado por la variable de entorno{" "}
          <code className="font-mono text-white">VITE_SIMULACION_MODE=true</code> en el servidor, por lo que el interruptor permanece bloqueado.
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
