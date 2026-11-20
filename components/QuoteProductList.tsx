"use client";

import Link from "next/link";
import { ChevronDown, X } from "lucide-react";
import { useQuoteSelection } from "@/lib/quote-selection";

export const quoteEyebrowClass =
  "text-xs font-medium   text-steel-mid";

export const quoteCountClass = "text-base text-steel-mid";

interface QuoteProductListProps {
  className?: string;
  showCta?: boolean;
  onCollapse?: () => void;
  variant?: "default" | "minimal";
}

export default function QuoteProductList({
  className = "",
  showCta = true,
  onCollapse,
  variant = "default",
}: QuoteProductListProps) {
  const { products, removeProduct } = useQuoteSelection();
  const isMinimal = variant === "minimal";

  if (products.length === 0) {
    return null;
  }

  const countLabel =
    products.length === 1
      ? "1 producto"
      : `${products.length} productos`;

  if (isMinimal) {
    return (
      <div className={className}>
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <p className="text-xs   text-steel-dark">
            Cotización
          </p>
          <p className="text-sm text-steel-mid">{countLabel}</p>
        </div>

        <ul className="divide-y divide-white/[0.06]">
          {products.map((product) => (
            <li
              key={product.id}
              className="flex items-start justify-between gap-3 py-3.5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium text-steel-light">
                  {(product.quantity ?? 1) > 1 ? `${product.quantity}× ` : ""}
                  {product.name}
                </p>
                <p className="mt-0.5 text-xs text-steel-dark">{product.capacity}</p>
                {product.selectedColor ? (
                  <p className="mt-1 text-xs text-steel-mid">
                    Color: {product.selectedColor}
                  </p>
                ) : null}
                {product.selectedAddOns && product.selectedAddOns.length > 0 ? (
                  <p className="mt-1 text-xs text-steel-mid">
                    + {product.selectedAddOns.map((addOn) => addOn.name).join(", ")}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => removeProduct(product.id)}
                className="mt-0.5 -mr-2.5 shrink-0 rounded-lg p-2.5 text-steel-dark transition-colors hover:text-white"
                aria-label={`Quitar ${product.name} de la cotización`}
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const countLabelFull =
    products.length === 1
      ? "1 producto seleccionado"
      : `${products.length} productos seleccionados`;

  const headerContent = (
    <>
      <div className="min-w-0 flex-1 text-left">
        <p className={quoteEyebrowClass}>Cotización</p>
        <p className={`mt-1.5 ${quoteCountClass}`}>{countLabelFull}</p>
      </div>
      {onCollapse ? (
        <ChevronDown
          className="h-4 w-4 shrink-0 text-steel-mid"
          strokeWidth={2.25}
          aria-hidden
        />
      ) : null}
    </>
  );

  return (
    <div className={className}>
      <div className="shrink-0 border-b border-white/[0.06] pb-3.5">
        {onCollapse ? (
          <button
            type="button"
            onClick={onCollapse}
            className="group flex w-full items-start justify-between gap-3 rounded-xl px-1 py-0.5 text-left transition-colors focus-visible:outline-none"
            aria-label="Contraer lista de cotización"
          >
            {headerContent}
          </button>
        ) : (
          headerContent
        )}
      </div>

      <ul className="custom-scrollbar mt-3.5 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-0.5">
        {products.map((product) => (
          <li
            key={product.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 transition-colors hover:border-white/15"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white leading-snug">
                {(product.quantity ?? 1) > 1 ? `${product.quantity}× ` : ""}
                {product.name}
              </p>
              <p className="mt-1 text-xs text-steel-dark font-medium">{product.capacity}</p>
              {product.selectedColor ? (
                <p className="mt-1 text-xs text-steel-mid">
                  Color: {product.selectedColor}
                </p>
              ) : null}
              {product.selectedAddOns && product.selectedAddOns.length > 0 ? (
                <p className="mt-1 text-xs text-steel-mid">
                  + {product.selectedAddOns.map((addOn) => addOn.name).join(", ")}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => removeProduct(product.id)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-steel-dark transition-colors hover:bg-white/[0.08] hover:text-white"
              aria-label={`Quitar ${product.name} de la cotización`}
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </li>
        ))}
      </ul>

      {showCta && (
        <Link
          href="/contacto"
          className="mt-3.5 flex h-11 w-full shrink-0 items-center justify-center rounded-xl bg-orange text-xs font-semibold   text-white transition-all hover:bg-orange-hover active:scale-[0.98] shadow-md"
        >
          Ir a cotizar
        </Link>
      )}
    </div>
  );
}
