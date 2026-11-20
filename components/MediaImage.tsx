"use client";

import Image from "next/image";
import { Factory } from "lucide-react";
import { useState } from "react";

interface MediaImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  fallbackSrc?: string;
  priority?: boolean;
  objectPosition?: string;
  sizes?: string;
  quality?: number;
}

export default function MediaImage({
  src,
  alt,
  className = "h-48 rounded-t-xl",
  fallbackClassName,
  fallbackSrc,
  priority = false,
  objectPosition = "50% 50%",
  sizes = "(max-width: 768px) 100vw, 33vw",
  quality = 80,
}: MediaImageProps) {
  const [failedPrimarySrc, setFailedPrimarySrc] = useState<string | null>(null);
  const [failedFallbackSrc, setFailedFallbackSrc] = useState<string | null>(
    null,
  );
  const containerClass = fallbackClassName ?? className;

  const canUseFallback = Boolean(fallbackSrc) && fallbackSrc !== src;
  const primaryFailed = failedPrimarySrc === src;
  const fallbackFailed = canUseFallback && failedFallbackSrc === fallbackSrc;
  const currentSrc =
    primaryFailed && canUseFallback && fallbackSrc ? fallbackSrc : src;
  const hasError = primaryFailed && (!canUseFallback || fallbackFailed);

  function handleError() {
    if (currentSrc === src) {
      setFailedPrimarySrc(src);
      return;
    }

    setFailedFallbackSrc(currentSrc);
  }

  if (hasError) {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden bg-[#252930] ${containerClass}`}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(255,255,255,0.03) 3px, rgba(255,255,255,0.03) 6px)",
          }}
          aria-hidden="true"
        />
        <Factory className="relative h-16 w-16 text-steel-dark/60" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={currentSrc}
        alt={alt}
        fill
        className="object-cover"
        style={{ objectPosition }}
        sizes={sizes}
        quality={quality}
        priority={priority}
        fetchPriority={priority ? "high" : "auto"}
        onError={handleError}
      />
    </div>
  );
}
