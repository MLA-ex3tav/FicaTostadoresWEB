import OperadoresAdminPanel from "@/components/admin/OperadoresAdminPanel";

export const metadata = {
  title: "Perfiles de revisión | Fica Tostadores",
};

export default function AdminPerfilesPage() {
  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-10 space-y-8">
      <div className="border-b border-white/[0.06] pb-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-steel-dark">
          Revisión de cotizaciones
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Perfiles de <span className="text-orange">revisión</span>
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-steel-mid">
          Crea y administra los perfiles que se eligen en la app de escritorio y la app móvil
          para tomar y revisar cotizaciones sin duplicar el trabajo.
        </p>
      </div>

      <OperadoresAdminPanel />
    </div>
  );
}
