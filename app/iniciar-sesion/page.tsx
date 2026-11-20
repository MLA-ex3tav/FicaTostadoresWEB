import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import GoogleLoginCard from "@/components/GoogleLoginCard";
import GoogleAuthProvider from "@/components/providers/GoogleAuthProvider";
import Reveal from "@/components/motion/Reveal";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Iniciar sesión",
  description:
    "Inicie sesión en Fica Tostadores para gestionar cotizaciones y dar seguimiento a sus servicios técnicos.",
  path: "/iniciar-sesion",
  noindex: true,
});

export default function IniciarSesionPage() {
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
              Accede a tus cotizaciones y solicitudes
            </>
          }
          brandDescription="Acceda a su cuenta Fica Tostadores para revisar sus cotizaciones activas, consultar el avance de taller y contactar a servicio técnico."
        >
          <Suspense
            fallback={
              <p className="text-center text-sm text-steel-mid">Cargando…</p>
            }
          >
            <GoogleAuthProvider>
              <GoogleLoginCard
                badge="Iniciar sesión"
                title="Iniciar sesión"
                subtitle="Ingrese con su cuenta de Google para acceder a su panel."
                embedded
                allowGuest
              />
            </GoogleAuthProvider>
          </Suspense>
        </AuthShell>
      </div>
    </div>
  );
}
