export function buildContentSecurityPolicy(options: {
  nonce: string;
  upgradeInsecureRequests?: boolean;
}): string {
  const isDev = process.env.NODE_ENV !== "production";

  // Nonce + strict-dynamic: los scripts inline de Next.js llevan el nonce y los
  // scripts que ellos cargan (Firebase, GIS de Google, etc.) quedan permitidos.
  // En CSP3 se ignora 'unsafe-inline' y las listas de hosts; las dejamos solo
  // como respaldo para navegadores antiguos (CSP2).
  const scriptSrc = [
    "'self'",
    `'nonce-${options.nonce}'`,
    "'strict-dynamic'",
    "https://apis.google.com",
    "https://accounts.google.com",
    "https://www.gstatic.com",
    "https://*.firebaseapp.com",
    "https://www.googletagmanager.com",
    "https://vercel.live",
    ...(isDev ? ["'unsafe-eval'"] : []),
  ];

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://lh3.googleusercontent.com https://www.gstatic.com https://*.google.com https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://vercel.live https://vercel.live/",
    "font-src 'self' data: https://fonts.gstatic.com https://vercel.live",
    "connect-src 'self' https://*.googleapis.com https://apis.google.com https://www.gstatic.com https://accounts.google.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://vercel.live wss://ws.vercel.live wss://*.firebaseio.com",
    "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com https://*.google.com https://vercel.live",
  ];

  if (options.upgradeInsecureRequests) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}
