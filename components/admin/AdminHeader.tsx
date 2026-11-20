"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Cable,
  ExternalLink,
  FlaskConical,
  Globe,
  LayoutGrid,
  LogOut,
  Package,
  Smartphone,
  Tag,
  UserCog,
  Users,
} from "lucide-react";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { logoPath } from "@/lib/images";
import { isLocalDevMode } from "@/lib/local-dev/mode";

const navItems = [
  { href: "/admin/productos", label: "Productos", icon: Package },
  { href: "/admin/catalogos", label: "Catálogos", icon: LayoutGrid },
  { href: "/admin/categorias", label: "Categorías", icon: Tag },
  { href: "/admin/conexiones", label: "Conexiones", icon: Cable },
  { href: "/admin/dispositivos", label: "Dispositivos", icon: Smartphone },
  { href: "/admin/sitio", label: "Sitio", icon: Globe },
  { href: "/admin/analiticas", label: "Analíticas", icon: BarChart3 },
  { href: "/admin/simulacion", label: "Simulación", icon: FlaskConical },
  { href: "/admin/perfiles", label: "Perfiles", icon: Users },
];

function navLinkClass(isActive: boolean) {
  return `inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
    isActive
      ? "bg-orange/15 text-orange border border-orange/30 shadow-sm"
      : "text-steel-mid border border-transparent hover:border-white/[0.08] hover:bg-white/[0.03] hover:text-white"
  }`;
}

export default function AdminHeader() {
  const pathname = usePathname();
  const { user, role, isSuperAdmin, signOut } = useFirebaseAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#121519]/95 backdrop-blur-2xl">
      <div className="w-full px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/productos" className="transition-opacity hover:opacity-85">
              <Image
                src={logoPath}
                alt="Fica Tostadores"
                width={160}
                height={40}
                className="h-8 w-auto sm:h-9"
                priority
              />
            </Link>
            <div className="hidden h-6 w-px bg-white/[0.08] sm:block" aria-hidden />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-steel-dark">
                Panel de Control
              </p>
              <h1 className="text-sm font-semibold tracking-tight text-white sm:text-base">
                Administración <span className="text-orange">Industrial</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {user?.email ? (
              <div className="hidden items-center gap-2 sm:flex">
                <span className="font-mono text-steel-mid">{user.email}</span>
                {role ? (
                  <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-steel-light">
                    {role}
                  </span>
                ) : null}
                {isLocalDevMode() ? (
                  <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                    Local
                  </span>
                ) : null}
              </div>
            ) : null}
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-steel-light transition-all hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              <span>Ver sitio</span>
            </Link>
            <button
              type="button"
              onClick={() =>
                void signOut().then(() => window.location.assign("/admin/login"))
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-steel-light transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              <span>Salir</span>
            </button>
          </div>
        </div>

        <nav className="mt-3 flex items-center gap-1 overflow-x-auto border-t border-white/[0.06] pt-2.5 pb-0.5 no-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={navLinkClass(isActive)}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {item.label}
              </Link>
            );
          })}
          {isSuperAdmin ? (
            <Link
              href="/admin/equipo"
              aria-current={pathname.startsWith("/admin/equipo") ? "page" : undefined}
              className={navLinkClass(pathname.startsWith("/admin/equipo"))}
            >
              <UserCog className="h-3.5 w-3.5" aria-hidden />
              Equipo
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
