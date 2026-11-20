"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ShoppingBag } from "lucide-react";
import type { ProductAddOn, ProductVariant } from "@/lib/products";
import { buildQuoteProductItem } from "@/lib/quote-product";
import { useQuoteSelection } from "@/lib/quote-selection";
import QuoteAddOnSelector from "./QuoteAddOnSelector";

interface ProductQuoteActionsProps {
  productId: string;
  productName: string;
  productCapacity: string;
  productImage?: string | null;
  addOns: ProductAddOn[];
  variaciones: ProductVariant[];
  selectedVariantId?: string | null;
  onVariantChange?: (variantId: string) => void;
  selectedColor?: string | null;
  selectedColorId: string;
  isOutOfStock?: boolean;
  compact?: boolean;
}

export default function ProductQuoteActions({
  productId,
  productName,
  productCapacity,
  productImage,
  addOns,
  variaciones,
  selectedVariantId,
  onVariantChange,
  selectedColor,
  selectedColorId,
  isOutOfStock = false,
  compact = false,
}: ProductQuoteActionsProps) {
  const { addProduct, hasProduct, products, openDrawer } = useQuoteSelection();
  const [localAddOnIds, setLocalAddOnIds] = useState<string[] | null>(null);

  const quoteAddOnIds = useMemo(() => {
    const existing = products.find((p) => p.id === productId);
    return existing?.selectedAddOns?.map((a) => a.id) ?? [];
  }, [products, productId]);

  const selectedAddOnIds = localAddOnIds ?? quoteAddOnIds;
  const alreadySelected = hasProduct(productId);
  const hasAddOns = addOns.length > 0;
  const hasVariaciones = variaciones.length > 0;
  const selectedVariant =
    variaciones.find((variant) => variant.id === selectedVariantId) ?? null;

  function buildSelection(selectedIds: string[]) {
    return buildQuoteProductItem(
      {
        id: productId,
        name: productName,
        capacity: productCapacity,
        image: productImage,
        addOns,
      },
      selectedIds,
      { id: selectedColorId, name: selectedColor },
      selectedVariant ? { id: selectedVariant.id, name: selectedVariant.name } : null,
    );
  }

  function handleAddOrUpdate() {
    if (isOutOfStock) return;
    addProduct(buildSelection(selectedAddOnIds), true);
    if (alreadySelected) {
      openDrawer();
    }
  }

  function handleAddOnChange(ids: string[]) {
    if (isOutOfStock) return;
    setLocalAddOnIds(ids);
    if (alreadySelected) {
      addProduct(buildSelection(ids), false);
    }
  }

  const variantSelector = hasVariaciones && !isOutOfStock ? (
    <div className="space-y-3 border-t border-white/[0.08] pt-4">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
        <p className="text-sm font-medium text-steel-light">
          Versión del equipo
        </p>
        <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-xs font-medium text-steel-mid">
          {variaciones.length} {variaciones.length === 1 ? "opción" : "opciones"}
        </span>
      </div>
      <div className="space-y-2" role="radiogroup" aria-label="Versión del producto">
        {variaciones.map((variant) => {
          const active = variant.id === selectedVariantId;
          return (
            <button
              key={variant.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onVariantChange?.(variant.id)}
              className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-md border p-3 text-left transition-colors ${
                active
                  ? "border-white/20 bg-white/[0.05] text-white"
                  : "border-white/[0.08] bg-white/[0.02] text-steel-light hover:border-white/[0.16] hover:bg-white/[0.04]"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full transition-colors ${
                      active ? "bg-orange" : "bg-white/20"
                    }`}
                  />
                  <span className="text-sm sm:text-xs font-semibold text-white">
                    {variant.name}
                  </span>
                </div>
                {variant.description ? (
                  <p className="mt-1 pl-4 text-sm sm:text-xs text-steel-mid leading-relaxed">
                    {variant.description}
                  </p>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  if (compact) {
    return (
      <div className="space-y-3.5 pt-1">
        {variantSelector}
        {hasAddOns && !isOutOfStock ? (
          <div className="space-y-3 border-t border-white/[0.08] pt-4">
            <p className="border-b border-white/[0.06] pb-2.5 text-sm font-medium text-steel-light">
              Agregados opcionales
            </p>
            <QuoteAddOnSelector
              addOns={addOns}
              selectedIds={selectedAddOnIds}
              onChange={handleAddOnChange}
            />
          </div>
        ) : null}

        <button
          type="button"
          disabled={isOutOfStock}
          onClick={handleAddOrUpdate}
          className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-md px-5 text-sm font-medium transition-colors ${
            isOutOfStock
              ? "border border-red-500/30 bg-red-500/10 text-red-400 opacity-80 cursor-not-allowed"
              : alreadySelected
                ? "border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15"
                : "bg-orange text-white hover:bg-orange-hover"
          }`}
        >
          {isOutOfStock ? (
            <>
              <AlertTriangle className="h-4 w-4 text-red-400" strokeWidth={1.75} />
              Agotado (Sin Stock)
            </>
          ) : alreadySelected ? (
            <>
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
              En cotización
            </>
          ) : (
            <>
              <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
              Cotizar
            </>
          )}
        </button>

        <Link
          href="/productos"
          className="inline-flex w-full items-center justify-center px-2 py-2 text-center text-sm font-medium text-steel-mid transition-colors hover:text-orange focus-visible:underline focus-visible:underline-offset-4"
        >
          Ver más productos
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-12 space-y-6">
      {variantSelector}
      {hasAddOns && !isOutOfStock ? (
        <div className="rounded-2xl border border-white/[0.08] bg-panel/60 p-5 shadow-lg shadow-black/20">
            <p className="text-base font-medium text-white">
            Agregados opcionales
          </p>
          <p className="mt-1 text-xs text-steel-mid">
            Seleccione los accesorios que desea incluir en su cotización para{" "}
            <span className="font-medium text-white">{productName}</span>:
          </p>

          <QuoteAddOnSelector
            addOns={addOns}
            selectedIds={selectedAddOnIds}
            onChange={handleAddOnChange}
            className="mt-4"
          />
        </div>
      ) : null}

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <button
          type="button"
          disabled={isOutOfStock}
          onClick={handleAddOrUpdate}
          className={`inline-flex h-12 w-full min-w-0 items-center justify-center gap-2.5 rounded-md px-6 text-sm font-medium transition-colors sm:w-auto sm:min-w-[16rem] ${
            isOutOfStock
              ? "border border-red-500/40 bg-red-500/10 text-red-400 opacity-80 cursor-not-allowed"
              : alreadySelected
                ? "border border-emerald-500/60 bg-emerald-500/10 text-emerald-400 shadow-emerald-500/10 hover:bg-emerald-500/20"
                : "bg-orange text-white shadow-orange/20 hover:bg-orange-hover"
          }`}
        >
          {isOutOfStock ? (
            <>
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Agotado (Sin Stock)
            </>
          ) : alreadySelected ? (
            <>
              <CheckCircle2 className="h-5 w-5" />
              En tu cotización
            </>
          ) : (
            <>
              <ShoppingBag className="h-5 w-5" />
              Agregar a Cotización
            </>
          )}
        </button>

        <Link
          href="/productos"
          className="inline-flex w-full items-center justify-center px-2 py-3 text-center text-sm font-medium text-steel-mid transition-colors hover:text-orange focus-visible:underline focus-visible:underline-offset-4"
        >
          Ver más productos
        </Link>
      </div>
    </div>
  );
}
