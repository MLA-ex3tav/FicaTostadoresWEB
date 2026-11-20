import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/admin-api-guard";
import {
  parseJsonBody,
  validationErrorResponse,
} from "@/lib/validation/parse-request";

const MAX_DESCRIPTION_LENGTH = 220;
const MAX_LONG_DESCRIPTION_LENGTH = 600;
const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";
const FALLBACK_GEMINI_MODEL = "gemini-flash-lite-latest";

export const maxDuration = 60;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    description: { type: "STRING" },
    longDescription: { type: "STRING" },
  },
  required: ["description", "longDescription"],
  propertyOrdering: ["description", "longDescription"],
} as const;

type AiDescriptionMode = "generate" | "improve";

interface AiDescriptionInput {
  name: string;
  capacity: string;
  catalog: string;
  category: string;
  description: string;
  longDescription: string;
  specs: string[];
  features: string[];
  applications: string[];
  technicalDetails: Array<{ label: string; value: string }>;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

function cleanText(value: unknown, maxLength = 600): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function cleanList(value: unknown, maxItems = 25): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => cleanText(item, 300))
    .filter(Boolean)
    .slice(0, maxItems);
}

function cleanDetails(
  value: unknown,
): Array<{ label: string; value: string }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const label = cleanText(record.label, 120);
      const detailValue = cleanText(record.value, 300);

      return label && detailValue ? { label, value: detailValue } : null;
    })
    .filter((item): item is { label: string; value: string } => item !== null)
    .slice(0, 20);
}

function buildPrompt(
  input: AiDescriptionInput,
  mode: AiDescriptionMode,
): string {
  const blocks: string[] = [
    `Producto: ${input.name}`,
    input.capacity ? `Capacidad: ${input.capacity}` : "",
    input.catalog ? `Catálogo: ${input.catalog}` : "",
    input.category ? `Categoría: ${input.category}` : "",
  ].filter(Boolean);

  if (input.specs.length > 0) {
    blocks.push(`Especificaciones:\n- ${input.specs.join("\n- ")}`);
  }

  if (input.features.length > 0) {
    blocks.push(`Características:\n- ${input.features.join("\n- ")}`);
  }

  if (input.applications.length > 0) {
    blocks.push(`Aplicaciones: ${input.applications.join(", ")}`);
  }

  if (input.technicalDetails.length > 0) {
    blocks.push(
      `Detalles técnicos:\n- ${input.technicalDetails
        .map((detail) => `${detail.label}: ${detail.value}`)
        .join("\n- ")}`,
    );
  }

  return [
    "Eres redactor técnico-comercial de Fica Tostadores, fabricante chileno de maquinaria para tostado y procesamiento de café, frutos secos y granos.",
    "Redacta en español de Chile, con tono profesional, claro y concreto.",
    "",
    ...(mode === "improve"
      ? [
          "Tarea: mejora la redacción de las descripciones actuales del producto.",
          "- Corrige ortografía, gramática y redundancias; haz el texto más claro y breve.",
          "- Conserva el significado y los datos. No agregues información que no esté en los textos actuales o en los datos del producto.",
          "- Si uno de los dos campos está vacío, redáctalo a partir del otro y de los datos del producto.",
          "",
          "Texto actual:",
          `Descripción corta: ${input.description || "(vacía)"}`,
          `Descripción larga: ${input.longDescription || "(vacía)"}`,
          "",
        ]
      : []),
    "Reglas obligatorias:",
    "- Usa solo la información entregada. No inventes especificaciones, medidas, capacidades, certificaciones ni materiales.",
    "- No menciones precios, ofertas, descuentos ni valores monetarios.",
    "- No uses markdown, viñetas, encabezados ni comillas decorativas.",
    "- Escribe en tercera persona y evita superlativos vacíos.",
    "- Sé breve y directo; no repitas el nombre completo del producto más de una vez.",
    `- "description": una sola frase para tarjetas de catálogo, máximo 180 caracteres.`,
    `- "longDescription": un párrafo breve de 2 a 3 frases para la ficha, máximo 520 caracteres.`,
    "",
    "Datos del producto:",
    blocks.join("\n"),
  ].join("\n");
}

function extractJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const guard = await requireStaffApi(request, "write");

  if (!guard.ok) {
    return guard.response;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "La generación con IA no está configurada. Agrega GEMINI_API_KEY en el entorno del servidor.",
      },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;

  try {
    body = await parseJsonBody<Record<string, unknown>>(request, 32 * 1024);
  } catch (error) {
    return validationErrorResponse(error);
  }

  const mode: AiDescriptionMode =
    body.mode === "improve" ? "improve" : "generate";

  const input: AiDescriptionInput = {
    name: cleanText(body.name, 160),
    capacity: cleanText(body.capacity, 120),
    catalog: cleanText(body.catalog, 80),
    category: cleanText(body.category, 80),
    description: cleanText(body.description, 500),
    longDescription: cleanText(body.longDescription, 5000),
    specs: cleanList(body.specs),
    features: cleanList(body.features),
    applications: cleanList(body.applications),
    technicalDetails: cleanDetails(body.technicalDetails),
  };

  if (!input.name) {
    return NextResponse.json(
      { error: "Indica el nombre del producto antes de generar la descripción." },
      { status: 400 },
    );
  }

  if (
    mode === "improve" &&
    !input.description &&
    !input.longDescription
  ) {
    return NextResponse.json(
      {
        error:
          "Escribe una descripción corta o larga para poder mejorarla con IA.",
      },
      { status: 400 },
    );
  }

  const configuredModel = process.env.GEMINI_MODEL?.trim();
  const models = Array.from(
    new Set(
      [configuredModel, DEFAULT_GEMINI_MODEL, FALLBACK_GEMINI_MODEL].filter(
        (model): model is string => Boolean(model),
      ),
    ),
  );
  const prompt = buildPrompt(input, mode);

  let geminiResponse: Response | null = null;

  for (const model of models) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:generateContent`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.6,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
        signal: AbortSignal.timeout(20_000),
      });

      if (response.ok) {
        geminiResponse = response;
        break;
      }

      const errorBody = await response.text().catch(() => "");
      console.error(
        "Gemini API error",
        model,
        response.status,
        errorBody.slice(0, 400),
      );

      if (response.status !== 503 && response.status !== 404) {
        break;
      }
    } catch (error) {
      console.error("Gemini request failed", model, error);
    }
  }

  if (!geminiResponse) {
    return NextResponse.json(
      { error: "El servicio de IA no está disponible. Intenta nuevamente." },
      { status: 502 },
    );
  }

  const geminiData = (await geminiResponse
    .json()
    .catch(() => null)) as GeminiResponse | null;

  const rawText =
    geminiData?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? "";

  const parsed = extractJson(rawText) as
    | { description?: unknown; longDescription?: unknown }
    | null;

  const description = cleanText(
    parsed?.description,
    MAX_DESCRIPTION_LENGTH,
  );
  const longDescription = cleanText(
    parsed?.longDescription,
    MAX_LONG_DESCRIPTION_LENGTH,
  );

  if (!description || !longDescription) {
    console.error("Gemini returned an invalid payload", rawText);
    return NextResponse.json(
      { error: "La IA no devolvió una descripción válida. Intenta nuevamente." },
      { status: 502 },
    );
  }

  return NextResponse.json({ description, longDescription });
}
