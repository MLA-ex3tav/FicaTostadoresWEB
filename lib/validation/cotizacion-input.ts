import { isValidPhoneNumber, parsePhoneNumber } from "libphonenumber-js";
import { sanitizeSlug, sanitizeText } from "@/lib/sanitize";
import { formatRut, validarRut } from "@/lib/rut";
import { isValidClientName } from "@/lib/validation/contact";
import type {
  CotizacionProductAddOn,
  CotizacionProductLine,
} from "@/lib/cotizaciones/types";
import { sanitizeShippingInfo, type ShippingInfo } from "@/lib/shipping-profile";

export interface CreateSolicitudCotizacionInput {
  name: string;
  clienteTipo: "empresa" | "persona";
  phone: string | null;
  rut: string | null;
  email: string | null;
  message: string | null;
  products: CotizacionProductLine[];
  clientCountry: string | null;
  shipping: ShippingInfo | null;
  clientUserId: string | null;
  /** Clave de idempotencia generada por el cliente (evita duplicados por reintento). */
  idempotencyKey: string | null;
}

function sanitizeAddOn(value: unknown): CotizacionProductAddOn | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = sanitizeSlug(record.id, 80);
  const name = sanitizeText(record.name, 200, { required: true });

  if (!id || !name) {
    return null;
  }

  return { id, name };
}

function sanitizeProductLine(value: unknown): CotizacionProductLine | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const name = sanitizeText(record.name, 200, { required: true });
  const capacity = sanitizeText(record.capacity, 100) || "";

  if (!name) {
    return null;
  }

  const productId = record.id ? sanitizeSlug(record.id, 80) : null;
  const catalog = record.catalog
    ? sanitizeText(record.catalog, 80, { required: true })
    : null;

  const selectedAddOns = Array.isArray(record.selectedAddOns)
    ? record.selectedAddOns
        .map(sanitizeAddOn)
        .filter((addOn): addOn is CotizacionProductAddOn => addOn !== null)
        .slice(0, 20)
    : [];

  const selectedColor = sanitizeText(record.selectedColor, 120) || null;
  const selectedColorId = sanitizeSlug(record.selectedColorId, 80) || null;

  const variacionId = sanitizeSlug(record.variacionId, 80) || null;
  const variacionName = sanitizeText(record.variacionName, 200) || null;

  const quantity = Math.max(1, Math.min(99, Math.floor(Number(record.quantity)) || 1));

  return {
    productId,
    name,
    capacity,
    catalog,
    selectedColor,
    selectedColorId,
    selectedAddOns,
    variacionId,
    variacionName,
    quantity,
  };
}

export function parseCreateSolicitudCotizacionInput(
  body: unknown,
): CreateSolicitudCotizacionInput | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const record = body as Record<string, unknown>;
  const name = sanitizeText(record.name, 120, { required: true });
  const phoneRaw = sanitizeText(record.phone, 32, { required: true });
  const message = sanitizeText(record.message, 1000) || null;
  const emailRaw = sanitizeText(record.email, 200, { required: true });
  const rutRaw = sanitizeText(record.rut, 20) || null;
  const clienteTipo =
    sanitizeText(record.clienteTipo, 20) === "empresa" ? "empresa" : "persona";

  const email =
    emailRaw && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) ? emailRaw : null;

  if (!name || !isValidClientName(name, clienteTipo) || !email || !phoneRaw) {
    return null;
  }

  if (!isValidPhoneNumber(phoneRaw)) {
    return null;
  }

  if (rutRaw && !validarRut(rutRaw)) {
    return null;
  }

  const parsedPhone = parsePhoneNumber(phoneRaw);

  const products = Array.isArray(record.products)
    ? record.products
        .map(sanitizeProductLine)
        .filter((product): product is CotizacionProductLine => product !== null)
        .slice(0, 10)
    : [];

  const countryCode = parsedPhone.country ?? null;
  const clientCountry = countryCode;
  const shipping = sanitizeShippingInfo(record.shipping);

  if (!shipping || !shipping.addressLine1) {
    return null;
  }

  const clientUserIdRaw = sanitizeText(record.clientUserId, 128);
  const clientUserId =
    clientUserIdRaw && /^[a-zA-Z0-9]{10,128}$/.test(clientUserIdRaw)
      ? clientUserIdRaw
      : null;

  const idempotencyKeyRaw = sanitizeText(record.idempotencyKey, 128);
  const idempotencyKey =
    idempotencyKeyRaw && /^[a-zA-Z0-9_-]{8,128}$/.test(idempotencyKeyRaw)
      ? idempotencyKeyRaw
      : null;

  return {
    name,
    clienteTipo,
    phone: parsedPhone.format("E.164"),
    rut: rutRaw ? formatRut(rutRaw) : null,
    email,
    message,
    products,
    clientCountry,
    shipping,
    clientUserId,
    idempotencyKey,
  };
}
