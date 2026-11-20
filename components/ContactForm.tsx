"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Building2, User } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import "@/components/contact-phone.css";
import DetectedPhoneCountry from "@/components/DetectedPhoneCountry";
import PhoneCountrySelectHidden from "@/components/PhoneCountrySelectHidden";
import QuoteSentAnimation from "@/components/QuoteSentAnimation";
import AddressField, {
  type AddressSelection,
} from "@/components/AddressField";
import CustomSelect from "@/components/CustomSelect";
import {
  getClienteShippingProfile,
  saveClienteShippingProfile,
} from "@/lib/auth-sync-client";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { saveGuestName, useGuestName } from "@/lib/guest-name";
import { buildQuoteProductItem } from "@/lib/quote-product";
import type { Product } from "@/lib/products";
import {
  buildQuoteWhatsAppUrl,
  openWhatsAppContact,
} from "@/lib/quoting";
import { SLUG_PATTERN, sanitizeText } from "@/lib/sanitize";
import { formatRut, validarRut } from "@/lib/rut";
import {
  isValidClientName,
  type ClienteTipo,
} from "@/lib/validation/contact";
import {
  sanitizeShippingInfo,
  type ClienteShippingProfile,
  type ShippingInfo,
} from "@/lib/shipping-profile";
import { useQuoteSelection } from "@/lib/quote-selection";

const fieldLabelClass =
  "mb-2 block text-sm font-medium text-steel-mid";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PLACE_TYPE_OPTIONS = [
  { value: "Casa", label: "Casa" },
  { value: "Departamento", label: "Departamento" },
  { value: "Oficina", label: "Oficina" },
  { value: "Local comercial", label: "Local comercial" },
  { value: "Bodega", label: "Bodega" },
  { value: "Galpón", label: "Galpón" },
  { value: "Parcela / Campo", label: "Parcela / Campo" },
  { value: "Otro", label: "Otro" },
];

function buildShippingPayload(fields: {
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}): ShippingInfo | null {
  return sanitizeShippingInfo({
    addressLine1: fields.addressLine1,
    addressLine2: fields.addressLine2,
    city: fields.city,
    region: fields.region,
    postalCode: fields.postalCode,
    country: fields.country || "Chile",
  });
}

function buildProfilePayload(
  contact: {
    name: string;
    phone: string | null;
    email: string;
    rut: string | null;
    clienteTipo: ClienteTipo;
  },
  shipping: ShippingInfo | null,
): ClienteShippingProfile {
  return {
    contactName: contact.name,
    phone: contact.phone,
    email: contact.email || null,
    rut: contact.rut || null,
    clienteTipo: contact.clienteTipo,
    addressLine1: shipping?.addressLine1 ?? null,
    addressLine2: shipping?.addressLine2 ?? null,
    city: shipping?.city ?? null,
    region: shipping?.region ?? null,
    postalCode: shipping?.postalCode ?? null,
    country: shipping?.country ?? "Chile",
  };
}

interface ContactFormProps {
  formId?: string;
  hideSubmitButton?: boolean;
  onSuccess?: (requestId: string | null, whatsAppUrl?: string) => void;
  onSubmittingChange?: (submitting: boolean) => void;
  onErrorChange?: (error: string) => void;
}

