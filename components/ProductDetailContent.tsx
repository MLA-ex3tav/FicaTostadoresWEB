"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import type { Product } from "@/lib/products";
import { cn } from "@/lib/utils";

interface ProductDetailContentProps {
  product: Product;
}

interface CollapsibleSectionProps {
  id: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

function CollapsibleSection({
  id,
  title,
  open,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <section>
      <h2 className="border-b border-white/[0.06]">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          className="flex w-full cursor-pointer items-center justify-between gap-4 pb-3 text-left text-xl font-semibold text-orange transition-colors hover:text-orange-hover md:text-2xl"
        >
          {title}
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-orange transition-transform duration-200",
              open ? "rotate-180" : "",
            )}
            strokeWidth={2}
            aria-hidden
          />
        </button>
      </h2>
      <div
        id={`${id}-panel`}
        role="region"
        aria-label={title}
        aria-hidden={!open}
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              "transition-transform duration-300 ease-in-out",
              open ? "translate-y-0" : "-translate-y-2",
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ProductDetailContent({
  product,
}: ProductDetailContentProps) {
  const hasDescription = Boolean(product.longDescription?.trim());
  const hasFeatures = product.features.length > 0;
  const hasDetails = product.technicalDetails.length > 0;

  const [open, setOpen] = useState<Record<string, boolean>>({
    ficha: true,
  });

  const toggle = (key: string) =>
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  if (!hasDescription && !hasFeatures && !hasDetails) {
    return null;
  }

  return (
    <div className="space-y-8 md:space-y-10">
      {hasDetails ? (
        <CollapsibleSection
          id="ficha"
          title="Ficha técnica"
          open={Boolean(open.ficha)}
          onToggle={() => toggle("ficha")}
        >
          <dl className="mt-2">
            {product.technicalDetails.map((detail, index) => (
              <div
                key={`${product.id}-detail-${index}`}
                className="grid grid-cols-1 gap-1 border-b border-white/[0.06] py-3.5 last:border-b-0 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:items-baseline sm:gap-6"
              >
                <dt className="text-sm font-medium text-steel-light">
                  {detail.label}
                </dt>
                <dd className="text-sm font-medium text-steel-light sm:text-right md:text-base">
                  {detail.value}
                </dd>
              </div>
            ))}
          </dl>
        </CollapsibleSection>
      ) : null}

      {hasFeatures ? (
        <CollapsibleSection
          id="caracteristicas"
          title="Características"
          open={Boolean(open.caracteristicas)}
          onToggle={() => toggle("caracteristicas")}
        >
          <dl className="mt-2">
            {product.features.map((feature, index) => {
              const parts = feature.match(/^(.+?)\s(?:-|–|—|:)\s(.+)$/);

              return (
                <div
                  key={`${product.id}-feat-${index}`}
                  className="grid grid-cols-1 gap-1 border-b border-white/[0.06] py-3.5 last:border-b-0 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:items-baseline sm:gap-6"
                >
                  {parts ? (
                    <>
                      <dt className="text-sm font-medium text-steel-light">
                        {parts[1]}
                      </dt>
                      <dd className="text-sm font-medium text-steel-light sm:text-right md:text-base">
                        {parts[2]}
                      </dd>
                    </>
                  ) : (
                    <dt className="text-sm font-medium text-steel-light sm:col-span-2">
                      {feature}
                    </dt>
                  )}
                </div>
              );
            })}
          </dl>
        </CollapsibleSection>
      ) : null}

      {hasDescription ? (
        <CollapsibleSection
          id="descripcion"
          title="Descripción"
          open={Boolean(open.descripcion)}
          onToggle={() => toggle("descripcion")}
        >
          <p className="mt-5 max-w-[65ch] text-base leading-relaxed text-steel-mid">
            {product.longDescription}
          </p>
        </CollapsibleSection>
      ) : null}
    </div>
  );
}
