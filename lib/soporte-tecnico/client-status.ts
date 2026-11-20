export type SoporteStatusTone = "pending" | "progress" | "success" | "danger" | "neutral";

export interface SoporteStatusDisplay {
  label: string;
  tone: SoporteStatusTone;
}

function normalize(value: string | null | undefined): string {
  if (!value || typeof value !== "string") {
    return "";
  }
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

export function resolveSoporteStatusDisplay(
  estado: string | null | undefined,
  estadoLabel: string | null | undefined,
  enOT: boolean = false,
): SoporteStatusDisplay {
  const normEstado = normalize(estado);
  const normLabel = normalize(estadoLabel);
  const combined = `${normEstado} ${normLabel}`;

  if (
    combined.includes("rechazad") ||
    combined.includes("cancelad") ||
    combined.includes("anulad")
  ) {
    return {
      label: estadoLabel?.trim() || "Rechazada",
      tone: "danger",
    };
  }

  if (
    combined.includes("resuelt") ||
    combined.includes("terminad") ||
    combined.includes("entregad") ||
    combined.includes("completad")
  ) {
    return {
      label: estadoLabel?.trim() || (combined.includes("resuelt") ? "Resuelta" : "Finalizada"),
      tone: "success",
    };
  }

  if (combined.includes("cerrad")) {
    return {
      label: estadoLabel?.trim() || "Cerrada",
      tone: "neutral",
    };
  }

  if (
    enOT ||
    combined.includes("ot") ||
    combined.includes("taller") ||
    combined.includes("en_curso") ||
    combined.includes("produccion")
  ) {
    return {
      label: estadoLabel?.trim() || (enOT ? "En taller (OT)" : "En curso"),
      tone: "progress",
    };
  }

  if (
    combined.includes("revis") ||
    combined.includes("pendien") ||
    combined.includes("abiert") ||
    !normEstado
  ) {
    return {
      label: estadoLabel?.trim() || (combined.includes("abiert") ? "Abierta" : "En revisión"),
      tone: "pending",
    };
  }

  return {
    label: estadoLabel?.trim() || estado?.trim() || "Recibida",
    tone: "pending",
  };
}
