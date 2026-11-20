"use client";

import {
  getCountryCallingCode,
  parsePhoneNumber,
  type Country,
} from "react-phone-number-input";
import es from "react-phone-number-input/locale/es";

interface DetectedPhoneCountryProps {
  value?: string;
}

export default function DetectedPhoneCountry({
  value,
}: DetectedPhoneCountryProps) {
  if (!value) {
    return null;
  }

  let country: Country | undefined;

  try {
    country = parsePhoneNumber(value)?.country;
  } catch {
    country = undefined;
  }

  if (!country) {
    return null;
  }

  const label = es[country] ?? country;

  return (
    <p
      aria-live="polite"
      className="mt-1.5 flex items-center gap-1.5 text-xs text-steel-dark"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-orange" aria-hidden />
      <span className="font-medium text-steel-light">
        {label} (+{getCountryCallingCode(country)})
      </span>
    </p>
  );
}
