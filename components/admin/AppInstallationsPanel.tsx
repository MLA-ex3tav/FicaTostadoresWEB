import DeviceAliasEditor from "@/components/admin/DeviceAliasEditor";
import type { ElectronDeviceStatus } from "@/lib/electron-presence";

interface AppInstallationsPanelProps {
  devices: ElectronDeviceStatus[];
}

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: string | null): string {
  if (!value) return "Sin registro";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Sin registro" : dateFormatter.format(date);
}

function shortId(value: string | null): string {
  if (!value) return "ID no disponible";
  return value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

function appLabel(device: ElectronDeviceStatus): string {
  if (device.appId === "appv2") return "APPv2 · Escritorio";
  if (device.appId === "movil") return "Fica Tostadores · Móvil";
  return "Instalación anterior · sin identificar";
}

function deviceLabel(device: ElectronDeviceStatus): string {
  if (device.hostname) return device.hostname;
  const platform = device.platform?.trim();
  return platform ? `${platform} · ${shortId(device.instanceId)}` : shortId(device.instanceId);
}

export default function AppInstallationsPanel({ devices }: AppInstallationsPanelProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121519]/70 shadow-xl">
      <div className="border-b border-white/[0.08] px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-steel-dark">
              Inventario de aplicaciones
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Instalaciones detectadas</h2>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-steel-mid">
            {devices.length} dispositivo{devices.length === 1 ? "" : "s"}
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-steel-mid">
          Se registra una instalación cuando abre la app y se conecta. La última actividad ayuda a
          saber si sigue en uso; el sistema no puede confirmar si después fue desinstalada.
        </p>
      </div>

      {devices.length === 0 ? (
        <p className="px-6 py-8 text-sm text-steel-mid">
          Todavía no hay dispositivos registrados. Aparecerán cuando las apps envíen su próxima señal.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-white/[0.08] bg-white/[0.03] text-xs font-semibold uppercase tracking-wider text-steel-mid">
              <tr>
                <th className="px-5 py-3">Aplicación</th>
                <th className="px-5 py-3">Equipo</th>
                <th className="px-5 py-3">Perfil reportado</th>
                <th className="px-5 py-3">Versión</th>
                <th className="px-5 py-3">Última actividad</th>
                <th className="px-5 py-3">Primera actividad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {devices.map((device) => (
                <tr key={device.instanceId ?? `${device.appId}-${device.lastSeenAt}`}>
                  <td className="px-5 py-4 font-medium text-white">{appLabel(device)}</td>
                  <td className="px-5 py-4 text-steel-light">
                    {device.instanceId || device.hostname ? (
                      <DeviceAliasEditor
                        deviceKey={device.instanceId ?? device.hostname ?? ""}
                        alias={device.alias}
                        fallbackName={deviceLabel(device)}
                      />
                    ) : (
                      deviceLabel(device)
                    )}
                  </td>
                  <td className="px-5 py-4 text-steel-light">
                    {device.operatorName || "Sin perfil reportado"}
                  </td>
                  <td className="px-5 py-4 font-mono text-steel-light">
                    {device.version ? `v${device.version}` : "—"}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={device.connected ? "text-emerald-400" : "text-steel-mid"}
                      title={device.connected ? "Conectada ahora" : "Sin señal reciente"}
                    >
                      {device.connected ? "En uso · " : "Inactiva · "}
                      {formatDate(device.lastSeenAt)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-steel-mid">{formatDate(device.firstSeenAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="border-t border-white/[0.06] px-5 py-3 text-[11px] text-steel-dark sm:px-6">
        El nombre del perfil lo reporta la app desde su selector local; no equivale a una cuenta verificada.
      </p>
    </section>
  );
}
