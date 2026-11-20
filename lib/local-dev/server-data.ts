import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Almacén JSON para el modo local. Solo se importa desde código de servidor.
 */
const DATA_DIR = path.join(process.cwd(), ".local-data");

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readLocalJson<T>(
  fileName: string,
  fallback: () => T | Promise<T>,
): Promise<T> {
  const filePath = path.join(DATA_DIR, fileName);

  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }

    const initial = await fallback();
    await writeLocalJson(fileName, initial);
    return initial;
  }
}

export async function writeLocalJson<T>(
  fileName: string,
  data: T,
): Promise<void> {
  await ensureDataDir();

  const filePath = path.join(DATA_DIR, fileName);
  const tempPath = `${filePath}.${process.pid}.tmp`;

  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tempPath, filePath);
}
