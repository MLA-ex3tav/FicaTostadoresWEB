import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirebaseConfig, isFirebaseConfigured } from "@/lib/firebase/config";

/**
 * Carga únicamente app + auth (sin Firestore ni App Check) para que el bundle
 * público no arrastre el SDK completo cuando el visitante es anónimo.
 */
export function getFirebaseAuthOnly(): Auth | null {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const app: FirebaseApp =
    getApps().length > 0 ? getApp() : initializeApp(getFirebaseConfig());

  return getAuth(app);
}
