import { notFound } from "next/navigation";

import ProductForm from "@/components/admin/ProductForm";

import { getAdminProductById } from "@/lib/products-server";

export const dynamic = "force-dynamic";

interface AdminEditProductPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}

export async function generateMetadata({ params }: AdminEditProductPageProps) {
  const { id } = await params;

  const product = await getAdminProductById(id);

  return {
    title: product
      ? `Editar ${product.name} | Fica Tostadores`
      : "Editar producto | Fica Tostadores",
  };
}

export default async function AdminEditProductPage({
  params,
  searchParams,
}: AdminEditProductPageProps) {
  const { id } = await params;
  const { returnTo } = await searchParams;

  const product = await getAdminProductById(id);

  if (!product) {
    notFound();
  }

  const redirectTo =
    typeof returnTo === "string" && /^\/productos\/[a-z0-9-]+$/.test(returnTo)
      ? returnTo
      : undefined;

  return (
    <div className="mx-auto max-w-[90rem] px-4 py-10 md:px-8">
      <p className="text-xs uppercase tracking-[0.3em] text-steel-dark">
        Editar
      </p>
      <h2 className="mt-2 font-display text-3xl tracking-wide text-steel-light">
        {product.name}
      </h2>
      <div className="mt-8">
        <ProductForm
          mode="edit"
          initialProduct={product}
          redirectTo={redirectTo}
        />
      </div>
    </div>
  );
}
