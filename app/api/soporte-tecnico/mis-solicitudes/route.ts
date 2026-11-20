import { NextResponse } from "next/server";
import {
  SoporteTecnicoRepositoryError,
  listSolicitudesSoporteByClientUserId,
} from "@/lib/soporte-tecnico/repository";
import { verifyFirebaseUser } from "@/lib/firebase-user-session";

export async function GET(request: Request) {
  const user = await verifyFirebaseUser(request);

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const solicitudes = await listSolicitudesSoporteByClientUserId(user.uid);

    return NextResponse.json({ solicitudes });
  } catch (error) {
    if (error instanceof SoporteTecnicoRepositoryError) {
      console.error("[soporte-tecnico/mis-solicitudes]", error.message);

      const isDev = process.env.NODE_ENV === "development";

      return NextResponse.json(
        {
          error: isDev
            ? error.message
            : "No se pudieron cargar sus solicitudes de servicio técnico en este momento.",
        },
        { status: 503 },
      );
    }

    console.error("[soporte-tecnico/mis-solicitudes]", error);

    return NextResponse.json(
      { error: "Error interno al cargar las solicitudes de servicio técnico." },
      { status: 500 },
    );
  }
}
