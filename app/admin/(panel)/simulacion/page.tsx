import SimulacionPanel from "@/components/admin/SimulacionPanel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Simulación | Fica Tostadores",
};

export default function AdminSimulacionPage() {
  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-10 space-y-8">
      <div className="border-b border-white/[0.06] pb-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-steel-dark">
          Desarrollo y Pruebas
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Modo <span className="text-orange">Simulación</span>
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-steel-mid">
          Permite generar cotizaciones de prueba con folios ficticios sin consumir la correlatividad real de producción.
        </p>
      </div>

      <div>
        <SimulacionPanel />
      </div>
    </div>
  );
}
