import { revalidatePath } from "next/cache";
import { invalidateProductsCache } from "@/lib/products-repository";

export function revalidateProductPages(productId?: string): void {
  // Limpia la caché en memoria del catálogo para que el próximo render lea
  // datos frescos de Firestore.
  invalidateProductsCache();

  revalidatePath("/");
  revalidatePath("/productos");
  revalidatePath("/admin/productos");

  if (productId) {
    revalidatePath(`/productos/${productId}`);
    revalidatePath(`/admin/productos/${productId}`);
  }

  revalidatePath("/productos/[id]", "page");
}
