"use client";

import { useEffect } from "react";
import ServiceUnavailableScreen from "@/components/ServiceUnavailableScreen";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/global-error]", error);
  }, [error]);

  return (
    <html lang="es">
      <body className="bg-[#0c0e12] text-white">
        <ServiceUnavailableScreen standalone onRetry={reset} />
      </body>
    </html>
  );
}
