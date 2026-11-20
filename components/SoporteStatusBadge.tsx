import { CheckCircle2, Clock, Wrench, XCircle, ShieldCheck } from "lucide-react";
import { resolveSoporteStatusDisplay } from "@/lib/soporte-tecnico/client-status";

interface SoporteStatusBadgeProps {
  estado?: string | null;
  estadoLabel?: string | null;
  enOT?: boolean;
  className?: string;
}

export default function SoporteStatusBadge({
  estado,
  estadoLabel,
  enOT = false,
  className = "",
}: SoporteStatusBadgeProps) {
  const status = resolveSoporteStatusDisplay(estado, estadoLabel, enOT);

  const getStatusConfig = () => {
    switch (status.tone) {
      case "success":
        return {
          icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
          label: status.label,
          badgeStyle: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
        };
      case "progress":
        return {
          icon: <Wrench className="h-3.5 w-3.5 text-amber-300" />,
          label: status.label,
          badgeStyle: "border-amber-500/20 bg-amber-500/10 text-amber-300",
        };
      case "danger":
        return {
          icon: <XCircle className="h-3.5 w-3.5 text-red-400" />,
          label: status.label,
          badgeStyle: "border-red-500/20 bg-red-500/10 text-red-400",
        };
      case "neutral":
        return {
          icon: <ShieldCheck className="h-3.5 w-3.5 text-steel-mid" />,
          label: status.label,
          badgeStyle: "border-white/10 bg-white/5 text-steel-mid",
        };
      case "pending":
      default:
        return {
          icon: <Clock className="h-3.5 w-3.5 text-orange" />,
          label: status.label,
          badgeStyle: "border-orange/20 bg-orange/10 text-orange",
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
