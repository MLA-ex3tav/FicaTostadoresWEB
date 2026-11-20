import AppInstallationsPanel from "@/components/admin/AppInstallationsPanel";
import FcmDevicesPanel from "@/components/admin/FcmDevicesPanel";
import { getElectronDevices } from "@/lib/electron-presence";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dispositivos | Fica Tostadores",
};

export default async function AdminDispositivosPage() {
  const devices = await getElectronDevices();

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-10 space-y-8">
      <div className="border-b border-white/[0.06] pb-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-steel-dark">
          Infraestructura y Servicios
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          <span className="text-orange">Dispositivos</span>
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-steel-mid">
          Instalaciones detectadas de la app de escritorio (APPv2) y de la app móvil, con la
          versión reportada por cada equipo y los dispositivos registrados para notificaciones.
        </p>
      </div>

      <AppInstallationsPanel devices={devices} />

      <FcmDevicesPanel />
    </div>
  );
}
