import type { Metadata, Viewport } from "next";
import { Inter, Petrona } from "next/font/google";
import { cookies, headers } from "next/headers";
import ConstruccionScreen from "@/components/ConstruccionScreen";
import StaffGateWatcher from "@/components/StaffGateWatcher";
import Footer from "@/components/Footer";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import MainWithQuotePadding from "@/components/MainWithQuotePadding";
import Navbar from "@/components/Navbar";
import QuoteSelectionSidebar from "@/components/QuoteSelectionSidebar";
import AppProviders from "@/components/providers/AppProviders";
import { companyInfo } from "@/lib/company";
import { QuoteSelectionProvider } from "@/lib/quote-selection";
import PageLoadingBar from "@/components/PageLoadingBar";
import TermsConsentBanner from "@/components/TermsConsentBanner";
import WhatsAppFloatButton from "@/components/WhatsAppFloatButton";
import WebMcpTools from "@/components/WebMcpTools";
import Script from "next/script";
import "./globals.css";
import { cn } from "@/lib/utils";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_NAME, SITE_URL } from "@/lib/seo";
import {
  STAFF_GATE_COOKIE,
  verifyStaffGateToken,
} from "@/lib/staff/gate-token";
import { getSiteMode } from "@/lib/site-mode";

const siteUrl = SITE_URL;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#121110",
};

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const petrona = Petrona({
  variable: "--font-petrona",
  subsets: ["latin"],
  weight: "variable",
});

const baseMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "tostadores de café",
    "tostador industrial",
    "tostador comercial",
    "maquinaria de tostado",
    "tostadores TLC",
    "molinos de café",
    "Fica Tostadores",
    "Chile",
  ],
  authors: [{ name: companyInfo.legalName }],
  creator: companyInfo.legalName,
  publisher: companyInfo.legalName,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: "/",
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: { url: "/icon.png", type: "image/png", sizes: "407x407" },
    apple: "/icon.png",
  },
};

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export async function generateMetadata(): Promise<Metadata> {
  const pathname = (await headers()).get("x-pathname") ?? "";

  if (isAdminPath(pathname)) {
    return baseMetadata;
  }

  const cookie = (await cookies()).get(STAFF_GATE_COOKIE)?.value;

  if (cookie) {
    return baseMetadata;
  }

  if ((await getSiteMode()) === "live") {
    return baseMetadata;
  }

  // Durante la construcción solo se indexa la home; el resto sigue bloqueado
  // para no publicar URLs que aún no tienen su contenido definitivo.
  if (pathname === "/" || pathname === "") {
    return baseMetadata;
  }

  return {
    ...baseMetadata,
    title: "Muy pronto | Fica Tostadores",
    robots: { index: false, follow: false },
  };
}

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: companyInfo.legalName,
  alternateName: companyInfo.brand,
  url: siteUrl,
  logo: `${siteUrl}/icon.png`,
  email: companyInfo.email,
  telephone: companyInfo.phoneE164,
  address: {
    "@type": "PostalAddress",
    streetAddress: "Ruta Huichahue Km. 20",
    addressLocality: "Padre Las Casas",
    addressRegion: "La Araucanía",
    addressCountry: "CL",
  },
  sameAs: [
    companyInfo.social.instagram,
    companyInfo.social.facebook,
    companyInfo.social.youtube,
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const nonce = requestHeaders.get("x-nonce") ?? undefined;
  const pathname = requestHeaders.get("x-pathname") ?? "";

  const isConstruccionScreen = pathname === "/construccion";
  const isServiceScreen = pathname === "/servicio-no-disponible";

  if (isConstruccionScreen) {
    return (
      <html
        lang="es"
        className={cn("dark h-full", inter.variable, petrona.variable)}
      >
        <body className="min-h-full antialiased">
          <Script
            type="application/ld+json"
            id="organization-jsonld"
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(organizationJsonLd),
            }}
          />
          <GoogleAnalytics nonce={nonce} />
          <AppProviders>
            <StaffGateWatcher />
            <ConstruccionScreen />
          </AppProviders>
        </body>
      </html>
    );
  }

  if (isAdminPath(pathname)) {
    return (
      <html
        lang="es"
        className={cn("dark h-full", inter.variable, petrona.variable)}
      >
        <body className="min-h-full antialiased">
          <AppProviders>
            <PageLoadingBar />
            {children}
          </AppProviders>
        </body>
      </html>
    );
  }

  const cookie = (await cookies()).get(STAFF_GATE_COOKIE)?.value;
  const staffSession = cookie ? await verifyStaffGateToken(cookie) : null;

  if (
    !isServiceScreen &&
    !staffSession &&
    (await getSiteMode()) === "construction"
  ) {
    return (
      <html
        lang="es"
        className={cn("dark h-full", inter.variable, petrona.variable)}
      >
        <body className="min-h-full antialiased">
          <Script
            type="application/ld+json"
            id="organization-jsonld"
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(organizationJsonLd),
            }}
          />
          <GoogleAnalytics nonce={nonce} />
          <AppProviders>
            <StaffGateWatcher />
            <ConstruccionScreen />
          </AppProviders>
        </body>
      </html>
    );
  }  return (
    <html
      lang="es"
      className={cn("dark h-full", inter.variable, petrona.variable)}
    >
      <body className="flex min-h-full flex-col antialiased">
        <Script
          type="application/ld+json"
          id="organization-jsonld"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <GoogleAnalytics nonce={nonce} />
        <AppProviders>
          <QuoteSelectionProvider>
            <PageLoadingBar />
            <TermsConsentBanner />
            <Navbar />
            <QuoteSelectionSidebar />
            <MainWithQuotePadding>{children}</MainWithQuotePadding>
            {isServiceScreen ? null : <Footer />}
            {isServiceScreen ? null : <WhatsAppFloatButton />}
            <WebMcpTools />
          </QuoteSelectionProvider>
        </AppProviders>
      </body>
    </html>
  );
}
