"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  FileText,
  Mail,
  MessageSquare,
  Send,
  ShoppingBag,
  X,
} from "lucide-react";
import ContactForm from "@/components/ContactForm";
import GranoDecor from "@/components/GranoDecor";
import type { Product } from "@/lib/products";
import { getProductImageSrc } from "@/lib/product-images";
import { buildQuoteWhatsAppUrl, openWhatsAppContact } from "@/lib/quoting";
import { useQuoteSelection } from "@/lib/quote-selection";

interface QuotePageContentProps {
  products?: Product[];
  heading?: string;
}

export default function QuotePageContent({
  products = [],
  heading = "Solicitar cotización",
}: QuotePageContentProps) {
  const { products: quoteProducts, removeProduct, updateQuantity } = useQuoteSelection();
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null);
  const [submittedWaUrl, setSubmittedWaUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const productCount = quoteProducts.length;

  const formattedProductsForWa = quoteProducts.map((item) => ({
    name: item.name,
    capacity: item.capacity,
    quantity: item.quantity ?? 1,
    selectedColor: item.selectedColor ?? undefined,
    selectedColorId: item.selectedColorId ?? undefined,
    selectedAddOns: item.selectedAddOns?.map((addOn) => ({
      id: addOn.id,
      name: addOn.name,
    })),
  }));

  const handleWhatsAppQuote = () => {
    const url = buildQuoteWhatsAppUrl(
      "Cliente Web",
      "",
      "Hola Fica Tostadores, me gustaría cotizar oficialmente estos equipos:",
      formattedProductsForWa,
    );
    openWhatsAppContact(url);
  };

  if (submittedRequestId) {
    const folio =
      submittedRequestId === "solicitud-registrada" ? null : submittedRequestId;

    const nextSteps = [
      {
        title: "Revisión técnica",
        detail:
          "Validamos el equipo, la capacidad y los accesorios que seleccionaste.",
      },
      {
        title: "Propuesta formal",
        detail:
          "Te enviamos la cotización por correo con especificaciones y ficha técnica.",
      },
      {
        title: "Coordinación",
        detail:
          "Acordamos plazos de fabricación, despacho y puesta en marcha.",
      },
    ];

    return (
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 md:py-20">
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.06] lg:grid-cols-[1.1fr_0.9fr]">
          {/* Columna principal */}
          <div className="bg-panel p-7 sm:p-10 md:p-12">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-orange/30 bg-orange/10 text-orange">
                <CheckCircle2 className="h-4 w-4" strokeWidth={2.25} />
              </span>
              <span className="text-sm font-medium text-orange">
                Solicitud recibida
              </span>
            </div>

            <h1 className="mt-6 font-display text-3xl leading-[1.05] tracking-tight text-steel-light sm:text-4xl md:text-[2.75rem]">
              Solicitud de cotización enviada
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-steel-mid sm:text-base">
              Registramos tu requerimiento. Nuestro equipo técnico y comercial
              evaluará la configuración y preparará la propuesta directa de
              fábrica.
            </p>

            {folio ? (
              <div className="mt-8 flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                <span className="text-xs font-medium text-steel-mid">
                  Folio
                </span>
                <span className="font-mono text-sm font-medium text-steel-light">
                  {folio}
                </span>
              </div>
            ) : null}

            <ol className="mt-10 space-y-5 border-t border-white/[0.06] pt-8">
              {nextSteps.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/[0.12] font-mono text-xs text-steel-dark">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-steel-light">
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-steel-mid">
                      {step.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Columna de acciones */}
          <div className="flex flex-col bg-surface p-7 sm:p-10 md:p-12">
            <h2 className="text-sm font-semibold text-steel-light">
              ¿Quieres avanzar ahora?
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-steel-mid">
              Sigue el estado de tu solicitud o conversa con el equipo por
              WhatsApp para resolver dudas de inmediato.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/mis-solicitudes"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-orange px-6 text-sm font-semibold text-white transition-colors hover:bg-orange-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
              >
                <FileText className="h-4 w-4" />
                Ir a mis solicitudes
              </Link>

              <button
                type="button"
                onClick={() => {
                  if (submittedWaUrl) {
                    openWhatsAppContact(submittedWaUrl);
                  } else {
                    handleWhatsAppQuote();
                  }
                }}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 text-sm font-semibold text-[#0c0e12] transition-colors hover:bg-[#20bd5a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]"
              >
                <MessageSquare className="h-4 w-4" />
                Continuar por WhatsApp
              </button>
            </div>

            <div className="mt-8 flex items-start gap-3 border-t border-white/[0.06] pt-6">
              <Mail
                className="mt-0.5 h-4 w-4 shrink-0 text-steel-dark"
                aria-hidden
              />
              <p className="text-xs leading-relaxed text-steel-dark">
                La propuesta formal llega a tu correo. Si no la ves, revisa{" "}
                <span className="font-medium text-steel-mid">spam</span> o{" "}
                <span className="font-medium text-steel-mid">
                  correo no deseado
                </span>
                .
              </p>
            </div>

            <div className="mt-auto flex items-center gap-4 pt-8 text-xs">
              <Link
                href="/productos"
                className="inline-flex min-h-11 items-center gap-1 font-medium text-orange transition-colors hover:text-orange-hover focus-visible:underline focus-visible:underline-offset-4"
                style={{ border: "none", outline: "none", boxShadow: "none", background: "transparent" }}
              >
                Ver más productos
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <span className="text-white/15">·</span>
              <button
                type="button"
                onClick={() => {
                  setSubmittedRequestId(null);
                  setSubmittedWaUrl(null);
                  setSubmitError("");
                  setIsSubmitting(false);
                }}
                className="font-medium text-steel-mid transition-colors hover:text-white"
              >
                Crear otra cotización
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate mx-auto max-w-6xl overflow-x-clip px-4 py-10 md:px-6 md:py-16">
      <GranoDecor
        variant="grano"
        className="right-0 top-10 w-24 -rotate-12 sm:w-36"
        opacity={0.1}
      />
      <GranoDecor
        variant="grano2"
        className="bottom-8 right-[6%] w-24 -rotate-45 sm:w-32"
        opacity={0.06}
      />
      <GranoDecor
        variant="grano2"
        className="left-0 top-1/2 hidden w-20 rotate-12 lg:block"
        opacity={0.05}
      />

      {/* Header Limpio y Minimalista */}
      <div className="mb-10">
        <Link
          href="/productos"
          className="group mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-orange transition-colors hover:text-orange-hover focus-visible:underline focus-visible:underline-offset-4"
          style={{ border: "none", outline: "none", boxShadow: "none", background: "transparent" }}
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Volver al catálogo
        </Link>

        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {heading}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-steel-mid sm:text-base">
          Revisa la maquinaria seleccionada y déjanos tus datos de contacto para enviarte la propuesta técnica y comercial directa de fábrica.
        </p>
      </div>

      {/* Layout de 2 Columnas Simplificado */}
      <div
        className={`grid grid-cols-1 gap-10 ${
          productCount > 0 ? "lg:grid-cols-12 lg:gap-12" : "mx-auto max-w-3xl"
        }`}
      >
        {/* Columna Izquierda: Lista de Equipos y Formulario (7 columnas) */}
        <div className={`space-y-8 ${productCount > 0 ? "lg:col-span-7" : ""}`}>
          {/* SECCIÓN 1: EQUIPOS SELECCIONADOS */}
          <section className="space-y-4">
            {productCount > 0 ? (
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <span>Equipos en tu cotización</span>
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/[0.08] px-2 text-xs font-medium text-steel-light">
                    {productCount}
                  </span>
                </h2>

                <Link
                  href="/productos"
                  className="min-h-11 shrink-0 px-2 text-xs text-steel-dark hover:text-white transition-colors"
                >
                  + Agregar otro
                </Link>
              </div>
            ) : null}

            {/* Empty State */}
            {productCount === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.01] p-8 text-center sm:p-12">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] text-steel-dark mb-4">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  No hay equipos seleccionados
                </h3>
                <p className="mt-1 text-sm text-steel-mid max-w-sm mx-auto">
                  Selecciona la maquinaria de tu interés desde nuestro catálogo o déjanos un mensaje con lo que necesitas.
                </p>
                <Link
                  href="/productos"
                  className="mt-6 inline-flex h-11 items-center gap-2 rounded-md bg-orange px-6 text-sm font-semibold text-white transition-colors hover:bg-orange-hover"
                >
                  Explorar catálogo
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {quoteProducts.map((item) => {
                  const matchedProduct = products.find((p) => p.id === item.id);
                  const imageSrc =
                    item.image ??
                    (matchedProduct
                      ? getProductImageSrc(matchedProduct.images?.[0])
                      : null);

                  return (
                    <li
                      key={item.id}
                      className="group relative flex items-start justify-between gap-3 rounded-md border border-white/[0.08] p-4 transition-colors hover:bg-white/[0.03] sm:items-center sm:gap-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 min-w-0 flex-1">
                        {/* Thumbnail */}
                        <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-xl bg-white/[0.04] border border-white/[0.06]">
                          {imageSrc ? (
                            <Image
                              src={imageSrc}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-steel-dark">
                              <FileText className="h-5 w-5 opacity-40" />
                            </div>
                          )}
                        </div>

                        {/* Detalles */}
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-white break-words">
                            {item.name}
                          </h3>
                          <p className="text-xs text-steel-mid break-words">
                            {item.capacity}
                            {item.selectedColor ? ` · Color: ${item.selectedColor}` : ""}
                            {item.variacionName ? ` · ${item.variacionName}` : ""}
                          </p>
                          {item.selectedAddOns && item.selectedAddOns.length > 0 ? (
                            <p className="text-xs text-steel-dark break-words mt-0.5">
                              + {item.selectedAddOns.map((a) => a.name).join(", ")}
                            </p>
                          ) : null}

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-steel-dark">
                              Cantidad
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, (item.quantity ?? 1) - 1)}
                                disabled={(item.quantity ?? 1) <= 1}
                                className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-md border border-white/[0.08] text-lg text-steel-light transition-colors hover:border-white/20 hover:text-white disabled:opacity-40 disabled:hover:border-white/[0.08] disabled:hover:text-steel-light"
                                aria-label={`Disminuir cantidad de ${item.name}`}
                              >
                                −
                              </button>
                              <span className="min-w-8 text-center text-sm font-semibold text-white tabular-nums">
                                {item.quantity ?? 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, (item.quantity ?? 1) + 1)}
                                className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-md border border-white/[0.08] text-lg text-steel-light transition-colors hover:border-white/20 hover:text-white"
                                aria-label={`Aumentar cantidad de ${item.name}`}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeProduct(item.id)}
                        className="flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-lg border border-white/[0.06] text-steel-dark transition-colors hover:border-white/20 hover:text-white shrink-0"
                        aria-label={`Quitar ${item.name}`}
                        title="Quitar de cotización"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* SECCIÓN 2: FORMULARIO DE DATOS */}
          <section className="space-y-4">
            <h2 className="text-base font-semibold text-white border-b border-white/[0.06] pb-3">
              Datos de contacto
            </h2>

            <Suspense
              fallback={
                <div className="h-80 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02]" />
              }
            >
              <ContactForm
                formId="solicitud-cotizacion-form"
                hideSubmitButton={productCount > 0}
                onSubmittingChange={setIsSubmitting}
                onErrorChange={setSubmitError}
                onSuccess={(id, waUrl) => {
                  setSubmittedRequestId(id || "solicitud-registrada");
                  if (waUrl) setSubmittedWaUrl(waUrl);
                }}
              />
            </Suspense>
          </section>
        </div>

        {/* Columna Derecha: Resumen Minimalista (5 columnas) */}
        {productCount > 0 ? (
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24 space-y-6">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-7 space-y-5">
                <h2 className="text-base font-semibold text-white border-b border-white/[0.06] pb-3">
                  Resumen
                </h2>

                {/* Lista compacta de items */}
                <div className="space-y-2">
                  <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {quoteProducts.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="text-steel-light truncate">
                          {(p.quantity ?? 1) > 1 ? `${p.quantity}× ` : ""}
                          {p.name}
                        </span>
                        <span className="shrink-0 text-steel-dark">
                          {p.capacity}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Botón Principal de Envío */}
                <div className="pt-2 space-y-3">
                  <button
                    type="submit"
                    form="solicitud-cotizacion-form"
                    disabled={isSubmitting}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-orange px-4 text-sm font-semibold text-white transition-colors hover:bg-orange-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Enviar solicitud de cotización
                      </>
                    )}
                  </button>

                  {submitError ? (
                    <p className="text-center text-xs text-red-400">{submitError}</p>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleWhatsAppQuote}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-white/[0.08] px-4 text-sm font-medium text-steel-light transition-colors hover:border-orange hover:bg-white/[0.04]"
                  >
                    <MessageSquare className="h-4 w-4 text-emerald-400" />
                    O cotizar directo por WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
