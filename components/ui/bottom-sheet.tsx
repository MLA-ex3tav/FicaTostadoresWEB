"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Ícono opcional a la izquierda del título. */
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function BottomSheet({
  open,
  onClose,
  title,
  icon,
  children,
  className,
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (typeof document === "undefined" || !open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden
      />

      <div
        className={cn(
          "relative flex max-h-[85dvh] w-full flex-col rounded-t-3xl border-t border-white/10 bg-[#121519] shadow-2xl animate-in slide-in-from-bottom duration-300",
          "sm:max-w-md sm:rounded-3xl sm:border sm:border-white/10",
          className,
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
          <div className="flex items-center gap-2">
            {icon ? <span className="text-orange">{icon}</span> : null}
            {title ? (
              <h2 className="text-base font-semibold text-white">{title}</h2>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-steel-mid transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
