/**
 * Modo de desarrollo 100% local.
 *
 * Se activa explícitamente con NEXT_PUBLIC_LOCAL_DEV_MODE=true y nunca en
 * producción. Permite trabajar sin tocar Firebase (sin lecturas ni escrituras
 * en el proyecto real).
 */
export function isLocalDevMode(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_LOCAL_DEV_MODE === "true"
  );
}
