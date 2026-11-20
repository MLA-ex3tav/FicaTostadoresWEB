"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import ProductCard from "@/components/ProductCard";
import Reveal from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";
import { searchProducts } from "@/lib/catalog-search";
import {
  getCategoriesForCatalog,
  shouldShowCategoryForCatalog,
} from "@/lib/product-categories";
import {
  SIN_CATEGORIA_ID,
  SIN_CATEGORIA_LABEL,
  type CatalogConfig,
} from "@/lib/catalog-config";
import type { Product } from "@/lib/products";

interface ProductsCatalogProps {
  products: Product[];
  catalogConfig: CatalogConfig;
}

type SubFilterId = string | "all";

const PRODUCTS_PER_PAGE = 15;
const SEARCH_SUGGESTIONS = [
  "Tostador de café",
  "Avellanas",
  "Trigo",
  "Maní",
  "Harina tostada",
];

function parseCatalog(
  value: string | null,
  config: CatalogConfig,
): string | "all" {
  if (value === "all") {
    return "all";
  }

  if (value && config.catalogs.some((catalog) => catalog.id === value)) {
    return value;
  }

  return "all";
}

function parseSubFilter(
  value: string | null,
  catalogId: string,
  config: CatalogConfig,
): SubFilterId {
  if (!value || value === "all") {
    return "all";
  }

  if (value === SIN_CATEGORIA_ID) {
    return SIN_CATEGORIA_ID;
  }

  const validCategories = getCategoriesForCatalog(catalogId, config).map(
    (category) => category.id,
  );

  if (validCategories.includes(value)) {
    return value;
  }

  return "all";
}

function parsePage(value: string | null, totalPages: number): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  if (totalPages > 0 && parsed > totalPages) {
    return totalPages;
  }

  return parsed;
}

