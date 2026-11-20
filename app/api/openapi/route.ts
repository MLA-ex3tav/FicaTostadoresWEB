import { SITE_URL } from "@/lib/seo";

/** Especificación OpenAPI 3.1 de los endpoints públicos de la web. */
export const dynamic = "force-static";

export function GET() {
  const base = SITE_URL.replace(/\/$/, "");

  const spec = {
    openapi: "3.1.0",
    info: {
      title: "Fica Tostadores API",
      version: "1.0.0",
      description:
        "API pública del sitio de Fica Tostadores: catálogo de productos, configuración de catálogos y solicitudes de cotización.",
      contact: {
        name: "Fica Tostadores",
        email: "tostadoresfica@gmail.com",
        url: base,
      },
    },
    servers: [{ url: base }],
    tags: [
      { name: "Productos" },
      { name: "Catálogo" },
      { name: "Cotizaciones" },
      { name: "Sistema" },
    ],
    paths: {
      "/api/products": {
        get: {
          tags: ["Productos"],
          summary: "Lista el catálogo de productos",
          responses: {
            "200": {
              description: "Listado de productos",
              content: { "application/json": { schema: { type: "array", items: { type: "object" } } } },
            },
          },
        },
      },
      "/api/products/{id}": {
        get: {
          tags: ["Productos"],
          summary: "Obtiene un producto por su id",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Producto", content: { "application/json": { schema: { type: "object" } } } },
            "404": { description: "No encontrado" },
          },
        },
      },
      "/api/catalog-config": {
        get: {
          tags: ["Catálogo"],
          summary: "Configuración de catálogos y categorías",
          responses: {
            "200": { description: "Configuración", content: { "application/json": { schema: { type: "object" } } } },
          },
        },
      },
      "/api/cotizaciones/solicitudes": {
        post: {
          tags: ["Cotizaciones"],
          summary: "Crea una solicitud de cotización",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object" } } },
          },
          responses: {
            "201": { description: "Solicitud creada", content: { "application/json": { schema: { type: "object" } } } },
            "400": { description: "Datos inválidos" },
          },
        },
      },
      "/api/health": {
        get: {
          tags: ["Sistema"],
          summary: "Reporte de salud del sistema",
          responses: {
            "200": { description: "Estado del sistema", content: { "application/json": { schema: { type: "object" } } } },
          },
        },
      },
    },
  };

  return new Response(JSON.stringify(spec, null, 2), {
    headers: {
      "Content-Type": "application/openapi+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
