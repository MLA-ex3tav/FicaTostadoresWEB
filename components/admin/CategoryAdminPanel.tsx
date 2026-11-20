"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import CustomSelect from "@/components/CustomSelect";
import {
  defaultCatalogConfig,
  getCatalogLabel,
  type CatalogConfig,
} from "@/lib/catalog-config";
import { slugifyProductId } from "@/lib/product-utils";
import { useFirebaseAuth } from "@/lib/firebase-auth";

function uniqueCategoryId(label: string, config: CatalogConfig): string {
  const base = slugifyProductId(label) || "categoria";
  let candidate = base;
  let index = 2;

  while (config.categories.some((category) => category.id === candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }

  return candidate;
}

export default function CategoryAdminPanel() {
  const { adminFetch } = useFirebaseAuth();
  const [config, setConfig] = useState<CatalogConfig>(defaultCatalogConfig);
  const [catalogId, setCatalogId] = useState("cafe");
  const [newLabel, setNewLabel] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void adminFetch("/api/admin/catalog-config")
      .then((response) => response.json())
      .then((data: CatalogConfig) => {
        setConfig(data);
        setCatalogId(data.catalogs[0]?.id ?? "cafe");
      })
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
      setError("Error de conexión al guardar.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const label = newLabel.trim();

    if (!label) {
      setError("Ingrese un nombre para la categoría.");
      return;
    }

    if (!catalogId) {
      setError("Seleccione un catálogo.");
      return;
    }

    const id = uniqueCategoryId(label, config);
    const nextConfig: CatalogConfig = {
      ...config,
      categories: [
        ...config.categories,
        {
          id,
          catalogId,
          label,
          description: newDescription.trim(),
        },
      ],
    };

    const saved = await saveConfig(nextConfig);
    if (saved) {
      setNewLabel("");
      setNewDescription("");
    }
  }

  async function handleSaveEdit(categoryId: string) {
    const label = editLabel.trim();

    if (!label) {
      setError("El nombre no puede estar vacío.");
      return;
    }

    const nextConfig: CatalogConfig = {
      ...config,
      categories: config.categories.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              label,
              description: editDescription.trim(),
            }
          : category,
      ),
    };

    const saved = await saveConfig(nextConfig);
    if (saved) {
      setEditingId(null);
      setEditLabel("");
      setEditDescription("");
    }
  }

  async function handleDelete(categoryId: string) {
    const category = config.categories.find((item) => item.id === categoryId);
    if (!category) {
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar la categoría "${category.label}"?`,
    );

    if (!confirmed) {
      return;
    }

    const nextConfig: CatalogConfig = {
      ...config,
      categories: config.categories.filter((item) => item.id !== categoryId),
    };

    await saveConfig(nextConfig);
  }

  const catalogOptions = useMemo(
    () =>
      config.catalogs.map((catalog) => ({
        value: catalog.id,
        label: catalog.label,
      })),
    [config.catalogs],
  );

  if (loading) {
    return <p className="text-xs text-steel-mid">Cargando categorías…</p>;
  }

  return (
    <div className="space-y-8">
      {/* Create Category Form Card */}
      <form
        onSubmit={handleCreate}
        className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 shadow-xl space-y-5"
      >
        <div className="flex items-center gap-3.5 border-b border-white/[0.06] pb-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-orange">
            <Tag className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              Nueva Categoría
            </h3>
            <p className="mt-0.5 text-xs text-steel-dark">
              Tipo de máquina o equipo asociado a una línea de productos
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="category-catalog"
              className="text-[11px] font-medium uppercase tracking-[0.2em] text-steel-dark block mb-1.5"
            >
              Catálogo Asignado
            </label>
            <CustomSelect
              id="category-catalog"
              value={catalogId}
              onChange={setCatalogId}
              options={catalogOptions}
              aria-label="Catálogo"
            />
          </div>
          <div>
            <label
              htmlFor="category-label"
              className="text-[11px] font-medium uppercase tracking-[0.2em] text-steel-dark block mb-1.5"
            >
              Nombre de la Categoría
            </label>
            <input
              id="category-label"
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              placeholder="Ej. Tostadores Comerciales"
              className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-xs text-white placeholder:text-steel-dark focus:border-orange/50 focus:outline-none focus:ring-1 focus:ring-orange/50 transition-all"
            />
          </div>
          <div className="md:col-span-2">
            <label
              htmlFor="category-description"
              className="text-[11px] font-medium uppercase tracking-[0.2em] text-steel-dark block mb-1.5"
            >
              Descripción (opcional)
            </label>
            <textarea
              id="category-description"
              rows={2}
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
              placeholder="Qué características o capacidades agrupa esta categoría."
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-xs text-white placeholder:text-steel-dark focus:border-orange/50 focus:outline-none focus:ring-1 focus:ring-orange/50 transition-all resize-none"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange px-5 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-orange-hover active:scale-[0.98] disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Crear categoría
          </button>
        </div>
      </form>

      {/* Category Table */}
      {config.categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] px-6 py-12 text-center">
          <p className="text-base font-semibold text-white">
            Aún no hay categorías creadas
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-steel-mid">
            Cree la primera en el formulario superior para organizar y filtrar los equipos.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121519]/70 backdrop-blur-xl shadow-xl">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="border-b border-white/[0.08] bg-white/[0.03] text-xs font-semibold uppercase tracking-wider text-steel-mid">
                <tr>
                  <th className="w-44 px-4 py-3.5 font-semibold whitespace-nowrap">Catálogo</th>
                  <th className="min-w-[260px] px-4 py-3.5 font-semibold">Nombre & Descripción</th>
                  <th className="w-40 px-4 py-3.5 font-semibold whitespace-nowrap">Identificador</th>
                  <th className="w-48 px-4 py-3.5 font-semibold text-right pr-6 whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {config.categories.map((category) => (
                  <tr
                    key={category.id}
                    className="transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="w-44 px-4 py-3.5 whitespace-nowrap">
                      <span className="inline-flex rounded-lg border border-orange/30 bg-orange/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-orange">
                        {getCatalogLabel(category.catalogId, config)}
                      </span>
                    </td>
                    <td className="min-w-[260px] px-4 py-3.5">
                      {editingId === category.id ? (
                        <div className="space-y-2 py-1">
                          <input
                            value={editLabel}
                            onChange={(event) => setEditLabel(event.target.value)}
                            className="h-9 w-full rounded-lg border border-white/[0.12] bg-black/40 px-3 text-xs text-white focus:border-orange/50 focus:outline-none focus:ring-1 focus:ring-orange/50"
                            autoFocus
                          />
                          <textarea
                            value={editDescription}
                            onChange={(event) =>
                              setEditDescription(event.target.value)
                            }
                            rows={2}
                            className="w-full rounded-lg border border-white/[0.12] bg-black/40 p-2 text-xs text-white focus:border-orange/50 focus:outline-none focus:ring-1 focus:ring-orange/50 resize-none"
                            placeholder="Descripción"
                          />
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium text-white text-sm">
                            {category.label}
                          </p>
                          {category.description && (
                            <p className="mt-0.5 text-xs text-steel-dark leading-relaxed">
                              {category.description}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="w-40 px-4 py-3.5 whitespace-nowrap font-mono text-xs text-steel-mid">
                      {category.id}
                    </td>
                    <td className="w-48 px-4 py-3.5 text-right pr-6 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {editingId === category.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleSaveEdit(category.id)}
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
                                setEditDescription("");
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
                                setEditingId(category.id);
                                setEditLabel(category.label);
                                setEditDescription(category.description);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-orange/30 bg-orange/10 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-orange transition-all hover:bg-orange/20"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(category.id)}
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
                ))}
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
