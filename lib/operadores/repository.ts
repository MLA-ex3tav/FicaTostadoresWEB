import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminFirestore } from "@/lib/firebase-admin";
import type { Operador } from "@/lib/operadores/types";

export const OPERADORES_COLLECTION = "operadores";

export class OperadoresRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OperadoresRepositoryError";
  }
}

const DEFAULT_COLOR = "#E8873A";

function toIso(value: unknown): string | null {
  if (value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

function serializeOperador(id: string, data: Record<string, unknown>): Operador {
  return {
    id,
    nombre: typeof data.nombre === "string" ? data.nombre : "",
    color: typeof data.color === "string" && data.color ? data.color : DEFAULT_COLOR,
    activo: data.activo === true,
    creadoAt: toIso(data.creadoAt),
    ultimoUsoAt: toIso(data.ultimoUsoAt),
  };
}

function requireDb() {
  const db = getFirebaseAdminFirestore();

  if (!db) {
    throw new OperadoresRepositoryError(
      "Firebase Admin no configurado. Defina FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_PATH.",
    );
  }

  return db;
}

/** Lista los operadores (perfiles), ordenados por nombre. */
export async function listOperadores(): Promise<Operador[]> {
  const db = requireDb();
  const snapshot = await db.collection(OPERADORES_COLLECTION).get();

  return snapshot.docs
    .map((doc) => serializeOperador(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export async function crearOperador(input: {
  nombre: string;
  color?: string;
}): Promise<Operador> {
  const db = requireDb();
  const id = randomUUID();
  const nombre = input.nombre.trim();
  const color = input.color?.trim() || DEFAULT_COLOR;

  await db.collection(OPERADORES_COLLECTION).doc(id).set({
    nombre,
    color,
    activo: true,
    creadoAt: FieldValue.serverTimestamp(),
    ultimoUsoAt: null,
  });

  return {
    id,
    nombre,
    color,
    activo: true,
    creadoAt: null,
    ultimoUsoAt: null,
  };
}

export async function actualizarOperador(
  id: string,
  input: { nombre?: string; color?: string; activo?: boolean },
): Promise<Operador> {
  const db = requireDb();
  const ref = db.collection(OPERADORES_COLLECTION).doc(id);
  const existing = await ref.get();

  if (!existing.exists) {
    throw new OperadoresRepositoryError(`Operador no encontrado: ${id}`);
  }

  const update: Record<string, unknown> = {};

  if (typeof input.nombre === "string") update.nombre = input.nombre.trim();
  if (typeof input.color === "string") update.color = input.color.trim() || DEFAULT_COLOR;
  if (typeof input.activo === "boolean") update.activo = input.activo;

  if (Object.keys(update).length > 0) {
    await ref.set(update, { merge: true });
  }

  const updated = await ref.get();
  return serializeOperador(id, updated.data() as Record<string, unknown>);
}

/** Desactiva un perfil (soft delete): conserva la auditoría histórica. */
export async function desactivarOperador(id: string): Promise<void> {
  const db = requireDb();

  await db
    .collection(OPERADORES_COLLECTION)
    .doc(id)
    .set({ activo: false }, { merge: true });
}

/**
 * Devuelve el perfil si existe y está activo (para emitir la sesión). Sin PIN.
 */
export async function obtenerOperadorActivo(
  id: string,
): Promise<{ id: string; nombre: string; color: string } | null> {
  const db = requireDb();
  const snapshot = await db.collection(OPERADORES_COLLECTION).doc(id).get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data() as Record<string, unknown>;

  if (data.activo !== true) {
    return null;
  }

  await snapshot.ref.set({ ultimoUsoAt: FieldValue.serverTimestamp() }, { merge: true });

  return {
    id,
    nombre: typeof data.nombre === "string" ? data.nombre : "",
    color: typeof data.color === "string" && data.color ? data.color : DEFAULT_COLOR,
  };
}

/** ¿El operador sigue activo? (para validar tokens vigentes). */
export async function operadorEstaActivo(id: string): Promise<boolean> {
  const db = requireDb();
  const snapshot = await db.collection(OPERADORES_COLLECTION).doc(id).get();
  return snapshot.exists && snapshot.data()?.activo === true;
}
