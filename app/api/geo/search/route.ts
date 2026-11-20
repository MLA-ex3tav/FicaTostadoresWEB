import { NextResponse } from "next/server";
import {
  GEO_MAX_QUERY_LENGTH,
  GEO_MIN_QUERY_LENGTH,
  mapNominatimResult,
  NOMINATIM_CONTACT_EMAIL,
  NOMINATIM_ENDPOINT,
  NOMINATIM_REFERER,
  NOMINATIM_USER_AGENT,
  type GeoSuggestion,
  type NominatimResult,
} from "@/lib/geo";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();

  if (
    query.length < GEO_MIN_QUERY_LENGTH ||
    query.length > GEO_MAX_QUERY_LENGTH
  ) {
    return NextResponse.json({ results: [] });
  }

  const params = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    limit: "5",
    countrycodes: "cl",
    "accept-language": "es",
    email: NOMINATIM_CONTACT_EMAIL,
    q: query,
  });

  try {
    const response = await fetch(`${NOMINATIM_ENDPOINT}?${params}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": NOMINATIM_USER_AGENT,
        Referer: NOMINATIM_REFERER,
      },
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return NextResponse.json({ results: [] }, { status: 502 });
    }

    const data = (await response.json()) as NominatimResult[];
    const results = Array.isArray(data)
      ? data
          .map(mapNominatimResult)
          .filter((entry): entry is GeoSuggestion => entry !== null)
      : [];

    return NextResponse.json(
      { results },
      { headers: { "Cache-Control": "public, max-age=3600" } },
    );
  } catch {
    return NextResponse.json({ results: [] }, { status: 502 });
  }
}
