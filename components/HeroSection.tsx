import HeroCarousel from "./HeroCarousel";
import HeroMobileStatic from "./HeroMobileStatic";
import HeroEntrance from "@/components/motion/HeroEntrance";
import { DEFAULT_HERO_BANNERS } from "@/lib/hero-banners";
import type { HeroProductBanner } from "@/lib/images";

interface HeroSectionProps {
  banners: HeroProductBanner[];
}

export default function HeroSection({ banners }: HeroSectionProps) {
  const mobileBanner = banners[0] ?? DEFAULT_HERO_BANNERS[0];

  return (
    <HeroEntrance>
      <HeroMobileStatic banner={mobileBanner} />
      <div className="hidden md:block">
        <HeroCarousel key={banners.length} banners={banners} />
      </div>
    </HeroEntrance>
  );
}
