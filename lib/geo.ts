import { getGeneralPostalCode } from "@/lib/comunas-postal";

export interface GeoSuggestion {
  address: string;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  lat: string | null;
  lon: string | null;
}

interface NominatimAddress {
  road?: string;
  house_number?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  region?: string;
  postcode?: string;
  country?: string;
}

export interface NominatimResult {
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: NominatimAddress;
}

export const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
export const NOMINATIM_CONTACT_EMAIL = "ventas@tostadoresfica.cl";
export const NOMINATIM_USER_AGENT =
  "FicaTostadoresWeb/1.0 (+https://www.tostadoresfica.cl; ventas@tostadoresfica.cl)";
export const NOMINATIM_REFERER = "https://www.tostadoresfica.cl/";

export const GEO_MIN_QUERY_LENGTH = 3;
export const GEO_MAX_QUERY_LENGTH = 120;

function firstNonEmpty(...values: Array<string | undefined>): string | null {
  for (const value of values) {
    if (value && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export function mapNominatimResult(
  result: NominatimResult,
): GeoSuggestion | null {
  const details = result.address ?? {};

  const city = firstNonEmpty(
    details.city,
    details.town,
    details.village,
    details.municipality,
  );
  const region = firstNonEmpty(details.state, details.region);
  // Se prioriza el código postal general de la comuna (CorreosChile) por sobre
  // el de manzana que entrega OpenStreetMap, que suele venir errado.
  const postalCode =
    getGeneralPostalCode(city) ?? firstNonEmpty(details.postcode);
  const country = firstNonEmpty(details.country);

  const street = [details.house_number, details.road]
    .filter(Boolean)
    .join(" ")
    .trim();

  // Se omiten deliberadamente barrio/población (suburb/neighbourhood) y
  // provincia (county) para dejar una dirección más limpia y directa.
  const composed = [street, city, region, postalCode, country]
    .filter(Boolean)
    .join(", ")
    .trim();

  const address = (composed || result.display_name?.trim() || "").slice(0, 200);

  if (!address) {
    return null;
  }

  return {
    address,
    city,
    region,
    postalCode,
    country,
    lat: firstNonEmpty(result.lat),
    lon: firstNonEmpty(result.lon),
  };
}
