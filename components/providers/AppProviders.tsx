"use client";

import { type ReactNode } from "react";
import { FirebaseAuthProvider } from "@/lib/firebase-auth";

interface AppProvidersProps {
  children: ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  return <FirebaseAuthProvider>{children}</FirebaseAuthProvider>;
}
