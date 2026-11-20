"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  ArrowRight,
  FileText,
  Layers,
  Loader2,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { defaultProducts, type Product } from "@/lib/products";
import { PRODUCT_COLORS, getProductColorById } from "@/lib/product-colors";
import { getProductImageSrc } from "@/lib/product-images";
import { useQuoteSelection } from "@/lib/quote-selection";

export default function QuoteDrawer() {
  const router = useRouter();
  const pathname = usePathname();
  const { products, removeProduct, clearProducts, isDrawerOpen, closeDrawer } =
    useQuoteSelection();

  const [ready, setReady] = useState(false);
  const [isNavigating, startNavigation] = useTransition();
  const [resolvedImages, setResolvedImages] = useState<
    Record<string, string | null>
  >({});

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setReady(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const missing = products.filter(
      (item) =>
        !item.image &&
        !defaultProducts.some((product) => product.id === item.id) &&
        resolvedImages[item.id] === undefined,
    );

    if (missing.length === 0) {
      return;
    }

    let cancelled = false;

    void Promise.all(
      missing.map(async (item) => {
        try {
          const response = await fetch(
            `/api/products/${encodeURIComponent(item.id)}`,
          );
          if (!response.ok) {
            return [item.id, null] as const;
          }
          const data = (await response.json()) as { product?: Product };
          return [
            item.id,
            getProductImageSrc(data.product?.images?.[0]) ?? null,
          ] as const;
        } catch {
          return [item.id, null] as const;
        }
      }),
    ).then((entries) => {
      if (cancelled) {
        return;
      }
      setResolvedImages((current) => {
        const next = { ...current };
        for (const [id, src] of entries) {
          next[id] = src;
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [products, resolvedImages]);

  // Close drawer when navigating to checkout pages
  useEffect(() => {
    if (pathname === "/contacto" || pathname === "/cotizar") {
      closeDrawer();
    }
  }, [pathname, closeDrawer]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen && ready) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen, ready]);

  const drawerVisible = isDrawerOpen && ready;

  const productCount = products.length;

  const handleCheckoutClick = () => {
    startNavigation(() => {
      router.push("/cotizar");
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[100] bg-black/60 transition-opacity duration-200 ${
          drawerVisible
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Panel de Cotización"
        className={`fixed inset-y-0 right-0 z-[101] flex w-full max-w-lg flex-col border-l border-[#3a332d] bg-[#171513] font-sans transition-transform duration-200 ease-out ${
          drawerVisible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange/10 text-orange">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-sans text-lg font-semibold tracking-[-0.02em] text-[#f4eee7]">
                Tu cotización
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {productCount > 0 && (
              <button
                type="button"
                onClick={clearProducts}
                className="flex min-h-11 min-w-11 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-steel-dark transition-colors hover:bg-white/[0.06] hover:text-white"
                title="Vaciar lista"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Limpiar</span>
              </button>
            )}
            <button
              type="button"
              onClick={closeDrawer}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] text-steel-mid transition-colors hover:bg-white/[0.06] hover:text-white"
              aria-label="Cerrar panel de cotización"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 space-y-4 sm:px-6 sm:py-6">
          {productCount === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/[0.03] border border-white/[0.06] text-steel-dark mb-4">
                <ShoppingBag className="h-9 w-9" />
              </div>
              <h3 className="text-xl font-semibold text-white">
                Tu lista está vacía
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-steel-mid max-w-xs">
                Explora nuestro catálogo de tostadores industriales y máquinas de procesamiento para agregarlos a tu cotización.
              </p>
              <Link
                href="/productos"
                onClick={closeDrawer}
                className="mt-6 apple-button-primary"
              >
                Ver Catálogo de Equipos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {products.map((item) => {
                const matchedProduct = defaultProducts.find(
                  (p) => p.id === item.id,
                );
                const imageSrc =
                  item.image ??
                  resolvedImages[item.id] ??
                  (matchedProduct
                    ? getProductImageSrc(matchedProduct.images?.[0])
                    : null);
                const colorHex =
                  (item.selectedColorId
                    ? getProductColorById(item.selectedColorId)?.hex
                    : undefined) ??
                  PRODUCT_COLORS.find(
                    (color) => color.name === item.selectedColor,
                  )?.hex;

                return (
                  <li
                    key={item.id}
                    className="group relative flex items-stretch overflow-hidden rounded-xl border border-[#39332d] bg-[#201d1a] transition-colors hover:border-[#56483a] hover:bg-[#25211d]"
                  >
                    {/* Thumbnail Image */}
                    <div className="relative w-24 shrink-0 self-stretch border-r border-white/[0.06] bg-surface sm:w-32">
                      {imageSrc ? (
                        <Image
                          src={imageSrc}
                          alt={item.name}
                          fill
                          className="object-cover object-center"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-surface/80 text-steel-dark">
                          <FileText className="h-7 w-7 opacity-40" />
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="min-w-0 flex-1 py-3.5 pl-3.5 pr-14 sm:py-4 sm:pl-4">
                      <h4 className="font-sans line-clamp-2 text-sm font-semibold leading-snug tracking-[-0.015em] text-[#f4eee7] sm:text-[15px]">
                        {item.name}
                      </h4>

                      <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-steel-dark">
                        {item.capacity}
                      </p>

                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        {item.selectedColor ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px]">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full ring-1 ring-white/25"
                              style={{ backgroundColor: colorHex ?? "#9aa2ab" }}
                            />
                            <span className="text-steel-dark">Color:</span>
                            <span className="font-medium text-steel-light">
                              {item.selectedColor}
                            </span>
                          </span>
                        ) : null}

                        {item.variacionName ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-orange/20 bg-orange/5 px-2 py-0.5 text-[11px] font-medium text-orange">
                            <Layers className="h-3 w-3 shrink-0" aria-hidden />
                            {item.variacionName}
                          </span>
                        ) : null}

                        {item.selectedAddOns && item.selectedAddOns.length > 0
                          ? item.selectedAddOns.map((addOn) => (
                              <span
                                key={addOn.id}
                                className="inline-flex items-center rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 text-[11px] text-steel-dark"
                              >
                                + {addOn.name}
                              </span>
                            ))
                          : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeProduct(item.id)}
                      className="absolute right-1.5 top-1.5 flex h-11 w-11 items-center justify-center rounded-lg text-steel-dark transition-colors hover:bg-white/[0.08] hover:text-white"
                      aria-label={`Quitar ${item.name}`}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer (Actions) */}
        {productCount > 0 && (
          <div className="shrink-0 border-t border-[#39332d] bg-[#171513]/95 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 backdrop-blur-xl">
            <div className="flex items-center">
              <button
                type="button"
                onClick={handleCheckoutClick}
                disabled={isNavigating}
                aria-busy={isNavigating}
                className="flex w-full h-12 items-center justify-center gap-2 rounded-xl bg-orange text-xs font-semibold text-white transition-all hover:bg-orange-hover active:scale-[0.98] shadow-md disabled:cursor-wait disabled:opacity-80"
              >
                {isNavigating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Continuando…
                  </>
                ) : (
                  <>
                    Continuar cotización
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

            </div>
          </div>
        )}
      </aside>
    </>
  );
}
