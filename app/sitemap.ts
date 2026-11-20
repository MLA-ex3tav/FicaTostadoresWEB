import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/products-server";
import { SITE_URL } from "@/lib/seo";
import { getSiteMode } from "@/lib/site-mode";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL.replace(/\/$/, "");
  const now = new Date();
  const isConstruction = (await getSiteMode()) === "construction";

  const staticRoutes: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = isConstruction
    ? [{ path: "/", changeFrequency: "weekly", priority: 1 }]
    : [
        { path: "/", changeFrequency: "weekly", priority: 1 },
        { path: "/productos", changeFrequency: "weekly", priority: 0.9 },
        { path: "/cotizar", changeFrequency: "monthly", priority: 0.8 },
        { path: "/contacto", changeFrequency: "monthly", priority: 0.8 },
        { path: "/servicio-tecnico", changeFrequency: "monthly", priority: 0.7 },
        { path: "/privacidad", changeFrequency: "yearly", priority: 0.3 },
        { path: "/terminos", changeFrequency: "yearly", priority: 0.3 },
      ];

  const entries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${base}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  if (isConstruction) {
    return entries;
  }

  try {
    const products = await getProducts();
    for (const product of products) {
      if (!product?.id) continue;
      entries.push({
        url: `${base}/productos/${product.id}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch {
    // Si el catálogo no está disponible, se publican igual las rutas estáticas.
  }

  return entries;
}
