import { NextResponse, type NextRequest } from "next/server";
import { buildContentSecurityPolicy } from "@/lib/csp";
import { electronCorsHeaders } from "@/lib/electron-cors";
import { isLocalDevMode } from "@/lib/local-dev/mode";
import { assertRateLimits, getRateLimitKey } from "@/lib/rate-limit";
import { estimateTokens, getAgentMarkdown } from "@/lib/agent-markdown";
import {
  STAFF_GATE_COOKIE,
  verifyStaffGateToken,
} from "@/lib/staff/gate-token";
import { getSiteMode } from "@/lib/site-mode";

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function applySecurityHeaders(
  response: Response,
  options: {
    nonce: string;
    strictTransport?: boolean;
    upgradeInsecureRequests?: boolean;
  },
) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set(
    "Content-Security-Policy",
    buildContentSecurityPolicy({
      nonce: options.nonce,
      upgradeInsecureRequests: options.upgradeInsecureRequests,
    }),
  );

  if (options.strictTransport) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
}

/** HSTS / upgrade-insecure solo en Vercel HTTPS, no en npm start por LAN. */
function getProductionSecurityOptions() {
  const onVercel = process.env.VERCEL === "1";
  const isProduction = process.env.NODE_ENV === "production";

  return {
    strictTransport: onVercel && isProduction,
    upgradeInsecureRequests: onVercel && isProduction,
  };
}

export async function middleware(request: NextRequest) {
  const nonce = generateNonce();
  const securityOptions = { ...getProductionSecurityOptions(), nonce };
  const { pathname } = request.nextUrl;

  // Sitio en construcción (configurable desde el panel admin): solo el staff
  // (cookie firmada) ve las páginas. El panel /admin queda siempre accesible
  // para poder iniciar sesión.
  const isAdminPath =
    pathname === "/admin" || pathname.startsWith("/admin/");
  const isApiPath = pathname === "/api" || pathname.startsWith("/api/");
  const isConstruccionPath = pathname === "/construccion";
  const isServiceScreenPath = pathname === "/servicio-no-disponible";
  const isCrawlerPath =
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/auth.md" ||
    pathname.startsWith("/.well-known/") ||
    pathname === "/opengraph-image" ||
    pathname === "/twitter-image";

  // Interruptor operativo: permite forzar la pantalla de servicio no disponible
  // (por ejemplo ante una cuota agotada de Firebase/Vercel) sin tocar el código.
  if (
    process.env.SERVICE_UNAVAILABLE === "1" &&
    !isAdminPath &&
    !isApiPath &&
    !isServiceScreenPath &&
    !isCrawlerPath
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/servicio-no-disponible";
    url.search = "";

    const rewriteHeaders = new Headers(request.headers);
    rewriteHeaders.set("x-nonce", nonce);
    rewriteHeaders.set("x-pathname", "/servicio-no-disponible");
    rewriteHeaders.set(
      "Content-Security-Policy",
      buildContentSecurityPolicy({
        nonce,
        upgradeInsecureRequests: securityOptions.upgradeInsecureRequests,
      }),
    );

    const response = NextResponse.rewrite(url, {
      request: { headers: rewriteHeaders },
    });

    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    applySecurityHeaders(response, securityOptions);
    return response;
  }

  if (
    !isAdminPath &&
    !isApiPath &&
    !isConstruccionPath &&
    !isServiceScreenPath &&
    !isCrawlerPath
  ) {
    const gateToken = request.cookies.get(STAFF_GATE_COOKIE)?.value;
    const staff = gateToken ? await verifyStaffGateToken(gateToken) : null;

    if (!staff && (await getSiteMode()) === "construction") {
      const url = request.nextUrl.clone();
      url.pathname = "/construccion";
      url.search = "";

      const rewriteHeaders = new Headers(request.headers);
      rewriteHeaders.set("x-nonce", nonce);
      // Conserva la ruta original para que metadata y layout sepan qué URL se
      // pidió (p. ej. la home "/") aunque se sirva la pantalla "Muy pronto".
      rewriteHeaders.set("x-pathname", pathname);
      rewriteHeaders.set(
        "Content-Security-Policy",
        buildContentSecurityPolicy({
          nonce,
          upgradeInsecureRequests: securityOptions.upgradeInsecureRequests,
        }),
      );

      const response = NextResponse.rewrite(url, {
        request: { headers: rewriteHeaders },
      });

      // "Muy pronto" sigue bloqueado salvo la home, que se indexa para que
      // Google asocie la marca al dominio mientras dure la construcción.
      if (pathname !== "/") {
        response.headers.set("X-Robots-Tag", "noindex, nofollow");
      }
      applySecurityHeaders(response, securityOptions);
      return response;
    }
  }

  // Markdown for Agents: si el cliente pide text/markdown (y no HTML),
  // respondemos una versión en markdown de las páginas principales.
  const accept = request.headers.get("accept") ?? "";
  if (
    request.method === "GET" &&
    /text\/markdown/i.test(accept) &&
    !/text\/html/i.test(accept)
  ) {
    const markdown = getAgentMarkdown(pathname);
    if (markdown) {
      const response = new Response(markdown, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          Vary: "Accept",
          "x-markdown-tokens": String(estimateTokens(markdown)),
        },
      });
      applySecurityHeaders(response, securityOptions);
      return response;
    }
  }

  if (pathname.startsWith("/api/") && !isLocalDevMode()) {
    const isElectronRoute = pathname.startsWith("/api/electron/");

    // Preflight CORS — las rutas /api/electron/* necesitan headers CORS
    // para que la app de escritorio (Tauri webview) pueda leer la respuesta.
    if (request.method === "OPTIONS") {
      const response = isElectronRoute
        ? new NextResponse(null, {
            status: 204,
            headers: electronCorsHeaders(),
          })
        : NextResponse.next();
      applySecurityHeaders(response, securityOptions);
      return response;
    }

    const ip = getClientIp(request);
    const { keys, config } = getRateLimitKey(ip, pathname, request.method);

    try {
      const result = await assertRateLimits(keys, config);

      if (!result.ok) {
        const response = NextResponse.json(
          {
            error:
              "Demasiadas solicitudes. Intente de nuevo en unos segundos.",
          },
          { status: 429 },
        );

        if (result.retryAfterSeconds) {
          response.headers.set(
            "Retry-After",
            String(result.retryAfterSeconds),
          );
        }

        // CORS para que la app Tauri pueda leer el body del 429.
        if (isElectronRoute) {
          response.headers.set("Access-Control-Allow-Origin", "*");
        }

        applySecurityHeaders(response, securityOptions);
        return response;
      }
    } catch (error) {
      // Fail-open: si el rate-limiter lanza excepción (cuota Upstash agotada,
      // error de red, etc.) dejamos pasar la solicitud para no bloquear la web.
      console.error(
        "[middleware] rate-limit falló; dejando pasar (fail-open):",
        error,
      );
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set(
    "Content-Security-Policy",
    buildContentSecurityPolicy({
      nonce,
      upgradeInsecureRequests: securityOptions.upgradeInsecureRequests,
    }),
  );

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("Vary", "Accept");

  if (
    pathname.startsWith("/admin") ||
    pathname === "/construccion" ||
    pathname === "/servicio-no-disponible"
  ) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  applySecurityHeaders(response, securityOptions);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|__/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
