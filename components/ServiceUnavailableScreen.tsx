"use client";

import Image from "next/image";
import Link from "next/link";
import { Loader2, Mail, MessageCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { companyInfo } from "@/lib/company";
import { logoPath } from "@/lib/images";

interface ServiceUnavailableScreenProps {
  standalone?: boolean;
  onRetry?: () => void;
}

export default function ServiceUnavailableScreen({
  standalone = false,
  onRetry,
}: ServiceUnavailableScreenProps) {
  const [retrying, setRetrying] = useState(false);
  const phone = companyInfo.phones[0];
  const whatsappUrl = phone
    ? `${phone.whatsapp}?text=${encodeURIComponent(
        "Hola, necesito cotizar maquinaria de Fica Tostadores.",
      )}`
    : null;

  function handleRetry() {
    if (retrying) {
      return;
    }

    setRetrying(true);

    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }

    window.setTimeout(() => setRetrying(false), 4000);
  }

  return (
    <div
      className={`relative isolate flex w-full items-center overflow-hidden px-4 py-14 sm:px-6 lg:py-16 ${
        standalone ? "min-h-screen" : "min-h-[calc(100vh-72px)]"
      }`}
    >
      <div
        className="pointer-events-none absolute -right-32 top-1/2 -z-10 h-[34rem] w-[34rem] -translate-y-1/2 rounded-full bg-orange/[0.07] blur-3xl"
        aria-hidden="true"
      />

      <div className="mx-auto grid w-full max-w-[88rem] items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8 xl:grid-cols-[0.85fr_1.2fr]">
        <div>
          {standalone ? (
            <Link
              href="/"
              className="mb-8 inline-flex min-h-11 items-center"
              aria-label={companyInfo.brand}
            >
              <Image
                src={logoPath}
                alt={companyInfo.brand}
                width={180}
                height={44}
                className="h-9 w-auto"
                priority
              />
            </Link>
          ) : null}

          <p className="font-display text-[clamp(4rem,9vw,7rem)] uppercase leading-[0.9] tracking-tight text-white">
            503<span className="text-orange">-</span>
            <span className="text-orange">error</span>
          </p>

          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Servicio no disponible
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-relaxed text-steel-mid sm:text-base">
            Estamos monitoreando la situación y trabajando para restablecer el
            catálogo y la cotización lo antes posible. Intenta nuevamente en
            unos minutos.
          </p>

          <div className="mt-8 flex w-full max-w-md flex-col gap-3">
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-orange px-5 text-sm font-semibold text-white transition-colors hover:bg-orange-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange disabled:cursor-wait disabled:opacity-70"
            >
              {retrying ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="h-4 w-4" aria-hidden />
              )}
              {retrying ? "Reintentando…" : "Reintentar"}
            </button>

            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 py-2 text-sm font-medium text-steel-light transition-colors hover:text-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                WhatsApp
              </a>
            ) : null}
          </div>

          <div className="mt-6 w-full max-w-md border-t border-white/[0.06] pt-4">
            <p className="text-xs text-steel-dark">
              Si el problema persiste, escríbenos a
            </p>
            <a
              href={`mailto:${companyInfo.emailVentas}`}
              className="mt-1 inline-flex items-center gap-1.5 text-sm text-orange underline underline-offset-2 transition-colors hover:text-orange-hover"
            >
              <Mail className="h-4 w-4" aria-hidden />
              {companyInfo.emailVentas}
            </a>
          </div>
        </div>

        <div className="relative -mx-4 w-[calc(100%+2rem)] max-w-none sm:mx-0 sm:w-full sm:max-w-[46rem] lg:-mr-8 lg:max-w-none">
          <Image
            src="/images/general/maquinatriste-espejo.png"
            alt="Ilustración de un tostador Fica triste por el servicio fuera de línea"
            width={713}
            height={533}
            className="h-auto w-full"
            sizes="(max-width: 1024px) 100vw, 55vw"
            priority
          />
        </div>
      </div>
    </div>
  );
}
