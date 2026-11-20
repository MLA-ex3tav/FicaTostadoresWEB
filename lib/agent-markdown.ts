import { companyInfo } from "@/lib/company";

/**
 * Representaciones en Markdown de las páginas principales, para responder a
 * peticiones con `Accept: text/markdown` (Markdown for Agents).
 */
const CONTACT_BLOCK = `## Contacto
- Correo: ${companyInfo.email}
- Ventas: ${companyInfo.emailVentas}
- WhatsApp / Teléfono: ${companyInfo.phones.map((p) => p.value).join(" / ")}
- Dirección: ${companyInfo.address}
`;

const MARKDOWN_PAGES: Record<string, string> = {
  "/": `# Fica Tostadores

Fabricante chileno de maquinaria industrial y comercial para el tostado de café:
tostadores TLC, tostadores comerciales e industriales, molinos, partidores,
descascaradores y equipos de procesamiento.

## Secciones
- [Productos](https://www.tostadoresfica.cl/productos): catálogo completo con fichas técnicas.
- [Cotizar](https://www.tostadoresfica.cl/cotizar): solicitud de cotización de maquinaria.
- [Contacto](https://www.tostadoresfica.cl/contacto): datos y formulario.
- [Servicio técnico](https://www.tostadoresfica.cl/servicio-tecnico): soporte, mantenimiento y repuestos.

${CONTACT_BLOCK}`,

  "/productos": `# Productos — Fica Tostadores

Catálogo de tostadores de café TLC, tostadores comerciales e industriales,
molinos, partidores y descascaradores. Fabricación chilena (IX Región).

Explora el catálogo completo en https://www.tostadoresfica.cl/productos

${CONTACT_BLOCK}`,

  "/cotizar": `# Cotizar maquinaria — Fica Tostadores

Solicita una cotización personalizada para tostadores de café, tostadores
comerciales e industriales. Indica tipo de equipo, capacidad, cantidad y datos
de contacto.

Formulario oficial: https://www.tostadoresfica.cl/cotizar

${CONTACT_BLOCK}`,

  "/contacto": `# Contacto — Fica Tostadores

${CONTACT_BLOCK}`,

  "/servicio-tecnico": `# Servicio técnico — Fica Tostadores

Soporte, mantenimiento y repuestos para equipos Fica Tostadores. Reporta fallas
y coordina la reparación con nuestro equipo.

Formulario: https://www.tostadoresfica.cl/servicio-tecnico

${CONTACT_BLOCK}`,
};

export function getAgentMarkdown(pathname: string): string | null {
  const clean =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  return MARKDOWN_PAGES[clean] ?? null;
}

/** Estimación aproximada de tokens (≈ 4 caracteres por token). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