export default function ContactForm({
  formId = "solicitud-cotizacion-form",
  hideSubmitButton = false,
  onSuccess,
  onSubmittingChange,
  onErrorChange,
}: ContactFormProps) {
  const searchParams = useSearchParams();
  const productId = searchParams.get("producto");
  const { products, addProduct, clearProducts } = useQuoteSelection();
  const { user, loading: authLoading } = useFirebaseAuth();
  const guestName = useGuestName();
  const profileLoadedRef = useRef(false);
  /**
   * Clave de idempotencia: se genera al primer intento de envío y se reutiliza
   * si hay un error de red (reintento del mismo envío). Solo se regenera tras
   * un envío exitoso, para evitar cotizaciones duplicadas desde la web.
   */
  const idempotencyRef = useRef<string | null>(null);
  /**
   * Guard síncrono de doble envío: `setIsSubmitting` es asíncrono (React
   * batching), por lo que varios clics rápidos podrían disparar múltiples
   * handleSubmit antes de que el botón se deshabilite. Este ref se marca y
   * verifica de forma síncrona para bloquear los envíos concurrentes.
   */
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
  const [clienteTipo, setClienteTipo] = useState<ClienteTipo>("persona");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState<string | undefined>();
  const [rut, setRut] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("Chile");
  const [message, setMessage] = useState("");
  const [saveProfileForFuture, setSaveProfileForFuture] = useState(false);
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [rutError, setRutError] = useState("");
  const [addressError, setAddressError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [whatsAppUrl, setWhatsAppUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!productId || !SLUG_PATTERN.test(productId)) {
      return;
    }

    void fetch(`/api/products/${encodeURIComponent(productId)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { product?: Product } | null) => {
        if (!data?.product) {
          return;
        }

        addProduct(buildQuoteProductItem(data.product, []));
      });
  }, [productId, addProduct]);

  useEffect(() => {
    if (authLoading || !user || profileLoadedRef.current) {
      return;
    }

    profileLoadedRef.current = true;

    void getClienteShippingProfile(user.uid).then((profile) => {
      if (profile?.contactName) {
        setName(profile.contactName);
      } else if (user.displayName) {
        setName(user.displayName);
      }

      if (
        profile?.clienteTipo === "empresa" ||
        profile?.clienteTipo === "persona"
      ) {
        setClienteTipo(profile.clienteTipo);
      }

      if (profile?.phone) {
        setPhone((prev) => prev || profile.phone || "");
      }

      if (profile?.email) {
        setEmail((prev) => prev || profile.email || "");
      } else if (user.email) {
        setEmail((prev) => prev || user.email || "");
      }

      if (profile?.rut) {
        setRut((prev) => prev || formatRut(profile.rut) || "");
      }

      if (profile?.addressLine1) {
        setAddressLine1(profile.addressLine1);
      }

      if (
        profile?.addressLine2 &&
        PLACE_TYPE_OPTIONS.some(
          (option) => option.value === profile.addressLine2,
        )
      ) {
        setAddressLine2(profile.addressLine2);
      } else {
        setAddressLine2("");
      }

      if (profile?.city) {
        setCity(profile.city);
      }

      if (profile?.region) {
        setRegion(profile.region);
      }

      if (profile?.postalCode) {
        setPostalCode(profile.postalCode);
      } else {
        setPostalCode("");
      }
    });
  }, [authLoading, user]);

  useEffect(() => {
    if (!user) {
      profileLoadedRef.current = false;
      setSaveProfileForFuture(false);
    }
  }, [user]);

  const googleEmail = user?.email?.trim() ?? "";
  const usesGoogleEmail = Boolean(googleEmail);
  const effectiveName = !user && !nameEdited ? guestName : name;
  const effectiveEmail = resolveSubmitEmail();
  const emailIsValid = Boolean(
    effectiveEmail && EMAIL_PATTERN.test(effectiveEmail),
  );

  function resolveSubmitEmail(): string {
    const typedEmail = sanitizeText(email, 200) ?? "";
    if (typedEmail) {
      return typedEmail;
    }

    return sanitizeText(googleEmail, 200) ?? "";
  }

  function resetForm() {
    setName("");
    setNameEdited(false);
    setClienteTipo("persona");
    setEmail("");
    setPhone(undefined);
    setRut("");
    setAddressLine1("");
    setAddressLine2("");
    setCity("");
    setRegion("");
    setPostalCode("");
    setCountry("Chile");
    setMessage("");
    setSaveProfileForFuture(false);
    setNameError("");
    setPhoneError("");
    setRutError("");
    setAddressError("");
  }

  function handleAddressChange(nextValue: string) {
    setAddressLine1(nextValue);
    setAddressError("");
    setCity("");
    setRegion("");
    setPostalCode("");
  }

  function handleAddressSelect(selection: AddressSelection) {
    setAddressLine1(selection.address);
    setCity(selection.city ?? "");
    setRegion(selection.region ?? "");
    setPostalCode(selection.postalCode ?? "");

    if (selection.country) {
      setCountry(selection.country);
    }

    setAddressError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submittingRef.current) {
      return;
    }

    const safeName = sanitizeText(effectiveName, 120, { required: true }) ?? "";
    const safeMessage = sanitizeText(message, 1000) ?? "";
    const safeEmail = resolveSubmitEmail();
    const safeRut = sanitizeText(rut, 20) ?? "";

    setNameError("");
    setPhoneError("");
    setRutError("");
    setAddressError("");
    setSubmitError("");

    if (!isValidClientName(safeName, clienteTipo)) {
      const msg =
        clienteTipo === "empresa"
          ? "Ingrese una razón social válida (mínimo 3 caracteres)."
          : "Ingrese su nombre completo (mínimo 3 letras).";
      setNameError(msg);
      onErrorChange?.(msg);
      return;
    }

    if (!safeEmail || !EMAIL_PATTERN.test(safeEmail)) {
      const msg = "Ingrese un correo electrónico válido.";
      setSubmitError(msg);
      onErrorChange?.(msg);
      return;
    }

    if (!phone) {
      const msg = "Ingrese su número de teléfono.";
      setPhoneError(msg);
      onErrorChange?.(msg);
      return;
    }

    if (!isValidPhoneNumber(phone)) {
      const msg = "Ingrese un número de teléfono válido.";
      setPhoneError(msg);
      onErrorChange?.(msg);
      return;
    }

    if (safeRut && !validarRut(safeRut)) {
      const msg = "Ingrese un RUT válido (ej: 12.345.678-9).";
      setRutError(msg);
      onErrorChange?.(msg);
      return;
    }

    if (!addressLine1.trim()) {
      const msg = "Ingrese su dirección.";
      setAddressError(msg);
      onErrorChange?.(msg);
      return;
    }

    onErrorChange?.("");
    setSubmitSuccess(false);
    setRequestId(null);

    const shipping = buildShippingPayload({
      addressLine1,
      addressLine2,
      city,
      region,
      postalCode,
      country,
    });

    submittingRef.current = true;
    setIsSubmitting(true);
    onSubmittingChange?.(true);

    try {
      const response = await fetch("/api/cotizaciones/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: safeName,
          clienteTipo,
          phone,
          rut: safeRut || undefined,
          email: safeEmail || undefined,
          message: safeMessage || undefined,
          clientUserId: user?.uid,
          idempotencyKey: obtenerClaveIdempotencia(),
          shipping: shipping ?? undefined,
          products: products.map((product) => ({
            id: product.id,
            name: product.name,
            capacity: product.capacity,
            quantity: product.quantity ?? 1,
            selectedColor: product.selectedColor ?? undefined,
            selectedColorId: product.selectedColorId ?? undefined,
            selectedAddOns: product.selectedAddOns?.map((addOn) => ({
              id: addOn.id,
              name: addOn.name,
            })),
            variacionId: product.variacionId ?? undefined,
            variacionName: product.variacionName ?? undefined,
          })),
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        id?: string;
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        const msg =
          data.error ??
          "No se pudo enviar la solicitud. Intente de nuevo en unos minutos.";
        setSubmitError(msg);
        onErrorChange?.(msg);
        return;
      }

      if (!user) {
        saveGuestName(safeName);
      }

      if (user && saveProfileForFuture) {
        await saveClienteShippingProfile(
          user,
          buildProfilePayload(
            {
              name: safeName,
              phone: phone ?? null,
              email: safeEmail || googleEmail,
              rut: safeRut || null,
              clienteTipo,
            },
            shipping,
          ),
        );
      }

      const submittedProducts = products.map((product) => ({
        name: product.name,
        capacity: product.capacity,
        quantity: product.quantity ?? 1,
        selectedColor: product.selectedColor ?? undefined,
        selectedColorId: product.selectedColorId ?? undefined,
        selectedAddOns: product.selectedAddOns?.map((addOn) => ({
          id: addOn.id,
          name: addOn.name,
        })),
      }));

      const submittedRequestId = data.id ?? null;

      const waUrl = buildQuoteWhatsAppUrl(
        safeName,
        phone ?? "",
        safeMessage,
        submittedProducts,
        {
          requestId: submittedRequestId ?? undefined,
          email: safeEmail || undefined,
          rut: safeRut || undefined,
          clienteTipo,
        },
      );

      setWhatsAppUrl(waUrl);
      setSubmitSuccess(true);
      setRequestId(submittedRequestId);
      if (onSuccess) {
        onSuccess(submittedRequestId, waUrl);
      }
      // Envío exitoso: la próxima cotización usará una clave nueva.
      idempotencyRef.current = null;
      resetForm();
      clearProducts();
    } catch {
      const msg =
        "No se pudo conectar con el servidor. Verifique su conexión e intente de nuevo.";
      setSubmitError(msg);
      onErrorChange?.(msg);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
      onSubmittingChange?.(false);
    }
  }

  const canSubmit =
    isValidClientName(effectiveName, clienteTipo) &&
    emailIsValid &&
    Boolean(phone) &&
    Boolean(addressLine1.trim()) &&
    (!rut.trim() || validarRut(rut)) &&
    !isSubmitting;

  if (submitSuccess) {
    return (
      <section className="mx-auto w-full rounded-2xl border border-white/[0.08] bg-panel/40 px-4 py-8 sm:px-6">
        <QuoteSentAnimation
          requestId={requestId}
          whatsAppUrl={whatsAppUrl}
          onSendAnother={() => {
            setSubmitSuccess(false);
            setRequestId(null);
            setWhatsAppUrl(null);
          }}
        />
      </section>
    );
  }

  return (
    <section className="min-w-0 w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-7">
      <div className="mb-6 border-b border-white/[0.06] pb-3">
        <h3 className="text-base font-semibold text-white">
          Información del contacto
        </h3>
        <p className="mt-0.5 text-xs text-steel-dark">
          Completa tus datos para enviarte la propuesta formal.
        </p>
      </div>

      <form
        id={formId}
        onSubmit={handleSubmit}
        className="min-w-0 w-full space-y-6"
        noValidate
      >
        <fieldset className="min-w-0 w-full space-y-6">
          <legend className="sr-only">Datos de contacto</legend>

          <div>
            <span className={fieldLabelClass}>Tipo de cliente</span>
            <div
              role="radiogroup"
              aria-label="Tipo de cliente"
              className="relative grid w-full grid-cols-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1 sm:w-[18rem]"
            >
              <span
                aria-hidden
                className={`pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-orange transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                  clienteTipo === "empresa" ? "translate-x-full" : "translate-x-0"
                }`}
              />
              {(
                [
                  { value: "persona", label: "Particular", icon: User },
                  { value: "empresa", label: "Empresa", icon: Building2 },
                ] as const
              ).map(({ value, label, icon: Icon }) => {
                const active = clienteTipo === value;

                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      setClienteTipo(value);
                      setNameError("");
                    }}
                    className={`relative z-10 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange ${
                      active ? "text-white" : "text-steel-mid hover:text-white"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="name" className={fieldLabelClass}>
              {clienteTipo === "empresa" ? "Razón Social *" : "Nombre Completo *"}
            </label>
            <input
              id="name"
              type="text"
              required
              maxLength={120}
              autoComplete="name"
              value={effectiveName}
              onChange={(e) => {
                setNameEdited(true);
                setName(e.target.value);
                setNameError("");
              }}
              placeholder={
                clienteTipo === "empresa"
                  ? "Ej: Tostadores Fica SpA"
                  : "Su nombre completo"
              }
              aria-invalid={Boolean(nameError)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm text-steel-light placeholder:text-steel-dark focus:border-orange/60 focus:outline-none focus:ring-1 focus:ring-orange/30"
            />
            {nameError ? (
              <p className="mt-1.5 text-xs text-orange">{nameError}</p>
            ) : null}
          </div>

          <div className="min-w-0">
            <label htmlFor="phone" className={fieldLabelClass}>
              WhatsApp / Teléfono *
            </label>
            <div className="min-w-0 w-full">
              <PhoneInput
                id="phone"
                defaultCountry="CL"
                placeholder="912345678"
                value={phone}
                onChange={(value) => {
                  setPhone(value);
                  setPhoneError("");
                }}
                countrySelectComponent={PhoneCountrySelectHidden}
                className="phone-input-wrapper"
              />
            </div>
            <DetectedPhoneCountry value={phone} />
            {phoneError ? (
              <p className="mt-1.5 text-xs text-orange">{phoneError}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="email" className={fieldLabelClass}>
                Correo Electrónico *
              </label>
              <input
                id="email"
                type="email"
                required
                maxLength={200}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm text-steel-light placeholder:text-steel-dark focus:border-orange/60 focus:outline-none focus:ring-1 focus:ring-orange/30"
              />
              {usesGoogleEmail ? (
                <p className="mt-1.5 text-xs text-steel-dark">
                  Autocompletado desde tu cuenta. Puedes editarlo si lo necesitas.
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="rut" className={fieldLabelClass}>
                RUT <span className="text-steel-dark">(opcional)</span>
              </label>
              <input
                id="rut"
                type="text"
                maxLength={20}
                autoComplete="off"
                value={rut}
                onChange={(e) => {
                  setRut(formatRut(e.target.value));
                  setRutError("");
                }}
                placeholder="12.345.678-9"
                aria-invalid={Boolean(rutError)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm text-steel-light placeholder:text-steel-dark focus:border-orange/60 focus:outline-none focus:ring-1 focus:ring-orange/30"
              />
              {rutError ? (
                <p className="mt-1.5 text-xs text-orange">{rutError}</p>
              ) : null}
            </div>
          </div>
        </fieldset>

        {/* Dirección de despacho o entrega (obligatoria) */}
        <div className="border-t border-white/[0.06] pt-6">
          <fieldset className="min-w-0 w-full space-y-4">
            <div className="border-b border-white/[0.06] pb-3">
              <legend className="text-sm font-medium text-steel-mid">
                Dirección de despacho o entrega
              </legend>
            </div>

            <div>
              <label htmlFor="addressLine1" className={fieldLabelClass}>
                Dirección *
              </label>
              <AddressField
                id="addressLine1"
                value={addressLine1}
                onChange={handleAddressChange}
                onSelect={handleAddressSelect}
                error={addressError}
                placeholder="Calle, número, comuna, región"
              />
            </div>

            <div>
              <label htmlFor="addressLine2" className={fieldLabelClass}>
                Tipo de lugar <span className="text-steel-dark">(opcional)</span>
              </label>
              <CustomSelect
                id="addressLine2"
                value={addressLine2}
                onChange={setAddressLine2}
                options={PLACE_TYPE_OPTIONS}
                placeholder="Casa, departamento, bodega…"
                aria-label="Tipo de lugar"
              />
            </div>

            {addressError ? (
              <p className="text-xs text-orange">{addressError}</p>
            ) : null}
          </fieldset>
        </div>

        {/* Message / Specifications */}
        <div className="border-t border-white/[0.06] pt-6">
          <label htmlFor="message" className={fieldLabelClass}>
            Mensaje o requerimientos especiales <span className="text-steel-dark">(opcional)</span>
          </label>
          <textarea
            id="message"
            rows={3}
            maxLength={1000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              products.length > 0
                ? "Dudas sobre voltaje, instalación o requerimientos especiales..."
                : "Cuéntenos qué equipo necesita o su consulta..."
            }
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm text-steel-light placeholder:text-steel-dark focus:border-orange/60 focus:outline-none focus:ring-1 focus:ring-orange/30 min-h-[5rem] resize-y"
          />
        </div>

        {submitError ? (
          <p className="text-sm text-orange">{submitError}</p>
        ) : null}

        {!hideSubmitButton && (
          <button
            type="submit"
            disabled={!canSubmit}
            className="min-h-12 w-full rounded-md bg-orange py-3 text-sm font-medium text-white transition-colors hover:bg-orange-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Enviando..." : "Enviar Solicitud"}
          </button>
        )}

        <p className="text-center text-xs text-steel-dark">
          Al enviar, acepta nuestros{" "}
          <Link href="/terminos" className="text-orange hover:underline">
            Términos y condiciones
          </Link>{" "}
          y la{" "}
          <Link href="/privacidad" className="text-orange hover:underline">
            Política de privacidad
          </Link>
          .
        </p>
      </form>
    </section>
  );
}
