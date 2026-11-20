import Link from "next/link";
import { ArrowRight } from "lucide-react";
import MediaImage from "./MediaImage";
import type { HeroProductBanner } from "@/lib/images";
import { focusToObjectPosition } from "@/lib/product-images";

interface HeroMobileStaticProps {
  banner: HeroProductBanner;
}

export default function HeroMobileStatic({ banner }: HeroMobileStaticProps) {
  const hasImage = banner.src.length > 0;
  const href = banner.productId
    ? `/productos/${banner.productId}`
    : "/productos";

  return (
    <section className="pt-8 md:hidden">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <p className="text-xs font-medium text-steel-dark">
          Fabricación en Chile
          {banner.categoryLabel ? ` · ${banner.categoryLabel}` : null}
        </p>

        <h2 className="mt-3 text-balance text-3xl font-medium leading-[1.08] tracking-tight text-white">
          Tostadores y equipos de proceso para tu producción
        </h2>

        <p className="mt-4 text-sm font-medium text-steel-light">
          {banner.name}
          {banner.capacity ? ` · ${banner.capacity}` : null}
        </p>

        {banner.description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-steel-mid">
            {banner.description}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href={href}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-orange px-4 text-sm font-medium text-white transition-colors hover:bg-orange-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            {banner.productId ? "Ver producto" : "Ver catálogo"}
            <ArrowRight
              className="h-4 w-4"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </Link>
          <Link
            href="/cotizar"
            className="inline-flex h-11 items-center rounded-full border border-white/35 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            Solicitar cotización
          </Link>
        </div>
      </div>

      {hasImage ? (
        <Link
          href={href}
          className="mt-7 block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange"
        >
          <MediaImage
            src={banner.src}
            alt={banner.name}
            className="aspect-[4/3] w-full"
            fallbackClassName="aspect-[4/3] w-full"
            priority
            objectPosition={focusToObjectPosition(banner.carouselFocus)}
            sizes="100vw"
            quality={80}
          />
        </Link>
      ) : null}
    </section>
  );
}
