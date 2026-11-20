import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function stripEnvQuotes(value) {
  return value?.trim().replace(/^["']|["']$/g, "") ?? "";
}

function parseServiceAccountFromEnvJson() {
  const raw = stripEnvQuotes(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

  if (!raw) {
    return null;
  }

  try {
    const jsonText = raw.startsWith("{")
      ? raw
      : Buffer.from(raw, "base64").toString("utf8");
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

async function parseServiceAccountFromPath() {
  const pathValue = stripEnvQuotes(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

  if (!pathValue) {
    return null;
  }

  try {
    const absolutePath = isAbsolute(pathValue)
      ? pathValue
      : resolve(process.cwd(), pathValue);
    const jsonText = await readFile(absolutePath, "utf8");
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

async function getFirestoreDb() {
  const serviceAccount =
    parseServiceAccountFromEnvJson() ?? (await parseServiceAccountFromPath());

  if (!serviceAccount) {
    throw new Error(
      "Defina FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_PATH.",
    );
  }

  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) });
  }

  return getFirestore();
}

function typeOf(value) {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value?.toDate === "function") return "timestamp";
  if (typeof value === "object") return "map";
  return typeof value;
}

function collectFieldTypes(docs) {
  const fields = new Map();

  for (const doc of docs) {
    for (const [key, value] of Object.entries(doc.data())) {
      const types = fields.get(key) ?? new Set();
      types.add(typeOf(value));
      fields.set(key, types);
    }
  }

  return [...fields.entries()]
    .map(([key, types]) => `${key}:${[...types].join("|")}`)
    .sort();
}

async function countCollection(col) {
  try {
    const snapshot = await col.count().get();
    return snapshot.data().count;
  } catch {
    const snapshot = await col.get();
    return snapshot.size;
  }
}

async function main() {
  const db = await getFirestoreDb();
  const collections = await db.listCollections();
  const names = collections.map((col) => col.id).sort();

  console.log(`Colecciones raíz: ${names.length}\n`);

  for (const col of collections.sort((a, b) => a.id.localeCompare(b.id))) {
    const count = await countCollection(col);
    const sample = await col.limit(3).get();
    const fullSnapshot = count <= 200 ? await col.get() : sample;
    const fields = collectFieldTypes(fullSnapshot.docs);

    const subcollections = new Set();

    for (const doc of sample.docs) {
      const subs = await doc.ref.listCollections();

      for (const sub of subs) {
        subcollections.add(sub.id);
      }
    }

    console.log(`## ${col.id}`);
    console.log(`docs: ${count}`);
    console.log(`campos: ${fields.join(", ") || "(sin docs)"}`);

    if (subcollections.size > 0) {
      console.log(`subcolecciones: ${[...subcollections].join(", ")}`);
    }

    if (col.id === "config") {
      const configDocs = await col.get();

      for (const doc of configDocs.docs) {
        console.log(`doc ${doc.id}: ${Object.keys(doc.data()).sort().join(", ")}`);
      }
    }

    if (col.id === "operadores") {
      const docs = await col.get();
      console.log(
        `perfiles: ${docs.docs
          .map((doc) => `${doc.data().nombre ?? doc.id}(${doc.data().activo ? "activo" : "inactivo"})`)
          .join(", ")}`,
      );
    }

    if (col.id === "clientes") {
      const clientes = await col.get();
      const roles = new Map();

      for (const doc of clientes.docs) {
        const role = doc.data().role ?? "(sin role)";
        roles.set(role, (roles.get(role) ?? 0) + 1);
      }

      console.log(
        `roles: ${[...roles.entries()]
          .map(([role, total]) => `${role}=${total}`)
          .join(", ")}`,
      );
      console.log(
        `con perfil de despacho: ${
          clientes.docs.filter((doc) => doc.data().shippingProfile).length
        }`,
      );
    }

    if (col.id === "staff" || col.id === "staff_invitaciones") {
      const docs = await col.get();
      const roles = new Map();

      for (const doc of docs.docs) {
        const data = doc.data();
        const role = data.role ?? data.rol ?? "(sin rol)";
        roles.set(role, (roles.get(role) ?? 0) + 1);

        if (col.id === "staff") {
          console.log(`  ${data.email ?? doc.id} -> ${role}`);
        }
      }

      console.log(
        `roles: ${[...roles.entries()]
          .map(([role, total]) => `${role}=${total}`)
          .join(", ")}`,
      );
    }

    if (col.id === "clientes") {
      const clientes = await col.get();

      for (const doc of clientes.docs) {
        const data = doc.data();
        const role = data.role ?? "(sin role)";

        if (role !== "admin" && role !== "editor") {
          continue;
        }

        const staffDoc = await db.collection("staff").doc(doc.id).get();
        console.log(
          `legacy ${doc.id}: role=${role} enStaff=${staffDoc.exists} despacho=${Boolean(data.shippingProfile)}`,
        );
      }
    }

    if (col.id === "dispositivos_fcm") {
      const docs = await col.get();
      const now = Date.now();
      let stale30 = 0;
      let stale90 = 0;
      let sinFecha = 0;
      const apps = new Map();
      const platforms = new Map();

      for (const doc of docs.docs) {
        const data = doc.data();
        const updated = Date.parse(data.updatedAt ?? "");
        const ageDays = Number.isFinite(updated)
          ? (now - updated) / 86_400_000
          : null;

        if (ageDays === null) {
          sinFecha += 1;
        } else {
          if (ageDays > 30) stale30 += 1;
          if (ageDays > 90) stale90 += 1;
        }

        apps.set(data.app ?? "?", (apps.get(data.app ?? "?") ?? 0) + 1);
        platforms.set(
          data.platform ?? "?",
          (platforms.get(data.platform ?? "?") ?? 0) + 1,
        );
      }

      console.log(
        `antiguedad: >30d=${stale30}, >90d=${stale90}, sin fecha=${sinFecha}`,
      );
      console.log(
        `apps: ${[...apps.entries()].map(([k, v]) => `${k}=${v}`).join(", ")} | platforms: ${[...platforms.entries()].map(([k, v]) => `${k}=${v}`).join(", ")}`,
      );
    }

    if (col.id === "solicitud_idempotencia") {
      const docs = await col.get();
      let oldest = null;
      let newest = null;
      const tipos = new Map();

      for (const doc of docs.docs) {
        const data = doc.data();
        const ms =
          typeof data.createdAt?.toMillis === "function"
            ? data.createdAt.toMillis()
            : null;

        if (ms !== null) {
          if (oldest === null || ms < oldest) oldest = ms;
          if (newest === null || ms > newest) newest = ms;
        }

        tipos.set(data.tipo ?? "?", (tipos.get(data.tipo ?? "?") ?? 0) + 1);
      }

      console.log(
        `rango: ${oldest ? new Date(oldest).toISOString() : "?"} -> ${newest ? new Date(newest).toISOString() : "?"}`,
      );
      console.log(
        `tipos: ${[...tipos.entries()].map(([k, v]) => `${k}=${v}`).join(", ")}`,
      );
    }

    if (col.id === "productos") {
      const docs = await col.get();
      let conCatalogo = 0;
      let conCategoria = 0;
      let conId = 0;
      let conListPrice = 0;
      let conPrice = 0;
      let conPrecio = 0;
      let mismatchCatalogo = 0;
      let mismatchCategoria = 0;
      let mismatchId = 0;
      const ejemplos = [];

      for (const doc of docs.docs) {
        const data = doc.data();

        if (data.catalogo !== undefined) conCatalogo += 1;
        if (data.categoria !== undefined) conCategoria += 1;
        if (data.id !== undefined) conId += 1;
        if (data.listPrice !== undefined) conListPrice += 1;
        if (data.price !== undefined) conPrice += 1;
        if (data.precio !== undefined) conPrecio += 1;

        if (data.catalogo !== undefined && data.catalogo !== data.catalog) {
          mismatchCatalogo += 1;
          if (ejemplos.length < 5) ejemplos.push(`${doc.id}:catalogo`);
        }

        if (data.categoria !== undefined && data.categoria !== data.category) {
          mismatchCategoria += 1;
          if (ejemplos.length < 5) ejemplos.push(`${doc.id}:categoria`);
        }

        if (data.id !== undefined && data.id !== doc.id) {
          mismatchId += 1;
          if (ejemplos.length < 5) ejemplos.push(`${doc.id}:id`);
        }
      }

      console.log(
        `campos legacy: catalogo=${conCatalogo}, categoria=${conCategoria}, id=${conId}`,
      );
      console.log(
        `precios: listPrice=${conListPrice}, price=${conPrice}, precio=${conPrecio}`,
      );
      console.log(
        `mismatches: catalogo=${mismatchCatalogo}, categoria=${mismatchCategoria}, id=${mismatchId}`,
      );

      if (ejemplos.length > 0) {
        console.log(`ejemplos: ${ejemplos.join(", ")}`);
      }
    }

    if (col.id === "solicitudes_cotizacion") {
      const docs = await col.get();
      let estadoDistinto = 0;
      let idDistinto = 0;
      let sinCliente = 0;
      let sinRut = 0;
      const sources = new Map();

      for (const doc of docs.docs) {
        const data = doc.data();

        if (data.estado !== data.cotizacionEstado) estadoDistinto += 1;
        if (data.id !== undefined && data.id !== doc.id) idDistinto += 1;
        if (!data.clientUserId) sinCliente += 1;
        if (!data.clientRut) sinRut += 1;
        sources.set(data.source ?? "?", (sources.get(data.source ?? "?") ?? 0) + 1);
      }

      console.log(
        `estado != cotizacionEstado: ${estadoDistinto}, id != docId: ${idDistinto}`,
      );
      console.log(
        `sin clientUserId: ${sinCliente}, sin clientRut: ${sinRut}`,
      );
      console.log(
        `sources: ${[...sources.entries()].map(([k, v]) => `${k}=${v}`).join(", ")}`,
      );
    }

    if (col.id === "uptime_checks") {
      const latest = await col.orderBy("checkedAt", "desc").limit(1).get();
      const oldest = await col.orderBy("checkedAt", "asc").limit(1).get();

      if (!latest.empty) {
        const data = latest.docs[0].data();
        console.log(
          `ultimo check: ${data.checkedAt} ok=${data.ok} status=${data.status}`,
        );
      }

      if (!oldest.empty) {
        console.log(`primer check: ${oldest.docs[0].data().checkedAt}`);
      }
    }

    console.log("");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
