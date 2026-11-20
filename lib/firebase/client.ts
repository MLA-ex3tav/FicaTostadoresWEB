import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from "firebase/app-check";
import { getFirebaseConfig, isFirebaseConfigured } from "@/lib/firebase/config";

export { isFirebaseConfigured } from "@/lib/firebase/config";

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) {
    return null;
  }

  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp(getFirebaseConfig());
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();

  if (!app) {
    return null;
  }

  return getAuth(app);
}

export function getFirebaseFirestore(): Firestore | null {
  const app = getFirebaseApp();

  if (!app) {
    return null;
  }

  return getFirestore(app);
}

/**
 * App Check (reCAPTCHA Enterprise).
 *
 * Solo se activa si existe NEXT_PUBLIC_RECAPTCHA_SITE_KEY (requiere crear una
 * clave de reCAPTCHA Enterprise en Google Cloud). Sin la variable no hace nada,
 * así la app funciona igual hasta configurarla.
 */
export function getAppCheckSiteKey(): string {
  return process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ?? "";
}

let appCheckInstance: AppCheck | null = null;

export function initAppCheck(): AppCheck | null {
  if (appCheckInstance) {
    return appCheckInstance;
  }

  const app = getFirebaseApp();
  const siteKey = getAppCheckSiteKey();

  if (!app || !siteKey) {
    return null;
  }

  appCheckInstance = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });

  return appCheckInstance;
}
