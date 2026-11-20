import { sanitizeText } from "@/lib/sanitize";

/**
 * Sanea la lista de detalles técnicos de un producto (ej. Rendimiento y Sacos
 * que vienen del importador de "Listado de precios"). Cada ítem requiere
 * `label` y `value` no vacíos; se limitan a 10 entradas.
 */
export function sanitizeTechnicalDetails(
  value: unknown,
): { label: string; value: string }[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const details: { label: string; value: string }[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const record = item as Record<string, unknown>;
    const label = sanitizeText(record.label, 100, { required: true });
    const detailValue = sanitizeText(record.value, 200, { required: true });

    if (label && detailValue) {
      details.push({ label, value: detailValue });
    }
  }

  return details.slice(0, 10);
}
