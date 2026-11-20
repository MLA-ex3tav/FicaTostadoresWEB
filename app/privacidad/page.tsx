import LegalPageLayout from "@/components/LegalPageLayout";
import { PrivacidadLegalContent } from "@/components/legal/LegalContents";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Política de privacidad",
  description:
    "Política de privacidad y tratamiento de datos personales de Fica Tostadores (Empresas Fica Tostadores Ltda.).",
  path: "/privacidad",
});

export default function PrivacidadPage() {
  return (
    <LegalPageLayout
      eyebrow="Legal"
      title="Política de privacidad"
      description="Información sobre cómo recopilamos, usamos y protegemos sus datos personales al utilizar nuestro sitio web y servicios de cotización."
      lastUpdated={LEGAL_LAST_UPDATED}
      activePath="/privacidad"
    >
      <PrivacidadLegalContent />
    </LegalPageLayout>
  );
}
