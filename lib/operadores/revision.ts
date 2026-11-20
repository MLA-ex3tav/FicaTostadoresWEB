export interface RevisionDoc {
  revisionOperadorId?: string | null;
  revisionOperadorNombre?: string | null;
  revisionExpiraAt?: number | null;
}

export type RevisionEstadoKind = "libre" | "mio" | "otro" | "expirado";

export interface RevisionEstado {
  kind: RevisionEstadoKind;
  operadorId: string | null;
  nombre: string | null;
  expiraAt: number | null;
}

/**
 * Calcula el estado del claim de revisión de una cotización a partir de los
 * campos del documento y un `now` inyectable (ms). "Libre" ante la ausencia de
 * dueño; "expirado" cuando `revisionExpiraAt <= now`. No requiere limpieza.
 */
export function resolverRevision(
  doc: RevisionDoc,
  operadorId: string | null,
  now: number,
): RevisionEstado {
  const ownerId = doc.revisionOperadorId ?? null;

  if (!ownerId) {
    return { kind: "libre", operadorId: null, nombre: null, expiraAt: null };
  }

  const nombre = doc.revisionOperadorNombre ?? null;
  const expiraAt = typeof doc.revisionExpiraAt === "number" ? doc.revisionExpiraAt : null;

  if (expiraAt === null || expiraAt <= now) {
    return { kind: "expirado", operadorId: ownerId, nombre, expiraAt };
  }

  return {
    kind: operadorId && ownerId === operadorId ? "mio" : "otro",
    operadorId: ownerId,
    nombre,
    expiraAt,
  };
}
