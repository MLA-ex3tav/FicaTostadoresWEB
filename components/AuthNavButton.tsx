"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { Layers, LayoutDashboard, Loader2, LogIn, LogOut, User } from "lucide-react";
import { useState } from "react";
import { Blobatar } from "@/components/ui/blobatar";
import BottomSheet from "@/components/ui/bottom-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { getFirebaseAuthErrorMessage } from "@/lib/firebase-auth-errors";
import { clearGuestName, useGuestName } from "@/lib/guest-name";
import { buildLoginHref } from "@/lib/login-return-to";
import { isGoogleOAuthConfigured } from "@/lib/google-oauth-config";
import { useIsMobile } from "@/lib/use-media-query";

const LoginSheet = dynamic(() => import("@/components/LoginSheet"), {
  ssr: false,
});

interface AuthNavButtonProps {
  className?: string;
  onAction?: () => void;
}

const loginLinkClass =
  "inline-flex h-11 w-11 items-center justify-center whitespace-nowrap rounded-md border border-white/[0.08] text-steel-mid transition-colors hover:bg-white/[0.04] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange md:h-9 md:w-auto md:gap-2 md:px-3.5 md:text-sm md:font-medium";

const navTriggerClass =
  "group inline-flex h-11 w-11 items-center justify-center gap-0 rounded-md align-middle transition-colors hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange disabled:opacity-60 md:h-9 md:w-auto md:justify-start md:gap-2";

