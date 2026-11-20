import { CheckCircle2, Clock, FileText, XCircle } from "lucide-react";
import { resolveCotizacionStatusDisplay } from "@/lib/cotizaciones/client-status";

interface CotizacionStatusBadgeProps {
  cotizacionEstado?: string | null;
  cotizacionEstadoLabel?: string | null;
  className?: string;
  enOT?: boolean;
}

export default function CotizacionStatusBadge({
  cotizacionEstado,
  cotizacionEstadoLabel,
  className = "",
  enOT = false,
}: CotizacionStatusBadgeProps) {
  const status = resolveCotizacionStatusDisplay(
    cotizacionEstado,
    cotizacionEstadoLabel,
  );

  const getStatusConfig = () => {
    switch (status.tone) {
      case "success":
        return {
          icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
          label: enOT ? "Aprobada (OT)" : status.label || "Aprobada",
          badgeStyle: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
        };
      case "danger":
        return {
          icon: <XCircle className="h-3.5 w-3.5 text-red-400" />,
          label: status.label || "Rechazada",
          badgeStyle: "border-red-500/20 bg-red-500/10 text-red-400",
        };
      case "pending":
        return {
          icon: <Clock className="h-3.5 w-3.5 text-orange" />,
          label: status.label || "En revisión",
          badgeStyle: "border-orange/20 bg-orange/10 text-orange",
        };
      default:
        return {
          icon: <FileText className="h-3.5 w-3.5 text-steel-mid" />,
          label: status.label,
          badgeStyle: "border-white/10 bg-white/5 text-steel-mid",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${config.badgeStyle} ${className}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
}
