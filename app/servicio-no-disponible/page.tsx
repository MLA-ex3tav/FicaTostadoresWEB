import type { Metadata } from "next";
import ServiceUnavailableScreen from "@/components/ServiceUnavailableScreen";

export const metadata: Metadata = {
  title: "Servicio no disponible | Fica Tostadores",
  description:
    "El servicio de Fica Tostadores no está disponible temporalmente. Intenta nuevamente en unos minutos.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ServicioNoDisponiblePage() {
  return <ServiceUnavailableScreen />;
}
