"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";
import { TERMS_ACCEPTED_STORAGE_KEY } from "@/lib/legal";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
const TERMS_ACCEPTED_EVENT = "fica:terms-accepted";

function hasAcceptedTerms(): boolean {
  try {
    return window.localStorage.getItem(TERMS_ACCEPTED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(TERMS_ACCEPTED_EVENT, onChange);
  window.addEventListener("storage", onChange);

  return () => {
    window.removeEventListener(TERMS_ACCEPTED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): boolean {
  return hasAcceptedTerms();
}

function getServerSnapshot(): boolean {
  return false;
}

export default function GoogleAnalytics({ nonce }: { nonce?: string }) {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!GA_MEASUREMENT_ID || !enabled) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="lazyOnload"
        nonce={nonce}
      />
      <Script
        id="ga4-config"
        strategy="lazyOnload"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');
`,
        }}
      />
    </>
  );
}
