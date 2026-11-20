"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import "@/components/site-chat-widget.css";
import { cn } from "@/lib/utils";

const DEFAULT_MESSAGE =
  "Hola, quisiera información sobre equipos Fica Tostadores.";
const PANEL_CLOSE_MS = 240;

const QUICK_PROMPTS = [
  "Quiero cotizar un equipo",
  "Necesito soporte técnico",
  "Consulta sobre repuestos",
] as const;

function WhatsAppIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function WhatsAppFloatButton() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const handleClose = useCallback(() => {
    if (closing) {
      return;
    }

    setClosing(true);
    setOpen(false);

    closeTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      setClosing(false);
      closeTimerRef.current = null;
    }, PANEL_CLOSE_MS);
  }, [closing]);

  const handleOpen = useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setClosing(false);
    setVisible(true);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        handleClose();
      }
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleClose]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  function togglePanel() {
    if (open) {
      handleClose();
      return;
    }

    handleOpen();
  }

  async function handleOpenWhatsApp() {
    const { buildWhatsAppContactUrl, openWhatsAppContact } = await import(
      "@/lib/quoting"
    );

    openWhatsAppContact(buildWhatsAppContactUrl(message));
    handleClose();
  }

  return (
    <div
      ref={panelRef}
      className="fixed bottom-3 right-3 z-50 flex flex-col items-end gap-3 sm:right-4 md:bottom-4 md:right-5"
    >
      {visible ? (
        <div
          className={cn(
            "site-chat-panel w-[min(100vw-2rem,21rem)] overflow-hidden rounded-2xl border border-white/10 bg-panel shadow-lg shadow-black/30",
            closing && "site-chat-panel--closing",
          )}
        >
          <div className="relative flex items-start justify-between gap-3 border-b border-white/[0.08] bg-[#16181c] px-4 py-4 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange/10 text-orange">
                <WhatsAppIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  Ventas Fica Tostadores
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-steel-mid">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                  Respondemos a la brevedad
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-1.5 text-steel-mid transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Cerrar WhatsApp"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 px-4 py-4">
            <p className="text-sm leading-relaxed text-steel-mid">
              Cuéntenos qué necesita y sigamos la conversación por WhatsApp.
            </p>

            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setMessage(prompt)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    message === prompt
                      ? "border-orange/50 bg-orange/10 text-orange"
                      : "border-white/10 bg-white/[0.03] text-steel-mid hover:border-orange/40 hover:text-orange",
                  )}
                >
                  {prompt}
                </button>
              ))}
            </div>

            <label className="block">
              <span className="mb-2 block text-xs font-medium   text-steel-dark">
                Mensaje
              </span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={3}
                maxLength={500}
                className="industrial-input resize-none text-sm"
              />
            </label>

            <button
              type="button"
              onClick={() => void handleOpenWhatsApp()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-hover active:scale-[0.98]"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Abrir WhatsApp
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={togglePanel}
        aria-expanded={open}
        aria-label={open ? "Cerrar WhatsApp" : "Abrir WhatsApp de ventas"}
        className={cn(
          "site-chat-launcher inline-flex h-14 items-center justify-center rounded-full bg-orange text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          open
            ? "w-14"
            : "w-14 sm:w-auto sm:gap-2.5 sm:pl-4 sm:pr-5",
        )}
      >
        <span
          className={cn(
            "inline-flex items-center justify-center transition-transform duration-300 ease-out",
            open ? "rotate-90 scale-95" : "rotate-0 scale-100",
          )}
        >
          {open ? (
            <X className="h-6 w-6" strokeWidth={2.25} />
          ) : (
            <WhatsAppIcon className="h-6 w-6" />
          )}
        </span>
        {!open ? (
          <span className="hidden text-sm font-semibold sm:inline">
            Atención comercial
          </span>
        ) : null}
      </button>
    </div>
  );
}
