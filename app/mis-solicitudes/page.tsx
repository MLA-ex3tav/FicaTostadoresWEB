import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import MisSolicitudesContent from "@/components/MisSolicitudesContent";
import Reveal from "@/components/motion/Reveal";
import SectionHeader from "@/components/SectionHeader";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Mis solicitudes",
  description:
    "Seguimiento de sus solicitudes de cotización y órdenes de servicio técnico en Fica Tostadores.",
  path: "/mis-solicitudes",
  noindex: true,
});

export default function MisSolicitudesPage() {
  return (
    <div className="min-h-screen py-10 md:py-16">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <Reveal>
          <Link
            href="/perfil"
            className="group mb-8 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-steel-dark transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Volver a mi perfil
          </Link>
        </Reveal>

        <Reveal className="mb-10">
          <SectionHeader
            as="h1"
            eyebrow="Seguimiento"
            title={
              <>
                Mis <span className="text-orange">solicitudes</span>
              </>
            }
            description="Consulte el estado en tiempo real de sus requerimientos de cotización y atenciones de soporte técnico."
          />
        </Reveal>

        <MisSolicitudesContent />
      </div>
    </div>
  );
}
