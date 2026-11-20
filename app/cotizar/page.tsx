import QuotePageContent from "@/components/QuotePageContent";
import { getProducts } from "@/lib/products-server";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata = buildMetadata({
  title: "Cotizar maquinaria",
  description:
    "Solicite su cotización personalizada para tostadores de café, tostadores comerciales e industriales Fica. Fabricación chilena.",
  path: "/cotizar",
});

export default async function CotizarPage() {
  const products = await getProducts();
  return <QuotePageContent products={products} />;
}
