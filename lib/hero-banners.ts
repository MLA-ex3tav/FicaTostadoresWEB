import type { HeroProductBanner } from "@/lib/images";
import { CAROUSEL_DEFAULT_FOCUS } from "@/lib/product-images";

export const DEFAULT_HERO_BANNERS: HeroProductBanner[] = [
  {
    productId: "",
    src: "",
    name: "FICA TOSTADORES",
    capacity: "Maquinaria industrial de tueste",
    description:
      "Equipos robustos para café, cacao, frutos secos, granos y semillas. Tecnología robusta, precisión en cada lote y soporte técnico especializado.",
    technicalDetails: [
      { label: "Capacidad máxima", value: "Según modelo" },
      { label: "Capacidad mínima", value: "Según modelo" },
      { label: "Producción", value: "Continua o por lote" },
      { label: "Dimensiones", value: "Consultar ficha técnica" },
      { label: "Peso neto", value: "Variable" },
      { label: "Gas", value: "GLP, natural o leña" },
    ],
    features: [
      "Fabricación chilena, IX Región",
      "Soporte técnico en instalación y mantenimiento",
      "Líneas para café, frutos secos y procesamiento",
      "Equipos a gas, eléctricos o a leña",
    ],
    categoryLabel: "Ingeniería de tueste",
    catalogLabel: "Catálogo completo",
    carouselFocus: CAROUSEL_DEFAULT_FOCUS,
  },
];
