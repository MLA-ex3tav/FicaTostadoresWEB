import SiteModePanel from "@/components/admin/SiteModePanel";

export const metadata = {
  title: "Sitio web | Fica Tostadores",
};

export default function AdminSitioPage() {
  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-10 space-y-8">
      <div className="border-b border-white/[0.06] pb-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-steel-dark">
          Publicación
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Sitio <span className="text-orange">Web</span>
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-steel-mid">
          Controle si la web pública está visible para los visitantes o si se
          muestra la pantalla de “Muy pronto” mientras el equipo la revisa.
        </p>
      </div>

      <SiteModePanel />
    </div>
  );
}
