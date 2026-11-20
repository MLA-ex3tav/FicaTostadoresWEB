import { type ReactNode } from "react";

interface SteelPanelProps {
  children: ReactNode;
  className?: string;
  unpadded?: boolean;
  variant?: "steel" | "glass";
}

export default function SteelPanel({
  children,
  className = "",
  unpadded = false,
  variant = "steel",
}: SteelPanelProps) {
  const baseStyle =
    variant === "glass"
      ? "apple-glass rounded-3xl min-w-0 w-full shadow-2xl transition-all duration-300"
      : "steel-texture steel-border rounded-2xl md:rounded-3xl min-w-0 w-full shadow-xl transition-all duration-300";

  return (
    <div
      className={`${baseStyle} ${unpadded ? "" : "p-6 md:p-8"} ${className}`}
    >
      {children}
    </div>
  );
}
