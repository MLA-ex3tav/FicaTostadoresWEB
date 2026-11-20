import { getSystemHealthReport } from "@/lib/system-health";

/**
 * Reporte público de salud del sistema. Lo usan el monitoreo de uptime
 * (cron + UptimeRobot) y las sondas externas. No expone secretos.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const report = await getSystemHealthReport();

  return Response.json(report, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
