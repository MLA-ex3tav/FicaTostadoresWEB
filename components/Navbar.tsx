"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { Menu, ShoppingCart, X } from "lucide-react";
import { useState, useEffect } from "react";
import { logoPath } from "@/lib/images";
import { useQuoteSelection } from "@/lib/quote-selection";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { useGuestName } from "@/lib/guest-name";
import LoginNavButton from "@/components/LoginNavButton";

const AuthNavButton = dynamic(() => import("@/components/AuthNavButton"), {
  ssr: false,
});

const GuestContinueButton = dynamic(
  () => import("@/components/GuestContinueButton"),
  { ssr: false },
);

const navLinks = [
  { href: "/", label: "Inicio" },
  { href: "/productos", label: "Productos" },
  { href: "/servicio-tecnico", label: "Soporte técnico" },
];

function CotizarButton({
  onClick,
  className = "",
}: {
  onClick?: () => void;
  className?: string;
}) {
  const { products, openDrawer } = useQuoteSelection();
  const count = products.length;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) onClick();
    openDrawer();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Ver cotización (${count} equipos)`}
      title="Ver mi cotización"
      className={`group relative inline-flex h-11 w-11 items-center justify-center rounded-md text-steel-mid transition-colors hover:bg-white/[0.04] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange ${className}`}
    >
      <div className="relative flex items-center">
        <ShoppingCart className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
        {count > 0 && (
          <span
            key={count}
            className="absolute -right-2 -top-2 flex h-4 min-w-4 animate-in zoom-in-50 fade-in items-center justify-center rounded-sm bg-orange px-1 text-[10px] font-bold leading-none tabular-nums text-white duration-150"
          >
            {count}
          </span>
        )}
      </div>
    </button>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { products } = useQuoteSelection();
  const { user, loading: authLoading } = useFirebaseAuth();
  const guestName = useGuestName();
  const cartCount = products.length;
  const showGuestOption = !authLoading && !user && !guestName;
  const hasAccount = Boolean(user) || Boolean(guestName);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    const raf = requestAnimationFrame(onScroll);

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setMenuOpen(false);
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-200 ${
        scrolled
          ? "border-white/10 bg-background/95 backdrop-blur-sm"
          : "border-white/[0.08] bg-background"
      }`}
    >
      <nav
        aria-label="Navegación principal"
        className="mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4 md:px-6"
      >
        {/* LOGO & BADGE INDUSTRIAL */}
        <Link
          href="/"
          className="group flex min-h-11 min-w-0 shrink items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange"
          onClick={() => setMenuOpen(false)}
        >
          <Image
            src={logoPath}
            alt="Fica Tostadores"
            width={200}
            height={56}
            className="h-auto max-h-7 w-full max-w-[100px] object-contain transition-opacity duration-200 group-hover:opacity-80 sm:max-h-8 sm:max-w-[130px] lg:max-h-9"
            priority
          />
        </Link>

        {/* Navegación plana con indicador de página activa. */}
        <ul className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <li key={link.href} className="relative">
                <Link
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative inline-flex min-h-11 items-center border-b-2 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange ${
                    isActive
                      ? "border-orange text-orange"
                      : "border-transparent text-steel-mid hover:border-white/20 hover:text-white"
                  }`}
                >
                  {link.label}

                </Link>
              </li>
            );
          })}
        </ul>

        {/* ACCIONES DERECHA */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-3 md:justify-self-end">
          {hasAccount ? <AuthNavButton /> : <LoginNavButton />}
          <CotizarButton />

          {/* BOTÓN MENÚ MÓVIL */}
          <button
            type="button"
            className="relative flex h-11 w-11 items-center justify-center rounded-md text-steel-light transition-colors hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-orange lg:hidden"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <span className="flex">
                <X className="h-5 w-5" />
              </span>
            ) : (
              <span className="flex">
                <Menu className="h-5 w-5" />
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* MENÚ MÓVIL */}
      {menuOpen && (
        <div
          id="mobile-navigation"
          className="absolute inset-x-0 top-full max-h-[calc(100dvh-72px)] overflow-y-auto overscroll-contain border-b border-t border-white/[0.08] bg-background pb-[env(safe-area-inset-bottom)] shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 lg:hidden"
        >
          <div className="flex flex-col gap-2 px-4 py-5">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);

              return (
                <div key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                    className={`flex min-h-11 items-center justify-between rounded-md px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-white/[0.08] text-orange"
                        : "text-steel-mid hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    <span>{link.label}</span>
                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-orange" />
                    )}
                  </Link>
                </div>
              );
            })}

            <div className="my-2 h-[1px] bg-white/[0.08]" />

            <div className="mt-1 flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">
                  Mi cotización
                </p>
                <p className="truncate text-xs text-steel-dark">
                  {cartCount > 0
                    ? `${cartCount} ${
                        cartCount === 1
                          ? "equipo seleccionado"
                          : "equipos seleccionados"
                      }`
                    : "Aún no agregas equipos"}
                </p>
              </div>
              <CotizarButton onClick={() => setMenuOpen(false)} />
            </div>

            {showGuestOption ? (
              <GuestContinueButton
                onDone={() => setMenuOpen(false)}
                className="mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm font-semibold text-steel-light transition-all hover:border-orange/40 hover:bg-white/[0.06] hover:text-orange active:scale-[0.98]"
              />
            ) : null}
          </div>
        </div>
      )}
    </header>
  );
}
