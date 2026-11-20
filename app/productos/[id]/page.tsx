import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import ProductDetailAdminEdit from "@/components/ProductDetailAdminEdit";
import ProductDetailSections from "@/components/ProductDetailSections";
import { getCatalogConfig } from "@/lib/catalog-config-server";
import { getProductById, getProducts } from "@/lib/products-server";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product) => ({ id: product.id }));
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    return buildMetadata({
      title: "Producto no encontrado",
      path: `/productos/${id}`,
      noindex: true,
    });
  }

  return buildMetadata({
    title: product.name,
    description: product.description,
    path: `/productos/${id}`,
  });
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { id } = await params;
  const [product, catalogConfig] = await Promise.all([
    getProductById(id),
    getCatalogConfig(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-20 pt-8 md:px-8 md:pb-24 md:pt-12 lg:px-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href="/productos"
          className="group inline-flex items-center gap-2 px-1 py-2 text-sm font-medium text-steel-mid transition-colors hover:text-orange focus-visible:underline focus-visible:underline-offset-4"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Catálogo
        </Link>

        <ProductDetailAdminEdit productId={product.id} />
      </div>

      <ProductDetailSections
        product={product}
        catalogConfig={catalogConfig}
      />
    </div>
  );
}
