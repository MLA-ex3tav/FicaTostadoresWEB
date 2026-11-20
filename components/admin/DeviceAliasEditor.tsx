"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { useFirebaseAuth } from "@/lib/firebase-auth";

interface DeviceAliasEditorProps {
  /** Clave del registro de presencia (instanceId o hostname). */
  deviceKey: string;
  alias: string | null;
  fallbackName: string;
}

export default function DeviceAliasEditor({
  deviceKey,
  alias,
  fallbackName,
}: DeviceAliasEditorProps) {
  const { adminFetch } = useFirebaseAuth();
  const [currentAlias, setCurrentAlias] = useState(alias);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(alias ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const displayName = currentAlias?.trim() || fallbackName;

  function startEditing() {
    setDraft(currentAlias ?? "");
    setError("");
    setEditing(true);
  }

  function cancelEditing() {
    setDraft(currentAlias ?? "");
    setError("");
    setEditing(false);
  }

  async function save() {
    setBusy(true);
    setError("");

    try {
      const response = await adminFetch(
        `/api/admin/dispositivos/${encodeURIComponent(deviceKey)}/alias`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alias: draft.trim() || null }),
        },
      );
      const data = (await response.json()) as {
        device?: { alias?: string | null };
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar el nombre.");
        return;
      }

      setCurrentAlias(data.device?.alias ?? null);
      setEditing(false);
    } catch {
      setError("Error de conexión al guardar el nombre.");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-steel-light">{displayName}</span>
        <button
          type="button"
          onClick={startEditing}
          title="Cambiar nombre del equipo"
          aria-label={`Cambiar nombre de ${displayName}`}
          className="inline-flex items-center rounded-lg border border-white/[0.1] p-1.5 text-steel-mid transition-colors hover:text-white"
        >
          <Pencil className="h-3 w-3" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          maxLength={40}
          autoFocus
          disabled={busy}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void save();
            if (event.key === "Escape") cancelEditing();
          }}
          placeholder={fallbackName}
          aria-label="Nombre del equipo"
          className="h-9 w-full max-w-[220px] rounded-lg border border-white/[0.12] bg-white/[0.04] px-2.5 text-xs text-white outline-none placeholder:text-steel-dark focus:border-orange/40"
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          title="Guardar"
          aria-label="Guardar nombre"
          className="inline-flex items-center rounded-lg border border-orange/30 bg-orange/10 p-1.5 text-orange transition-colors hover:bg-orange/20 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={cancelEditing}
          disabled={busy}
          title="Cancelar"
          aria-label="Cancelar"
          className="inline-flex items-center rounded-lg border border-white/[0.1] p-1.5 text-steel-mid transition-colors hover:text-white disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      {error ? <p className="text-[11px] text-red-300">{error}</p> : null}
    </div>
  );
}
