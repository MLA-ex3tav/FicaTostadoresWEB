"use client";

import Link from "next/link";
import { AlertCircle, ArrowUpRight, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/products";
import {
  DEFAULT_IMAGE_FOCUS,
  focusToObjectPosition,
  getCarouselImageSrc,
  getProductImageSrc,
} from "@/lib/product-images";
import { useQuoteSelection } from "@/lib/quote-selection";
import { cn } from "@/lib/utils";
import MediaImage from "./MediaImage";
import ProductPlaceholder from "./ProductPlaceholder";
import QuoteSelectedLabel, { quoteSelectedPanelClass } from "./QuoteSelectedBadge";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

const TITLE_TRANSITION_MS = 500;

function getTwoLineHeight(element: HTMLElement): number {
  const lineHeight = Number.parseFloat(
    window.getComputedStyle(element).lineHeight,
  );

  return (Number.isFinite(lineHeight) ? lineHeight : 28) * 2;
}

export default function ProductCard({ product, priority = false }: ProductCardProps) {
  const { hasProduct } = useQuoteSelection();
  const isSelected = hasProduct(product.id);
  const primaryImage = product.images?.[0];
  const primaryImageSrc = getProductImageSrc(primaryImage);
  const primaryImageFallbackSrc = getCarouselImageSrc(primaryImage);

  const titleRef = useRef<HTMLHeadingElement>(null);
  const leaveTimerRef = useRef<number | null>(null);
  const canExpandRef = useRef(false);
  const [isTitleClamped, setIsTitleClamped] = useState(true);
  const [titleMaxHeight, setTitleMaxHeight] = useState("3.6rem");

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) {
        window.clearTimeout(leaveTimerRef.current);
      }
    };
  }, []);

  function handleTitleEnter() {
    const title = titleRef.current;

    if (!title) {
      return;
    }

    if (leaveTimerRef.current) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }

    const collapsedHeight = getTwoLineHeight(title);
    const fullHeight = title.scrollHeight;

    if (fullHeight <= collapsedHeight + 1) {
      canExpandRef.current = false;
      return;
    }

    canExpandRef.current = true;
    setTitleMaxHeight(`${fullHeight}px`);
    setIsTitleClamped(false);
  }

  function handleTitleLeave() {
    if (!canExpandRef.current) {
      return;
    }

    const title = titleRef.current;

    if (!title) {
      return;
    }

    setTitleMaxHeight(`${getTwoLineHeight(title)}px`);
    leaveTimerRef.current = window.setTimeout(() => {
      setIsTitleClamped(true);
      leaveTimerRef.current = null;
    }, TITLE_TRANSITION_MS);
  }

  return (
    <Link
      href={`/productos/${product.id}`}
      className="group relative block h-full rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange"
      onMouseEnter={handleTitleEnter}
      onMouseLeave={handleTitleLeave}
      onFocus={handleTitleEnter}
      onBlur={handleTitleLeave}
    >
      <article
        className={cn(
          "relative flex h-full min-w-0 w-full flex-col border-b border-white/10 pb-6 transition-colors duration-200",
          "group-hover:border-white/30",
          isSelected && quoteSelectedPanelClass,
          product.isOutOfStock && "opacity-90",
        )}
      >
        {isSelected ? (
          <QuoteSelectedLabel className="absolute right-4 top-4 z-10 md:right-6 md:top-6" />
        ) : null}

        <div className="relative mb-5 aspect-[4/3] overflow-hidden rounded-md bg-white/[0.03]">
          {primaryImageSrc ? (
            <MediaImage
              src={primaryImageSrc}
              alt={product.name}
              className={cn(
                "h-full w-full object-cover",
                product.isOutOfStock && "grayscale-[30%]",
              )}
              fallbackClassName="h-full w-full"
              fallbackSrc={primaryImageFallbackSrc}
              objectPosition={focusToObjectPosition(
                primaryImage?.product.focus ?? DEFAULT_IMAGE_FOCUS,
              )}
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 450px"
              priority={priority}
            />
          ) : (
            <ProductPlaceholder flat className="h-full w-full" />
          )}

          {product.isOutOfStock ? (
            <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-sm bg-[#17191d] px-2 py-1 text-xs font-medium text-red-300">
              <AlertCircle className="h-3 w-3 text-red-400" />
              Agotado
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col">
          <h3
            ref={titleRef}
            className={cn(
              "text-xl font-semibold leading-snug tracking-tight text-white overflow-hidden transition-[max-height,color] duration-500 ease-out group-hover:text-orange motion-reduce:transition-none",
              isTitleClamped && "line-clamp-2",
            )}
            style={{ maxHeight: titleMaxHeight }}
          >
            {product.name}
          </h3>

          {product.description ? (
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-steel-mid">
              {product.description}
            </p>
          ) : null}

          <div className="mt-auto pt-6">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-steel-dark transition-colors group-hover:text-orange">
              <ShoppingBag className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              <span>Cotizar este equipo</span>
              <ArrowUpRight
                className="h-3.5 w-3.5 opacity-60 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                strokeWidth={1.5}
                aria-hidden
              />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
