import { randomBytes, randomUUID } from "node:crypto";
import {
  FieldValue,
  Timestamp,
  type DocumentReference,
  type Firestore,
} from "firebase-admin/firestore";
import { getFirebaseAdminFirestore } from "@/lib/firebase-admin";
import { isLocalDevMode } from "@/lib/local-dev/mode";
import {
  STAFF_COLLECTION,
  STAFF_INVITACIONES_COLLECTION,
} from "@/lib/firestore-collections";
import { hashToken } from "@/lib/security/token-hash";
import { SITE_URL } from "@/lib/seo";
import {
  isStaffRoleValue,
  type AceptarInvitacionResult,
  type CrearInvitacionResult,
  type StaffInvitacion,
  type StaffInvitacionTipo,
  type StaffMember,
  type StaffRole,
} from "@/lib/staff/types";

const DEFAULT_EXPIRA_HORAS = 72;
const MAX_EXPIRA_HORAS = 24 * 30;

export class StaffRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StaffRepositoryError";
  }
}

function requireDb(): Firestore {
  const db = getFirebaseAdminFirestore();

  if (!db) {
    throw new StaffRepositoryError(
      "Firebase Admin no configurado. Defina FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_PATH.",
    );
  }

  return db;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function toIso(value: unknown): string | null {
  if (value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

function toMillis(value: unknown): number | null {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }
  return null;
}

function serializeStaff(uid: string, data: Record<string, unknown>): StaffMember | null {
  if (!isStaffRoleValue(data.role)) {
    return null;
  }

  return {
    uid,
    email: typeof data.email === "string" ? data.email : "",
    displayName: typeof data.displayName === "string" ? data.displayName : null,
    role: data.role,
    creadoAt: toIso(data.creadoAt),
    actualizadoAt: toIso(data.actualizadoAt),
    creadoPor: typeof data.creadoPor === "string" ? data.creadoPor : null,
  };
}

function serializeInvitacion(id: string, data: Record<string, unknown>): StaffInvitacion | null {
  const tipo = data.tipo;
  const rol = data.rol;

  if ((tipo !== "enlace" && tipo !== "correo") || !isStaffRoleValue(rol)) {
    return null;
  }

  return {
    id,
    tipo,
    rol,
    email: typeof data.email === "string" && data.email ? data.email : null,
    creadoPor: typeof data.creadoPor === "string" ? data.creadoPor : null,
    creadoAt: toIso(data.creadoAt),
    expiraAt: toIso(data.expiraAt),
    usadoAt: toIso(data.usadoAt),
    revocadaAt: toIso(data.revocadaAt),
  };
}

function estaPendiente(data: Record<string, unknown>, now: number): boolean {
  if (data.usadoAt || data.revocadaAt) {
    return false;
  }

  const expiraMs = toMillis(data.expiraAt);
  return expiraMs === null || expiraMs > now;
}

let warnedSinAdmin = false;

/** Rol vigente del staff (null si no es staff o si Admin no está configurado). */
export async function getStaffRole(uid: string): Promise<StaffRole | null> {
  if (isLocalDevMode()) {
    return "admin";
  }

  const db = getFirebaseAdminFirestore();

  if (!db) {
    if (!warnedSinAdmin) {
      warnedSinAdmin = true;
      console.error(
        "[staff] Firebase Admin no configurado: no se pueden resolver roles del panel.",
      );
    }

    return null;
  }

  try {
    const snapshot = await db.collection(STAFF_COLLECTION).doc(uid).get();

    if (!snapshot.exists) {
      return null;
    }

    const role = snapshot.data()?.role;
    return isStaffRoleValue(role) ? role : null;
  } catch (error) {
    console.error("[staff] no se pudo leer el rol:", error);
    return null;
  }
}

export async function listStaff(): Promise<StaffMember[]> {
  const db = requireDb();
  const snapshot = await db.collection(STAFF_COLLECTION).get();

  return snapshot.docs
    .map((doc) => serializeStaff(doc.id, doc.data() as Record<string, unknown>))
    .filter((entry): entry is StaffMember => entry !== null)
    .sort((a, b) => a.email.localeCompare(b.email, "es"));
}

export async function contarAdmins(): Promise<number> {
  const staff = await listStaff();
  return staff.filter((entry) => entry.role === "admin").length;
}

export async function listInvitacionesPendientes(): Promise<StaffInvitacion[]> {
  const db = requireDb();
  const now = Date.now();
  const snapshot = await db.collection(STAFF_INVITACIONES_COLLECTION).get();

  return snapshot.docs
    .map((doc) => ({ doc, data: doc.data() as Record<string, unknown> }))
    .filter(({ data }) => estaPendiente(data, now))
    .map(({ doc, data }) => serializeInvitacion(doc.id, data))
    .filter((entry): entry is StaffInvitacion => entry !== null)
    .sort((a, b) => (b.creadoAt ?? "").localeCompare(a.creadoAt ?? ""));
}

export async function crearInvitacion(input: {
  tipo: StaffInvitacionTipo;
  rol: StaffRole;
  email?: string | null;
  expiraHoras?: number | null;
  creadoPor: string;
}): Promise<CrearInvitacionResult> {
  const db = requireDb();
  const id = randomUUID();
  const email = input.email ? normalizeEmail(input.email) : null;

  let token: string | null = null;
  let tokenHash: string | null = null;
  let expiraAt: Timestamp | null = null;

  if (input.tipo === "enlace") {
    token = randomBytes(32).toString("base64url");
    tokenHash = await hashToken(token);
    const horas = Math.min(
      Math.max(Math.round(input.expiraHoras ?? DEFAULT_EXPIRA_HORAS), 1),
      MAX_EXPIRA_HORAS,
    );
    expiraAt = Timestamp.fromMillis(Date.now() + horas * 3_600_000);
  }

  const now = new Date().toISOString();

  await db.collection(STAFF_INVITACIONES_COLLECTION).doc(id).set({
    tipo: input.tipo,
    rol: input.rol,
    email,
    tokenHash,
    creadoPor: input.creadoPor,
    creadoAt: FieldValue.serverTimestamp(),
    expiraAt,
    usadoAt: null,
    usadoPor: null,
    usadoPorEmail: null,
    revocadaAt: null,
  });

  return {
    invitacion: {
      id,
      tipo: input.tipo,
      rol: input.rol,
      email,
      creadoPor: input.creadoPor,
      creadoAt: now,
      expiraAt: expiraAt ? expiraAt.toDate().toISOString() : null,
      usadoAt: null,
      revocadaAt: null,
    },
    enlace: token
      ? `${SITE_URL.replace(/\/$/, "")}/admin/invitar/${token}`
      : null,
  };
}

export async function revocarInvitacion(id: string): Promise<void> {
  const db = requireDb();
  const ref = db.collection(STAFF_INVITACIONES_COLLECTION).doc(id);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    throw new StaffRepositoryError("Invitación no encontrada.");
  }

  await ref.set({ revocadaAt: FieldValue.serverTimestamp() }, { merge: true });
}

async function aplicarInvitacion(
  db: Firestore,
  inviteRef: DocumentReference,
  input: { uid: string; email: string; displayName: string | null; rol: StaffRole },
): Promise<StaffRole> {
  const email = normalizeEmail(input.email);

  return db.runTransaction(async (transaction) => {
    const inviteSnapshot = await transaction.get(inviteRef);

    if (!inviteSnapshot.exists) {
      throw new StaffRepositoryError("La invitación no existe.");
    }

    const inviteData = inviteSnapshot.data() as Record<string, unknown>;

    if (inviteData.usadoAt) {
      throw new StaffRepositoryError("La invitación ya fue utilizada.");
    }

    if (inviteData.revocadaAt) {
      throw new StaffRepositoryError("La invitación fue revocada.");
    }

    const expiraMs = toMillis(inviteData.expiraAt);

    if (expiraMs !== null && expiraMs <= Date.now()) {
      throw new StaffRepositoryError("La invitación expiró.");
    }

    const staffRef = db.collection(STAFF_COLLECTION).doc(input.uid);
    const staffSnapshot = await transaction.get(staffRef);
    const currentRole = staffSnapshot.data()?.role;
    const role: StaffRole =
      currentRole === "admin" ? "admin" : isStaffRoleValue(currentRole) ? currentRole : input.rol;

    const payload: Record<string, unknown> = {
      uid: input.uid,
      email,
      displayName: input.displayName,
      role,
      actualizadoAt: FieldValue.serverTimestamp(),
    };

    if (!staffSnapshot.exists) {
      payload.creadoAt = FieldValue.serverTimestamp();
      payload.creadoPor = `invitacion:${inviteRef.id}`;
    }

    transaction.set(staffRef, payload, { merge: true });
    transaction.update(inviteRef, {
      usadoAt: FieldValue.serverTimestamp(),
      usadoPor: input.uid,
      usadoPorEmail: email,
    });

    return role;
  });
}

/** Canjea un enlace de invitación (token de un solo uso). */
export async function aceptarInvitacionEnlace(input: {
  token: string;
  uid: string;
  email: string;
  displayName: string | null;
}): Promise<AceptarInvitacionResult> {
  const token = input.token.trim();

  if (!token || token.length > 200) {
    return { ok: false, reason: "no_valida" };
  }

  const db = requireDb();
  const tokenHash = await hashToken(token);
  const snapshot = await db
    .collection(STAFF_INVITACIONES_COLLECTION)
    .where("tokenHash", "==", tokenHash)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return { ok: false, reason: "no_valida" };
  }

  const doc = snapshot.docs[0];
  const data = doc.data() as Record<string, unknown>;

  if (data.tipo !== "enlace") {
    return { ok: false, reason: "no_valida" };
  }

  if (data.revocadaAt) {
    return { ok: false, reason: "no_valida" };
  }

  if (data.usadoAt) {
    return { ok: false, reason: "usada" };
  }

  const expiraMs = toMillis(data.expiraAt);

  if (expiraMs !== null && expiraMs <= Date.now()) {
    return { ok: false, reason: "expirada" };
  }

  if (data.email && data.email !== normalizeEmail(input.email)) {
    return { ok: false, reason: "correo_no_coincide" };
  }

  if (!isStaffRoleValue(data.rol)) {
    return { ok: false, reason: "no_valida" };
  }

  const role = await aplicarInvitacion(db, doc.ref, {
    uid: input.uid,
    email: input.email,
    displayName: input.displayName,
    rol: data.rol,
  });

  return { ok: true, role, invitacionId: doc.id };
}

