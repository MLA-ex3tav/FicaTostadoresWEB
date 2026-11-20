import type { ReactNode } from "react";

interface HeroEntranceProps {
  children: ReactNode;
}

export default function HeroEntrance({ children }: HeroEntranceProps) {
  return <div className="hero-entrance">{children}</div>;
}
