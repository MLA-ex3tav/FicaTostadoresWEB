import QuotePageContent from "@/components/QuotePageContent";
import { getProducts } from "@/lib/products-server";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata = buildMetadata({
  title: "Contacto y cotización",
  description:
    "Contacte a Fica Tostadores para consultas y cotizaciones sobre maquinaria industrial de tostado de café.",
  path: "/contacto",
});

export default async function ContactoPage() {
  const products = await getProducts();
  return <QuotePageContent products={products} heading="Contacto y cotización" />;
}
