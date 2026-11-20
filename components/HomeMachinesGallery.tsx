import Image from "next/image";
import { companyInfo } from "@/lib/company";
import GranoDecor from "@/components/GranoDecor";
import Reveal from "@/components/motion/Reveal";
import SectionHeader from "@/components/SectionHeader";

const MACHINES = [
  {
    src: "/images/home/maquinas/tostador-en-terreno.webp",
    alt: "Tostador Fica trabajando en terreno",
    caption: "Tostadores Fica en operación",
  },
  {
    src: "/images/home/maquinas/tostador-mural.webp",
    alt: "Tostador Fica con acabado personalizado",
    caption: "Acabados y colores a medida",
  },
  {
    src: "/images/home/maquinas/equipo-con-clientes.webp",
    alt: "Equipo Fica entregado a clientes",
    caption: "Equipos entregados en planta",
  },
  {
    src: "/images/home/maquinas/tostador-verde.webp",
    alt: "Tostador Fica con acabado verde",
    caption: "Fabricación chilena, lista para producir",
  },
];

const cardClass =
  "group relative aspect-[4/5] w-[76vw] shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-panel/40 transition-colors hover:border-orange/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange sm:w-[42vw] lg:w-[264px]";

export default function HomeMachinesGallery() {
  return (
    <section className="relative isolate mx-auto max-w-6xl overflow-hidden px-4 py-16 md:px-6 md:py-24">
      <GranoDecor
        variant="grano"
        className="bottom-10 right-4 w-24 rotate-12 sm:w-32"
        opacity={0.09}
      />
      <GranoDecor
        variant="grano2"
        className="top-10 left-[52%] w-16 -rotate-12 sm:w-24"
        opacity={0.06}
      />

      <Reveal>
        <SectionHeader
          title={
            <>
              Nuestras máquinas <span className="text-orange">en acción</span>
            </>
          }
          description="Equipos fabricados en Chile, probados y trabajando en plantas de café, avellanas, trigo y granos."
        />
      </Reveal>

      <Reveal delay={0.08}>
        <div className="mt-10 -mx-4 md:mx-0">
          <div className="machines-marquee-viewport [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)] md:[mask-image:none]">
            <div className="machines-marquee">
              {[0, 1].map((copy) => (
                <div
                  key={copy}
                  aria-hidden={copy === 1 ? true : undefined}
                  className={`flex shrink-0 gap-3 pr-3 sm:gap-4 sm:pr-4 ${
                    copy === 1 ? "machines-marquee-copy" : ""
                  }`}
                >
                  {MACHINES.map((machine) => (
                    <a
                      key={`${machine.src}-${copy}`}
                      href={companyInfo.social.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      tabIndex={copy === 1 ? -1 : undefined}
                      aria-label={`${machine.caption}: abrir Instagram`}
                      className={cardClass}
                    >
                      <Image
                        src={machine.src}
                        alt={machine.alt}
                        fill
                        sizes="(max-width: 640px) 76vw, (max-width: 1024px) 42vw, 264px"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                      />
                      <span
                        className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent"
                        aria-hidden="true"
                      />
                      <span className="absolute inset-x-0 bottom-0 p-4 text-xs font-medium text-white/90">
                        {machine.caption}
                      </span>
                    </a>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
