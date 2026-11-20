import LegalPageLayout from "@/components/LegalPageLayout";
import { TerminosLegalContent } from "@/components/legal/LegalContents";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Términos y condiciones",
  description:
    "Términos y condiciones de uso del sitio web de Fica Tostadores (Empresas Fica Tostadores Ltda.).",
  path: "/terminos",
});

export default function TerminosPage() {
  return (
    <LegalPageLayout
      eyebrow="Legal"
      title="Términos y condiciones"
      description="Condiciones generales de uso del sitio web, catálogo de productos y servicios de información comercial de Fica Tostadores."
      lastUpdated={LEGAL_LAST_UPDATED}
      activePath="/terminos"
    >
      <TerminosLegalContent />
    </LegalPageLayout>
  );
}
