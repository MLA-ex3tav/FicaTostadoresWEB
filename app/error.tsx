"use client";

import { useEffect } from "react";
import ServiceUnavailableScreen from "@/components/ServiceUnavailableScreen";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return <ServiceUnavailableScreen onRetry={reset} />;
}
