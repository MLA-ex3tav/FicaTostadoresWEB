"use client";


import { useRouter } from "next/navigation";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type TransitionEvent,
} from "react";
import MediaImage from "./MediaImage";
import type { HeroProductBanner } from "@/lib/images";
import { DEFAULT_HERO_BANNERS } from "@/lib/hero-banners";
import {
  CAROUSEL_CONTAINER_CLASS,
  focusToObjectPosition,
} from "@/lib/product-images";

interface HeroCarouselProps {
  banners: HeroProductBanner[];
}

const AUTO_ADVANCE_MS = 12000;
const SWIPE_THRESHOLD_PX = 48;

function getRealSlideIndex(trackIndex: number, slideCount: number): number {
  if (slideCount <= 1) {
    return 0;
  }

  if (trackIndex === 0) {
    return slideCount - 1;
  }

  if (trackIndex >= slideCount + 1) {
    return 0;
  }

  return trackIndex - 1;
}

function buildLoopSlides(slides: HeroProductBanner[]): HeroProductBanner[] {
  if (slides.length <= 1) {
    return slides;
  }

  const first = slides[0];
  const last = slides[slides.length - 1];
  return [last, ...slides, first];
}

function HeroBannerSlide({
  banner,
  priority,
}: {
  banner: HeroProductBanner;
  priority: boolean;
}) {
  const hasImage = banner.src.length > 0;

  return (
    <div className="relative h-full w-full shrink-0 overflow-hidden">
      {hasImage ? (
        <MediaImage
          src={banner.src}
          alt={banner.name}
          className="absolute inset-0 z-0 h-full w-full"
          fallbackClassName="absolute inset-0 z-0 h-full w-full"
          priority={priority}
          objectPosition={focusToObjectPosition(banner.carouselFocus)}
          sizes="100vw"
          quality={80}
        />
      ) : (
        <div
          className="absolute inset-0 z-0 bg-[#17191d]"
          aria-hidden="true"
        />
      )}

      {/* Overlay sutil: prioriza el lado del contenido */}
      <div
        className="absolute inset-0 z-[1] bg-gradient-to-r from-black/85 via-black/50 to-black/10"
        aria-hidden="true"
      />
      <div
        className="absolute inset-y-0 right-0 z-[1] w-1/2 bg-gradient-to-l from-background/50 to-transparent md:w-1/3"
        aria-hidden="true"
      />

      {/* Contenido */}
      <div className="pointer-events-none absolute inset-0 z-[2] flex h-full flex-col justify-center md:pb-16">
        <div className="mx-auto w-full max-w-[1550px] px-4 md:px-8 lg:px-12">
          <div className="max-w-xl">
            <div className="py-4 pr-2 sm:py-8 sm:pr-6 lg:py-10">
              <p className="text-xs font-medium text-white/75">
                Fabricación en Chile
                {banner.categoryLabel ? ` · ${banner.categoryLabel}` : null}
              </p>
              <h2 className="mt-3 max-w-[17ch] text-balance text-2xl font-medium leading-[1.08] tracking-tight text-white sm:text-4xl lg:text-5xl">
                Tostadores y equipos de proceso para tu producción
              </h2>
              <p className="mt-4 text-sm font-medium text-white/85 sm:text-base">
                {banner.name}
                {banner.capacity ? ` · ${banner.capacity}` : null}
              </p>
              {banner.description ? (
                <p className="mt-2 line-clamp-1 max-w-md text-sm leading-relaxed text-white/75 sm:line-clamp-3 sm:text-base">
                  {banner.description}
                </p>
              ) : null}
              <div className="pointer-events-auto mt-5 flex flex-wrap items-center gap-3 sm:mt-6">
                <Link
                  href={
                    banner.productId
                      ? `/productos/${banner.productId}`
                      : "/productos"
                  }
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-orange px-4 text-sm font-medium text-white transition-colors hover:bg-orange-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                >
                  {banner.productId ? "Ver producto" : "Ver catálogo"}
                  <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                </Link>
                <Link
                  href="/cotizar"
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex h-11 items-center rounded-full border border-white/35 bg-black/20 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                >
                  Solicitar cotización
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HeroCarousel({ banners }: HeroCarouselProps) {
  const slides = useMemo(
    () => (banners.length > 0 ? banners : DEFAULT_HERO_BANNERS),
    [banners],
  );
  const loopSlides = useMemo(() => buildLoopSlides(slides), [slides]);
  const slideCount = slides.length;
  const loopSlideCount = loopSlides.length;
  const [trackIndex, setTrackIndex] = useState(slideCount > 1 ? 1 : 0);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const router = useRouter();
  const pointerStartXRef = useRef<number | null>(null);
  const pointerStartYRef = useRef<number | null>(null);
  const didSwipeRef = useRef(false);
  const isBusyRef = useRef(false);
  const realActiveIndex = getRealSlideIndex(trackIndex, slideCount);
  const slideWidthPercent = loopSlideCount > 0 ? 100 / loopSlideCount : 100;

  useLayoutEffect(() => {
    if (transitionEnabled) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTransitionEnabled(true);
        isBusyRef.current = false;
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [transitionEnabled, trackIndex]);

  const releaseBusyIfNeeded = useCallback(
    (index: number) => {
      if (slideCount <= 1) {
        isBusyRef.current = false;
        return;
      }

      if (index > 0 && index < slideCount + 1) {
        isBusyRef.current = false;
      }
    },
    [slideCount],
  );

  const getSlideHref = useCallback((banner: HeroProductBanner) => {
    return banner.productId ? `/productos/${banner.productId}` : "/productos";
  }, []);

  const goToRealIndex = useCallback(
    (index: number) => {
      if (slideCount <= 1 || isBusyRef.current) {
        return;
      }

      const normalized = ((index % slideCount) + slideCount) % slideCount;
      isBusyRef.current = true;
      setTransitionEnabled(true);
      setTrackIndex(normalized + 1);
    },
    [slideCount],
  );

  const goNext = useCallback(() => {
    if (slideCount <= 1 || isBusyRef.current) {
      return;
    }

    isBusyRef.current = true;
    setTransitionEnabled(true);
    setTrackIndex((current) => Math.min(current + 1, slideCount + 1));
  }, [slideCount]);

  const goPrev = useCallback(() => {
    if (slideCount <= 1 || isBusyRef.current) {
      return;
    }

    isBusyRef.current = true;
    setTransitionEnabled(true);
    setTrackIndex((current) => Math.max(current - 1, 0));
  }, [slideCount]);

  const onTrackTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (
      event.target !== event.currentTarget ||
      event.propertyName !== "transform" ||
      slideCount <= 1
    ) {
      return;
    }

    if (trackIndex <= 0) {
      setTransitionEnabled(false);
      setTrackIndex(slideCount);
      return;
    }

    if (trackIndex >= slideCount + 1) {
      setTransitionEnabled(false);
      setTrackIndex(1);
      return;
    }

    releaseBusyIfNeeded(trackIndex);
  };

  useEffect(() => {
    if (slideCount <= 1 || isPaused) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;

    if (prefersReducedMotion || isMobile) {
      return;
    }

    const timer = window.setInterval(goNext, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [goNext, isPaused, slideCount]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goPrev();
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      const target = event.target as HTMLElement;
      if (target.closest("button, a")) {
        return;
      }

      event.preventDefault();
      router.push(getSlideHref(slides[realActiveIndex]));
    }
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, a")) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    pointerStartXRef.current = event.clientX;
    pointerStartYRef.current = event.clientY;
    didSwipeRef.current = false;
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, a")) {
      pointerStartXRef.current = null;
      pointerStartYRef.current = null;
      return;
    }

    const startX = pointerStartXRef.current;
    const startY = pointerStartYRef.current;
    pointerStartXRef.current = null;
    pointerStartYRef.current = null;

    if (startX === null || startY === null) {
      return;
    }

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    didSwipeRef.current = Math.max(absDeltaX, absDeltaY) > 8;

    if (absDeltaX >= SWIPE_THRESHOLD_PX && absDeltaX > absDeltaY) {
      didSwipeRef.current = true;

      if (deltaX < 0) {
        goNext();
      } else {
        goPrev();
      }
    }
  };

  const onPointerCancel = () => {
    pointerStartXRef.current = null;
    pointerStartYRef.current = null;
    didSwipeRef.current = true;
  };

  const onCarouselClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (didSwipeRef.current) {
      event.preventDefault();
      event.stopPropagation();
      didSwipeRef.current = false;
    }
  };

  if (slideCount === 0) {
    return null;
  }

  return (
    <section className="relative overflow-hidden">
      <div
        className="hero-carousel relative w-full overflow-hidden"
        role="region"
        aria-roledescription="Carrusel"
        aria-label="Productos destacados"
        onKeyDown={onKeyDown}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
        tabIndex={0}
      >
        <div
          className={`${CAROUSEL_CONTAINER_CLASS} hero-fade-bottom bg-panel/40`}
        >
          <div
            className="absolute inset-0 cursor-pointer touch-pan-y overflow-hidden"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onClickCapture={onCarouselClickCapture}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("button, a")) return;
              if (isBusyRef.current) return;
              router.push(getSlideHref(slides[realActiveIndex]));
            }}
          >
            <div
              className={`flex h-full ${
                transitionEnabled
                  ? "transition-transform duration-700 ease-out motion-reduce:transition-none"
                  : ""
              }`}
              style={{
                width: `${loopSlideCount * 100}%`,
                transform: `translateX(-${trackIndex * slideWidthPercent}%)`,
              }}
              onTransitionEnd={onTrackTransitionEnd}
              aria-live="polite"
            >
              {loopSlides.map((banner, index) => (
                <div
                  key={`${banner.productId || "default"}-loop-${index}`}
                  className="h-full shrink-0"
                  style={{ width: `${slideWidthPercent}%` }}
                >
                  <HeroBannerSlide banner={banner} priority={index === 1} />
                </div>
              ))}
            </div>
          </div>

        </div>

          {slideCount > 1 ? (
            <div className="absolute bottom-3 left-1/2 z-30 flex max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-0.5 rounded-full border border-white/10 bg-black/35 px-2 backdrop-blur-md md:bottom-4 md:left-auto md:right-8 md:translate-x-0 md:p-1.5">
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  goPrev();
                }}
                className="order-1 hidden h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white md:flex"
                aria-label="Slide anterior"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  goNext();
                }}
                className="order-3 hidden h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white md:flex"
                aria-label="Slide siguiente"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
              </button>

              <div className="order-2 flex min-w-0 flex-wrap items-center justify-center">
                {slides.map((banner, index) => {
                  const isActive = index === realActiveIndex;
                  return (
                    <button
                      key={`${banner.productId || "default"}-dot-${index}`}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        goToRealIndex(index);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-white md:h-11"
                      aria-label={`Ir al slide ${index + 1}`}
                      aria-current={isActive ? "true" : undefined}
                    >
                      <span
                        className={`block h-1 rounded-full transition-all md:h-1.5 ${
                          isActive
                            ? "w-2.5 bg-white md:w-3"
                            : "w-1 bg-white/40 hover:bg-white/70"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
      </div>
    </section>
  );
}
