import SuperAdminGuard from "@/components/admin/SuperAdminGuard";
import EquipoAdminPanel from "@/components/admin/EquipoAdminPanel";

export const metadata = {
  title: "Equipo | Fica Tostadores",
};

export default function AdminEquipoPage() {
  return (
    <SuperAdminGuard>
      <div className="w-full space-y-8 px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        <div className="border-b border-white/[0.06] pb-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-steel-dark">
            Equipo y Permisos
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Gestión de <span className="text-orange">Equipo</span>
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-steel-mid">
            Administre quién puede acceder al panel mediante enlaces de
            invitación de un solo uso o correos autorizados.
          </p>
        </div>

        <EquipoAdminPanel />
      </div>
    </SuperAdminGuard>
  );
}