export default function ProductsCatalog({
  products,
  catalogConfig,
}: ProductsCatalogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const catalog = parseCatalog(searchParams.get("catalog"), catalogConfig);
  const subFilter = parseSubFilter(
    searchParams.get("tipo"),
    catalog,
    catalogConfig,
  );
  const query = (searchParams.get("q") ?? "").trim();

  const catalogProducts = useMemo(
    () =>
      catalog === "all"
        ? products
        : products.filter((product) => product.catalog === catalog),
    [catalog, products],
  );
  const subCategories = getCategoriesForCatalog(catalog, catalogConfig);
  const showSubFilters =
    catalog !== "all" && shouldShowCategoryForCatalog(catalog, catalogConfig);
  const uncategorizedCount = catalogProducts.filter(
    (product) => !product.category,
  ).length;

  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(searchParams.get("q") ?? "");
  const [lastQuery, setLastQuery] = useState(query);

  if (lastQuery !== query) {
    setLastQuery(query);
    setSearchValue(searchParams.get("q") ?? "");
  }

  useEffect(() => {
    const trimmed = searchValue.trim();

    if (trimmed === query) {
      return;
    }

    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      params.set("catalog", catalog);

      if (subFilter !== "all" && showSubFilters) {
        params.set("tipo", subFilter);
      }

      if (trimmed) {
        params.set("q", trimmed);
      }

      const nextQuery = params.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [
    searchValue,
    query,
    catalog,
    subFilter,
    showSubFilters,
    pathname,
    router,
  ]);

  useEffect(() => {
    if (!filterSheetOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFilterSheetOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [filterSheetOpen]);

  const searchOutcome = useMemo(
    () =>
      query ? searchProducts(catalogProducts, query, catalogConfig) : null,
    [catalogProducts, query, catalogConfig],
  );
  const searchedProducts = searchOutcome?.products ?? catalogProducts;

  const filtered =
    subFilter === "all" || !showSubFilters
      ? searchedProducts
      : subFilter === SIN_CATEGORIA_ID
        ? searchedProducts.filter((product) => !product.category)
        : searchedProducts.filter((product) => product.category === subFilter);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PRODUCTS_PER_PAGE));
  const page = parsePage(searchParams.get("pagina"), totalPages);
  const pageStart = (page - 1) * PRODUCTS_PER_PAGE;
  const paginatedProducts = filtered.slice(
    pageStart,
    pageStart + PRODUCTS_PER_PAGE,
  );

  const catalogOptions = [
    { id: "all", label: "Todos" },
    ...catalogConfig.catalogs,
  ];
  const subFilterOptions = [
    { id: "all", label: "Todos" },
    ...subCategories,
    ...(uncategorizedCount > 0
      ? [{ id: SIN_CATEGORIA_ID, label: SIN_CATEGORIA_LABEL }]
      : []),
  ];
  const subFilterListOptions = [
    { id: "all", label: "Todos los tipos", description: "" },
    ...subCategories,
    ...(uncategorizedCount > 0
      ? [{ id: SIN_CATEGORIA_ID, label: SIN_CATEGORIA_LABEL, description: "" }]
      : []),
  ];
  const activeCatalogLabel =
    catalogOptions.find((option) => option.id === catalog)?.label ?? "Todos";
  const activeSubFilterLabel =
    subFilter !== "all"
      ? (subFilterOptions.find((option) => option.id === subFilter)?.label ?? "")
      : "";
  const activeFilterCount =
    (catalog !== "all" ? 1 : 0) +
    (subFilter !== "all" && showSubFilters ? 1 : 0);

  const catalogCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      counts.set(product.catalog, (counts.get(product.catalog) ?? 0) + 1);
    }
    return counts;
  }, [products]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      const key = product.category || SIN_CATEGORIA_ID;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [products]);

  function updateSearchParams(
    nextCatalog: string,
    nextSubFilter: SubFilterId,
    nextPage = 1,
    nextQuery = query,
  ) {
    const params = new URLSearchParams();
    params.set("catalog", nextCatalog);

    if (nextSubFilter !== "all" && showSubFilters) {
      params.set("tipo", nextSubFilter);
    }

    const trimmedQuery = nextQuery.trim();
    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    }

    if (nextPage > 1) {
      params.set("pagina", String(nextPage));
    }

    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }

  function handleCatalogChange(nextCatalog: string) {
    updateSearchParams(nextCatalog, "all", 1);
  }

  function handleSubFilterChange(nextSubFilter: SubFilterId) {
    updateSearchParams(catalog, nextSubFilter, 1);
  }

  function handlePageChange(nextPage: number) {
    updateSearchParams(catalog, subFilter, nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10">
      <aside
        className="hidden lg:block"
        aria-label="Filtros del catálogo"
      >
        <div className="lg:sticky lg:top-24 space-y-8 border-r border-white/10 pr-5">
          <nav aria-label="Catálogos">
            <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3 mb-2 px-1">
              <Filter className="h-3.5 w-3.5 text-steel-mid" />
              <p className="text-sm font-medium text-steel-mid">Catálogos</p>
            </div>
            <ul className="space-y-1">
              {[{ id: "all", label: "Todos" }, ...catalogConfig.catalogs].map(
                (item) => {
                  const isActive = catalog === item.id;
                  const count =
                    item.id === "all"
                      ? products.length
                      : (catalogCounts.get(item.id) ?? 0);

                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => handleCatalogChange(item.id)}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors duration-150 cursor-pointer rounded-md focus-visible:outline-2 focus-visible:outline-orange",
                          isActive
                            ? "text-orange font-medium"
                            : "text-steel-mid hover:bg-white/[0.04] hover:text-white",
                        )}
                      >
                        <span className="truncate">{item.label}</span>
                        {isActive ? (
                          <Check
                            className="h-3.5 w-3.5 shrink-0 text-orange"
                            aria-hidden
                          />
                        ) : count > 0 ? (
                          <span className="text-xs tabular-nums text-steel-dark">
                            {count}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                },
              )}
            </ul>
          </nav>

          {showSubFilters ? (
            <nav aria-label="Tipos de equipo">
              <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3 mb-2 px-1">
                <Layers className="h-3.5 w-3.5 text-steel-mid" />
                <p className="text-sm font-medium text-steel-mid">Tipos de equipo</p>
              </div>
              <ul className="space-y-1">
                {subFilterListOptions.map(
                  (category) => {
                    const isActive = subFilter === category.id;
                    const count =
                      category.id === "all"
                        ? catalogProducts.length
                        : categoryCounts.get(category.id) ?? 0;

                    return (
                      <li key={category.id}>
                        <button
                          type="button"
                          onClick={() =>
                            handleSubFilterChange(category.id as SubFilterId)
                          }
                          aria-pressed={isActive}
                          className={cn(
                            "flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors duration-150 cursor-pointer rounded-md focus-visible:outline-2 focus-visible:outline-orange",
                            isActive
                              ? "text-orange font-medium"
                              : "text-steel-mid hover:bg-white/[0.04] hover:text-white",
                          )}
                        >
                          <span className="truncate">{category.label}</span>
                          {isActive ? (
                            <Check
                              className="h-3.5 w-3.5 shrink-0 text-orange"
                              aria-hidden
                            />
                          ) : count > 0 ? (
                            <span className="text-xs tabular-nums text-steel-dark">
                              {count}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  },
                )}
              </ul>
            </nav>
          ) : null}
        </div>
      </aside>

      <div className="min-w-0 w-full">
        <Reveal>
          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              updateSearchParams(catalog, subFilter, 1, searchValue);
            }}
            className="mb-6"
          >
            <label htmlFor="catalog-search" className="sr-only">
              Buscar equipos por nombre o uso
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-dark"
                aria-hidden
              />
              <input
                id="catalog-search"
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Buscar equipo o uso"
                autoComplete="off"
                enterKeyHint="search"
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-11 pr-12 text-sm text-white placeholder:text-steel-dark transition-colors focus:border-orange/50 focus:outline-none focus:ring-1 focus:ring-orange/50 [&::-webkit-search-cancel-button]:hidden"
              />
              {searchValue ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchValue("");
                    updateSearchParams(catalog, subFilter, 1, "");
                  }}
                  className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-steel-mid transition-colors hover:bg-white/[0.06] hover:text-white"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            {query && searchOutcome?.approximate ? (
              <p className="mt-2 text-xs text-steel-dark">
                Resultados aproximados para «{query}».
              </p>
            ) : null}
          </form>
        </Reveal>

        {/* Filtros móvil: botón + panel inferior */}
        <Reveal className="lg:hidden">
          <div className="mb-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFilterSheetOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={filterSheetOpen}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border border-white/15 px-4 text-sm font-medium text-white transition-colors hover:border-orange"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtrar
              {activeFilterCount > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange px-1.5 text-xs font-bold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-relaxed text-white">
                {activeCatalogLabel}
                {activeSubFilterLabel ? ` · ${activeSubFilterLabel}` : ""}
              </p>
              <p className="truncate text-xs text-steel-dark">
                {filtered.length} {filtered.length === 1 ? "equipo" : "equipos"}
                {query ? ` · «${query}»` : ""}
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.08} className="hidden lg:block">
          <p className="mb-6 text-base text-steel-dark">
            {filtered.length} {filtered.length === 1 ? "equipo" : "equipos"}
            {query ? (
              <>
                {" "}
                para <span className="text-white">«{query}»</span>
              </>
            ) : null}
            {totalPages > 1 ? (
              <>
                {" "}
                · Página {page} de {totalPages}
              </>
            ) : null}
          </p>
        </Reveal>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-14 text-center">
            <p className="text-lg font-semibold text-white">
              No encontramos equipos
              {query ? <> para «{query}»</> : null}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-steel-mid">
              Prueba describiendo lo que necesitas, por ejemplo “tostador de
              café”, “avellanas” o “máquina para moler trigo”.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {SEARCH_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setSearchValue(suggestion)}
                  className="rounded-md border border-white/10 px-3 py-1 text-xs text-steel-mid transition-colors hover:border-white/25 hover:text-white"
                >
                  {suggestion}
                </button>
              ))}
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchValue("");
                    updateSearchParams(catalog, subFilter, 1, "");
                  }}
                  className="rounded-md border border-white/15 px-3 py-1 text-xs font-medium text-steel-light transition-colors hover:bg-white/[0.04]"
                >
                  Limpiar búsqueda
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div
            key={`${catalog}-${subFilter}-${page}-${query}`}
            className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3"
          >
            {paginatedProducts.map((product, index) => (
              <div
                key={product.id}
                className="catalog-card-enter h-full"
                style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
              >
                <ProductCard product={product} priority={index < 3} />
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 ? (
          <nav
            className="mt-12 flex items-center justify-center gap-2 select-none"
            aria-label="Paginación del catálogo"
          >
            {page > 1 ? (
              <button
                type="button"
                onClick={() => handlePageChange(page - 1)}
                className="inline-flex h-11 items-center gap-1 rounded-md px-3 text-sm font-medium text-steel-mid transition-colors hover:bg-white/[0.05] hover:text-white sm:h-9"
                aria-label={`Ir a página anterior (${page - 1})`}
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                <span>{page - 1}</span>
              </button>
            ) : (
              <span className="w-12" aria-hidden="true" />
            )}

            <div className="flex h-11 min-w-11 items-center sm:h-9 sm:min-w-9 justify-center rounded-xl bg-white/[0.08] px-3.5 text-sm font-semibold text-white shadow-sm ring-1 ring-white/10">
              {page}
            </div>

            {page < totalPages ? (
              <button
                type="button"
                onClick={() => handlePageChange(page + 1)}
                className="inline-flex h-11 items-center gap-1 rounded-md px-3 text-sm font-medium text-steel-mid transition-colors hover:bg-white/[0.05] hover:text-white sm:h-9"
                aria-label={`Ir a página siguiente (${page + 1})`}
              >
                <span>{page + 1}</span>
                <ChevronRight className="h-4 w-4" strokeWidth={2} />
              </button>
            ) : (
              <span className="w-12" aria-hidden="true" />
            )}
          </nav>
        ) : null}
      </div>

      {filterSheetOpen ? (
        <div
          className="fixed inset-0 z-[200] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Filtrar equipos"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setFilterSheetOpen(false)}
            aria-hidden="true"
          />

          <div className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-xl border-t border-white/10 bg-[#121519] animate-in slide-in-from-bottom duration-200">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-orange" />
                <h2 className="text-base font-semibold text-white">
                  Filtrar equipos
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setFilterSheetOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] text-steel-mid transition-colors hover:bg-white/[0.06] hover:text-white"
                aria-label="Cerrar filtros"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-7 overflow-y-auto overscroll-contain px-5 py-5">
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-steel-mid" />
                  <p className="text-sm font-medium text-steel-mid">
                    Catálogos
                  </p>
                </div>
                <ul className="space-y-1.5">
                  {catalogOptions.map((item) => {
                    const isActive = catalog === item.id;
                    const count =
                      item.id === "all"
                        ? products.length
                        : (catalogCounts.get(item.id) ?? 0);

                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => handleCatalogChange(item.id)}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "flex min-h-12 w-full items-center justify-between gap-3 rounded-md px-3.5 text-left text-sm transition-colors",
                            isActive
                              ? "font-semibold text-orange"
                              : "text-steel-mid hover:bg-white/[0.04] hover:text-white",
                          )}
                        >
                          <span className="truncate">{item.label}</span>
                          {isActive ? (
                            <Check className="h-4 w-4 shrink-0 text-orange" />
                          ) : count > 0 ? (
                            <span className="text-xs tabular-nums text-steel-dark">
                              {count}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>

              {showSubFilters ? (
                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5 text-steel-mid" />
                    <p className="text-sm font-medium text-steel-mid">
                      Tipos de equipo
                    </p>
                  </div>
                  <ul className="space-y-1.5">
                    {subFilterOptions.map((category) => {
                      const isActive = subFilter === category.id;
                      const count =
                        category.id === "all"
                          ? catalogProducts.length
                          : (categoryCounts.get(category.id) ?? 0);

                      return (
                        <li key={category.id}>
                          <button
                            type="button"
                            aria-pressed={isActive}
                            onClick={() =>
                              handleSubFilterChange(category.id as SubFilterId)
                            }
                            className={cn(
                              "flex min-h-12 w-full items-center justify-between gap-3 rounded-md px-3.5 text-left text-sm transition-colors",
                              isActive
                                ? "font-semibold text-orange"
                                : "text-steel-mid hover:bg-white/[0.04] hover:text-white",
                            )}
                          >
                            <span className="truncate">{category.label}</span>
                            {isActive ? (
                              <Check className="h-4 w-4 shrink-0 text-orange" />
                            ) : count > 0 ? (
                              <span className="text-xs tabular-nums text-steel-dark">
                                {count}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-white/[0.08] px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="flex gap-3">
                {activeFilterCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => handleCatalogChange("all")}
                    className="inline-flex h-12 shrink-0 items-center justify-center rounded-md border border-white/[0.1] px-5 text-sm font-medium text-steel-mid transition-colors hover:bg-white/[0.04] hover:text-white"
                  >
                    Limpiar
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setFilterSheetOpen(false)}
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-md bg-orange px-5 text-sm font-semibold text-white transition-colors hover:bg-orange-hover"
                >
                  Ver {filtered.length} {filtered.length === 1 ? "equipo" : "equipos"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
