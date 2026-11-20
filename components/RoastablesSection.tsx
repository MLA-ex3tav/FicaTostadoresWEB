"use client";

import {
  Bean,
  Coffee,
  Flame,
  Nut,
  Sprout,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import GranoDecor from "@/components/GranoDecor";
import Reveal from "@/components/motion/Reveal";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import SectionHeader from "@/components/SectionHeader";

const roastables: { name: string; subtitle: string; Icon: LucideIcon }[] = [
  { name: "Café", subtitle: "Verde y especialidad", Icon: Coffee },
  { name: "Cacao", subtitle: "Grano y nibs", Icon: Bean },
  { name: "Frutos secos", subtitle: "Maní y almendras", Icon: Nut },
  { name: "Granos & cereales", subtitle: "Trigo y cebada", Icon: Wheat },
  { name: "Semillas", subtitle: "Girasol y sésamo", Icon: Sprout },
  { name: "Especias", subtitle: "Tueste aromático", Icon: Flame },
];

export default function RoastablesSection() {
  return (
    <section className="relative isolate mx-auto max-w-6xl overflow-hidden px-4 py-16 md:px-6 md:py-24">
      <GranoDecor
        variant="grano2"
        className="right-2 top-8 w-24 -rotate-12 sm:w-36"
        opacity={0.1}
      />
      <GranoDecor
        variant="grano"
        className="bottom-8 left-4 w-16 rotate-45 sm:w-24"
        opacity={0.07}
      />
      <GranoDecor
        variant="grano"
        className="top-24 left-[48%] w-14 rotate-12 sm:w-20"
        opacity={0.05}
      />

      <Reveal>
        <SectionHeader
          title={
            <>
              Múltiples materias primas
            </>
          }
          description="Tecnología versátil adaptada para distintos insumos agrícolas e industriales."
        />
      </Reveal>

      <Stagger className="mt-10 grid grid-cols-2 gap-x-8 lg:grid-cols-3">
        {roastables.map((item) => (
          <StaggerItem
            key={item.name}
            className="border-t border-white/10 py-6"
          >
            <div className="mb-4 flex h-6 items-center">
              <item.Icon className="h-4.5 w-4.5 text-steel-mid" strokeWidth={1.5} />
            </div>

            <h3 className="text-base font-semibold text-white">
              {item.name}
            </h3>
            <p className="mt-0.5 text-xs text-steel-dark">
              {item.subtitle}
            </p>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
