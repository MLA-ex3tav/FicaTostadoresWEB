import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/admin-api-guard";
import { getFirebaseAdminFirestore } from "@/lib/firebase-admin";
import {
  esModoSimulacion,
  setModoSimulacion,
  simulacionForzadaPorEnv,
} from "@/lib/cotizaciones/folio";

/**
 * GET /api/admin/simulacion
 *   Estado actual del modo simulación de folios (visible en el panel admin).
 *
 * PUT /api/admin/simulacion  { "activo": true|false }
 *   Activa/desactiva el modo simulación de forma persistente (Firestore).
 *   Aplica a las cotizaciones de la web y de las apps (escritorio y móvil).
 */

export async function GET(request: Request) {
  const guard = await requireStaffApi(request, "read");

  if (!guard.ok) {
    return guard.response;
  }

  const db = getFirebaseAdminFirestore();

  if (!db) {
    return NextResponse.json(
      {
        error:
          "Firebase Admin no configurado. Defina FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_PATH.",
      },
      { status: 503 },
    );
  }

  try {
    const simulacion = await esModoSimulacion(db);

    return NextResponse.json({
      ok: true,
      simulacion,
      forzadaPorEnv: simulacionForzadaPorEnv(),
    });
  } catch (error) {
    console.error("[admin/simulacion GET]", error);

    return NextResponse.json(
      { error: "No se pudo leer el estado del modo simulación." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const guard = await requireStaffApi(request, "write");

  if (!guard.ok) {
    return guard.response;
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }

  if (typeof body.activo !== "boolean") {
    return NextResponse.json(
      { error: 'Campo "activo" (booleano) requerido.' },
      { status: 400 },
    );
  }

  const db = getFirebaseAdminFirestore();

  if (!db) {
    return NextResponse.json(
      {
        error:
          "Firebase Admin no configurado. Defina FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_PATH.",
      },
      { status: 503 },
    );
  }

  try {
    await setModoSimulacion(db, body.activo);

    const simulacion = await esModoSimulacion(db);

    return NextResponse.json({
      ok: true,
      simulacion,
      forzadaPorEnv: simulacionForzadaPorEnv(),
    });
  } catch (error) {
    console.error("[admin/simulacion PUT]", error);

    return NextResponse.json(
      { error: "No se pudo guardar el modo simulación." },
      { status: 500 },
    );
  }
}
