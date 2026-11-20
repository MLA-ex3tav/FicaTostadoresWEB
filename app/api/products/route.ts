import { NextResponse } from "next/server";
import { getProducts } from "@/lib/products-server";

export async function GET() {
  const products = await getProducts();

  return NextResponse.json(
    { products },
    {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
