"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import "@/components/contact-phone.css";
import DetectedPhoneCountry from "@/components/DetectedPhoneCountry";
import PhoneCountrySelectHidden from "@/components/PhoneCountrySelectHidden";
import CustomSelect from "@/components/CustomSelect";
import QuoteSentAnimation from "@/components/QuoteSentAnimation";
import { getCatalogLabel, getCategoryLabel, defaultCatalogConfig } from "@/lib/catalog-config";
import { getClienteShippingProfile } from "@/lib/auth-sync-client";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { saveGuestName, useGuestName } from "@/lib/guest-name";
import type { Product } from "@/lib/products";
import { getProductImageSrc } from "@/lib/product-images";
import {
  buildTechnicalServiceWhatsAppUrl,
  openWhatsAppContact,
} from "@/lib/quoting";
import { SLUG_PATTERN, sanitizeText } from "@/lib/sanitize";
import {
  getTechnicalIssueCategoryLabel,
  TECHNICAL_ISSUE_CATEGORIES,
  type TechnicalIssueCategoryId,
} from "@/lib/soporte-tecnico/issue-categories";
import { Check, ChevronRight, PenTool, Search, Wrench, X } from "lucide-react";

const OTHER_EQUIPMENT_VALUE = "__otro_equipo__";

const fieldLabelClass =
  "mb-2 block text-sm font-medium text-steel-mid";

const issueCategoryOptions = TECHNICAL_ISSUE_CATEGORIES.map((category) => ({
  value: category.id,
  label: category.label,
}));

import type { CatalogConfig } from "@/lib/catalog-config";

interface TechnicalServiceFormProps {
  products: Product[];
  catalogConfig?: CatalogConfig;
}

