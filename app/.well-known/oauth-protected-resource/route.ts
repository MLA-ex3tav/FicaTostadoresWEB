import { SITE_URL } from "@/lib/seo";

/**
 * OAuth 2.0 Protected Resource Metadata (RFC 9728).
 *
 * La zona de cliente (cotizaciones y solicitudes del usuario) se autentica con
 * Google (OIDC). Las APIs internas de administración usan un secreto
 * compartido y no se exponen aquí.
 */
export const dynamic = "force-static";

export function GET() {
  const base = SITE_URL.replace(/\/$/, "");

  const metadata = {
    resource: `${base}/api`,
    authorization_servers: ["https://accounts.google.com"],
    scopes_supported: ["openid", "email", "profile"],
    bearer_methods_supported: ["header"],
    resource_name: "Fica Tostadores",
    resource_documentation: `${base}/auth.md`,
  };

  return new Response(JSON.stringify(metadata, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
