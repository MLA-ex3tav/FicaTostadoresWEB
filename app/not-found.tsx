import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import Navbar from "@/components/Navbar";
import { companyInfo } from "@/lib/company";

export default function NotFound() {
  return (
    <>
      <div data-not-found-navbar>
        <Navbar />
      </div>
      <div className="relative isolate flex min-h-[calc(100vh-72px)] w-full items-center overflow-hidden px-4 py-14 sm:px-6 lg:py-16">
      <div
        className="pointer-events-none absolute -right-32 top-1/2 -z-10 h-[34rem] w-[34rem] -translate-y-1/2 rounded-full bg-orange/[0.07] blur-3xl"
        aria-hidden="true"
      />

      <div className="mx-auto grid w-full max-w-[88rem] items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8 xl:grid-cols-[0.85fr_1.2fr]">
        <div>
          <p className="font-display text-[clamp(4rem,9vw,7rem)] uppercase leading-[0.9] tracking-tight text-white">
            404<span className="text-orange">-</span>
            <span className="text-orange">error</span>
          </p>

          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Página no encontrada
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-relaxed text-steel-mid sm:text-base">
            La página que buscas no existe, fue movida o ya no está disponible.
          </p>

          <div className="mt-8 flex w-full max-w-md flex-col gap-3">
            <Link
              href="/"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-orange px-5 text-sm font-semibold text-white transition-colors hover:bg-orange-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
            >
              Volver al inicio
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/productos"
              className="inline-flex w-full items-center justify-center gap-2 py-2 text-sm font-medium text-steel-light transition-colors hover:text-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
            >
              Ver catálogo
            </Link>
          </div>

          <div className="mt-6 w-full max-w-md border-t border-white/[0.06] pt-4">
            <p className="text-xs text-steel-dark">
              ¿La página está caída? Escríbenos a
            </p>
            <a
              href={`mailto:${companyInfo.emailVentas}`}
              className="mt-1 inline-flex items-center gap-1.5 text-sm text-orange underline underline-offset-2 transition-colors hover:text-orange-hover"
            >
              <Mail className="h-4 w-4" aria-hidden />
              {companyInfo.emailVentas}
            </a>
          </div>
        </div>

        <div className="relative -mx-4 w-[calc(100%+2rem)] max-w-none sm:mx-0 sm:w-full sm:max-w-[46rem] lg:-mr-8 lg:max-w-none">
          <Image
            src="/images/general/maquinatriste-espejo.png"
            alt="Ilustración de un tostador Fica triste"
            width={713}
            height={533}
            className="h-auto w-full"
            sizes="(max-width: 1024px) 100vw, 55vw"
            priority
          />
        </div>
      </div>
      </div>
    </>
  );
}
