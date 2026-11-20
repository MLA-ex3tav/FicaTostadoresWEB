"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Layers,
  Loader2,
  MapPin,
  MessageSquare,
  Package,
  Plus,
  ShoppingBag,
  User,
  Wrench,
} from "lucide-react";
import CotizacionStatusBadge from "@/components/CotizacionStatusBadge";
import SoporteStatusBadge from "@/components/SoporteStatusBadge";
import Reveal from "@/components/motion/Reveal";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import type { ClientSolicitudCotizacion } from "@/lib/cotizaciones/types";
import type { ClientSolicitudSoporteTecnico } from "@/lib/soporte-tecnico/types";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { buildLoginHref } from "@/lib/login-return-to";

type FilterTab = "todas" | "cotizaciones" | "soporte";

function formatSolicitudDate(iso: string | null): string {
  if (!iso) {
    return "Fecha pendiente";
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "Fecha pendiente";
  }

  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatProductionHint(solicitud: ClientSolicitudCotizacion): string | null {
  if (solicitud.produccionEtapaLabel) {
    return solicitud.produccionEtapaLabel;
  }

  if (solicitud.enEnsamblado) {
    return "En ensamblado";
  }

  if (solicitud.enOT) {
    return "En orden de trabajo";
  }

  if (solicitud.produccion === true) {
    return "En producción";
  }

  if (typeof solicitud.produccion === "string" && solicitud.produccion.trim()) {
    return solicitud.produccion.trim();
  }

  return null;
}

function CotizacionCard({ solicitud }: { solicitud: ClientSolicitudCotizacion }) {
  const productionHint = formatProductionHint(solicitud);

  return (
    <article className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.06] pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-steel-light">
              <FileText className="h-3 w-3 text-orange" />
              #{solicitud.id.slice(0, 8).toUpperCase()}
            </span>
            <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-xs font-medium text-steel-dark">
              Cotización
            </span>
            <span className="text-xs text-steel-dark">
              {formatSolicitudDate(solicitud.createdAt)}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-steel-mid">
            {solicitud.products.length}{" "}
            {solicitud.products.length === 1 ? "equipo solicitado" : "equipos solicitados"}
          </p>
        </div>

        <CotizacionStatusBadge
          cotizacionEstado={solicitud.cotizacionEstado}
          cotizacionEstadoLabel={solicitud.cotizacionEstadoLabel}
          enOT={solicitud.enOT || Boolean(solicitud.produccion)}
        />
      </div>

      <ul className="mt-4 divide-y divide-white/[0.06] rounded-xl border border-white/[0.06] bg-white/[0.01] p-3 sm:p-4">
        {solicitud.products.map((product, index) => (
          <li
            key={`${solicitud.id}-${product.productId ?? product.name}-${index}`}
            className="py-3 first:pt-1 last:pb-1"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-base font-semibold text-white">
                {product.name}
              </p>
              {product.capacity ? (
                <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-xs text-steel-mid">
                  {product.capacity}
                </span>
              ) : null}
            </div>

            {product.selectedColor ? (
              <p className="mt-1 text-xs text-steel-mid">
                <span className="text-steel-dark">Color:</span> {product.selectedColor}
              </p>
            ) : null}

            {product.selectedAddOns.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {product.selectedAddOns.map((addOn) => (
                  <span
                    key={addOn.name}
                    className="rounded border border-orange/20 bg-orange/10 px-2 py-0.5 text-xs font-medium text-orange"
                  >
                    + {addOn.name}
                  </span>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {solicitud.message ? (
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.01] p-3 text-xs leading-relaxed text-steel-mid">
          <span className="font-medium text-steel-light">Mensaje: </span>
          {solicitud.message}
        </div>
      ) : null}

      {productionHint ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-orange/20 bg-orange/10 px-3.5 py-2 text-xs font-medium text-orange">
          <Wrench className="h-3.5 w-3.5 shrink-0" />
          <span>Estado de taller: {productionHint}</span>
        </div>
      ) : null}

      <div className="mt-5 flex items-center justify-end border-t border-white/[0.06] pt-4">
        <Link
          href={`/contacto?asunto=Consulta+Cotizacion+${solicitud.id.slice(0, 8).toUpperCase()}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium   text-orange transition-colors hover:text-orange-hover"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Consultar por esta cotización</span>
        </Link>
      </div>
    </article>
  );
}

function SoporteCard({ solicitud }: { solicitud: ClientSolicitudSoporteTecnico }) {
  return (
    <article className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.06] pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-steel-light">
              <Wrench className="h-3 w-3 text-amber-300" />
              #ST-{solicitud.id.slice(0, 8).toUpperCase()}
            </span>
            <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-xs font-medium text-steel-dark">
              Servicio Técnico
            </span>
            <span className="text-xs text-steel-dark">
              {formatSolicitudDate(solicitud.createdAt)}
            </span>
          </div>

          <h4 className="mt-2 text-lg font-semibold text-white">
            {solicitud.equipmentModel}
          </h4>
        </div>

        <SoporteStatusBadge
          estado={solicitud.estado}
          estadoLabel={solicitud.estadoLabel}
          enOT={solicitud.enOT}
        />
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-steel-dark">Tipo de solicitud:</span>
          <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-steel-light">
            {solicitud.issueCategoryLabel}
          </span>
        </div>

        {solicitud.equipmentLocation ? (
          <div className="flex items-center gap-1.5 text-xs text-steel-mid">
            <MapPin className="h-3.5 w-3.5 text-orange shrink-0" />
            <span>{solicitud.equipmentLocation}</span>
          </div>
        ) : null}

        {solicitud.issueDescription ? (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-3 text-xs leading-relaxed text-steel-mid">
            <span className="font-medium text-steel-light">Detalle reportado: </span>
            {solicitud.issueDescription}
          </div>
        ) : null}

        {(solicitud.enOT || solicitud.produccionEtapaLabel || solicitud.otFolio) && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3.5 py-2 text-xs font-medium text-amber-300">
            <Wrench className="h-3.5 w-3.5 shrink-0" />
            <span>
              {solicitud.otFolio
                ? `OT #${solicitud.otFolio}: `
                : "Orden de taller: "}
              {solicitud.produccionEtapaLabel || "En atención técnica"}
            </span>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-end border-t border-white/[0.06] pt-4">
        <Link
          href={`/contacto?asunto=Consulta+Servicio+ST-${solicitud.id.slice(0, 8).toUpperCase()}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium   text-amber-300 transition-colors hover:text-amber-200"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Consultar por este servicio</span>
        </Link>
      </div>
    </article>
  );
}

export default function MisSolicitudesContent() {
  const router = useRouter();
  const { user, loading, configured, adminFetch } = useFirebaseAuth();

  const [cotizaciones, setCotizaciones] = useState<ClientSolicitudCotizacion[]>([]);
  const [soporte, setSoporte] = useState<ClientSolicitudSoporteTecnico[]>([]);
  const [fetchState, setFetchState] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [fetchError, setFetchError] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("todas");

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!configured || !user) {
      router.replace(buildLoginHref("/mis-solicitudes"));
      return;
    }

    let cancelled = false;

    async function loadData() {
      setFetchState("loading");
      setFetchError("");

      try {
        const [cotResponse, sopResponse] = await Promise.all([
          adminFetch("/api/cotizaciones/mis-solicitudes"),
          adminFetch("/api/soporte-tecnico/mis-solicitudes"),
        ]);

        const cotData = (await cotResponse.json()) as {
          solicitudes?: ClientSolicitudCotizacion[];
          error?: string;
        };

        const sopData = (await sopResponse.json()) as {
          solicitudes?: ClientSolicitudSoporteTecnico[];
          error?: string;
        };

        if (!cotResponse.ok && !sopResponse.ok) {
          throw new Error(cotData.error || sopData.error || "Error al cargar sus solicitudes.");
        }

        if (!cancelled) {
          setCotizaciones(cotData.solicitudes ?? []);
          setSoporte(sopData.solicitudes ?? []);
          setFetchState("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setFetchError(
            error instanceof Error ? error.message : "Error al cargar solicitudes.",
          );
          setFetchState("error");
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [adminFetch, configured, loading, router, user]);

  const totalCotizaciones = cotizaciones.length;
  const totalSoporte = soporte.length;
  const totalGeneral = totalCotizaciones + totalSoporte;

  const enProcesoCotizaciones = cotizaciones.filter(
    (s) => s.enOT || s.enEnsamblado || s.produccion || s.cotizacionEstado === "en_revision",
  ).length;

  const enProcesoSoporte = soporte.filter(
    (s) =>
      s.enOT ||
      s.estado === "en_curso" ||
      s.estado === "en_revision" ||
      s.estado === "abierta" ||
      s.estado === "pendiente",
  ).length;

  const totalEnProceso = enProcesoCotizaciones + enProcesoSoporte;

  const finalizadasCotizaciones = cotizaciones.filter(
    (s) => s.cotizacionEstado === "enviada" || s.cotizacionEstado === "aprobada",
  ).length;

  const finalizadasSoporte = soporte.filter(
    (s) => s.estado === "resuelta" || s.estado === "cerrada" || s.estado === "entregada",
  ).length;

  const totalFinalizadas = finalizadasCotizaciones + finalizadasSoporte;

  type UnifiedItem =
    | { type: "cotizacion"; date: number; data: ClientSolicitudCotizacion }
    | { type: "soporte"; date: number; data: ClientSolicitudSoporteTecnico };

  const unifiedList = useMemo(() => {
    const list: UnifiedItem[] = [];

    if (activeTab === "todas" || activeTab === "cotizaciones") {
      cotizaciones.forEach((item) => {
        list.push({
          type: "cotizacion",
          date: item.createdAt ? Date.parse(item.createdAt) : 0,
          data: item,
        });
      });
    }

    if (activeTab === "todas" || activeTab === "soporte") {
      soporte.forEach((item) => {
        list.push({
          type: "soporte",
          date: item.createdAt ? Date.parse(item.createdAt) : 0,
          data: item,
        });
      });
    }

    return list.sort((a, b) => b.date - a.date);
  }, [activeTab, cotizaciones, soporte]);

  if (loading || !user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="mb-3 h-7 w-7 animate-spin text-orange" />
        <p className="text-sm font-medium text-steel-mid">Cargando sus solicitudes…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Botones de acción principales */}
      <Reveal>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs font-medium   text-steel-dark">
            Centro de atención directa
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/contacto"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange px-4 text-xs font-semibold   text-white shadow-sm transition-all hover:bg-orange-hover active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Nueva Cotización
            </Link>

            <Link
              href="/servicio-tecnico"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 text-xs font-semibold   text-steel-light transition-all hover:border-orange hover:bg-white/[0.05] hover:text-white"
            >
              <Wrench className="h-4 w-4 text-amber-300" />
              Solicitar Asistencia Técnica
            </Link>
          </div>
        </div>
      </Reveal>

      {/* Tarjetas métricas sobrias y consistentes */}
      <Reveal delay={0.05}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-steel-mid">
                <Layers className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">{totalGeneral}</p>
                <p className="text-xs font-medium   text-steel-dark">
                  Total ({totalCotizaciones} cot. / {totalSoporte} serv.)
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-steel-mid">
                <Clock className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">{totalEnProceso}</p>
                <p className="text-xs font-medium   text-steel-dark">
                  En Taller / Revisión
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-steel-mid">
                <CheckCircle2 className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">{totalFinalizadas}</p>
                <p className="text-xs font-medium   text-steel-dark">
                  Respondidas / Finalizadas
                </p>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Pestañas de Filtro */}
      <Reveal delay={0.1}>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
          <div className="w-full sm:w-auto">
            <div className="flex w-full items-stretch rounded-xl border border-white/[0.06] bg-white/[0.02] p-1 sm:inline-flex sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab("todas")}
                className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-2.5 text-xs font-medium   transition-all sm:flex-none sm:px-3.5 ${
                  activeTab === "todas"
                    ? "bg-white/[0.08] text-white border border-white/[0.08]"
                    : "text-steel-mid hover:text-white"
                }`}
              >
                <Layers className="hidden h-3.5 w-3.5 sm:block" />
                Todas ({totalGeneral})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("cotizaciones")}
                className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-2.5 text-xs font-medium   transition-all sm:flex-none sm:px-3.5 ${
                  activeTab === "cotizaciones"
                    ? "bg-white/[0.08] text-white border border-white/[0.08]"
                    : "text-steel-mid hover:text-white"
                }`}
              >
                <FileText className="hidden h-3.5 w-3.5 text-orange sm:block" />
                Cotizaciones ({totalCotizaciones})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("soporte")}
                className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-2.5 text-xs font-medium   transition-all sm:flex-none sm:px-3.5 ${
                  activeTab === "soporte"
                    ? "bg-white/[0.08] text-white border border-white/[0.08]"
                    : "text-steel-mid hover:text-white"
                }`}
              >
                <Wrench className="hidden h-3.5 w-3.5 text-amber-300 sm:block" />
                <span className="sm:hidden">Soporte ({totalSoporte})</span>
                <span className="hidden sm:inline">
                  Servicio Técnico ({totalSoporte})
                </span>
              </button>
            </div>
          </div>

          {totalGeneral > 0 && (
            <span className="text-xs text-steel-dark">
              {unifiedList.length} {unifiedList.length === 1 ? "registro" : "registros"}
            </span>
          )}
        </div>
      </Reveal>

      {/* Estados de Carga / Error */}
      {fetchState === "loading" && (
        <div className="flex flex-col items-center justify-center py-16 text-steel-mid">
          <Loader2 className="mb-2 h-7 w-7 animate-spin text-orange" />
          <p className="text-sm">Cargando solicitudes…</p>
        </div>
      )}

      {fetchState === "error" && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {fetchError}
        </div>
      )}

      {/* Estado Vacío */}
      {fetchState === "ready" && unifiedList.length === 0 && (
        <Reveal>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center sm:p-12 space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-steel-mid">
              <Package className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <h4 className="text-lg font-semibold text-white">
              {activeTab === "todas"
                ? "No tiene solicitudes registradas"
                : activeTab === "cotizaciones"
                ? "No tiene solicitudes de cotización"
                : "No tiene solicitudes de servicio técnico"}
            </h4>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-steel-mid">
              {activeTab === "soporte"
                ? "Si requiere mantención preventiva, repuestos o calibración de su equipo Fica, puede enviar un requerimiento a nuestro taller especializado."
                : "Fabricamos maquinaria industrial y artesanal de tostado de café. Solicite un presupuesto o gestione soporte con nuestro equipo."}
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <Link
                href="/contacto"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-xs font-semibold   text-white shadow-sm transition-all hover:bg-orange-hover"
              >
                <Plus className="h-4 w-4" /> Solicitar Cotización
              </Link>
              <Link
                href="/servicio-tecnico"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-xs font-semibold   text-steel-light transition-all hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-white"
              >
                <Wrench className="h-4 w-4 text-amber-300" /> Asistencia Técnica
              </Link>
            </div>
          </div>
        </Reveal>
      )}

      {/* Lista de Registros */}
      {fetchState === "ready" && unifiedList.length > 0 && (
        <Stagger className="space-y-4">
          {unifiedList.map((item) => (
            <StaggerItem
              key={
                item.type === "cotizacion"
                  ? `cot-${item.data.id}`
                  : `sop-${item.data.id}`
              }
            >
              {item.type === "cotizacion" ? (
                <CotizacionCard solicitud={item.data} />
              ) : (
                <SoporteCard solicitud={item.data} />
              )}
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {/* Enlaces de soporte y navegación al pie */}
      <Reveal delay={0.15}>
          <div className="grid grid-cols-1 gap-4 border-t border-white/[0.06] pt-6 sm:grid-cols-3">
          <Link
            href="/perfil"
            className="group flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-orange hover:bg-white/[0.04]"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-steel-mid group-hover:text-white transition-colors">
                <User className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Mi Perfil</p>
                <p className="text-xs text-steel-dark">Datos de cuenta y sesión</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-steel-dark transition-transform group-hover:translate-x-1 group-hover:text-white" strokeWidth={1.5} />
          </Link>

          <Link
            href="/servicio-tecnico"
            className="group flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-orange hover:bg-white/[0.04]"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-steel-mid group-hover:text-white transition-colors">
                <Wrench className="h-5 w-5 text-amber-300" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Soporte Técnico</p>
                <p className="text-xs text-steel-dark">Nueva orden de mantención</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-steel-dark transition-transform group-hover:translate-x-1 group-hover:text-white" strokeWidth={1.5} />
          </Link>

          <Link
            href="/productos"
            className="group flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-orange hover:bg-white/[0.04]"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-steel-mid group-hover:text-white transition-colors">
                <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Catálogo de Equipos</p>
                <p className="text-xs text-steel-dark">Tostadores industriales</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-steel-dark transition-transform group-hover:translate-x-1 group-hover:text-white" strokeWidth={1.5} />
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
