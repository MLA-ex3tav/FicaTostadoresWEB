import { revalidatePath } from "next/cache";
import {
  extractElectronSecretFromRequest,
  isElectronSecretConfigured,
  verifyElectronAppSecret,
} from "@/lib/electron-presence";
import { electronJson, electronOptionsResponse } from "@/lib/electron-cors";
import { canPersistCatalogConfig } from "@/lib/catalog-config-repository";
import { FIREBASE_ADMIN_NOT_CONFIGURED_MESSAGE } from "@/lib/firebase-admin-config";
import {
  getCatalogConfig,
  updateCatalogConfig,
} from "@/lib/catalog-config-server";
import {
  parseJsonBody,
  RequestValidationError,
} from "@/lib/validation/parse-request";
import { parseCatalogConfigInput } from "@/lib/validation/catalog-input";

function revalidateCatalogPages() {
  revalidatePath("/");
  revalidatePath("/productos");
  revalidatePath("/productos/[id]", "page");
  revalidatePath("/admin/productos");
  revalidatePath("/admin/catalogos");
  revalidatePath("/admin/categorias");
}

/**
 * PUT /api/electron/catalog-config
 *
 * Guarda la configuración de catálogos y categorías (documento
 * `catalogo_config/default`) usando el secreto compartido de la app
 * (Authorization: Bearer COTIZACIONES_APP_SECRET). Permite que la app de
 * escritorio agregue y elimine catálogos y categorías desde Ajustes.
 */
export function OPTIONS() {
  return electronOptionsResponse();
}

export async function GET() {
  const config = await getCatalogConfig();
  return electronJson(config);
}

export async function PUT(request: Request) {
  if (!verifyElectronAppSecret(extractElectronSecretFromRequest(request))) {
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

  if (!canPersistCatalogConfig()) {
    return electronJson(
      {
        error: FIREBASE_ADMIN_NOT_CONFIGURED_MESSAGE,
      },
      { status: 503 },
    );
  }

  try {
    const body = await parseJsonBody<unknown>(request);
    const configInput = parseCatalogConfigInput(body);
    const config = await updateCatalogConfig(configInput);
    revalidateCatalogPages();
    return electronJson(config);
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return electronJson(
        { error: error.message ?? "Configuración de catálogo inválida." },
        { status: 400 },
      );
    }

    return electronJson(
      { error: "No se pudo guardar la configuración del catálogo." },
      { status: 400 },
    );
  }
}