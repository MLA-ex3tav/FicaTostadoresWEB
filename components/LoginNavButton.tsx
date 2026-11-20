"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { buildLoginHref } from "@/lib/login-return-to";

const LoginSheet = dynamic(() => import("@/components/LoginSheet"), {
  ssr: false,
});

const loginLinkClass =
  "inline-flex h-11 w-11 items-center justify-center whitespace-nowrap rounded-md border border-white/[0.08] text-steel-mid transition-colors hover:bg-white/[0.04] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange md:h-9 md:w-auto md:gap-2 md:px-3.5 md:text-sm md:font-medium";

export default function LoginNavButton({
  className = "",
}: {
  className?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const loginHref = buildLoginHref(pathname);
  const [loginSheetOpen, setLoginSheetOpen] = useState(false);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (window.matchMedia("(min-width: 768px)").matches) {
      return;
    }

    event.preventDefault();
    router.prefetch(loginHref);
    setLoginSheetOpen(true);
  }

  return (
    <>
      <Link
        href={loginHref}
        onClick={handleClick}
        aria-label="Iniciar sesión"
        aria-haspopup="dialog"
        className={`${loginLinkClass} ${className}`}
      >
        <User className="h-4 w-4 md:hidden" aria-hidden />
        <span className="hidden md:inline">Iniciar sesión</span>
      </Link>
      {loginSheetOpen ? (
        <LoginSheet open onClose={() => setLoginSheetOpen(false)} />
      ) : null}
    </>
  );
}
