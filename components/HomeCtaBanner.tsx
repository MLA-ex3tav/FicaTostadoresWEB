"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import GranoDecor from "@/components/GranoDecor";
import Reveal from "@/components/motion/Reveal";

export default function HomeCtaBanner() {
  return (
    <section className="relative isolate overflow-hidden border-t border-white/[0.06] py-16 md:py-24">
      <GranoDecor
        variant="grano2"
        className="right-[4%] top-1/2 hidden w-64 -translate-y-1/2 rotate-12 md:block lg:w-80"
        opacity={0.1}
      />
      <GranoDecor
        variant="grano"
        className="bottom-8 right-[38%] hidden w-20 -rotate-12 md:block"
        opacity={0.07}
      />
      <GranoDecor
        variant="grano"
        className="bottom-4 right-[12%] hidden w-14 rotate-45 md:block"
        opacity={0.05}
      />

      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Encuentra el equipo para tu producción
          </h2>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-steel-mid">Selecciona los equipos que necesitas y solicita una cotización a nuestro equipo.</p>
          <div className="pt-8 flex items-center">
            <Link
              href="/cotizar"
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-3 rounded-full bg-orange px-6 text-sm font-semibold text-white transition-colors hover:bg-orange-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange"
            >
              Solicitar cotización
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="pt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-steel-mid">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-steel-dark" />
              Garantía de 2 años en estructura y tambor
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-steel-dark" />
              Repuestos 100% disponibles en Chile
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