export default function AuthNavButton({
  className = "",
  onAction,
}: AuthNavButtonProps) {
  const pathname = usePathname();
  const router = useRouter();
  const loginHref = buildLoginHref(pathname);
  const { user, isStaff, loading, signOut } = useFirebaseAuth();
  const guestName = useGuestName();
  const isMobile = useIsMobile();
  const [signingOut, setSigningOut] = useState(false);
  const [loginSheetOpen, setLoginSheetOpen] = useState(false);
  const [guestSheetOpen, setGuestSheetOpen] = useState(false);

  const isActivePath = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const isPerfilActive = isActivePath("/perfil");
  const isSolicitudesActive = isActivePath("/mis-solicitudes");
  const isPanelActive = pathname === "/admin" || pathname.startsWith("/admin/");

  const menuItemClass =
    "group flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium transition-all duration-150 hover:text-orange focus:text-orange data-[highlighted]:text-orange focus-visible:outline-none! outline-none";
  const menuIconClass =
    "h-4 w-4 transition-colors group-hover:text-orange group-focus:text-orange group-data-[highlighted]:text-orange";

  function handleLoginClick() {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches
    ) {
      router.push(loginHref);
      return;
    }

    setLoginSheetOpen(true);
  }

  if (!user && guestName) {
    if (isMobile) {
      return (
        <>
          <button
            type="button"
            title={`Invitado: ${guestName}`}
            onClick={() => setGuestSheetOpen(true)}
            aria-haspopup="dialog"
            className={`${navTriggerClass} ${className}`}
          >
            <Blobatar
              name={guestName}
              alt={guestName}
              size="sm"
              className="size-10 shrink-0 after:hidden md:size-9"
            />
            <span className="hidden max-w-[9rem] truncate text-sm font-medium  text-steel-mid transition-colors group-hover:text-white md:inline">
              {guestName}
            </span>
          </button>

          <BottomSheet
            open={guestSheetOpen}
            onClose={() => setGuestSheetOpen(false)}
            title="Cuenta invitada"
            icon={<User className="h-4 w-4" />}
          >
            <div className="flex items-center gap-3">
              <Blobatar
                name={guestName}
                alt={guestName}
                size="sm"
                className="size-12 shrink-0 ring-2 ring-white/15"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{guestName}</p>
                <p className="truncate text-xs font-medium text-steel-mid">
                  Invitado · sin cuenta
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setGuestSheetOpen(false);
                  setLoginSheetOpen(true);
                }}
                className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5 text-sm font-semibold text-steel-light transition-colors hover:border-orange hover:bg-white/[0.05] hover:text-white"
              >
                <LogIn className="h-4 w-4 text-orange/80" aria-hidden />
                Iniciar sesión
              </button>

              <button
                type="button"
                onClick={() => {
                  clearGuestName();
                  setGuestSheetOpen(false);
                  onAction?.();
                }}
                className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3.5 text-sm font-semibold text-red-300 transition-colors hover:border-red-500/40 hover:bg-red-500/15"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Salir del modo invitado
              </button>
            </div>
          </BottomSheet>

          <LoginSheet
            open={loginSheetOpen}
            onClose={() => setLoginSheetOpen(false)}
          />
        </>
      );
    }
    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title={`Invitado: ${guestName}`}
            className={`${navTriggerClass} ${className}`}
          >
            <Blobatar
              name={guestName}
              alt={guestName}
              size="sm"
              className="size-10 shrink-0 after:hidden md:size-9"
            />
            <span className="hidden max-w-[9rem] truncate text-sm font-medium  text-steel-mid transition-colors group-hover:text-white md:inline">
              {guestName}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-64 rounded-2xl border border-white/[0.08] bg-[#16191d]/95 p-1.5 text-steel-light shadow-2xl shadow-black/60 ring-0 backdrop-blur-xl"
        >
          <DropdownMenuLabel className="px-2.5 py-2 font-normal">
            <div className="flex items-center gap-3">
              <Blobatar
                name={guestName}
                alt={guestName}
                size="sm"
                className="size-10 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{guestName}</p>
                <p className="truncate text-xs text-steel-mid">
                  Invitado · sin cuenta
                </p>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="my-1 bg-white/[0.08]" />

          <DropdownMenuItem asChild className="group flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium text-steel-mid transition-all duration-150 hover:bg-white/[0.04] hover:text-orange focus:bg-white/[0.04] focus:text-orange data-[highlighted]:bg-white/[0.04] data-[highlighted]:text-orange focus-visible:outline-none! outline-none">
            <Link href={loginHref} onClick={onAction}>
              <LogIn className="h-4 w-4 text-orange/80 transition-colors group-hover:text-orange group-focus:text-orange group-data-[highlighted]:text-orange" aria-hidden />
              <span>Iniciar sesión</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="group flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/15 hover:text-red-300 focus:bg-red-500/15 focus:text-red-300 outline-none"
            onClick={() => {
              clearGuestName();
              onAction?.();
            }}
          >
            <LogOut className="h-4 w-4 text-red-400 transition-colors group-hover:text-red-300 group-focus:text-red-300" aria-hidden />
            <span>Salir del modo invitado</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={handleLoginClick}
          aria-label="Iniciar sesión"
          aria-haspopup="dialog"
          className={`${loginLinkClass} ${className}`}
        >
          <User className="h-4 w-4 md:hidden" aria-hidden />
          <span className="hidden md:inline">Iniciar sesión</span>
        </button>
        {loginSheetOpen ? (
          <LoginSheet open onClose={() => setLoginSheetOpen(false)} />
        ) : null}
      </>
    );
  }

  async function handleSignOut() {
    if (signingOut) {
      return;
    }

    setSigningOut(true);

    try {
      if (isGoogleOAuthConfigured()) {
        try {
          const { googleLogout } = await import("@react-oauth/google");
          googleLogout();
        } catch {
          // Ignorar si GIS no está montado (p. ej. sin provider).
        }
      }

      await signOut();
      onAction?.();
    } catch (signOutError) {
      console.error(getFirebaseAuthErrorMessage(signOutError));
    } finally {
      setSigningOut(false);
    }
  }

  const displayName = user.displayName ?? "Mi cuenta";
  const avatarName = user.displayName?.trim() || user.email || user.uid;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={user.email ?? displayName}
          disabled={signingOut || loading}
          className={`${navTriggerClass} ${className}`}
        >
          <Blobatar
            name={avatarName}
            src={user.photoURL ?? undefined}
            alt={displayName}
            size="sm"
            className="size-10 shrink-0 after:hidden md:size-9"
          />
          <span className="hidden max-w-[9rem] truncate text-sm font-medium  text-steel-mid transition-colors group-hover:text-white md:inline">
            {displayName}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-64 rounded-2xl border border-white/[0.08] bg-[#16191d]/95 p-1.5 text-steel-light shadow-2xl shadow-black/60 ring-0 backdrop-blur-xl"
      >
        <DropdownMenuLabel className="px-2.5 py-2 font-normal">
          <div className="flex items-center gap-3">
            <Blobatar
              name={avatarName}
              src={user.photoURL ?? undefined}
              alt={displayName}
              size="sm"
              className="size-10 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{displayName}</p>
              <p className="truncate text-xs text-steel-mid">{user.email}</p>
              {isStaff ? (
                <span className="mt-1.5 inline-flex items-center rounded-full bg-orange/15 px-2 py-0.5 text-[11px] font-semibold text-orange">
                  Panel Admin
                </span>
              ) : null}
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="my-1 bg-white/[0.08]" />

        <DropdownMenuItem asChild className={`${menuItemClass} ${isPerfilActive ? "text-orange" : "text-white"}`}>
          <Link href="/perfil" onClick={onAction} aria-current={isPerfilActive ? "page" : undefined}>
            <User className={`${menuIconClass} ${isPerfilActive ? "text-orange" : "text-white"}`} aria-hidden />
            <span>Mi perfil</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className={`${menuItemClass} ${isSolicitudesActive ? "text-orange" : "text-white"}`}>
          <Link href="/mis-solicitudes" onClick={onAction} aria-current={isSolicitudesActive ? "page" : undefined}>
            <Layers className={`${menuIconClass} ${isSolicitudesActive ? "text-orange" : "text-white"}`} aria-hidden />
            <span>Mis solicitudes</span>
          </Link>
        </DropdownMenuItem>

        {isStaff ? (
          <DropdownMenuItem asChild className={`${menuItemClass} ${isPanelActive ? "text-orange" : "text-white"}`}>
            {/* Recarga completa: el panel admin usa otro árbol de layout raíz. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/admin/productos" onClick={onAction} aria-current={isPanelActive ? "page" : undefined}>
              <LayoutDashboard className={`${menuIconClass} ${isPanelActive ? "text-orange" : "text-white"}`} aria-hidden />
              <span>Panel</span>
            </a>
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator className="my-1 bg-white/[0.08]" />

        <DropdownMenuItem
          disabled={signingOut}
          className="group flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/15 hover:text-red-300 focus:bg-red-500/15 focus:text-red-300 outline-none"
          onClick={() => void handleSignOut()}
        >
          {signingOut ? (
            <Loader2 className="h-4 w-4 animate-spin text-red-400" aria-hidden />
          ) : (
            <LogOut className="h-4 w-4 text-red-400 transition-colors group-hover:text-red-300 group-focus:text-red-300" aria-hidden />
          )}
          <span>{signingOut ? "Cerrando…" : "Cerrar sesión"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
