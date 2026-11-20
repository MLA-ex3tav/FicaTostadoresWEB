import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Administración",
  robots: { index: false, follow: false },
};

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
