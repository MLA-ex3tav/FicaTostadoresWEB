import { timingSafeEqual } from "node:crypto";

/**
 * Protege las rutas /api/cron/* con el secreto de Vercel Cron.
 *
 * Vercel envía automáticamente `Authorization: Bearer ${CRON_SECRET}` cuando
 * la variable CRON_SECRET está configurada en el proyecto. Sin esa variable
 * las rutas quedan cerradas (503) para no exponer tareas internas.
 */
export function verifyCronRequest(request: Request): Response | null {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    return Response.json(
      { error: "CRON_SECRET no configurado." },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  const expectedBuffer = Buffer.from(secret);
  const providedBuffer = Buffer.from(provided);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  return null;
}
