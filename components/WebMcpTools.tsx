"use client";

import { useEffect } from "react";
import { QUOTE_WHATSAPP } from "@/lib/quote-whatsapp";

/**
 * WebMCP: expone acciones del sitio a agentes de IA que corren en el navegador
 * mediante navigator.modelContext.provideContext(). Es una mejora progresiva:
 * si el navegador no soporta WebMCP, no hace nada.
 *
 * Ref: https://webmachinelearning.github.io/webmcp/
 */
interface WebMcpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<unknown> | unknown;
}

interface ModelContextLike {
  provideContext?: (context: { tools: WebMcpTool[] }) => void;
}

export default function WebMcpTools() {
  useEffect(() => {
    const modelContext = (navigator as Navigator & { modelContext?: ModelContextLike })
      .modelContext;

    if (!modelContext?.provideContext) {
      return;
    }

    const tools: WebMcpTool[] = [
      {
        name: "buscar_productos",
        description:
          "Abre el catálogo de Fica Tostadores para buscar tostadores, molinos y equipos de café.",
        inputSchema: {
          type: "object",
          properties: {
            consulta: {
              type: "string",
              description: "Término de búsqueda (ej. 'tostador 3 kg').",
            },
          },
        },
        execute: () => {
          window.location.assign("/productos");
          return { ok: true, navigatedTo: "/productos" };
        },
      },
      {
        name: "solicitar_cotizacion",
        description:
          "Lleva al formulario de solicitud de cotización de maquinaria de Fica Tostadores.",
        inputSchema: { type: "object", properties: {} },
        execute: () => {
          window.location.assign("/cotizar");
          return { ok: true, navigatedTo: "/cotizar" };
        },
      },
      {
        name: "contactar_ventas",
        description:
          "Devuelve el enlace de WhatsApp de ventas de Fica Tostadores para contactar directamente.",
        inputSchema: { type: "object", properties: {} },
        execute: () => ({
          ok: true,
          whatsapp: `https://wa.me/${QUOTE_WHATSAPP.e164}`,
        }),
      },
    ];

    try {
      modelContext.provideContext({ tools });
    } catch (error) {
      console.warn("[webmcp] No se pudieron registrar las herramientas:", error);
    }
  }, []);

  return null;
}
