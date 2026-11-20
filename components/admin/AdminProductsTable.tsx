"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState } from "react";
import { Check, Eye, ImageIcon, Layers, Package, Pencil, Plus, Search, Square, Trash2, X } from "lucide-react";
import DeleteProductButton from "@/components/admin/DeleteProductButton";
import { getCatalogLabel, type CatalogConfig } from "@/lib/catalog-config";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { getCategoryLabel } from "@/lib/product-categories";
import type { Product } from "@/lib/products";

interface AdminProductsTableProps {
  products: Product[];
  catalogConfig: CatalogConfig;
}

export default function AdminProductsTable({
  products,
  catalogConfig,
}: AdminProductsTableProps) {
  const router = useRouter();
  const { adminFetch } = useFirebaseAuth();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "in-stock" | "out-of-stock" | "featured" | "with-variations"
  >("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [bulkLoading, setBulkLoading] = useState(false);

  const filteredProducts = useMemo(() => {
    let result = products;

    if (statusFilter === "in-stock") {
      result = result.filter((p) => !p.isOutOfStock);
    } else if (statusFilter === "out-of-stock") {
      result = result.filter((p) => Boolean(p.isOutOfStock));
    } else if (statusFilter === "featured") {
      result = result.filter((p) => Boolean(p.isFeatured));
    } else if (statusFilter === "with-variations") {
      result = result.filter(
        (p) => Array.isArray(p.variaciones) && p.variaciones.length > 0,
      );
    }

    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return result;
    }

    return result.filter((product) => {
      const catalogLabel = getCatalogLabel(product.catalog, catalogConfig);
      const categoryLabel = getCategoryLabel(
        product.category,
        catalogConfig,
      );
      const variacionesText =
        product.variaciones?.map((v) => v.name).join(" ") ?? "";

      return [
        product.name,
        product.id,
        catalogLabel,
        categoryLabel,
        product.capacity,
        variacionesText,
      ].some((value) => String(value ?? "").toLowerCase().includes(normalized));
    });
  }, [products, catalogConfig, query, statusFilter]);

  const filteredIds = useMemo(
    () => filteredProducts.map((product) => product.id),
    [filteredProducts],
  );

  const groupedProducts = useMemo(() => {
    const catalogOrder = new Map(
      catalogConfig.catalogs.map((catalog, index) => [catalog.id, index]),
    );
    const categoryOrder = new Map(
      catalogConfig.categories.map((category, index) => [category.id, index]),
    );

    const groups = new Map<
      string,
      {
        key: string;
        catalogId: string;
        categoryId: string;
        catalogLabel: string;
        categoryLabel: string;
        products: Product[];
      }
    >();

    for (const product of filteredProducts) {
      const key = `${product.catalog}::${product.category}`;
      let group = groups.get(key);

      if (!group) {
        group = {
          key,
          catalogId: product.catalog,
          categoryId: product.category,
          catalogLabel: getCatalogLabel(product.catalog, catalogConfig),
          categoryLabel: getCategoryLabel(product.category, catalogConfig),
          products: [],
        };
        groups.set(key, group);
      }

      group.products.push(product);
    }

    return [...groups.values()].sort((a, b) => {
      const catalogDiff =
        (catalogOrder.get(a.catalogId) ?? 999) -
        (catalogOrder.get(b.catalogId) ?? 999);

      if (catalogDiff !== 0) {
        return catalogDiff;
      }

      const categoryDiff =
        (categoryOrder.get(a.categoryId) ?? 999) -
        (categoryOrder.get(b.categoryId) ?? 999);

      return categoryDiff !== 0
        ? categoryDiff
        : a.categoryLabel.localeCompare(b.categoryLabel, "es");
    });
  }, [filteredProducts, catalogConfig]);

  const selectedVisibleCount = filteredIds.filter((id) =>
    selectedIds.has(id),
  ).length;
  const allVisibleSelected =
    filteredIds.length > 0 && selectedVisibleCount === filteredIds.length;

  function toggleAll() {
    setSelectedIds((current) => {
      const next = new Set(current);

      for (const id of filteredIds) {
        if (allVisibleSelected) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }

      return next;
    });
  }

  function toggleId(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function toggleGroup(ids: string[]) {
    setSelectedIds((current) => {
      const next = new Set(current);
      const allSelected = ids.every((id) => next.has(id));

      for (const id of ids) {
        if (allSelected) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }

      return next;
    });
  }

  async function handleBulkDelete() {
    const count = selectedIds.size;

    if (count === 0) {
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar ${count} producto${count === 1 ? "" : "s"} del catálogo? Esta acción no se puede deshacer.`,
    );

    if (!confirmed) {
      return;
    }

    setBulkLoading(true);

    try {
      const response = await adminFetch("/api/admin/products/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        window.alert(data.error ?? "No se pudieron eliminar los productos.");
        return;
      }

      setSelectedIds(new Set());
      router.refresh();
    } finally {
      setBulkLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Search and Selection Tools */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[16rem] flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-dark"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Buscar entre ${products.length} productos…`}
            aria-label="Buscar productos"
            className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-10 pr-10 text-xs text-white placeholder:text-steel-dark focus:border-orange/50 focus:outline-none focus:ring-1 focus:ring-orange/50 transition-all"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpiar búsqueda"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-steel-dark transition-colors hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
              statusFilter === "all"
                ? "bg-orange text-white"
                : "text-steel-mid hover:text-white"
            }`}
          >
            Todos ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("in-stock")}
            className={`inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
              statusFilter === "in-stock"
                ? "bg-emerald-600 text-white"
                : "text-steel-mid hover:text-emerald-400"
            }`}
          >
            Disponibles ({products.filter((p) => !p.isOutOfStock).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("out-of-stock")}
            className={`inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
              statusFilter === "out-of-stock"
                ? "bg-red-600 text-white"
                : "text-steel-mid hover:text-red-400"
            }`}
          >
            Agotados ({products.filter((p) => p.isOutOfStock).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("featured")}
            className={`inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
              statusFilter === "featured"
                ? "bg-orange text-white"
                : "text-steel-mid hover:text-orange"
            }`}
          >
            Destacados ({products.filter((p) => p.isFeatured).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("with-variations")}
            className={`inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
              statusFilter === "with-variations"
                ? "bg-orange text-white"
                : "text-steel-mid hover:text-orange"
            }`}
          >
            Con Variaciones ({products.filter((p) => p.variaciones && p.variaciones.length > 0).length})
          </button>
        </div>

        <button
          type="button"
          onClick={toggleAll}
          disabled={filteredProducts.length === 0}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 text-xs font-semibold uppercase tracking-wider text-steel-light transition-all hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-white disabled:opacity-40"
        >
          {allVisibleSelected ? (
            <Check className="h-4 w-4 text-orange" aria-hidden />
          ) : (
            <Square className="h-4 w-4 text-steel-dark" aria-hidden />
          )}
          <span>{allVisibleSelected ? "Quitar selección" : "Seleccionar todos"}</span>
        </button>
      </div>

      {/* Selected Items Action Bar */}
      {selectedIds.size > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange/30 bg-orange/10 px-5 py-3 shadow-md animate-in fade-in duration-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-steel-light flex items-center gap-2">
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange text-white text-[11px] font-bold px-1.5">
              {selectedIds.size}
            </span>
            <span>{selectedIds.size === 1 ? "producto seleccionado" : "productos seleccionados"}</span>
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              disabled={bulkLoading}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] px-3.5 text-xs font-semibold uppercase tracking-wider text-steel-mid transition-colors hover:border-white/20 hover:text-white disabled:opacity-50"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={() => void handleBulkDelete()}
              disabled={bulkLoading}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-4 text-xs font-semibold uppercase tracking-wider text-white transition-all hover:bg-red-500 shadow-sm disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              <span>{bulkLoading ? "Eliminando…" : `Eliminar (${selectedIds.size})`}</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* Empty State */}
      {filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] px-6 py-14 text-center">
          {query ? (
            <>
              <p className="text-lg font-semibold uppercase tracking-wide text-white">
                Sin resultados
              </p>
              <p className="mt-1.5 text-xs text-steel-mid">
                No hay productos que coincidan con «<strong className="text-white font-medium">{query}</strong>».
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.06] text-steel-mid">
                <Package className="h-6 w-6" aria-hidden />
              </div>
              <p className="mt-4 text-lg font-semibold uppercase tracking-wide text-white">
                Aún no hay productos
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-steel-mid">
                Agregue su primer equipo para comenzar a estructurar el catálogo.
              </p>
              <Link
                href="/admin/productos/nuevo"
                className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-orange px-5 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-orange-hover active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Agregar producto
              </Link>
            </>
          )}
        </div>
      ) : (
        /* Products Table - Enclosed in Glass Card Container with guaranteed min-width */
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121519]/70 backdrop-blur-xl shadow-xl">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="border-b border-white/[0.08] bg-white/[0.03] text-xs font-semibold uppercase tracking-wider text-steel-mid">
                <tr>
                  <th className="w-12 px-4 py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAll}
                      aria-label="Seleccionar todos los productos"
                      className="size-4 accent-orange cursor-pointer rounded border-white/20"
                    />
                  </th>
                  <th className="px-4 py-3.5 font-semibold">Producto</th>
                  <th className="w-36 px-4 py-3.5 font-semibold whitespace-nowrap">Estado</th>
                  <th className="w-28 px-4 py-3.5 font-semibold whitespace-nowrap">Imágenes</th>
                  <th className="w-52 px-4 py-3.5 font-semibold text-right pr-6 whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {groupedProducts.map((group) => {
                  const groupIds = group.products.map((product) => product.id);
                  const groupSelected =
                    groupIds.length > 0 &&
                    groupIds.every((id) => selectedIds.has(id));

                  return (
                    <Fragment key={group.key}>
                      <tr className="bg-[#171a1f]">
                        <td colSpan={5} className="px-4 py-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md border border-orange/30 bg-orange/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-orange">
                              {group.catalogLabel}
                            </span>
                            <span className="text-sm font-semibold text-white">
                              {group.categoryLabel}
                            </span>
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/[0.06] px-1.5 text-[11px] font-medium text-steel-mid">
                              {group.products.length}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleGroup(groupIds)}
                              className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-steel-dark transition-colors hover:bg-white/[0.04] hover:text-orange"
                            >
                              {groupSelected ? (
                                <Check className="h-3 w-3" aria-hidden />
                              ) : (
                                <Square className="h-3 w-3" aria-hidden />
                              )}
                              {groupSelected ? "Quitar selección" : "Seleccionar"}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {group.products.map((product) => {
                        const thumbnail =
                          product.images?.[0]?.product?.src ??
                          product.images?.[0]?.carousel?.src ??
                          null;
                        const imageCount = product.images?.length ?? 0;
                        const selected = selectedIds.has(product.id);

                        return (
                          <tr
                            key={product.id}
                            className={`transition-colors hover:bg-white/[0.03] ${
                              selected ? "bg-orange/[0.05]" : ""
                            }`}
                          >
                            <td className="px-4 py-3.5 text-center">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleId(product.id)}
                                aria-label={`Seleccionar ${product.name}`}
                                className="size-4 accent-orange cursor-pointer rounded border-white/20"
                              />
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3.5">
                                {thumbnail ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img
                                    src={thumbnail}
                                    alt={product.name}
                                    className="h-11 w-14 shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.02] object-cover"
                                  />
                                ) : (
                                  <span className="grid h-11 w-14 shrink-0 place-items-center rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02] text-steel-dark">
                                    <ImageIcon className="h-4 w-4 opacity-40" aria-hidden />
                                  </span>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Link
                                      href={`/admin/productos/${product.id}`}
                                      className="font-medium text-white hover:text-orange transition-colors block text-sm"
                                      title={product.name}
                                    >
                                      {product.name}
                                    </Link>
                                    {product.variaciones && product.variaciones.length > 0 ? (
                                      <span className="inline-flex items-center gap-1 rounded-md border border-orange/30 bg-orange/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-orange">
                                        <Layers className="h-3 w-3" />
                                        {product.variaciones.length} {product.variaciones.length === 1 ? "variación" : "variaciones"}
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="font-mono text-[11px] text-steel-dark mt-0.5">
                                    {product.id}
                                  </p>
                                  {product.variaciones && product.variaciones.length > 0 ? (
                                    <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                                      {product.variaciones.map((v) => (
                                        <span
                                          key={v.id || v.name}
                                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2 py-0.5 text-xs text-steel-light"
                                        >
                                          <span className="font-medium">{v.name}</span>
                                          {typeof v.price === "number" && v.price > 0 ? (
                                            <span className="font-mono text-emerald-400 font-semibold">
                                              ${v.price.toLocaleString("es-CL")}
                                            </span>
                                          ) : null}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td className="w-36 px-4 py-3.5 whitespace-nowrap">
                              <div className="flex flex-wrap gap-1.5 items-center">
                                {product.isOutOfStock ? (
                                  <span className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-red-400">
                                    Agotado
                                  </span>
                                ) : (
                                  <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-emerald-400">
                                    En Stock
                                  </span>
                                )}

                                {product.disableColors ? (
                                  <span className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 text-[10px] text-steel-dark">
                                    Sin color
                                  </span>
                                ) : product.disabledColors && product.disabledColors.length > 0 ? (
                                  <span className="rounded-lg border border-orange/20 bg-orange/5 px-2 py-0.5 text-[10px] text-orange">
                                    {product.disabledColors.length} col. bloqueados
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="w-28 px-4 py-3.5 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 text-xs text-steel-mid">
                                <ImageIcon className="h-3.5 w-3.5 text-steel-dark" />
                                {imageCount > 0
                                  ? `${imageCount} foto${imageCount === 1 ? "" : "s"}`
                                  : "Sin fotos"}
                              </span>
                            </td>
                            <td className="w-52 px-4 py-3.5 text-right pr-6 whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  href={`/admin/productos/${product.id}`}
                                  className="inline-flex items-center gap-1 rounded-lg border border-orange/30 bg-orange/10 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-orange transition-all hover:bg-orange/20"
                                  title="Editar producto"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Editar
                                </Link>
                                <Link
                                  href={`/productos/${product.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-steel-light transition-all hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-white"
                                  title="Ver en tienda"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Ver
                                </Link>
                                <DeleteProductButton
                                  productId={product.id}
                                  productName={product.name}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
