import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Globe,
  ShieldCheck,
} from "lucide-react";

export const metadata = {
  title: "Analíticas | Panel de Administración Fica",
  description:
    "Acceso al panel de estadísticas y analíticas de tráfico con Google Analytics 4.",
};

const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";
const GA_DASHBOARD_URL = "https://analytics.google.com/analytics/web/";

export default function AnaliticasAdminPage() {
  const isConfigured = GA_MEASUREMENT_ID.length > 0;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="border-b border-white/[0.06] pb-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-steel-dark">
          Métricas & Tráfico
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Analíticas del <span className="text-orange">Sitio Web</span>
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-steel-mid">
          Monitoreo de visitas, comportamiento de usuarios, productos cotizados e
          interacción en tiempo real mediante Google Analytics 4.
        </p>
      </div>

      {!isConfigured ? (
        <div className="flex items-start gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-white">
              Google Analytics aún no está configurado
            </p>
            <p className="mt-1 text-xs leading-relaxed text-steel-mid">
              Crea una propiedad GA4 y define{" "}
              <span className="font-mono text-steel-light">
                NEXT_PUBLIC_GA_MEASUREMENT_ID
              </span>{" "}
              con el ID de medición <span className="font-mono">G-XXXXXXXXXX</span>.
            </p>
          </div>
        </div>
      ) : null}

      {/* Main Launch Card */}
      <div className="rounded-3xl border border-white/10 bg-[#121519]/95 backdrop-blur-2xl p-8 sm:p-12 shadow-2xl text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-orange/25 bg-orange/10 text-orange shadow-lg">
          <Activity className="h-8 w-8 animate-pulse" />
        </div>

        <div className="space-y-2 max-w-xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Dashboard de Google Analytics
          </h2>
          <p className="text-sm text-steel-mid leading-relaxed">
            Consulte métricas detalladas de visitas, páginas más vistas, países,
            fuentes de tráfico y dispositivos desde la propiedad GA4 del sitio.
          </p>
        </div>

        <div>
          <a
            href={GA_DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center gap-3 rounded-xl bg-orange px-8 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-orange-hover active:scale-[0.98]"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Abrir Google Analytics</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Status Highlights */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-start gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-lg">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
              isConfigured
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border-amber-500/20 bg-amber-500/10 text-amber-400"
            }`}
          >
            {isConfigured ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-steel-dark">
              Script de Rastreo
            </p>
            <h3 className="mt-0.5 text-sm font-semibold text-white">
              {isConfigured ? "Activo" : "Pendiente"}
            </h3>
            <p className="mt-0.5 text-[11px] text-steel-dark font-mono truncate">
              googletagmanager.com/gtag/js
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-lg">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange/20 bg-orange/10 text-orange">
            <Globe className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-steel-dark">
              ID de Medición
            </p>
            <h3 className="mt-0.5 text-xs font-mono font-medium text-white truncate">
              {isConfigured ? GA_MEASUREMENT_ID : "Sin configurar"}
            </h3>
            <p className="mt-0.5 text-[11px] text-steel-dark">
              {isConfigured ? "Registrado" : "Falta en Vercel"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-lg">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-steel-dark">
              Privacidad
            </p>
            <h3 className="mt-0.5 text-sm font-semibold text-white">
              Medición GA4
            </h3>
            <p className="mt-0.5 text-[11px] text-steel-dark">
              Usa cookies analíticas
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
