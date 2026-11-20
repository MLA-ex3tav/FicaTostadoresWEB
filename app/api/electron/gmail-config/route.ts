import {
  extractElectronSecretFromRequest,
  isElectronSecretConfigured,
  verifyElectronAppSecret,
} from "@/lib/electron-presence";
import { electronJson, electronOptionsResponse } from "@/lib/electron-cors";
import { getFirebaseAdminFirestore } from "@/lib/firebase-admin";
import {
  obtenerGmailConfig,
  guardarGmailConfig,
} from "@/lib/gmail-config";

/**
 * GET /api/electron/gmail-config
 *   Devuelve el correo remitente configurado (sin la contraseña) y si está
 *   lista para enviar. Compartida entre apps de escritorio y móvil.
 *
 * POST /api/electron/gmail-config  { "email": "…", "password": "…" }
 *   Guarda el correo y la contraseña de aplicación de Gmail en la nube.
 *
 * Protegidas con el secreto compartido (Authorization: Bearer …).
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

export async function GET(request: Request) {
  if (!verifyElectronAppSecret(extractElectronSecretFromRequest(request))) {
    return unauthorizedOrUnavailable();
  }

  const db = getFirebaseAdminFirestore();
  if (!db) {
    return electronJson({ error: "Firebase Admin no configurado." }, { status: 503 });
  }

  try {
    const config = await obtenerGmailConfig(db);
    return electronJson({
      ok: true,
      email: config?.email ?? "",
      password: config?.password ?? "",
      configured: Boolean(config),
    });
  } catch (error) {
    console.error("[electron/gmail-config GET]", error);
    return electronJson({ error: "No se pudo leer la configuración." }, { status: 500 });
  }
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
  const email = typeof record.email === "string" ? record.email.trim() : "";
  const password = typeof record.password === "string" ? record.password.trim() : "";

  if (!email || !password) {
    return electronJson(
      { error: "Faltan el correo o la contraseña." },
      { status: 400 },
    );
  }

  try {
    await guardarGmailConfig(db, { email, password });
    return electronJson({ ok: true, email });
  } catch (error) {
    console.error("[electron/gmail-config POST]", error);
    return electronJson({ error: "No se pudo guardar la configuración." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!verifyElectronAppSecret(extractElectronSecretFromRequest(request))) {
    return unauthorizedOrUnavailable();
  }

  const db = getFirebaseAdminFirestore();
  if (!db) {
    return electronJson({ error: "Firebase Admin no configurado." }, { status: 503 });
  }

  try {
    await db.collection("config").doc("gmail").delete();
    return electronJson({ ok: true });
  } catch (error) {
    console.error("[electron/gmail-config DELETE]", error);
    return electronJson({ error: "No se pudo eliminar la configuración." }, { status: 500 });
  }
}
