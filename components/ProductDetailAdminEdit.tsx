"use client";

import { Pencil } from "lucide-react";
import { useFirebaseAuth } from "@/lib/firebase-auth";

interface ProductDetailAdminEditProps {
  productId: string;
}

export default function ProductDetailAdminEdit({
  productId,
}: ProductDetailAdminEditProps) {
  const { isStaff, loading } = useFirebaseAuth();

  if (loading || !isStaff) {
    return null;
  }

  return (
    <a
      href={`/admin/productos/${productId}?returnTo=${encodeURIComponent(
        `/productos/${productId}`,
      )}`}
      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md bg-orange px-4 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-orange-hover"
    >
      <Pencil className="h-3.5 w-3.5" aria-hidden />
      Editar producto
    </a>
  );
}
