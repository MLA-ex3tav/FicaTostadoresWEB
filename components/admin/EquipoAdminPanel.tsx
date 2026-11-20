"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Link2,
  Loader2,
  Mail,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react";
import CustomSelect from "@/components/CustomSelect";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { getRoleLabel } from "@/lib/permissions";
import type {
  StaffInvitacion,
  StaffMember,
  StaffRole,
} from "@/lib/staff/types";

type InvitacionModo = "enlace" | "correo";

const ROLE_OPTIONS = [
  { value: "editor", label: getRoleLabel("editor") },
  { value: "admin", label: getRoleLabel("admin") },
];

const EXPIRA_OPTIONS = [
  { value: "24", label: "24 horas" },
  { value: "72", label: "3 días" },
  { value: "168", label: "7 días" },
];

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

export default function EquipoAdminPanel() {
  const { user, adminFetch } = useFirebaseAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [invitaciones, setInvitaciones] = useState<StaffInvitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [modo, setModo] = useState<InvitacionModo>("enlace");
  const [rol, setRol] = useState<StaffRole>("editor");
  const [email, setEmail] = useState("");
  const [expiraHoras, setExpiraHoras] = useState("72");
  const [creando, setCreando] = useState(false);
  const [enlaceGenerado, setEnlaceGenerado] = useState<string | null>(null);

  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [busyInvitacion, setBusyInvitacion] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");

    try {
      const response = await adminFetch("/api/admin/staff");
      const data = (await response.json()) as {
        staff?: StaffMember[];
        invitaciones?: StaffInvitacion[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar el equipo.");
      }

      setStaff(data.staff ?? []);
      setInvitaciones(data.invitaciones ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el equipo.");
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

  async function crearInvitacion() {
    setCreando(true);
    setError("");
    setNotice("");
    setEnlaceGenerado(null);

    try {
      const response = await adminFetch("/api/admin/staff", {
        method: "POST",
        body: JSON.stringify({
          tipo: modo,
          rol,
          email: email.trim() || undefined,
          expiraHoras: modo === "enlace" ? Number(expiraHoras) : undefined,
        }),
      });
      const data = (await response.json()) as {
        enlace?: string | null;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "No se pudo crear la invitación.");
        return;
      }

      if (data.enlace) {
        setEnlaceGenerado(data.enlace);
      }

      setEmail("");
      setNotice(
        modo === "enlace"
          ? "Enlace generado. Compártelo solo con la persona invitada."
          : "Correo autorizado. El acceso se activará en su próximo inicio de sesión.",
      );
      await load();
    } catch {
      setError("Error de conexión al crear la invitación.");
    } finally {
      setCreando(false);
    }
  }

  async function copiarEnlace() {
    if (!enlaceGenerado) {
      return;
    }

    try {
      await navigator.clipboard.writeText(enlaceGenerado);
      setNotice("Enlace copiado al portapapeles.");
    } catch {
      setError("No se pudo copiar el enlace. Cópielo manualmente.");
    }
  }

  async function cambiarRol(uid: string, nextRole: string) {
    if (nextRole !== "editor" && nextRole !== "admin") {
      return;
    }

    setBusyUid(uid);
    setError("");
    setNotice("");

    try {
      const response = await adminFetch(`/api/admin/staff/${uid}`, {
        method: "PATCH",
        body: JSON.stringify({ role: nextRole }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "No se pudo actualizar el rol.");
        return;
      }

      setStaff((current) =>
        current.map((entry) =>
          entry.uid === uid ? { ...entry, role: nextRole } : entry,
        ),
      );
    } catch {
      setError("Error de conexión al actualizar el rol.");
    } finally {
      setBusyUid(null);
    }
  }

  async function quitarAcceso(entry: StaffMember) {
    if (
      !window.confirm(
        `¿Quitar el acceso al panel de ${entry.email || entry.displayName || entry.uid}?`,
      )
    ) {
      return;
    }

    setBusyUid(entry.uid);
    setError("");
    setNotice("");

    try {
      const response = await adminFetch(`/api/admin/staff/${entry.uid}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "No se pudo quitar el acceso.");
        return;
      }

      setStaff((current) => current.filter((item) => item.uid !== entry.uid));
      setNotice("Acceso eliminado.");
      await load();
    } catch {
      setError("Error de conexión al quitar el acceso.");
    } finally {
      setBusyUid(null);
    }
  }

  async function revocar(invitacion: StaffInvitacion) {
    setBusyInvitacion(invitacion.id);
    setError("");
    setNotice("");

    try {
      const response = await adminFetch(
        `/api/admin/staff/invitaciones/${invitacion.id}`,
        { method: "DELETE" },
      );
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "No se pudo revocar la invitación.");
        return;
      }

      setInvitaciones((current) =>
        current.filter((item) => item.id !== invitacion.id),
      );
      setNotice("Invitación revocada.");
    } catch {
      setError("Error de conexión al revocar la invitación.");
    } finally {
      setBusyInvitacion(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-xs text-steel-mid">
        <Loader2 className="h-4 w-4 animate-spin text-orange" aria-hidden />
        Cargando equipo…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-xs leading-relaxed text-steel-mid">
        Solo las personas de esta lista pueden entrar al panel. Invítalas con un
        enlace de un solo uso o autoriza su correo para que el acceso se active
        automáticamente al iniciar sesión.
      </p>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-300">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {notice}
        </div>
      ) : null}

      {enlaceGenerado ? (
        <div className="space-y-3 rounded-2xl border border-orange/30 bg-orange/[0.08] p-5 shadow-xl">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Link2 className="h-4 w-4 text-orange" aria-hidden />
            Enlace de invitación
          </div>
          <p className="text-xs text-steel-mid">
            Este enlace no se volverá a mostrar. Caduca según lo configurado y
            solo puede usarse una vez.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              readOnly
              value={enlaceGenerado}
              onFocus={(event) => event.currentTarget.select()}
              className="industrial-input h-12 min-w-0 flex-1 font-mono text-xs text-white"
              aria-label="Enlace de invitación"
            />
            <button
              type="button"
              onClick={() => void copiarEnlace()}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-orange px-5 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-orange-hover"
            >
              <Copy className="h-4 w-4" aria-hidden />
              Copiar
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/[0.08] bg-[#121519]/70 p-5 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-orange">
            <UserPlus className="h-4 w-4" aria-hidden />
          </div>
          <h3 className="text-base font-semibold text-white">
            Dar acceso al panel
          </h3>
        </div>

        <div className="mb-4 inline-flex rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
          <button
            type="button"
            onClick={() => setModo("enlace")}
            aria-pressed={modo === "enlace"}
            className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors ${
              modo === "enlace"
                ? "bg-orange text-white"
                : "text-steel-mid hover:text-white"
            }`}
          >
            <Link2 className="h-3.5 w-3.5" aria-hidden />
            Enlace de invitación
          </button>
          <button
            type="button"
            onClick={() => setModo("correo")}
            aria-pressed={modo === "correo"}
            className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors ${
              modo === "correo"
                ? "bg-orange text-white"
                : "text-steel-mid hover:text-white"
            }`}
          >
            <Mail className="h-3.5 w-3.5" aria-hidden />
            Correo autorizado
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[11rem] flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-steel-mid">
              Rol
            </span>
            <CustomSelect
              value={rol}
              onChange={(value) => {
                if (value === "admin" || value === "editor") {
                  setRol(value);
                }
              }}
              options={ROLE_OPTIONS}
              aria-label="Rol del nuevo integrante"
              className="min-w-[11rem]"
            />
          </label>

          <label className="flex min-w-[16rem] flex-1 flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-steel-mid">
              Correo {modo === "enlace" ? "(opcional)" : ""}
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={
                modo === "enlace"
                  ? "Restringir a un correo (opcional)"
                  : "persona@empresa.cl"
              }
              className="industrial-input h-12"
            />
          </label>

          {modo === "enlace" ? (
            <label className="flex min-w-[9rem] flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-steel-mid">
                Caduca en
              </span>
              <CustomSelect
                value={expiraHoras}
                onChange={setExpiraHoras}
                options={EXPIRA_OPTIONS}
                aria-label="Vigencia del enlace"
                className="min-w-[9rem]"
              />
            </label>
          ) : null}

          <button
            type="button"
            disabled={creando}
            onClick={() => void crearInvitacion()}
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-orange px-5 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-orange-hover disabled:opacity-60"
          >
            {creando ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : modo === "enlace" ? (
              <Link2 className="h-4 w-4" aria-hidden />
            ) : (
              <Mail className="h-4 w-4" aria-hidden />
            )}
            {modo === "enlace" ? "Generar enlace" : "Autorizar correo"}
          </button>
        </div>

        {modo === "correo" ? (
          <p className="mt-3 text-xs text-steel-dark">
            Al iniciar sesión con ese correo (verificado), la cuenta obtiene el
            rol automáticamente. No es necesario enviar ningún enlace.
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121519]/70 shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3.5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <ShieldCheck className="h-4 w-4 text-orange" aria-hidden />
            Equipo con acceso
          </h3>
          <span className="font-mono text-xs text-steel-dark">
            {staff.length}
          </span>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-white/[0.08] bg-white/[0.03] text-xs font-semibold uppercase tracking-wider text-steel-mid">
              <tr>
                <th className="min-w-[200px] px-4 py-3.5 font-semibold">Miembro</th>
                <th className="min-w-[220px] px-4 py-3.5 font-semibold">Correo</th>
                <th className="w-48 px-4 py-3.5 font-semibold">Rol</th>
                <th className="w-36 px-4 py-3.5 pr-6 text-right font-semibold">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-xs text-steel-mid">
                    Aún no hay integrantes registrados.
                  </td>
                </tr>
              ) : (
                staff.map((entry) => {
                  const isSelf = entry.uid === user?.uid;
                  const isBusy = busyUid === entry.uid;

                  return (
                    <tr key={entry.uid} className="transition-colors hover:bg-white/[0.03]">
                      <td className="min-w-[200px] px-4 py-3.5 font-medium text-white">
                        {entry.displayName ?? "—"}
                        {isSelf ? (
                          <span className="ml-2 rounded-md border border-orange/30 bg-orange/10 px-1.5 py-0.5 font-mono text-[10px] text-orange">
                            usted
                          </span>
                        ) : null}
                      </td>
                      <td className="min-w-[220px] px-4 py-3.5 font-mono text-xs text-steel-mid">
                        {entry.email || "—"}
                      </td>
                      <td className="w-48 px-4 py-3.5">
                        <CustomSelect
                          value={entry.role}
                          disabled={isSelf || isBusy}
                          onChange={(value) => void cambiarRol(entry.uid, value)}
                          options={ROLE_OPTIONS}
                          aria-label={`Rol de ${entry.email || entry.uid}`}
                          className="min-w-[9.5rem]"
                        />
                      </td>
                      <td className="w-36 px-4 py-3.5 pr-6 text-right">
                        <button
                          type="button"
                          disabled={isSelf || isBusy}
                          onClick={() => void quitarAcceso(entry)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:border-red-500/40 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          Quitar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121519]/70 shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3.5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Mail className="h-4 w-4 text-orange" aria-hidden />
            Invitaciones pendientes
          </h3>
          <span className="font-mono text-xs text-steel-dark">
            {invitaciones.length}
          </span>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-white/[0.08] bg-white/[0.03] text-xs font-semibold uppercase tracking-wider text-steel-mid">
              <tr>
                <th className="min-w-[220px] px-4 py-3.5 font-semibold">Tipo</th>
                <th className="min-w-[180px] px-4 py-3.5 font-semibold">Destino</th>
                <th className="w-40 px-4 py-3.5 font-semibold">Rol</th>
                <th className="w-44 px-4 py-3.5 font-semibold">Caduca</th>
                <th className="w-36 px-4 py-3.5 pr-6 text-right font-semibold">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {invitaciones.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-xs text-steel-mid">
                    No hay invitaciones pendientes.
                  </td>
                </tr>
              ) : (
                invitaciones.map((invitacion) => {
                  const isBusy = busyInvitacion === invitacion.id;

                  return (
                    <tr key={invitacion.id} className="transition-colors hover:bg-white/[0.03]">
                      <td className="min-w-[220px] px-4 py-3.5 text-white">
                        {invitacion.tipo === "enlace"
                          ? "Enlace de un solo uso"
                          : "Correo autorizado"}
                      </td>
                      <td className="min-w-[180px] px-4 py-3.5 font-mono text-xs text-steel-mid">
                        {invitacion.email ||
                          (invitacion.tipo === "enlace"
                            ? "Cualquier correo"
                            : "—")}
                      </td>
                      <td className="w-40 px-4 py-3.5 text-xs text-steel-light">
                        {getRoleLabel(invitacion.rol)}
                      </td>
                      <td className="w-44 px-4 py-3.5 text-xs text-steel-mid">
                        {invitacion.tipo === "enlace"
                          ? formatDate(invitacion.expiraAt)
                          : "Sin caducidad"}
                      </td>
                      <td className="w-36 px-4 py-3.5 pr-6 text-right">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void revocar(invitacion)}
                          className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs font-medium text-steel-mid transition-colors hover:text-white disabled:opacity-50"
                        >
                          {isBusy ? "Revocando…" : "Revocar"}
                        </button>
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
