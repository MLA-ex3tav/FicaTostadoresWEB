"use client";

import { Flame, Truck, Wrench, type LucideIcon } from "lucide-react";
import GranoDecor from "@/components/GranoDecor";
import Reveal from "@/components/motion/Reveal";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import SectionHeader from "@/components/SectionHeader";

const STEPS: {
  title: string;
  subtitle: string;
  description: string;
  Icon: LucideIcon;
}[] = [
  {
    title: "Asesoría & Configuración",
    subtitle: "Definición del proyecto",
    description:
      "Evaluamos la capacidad necesaria para tu negocio y configuramos el tipo de gas, voltaje, acabados de color y accesorios opcionales.",
    Icon: Flame,
  },
  {
    title: "Fabricación",
    subtitle: "IX Región, Chile",
    description:
      "Construimos tu equipo en acero inoxidable 304 con corte de precisión, soldaduras sanitarias y sistemas de control de temperatura.",
    Icon: Wrench,
  },
  {
    title: "Entrega & Puesta en Marcha",
    subtitle: "Garantía de 2 Años",
    description:
      "Entregamos tu tostador listo para operar, con capacitación en perfilado de tueste y respaldo técnico directo de fábrica.",
    Icon: Truck,
  },
];

export default function HomeProcessSection() {
  return (
    <section className="relative isolate mx-auto max-w-6xl overflow-hidden px-4 py-16 md:px-6 md:py-24">
      <GranoDecor
        variant="grano"
        className="right-0 top-6 w-28 rotate-12 sm:w-40"
        opacity={0.1}
      />
      <GranoDecor
        variant="grano2"
        className="bottom-6 right-1/4 w-20 -rotate-12 sm:w-28"
        opacity={0.07}
      />
      <GranoDecor
        variant="grano2"
        className="bottom-2 left-0 w-16 rotate-45 sm:w-24"
        opacity={0.05}
      />

      <Reveal>
        <SectionHeader
          title={
            <>
              De nuestra fábrica a tu planta
            </>
          }
          description="Acompañamos tu proyecto desde la ingeniería inicial hasta la producción continua."
        />
      </Reveal>

      <Stagger className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <StaggerItem
            key={step.title}
            className="border-t border-white/15 pt-6 md:pr-6"
          >
            <div className="mb-6 flex items-center justify-between text-steel-dark">
              <span className="text-xs tabular-nums">0{index + 1}</span>
              <step.Icon className="h-5 w-5 text-steel-mid" strokeWidth={1.5} />
            </div>

            <h3 className="text-lg font-semibold text-white">
              {step.title}
            </h3>
            <p className="mt-1 text-xs font-medium text-orange">
              {step.subtitle}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-steel-mid">
              {step.description}
            </p>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
