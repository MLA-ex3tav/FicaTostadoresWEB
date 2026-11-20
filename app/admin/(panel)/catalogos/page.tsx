import CatalogAdminPanel from "@/components/admin/CatalogAdminPanel";

export const metadata = {
  title: "Catálogos admin | Fica Tostadores",
};

export default function AdminCatalogsPage() {
  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-10 space-y-8">
      <div className="border-b border-white/[0.06] pb-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-steel-dark">
          Líneas de Productos
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Gestión de <span className="text-orange">Catálogos</span>
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-steel-mid">
          Los catálogos agrupan equipos por línea productiva (café, frutos secos, cacao, etc.).
          Defínalos aquí para organizarlos en el catálogo público y en el panel.
        </p>
      </div>

      <div>
        <CatalogAdminPanel />
      </div>
    </div>
  );
}