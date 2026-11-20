"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  MapPin,
  RefreshCw,
  Smartphone,
  Trash2,
} from "lucide-react";
import { useFirebaseAuth } from "@/lib/firebase-auth";

interface FcmDevice {
  deviceId: string;
  platform: string;
  app: string;
  deviceModel: string | null;
  appVersion: string | null;
  lastIp: string | null;
  pais: string | null;
  region: string | null;
  ciudad: string | null;
  latitud: string | null;
  longitud: string | null;
  userAgent: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  lastSeenAt: string | null;
}

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

function shortId(value: string): string {
  return value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

function locationLabel(device: FcmDevice): string {
  const city = device.ciudad?.trim();
  const country = device.pais?.trim();

  if (city && country) {
    return `${city}, ${country}`;
  }

  return city || country || "—";
}

export default function FcmDevicesPanel() {
  const { adminFetch } = useFirebaseAuth();
  const [devices, setDevices] = useState<FcmDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setError("");

    try {
      const response = await adminFetch("/api/admin/fcm-devices");
      const data = (await response.json()) as {
        devices?: FcmDevice[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar los dispositivos.");
      }

      setDevices(data.devices ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar los dispositivos.",
      );
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

  async function removeDevice(device: FcmDevice) {
    if (
      !window.confirm(
        `¿Borrar el dispositivo ${device.deviceModel ?? shortId(device.deviceId)}? Dejará de recibir notificaciones hasta que vuelva a registrarse.`,
      )
    ) {
      return;
    }

    setBusy(device.deviceId);
    setError("");
    setNotice("");

    try {
      const response = await adminFetch(
        `/api/admin/fcm-devices/${encodeURIComponent(device.deviceId)}`,
        { method: "DELETE" },
      );
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "No se pudo borrar el dispositivo.");
        return;
      }

      setDevices((current) =>
        current.filter((entry) => entry.deviceId !== device.deviceId),
      );
      setNotice("Dispositivo eliminado.");
    } catch {
      setError("Error de conexión al borrar el dispositivo.");
    } finally {
      setBusy(null);
    }
  }

  async function removeStale() {
    if (
      !window.confirm(
        "¿Borrar todos los dispositivos sin conexión en los últimos 30 días?",
      )
    ) {
      return;
    }

    setBusy("stale");
    setError("");
    setNotice("");

    try {
      const response = await adminFetch(
        "/api/admin/fcm-devices?staleDays=30",
        { method: "DELETE" },
      );
      const data = (await response.json()) as {
        deleted?: number;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "No se pudieron borrar los dispositivos.");
        return;
      }

      setNotice(`Dispositivos eliminados: ${data.deleted ?? 0}.`);
      await load();
    } catch {
      setError("Error de conexión al borrar dispositivos inactivos.");
    } finally {
      setBusy(null);
    }
  }

  async function removeAll() {
    if (
      !window.confirm(
        "¿Borrar TODOS los dispositivos? Hasta que cada equipo vuelva a abrir la app no recibirá notificaciones.",
      )
    ) {
      return;
    }

    setBusy("all");
    setError("");
    setNotice("");

    try {
      const response = await adminFetch("/api/admin/fcm-devices?all=true", {
        method: "DELETE",
      });
      const data = (await response.json()) as {
        deleted?: number;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "No se pudieron borrar los dispositivos.");
        return;
      }

      setDevices([]);
      setNotice(`Dispositivos eliminados: ${data.deleted ?? 0}.`);
    } catch {
      setError("Error de conexión al borrar los dispositivos.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-xs text-steel-mid">
        <Loader2 className="h-4 w-4 animate-spin text-orange" aria-hidden />
        Cargando dispositivos…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-steel-dark">
            Notificaciones push
          </p>
          <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold text-white">
            <Smartphone className="h-4 w-4 text-orange" aria-hidden />
            Dispositivos móviles
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-steel-mid">
            Equipos registrados para recibir avisos de cotizaciones y soporte.
            La ubicación es aproximada (IP/Vercel), no GPS.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void load()}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/[0.1] px-3 text-xs font-medium text-steel-mid transition-colors hover:text-white disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Actualizar
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void removeStale()}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/[0.1] px-3 text-xs font-medium text-steel-mid transition-colors hover:text-white disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Borrar +30 días
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void removeAll()}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-500/20 px-3 text-xs font-medium text-red-300 transition-colors hover:border-red-500/40 hover:text-red-200 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Borrar todos
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-300">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-300">
          {notice}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121519]/70 shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3.5">
          <h3 className="text-sm font-semibold text-white">
            Registrados: <span className="font-mono">{devices.length}</span>
          </h3>
          <span className="font-mono text-xs text-steel-dark">
            {devices.filter((device) => device.ciudad || device.pais).length} con
            ubicación
          </span>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-white/[0.08] bg-white/[0.03] text-xs font-semibold uppercase tracking-wider text-steel-mid">
              <tr>
                <th className="min-w-[180px] px-4 py-3.5 font-semibold">
                  Dispositivo
                </th>
                <th className="min-w-[170px] px-4 py-3.5 font-semibold">
                  App
                </th>
                <th className="min-w-[160px] px-4 py-3.5 font-semibold">
                  Ubicación
                </th>
                <th className="min-w-[130px] px-4 py-3.5 font-semibold">IP</th>
                <th className="min-w-[150px] px-4 py-3.5 font-semibold">
                  Última conexión
                </th>
                <th className="w-28 px-4 py-3.5 pr-6 text-right font-semibold">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {devices.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-xs text-steel-mid"
                  >
                    No hay dispositivos registrados. Se agregarán cuando la app
                    móvil vuelva a abrirse.
                  </td>
                </tr>
              ) : (
                devices.map((device) => {
                  const isBusy = busy === device.deviceId;

                  return (
                    <tr
                      key={device.deviceId}
                      className="transition-colors hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3.5">
                        <p
                          className="font-mono text-xs text-white"
                          title={device.deviceId}
                        >
                          {shortId(device.deviceId)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-steel-dark">
                          {device.platform}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-steel-mid">
                        <p className="text-steel-light">
                          {device.deviceModel || "Modelo no informado"}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-steel-dark">
                          {device.appVersion || "versión —"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-steel-mid">
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin
                            className="h-3.5 w-3.5 text-steel-dark"
                            aria-hidden
                          />
                          {locationLabel(device)}
                        </span>
                        {device.region ? (
                          <p className="mt-0.5 text-[11px] text-steel-dark">
                            {device.region}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px] text-steel-mid">
                        {device.lastIp || "—"}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-steel-mid">
                        {formatDate(device.lastSeenAt ?? device.updatedAt)}
                      </td>
                      <td className="px-4 py-3.5 pr-6 text-right">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void removeDevice(device)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:border-red-500/40 hover:text-red-200 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          {isBusy ? "..." : "Borrar"}
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
