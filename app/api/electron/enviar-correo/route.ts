import {
  extractElectronSecretFromRequest,
  isElectronSecretConfigured,
  verifyElectronAppSecret,
} from "@/lib/electron-presence";
import { electronJson, electronOptionsResponse } from "@/lib/electron-cors";
import { getFirebaseAdminFirestore } from "@/lib/firebase-admin";
import {
  obtenerGmailConfig,
  enviarCorreoGmail,
} from "@/lib/gmail-config";

/**
 * POST /api/electron/enviar-correo
 *   { "to": "…", "subject": "…", "body": "…", "fileName": "COT-…pdf", "fileBase64": "…" }
 *   Envía un correo desde la cuenta Gmail configurada (nube) con el PDF opcional
 *   adjunto. Lo usan la app de escritorio y la app móvil.
 *
 * Protegida con el secreto compartido (Authorization: Bearer …).
 */

function unauthorizedOrUnavailable(): Response {
  const status = isElectronSecretConfigured() ? 401 : 503;
  return electronJson(
    {
      error:
        status === 401
          ? "Secreto de app inválido o ausente."
          : "COTIZACIONES_APP_SECRET no configurado en el servidor.",
    },
    { status },
  );
}

export function OPTIONS() {
  return electronOptionsResponse();
}

export async function POST(request: Request) {
  if (!verifyElectronAppSecret(extractElectronSecretFromRequest(request))) {
    return unauthorizedOrUnavailable();
  }

  const db = getFirebaseAdminFirestore();
  if (!db) {
    return electronJson({ error: "Firebase Admin no configurado." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return electronJson({ error: "JSON inválido." }, { status: 400 });
  }

  const record = (body ?? {}) as Record<string, unknown>;
  const to = typeof record.to === "string" ? record.to.trim() : "";
  const subject = typeof record.subject === "string" ? record.subject.slice(0, 300) : "";
  const text = typeof record.body === "string" ? record.body : "";
  const fileName =
    typeof record.fileName === "string" && record.fileName.trim()
      ? record.fileName.slice(0, 120)
      : undefined;
  const fileBase64 =
    typeof record.fileBase64 === "string" && record.fileBase64
      ? record.fileBase64
      : undefined;

  if (!to || !subject) {
    return electronJson(
      { error: "Faltan destinatario o asunto." },
      { status: 400 },
    );
  }

  try {
    const config = await obtenerGmailConfig(db);
    if (!config) {
      return electronJson(
        { error: "Correo de Gmail no configurado. Configúralo en Ajustes de la app." },
        { status: 400 },
      );
    }

    await enviarCorreoGmail(config, { to, subject, body: text, fileName, fileBase64 });

    return electronJson({ ok: true });
  } catch (error) {
    console.error("[electron/enviar-correo]", error);
    const message = error instanceof Error ? error.message : String(error);
    return electronJson(
      { error: message.includes("535") ? "Credenciales de Gmail rechazadas." : "No se pudo enviar el correo." },
      { status: 500 },
    );
  }
}
