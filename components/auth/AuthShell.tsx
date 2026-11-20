"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { logoPath, authHeroPath } from "@/lib/images";

interface AuthShellProps {
  /** Título display del panel de marca. */
  brandTitle?: ReactNode;
  brandDescription?: string;
  children: ReactNode;
}

export default function AuthShell({
  brandTitle = "Maquinaria industrial",
  brandDescription = "Tostadores y molinos fabricados bajo estándares de ingeniería, con acero y precisión para su negocio cafetero.",
  children,
}: AuthShellProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-12 lg:py-16">
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-panel md:grid md:min-h-[32rem] md:grid-cols-2">
        {/* Panel de marca */}
        <div className="relative hidden overflow-hidden border-b border-white/[0.06] bg-white/[0.01] md:block md:border-b-0 md:border-r">
          <Image
            src={authHeroPath}
            alt="Tostador Fica en el campo junto a un ternero"
            fill
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            className="z-0 object-cover object-[center_62%]"
          />
          <div
            className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#0b0d10]/95 via-[#0b0d10]/65 to-[#0b0d10]/25"
            aria-hidden
          />
          <div className="relative z-10 flex min-h-full flex-col justify-between gap-10 p-8 lg:p-10">
            <div>
              <Link href="/" className="inline-flex min-h-11 w-fit items-center transition-opacity hover:opacity-85" aria-label="Fica Tostadores">
                <Image
                  src={logoPath}
                  alt="Fica Tostadores"
                  width={180}
                  height={45}
                  className="h-10 w-auto"
                  priority
                />
              </Link>
            </div>

            <div className="space-y-5">
              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl xl:text-4xl leading-tight">
                {brandTitle}
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-steel-mid">
                {brandDescription}
              </p>
            </div>
          </div>
        </div>

        {/* Panel de formulario / contenido */}
        <div className="relative">
          <div className="relative z-10 flex min-h-full flex-col p-6 sm:p-8 lg:p-10">
            <Link
              href="/"
              className="mb-6 inline-flex min-h-11 w-fit items-center md:hidden"
              aria-label="Fica Tostadores"
            >
              <Image
                src={logoPath}
                alt="Fica Tostadores"
                width={170}
                height={44}
                className="h-10 w-auto"
              />
            </Link>
            <div className="flex flex-1 flex-col justify-center">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
