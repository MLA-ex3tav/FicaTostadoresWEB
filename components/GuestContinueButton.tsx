"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, User } from "lucide-react";
import BottomSheet from "@/components/ui/bottom-sheet";
import { readGuestName, saveGuestName } from "@/lib/guest-name";
import { isValidPersonName } from "@/lib/validation/contact";

interface GuestContinueButtonProps {
  className?: string;
  /** A dónde redirigir tras guardar el nombre. Si se omite, no redirige. */
  redirectTo?: string;
  /** Se ejecuta al guardar el nombre, antes de una posible redirección. */
  onDone?: () => void;
}

export default function GuestContinueButton({
  className = "",
  redirectTo,
  onDone,
}: GuestContinueButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const isValid = isValidPersonName(draft);

  function openSheet() {
    setDraft(readGuestName());
    setError("");
    setOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = draft.trim();
    if (!isValidPersonName(value)) {
      setError("Ingrese su nombre completo (mínimo 3 letras).");
      return;
    }

    saveGuestName(value);
    setError("");
    setOpen(false);
    onDone?.();

    if (redirectTo) {
      router.replace(redirectTo);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        aria-haspopup="dialog"
        className={className}
      >
        <User className="h-4 w-4" aria-hidden />
        <span>Continuar como invitado</span>
      </button>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Continuar como invitado"
        icon={<User className="h-4 w-4" />}
      >
        <p className="text-sm leading-relaxed text-steel-mid">
          Escriba su nombre para cotizar sin crear una cuenta.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
          <label
            htmlFor="guest-sheet-name"
            className="text-sm font-medium text-steel-mid"
          >
            Su nombre
          </label>
          <input
            id="guest-sheet-name"
            type="text"
            required
            maxLength={120}
            autoComplete="name"
            enterKeyHint="done"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setError("");
            }}
            placeholder="Ej: Juan Pérez"
            aria-invalid={Boolean(error)}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-base text-steel-light placeholder:text-steel-dark focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
          />
          {error ? <p className="text-xs text-orange">{error}</p> : null}
          <button
            type="submit"
            disabled={!isValid}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange px-5 text-sm font-semibold text-white transition-colors hover:bg-orange-hover active:scale-[0.98] disabled:opacity-40"
          >
            <span>Continuar</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <p className="mt-3 text-center text-xs leading-relaxed text-steel-dark">
          Su nombre se guarda solo en este dispositivo para prellenar sus
          cotizaciones.
        </p>
      </BottomSheet>
    </>
  );
}
