import { cache } from "react";

const UPTIMEROBOT_API_URL = "https://api.uptimerobot.com/v2/getMonitors";
const FETCH_TIMEOUT_MS = 8_000;

export type UptimeRobotMonitorStatus =
  | "up"
  | "down"
  | "paused"
  | "unknown";

export interface UptimeRobotMonitor {
  id: string;
  name: string;
  url: string;
  type: string;
  status: UptimeRobotMonitorStatus;
  uptime7d: number | null;
  uptime30d: number | null;
  allTimeUptime: number | null;
  averageResponseMs: number | null;
  intervalSeconds: number | null;
}

export interface UptimeRobotOverview {
  configured: boolean;
  ok: boolean;
  fetchedAt: string;
  error: string | null;
  monitors: UptimeRobotMonitor[];
  summary: {
    total: number;
    up: number;
    down: number;
    paused: number;
    averageUptime30d: number | null;
    averageResponseMs: number | null;
  };
}

interface UptimeRobotRawMonitor {
  id?: number | string;
  friendly_name?: string;
  url?: string;
  type?: number;
  status?: number;
  custom_uptime_ratio?: string;
  all_time_uptime_ratio?: string;
  average_response_time?: number | string;
  interval?: number;
}

interface UptimeRobotRawResponse {
  stat?: string;
  error?: { message?: string };
  monitors?: UptimeRobotRawMonitor[];
}

const MONITOR_TYPE_LABELS: Record<number, string> = {
  1: "HTTP",
  2: "Keyword",
  3: "Ping",
  4: "Puerto",
  5: "Heartbeat",
};

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function mapStatus(code: number | undefined): UptimeRobotMonitorStatus {
  switch (code) {
    case 2:
      return "up";
    case 0:
      return "paused";
    case 8:
    case 9:
      return "down";
    default:
      return "unknown";
  }
}

function parseUptimeRatios(value: string | undefined): {
  uptime7d: number | null;
  uptime30d: number | null;
} {
  if (!value) {
    return { uptime7d: null, uptime30d: null };
  }

  const [sevenDays, thirtyDays] = value.split("-");

  return {
    uptime7d: parseNumber(sevenDays),
    uptime30d: parseNumber(thirtyDays),
  };
}

function average(values: (number | null)[]): number | null {
  const valid = values.filter((value): value is number => value !== null);

  if (valid.length === 0) {
    return null;
  }

  return valid.reduce((total, value) => total + value, 0) / valid.length;
}

function emptyOverview(
  configured: boolean,
  error: string | null,
): UptimeRobotOverview {
  return {
    configured,
    ok: false,
    fetchedAt: new Date().toISOString(),
    error,
    monitors: [],
    summary: {
      total: 0,
      up: 0,
      down: 0,
      paused: 0,
      averageUptime30d: null,
      averageResponseMs: null,
    },
  };
}

async function fetchUptimeRobotOverview(): Promise<UptimeRobotOverview> {
  const apiKey = process.env.UPTIMEROBOT_API_KEY?.trim();

  if (!apiKey) {
    return emptyOverview(false, null);
  }

  const body = new URLSearchParams({
    api_key: apiKey,
    format: "json",
    custom_uptime_ratios: "7-30",
    all_time_uptime_ratio: "1",
    response_times: "1",
    response_times_limit: "1",
  });

  try {
    const response = await fetch(UPTIMEROBOT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "FicaTostadores/1.0 (+https://tostadoresfica.cl)",
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      return emptyOverview(
        true,
        `UptimeRobot respondió con HTTP ${response.status}.`,
      );
    }

    const data = (await response.json()) as UptimeRobotRawResponse;

    if (data.stat !== "ok") {
      return emptyOverview(
        true,
        data.error?.message || "UptimeRobot devolvió una respuesta inválida.",
      );
    }

    const monitors = (data.monitors ?? []).map((monitor) => {
      const { uptime7d, uptime30d } = parseUptimeRatios(
        monitor.custom_uptime_ratio,
      );

      return {
        id: String(monitor.id ?? ""),
        name: monitor.friendly_name?.trim() || "Monitor sin nombre",
        url: monitor.url?.trim() ?? "",
        type: MONITOR_TYPE_LABELS[monitor.type ?? 0] ?? "Otro",
        status: mapStatus(monitor.status),
        uptime7d,
        uptime30d,
        allTimeUptime: parseNumber(monitor.all_time_uptime_ratio),
        averageResponseMs: parseNumber(monitor.average_response_time),
        intervalSeconds: parseNumber(monitor.interval),
      } satisfies UptimeRobotMonitor;
    });

    return {
      configured: true,
      ok: true,
      fetchedAt: new Date().toISOString(),
      error: null,
      monitors,
      summary: {
        total: monitors.length,
        up: monitors.filter((monitor) => monitor.status === "up").length,
        down: monitors.filter((monitor) => monitor.status === "down").length,
        paused: monitors.filter((monitor) => monitor.status === "paused").length,
        averageUptime30d: average(
          monitors.map((monitor) => monitor.uptime30d),
        ),
        averageResponseMs: average(
          monitors.map((monitor) => monitor.averageResponseMs),
        ),
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";

    return emptyOverview(
      true,
      message.includes("timed out") || message.includes("Timeout")
        ? "UptimeRobot no respondió a tiempo."
        : message,
    );
  }
}

/** Deduplica la consulta dentro de la misma petición (page + health report). */
export const getUptimeRobotOverview = cache(fetchUptimeRobotOverview);

export const UPTIME_ROBOT_DASHBOARD_URL = "https://uptimerobot.com/dashboard";
