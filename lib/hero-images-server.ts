import {
  getCatalogLabel,
  getCategoryLabel,
} from "@/lib/catalog-config";
import { getCatalogConfig } from "@/lib/catalog-config-server";
import type { HeroProductBanner } from "@/lib/images";
import {
  CAROUSEL_DEFAULT_FOCUS,
  getCarouselImageSrc,
} from "@/lib/product-images";
import { loadProducts } from "@/lib/products-repository";
import type { Product } from "@/lib/products";

const MAX_HERO_BANNERS = 6;

export async function getHeroProductBanners(): Promise<HeroProductBanner[]> {
  const [products, catalogConfig] = await Promise.all([
    loadProducts(),
    getCatalogConfig(),
  ]);

  const withImage = products.filter((product) => {
    const src = getCarouselImageSrc(product.images?.[0]);
    return Boolean(src);
  });

  const featured = withImage.filter((product) => product.isFeatured);
  const selected = [
    ...featured,
    ...withImage.filter((product) => !product.isFeatured),
  ].slice(0, MAX_HERO_BANNERS);

  return selected.map((product: Product) => {
    const primaryImage = product.images?.[0];

    return {
      productId: product.id,
      src: getCarouselImageSrc(primaryImage) ?? "",
      name: product.name,
      capacity: product.capacity,
      description: product.description,
      categoryLabel: getCategoryLabel(product.category, catalogConfig),
      catalogLabel: getCatalogLabel(product.catalog, catalogConfig),
      carouselFocus: primaryImage?.carousel.focus ?? CAROUSEL_DEFAULT_FOCUS,
    };
  });
}
