import SystemHealthPanel from "@/components/admin/SystemHealthPanel";
import UptimeRobotPanel from "@/components/admin/UptimeRobotPanel";
import FcmDevicesPanel from "@/components/admin/FcmDevicesPanel";
import AppInstallationsPanel from "@/components/admin/AppInstallationsPanel";
import { getElectronDevices } from "@/lib/electron-presence";
import { getSystemHealthReport } from "@/lib/system-health";
import { getUptimeRobotOverview } from "@/lib/uptimerobot";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Estado del sistema | Fica Tostadores",
};

export default async function AdminConexionesPage() {
  const [report, uptimeRobot, appDevices] = await Promise.all([
    getSystemHealthReport({ includeDeviceDetails: true }),
    getUptimeRobotOverview(),
    getElectronDevices(),
  ]);

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-10 space-y-8">
      <div className="border-b border-white/[0.06] pb-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-steel-dark">
          Infraestructura y Servicios
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Estado del <span className="text-orange">Sistema</span>
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-steel-mid">
          Monitor de conectividad en tiempo real: Firebase, Vercel, UptimeRobot,
          aplicación administrativa de escritorio (Tauri) y endpoints de
          integración.
        </p>
      </div>

      <div>
        <SystemHealthPanel report={report} />
      </div>

      <AppInstallationsPanel devices={appDevices} />

      <UptimeRobotPanel overview={uptimeRobot} />

      <FcmDevicesPanel />
    </div>
  );
}
