import { SITE_URL } from "@/lib/seo";

/**
 * robots.txt con directivas Content-Signal (contentsignals.org) para declarar
 * las preferencias de uso del contenido por parte de agentes de IA.
 */
export const dynamic = "force-static";

export function GET() {
  const base = SITE_URL.replace(/\/$/, "");

  const body = [
    "User-Agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /api",
    "Disallow: /perfil",
    "Disallow: /mis-solicitudes",
    "Disallow: /iniciar-sesion",
    "Disallow: /registro",
    "",
    "# Preferencias de uso de contenido (Content Signals)",
    "# ai-train=no (no entrenar con el contenido), search=yes (indexar en buscadores),",
    "# ai-input=yes (permitir uso en respuestas de asistentes con atribución).",
    "Content-Signal: ai-train=no, search=yes, ai-input=yes",
    "",
    `Host: ${base}`,
    `Sitemap: ${base}/sitemap.xml`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
