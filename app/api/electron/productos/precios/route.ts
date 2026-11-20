import {
  extractElectronSecretFromRequest,
  isElectronSecretConfigured,
  verifyElectronAppSecret,
} from "@/lib/electron-presence";
import { electronJson, electronOptionsResponse } from "@/lib/electron-cors";
import { readAllProductPricesFromFirestore } from "@/lib/catalog/firestore-product-repository";

/**
 * GET /api/electron/productos/precios
 *
 * Precios privados del catálogo para APPv2 y MOVIL. Los documentos públicos de
 * `productos` ya no contienen precios; las apps los combinan con esta lectura
 * autenticada con el secreto compartido.
 */
export function OPTIONS() {
  return electronOptionsResponse();
}

export async function GET(request: Request) {
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

  const prices = await readAllProductPricesFromFirestore();

  return electronJson(
    { ok: true, prices },
    { headers: { "Cache-Control": "no-store" } },
  );
}
