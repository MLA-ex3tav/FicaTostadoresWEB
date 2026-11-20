"use client";

import type { CatalogConfig } from "@/lib/catalog-config";
import {
  DEFAULT_PRODUCT_COLOR_ID,
  PRODUCT_COLORS,
  SIN_COLOR_ID,
  getProductColorLabel,
} from "@/lib/product-colors";
import type { Product } from "@/lib/products";
import { getProductImageSrc } from "@/lib/product-images";
import { buildQuoteProductItem } from "@/lib/quote-product";
import { useQuoteSelection } from "@/lib/quote-selection";
import { useCallback, useMemo, useState } from "react";
import ProductColorSection from "@/components/ProductColorSection";
import ProductDetailContent from "@/components/ProductDetailContent";
import ProductDetailHero from "@/components/ProductDetailHero";
import ProductQuoteActions from "@/components/ProductQuoteActions";

interface ProductDetailSectionsProps {
  product: Product;
  catalogConfig: CatalogConfig;
}

export default function ProductDetailSections({
  product,
  catalogConfig,
}: ProductDetailSectionsProps) {
  const { products, hasProduct, addProduct } = useQuoteSelection();
  const existingQuoteLine = products.find((item) => item.id === product.id);

  const initialDefaultColor = useMemo(() => {
    if (product.disableColors) {
      return SIN_COLOR_ID;
    }
    const disabled = product.disabledColors ?? [];
    if (!disabled.includes(DEFAULT_PRODUCT_COLOR_ID)) {
      return DEFAULT_PRODUCT_COLOR_ID;
    }
    const available = PRODUCT_COLORS.find((c) => !disabled.includes(c.id));
    return available?.id ?? DEFAULT_PRODUCT_COLOR_ID;
  }, [product.disableColors, product.disabledColors]);

  const [localColorId, setLocalColorId] = useState<string | null>(null);
  const selectedColorId =
    localColorId ??
    existingQuoteLine?.selectedColorId ??
    initialDefaultColor;
  const selectedColorName = getProductColorLabel(selectedColorId);

  const [localVariantId, setLocalVariantId] = useState<string | null>(null);
  const selectedVariantId =
    localVariantId ??
    existingQuoteLine?.variacionId ??
    product.variaciones?.[0]?.id ??
    null;
  const selectedVariant =
    product.variaciones?.find((variant) => variant.id === selectedVariantId) ?? null;

  const syncQuoteColor = useCallback(
    (nextColorId: string) => {
      if (!hasProduct(product.id)) {
        return;
      }

      const addOnIds =
        products
          .find((item) => item.id === product.id)
          ?.selectedAddOns?.map((addOn) => addOn.id) ?? [];

      addProduct(
        buildQuoteProductItem(
          product,
          addOnIds,
          {
            id: nextColorId,
            name: getProductColorLabel(nextColorId),
          },
          selectedVariant
            ? { id: selectedVariant.id, name: selectedVariant.name }
            : null,
        ),
      );
    },
    [addProduct, hasProduct, product, products, selectedVariant],
  );

  function handleColorChange(nextColorId: string) {
    setLocalColorId(nextColorId);
    syncQuoteColor(nextColorId);
  }

  function handleVariantChange(nextVariantId: string) {
    setLocalVariantId(nextVariantId);
    if (hasProduct(product.id)) {
      const addOnIds =
        products
          .find((item) => item.id === product.id)
          ?.selectedAddOns?.map((addOn) => addOn.id) ?? [];

      addProduct(
        buildQuoteProductItem(
          product,
          addOnIds,
          {
            id: selectedColorId,
            name: selectedColorName,
          },
          { id: nextVariantId, name: product.variaciones?.find((v) => v.id === nextVariantId)?.name },
        ),
        false,
      );
    }
  }

  return (
    <div className="space-y-10 md:space-y-14">
      <ProductDetailHero product={product} catalogConfig={catalogConfig} />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-12">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <ProductDetailContent product={product} />
        </div>

        <aside className="order-first lg:order-none lg:col-start-2 lg:row-start-1 lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-5">
              <div className="border-b border-white/[0.08] pb-4">
                <p className="text-sm font-medium text-orange">
                  Solicitud de cotización
                </p>
                {product.isOutOfStock ? (
                  <p className="mt-2 text-xs leading-relaxed text-steel-mid">
                    Este equipo no se encuentra disponible actualmente.
                  </p>
                ) : null}
              </div>

              {!product.isOutOfStock ? (
                <ProductColorSection
                  selectedColorId={selectedColorId}
                  onColorChange={handleColorChange}
                  disableColors={product.disableColors}
                  disabledColors={product.disabledColors}
                  compact
                />
              ) : null}

              <ProductQuoteActions
                productId={product.id}
                productName={product.name}
                productCapacity={product.capacity}
                productImage={getProductImageSrc(product.images?.[0]) ?? null}
                addOns={product.addOns}
                variaciones={product.variaciones ?? []}
                selectedVariantId={selectedVariantId}
                onVariantChange={handleVariantChange}
                selectedColorId={selectedColorId}
                selectedColor={selectedColorName}
                isOutOfStock={product.isOutOfStock}
                compact
              />
            </div>
        </aside>
      </div>
    </div>
  );
}
