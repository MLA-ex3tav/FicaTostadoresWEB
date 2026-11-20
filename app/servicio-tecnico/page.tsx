import TechnicalServicePage from "@/components/TechnicalServicePage";
import { getCatalogConfig } from "@/lib/catalog-config-server";
import { getProducts } from "@/lib/products-server";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata = buildMetadata({
  title: "Servicio técnico",
  description:
    "Solicite soporte técnico, mantenimiento o repuestos para su equipo Fica Tostadores. Reporte fallas y coordine la reparación con nuestro equipo.",
  path: "/servicio-tecnico",
});

export default async function ServicioTecnicoPage() {
  const [products, catalogConfig] = await Promise.all([
    getProducts(),
    getCatalogConfig(),
  ]);

  return <TechnicalServicePage products={products} catalogConfig={catalogConfig} />;
}
