"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, LayoutGrid, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  defaultCatalogConfig,
  type CatalogConfig,
} from "@/lib/catalog-config";
import { slugifyProductId } from "@/lib/product-utils";
import { useFirebaseAuth } from "@/lib/firebase-auth";

function uniqueCatalogId(label: string, config: CatalogConfig): string {
  const base = slugifyProductId(label) || "catalogo";
  let candidate = base;
  let index = 2;

  while (config.catalogs.some((catalog) => catalog.id === candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }

  return candidate;
}

export default function CatalogAdminPanel() {
  const { adminFetch } = useFirebaseAuth();
  const [config, setConfig] = useState<CatalogConfig>(defaultCatalogConfig);
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void adminFetch("/api/admin/catalog-config")
      .then((response) => response.json())
      .then((data: CatalogConfig) => setConfig(data))
      .catch(() => setError("No se pudo cargar la configuración."))
      .finally(() => setLoading(false));
  }, [adminFetch]);

  async function saveConfig(nextConfig: CatalogConfig): Promise<boolean> {
    setSaving(true);
    setError("");

    try {
      const response = await adminFetch("/api/admin/catalog-config", {
        method: "PUT",
        body: JSON.stringify(nextConfig),
      });

      const data = (await response.json()) as CatalogConfig & { error?: string };

      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar.");
        return false;
      }

      setConfig(data);
      return true;
    } catch {
      setError("Error de red al guardar la configuración.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();

    const label = newLabel.trim();

    if (!label) {
      return;
    }

    const id = uniqueCatalogId(label, config);

    const nextConfig: CatalogConfig = {
      ...config,
      catalogs: [...config.catalogs, { id, label }],
    };

    const ok = await saveConfig(nextConfig);

    if (ok) {
      setNewLabel("");
    }
  }

  async function handleSaveEdit(catalogId: string) {
    const label = editLabel.trim();

    if (!label) {
      return;
    }

    const nextConfig: CatalogConfig = {
      ...config,
      catalogs: config.catalogs.map((catalog) =>
        catalog.id === catalogId ? { ...catalog, label } : catalog,
      ),
    };

    const ok = await saveConfig(nextConfig);

    if (ok) {
      setEditingId(null);
      setEditLabel("");
    }
  }

  async function handleDelete(catalogId: string) {
    const catalog = config.catalogs.find((entry) => entry.id === catalogId);
    const affectedCategories = config.categories.filter(
      (category) => category.catalogId === catalogId,
    );

    const message =
      affectedCategories.length > 0
        ? `¿Eliminar el catálogo «${catalog?.label ?? catalogId}» y sus ${affectedCategories.length} categorías asociadas?`
        : `¿Eliminar el catálogo «${catalog?.label ?? catalogId}»?`;

    if (!window.confirm(message)) {
      return;
    }

    const nextConfig: CatalogConfig = {
      ...config,
      catalogs: config.catalogs.filter((entry) => entry.id !== catalogId),
      categories: config.categories.filter(
        (category) => category.catalogId !== catalogId,
      ),
    };

    await saveConfig(nextConfig);
  }

  if (loading) {
    return <p className="text-xs text-steel-mid">Cargando catálogos…</p>;
  }

  return (
    <div className="space-y-8">
      {/* Create Catalog Form Card */}
      <form
        onSubmit={handleCreate}
        className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 shadow-xl space-y-5"
      >
        <div className="flex items-center gap-3.5 border-b border-white/[0.06] pb-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-orange">
            <LayoutGrid className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              Nuevo Catálogo
            </h3>
            <p className="mt-0.5 text-xs text-steel-dark">
              Línea principal de productos (café, frutos secos, cacao, etc.)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[14rem] flex-1">
            <label
              htmlFor="catalog-label"
              className="text-[11px] font-medium uppercase tracking-[0.2em] text-steel-dark block mb-1.5"
            >
              Nombre de la línea
            </label>
            <input
              id="catalog-label"
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              placeholder="Ej. Tostadores de Cacao"
              className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-xs text-white placeholder:text-steel-dark focus:border-orange/50 focus:outline-none focus:ring-1 focus:ring-orange/50 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange px-5 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-orange-hover active:scale-[0.98] disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Crear catálogo
          </button>
        </div>
        <p className="text-[11px] text-steel-dark">
          El identificador de URL se generará automáticamente a partir del nombre ingresado.
        </p>
      </form>

      {/* Catalog Table */}
      {config.catalogs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] px-6 py-12 text-center">
          <p className="text-base font-semibold text-white">
            Aún no hay catálogos creados
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-steel-mid">
            Cree el primero en el formulario superior para comenzar a organizar sus equipos por línea.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121519]/70 backdrop-blur-xl shadow-xl">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-white/[0.08] bg-white/[0.03] text-xs font-semibold uppercase tracking-wider text-steel-mid">
                <tr>
                  <th className="min-w-[220px] px-4 py-3.5 font-semibold">Nombre</th>
                  <th className="w-44 px-4 py-3.5 font-semibold whitespace-nowrap">Identificador</th>
                  <th className="w-40 px-4 py-3.5 font-semibold whitespace-nowrap">Categorías</th>
                  <th className="w-48 px-4 py-3.5 font-semibold text-right pr-6 whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {config.catalogs.map((catalog) => {
                  const categoryCount = config.categories.filter(
                    (category) => category.catalogId === catalog.id,
                  ).length;

                  return (
                    <tr
                      key={catalog.id}
                      className="transition-colors hover:bg-white/[0.03]"
                    >
                      <td className="min-w-[220px] px-4 py-3.5">
                        {editingId === catalog.id ? (
                          <input
                            value={editLabel}
                            onChange={(event) => setEditLabel(event.target.value)}
                            className="h-9 w-full rounded-lg border border-white/[0.12] bg-black/40 px-3 text-xs text-white focus:border-orange/50 focus:outline-none focus:ring-1 focus:ring-orange/50"
                            autoFocus
                          />
                        ) : (
                          <span className="font-medium text-white text-sm">
                            {catalog.label}
                          </span>
                        )}
                      </td>
                      <td className="w-44 px-4 py-3.5 whitespace-nowrap font-mono text-xs text-steel-mid">
                        {catalog.id}
                      </td>
                      <td className="w-40 px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${
                            categoryCount > 0
                              ? "border-white/[0.08] bg-white/[0.02] text-steel-light"
                              : "border-white/[0.04] text-steel-dark"
                          }`}
                        >
                          {categoryCount === 0
                            ? "Sin categorías"
                            : `${categoryCount} categoría${categoryCount === 1 ? "" : "s"}`}
                        </span>
                      </td>
                      <td className="w-48 px-4 py-3.5 text-right pr-6 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {editingId === catalog.id ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void handleSaveEdit(catalog.id)}
                                disabled={saving}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Guardar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditLabel("");
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-steel-light transition-all hover:border-white/[0.16] hover:text-white"
                              >
                                <X className="h-3.5 w-3.5" />
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(catalog.id);
                                  setEditLabel(catalog.label);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-orange/30 bg-orange/10 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-orange transition-all hover:bg-orange/20"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDelete(catalog.id)}
                                disabled={saving}
                                className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-red-400 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Eliminar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
