import Link from "next/link";
import type { ReactNode } from "react";
import SectionHeader from "@/components/SectionHeader";

interface LegalPageLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  lastUpdated: string;
  activePath: "/privacidad" | "/terminos";
  children: ReactNode;
}

export default function LegalPageLayout({
  eyebrow,
  title,
  description,
  lastUpdated,
  activePath,
  children,
}: LegalPageLayoutProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-20">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <SectionHeader
          as="h1"
          align="center"
          eyebrow={eyebrow}
          title={<span className="font-display text-orange">{title}</span>}
          description={description}
        />
        <p className="mt-3 text-sm font-medium text-steel-dark">
          Última actualización: {lastUpdated}
        </p>
      </div>

      <article className="legal-prose space-y-8 text-sm leading-relaxed text-steel-mid md:text-base">
        {children}
      </article>

      <div className="mt-10 flex flex-wrap justify-center gap-6 border-t border-white/[0.08] pt-8 text-sm font-medium">
        <Link
          href="/privacidad"
          aria-current={activePath === "/privacidad" ? "page" : undefined}
          className={
            activePath === "/privacidad"
              ? "text-orange transition-colors hover:text-orange-hover"
              : "text-white transition-colors hover:text-orange"
          }
        >
          Política de privacidad
        </Link>
        <span className="text-steel-dark">•</span>
        <Link
          href="/terminos"
          aria-current={activePath === "/terminos" ? "page" : undefined}
          className={
            activePath === "/terminos"
              ? "text-orange transition-colors hover:text-orange-hover"
              : "text-white transition-colors hover:text-orange"
          }
        >
          Términos y condiciones
        </Link>
        <span className="text-steel-dark">•</span>
        <Link href="/contacto" className="text-white transition-colors hover:text-orange">
          Contacto
        </Link>
      </div>
    </div>
  );
}

interface LegalSectionProps {
  title: string;
  children: ReactNode;
}

export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section className="border-b border-white/[0.06] pb-6 last:border-b-0 last:pb-0">
      <h2 className="mb-3 font-display text-xl text-white md:text-2xl">
        {title}
      </h2>
      <div className="space-y-3 text-steel-mid">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 text-steel-mid">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
