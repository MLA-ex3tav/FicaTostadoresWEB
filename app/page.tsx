import HeroSection from "@/components/HeroSection";
import HomeCtaBanner from "@/components/HomeCtaBanner";
import HomeMachinesGallery from "@/components/HomeMachinesGallery";
import HomeProcessSection from "@/components/HomeProcessSection";
import RoastablesSection from "@/components/RoastablesSection";
import { getHeroProductBanners } from "@/lib/hero-images-server";

export const revalidate = 300;

export default async function Home() {
  const banners = await getHeroProductBanners();

  return (
    <div className="min-h-screen">
      <h1 className="sr-only">
        Fica Tostadores: tostadores de café y frutos secos en Chile
      </h1>

      {/* Top Hero Slider (Height & Size preserved) */}
      <HeroSection banners={banners} />

      {/* 3-Step Manufacturing & Delivery Process */}
      <HomeProcessSection />

      {/* Commodities & Roastable Products */}
      <RoastablesSection />

      {/* Real machines in the field */}
      <HomeMachinesGallery />

      {/* Final High-Converting Quote CTA */}
      <HomeCtaBanner />
    </div>
  );
}
