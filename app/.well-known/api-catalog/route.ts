import { SITE_URL } from "@/lib/seo";

/**
 * API Catalog (RFC 9727) — publica un linkset (RFC 9264) que apunta a la
 * descripción OpenAPI, la documentación y el endpoint de estado de la API.
 */
export const dynamic = "force-static";

export function GET() {
  const base = SITE_URL.replace(/\/$/, "");

  const linkset = {
    linkset: [
      {
        anchor: `${base}/api`,
        "service-desc": [
          {
            href: `${base}/api/openapi`,
            type: "application/openapi+json",
            title: "OpenAPI 3.1 de la API de Fica Tostadores",
          },
        ],
        "service-doc": [
          {
            href: `${base}/llms.txt`,
            type: "text/markdown",
            title: "Documentación y descripción del sitio",
          },
        ],
        status: [
          {
            href: `${base}/api/health`,
            type: "application/json",
            title: "Estado de salud del sistema",
          },
        ],
      },
    ],
  };

  return new Response(JSON.stringify(linkset, null, 2), {
    headers: {
      "Content-Type": "application/linkset+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
