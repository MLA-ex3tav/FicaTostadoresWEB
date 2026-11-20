import { SITE_URL } from "@/lib/seo";

/** auth.md — instrucciones de autenticación/registro para agentes. */
export const dynamic = "force-static";

export function GET() {
  const base = SITE_URL.replace(/\/$/, "");

  const body = `# Autenticación para agentes — Fica Tostadores

## Registro automático
Actualmente **no ofrecemos registro automático de agentes**. No existe un endpoint
de \`register_uri\` para crear credenciales de forma autónoma.

## Acceso a la API pública (sin autenticación)
Los siguientes endpoints son de solo lectura y no requieren credenciales:

- \`GET ${base}/api/products\` — catálogo de productos
- \`GET ${base}/api/products/{id}\` — detalle de un producto
- \`GET ${base}/api/catalog-config\` — configuración de catálogos y categorías
- \`GET ${base}/api/health\` — estado del sistema

Descripción OpenAPI: ${base}/api/openapi
Catálogo de API: ${base}/.well-known/api-catalog

## Acceso a recursos protegidos
Las operaciones de escritura (crear cotizaciones, gestión de catálogo, tareas de
administración) **requieren autorización previa**. Para solicitar acceso, contacte
al equipo:

- Correo: tostadoresfica@gmail.com
- Ventas: ventas@tostadoresfica.cl

## Metadatos de recursos protegidos
- ${base}/.well-known/oauth-protected-resource
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