export default function TechnicalServiceForm({
  products,
  catalogConfig,
}: TechnicalServiceFormProps) {
  const searchParams = useSearchParams();
  const productId = searchParams.get("producto");
  const { user, loading: authLoading, adminFetch } = useFirebaseAuth();
  const guestName = useGuestName();
  const profileLoadedRef = useRef(false);
  const idempotencyRef = useRef<string | null>(null);
  const submittingRef = useRef(false);

  function obtenerClaveIdempotencia(): string {
    if (!idempotencyRef.current) {
      idempotencyRef.current =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `web-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    }
    return idempotencyRef.current;
  }

  const [name, setName] = useState("");
  const [nameEdited, setNameEdited] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState<string | undefined>();
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("");
  const [customEquipmentModel, setCustomEquipmentModel] = useState("");
  const [issueCategory, setIssueCategory] =
    useState<TechnicalIssueCategoryId>("falla_operativa");
  const [issueDescription, setIssueDescription] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [whatsAppUrl, setWhatsAppUrl] = useState<string | null>(null);
  const [quotedProducts, setQuotedProducts] = useState<
    { productId: string; name: string; count: number }[]
  >([]);
  const [quotedLoaded, setQuotedLoaded] = useState(false);

  // Estado del selector modal/drawer de equipos
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [catalogFilter, setCatalogFilter] = useState<string>("all");

  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const isOtherEquipment = selectedEquipmentId === OTHER_EQUIPMENT_VALUE;
  const selectedProduct = selectedEquipmentId
    ? productsById.get(selectedEquipmentId)
    : undefined;

  // Catálogos disponibles desde la base de datos (o default)
  const availableCatalogs = useMemo(() => {
    if (catalogConfig?.catalogs && catalogConfig.catalogs.length > 0) {
      return catalogConfig.catalogs;
    }
    // Si no viene config, deducir de los productos cargados
    const set = new Set<string>();
    const list: { id: string; label: string }[] = [];
    for (const p of products) {
      if (!set.has(p.catalog)) {
        set.add(p.catalog);
        list.push({ id: p.catalog, label: getCatalogLabel(p.catalog) });
      }
    }
    return list;
  }, [catalogConfig, products]);

  // Filtrado de equipos para el selector interactivo
  const filteredProducts = useMemo(() => {
    const query = equipmentSearch.toLowerCase().trim();
    return products.filter((p) => {
      const matchesCatalog =
        catalogFilter === "all" || p.catalog === catalogFilter;
      const matchesQuery =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.capacity.toLowerCase().includes(query) ||
        getCatalogLabel(p.catalog, catalogConfig).toLowerCase().includes(query) ||
        getCategoryLabel(p.category, catalogConfig).toLowerCase().includes(query);
      return matchesCatalog && matchesQuery;
    });
  }, [products, equipmentSearch, catalogFilter, catalogConfig]);

  useEffect(() => {
    if (!productId || !SLUG_PATTERN.test(productId)) {
      return;
    }
    if (!productsById.has(productId)) {
      return;
    }
    setSelectedEquipmentId(productId);
  }, [productId, productsById]);

  useEffect(() => {
    if (authLoading || !user || profileLoadedRef.current) {
      return;
    }
    profileLoadedRef.current = true;

    void getClienteShippingProfile(user.uid).then((profile) => {
      if (profile?.contactName) {
        setName(profile.contactName);
      }
      if (profile?.phone) {
        setPhone(profile.phone);
      }
      if (profile?.email) {
        setEmail(profile.email);
      } else if (user.email) {
        setEmail(user.email);
      }
    });
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading || !user || quotedLoaded) {
      return;
    }
    let cancelled = false;

    void (async () => {
      try {
        const response = await adminFetch("/api/cotizaciones/mis-solicitudes");
        const data = (await response.json()) as {
          solicitudes?: {
            products?: {
              productId: string | null;
              name: string;
            }[];
          }[];
          error?: string;
        };

        if (!response.ok || !data.solicitudes) {
          return;
        }

        const counts = new Map<string, { name: string; count: number }>();
        for (const solicitud of data.solicitudes) {
          for (const product of solicitud.products ?? []) {
            if (!product?.productId) continue;
            const entry = counts.get(product.productId);
            if (entry) {
              entry.count += 1;
            } else {
              counts.set(product.productId, {
                name: product.name,
                count: 1,
              });
            }
          }
        }

        if (cancelled) return;

        const listed = Array.from(counts.entries()).map(
          ([productId, { name, count }]) => ({
            productId,
            name,
            count,
          }),
        );

        setQuotedProducts(listed);

        if (listed.length > 0 && !productId) {
          const first = listed.find((item) => productsById.has(item.productId));
          if (first) {
            setSelectedEquipmentId(first.productId);
          }
        }
      } catch {
        // Ignorar
      } finally {
        if (!cancelled) {
          setQuotedLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, adminFetch, productId, productsById, quotedLoaded]);

  const googleEmail = user?.email?.trim() ?? "";
  const usesGoogleEmail = Boolean(googleEmail);
  const effectiveName = !user && !nameEdited ? guestName : name;
  const isPhoneValid = phone ? isValidPhoneNumber(phone) : false;

  function resolveSubmitEmail(): string {
    const typedEmail = sanitizeText(email, 200) ?? "";
    if (typedEmail) {
      return typedEmail;
    }
    return sanitizeText(googleEmail, 200) ?? "";
  }

  function resetForm() {
    setSelectedEquipmentId("");
    setCustomEquipmentModel("");
    setIssueCategory("falla_operativa");
    setIssueDescription("");
    setPhoneError("");
    setSubmitError("");
  }

  function resolveEquipmentModel(): {
    equipmentModel: string;
    linkedProductId: string | null;
  } | null {
    if (!selectedEquipmentId) {
      return null;
    }

    if (isOtherEquipment) {
      const trimmed = customEquipmentModel.trim();
      if (!trimmed) {
        return null;
      }
      return { equipmentModel: trimmed, linkedProductId: null };
    }

    const product = productsById.get(selectedEquipmentId);
    if (!product) {
      return null;
    }

    return {
      equipmentModel: product.name,
      linkedProductId: product.id,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submittingRef.current) {
      return;
    }

    if (!phone || !isValidPhoneNumber(phone)) {
      setPhoneError("Ingrese un número de teléfono válido.");
      return;
    }

    const safeName = sanitizeText(effectiveName, 120, { required: true }) ?? "";
    const resolvedEquipment = resolveEquipmentModel();
    const safeIssueDescription =
      sanitizeText(issueDescription, 2000, { required: true }) ?? "";
    const safeEmail = resolveSubmitEmail();

    if (!safeName) {
      setSubmitError("Ingrese un nombre válido.");
      return;
    }

    if (!resolvedEquipment) {
      setSubmitError(
        isOtherEquipment
          ? "Indique el modelo o marca del equipo."
          : "Seleccione un equipo de la lista o indique otro modelo.",
      );
      return;
    }

    const { equipmentModel: safeEquipmentModel, linkedProductId } =
      resolvedEquipment;

    if (!safeIssueDescription) {
      setSubmitError("Describa la falla o lo que necesita.");
      return;
    }

    setPhoneError("");
    setSubmitError("");
    setSubmitSuccess(false);
    setRequestId(null);
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/soporte-tecnico/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: safeName,
          phone,
          email: safeEmail || undefined,
          equipmentModel: safeEquipmentModel,
          productId: linkedProductId ?? undefined,
          issueCategory,
          issueDescription: safeIssueDescription,
          clientUserId: user?.uid,
          idempotencyKey: obtenerClaveIdempotencia(),
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        id?: string;
        error?: string;
      };

      if (!response.ok) {
        setSubmitError(
          data.error ??
            "No se pudo enviar la solicitud. Intente de nuevo en unos minutos.",
        );
        return;
      }

      const submittedRequestId = data.id ?? null;
      const issueCategoryLabel = getTechnicalIssueCategoryLabel(issueCategory);

      if (!user) {
        saveGuestName(safeName);
      }

      const waUrl = buildTechnicalServiceWhatsAppUrl(
        safeName,
        phone,
        {
          equipmentModel: safeEquipmentModel,
          issueCategoryLabel,
          issueDescription: safeIssueDescription,
        },
        {
          requestId: submittedRequestId ?? undefined,
          email: safeEmail || undefined,
        },
      );

      setWhatsAppUrl(waUrl);
      setSubmitSuccess(true);
      setRequestId(submittedRequestId);
      idempotencyRef.current = null;
      resetForm();
    } catch {
      setSubmitError(
        "No se pudo conectar con el servidor. Verifique su conexión e intente de nuevo.",
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (submitSuccess) {
    return (
      <section className="mx-auto w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-10">
        <QuoteSentAnimation
          requestId={requestId}
          whatsAppUrl={whatsAppUrl}
          sendingStatus="Enviando solicitud técnica…"
          arrivedSubtitle="Nuestro equipo técnico la revisará pronto"
          title="Solicitud técnica enviada"
          description="Recibimos su reporte. Puede continuar la conversación por WhatsApp con soporte técnico si lo desea."
          onSendAnother={() => {
            setSubmitSuccess(false);
            setRequestId(null);
            setWhatsAppUrl(null);
          }}
        />
      </section>
    );
  }

  const selectedImageSrc = selectedProduct
    ? getProductImageSrc(selectedProduct.images?.[0])
    : null;

  return (
    <section className="min-w-0 w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-8">
      <form onSubmit={handleSubmit} className="min-w-0 w-full space-y-8" noValidate>
        {/* SECCIÓN: EQUIPO Y PROBLEMA */}
        <fieldset className="min-w-0 w-full space-y-6">
          <legend className="mb-4 flex items-center gap-2.5 text-base font-semibold text-orange">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange/15 text-xs font-bold text-orange">
              1
            </span>
            Equipo y problema
          </legend>

          {/* Detección de equipo cotizado */}
          {quotedProducts.length > 0 && (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-steel-light">
                Detectamos tu equipo
              </p>
              <p className="mt-1 text-sm leading-relaxed text-steel-mid">
                Vimos que cotizaste{" "}
                {quotedProducts.length === 1
                  ? `${quotedProducts[0].name}`
                  : "alguno de estos equipos"}
                . ¿Es el que necesita asistencia?
              </p>
              <div className="mt-3 flex min-w-0 flex-wrap gap-2">
                {quotedProducts.map((quoted) => {
                  const exists = productsById.has(quoted.productId);
                  const isActive = selectedEquipmentId === quoted.productId;
                  return (
                    <button
                      key={quoted.productId}
                      type="button"
                      onClick={() => {
                        if (exists) {
                          setSelectedEquipmentId(quoted.productId);
                        }
                      }}
                      disabled={!exists}
                      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${
                        isActive
                          ? "border-white/30 bg-white/[0.1] text-white"
                          : "border-white/[0.08] bg-white/[0.02] text-steel-mid hover:border-white/20 hover:text-white"
                      } ${exists ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
                    >
                      <span className="truncate">{quoted.name}</span>
                      {quoted.count > 1 ? (
                        <span className="shrink-0 rounded-full bg-white/10 px-1.5 text-xs">
                          ×{quoted.count}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SELECTOR MINIMALISTA DE EQUIPO */}
          <div className="space-y-2">
            <label className={fieldLabelClass}>Equipo / modelo</label>

            {!selectedEquipmentId ? (
              /* ESTADO: NINGÚN EQUIPO SELECCIONADO */
              <button
                type="button"
                onClick={() => setSelectorOpen(true)}
                className="group flex w-full items-center justify-between !rounded-none border border-dashed border-white/[0.12] bg-white/[0.02] p-4 text-left transition-all hover:border-orange/50 hover:bg-white/[0.04] focus-visible:border-orange/60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-steel-mid transition-colors group-hover:text-white">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight text-white">
                      Seleccionar equipo del catálogo
                    </p>
                    <p className="truncate text-xs leading-tight text-steel-dark">
                      Explora la lista de tostadores o ingresa otro modelo
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-steel-dark transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
              </button>
            ) : selectedProduct ? (
              /* ESTADO: PRODUCTO DEL CATÁLOGO SELECCIONADO */
              <div className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-xl border border-white/[0.1] bg-white/[0.03] p-3.5 transition-colors hover:border-orange/40">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative h-12 w-14 shrink-0 overflow-hidden rounded-lg bg-white/[0.05]">
                    {selectedImageSrc ? (
                      <Image
                        src={selectedImageSrc}
                        alt={selectedProduct.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-steel-dark">
                        <Wrench className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-steel-mid">
                      {getCatalogLabel(selectedProduct.catalog)}
                    </p>
                    <p className="text-sm font-semibold text-white truncate">
                      {selectedProduct.name}
                    </p>
                    <p className="text-xs text-steel-mid truncate">
                      {selectedProduct.capacity}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectorOpen(true)}
                    className="min-h-9 rounded-lg border border-white/[0.08] px-3 py-2 text-xs font-medium text-steel-mid transition-colors hover:border-white/20 hover:text-white"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedEquipmentId("")}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] text-steel-dark transition-colors hover:border-white/20 hover:text-white"
                    aria-label="Quitar equipo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* ESTADO: OTRO EQUIPO (NO LISTADO) */
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-white/[0.1] bg-white/[0.03] p-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-steel-mid">
                      <PenTool className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">
                        Otro equipo (no listado)
                      </p>
                      <p className="text-xs text-steel-dark">
                        Ingresa marca y modelo abajo
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEquipmentId("");
                      setCustomEquipmentModel("");
                    }}
                    className="rounded-lg border border-white/[0.08] p-2.5 text-steel-dark transition-colors hover:text-white"
                    aria-label="Cambiar opción"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <input
                  id="customEquipmentModel"
                  type="text"
                  required
                  maxLength={200}
                  value={customEquipmentModel}
                  onChange={(e) => setCustomEquipmentModel(e.target.value)}
                  placeholder="Escribe aquí la marca, modelo o capacidad del equipo"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm text-steel-light placeholder:text-steel-dark focus:border-orange/60 focus:outline-none focus:ring-1 focus:ring-orange/30"
                />
              </div>
            )}
          </div>

          {/* TIPO DE SOLICITUD */}
          <div>
            <label htmlFor="issueCategory" className={fieldLabelClass}>
              Tipo de solicitud
            </label>
            <CustomSelect
              id="issueCategory"
              value={issueCategory}
              onChange={(value) =>
                setIssueCategory(value as TechnicalIssueCategoryId)
              }
              options={issueCategoryOptions}
              aria-label="Tipo de solicitud"
            />
          </div>

          {/* DESCRIPCIÓN DEL PROBLEMA */}
          <div>
            <label htmlFor="issueDescription" className={fieldLabelClass}>
              ¿Qué falló o qué necesita?
            </label>
            <textarea
              id="issueDescription"
              required
              rows={4}
              maxLength={2000}
              value={issueDescription}
              onChange={(event) => setIssueDescription(event.target.value)}
              placeholder="Describa síntomas, códigos de error, ruidos, desde cuándo ocurre, etc."
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm text-steel-light placeholder:text-steel-dark focus:border-orange/60 focus:outline-none focus:ring-1 focus:ring-orange/30 min-h-[7rem] resize-y"
            />
          </div>
        </fieldset>

        {/* SECCIÓN: DATOS DE CONTACTO */}
        <fieldset className="min-w-0 w-full space-y-4 pt-6">
          <legend className="mb-0 flex items-center gap-2.5 text-base font-semibold text-orange">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange/15 text-xs font-bold text-orange">
              2
            </span>
            Datos de contacto
          </legend>

          <div className="grid min-w-0 w-full grid-cols-1 gap-x-5 gap-y-3 md:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor="technical-name" className={fieldLabelClass}>
                Nombre
              </label>
              <input
                id="technical-name"
                type="text"
                required
                maxLength={120}
                value={effectiveName}
                onChange={(event) => {
                  setNameEdited(true);
                  setName(event.target.value);
                }}
                placeholder="Su nombre completo"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm text-steel-light placeholder:text-steel-dark focus:border-orange/60 focus:outline-none focus:ring-1 focus:ring-orange/30"
              />
            </div>

            <div className="min-w-0">
              <label htmlFor="technical-email" className={fieldLabelClass}>
                Correo <span className="text-steel-dark">(opcional)</span>
              </label>
              <input
                id="technical-email"
                type="email"
                maxLength={200}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm text-steel-light placeholder:text-steel-dark focus:border-orange/60 focus:outline-none focus:ring-1 focus:ring-orange/30"
              />
              {usesGoogleEmail && (
                <p className="mt-1.5 text-xs text-steel-dark">
                  Autocompletado desde tu cuenta.
                </p>
              )}
            </div>

            <div className="min-w-0 md:col-span-2">
              <label htmlFor="technical-phone" className={fieldLabelClass}>
                WhatsApp / teléfono
              </label>
              <div className="min-w-0 w-full">
                <PhoneInput
                  id="technical-phone"
                  defaultCountry="CL"
                  placeholder="912345678"
                  value={phone}
                  onChange={setPhone}
                  countrySelectComponent={PhoneCountrySelectHidden}
                  className="phone-input-wrapper"
                />
              </div>
              <DetectedPhoneCountry value={phone} />
              {phoneError && (
                <p className="mt-1.5 text-xs text-red-400">{phoneError}</p>
              )}
              {phone && !isPhoneValid && !phoneError && (
                <p className="mt-1.5 text-xs text-steel-dark">
                  Verifique que el número sea correcto.
                </p>
              )}
            </div>
          </div>
        </fieldset>

        {submitError && (
          <p className="text-sm text-red-400" role="alert">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-orange px-5 py-3.5 text-sm font-semibold text-white transition-all hover:bg-orange-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Enviando solicitud…" : "Enviar solicitud técnica"}
        </button>
      </form>

      {/* MODAL / DRAWER MINIMALISTA PARA SELECCIÓN DE EQUIPO */}
      {selectorOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 backdrop-blur-md sm:items-center sm:p-4 animate-in fade-in duration-200"
          onClick={() => setSelectorOpen(false)}
        >
          <div
            className="relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#121519] shadow-2xl sm:h-[680px] sm:max-w-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle móvil */}
            <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/20 sm:hidden" />

            {/* Header del Modal (Fijo) */}
            <div className="shrink-0 flex items-center justify-between gap-4 border-b border-white/[0.08] p-5 sm:px-7">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Selecciona tu equipo
                </h3>
                <p className="mt-0.5 text-xs text-steel-dark">
                  Elige un modelo o indica otro equipo no listado
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectorOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] text-steel-mid transition-colors hover:border-orange/50 hover:text-orange"
                aria-label="Cerrar selector de equipo"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Barra de Búsqueda y Filtros (Fijo) */}
            <div className="shrink-0 border-b border-white/[0.06] p-5 sm:px-7 space-y-3.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-dark" />
                <input
                  type="search"
                  value={equipmentSearch}
                  onChange={(e) => setEquipmentSearch(e.target.value)}
                  placeholder="Buscar por nombre o capacidad (ej: TLC, 15 kg, molino...)"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-steel-light placeholder:text-steel-dark focus:border-orange/60 focus:outline-none focus:ring-1 focus:ring-orange/30"
                />
              </div>

              {/* Categorías/Catálogos reales de la base de datos con auto-scroll horizontal centrado */}
              <div className="flex gap-2 overflow-x-auto pb-1.5 scroll-smooth scrollbar-none [scrollbar-width:none]">
                {[
                  { id: "all", label: "Todos los catálogos" },
                  ...availableCatalogs,
                ].map((cat) => {
                  const isActive = catalogFilter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={(e) => {
                        setCatalogFilter(cat.id);
                        const btn = e.currentTarget;
                        const container = btn.parentElement;
                        if (container) {
                          const scrollLeft =
                            btn.offsetLeft -
                            container.offsetWidth / 2 +
                            btn.offsetWidth / 2;
                          container.scrollTo({
                            left: scrollLeft,
                            behavior: "smooth",
                          });
                        }
                      }}
                      className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-all ${
                        isActive
                          ? "bg-orange text-white shadow-sm"
                          : "border border-white/[0.08] bg-white/[0.02] text-steel-mid hover:border-orange/40 hover:text-orange"
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lista con scroll de equipos */}
            <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:px-6 space-y-2.5">
              {/* Opción destacada: Otro equipo no listado */}
              <button
                type="button"
                onClick={() => {
                  setSelectedEquipmentId(OTHER_EQUIPMENT_VALUE);
                  setSelectorOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
                  selectedEquipmentId === OTHER_EQUIPMENT_VALUE
                    ? "border-orange/50 bg-orange/[0.06]"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-orange/30 hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-steel-mid">
                    <PenTool className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      Otro equipo (no listado)
                    </p>
                    <p className="text-xs text-steel-dark">
                      Indica marca, modelo o máquina antigua
                    </p>
                  </div>
                </div>
                {selectedEquipmentId === OTHER_EQUIPMENT_VALUE && (
                  <Check className="h-4 w-4 text-orange" />
                )}
              </button>

              <div className="py-1">
                <span className="text-xs font-medium text-steel-mid">
                  Catálogo Fica ({filteredProducts.length})
                </span>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="py-8 text-center text-sm text-steel-dark">
                  No se encontraron equipos con esa búsqueda.
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const isSelected = selectedEquipmentId === product.id;
                  const imgSrc = getProductImageSrc(product.images?.[0]);

                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        setSelectedEquipmentId(product.id);
                        setSelectorOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all ${
                        isSelected
                          ? "border-orange/50 bg-orange/[0.06]"
                          : "border-white/[0.06] bg-white/[0.02] hover:border-orange/30 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative h-11 w-13 shrink-0 overflow-hidden rounded-lg bg-white/[0.05]">
                          {imgSrc ? (
                            <Image
                              src={imgSrc}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-steel-dark">
                              <Wrench className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-steel-mid truncate">
                            {product.capacity} · {getCatalogLabel(product.catalog)}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <Check className="h-4 w-4 shrink-0 text-orange mr-2" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
