import { Suspense } from "react";
import GranoDecor from "@/components/GranoDecor";
import ProductsCatalog from "@/components/ProductsCatalog";
import SectionHeader from "@/components/SectionHeader";
import { getCatalogConfig } from "@/lib/catalog-config-server";
import { getProducts } from "@/lib/products-server";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata = buildMetadata({
  title: "Productos",
  description:
    "Catálogo de tostadores de café TLC, tostadores comerciales e industriales, molinos, partidores y descascaradores. Fabricación chilena.",
  path: "/productos",
});

function ProductsCatalogFallback() {
  return (
    <p className="text-base text-steel-mid" role="status">
      Cargando catálogo…
    </p>
  );
}

export default async function ProductosPage() {
  const [products, catalogConfig] = await Promise.all([
    getProducts(),
    getCatalogConfig(),
  ]);

  return (
    <div className="relative isolate mx-auto w-full max-w-[1550px] overflow-x-clip px-4 py-12 md:px-8 md:py-16 lg:px-12">
      <GranoDecor
        variant="grano"
        className="right-[2%] top-8 w-24 -rotate-12 sm:w-36"
        opacity={0.1}
      />
      <GranoDecor
        variant="grano2"
        className="left-[1%] top-[45%] hidden w-24 rotate-12 lg:block"
        opacity={0.05}
      />
      <GranoDecor
        variant="grano2"
        className="bottom-16 right-[3%] w-28 -rotate-45 sm:w-40"
        opacity={0.06}
      />
      <GranoDecor
        variant="grano"
        className="bottom-6 left-[2%] w-16 rotate-12 sm:w-24"
        opacity={0.05}
      />

      <div className="mb-10">
        <SectionHeader
          as="h1"
          eyebrow="Catálogo"
          title={
            <>
              Nuestros productos
            </>
          }
        />
      </div>

      <Suspense fallback={<ProductsCatalogFallback />}>
        <ProductsCatalog products={products} catalogConfig={catalogConfig} />
      </Suspense>
    </div>
  );
}
