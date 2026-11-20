"use client";

import { useState } from "react";
import { AlertCircle, Factory, Gauge } from "lucide-react";
import {
  getCatalogLabel,
  getCategoryLabel,
  shouldShowCategoryForCatalog,
  type CatalogConfig,
} from "@/lib/catalog-config";
import type { Product } from "@/lib/products";
import {
  focusToObjectPosition,
  getCarouselImageSrc,
  getProductImageSrc,
} from "@/lib/product-images";
import { useQuoteSelection } from "@/lib/quote-selection";
import MediaImage from "./MediaImage";
import QuoteSelectedLabel, { quoteSelectedPanelClass } from "./QuoteSelectedBadge";

interface ProductDetailHeroProps {
  product: Product;
  catalogConfig: CatalogConfig;
}

export default function ProductDetailHero({
  product,
  catalogConfig,
}: ProductDetailHeroProps) {
  const { hasProduct } = useQuoteSelection();
  const isSelected = hasProduct(product.id);
  const categoryLabel = product.category
    ? getCategoryLabel(product.category, catalogConfig)
    : "";
  const showCategory =
    shouldShowCategoryForCatalog(product.catalog, catalogConfig) &&
    categoryLabel.length > 0;
  const images = (product.images ?? []).flatMap((image, index) => {
    const src = getProductImageSrc(image);
    return src ? [{ image, index, src }] : [];
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex] ?? images[0];

  return (
    <section
      className={`relative overflow-hidden rounded-lg border border-white/[0.06] ${
        isSelected ? quoteSelectedPanelClass : ""
      }`}
    >

      <div className="relative grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Gallery */}
        <div className="flex min-w-0 flex-col border-b border-white/[0.06] lg:border-b-0 lg:border-r lg:border-white/[0.06]">
          <div className="relative aspect-[4/3] overflow-hidden bg-background/50 sm:aspect-[16/11] lg:aspect-auto lg:min-h-[28rem] lg:flex-1">
            {activeImage ? (
              <MediaImage
                key={activeImage.src}
                src={activeImage.src}
                alt={product.name}
                className="h-full w-full"
                fallbackClassName="h-full w-full"
                fallbackSrc={getCarouselImageSrc(activeImage.image)}
                priority
                objectPosition={focusToObjectPosition(
                  activeImage.image.product.focus,
                )}
                sizes="(max-width: 1024px) 100vw, 58vw"
              />
            ) : (
              <div className="flex h-full min-h-[16rem] items-center justify-center lg:min-h-[28rem]">
                <div className="flex flex-col items-center gap-3 text-steel-dark">
                  <Factory className="h-14 w-14 text-orange/80" strokeWidth={1.5} />
                  <span className="text-sm">Imagen no disponible</span>
                </div>
              </div>
            )}

            {product.isOutOfStock ? (
              <div className="absolute top-4 left-4 z-10 inline-flex items-center gap-1.5 rounded-sm bg-[#17191d] px-3 py-1.5 text-xs font-medium text-red-300">
                <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                Agotado
              </div>
            ) : null}

            {product.capacity ? (
              <div className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-sm bg-[#17191d] px-3 py-1.5 text-xs font-medium text-white">
                <Gauge className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                {product.capacity}
              </div>
            ) : null}
          </div>

          {images.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto p-3 sm:p-4">
              {images.map(({ image, index, src }) => {
                const active = index === activeIndex;
                return (
                  <button
                    key={`${product.id}-thumb-${index}`}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Ver imagen ${index + 1}`}
                    aria-pressed={active}
                    className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-md border transition-[border-color,opacity] duration-150 sm:h-18 sm:w-24 ${
                      active
                        ? "border-white/40 opacity-100 ring-1 ring-white/20"
                        : "border-white/[0.08] opacity-55 hover:opacity-100"
                    }`}
                  >
                    <MediaImage
                      src={src}
                      alt={`${product.name} — imagen ${index + 1}`}
                      className="h-full w-full"
                      fallbackClassName="h-full w-full"
                      fallbackSrc={getCarouselImageSrc(image)}
                      objectPosition={focusToObjectPosition(image.product.focus)}
                      sizes="120px"
                    />
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Info */}
        <div className="relative flex min-w-0 flex-col justify-center p-6 sm:p-8 lg:p-10">
          {isSelected ? (
            <QuoteSelectedLabel className="absolute right-5 top-5 sm:right-8 sm:top-8" />
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-steel-mid">
              {getCatalogLabel(product.catalog, catalogConfig)}
            </span>
            {showCategory ? (
              <span className="text-xs text-steel-dark">
                {categoryLabel}
              </span>
            ) : null}
            {product.isOutOfStock ? (
              <span className="text-xs font-medium text-red-300">
                Agotado
              </span>
            ) : null}
          </div>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            {product.name}
          </h1>

          <p className="mt-4 max-w-prose text-base leading-relaxed text-steel-mid">
            {product.description}
          </p>

          {product.specs.length > 0 ? (
            <ul className="mt-7 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
              {product.specs.map((spec, index) => (
                <li
                  key={`${product.id}-spec-${index}`}
                  className="border-t border-white/[0.08] py-3 text-sm text-steel-light"
                >
                  {spec}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
