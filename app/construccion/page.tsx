import { redirect } from "next/navigation";
import ConstruccionScreen from "@/components/ConstruccionScreen";
import { getSiteMode } from "@/lib/site-mode";

export const dynamic = "force-dynamic";

export default async function ConstruccionPage() {
  if ((await getSiteMode()) === "live") {
    redirect("/");
  }

  return <ConstruccionScreen />;
}
