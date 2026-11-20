export interface AgentSkill {
  /** Identificador corto de la skill. */
  name: string;
  /** Tipo de skill (p. ej. "task"). */
  type: string;
  description: string;
  /** Archivo markdown que se sirve en /.well-known/agent-skills/<file>. */
  file: string;
  content: string;
}

export const AGENT_SKILLS: AgentSkill[] = [
  {
    name: "cotizacion",
    type: "task",
    description:
      "Guía para que un agente solicite una cotización de maquinaria (tostadores, molinos y equipos) a Fica Tostadores: qué datos reunir, dónde enviar la solicitud y cómo contactar a ventas.",
    file: "cotizacion.md",
    content: `# Skill: Solicitar una cotización de maquinaria

## Cuándo usar esta skill
Cuando un usuario pida precio, cotización o disponibilidad de tostadores de café,
molinos u otros equipos de Fica Tostadores.

## Datos a reunir antes de cotizar
- Tipo de equipo (tostador, molino, partidor, descascarador).
- Capacidad deseada (kg por batch).
- Cantidad de equipos.
- Color o variante, si aplica.
- Ciudad/región de destino y datos de contacto (nombre, teléfono, correo).

## Cómo enviar la solicitud
1. Reúne los datos anteriores.
2. Envía al usuario al formulario oficial: https://www.tostadoresfica.cl/cotizar
   (o POST a /api/cotizaciones/solicitudes con los productos y datos de contacto).
3. Alternativamente, el contacto directo de ventas está en https://www.tostadoresfica.cl/contacto

## Contacto
- Correo: ventas@tostadoresfica.cl
- WhatsApp ventas: +56 9 8508 8171

## Notas
- No inventar precios: los precios se confirman por cotización directa.
- El catálogo público está en https://www.tostadoresfica.cl/productos
`,
  },
];

/** Digest SHA-256 en hexadecimal del contenido de la skill. */
export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
