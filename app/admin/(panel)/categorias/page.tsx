import CategoryAdminPanel from "@/components/admin/CategoryAdminPanel";

export const metadata = {
  title: "Categorías admin | Fica Tostadores",
};

export default function AdminCategoriesPage() {
  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-10 space-y-8">
      <div className="border-b border-white/[0.06] pb-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-steel-dark">
          Tipos de Equipos
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Gestión de <span className="text-orange">Categorías</span>
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-steel-mid">
          Cada categoría pertenece a una línea o catálogo y permite filtrar y ordenar los productos en la tienda y en la cotización.
        </p>
      </div>

      <div>
        <CategoryAdminPanel />
      </div>
    </div>
  );
}