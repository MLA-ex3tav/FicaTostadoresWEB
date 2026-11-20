import {
  getRequestIdToken,
  getUserRoleFromStaff,
  verifyFirebaseUser,
} from "@/lib/firebase-user-session";
import { isLocalDevMode } from "@/lib/local-dev/mode";
import {
  canManageUsers,
  isStaffRole,
  type UserRole,
} from "@/lib/permissions";

export interface StaffSession {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  role: UserRole;
}

const LOCAL_STAFF_SESSION: StaffSession = {
  uid: "localdev0001",
  email: "local@fica.local",
  displayName: "Desarrollo local",
  photoURL: null,
  emailVerified: true,
  role: "admin",
};

async function getStaffSession(request: Request): Promise<StaffSession | null> {
  if (isLocalDevMode()) {
    return LOCAL_STAFF_SESSION;
  }

  const token = getRequestIdToken(request);
  const user = await verifyFirebaseUser(request);

  if (!user || !token) {
    return null;
  }

  const role = await getUserRoleFromStaff(user.uid);

  if (!role || !isStaffRole(role)) {
    return null;
  }

  // El acceso al panel (editor/admin) exige un correo verificado.
  if (!user.emailVerified) {
    return null;
  }

  return { ...user, role };
}

export async function requireStaffSession(
  request: Request,
): Promise<StaffSession | null> {
  return getStaffSession(request);
}

export async function requireSuperAdminSession(
  request: Request,
): Promise<StaffSession | null> {
  const session = await getStaffSession(request);

  if (!session || !canManageUsers(session.role)) {
    return null;
  }

  return session;
}

/** @deprecated Use requireStaffSession or requireSuperAdminSession */
export async function requireAdminSession(request: Request) {
  const session = await requireStaffSession(request);

  if (!session || !canManageUsers(session.role)) {
    return null;
  }

  return session;
}
