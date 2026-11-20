"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useId, useState, type AnimationEvent } from "react";
import { X } from "lucide-react";
import { TERMS_ACCEPTED_STORAGE_KEY, LEGAL_LAST_UPDATED } from "@/lib/legal";

const legalLoading = () => (
  <p className="py-2 text-xs text-steel-dark">Cargando…</p>
);

const TerminosLegalContent = dynamic(
  () =>
    import("@/components/legal/LegalContents").then(
      (mod) => mod.TerminosLegalContent,
    ),
  { loading: legalLoading },
);

const PrivacidadLegalContent = dynamic(
  () =>
    import("@/components/legal/LegalContents").then(
      (mod) => mod.PrivacidadLegalContent,
    ),
  { loading: legalLoading },
);

function hasAcceptedTerms(): boolean {
  try {
    return window.localStorage.getItem(TERMS_ACCEPTED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export default function TermsConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);
  const [declinedNotice, setDeclinedNotice] = useState(false);
  const [closing, setClosing] = useState<"accept" | "decline" | null>(null);
  const [expanded, setExpanded] = useState<"terminos" | "privacidad" | null>(
    null,
  );
  const checkboxId = useId();

  const requestClose = useCallback((reason: "accept" | "decline") => {
    setClosing((current) => current ?? reason);
  }, []);

  const finishClose = useCallback(() => {
    setVisible(false);
    setClosing(null);

    if (closing === "decline") {
      setDeclinedNotice(true);
    }
  }, [closing]);

  useEffect(() => {
    if (!hasAcceptedTerms()) {
      const raf = requestAnimationFrame(() => {
        setVisible(true);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        requestClose("decline");
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [visible, requestClose]);

  useEffect(() => {
    if (!closing) {
      return;
    }

    // Respaldo por si no se dispara animationend (p. ej. reduced motion).
    const timeout = window.setTimeout(finishClose, 400);
    return () => window.clearTimeout(timeout);
  }, [closing, finishClose]);

  useEffect(() => {
    if (!declinedNotice) {
      return;
    }

    const timeout = window.setTimeout(() => setDeclinedNotice(false), 6000);
    return () => window.clearTimeout(timeout);
  }, [declinedNotice]);

  const handleAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLDivElement>) => {
      if (closing && event.animationName === "exit") {
        finishClose();
      }
    },
    [closing, finishClose],
  );

  const handleAccept = useCallback(() => {
    if (!checked) {
      return;
    }

    try {
      window.localStorage.setItem(TERMS_ACCEPTED_STORAGE_KEY, "true");
    } catch {
      // localStorage unavailable — dismiss for this session only
    }

    window.dispatchEvent(new Event("fica:terms-accepted"));
    requestClose("accept");
  }, [checked, requestClose]);

  const handleDecline = useCallback(() => {
    requestClose("decline");
  }, [requestClose]);

  if (!visible && !declinedNotice) {
    return null;
  }

  return (
    <>
      {visible && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center px-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
          <div
            role="region"
            aria-label="Aviso de términos y privacidad"
            onAnimationEnd={handleAnimationEnd}
            className={`pointer-events-auto mx-auto flex w-full max-w-5xl flex-col rounded-2xl border border-white/10 bg-[#121519]/95 p-3 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.75)] backdrop-blur-xl motion-reduce:animate-none sm:py-3.5 sm:pl-5 sm:pr-4 ${
              closing
                ? "animate-out fade-out slide-out-to-bottom-6 duration-200 ease-in fill-mode-forwards"
                : "animate-in fade-in slide-in-from-bottom-6 duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            }`}
          >
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div
                  id="terms-legal-content"
                  className="legal-compact legal-scroll mb-3 max-h-[70dvh] overflow-y-auto overscroll-contain border-b border-white/[0.08] pb-4"
                >
                  {expanded && (
                    <>
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold   text-steel-dark">
                            {expanded === "terminos"
                              ? "Términos y condiciones"
                              : "Política de privacidad"}
                          </p>
                          <p className="mt-0.5 text-xs text-steel-dark">
                            Última actualización: {LEGAL_LAST_UPDATED}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpanded(null)}
                          aria-label="Cerrar texto legal"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] text-steel-mid transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-orange"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      {expanded === "terminos" ? (
                        <TerminosLegalContent />
                      ) : (
                        <PrivacidadLegalContent />
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <input
                id={checkboxId}
                type="checkbox"
                checked={checked}
                onChange={(event) => setChecked(event.target.checked)}
                className="h-6 w-6 shrink-0 cursor-pointer rounded border-white/20 bg-white/5 accent-orange"
              />
              <p className="text-xs leading-relaxed text-steel-mid">
                <label htmlFor={checkboxId} className="cursor-pointer">
                  He leído y acepto los
                </label>{" "}
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((current) =>
                      current === "terminos" ? null : "terminos",
                    )
                  }
                  aria-expanded={expanded === "terminos"}
                  aria-controls="terms-legal-content"
                  className="font-medium text-orange underline underline-offset-2 hover:text-orange-hover"
                >
                  términos y condiciones
                </button>{" "}
                y la{" "}
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((current) =>
                      current === "privacidad" ? null : "privacidad",
                    )
                  }
                  aria-expanded={expanded === "privacidad"}
                  aria-controls="terms-legal-content"
                  className="font-medium text-orange underline underline-offset-2 hover:text-orange-hover"
                >
                  política de privacidad
                </button>
                .
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2.5">
              <button
                type="button"
                onClick={handleDecline}
                className="inline-flex h-11 shrink-0 flex-1 items-center justify-center rounded-xl border border-white/20 px-4 text-sm font-semibold text-steel-light transition-colors hover:bg-white/[0.05] hover:text-white focus-visible:outline-2 focus-visible:outline-orange sm:w-40 sm:flex-none"
              >
                Rechazar
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={!checked}
                className="inline-flex h-11 shrink-0 flex-1 items-center justify-center rounded-xl bg-orange px-4 text-sm font-semibold text-white transition-colors hover:bg-orange-hover focus-visible:outline-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-orange sm:w-40 sm:flex-none"
              >
                <span className="sm:hidden">Aceptar</span>
                <span className="hidden sm:inline">Aceptar y continuar</span>
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {declinedNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-4 right-4 z-[71] mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#121519]/95 p-4 text-xs text-steel-light shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-300 motion-reduce:animate-none sm:left-auto sm:right-6"
        >
          <span>Puede seguir navegando por el sitio. Se le volverá a solicitar la aceptación en su próxima visita.</span>
          <button
            type="button"
            onClick={() => setDeclinedNotice(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/[0.08] text-steel-dark transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label="Cerrar aviso"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </>
  );
}
