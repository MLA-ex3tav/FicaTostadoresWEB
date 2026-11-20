"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, X } from "lucide-react";
import { useFirebaseAuth } from "@/lib/firebase-auth";

interface Operador {
  id: string;
  nombre: string;
  color: string;
  activo: boolean;
  creadoAt: string | null;
  ultimoUsoAt: string | null;
}

const DEFAULT_COLOR = "#E8873A";

export default function OperadoresAdminPanel() {
  const { adminFetch } = useFirebaseAuth();
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoColor, setNuevoColor] = useState(DEFAULT_COLOR);
  const [creando, setCreando] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editColor, setEditColor] = useState(DEFAULT_COLOR);

  const load = useCallback(async () => {
    setError("");

    try {
      const response = await adminFetch("/api/admin/operadores");
      const data = (await response.json()) as { operadores?: Operador[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar la lista de perfiles.");
      }

      setOperadores(data.operadores ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar perfiles.");
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      void load();
    });
    return () => cancelAnimationFrame(raf);
  }, [load]);

  async function crear() {
    const nombre = nuevoNombre.trim();

    if (!nombre) {
      setError("El nombre es requerido.");
      return;
    }

    setCreando(true);
    setError("");

    try {
      const response = await adminFetch("/api/admin/operadores", {
        method: "POST",
        body: JSON.stringify({ nombre, color: nuevoColor }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "No se pudo crear el perfil.");
        return;
      }

      setNuevoNombre("");
      setNuevoColor(DEFAULT_COLOR);
      await load();
    } catch {
      setError("Error de conexión al crear el perfil.");
    } finally {
      setCreando(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    setError("");

    try {
      const response = await adminFetch(`/api/admin/operadores/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "No se pudo actualizar el perfil.");
        return false;
      }

      await load();
      return true;
    } catch {
      setError("Error de conexión al actualizar el perfil.");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActivo(op: Operador) {
    await patch(op.id, { activo: !op.activo });
  }

  async function guardarEdicion(id: string) {
    const nombre = editNombre.trim();
    if (!nombre) {
      setError("El nombre es requerido.");
      return;
    }
    if (await patch(id, { nombre, color: editColor })) {
      setEditId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-xs text-steel-mid">
        <Loader2 className="h-4 w-4 animate-spin text-orange" aria-hidden />
        Cargando perfiles…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-steel-mid">
        Los perfiles se eligen en APPv2 y la app móvil (como perfiles de Netflix) para
        tomar y revisar cotizaciones sin duplicar el trabajo. Desactivar conserva el historial.
      </p>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-300">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/[0.08] bg-[#121519]/70 p-5 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-orange">
            <Plus className="h-4 w-4" aria-hidden />
          </div>
          <h3 className="text-base font-semibold text-white">Nuevo perfil</h3>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-steel-mid">Nombre</span>
            <input
              value={nuevoNombre}
              onChange={(event) => setNuevoNombre(event.target.value)}
              maxLength={80}
              className="h-10 w-56 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 text-sm text-white outline-none focus:border-orange/60"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-steel-mid">Color</span>
            <input
              type="color"
              value={nuevoColor}
              onChange={(event) => setNuevoColor(event.target.value)}
              className="h-10 w-14 cursor-pointer rounded-lg border border-white/[0.1] bg-white/[0.03] p-1"
            />
          </label>

          <button
            type="button"
            disabled={creando}
            onClick={() => void crear()}
            className="h-10 rounded-lg bg-orange px-4 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {creando ? "Creando…" : "Crear"}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121519]/70 shadow-xl">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-white/[0.08] bg-white/[0.03] text-xs font-semibold uppercase tracking-wider text-steel-mid">
              <tr>
                <th className="px-4 py-3.5 font-semibold">Perfil</th>
                <th className="w-32 px-4 py-3.5 font-semibold">Estado</th>
                <th className="w-56 px-4 py-3.5 text-right pr-6 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {operadores.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-xs text-steel-mid">
                    No hay perfiles todavía.
                  </td>
                </tr>
              ) : (
                operadores.map((op) => {
                  const isBusy = busyId === op.id;
                  const isEditing = editId === op.id;

                  return (
                    <tr key={op.id} className="align-top transition-colors hover:bg-white/[0.03]">
                      <td className="px-4 py-3.5">
                        {isEditing ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              value={editNombre}
                              onChange={(event) => setEditNombre(event.target.value)}
                              maxLength={80}
                              className="h-9 w-48 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 text-sm text-white outline-none focus:border-orange/60"
                            />
                            <input
                              type="color"
                              value={editColor}
                              onChange={(event) => setEditColor(event.target.value)}
                              className="h-9 w-12 cursor-pointer rounded-lg border border-white/[0.1] bg-white/[0.03] p-1"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5">
                            <span
                              className="h-3 w-3 shrink-0 rounded-full"
                              style={{ backgroundColor: op.color }}
                              aria-hidden
                            />
                            <span className="font-medium text-white">{op.nombre}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                            op.activo
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                              : "border-white/10 bg-white/[0.03] text-steel-mid"
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                          {op.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right pr-6">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void guardarEdicion(op.id)}
                              className="rounded-lg bg-orange px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-50"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditId(null)}
                              className="rounded-lg border border-white/[0.1] px-2 py-1.5 text-xs text-steel-mid"
                            >
                              <X className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditId(op.id);
                                setEditNombre(op.nombre);
                                setEditColor(op.color);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs font-medium text-steel-mid transition-colors hover:text-white"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden />
                              Editar
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void toggleActivo(op)}
                              className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs font-medium text-steel-mid transition-colors hover:text-white disabled:opacity-50"
                            >
                              {op.activo ? "Desactivar" : "Activar"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
