import os from "os";
import type { NextConfig } from "next";
import { getBlobStoreHostname } from "@/lib/blob-storage";

const extraDevOrigins =
  process.env.EXTRA_DEV_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

function isIPv4Address(family: string | number): boolean {
  return family === "IPv4" || family === 4;
}

function getLocalNetworkDevOrigins(): string[] {
  if (process.env.NODE_ENV !== "development") {
    return [];
  }

  const origins = new Set<string>();

  for (const addresses of Object.values(os.networkInterfaces())) {
    if (!addresses) {
      continue;
    }

    for (const address of addresses) {
      if (isIPv4Address(address.family) && !address.internal) {
        origins.add(address.address);
      }
    }
  }

  return [...origins];
}

const blobHostname = getBlobStoreHostname();

const imageRemotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] =
  [];

if (blobHostname) {
  imageRemotePatterns.push({
    protocol: "https",
    hostname: blobHostname,
    port: "",
    pathname: "/**",
  });
}

imageRemotePatterns.push({
  protocol: "https",
  hostname: "*.public.blob.vercel-storage.com",
  port: "",
  pathname: "/**",
});

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "firebase-admin"],
  turbopack: {
    resolveAlias: {
      "../build/polyfills/polyfill-module": "./lib/empty-module.ts",
      "next/dist/build/polyfills/polyfill-module": "./lib/empty-module.ts",
    },
  },
  experimental: {
    inlineCss: true,
  },
  env: {
    NEXT_PUBLIC_BLOB_STORE_ID: process.env.BLOB_STORE_ID,
  },
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    ...getLocalNetworkDevOrigins(),
    ...extraDevOrigins,
  ],
  async rewrites() {
    // Proxy transparente del handler de Firebase Auth para usar el dominio
    // propio (authDomain = www.tostadoresfica.cl) sin cambiar DNS.
    return [
      {
        source: "/__/auth/:path*",
        destination: "https://fica-tostadores.firebaseapp.com/__/auth/:path*",
      },
    ];
  },
  async headers() {
    // Link headers (RFC 8288) para descubrimiento por agentes.
    const linkValue = [
      '</.well-known/api-catalog>; rel="api-catalog"',
      '</.well-known/ai-catalog.json>; rel="ai-catalog"',
      '</.well-known/agent-skills/index.json>; rel="agent-skills"',
      '</api/openapi>; rel="service-desc"; type="application/openapi+json"',
      '</llms.txt>; rel="describedby"; type="text/markdown"',
      '</sitemap.xml>; rel="sitemap"',
    ].join(", ");

    return [
      {
        source: "/",
        headers: [{ key: "Link", value: linkValue }],
      },
    ];
  },
  images: {
    qualities: [75, 80],
    localPatterns: [
      {
        pathname: "/images/**",
      },
      {
        pathname: "/uploads/**",
      },
    ],
    remotePatterns: imageRemotePatterns,
  },
};

export default nextConfig;
