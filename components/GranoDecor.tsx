import Image from "next/image";

type GranoVariant = "grano" | "grano2";

const GRAINS: Record<
  GranoVariant,
  { src: string; width: number; height: number }
> = {
  grano: { src: "/images/home/grano.webp", width: 1200, height: 1156 },
  grano2: { src: "/images/home/grano2.webp", width: 1200, height: 887 },
};

interface GranoDecorProps {
  variant?: GranoVariant;
  className?: string;
  opacity?: number;
}

export default function GranoDecor({
  variant = "grano",
  className = "",
  opacity = 0.08,
}: GranoDecorProps) {
  const grain = GRAINS[variant];

  return (
    <Image
      src={grain.src}
      alt=""
      aria-hidden="true"
      width={grain.width}
      height={grain.height}
      sizes="320px"
      style={{ opacity }}
      className={`pointer-events-none absolute -z-10 h-auto select-none invert ${className}`}
    />
  );
}
