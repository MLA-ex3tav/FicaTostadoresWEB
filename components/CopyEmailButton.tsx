"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface CopyEmailButtonProps {
  email: string;
}

async function copyToClipboard(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export default function CopyEmailButton({ email }: CopyEmailButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  async function handleCopy() {
    try {
      await copyToClipboard(email);
      setCopied(true);

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        setCopied(false);
        timeoutRef.current = null;
      }, 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
      <span className="break-all text-xl font-semibold tracking-tight text-white sm:text-2xl">
        {email}
      </span>
      <button
        type="button"
        onClick={() => void handleCopy()}
        aria-label={copied ? "Correo copiado" : "Copiar correo"}
        title={copied ? "Correo copiado" : "Copiar correo"}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-steel-mid transition-colors hover:border-orange/40 hover:text-white focus-visible:outline-2 focus-visible:outline-orange"
      >
        {copied ? (
          <Check className="h-4 w-4 text-emerald-400" aria-hidden />
        ) : (
          <Copy className="h-4 w-4" aria-hidden />
        )}
        <span>{copied ? "Copiado" : "Copiar"}</span>
      </button>
    </div>
  );
}
