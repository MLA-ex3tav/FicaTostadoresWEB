import Link from "next/link";
import { Plus } from "lucide-react";
import AdminProductsTable from "@/components/admin/AdminProductsTable";
import ProductExcelImport from "@/components/admin/ProductExcelImport";
import { getCatalogConfig } from "@/lib/catalog-config-server";
import { canPersistProducts } from "@/lib/products-repository";
import { getProducts } from "@/lib/products-server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Productos admin | Fica Tostadores",
};

export default async function AdminProductsPage() {
  const [products, catalogConfig] = await Promise.all([
    getProducts(),
    getCatalogConfig(),
  ]);
  const canPersist = canPersistProducts();

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-10 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-steel-dark">
            Catálogo Industrial
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Gestión de <span className="text-orange">Productos</span>{" "}
            <span className="ml-1 text-lg font-mono font-normal text-steel-mid sm:text-xl">
              ({products.length})
            </span>
          </h1>
        </div>

        <Link
          href="/admin/productos/nuevo"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange px-5 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-orange-hover active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Nuevo Producto
        </Link>
      </div>

      {!canPersist && (
        <div className="rounded-xl border border-orange/20 bg-orange/10 p-4 text-xs text-orange">
          Firebase Admin no está configurado. Defina FIREBASE_SERVICE_ACCOUNT_JSON
          o FIREBASE_SERVICE_ACCOUNT_PATH en .env.local (y en Vercel en
          producción). Sin eso solo puede ver el catálogo.
        </div>
      )}

      <div>
        <AdminProductsTable
          products={products}
          catalogConfig={catalogConfig}
        />
      </div>

      <ProductExcelImport catalogConfig={catalogConfig} />
    </div>
  );
}
