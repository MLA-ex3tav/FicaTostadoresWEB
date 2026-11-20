import Image from "next/image";
import type { SVGProps } from "react";
import {
  Mail,
  MapPin,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { companyInfo } from "@/lib/company";
import { logoPath } from "@/lib/images";

function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function YoutubeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10 9.5 15 12l-5 2.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13.5 21v-7h2.4l.4-2.8h-2.8V9.4c0-.8.2-1.4 1.4-1.4h1.5V5.5c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2H8v2.8h2.5v7h3z" />
    </svg>
  );
}

const SOCIAL = [
  { href: companyInfo.social.instagram, label: "Instagram", icon: InstagramIcon },
  { href: companyInfo.social.youtube, label: "YouTube", icon: YoutubeIcon },
  { href: companyInfo.social.facebook, label: "Facebook", icon: FacebookIcon },
];

export default function ConstruccionScreen() {
  const phone = companyInfo.phones[0];
  const whatsappUrl = `${phone.whatsapp}?text=${encodeURIComponent(
    "Hola, quiero cotizar maquinaria de Fica Tostadores.",
  )}`;

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden bg-background text-white">
      <div
        className="pointer-events-none absolute bottom-[14%] left-1/2 z-0 w-[140vw] -translate-x-1/2 translate-y-1/2 rotate-2 opacity-55"
        aria-hidden="true"
      >
        <div className="caution-tape w-full" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-6 sm:px-8">
        <Image
          src={logoPath}
          alt={companyInfo.brand}
          width={180}
          height={44}
          className="h-8 w-auto sm:h-9"
          priority
        />
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-6 pb-16 pt-4 sm:px-8">
        <div className="w-full">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:gap-10">
            <section>
              <h1 className="max-w-[16ch] text-balance font-display text-[clamp(3rem,6vw,5rem)] leading-[0.9] tracking-tight text-white">
                El catálogo de Fica, pronto{" "}
                <span className="text-orange">en línea</span>
              </h1>
            </section>

            <section className="border-t border-white/[0.06] pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-steel-dark">
            Contacto directo
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            ¿Buscas un equipo?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-steel-mid sm:text-base">
            Consulta por WhatsApp o correo.
          </p>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-orange px-5 text-sm font-semibold text-white transition-colors hover:bg-orange-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            Contactar por WhatsApp
          </a>

          <a
            href={`mailto:${companyInfo.emailVentas}`}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 py-2 text-sm font-medium text-steel-light transition-colors hover:text-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
          >
            <Mail className="h-4 w-4" aria-hidden />
            {companyInfo.emailVentas}
          </a>

          <div className="mt-6 border-t border-white/[0.06] pt-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-steel-dark">
              Síguenos
            </p>
            <div className="mt-3 flex items-center gap-2">
              {SOCIAL.map(({ href, label, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className="inline-flex h-12 w-12 items-center justify-center text-steel-mid transition-colors hover:text-orange focus-visible:text-orange"
                >
                  <Icon className="h-6 w-6" aria-hidden />
                </a>
              ))}
            </div>
          </div>
        </section>
          </div>
        </div>
      </main>

      <footer className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-4 border-t border-white/[0.06] px-6 py-6 text-xs text-steel-dark sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span className="inline-flex items-start gap-2">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {companyInfo.address}
        </span>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span>
            © {new Date().getFullYear()} {companyInfo.legalName}
          </span>
          <a
            href="/admin/login?returnTo=/"
            className="inline-flex items-center gap-1.5 text-steel-dark transition-colors hover:text-orange"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-orange/80" aria-hidden />
            Acceso equipo
          </a>
        </div>
      </footer>
    </div>
  );
}