/**
 * Si el correo tiene una autorización pendiente, le asigna el rol automáticamente.
 * Se ejecuta al iniciar sesión.
 */
export async function aplicarInvitacionPorCorreo(input: {
  uid: string;
  email: string;
  displayName: string | null;
}): Promise<StaffRole | null> {
  const db = getFirebaseAdminFirestore();

  if (!db) {
    return null;
  }

  const email = normalizeEmail(input.email);
  const now = Date.now();

  try {
    const snapshot = await db
      .collection(STAFF_INVITACIONES_COLLECTION)
      .where("email", "==", email)
      .get();

    const candidatas = snapshot.docs
      .filter((doc) => {
        const data = doc.data() as Record<string, unknown>;
        return data.tipo === "correo" && estaPendiente(data, now);
      })
      .sort((a, b) => {
        const aMs = toMillis(a.data().creadoAt) ?? 0;
        const bMs = toMillis(b.data().creadoAt) ?? 0;
        return bMs - aMs;
      });

    if (candidatas.length === 0) {
      return null;
    }

    const invitacion = candidatas[0];
    const data = invitacion.data() as Record<string, unknown>;

    if (!isStaffRoleValue(data.rol)) {
      return null;
    }

    return await aplicarInvitacion(db, invitacion.ref, {
      uid: input.uid,
      email,
      displayName: input.displayName,
      rol: data.rol,
    });
  } catch (error) {
    console.error("[staff] no se pudo aplicar la autorización por correo:", error);
    return null;
  }
}

