import {
  Activity,
  ExternalLink,
  Gauge,
  RotateCw,
  ShieldCheck,
} from "lucide-react";
import {
  UPTIME_ROBOT_DASHBOARD_URL,
  type UptimeRobotMonitorStatus,
  type UptimeRobotOverview,
} from "@/lib/uptimerobot";

interface UptimeRobotPanelProps {
  overview: UptimeRobotOverview;
}

const STATUS_LABELS: Record<UptimeRobotMonitorStatus, string> = {
  up: "Activo",
  down: "Caído",
  paused: "Pausado",
  unknown: "Sin datos",
};

function statusBadgeClass(status: UptimeRobotMonitorStatus): string {
  switch (status) {
    case "up":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
    case "down":
      return "border-red-500/30 bg-red-500/10 text-red-400";
    case "paused":
      return "border-orange/30 bg-orange/10 text-orange";
    default:
      return "border-white/15 bg-white/[0.04] text-steel-mid";
  }
}

function formatUptime(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value) + "%";
}

function formatInterval(seconds: number | null): string {
  if (seconds === null) {
    return "—";
  }

  if (seconds >= 3_600) {
    const hours = Math.round(seconds / 3_600);
    return `${hours} h`;
  }

  if (seconds >= 60) {
    return `${Math.round(seconds / 60)} min`;
  }

  return `${Math.round(seconds)} s`;
}

