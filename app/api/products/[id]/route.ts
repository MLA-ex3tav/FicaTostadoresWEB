import { NextResponse } from "next/server";
import { getPublicProductById } from "@/lib/products-server";
import { validationErrorResponse } from "@/lib/validation/parse-request";
import { parseProductIdParam } from "@/lib/validation/product-input";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;

  let id: string;

  try {
    id = parseProductIdParam(rawId);
  } catch (error) {
    return validationErrorResponse(error);
  }

  const product = await getPublicProductById(id);

  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  return NextResponse.json(
    { product },
    {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
