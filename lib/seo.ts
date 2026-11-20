import type { Metadata } from "next";
import { companyInfo } from "@/lib/company";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  companyInfo.website ||
  "https://www.tostadoresfica.cl";

export const SITE_NAME = companyInfo.brand;

export const DEFAULT_TITLE =
  "Fica Tostadores | Tostadores de café y frutos secos en Chile";

export const DEFAULT_DESCRIPTION =
  "En Fica Tostadores fabricamos maquinaria de tostado en Chile. Acompañamos tu negocio con asesoría, fabricación y servicio técnico. Conoce nuestro trabajo.";

interface BuildMetadataInput {
  /** Título de la página sin el sufijo de marca (el template lo agrega). */
  title?: string;
  description?: string;
  /** Ruta canónica, ej. "/productos". Por defecto "/". */
  path?: string;
  /** Imágenes OG/Twitter absolutas o relativas a /public. */
  images?: string[];
  /** Marcar la página como no indexable (login, perfil, etc.). */
  noindex?: boolean;
}

function absoluteUrl(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return clean;
}

/**
 * Construye metadatos consistentes (title, description, canonical, OpenGraph
 * y Twitter) para cualquier página del sitio.
 */
export function buildMetadata({
  title,
  description,
  path = "/",
  images,
  noindex = false,
}: BuildMetadataInput = {}): Metadata {
  const desc = description?.trim() || DEFAULT_DESCRIPTION;
  const canonical = absoluteUrl(path);
  const ogTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const ogImages = images && images.length > 0 ? images : ["/opengraph-image"];
  const twitterImages =
    images && images.length > 0 ? images : ["/twitter-image"];

  return {
    title,
    description: desc,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      locale: "es_CL",
      url: canonical,
      siteName: SITE_NAME,
      title: ogTitle,
      description: desc,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: desc,
      images: twitterImages,
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
