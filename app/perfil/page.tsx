import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ClientePerfilContent from "@/components/ClientePerfilContent";
import Reveal from "@/components/motion/Reveal";
import SectionHeader from "@/components/SectionHeader";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Mi perfil",
  description:
    "Gestione su cuenta de usuario y datos de acceso en Fica Tostadores.",
  path: "/perfil",
  noindex: true,
});

export default function PerfilPage() {
  return (
    <div className="min-h-screen py-10 md:py-16">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <Reveal>
          <Link
            href="/"
            className="group mb-8 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-steel-dark transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Volver al inicio
          </Link>
        </Reveal>

        <Reveal className="mb-10">
          <SectionHeader
            as="h1"
            eyebrow="Cuenta"
            title={
              <>
                Mi <span className="text-orange">perfil</span>
              </>
            }
            description="Gestione los datos de su cuenta de cliente y acceda al centro de seguimiento de solicitudes."
          />
        </Reveal>

        <ClientePerfilContent />
      </div>
    </div>
  );
}