export async function actualizarRolStaff(
  uid: string,
  role: StaffRole,
): Promise<void> {
  const db = requireDb();
  const ref = db.collection(STAFF_COLLECTION).doc(uid);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    throw new StaffRepositoryError("Miembro del equipo no encontrado.");
  }

  await ref.set(
    { role, actualizadoAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
}

/** Quita el acceso al panel y revoca sus invitaciones pendientes. */
export async function eliminarStaff(uid: string): Promise<void> {
  const db = requireDb();
  const ref = db.collection(STAFF_COLLECTION).doc(uid);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    throw new StaffRepositoryError("Miembro del equipo no encontrado.");
  }

  const email = normalizeEmail(
    typeof snapshot.data()?.email === "string" ? snapshot.data()?.email : "",
  );

  await ref.delete();

  if (!email) {
    return;
  }

  const invitaciones = await db
    .collection(STAFF_INVITACIONES_COLLECTION)
    .where("email", "==", email)
    .get();

  const batch = db.batch();

  for (const doc of invitaciones.docs) {
    const data = doc.data() as Record<string, unknown>;
    if (!data.usadoAt && !data.revocadaAt) {
      batch.set(doc.ref, { revocadaAt: FieldValue.serverTimestamp() }, { merge: true });
    }
  }

  await batch.commit();
}

export async function staffExistePorEmail(email: string): Promise<boolean> {
  const db = requireDb();
  const normalized = normalizeEmail(email);
  const snapshot = await db
    .collection(STAFF_COLLECTION)
    .where("email", "==", normalized)
    .limit(1)
    .get();

  return !snapshot.empty;
}

export async function invitacionPendientePorEmail(email: string): Promise<boolean> {
  const db = requireDb();
  const normalized = normalizeEmail(email);
  const now = Date.now();
  const snapshot = await db
    .collection(STAFF_INVITACIONES_COLLECTION)
    .where("email", "==", normalized)
    .get();

  return snapshot.docs.some((doc) =>
    estaPendiente(doc.data() as Record<string, unknown>, now),
  );
}