function UptimeBar({
  value,
  status,
}: {
  value: number | null;
  status: UptimeRobotMonitorStatus;
}) {
  const segments = 30;
  const uptime = value ?? (status === "up" ? 100 : 0);
  const downSegments =
    status === "paused" || status === "unknown"
      ? segments
      : Math.min(
          segments,
          Math.max(0, Math.round(((100 - uptime) / 100) * segments)),
        );

  if (status === "paused" || status === "unknown") {
    return (
      <div className="flex items-end gap-[2px]" aria-hidden>
        {Array.from({ length: segments }).map((_, index) => (
          <span
            key={index}
            className="h-4 w-[3px] rounded-[1px] bg-white/15"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex items-end gap-[2px]"
      role="img"
      aria-label={`Uptime 30 días: ${formatUptime(value)}`}
    >
      {Array.from({ length: segments }).map((_, index) => (
        <span
          key={index}
          className={`h-4 w-[3px] rounded-[1px] ${
            index >= segments - downSegments
              ? "bg-red-400"
              : "bg-emerald-400"
          }`}
        />
      ))}
    </div>
  );
}

function formatResponseTime(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)} ms`;
}

function overallStatus(overview: UptimeRobotOverview) {
  if (!overview.configured) {
    return {
      label: "Sin configurar",
      className: "border-orange/30 bg-orange/10 text-orange",
    };
  }

  if (!overview.ok) {
    return {
      label: "Sin conexión",
      className: "border-red-500/30 bg-red-500/10 text-red-400",
    };
  }

  if (overview.summary.down > 0) {
    return {
      label: "Incidencias",
      className: "border-red-500/30 bg-red-500/10 text-red-400",
    };
  }

  if (overview.summary.paused > 0) {
    return {
      label: "Con pausas",
      className: "border-orange/30 bg-orange/10 text-orange",
    };
  }

  return {
    label: "Operativo",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  };
}

export default function UptimeRobotPanel({ overview }: UptimeRobotPanelProps) {
  const status = overallStatus(overview);

  return (
    <section
      aria-labelledby="uptimerobot-title"
      className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 shadow-xl space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-steel-dark">
            Monitoreo externo
          </p>
          <h2
            id="uptimerobot-title"
            className="mt-1 flex items-center gap-2 text-lg font-semibold text-white"
          >
            <Activity className="h-5 w-5 text-orange" aria-hidden />
            UptimeRobot
          </h2>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${status.className}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              status.label === "Operativo"
                ? "bg-emerald-400"
                : status.label === "Incidencias" ||
                    status.label === "Sin conexión"
                  ? "bg-red-400"
                  : "bg-orange"
            }`}
            aria-hidden
          />
          {status.label}
        </span>
      </div>

      {!overview.configured ? (
        <div className="rounded-xl border border-orange/20 bg-orange/[0.06] px-4 py-3 text-sm text-steel-light">
          <p className="font-medium text-orange">
            UptimeRobot no está configurado.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-steel-mid">
            Agrega <code className="font-mono text-steel-light">UPTIMEROBOT_API_KEY</code>{" "}
            en las variables de entorno del proyecto (local y Vercel) para ver
            aquí el estado de tus monitores.
          </p>
        </div>
      ) : null}

      {overview.configured && !overview.ok ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">
          <p className="font-medium">No se pudo consultar la API.</p>
          {overview.error ? (
            <p className="mt-1 text-xs text-red-300/80">{overview.error}</p>
          ) : null}
        </div>
      ) : null}

      {overview.configured && overview.ok ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.08] bg-[#121519]/70 p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-steel-dark">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                Uptime 30 días
              </p>
              <p className="mt-2 text-2xl font-mono font-semibold text-white">
                {formatUptime(overview.summary.averageUptime30d)}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#121519]/70 p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-steel-dark">
                <Activity className="h-3.5 w-3.5" aria-hidden />
                Monitores activos
              </p>
              <p className="mt-2 text-2xl font-mono font-semibold text-white">
                {overview.summary.up}
                <span className="text-base font-normal text-steel-dark">
                  {" "}
                  / {overview.summary.total}
                </span>
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#121519]/70 p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-steel-dark">
                <Gauge className="h-3.5 w-3.5" aria-hidden />
                Respuesta media
              </p>
              <p className="mt-2 text-2xl font-mono font-semibold text-white">
                {formatResponseTime(overview.summary.averageResponseMs)}
              </p>
            </div>
          </div>

          {overview.monitors.length === 0 ? (
            <p className="text-sm text-steel-mid">
              La API respondió, pero no hay monitores creados en UptimeRobot.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/[0.08]">
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-white/[0.08] bg-white/[0.03] text-xs font-semibold uppercase tracking-wider text-steel-mid">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Monitor</th>
                      <th className="w-32 px-4 py-3 font-semibold">Estado</th>
                      <th className="w-52 px-4 py-3 font-semibold">Uptime 30 d</th>
                      <th className="w-28 px-4 py-3 font-semibold">Respuesta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {overview.monitors.map((monitor) => (
                      <tr
                        key={monitor.id}
                        className="transition-colors hover:bg-white/[0.03]"
                      >
                        <td className="px-4 py-3.5">
                          {monitor.url ? (
                            <a
                              href={monitor.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block max-w-[22rem] truncate font-medium text-white transition-colors hover:text-orange"
                            >
                              {monitor.name}
                            </a>
                          ) : (
                            <p className="max-w-[22rem] truncate font-medium text-white">
                              {monitor.name}
                            </p>
                          )}
                          {monitor.url && monitor.url !== monitor.name ? (
                            <a
                              href={monitor.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-0.5 inline-block max-w-[22rem] truncate text-xs text-steel-dark transition-colors hover:text-orange"
                            >
                              {monitor.url}
                            </a>
                          ) : null}
                          <p className="mt-1 inline-flex items-center gap-1 text-xs text-steel-dark">
                            <RotateCw className="h-3 w-3" aria-hidden />
                            Cada {formatInterval(monitor.intervalSeconds)}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex rounded-lg border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${statusBadgeClass(monitor.status)}`}
                          >
                            {STATUS_LABELS[monitor.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex w-fit flex-col items-end gap-1">
                            <UptimeBar
                              value={monitor.uptime30d}
                              status={monitor.status}
                            />
                            <span className="font-mono text-xs text-steel-light">
                              {formatUptime(monitor.uptime30d)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-steel-light">
                          {formatResponseTime(monitor.averageResponseMs)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-4 text-[11px] text-steel-dark">
        <p>
          Actualizado:{" "}
          {new Intl.DateTimeFormat("es-CL", {
            dateStyle: "short",
            timeStyle: "short",
          }).format(new Date(overview.fetchedAt))}
        </p>
        <a
          href={UPTIME_ROBOT_DASHBOARD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-medium text-steel-mid transition-colors hover:text-orange"
        >
          Abrir panel de UptimeRobot
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>
    </section>
  );
}
