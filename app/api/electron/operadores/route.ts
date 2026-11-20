import {
  extractElectronSecretFromRequest,
  isElectronSecretConfigured,
  verifyElectronAppSecret,
} from "@/lib/electron-presence";
import { electronJson, electronOptionsResponse } from "@/lib/electron-cors";
import {
  crearOperador,
  listOperadores,
  OperadoresRepositoryError,
} from "@/lib/operadores/repository";

/**
 * GET  /api/electron/operadores  → lista de perfiles activos (id, nombre, color).
 * POST /api/electron/operadores  → crea un perfil nuevo (nombre + color opcional).
 *
 * Pensado para la pantalla de selección de APPv2 y MOVIL ("perfiles de
 * Netflix"). Solo expone datos públicos; nunca el PIN ni su hash. Protegidas
 * con el secreto compartido de la app.
 */

export function OPTIONS() {
  return electronOptionsResponse();
}

function unauthorizedResponse() {
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

export async function GET(request: Request) {
  if (!verifyElectronAppSecret(extractElectronSecretFromRequest(request))) {
    return unauthorizedResponse();
  }

  try {
    const operadores = (await listOperadores())
      .filter((operador) => operador.activo)
      .map((operador) => ({
        id: operador.id,
        nombre: operador.nombre,
        color: operador.color,
      }));

    return electronJson({ ok: true, operadores });
  } catch (error) {
    if (error instanceof OperadoresRepositoryError) {
      return electronJson({ error: error.message }, { status: 503 });
    }

    console.error("[electron/operadores]", error);
    return electronJson({ error: "No se pudieron leer los operadores." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!verifyElectronAppSecret(extractElectronSecretFromRequest(request))) {
    return unauthorizedResponse();
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return electronJson({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }

  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
  const color = typeof body.color === "string" ? body.color.trim() : undefined;

  if (!nombre || nombre.length > 80) {
    return electronJson(
      { error: "El nombre es requerido (máx. 80 caracteres)." },
      { status: 400 },
    );
  }

  try {
    const operador = await crearOperador({ nombre, color });

    return electronJson(
      {
        ok: true,
        operador: {
          id: operador.id,
          nombre: operador.nombre,
          color: operador.color,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof OperadoresRepositoryError) {
      return electronJson({ error: error.message }, { status: 503 });
    }

    console.error("[electron/operadores] POST", error);
    return electronJson({ error: "No se pudo crear el perfil." }, { status: 500 });
  }
}
