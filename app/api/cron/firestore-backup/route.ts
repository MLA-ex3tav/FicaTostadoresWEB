import { GoogleAuth } from "google-auth-library";
import { verifyCronRequest } from "@/lib/cron-auth";

/**
 * Cron de backup: exporta Firestore completo a un bucket de Google Cloud
 * Storage (Firestore managed export). Ejecutado por Vercel Cron (ver vercel.json).
 *
 * Requisitos (una vez):
 *  1. Crear el bucket GCS, p. ej. `fica-tostadores-backups`.
 *  2. Dar permisos a la cuenta de servicio de Firebase Admin:
 *     - roles/datastore.importExportAdmin (proyecto)
 *     - roles/storage.objectAdmin (bucket)
 *  3. Fijar la variable FIRESTORE_BACKUP_BUCKET (nombre del bucket) en Vercel.
 *
 * Sin FIRESTORE_BACKUP_BUCKET el cron responde 503 y no hace nada (inocuo).
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const FIREBASE_SCOPE = "https://www.googleapis.com/auth/datastore";

function parseServiceAccount(): Record<string, unknown> | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();

  if (!raw) {
    return null;
  }

  try {
    const jsonText = raw.startsWith("{")
      ? raw
      : Buffer.from(raw, "base64").toString("utf8");
    return JSON.parse(jsonText) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getProjectId(credentials: Record<string, unknown>): string | null {
  return (
    process.env.FIREBASE_PROJECT_ID?.trim() ??
    (typeof credentials.project_id === "string" ? credentials.project_id : null)
  );
}

export async function GET(request: Request) {
  const denied = verifyCronRequest(request);

  if (denied) {
    return denied;
  }

  const bucket = process.env.FIRESTORE_BACKUP_BUCKET?.trim();
  const credentials = parseServiceAccount();
  const projectId = credentials ? getProjectId(credentials) : null;

  if (!bucket || !credentials || !projectId) {
    return Response.json(
      {
        ok: false,
        error:
          "Backup no configurado: faltan FIRESTORE_BACKUP_BUCKET o la cuenta de servicio.",
      },
      { status: 503 },
    );
  }

  try {
    const auth = new GoogleAuth({
      credentials,
      scopes: [FIREBASE_SCOPE],
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const outputUriPrefix = `gs://${bucket}/firestore-export/${new Date()
      .toISOString()
      .slice(0, 10)}`;

    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
        projectId,
      )}/databases/(default):exportDocuments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ outputUriPrefix }),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error("[cron/firestore-backup] export falló:", detail);
      return Response.json(
        { ok: false, status: response.status, detail: detail.slice(0, 500) },
        { status: response.status },
      );
    }

    const operation = (await response.json()) as { name?: string };
    return Response.json({
      ok: true,
      outputUriPrefix,
      operation: operation.name ?? null,
    });
  } catch (error) {
    console.error("[cron/firestore-backup]", error);
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
