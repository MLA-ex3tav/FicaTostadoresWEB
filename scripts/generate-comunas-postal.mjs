// Regenera lib/comunas-postal.ts desde el Anexo:Códigos postales de Chile
// (Wikipedia), que lista el código postal general (comunal) de cada comuna.
//
// Uso: node scripts/generate-comunas-postal.mjs

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SOURCE_URL =
  "https://es.wikipedia.org/w/index.php?title=Anexo:C%C3%B3digos_postales_de_Chile&action=raw";
const OUTPUT_URL = new URL("../lib/comunas-postal.ts", import.meta.url);

const response = await fetch(SOURCE_URL, {
  headers: { "User-Agent": "FicaTostadoresWeb/1.0 (ventas@tostadoresfica.cl)" },
});

if (!response.ok) {
  throw new Error(`La fuente respondió ${response.status}`);
}

const text = await response.text();
const seen = new Map();

for (const rawLine of text.split("\n")) {
  const match = rawLine.trim().match(/^\|\s*(.+?)\s*\|\|\s*(\d{7})\s*$/);

  if (!match) {
    continue;
  }

  let name = match[1];
  const links = [...name.matchAll(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g)];

  if (links.length > 0) {
    const last = links[links.length - 1];
    name = (last[2] ?? last[1]).trim();
  }

  name = name
    .replace(/'''/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\[\[|\]\]/g, "")
    .trim();

  if (!name) {
    continue;
  }

  const key = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (!seen.has(key)) {
    seen.set(key, [name, match[2]]);
  }
}

const entries = [...seen.values()].sort((a, b) => a[0].localeCompare(b[0], "es"));

const lines = entries
  .map(([name, code]) => `  [${JSON.stringify(name)}, ${JSON.stringify(code)}],`)
  .join("\n");

const file = `// Generado desde el Anexo:Códigos postales de Chile (Wikipedia).
// Código postal general (comunal) de cada comuna. No editar a mano:
// regenerar con "node scripts/generate-comunas-postal.mjs".

const COMUNA_POSTAL_CODES: ReadonlyArray<readonly [string, string]> = [
${lines}
];

const EXTRA_ALIASES: ReadonlyArray<readonly [string, string]> = [
  ["La Calera", "2290000"],
  ["Marchihue", "3260000"],
  ["Paiguano", "1770000"],
  ["Coihaique", "5950000"],
  ["Llay-Llay", "2220000"],
  ["San Fabián", "3860000"],
  ["Torres del Paine", "6170000"],
];

export function normalizeComunaName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\\s]/g, " ")
    .replace(/\\s+/g, " ")
    .trim();
}

const POSTAL_BY_COMUNA = new Map<string, string>();

for (const [name, code] of [...COMUNA_POSTAL_CODES, ...EXTRA_ALIASES]) {
  const key = normalizeComunaName(name);

  if (key && !POSTAL_BY_COMUNA.has(key)) {
    POSTAL_BY_COMUNA.set(key, code);
  }
}

export function getGeneralPostalCode(
  comuna: string | null | undefined,
): string | null {
  if (!comuna) {
    return null;
  }

  return POSTAL_BY_COMUNA.get(normalizeComunaName(comuna)) ?? null;
}
`;

writeFileSync(fileURLToPath(OUTPUT_URL), file, "utf8");
console.log(`Generadas ${entries.length} comunas en ${fileURLToPath(OUTPUT_URL)}`);
