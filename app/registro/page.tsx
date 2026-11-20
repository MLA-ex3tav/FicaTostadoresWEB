import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import GoogleLoginCard from "@/components/GoogleLoginCard";
import GoogleAuthProvider from "@/components/providers/GoogleAuthProvider";
import Reveal from "@/components/motion/Reveal";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Crear cuenta",
  description:
    "Cree su cuenta en Fica Tostadores para gestionar cotizaciones y solicitudes de servicio técnico.",
  path: "/registro",
  noindex: true,
});

export default function RegistroPage() {
  return (
    <div className="min-h-screen py-8 md:py-12">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <Reveal>
          <Link
            href="/"
            className="group mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-steel-dark transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Volver al inicio
          </Link>
        </Reveal>

        <AuthShell
          brandTitle={
            <>
              Cotizaciones y solicitudes en un solo lugar
            </>
          }
          brandDescription="Regístrese para guardar cotizaciones, consultar catálogos y coordinar mantenciones directamente con nuestra fábrica en Chile."
        >
          <Suspense
            fallback={
              <p className="text-center text-sm text-steel-mid">Cargando…</p>
            }
          >
            <GoogleAuthProvider>
              <GoogleLoginCard
                badge="Crear cuenta"
                title="Crear cuenta"
                subtitle="Cree su cuenta con Google para comenzar a gestionar sus equipos."
                embedded
              />
            </GoogleAuthProvider>
          </Suspense>
        </AuthShell>
      </div>
    </div>
  );
}
