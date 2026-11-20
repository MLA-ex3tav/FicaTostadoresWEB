import { electronJson, electronOptionsResponse } from "@/lib/electron-cors";

/**
 * Ping liviano para la sonda de conectividad de las apps (móvil y escritorio).
 * No lee la base de datos ni exige secreto: solo confirma que la API está
 * desplegada y respondiendo. Se llama sin headers personalizados, por lo que
 * no dispara CORS preflight (sin OPTIONS previo).
 */
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return electronOptionsResponse();
}

export function GET() {
  return electronJson({ ok: true });
}
