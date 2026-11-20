import { SITE_URL } from "@/lib/seo";

/**
 * Agentic Resource Discovery (ARD) manifest — describe los recursos que la
 * web expone a agentes (APIs, catálogo, documentación y acciones).
 * Spec: https://agenticresourcediscovery.org/
 */
export const dynamic = "force-static";

export function GET() {
  const base = SITE_URL.replace(/\/$/, "");
  const host = new URL(base).hostname;

  const manifest = {
    specVersion: "0.1",
    host: {
      name: "Fica Tostadores",
      url: base,
      description:
        "Fabricante chileno de maquinaria industrial y comercial para tostado de café.",
    },
    entries: [
      {
        id: `urn:air:${host}:api:products`,
        displayName: "Catálogo de productos",
        description:
          "Listado de tostadores, molinos y equipos con precios y especificaciones.",
        type: "application/json",
        url: `${base}/api/products`,
        representativeQueries: [
          "tostadores de café industriales",
          "molino de café comercial",
          "precio tostador TLC",
        ],
      },
      {
        id: `urn:air:${host}:api:openapi`,
        displayName: "Especificación OpenAPI",
        description: "Descripción OpenAPI 3.1 de la API pública.",
        type: "application/openapi+json",
        url: `${base}/api/openapi`,
        representativeQueries: [
          "endpoints de la API de Fica",
          "cómo cotizar por API",
        ],
      },
      {
        id: `urn:air:${host}:doc:llms`,
        displayName: "Resumen del sitio para asistentes",
        description: "Descripción en texto de la empresa, secciones y contacto.",
        type: "text/markdown",
        url: `${base}/llms.txt`,
        representativeQueries: [
          "quiénes son Fica Tostadores",
          "contacto y ventas Fica",
        ],
      },
      {
        id: `urn:air:${host}:page:cotizar`,
        displayName: "Solicitar cotización",
        description: "Formulario para solicitar cotización de maquinaria.",
        type: "text/html",
        url: `${base}/cotizar`,
        representativeQueries: [
          "solicitar cotización de tostador",
          "pedir precio de máquina",
        ],
      },
    ],
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
