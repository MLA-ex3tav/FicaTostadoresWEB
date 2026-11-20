import {
  HEALTH_CATEGORY_LABELS,
  type HealthCategory,
  type HealthCheck,
  type HealthStatus,
  type SystemHealthReport,
} from "@/lib/system-health";

interface SystemHealthPanelProps {
  report: SystemHealthReport;
}

const STATUS_LABELS: Record<HealthStatus, string> = {
  ok: "Operativo",
  warning: "Advertencia",
  error: "Error",
};

function statusBadgeClass(status: HealthStatus): string {
  switch (status) {
    case "ok":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
    case "warning":
      return "border-orange/30 bg-orange/10 text-orange";
    case "error":
      return "border-red-500/30 bg-red-500/10 text-red-400";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function groupChecksByCategory(
  checks: HealthCheck[],
): Map<HealthCategory, HealthCheck[]> {
  const groups = new Map<HealthCategory, HealthCheck[]>();

  for (const check of checks) {
    const existing = groups.get(check.category) ?? [];
    existing.push(check);
    groups.set(check.category, existing);
  }

  return groups;
}

function formatCheckedAt(iso: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function findElectronCheck(checks: HealthCheck[]): HealthCheck | undefined {
  return checks.find((check) => check.id === "electron-cotizaciones-app");
}

function ElectronPresenceHighlight({ check }: { check: HealthCheck }) {
  const isConnected = check.status === "ok";

  return (
    <section
      className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 shadow-xl space-y-3"
      aria-labelledby="electron-presence-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-steel-dark">
            Aplicación de Escritorio
          </p>
          <h2
            id="electron-presence-title"
            className="mt-1 text-lg font-semibold text-white"
          >
            App Administrativa (Tauri)
          </h2>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${statusBadgeClass(check.status)}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400" : check.status === "warning" ? "bg-orange" : "bg-red-400"}`}
            aria-hidden
          />
          {isConnected ? "Conectada" : check.status === "warning" ? "Sin configurar" : "Desconectada"}
        </span>
      </div>

      <p className="text-sm text-steel-mid leading-relaxed">{check.message}</p>

      {check.details?.length ? (
        <ul className="space-y-1 text-xs text-steel-dark list-disc pl-4">
          {check.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}

      <p className="text-[11px] text-steel-dark pt-1">
        La App administrativa debe reportar latidos POST a{" "}
        <span className="font-mono text-steel-light">/api/electron/heartbeat</span> periódicamente con el secreto de sincronización.
      </p>
    </section>
  );
}

export default function SystemHealthPanel({ report }: SystemHealthPanelProps) {
  const electronCheck = findElectronCheck(report.checks);
  const checksWithoutElectron = report.checks.filter(
    (check) => check.id !== "electron-cotizaciones-app",
  );
  const grouped = groupChecksByCategory(checksWithoutElectron);
  const categoryOrder: HealthCategory[] = [
    "firebase",
    "vercel",
    "monitoreo",
    "integraciones",
    "paginas",
    "api",
  ];

  return (
    <div className="space-y-8">
      {electronCheck ? (
        <ElectronPresenceHighlight check={electronCheck} />
      ) : null}

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.02] p-5 shadow-lg">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-400">
            Servicios Operativos
          </p>
          <p className="mt-2 text-3xl font-mono font-semibold text-emerald-300">
            {report.summary.ok}
          </p>
        </div>
        <div className="rounded-2xl border border-orange/20 bg-orange/[0.02] p-5 shadow-lg">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-orange">
            Advertencias
          </p>
          <p className="mt-2 text-3xl font-mono font-semibold text-orange">
            {report.summary.warning}
          </p>
        </div>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.02] p-5 shadow-lg">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-red-400">
            Errores Críticos
          </p>
          <p className="mt-2 text-3xl font-mono font-semibold text-red-300">
            {report.summary.error}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-xs text-steel-mid shadow-sm space-y-1">
        <p>
          Última verificación:{" "}
          <span className="text-white font-medium">
            {formatCheckedAt(report.checkedAt)}
          </span>
        </p>
        <p>
          Entorno de ejecución:{" "}
          <span className="font-mono text-white font-medium">{report.environment}</span>
        </p>
        {report.deploymentUrl ? (
          <p>
            URL Base comprobada:{" "}
            <span className="font-mono text-white font-medium">{report.deploymentUrl}</span>
          </p>
        ) : null}
      </div>

      {categoryOrder.map((category) => {
        const checks = grouped.get(category);

        if (!checks?.length) {
          return null;
        }

        return (
          <section key={category} className="space-y-4">
            <h2 className="text-lg font-semibold text-white">
              {HEALTH_CATEGORY_LABELS[category]}
            </h2>
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121519]/70 backdrop-blur-xl shadow-xl">
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="border-b border-white/[0.08] bg-white/[0.03] text-xs font-semibold uppercase tracking-wider text-steel-mid">
                    <tr>
                      <th className="w-56 px-4 py-3.5 font-semibold">Servicio</th>
                      <th className="w-40 px-4 py-3.5 font-semibold">Estado</th>
                      <th className="px-4 py-3.5 font-semibold">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {checks.map((check) => (
                      <tr
                        key={check.id}
                        className="transition-colors hover:bg-white/[0.03] align-top"
                      >
                        <td className="w-56 px-4 py-4 font-medium text-white">
                          {check.name}
                        </td>
                        <td className="w-40 px-4 py-4">
                          <span
                            className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${statusBadgeClass(check.status)}`}
                          >
                            {STATUS_LABELS[check.status]}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-steel-mid text-xs leading-relaxed">
                          <p className="text-steel-light">{check.message}</p>
                          {check.details?.length ? (
                            <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-steel-dark">
                              {check.details.map((detail) => (
                                <li key={detail}>{detail}</li>
                              ))}
                            </ul>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
