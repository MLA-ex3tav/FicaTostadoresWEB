"use client";

import { useEffect } from "react";
import { useFirebaseAuth } from "@/lib/firebase-auth";

const STORAGE_KEY = "fica_staff_gate_reload_at";
const RELOAD_GUARD_MS = 30_000;

/**
 * Si el visitante ya tiene sesión de staff, la cookie de acceso se emite en
 * segundo plano. Este watcher recarga una vez para que el servidor muestre
 * el sitio normal en lugar de la pantalla "Muy pronto".
 */
export default function StaffGateWatcher() {
  const { loading, isStaff } = useFirebaseAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!isStaff) {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // sessionStorage puede no estar disponible.
      }
      return;
    }

    let lastAttempt = 0;

    try {
      lastAttempt = Number(sessionStorage.getItem(STORAGE_KEY) ?? 0);
    } catch {
      // Ignorar.
    }

    if (
      Number.isFinite(lastAttempt) &&
      Date.now() - lastAttempt < RELOAD_GUARD_MS
    ) {
      return;
    }

    try {
      sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // Ignorar.
    }

    window.location.reload();
  }, [loading, isStaff]);

  return null;
}
