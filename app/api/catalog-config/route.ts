import { NextResponse } from "next/server";
import { getCatalogConfig } from "@/lib/catalog-config-server";

export async function GET() {
  const config = await getCatalogConfig();

  return NextResponse.json(config, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=1200",
    },
  });
}
