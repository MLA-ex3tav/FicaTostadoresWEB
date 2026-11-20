import { isLocalDevMode } from "@/lib/local-dev/mode";

export function getFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim(),
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim(),
  };
}

export function isFirebaseConfigured(): boolean {
  if (isLocalDevMode()) {
    return false;
  }

  const config = getFirebaseConfig();

  return Boolean(
    config.apiKey && config.authDomain && config.projectId && config.appId,
  );
}
