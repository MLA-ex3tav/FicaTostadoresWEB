import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Suspense } from "react";
import GranoDecor from "@/components/GranoDecor";
import TechnicalServiceForm from "@/components/TechnicalServiceForm";
import Reveal from "@/components/motion/Reveal";

import type { CatalogConfig } from "@/lib/catalog-config";
import type { Product } from "@/lib/products";

function TechnicalServiceFormFallback() {
  return (
    <div
      className="h-[32rem] animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02]"
      role="status"
    />
  );
}

interface TechnicalServicePageProps {
  products: Product[];
  catalogConfig: CatalogConfig;
}

export default function TechnicalServicePage({
  products,
  catalogConfig,
}: TechnicalServicePageProps) {

  return (
    <main className="relative isolate min-h-screen overflow-hidden py-10 md:py-16">
      <GranoDecor
        variant="grano2"
        className="right-0 top-20 w-20 -rotate-12 sm:w-32"
        opacity={0.08}
      />
      <GranoDecor
        variant="grano"
        className="left-[4%] top-1/3 hidden w-32 rotate-12 lg:block"
        opacity={0.07}
      />
      <GranoDecor
        variant="grano2"
        className="bottom-10 left-2 w-20 rotate-45 sm:w-24"
        opacity={0.05}
      />

      <div className="mx-auto max-w-6xl px-4 md:px-6">
        {/* Navegación superior volver */}
        <Reveal>
          <Link
            href="/"
            className="group mb-8 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-steel-dark transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Volver al inicio
          </Link>
        </Reveal>

        {/* Encabezado */}
        <Reveal>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Soporte <span className="text-orange">técnico</span> y mantención
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-steel-mid sm:text-base">
            Cuéntanos qué equipo utilizas y qué asistencia necesitas. La
            solicitud llega directamente a nuestro equipo técnico.
          </p>
        </Reveal>

        {/* Formulario técnico centrado */}
        <div className="mt-8 md:mt-10">
          <div className="mx-auto max-w-3xl">
            <Reveal delay={0.08}>
              <Suspense fallback={<TechnicalServiceFormFallback />}>
                <TechnicalServiceForm
                  products={products}
                  catalogConfig={catalogConfig}
                />
              </Suspense>
            </Reveal>
          </div>
        </div>
      </div>
    </main>
  );
}
