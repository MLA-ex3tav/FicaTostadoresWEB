"use client";

import { Suspense } from "react";
import { LogIn } from "lucide-react";
import BottomSheet from "@/components/ui/bottom-sheet";
import GoogleAuthProvider from "@/components/providers/GoogleAuthProvider";
import GoogleLoginCard from "@/components/GoogleLoginCard";

interface LoginSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function LoginSheet({ open, onClose }: LoginSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Iniciar sesión"
      icon={<LogIn className="h-4 w-4" />}
    >
      <Suspense
        fallback={<p className="text-sm text-steel-mid">Cargando…</p>}
      >
        <GoogleAuthProvider>
          <GoogleLoginCard
            badge="Iniciar sesión"
            title="Iniciar sesión"
            subtitle="Ingrese con su cuenta de Google para acceder a su panel."
            embedded
            allowGuest
          />
        </GoogleAuthProvider>
      </Suspense>
    </BottomSheet>
  );
}
