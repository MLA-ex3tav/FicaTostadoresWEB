"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { type ReactNode } from "react";
import { getGoogleOAuthClientId } from "@/lib/google-oauth-config";

interface GoogleAuthProviderProps {
  children: ReactNode;
}

/**
 * Carga el cliente de Google Identity Services solo en las pantallas de acceso
 * (login, registro, admin y el bottom sheet), no en todo el sitio público.
 */
export default function GoogleAuthProvider({
  children,
}: GoogleAuthProviderProps) {
  const clientId = getGoogleOAuthClientId();

  if (!clientId) {
    return children;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>
  );
}
