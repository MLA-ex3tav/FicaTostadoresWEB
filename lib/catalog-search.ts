import type { CatalogConfig } from "@/lib/catalog-config";
import type { Product } from "@/lib/products";

const STOPWORDS = new Set([
  "a",
  "al",
  "algo",
  "como",
  "con",
  "de",
  "del",
  "e",
  "el",
  "en",
  "equipo",
  "equipos",
  "es",
  "esa",
  "ese",
  "eso",
  "esta",
  "estoy",
  "hay",
  "la",
  "las",
  "lo",
  "los",
  "maquina",
  "me",
  "mi",
  "necesito",
  "o",
  "para",
  "por",
  "producto",
  "productos",
  "que",
  "quiero",
  "son",
  "su",
  "sus",
  "tengo",
  "u",
  "un",
  "una",
  "unas",
  "unos",
  "ver",
  "y",
]);

const PLURAL_ALIASES: Record<string, string> = {
  avellanas: "avellana",
  almendras: "almendra",
  cafes: "cafe",
  equipos: "equipo",
  frutos: "fruto",
  granos: "grano",
  manies: "mani",
  maquinas: "maquina",
  molinos: "molino",
  partidores: "partidor",
  descascaradores: "descascarador",
  secos: "seco",
  seleccionadores: "seleccionador",
  semillas: "semilla",
  tostadores: "tostador",
  tostadoras: "tostadora",
};

/**
 * Términos que el cliente puede escribir y cómo se relacionan entre sí.
 * Todos están normalizados (sin tildes, minúsculas).
 */
const TOKEN_GROUPS: string[][] = [
  ["tostador", "tostadora", "tostar", "tueste"],
  ["molino", "moledora", "moler", "molienda", "molido"],
  ["partidor", "partidora", "partir", "partido", "parte"],
  [
    "descascarador",
    "descascaradora",
    "descascarar",
    "descascarado",
    "pelador",
    "pelar",
  ],
  ["seleccionador", "seleccionadora", "seleccionar", "clasificador", "clasificar"],
  ["cafe"],
  ["mani", "cacahuate", "cacahuete"],
  ["avellana"],
  ["almendra"],
  ["trigo"],
  ["semilla"],
  ["grano"],
  ["fruto"],
  ["seco"],
  ["harina"],
  ["avena"],
  ["cacao"],
];

const GROUP_BY_TOKEN = new Map<string, string[]>();

for (const group of TOKEN_GROUPS) {
  for (const token of group) {
    GROUP_BY_TOKEN.set(token, group);
  }
}

interface TaggedTextField {
  text: string;
  weight: number;
}

interface IndexedProduct {
  product: Product;
  tokens: Map<string, number>;
  nameText: string;
  applicationsText: string;
}

export interface ProductSearchOutcome {
  products: Product[];
  approximate: boolean;
}

function stripDiacritics(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function normalizeSearchText(value: string | null | undefined): string {
  return stripDiacritics(value ?? "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stemToken(token: string): string {
  const alias = PLURAL_ALIASES[token];

  if (alias) {
    return alias;
  }

  if (token.length > 3 && /[aeiou]s$/.test(token)) {
    return token.slice(0, -1);
  }

  return token;
}

function tokenize(value: string): string[] {
  return normalizeSearchText(value)
    .split(" ")
    .filter(Boolean)
    .map(stemToken);
}

function expandTerm(term: string): string[] {
  return GROUP_BY_TOKEN.get(term) ?? [term];
}

function inferTypeTokens(product: Product): string[] {
  const name = normalizeSearchText(product.name);
  const tokens = new Set<string>();

  if (/tostador|tostadora/.test(name)) {
    tokens.add("tostador");
    tokens.add("tostar");
    tokens.add("tueste");
  }

  if (/molino|moledora/.test(name)) {
    tokens.add("molino");
    tokens.add("moler");
    tokens.add("molienda");
  }

  if (/partidor|partidora/.test(name)) {
    tokens.add("partidor");
    tokens.add("partir");
  }

  if (/descascarador|descascaradora/.test(name)) {
    tokens.add("descascarador");
    tokens.add("descascarar");
  }

  if (/seleccionador|seleccionadora|clasificador/.test(name)) {
    tokens.add("seleccionador");
    tokens.add("seleccionar");
  }

  if (
    product.category === "cafe" ||
    product.category === "comercial" ||
    product.category === "industrial"
  ) {
    tokens.add("tostador");
    tokens.add("tostar");
    tokens.add("tueste");
  }

  return [...tokens];
}

function getFallbackApplications(product: Product): string[] {
  if (product.category === "cafe") {
    return ["Café"];
  }

  if (
    product.category === "comercial" ||
    product.category === "industrial"
  ) {
    return [
      "Maní",
      "Avellanas",
      "Almendras",
      "Trigo",
      "Semillas",
      "Frutos secos",
    ];
  }

  return [];
}

function getProductApplications(product: Product): string[] {
  return product.applications && product.applications.length > 0
    ? product.applications
    : getFallbackApplications(product);
}

function buildTaggedFields(
  product: Product,
  config: CatalogConfig,
): TaggedTextField[] {
  const catalog = config.catalogs.find((item) => item.id === product.catalog);
  const category = config.categories.find(
    (item) => item.id === product.category,
  );
  const applications = getProductApplications(product);
  const technicalText = (product.technicalDetails ?? [])
    .map((detail) => `${detail.label} ${detail.value}`)
    .join(" ");
  const addOnsText = (product.addOns ?? [])
    .map((addOn) => `${addOn.name} ${addOn.description}`)
    .join(" ");

  return [
    { text: product.name, weight: 6 },
    { text: applications.join(" "), weight: 5 },
    { text: inferTypeTokens(product).join(" "), weight: 3.5 },
    { text: catalog?.label ?? "", weight: 3 },
    { text: category?.label ?? "", weight: 3 },
    { text: product.capacity ?? "", weight: 1.6 },
    { text: product.description ?? "", weight: 1.4 },
    { text: product.longDescription ?? "", weight: 1 },
    { text: (product.specs ?? []).join(" "), weight: 0.9 },
    { text: (product.features ?? []).join(" "), weight: 0.9 },
    { text: technicalText, weight: 0.9 },
    { text: addOnsText, weight: 0.5 },
  ];
}

function buildIndex(
  product: Product,
  config: CatalogConfig,
): IndexedProduct {
  const tokens = new Map<string, number>();

  for (const field of buildTaggedFields(product, config)) {
    const unique = new Set(tokenize(field.text));

    for (const token of unique) {
      const current = tokens.get(token) ?? 0;
      if (field.weight > current) {
        tokens.set(token, field.weight);
      }
    }
  }

  return {
    product,
    tokens,
    nameText: normalizeSearchText(product.name),
    applicationsText: normalizeSearchText(
      getProductApplications(product).join(" "),
    ),
  };
}

function matchIndexedProduct(
  indexed: IndexedProduct,
  terms: string[],
  phrase: string,
): { score: number; matched: number } {
  let score = 0;
  let matched = 0;

  for (const term of terms) {
    let best = 0;

    for (const variant of expandTerm(term)) {
      const weight = indexed.tokens.get(variant) ?? 0;
      if (weight > best) {
        best = weight;
      }
    }

    if (best > 0) {
      matched += 1;
      score += best;
    }
  }

  const coverage = terms.length > 0 ? matched / terms.length : 0;
  score *= coverage;

  if (phrase.length > 0) {
    if (indexed.nameText === phrase) {
      score += 30;
    } else if (indexed.nameText.includes(phrase)) {
      score += 12;
    }

    if (indexed.applicationsText.includes(phrase)) {
      score += 6;
    }
  }

  return { score, matched };
}

function levenshtein(a: string, b: string): number {
  if (a === b) {
    return 0;
  }

  if (Math.abs(a.length - b.length) > 2) {
    return 99;
  }

  const previous = new Array<number>(b.length + 1);
  const current = new Array<number>(b.length + 1);

  for (let j = 0; j <= b.length; j += 1) {
    previous[j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      );
    }

    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[b.length];
}

function matchFuzzyProduct(
  indexed: IndexedProduct,
  terms: string[],
  vocabulary: string[],
): { score: number; matched: number } {
  let score = 0;
  let matched = 0;

  for (const term of terms) {
    if (term.length < 4) {
      continue;
    }

    let bestWeight = 0;

    for (const candidate of vocabulary) {
      if (candidate.length < 4) {
        continue;
      }

      if (levenshtein(term, candidate) <= 1) {
        const weight = indexed.tokens.get(candidate) ?? 0;
        if (weight > bestWeight) {
          bestWeight = weight;
        }
      }
    }

    if (bestWeight > 0) {
      matched += 1;
      score += bestWeight * 0.75;
    }
  }

  return { score, matched };
}

function sortOutcome(
  entries: { product: Product; score: number }[],
): Product[] {
  return entries
    .slice()
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.product.name.localeCompare(b.product.name, "es"),
    )
    .map((entry) => entry.product);
}

/**
 * Busca productos por nombre, tipo de equipo, uso/aplicación y texto libre.
 * Entiende consultas naturales como "tostador de café" o "máquina para
 * partir avellanas", con sinónimos y tolerancia básica a errores de tipeo.
 */
export function searchProducts(
  products: Product[],
  rawQuery: string,
  config: CatalogConfig,
): ProductSearchOutcome {
  const phrase = normalizeSearchText(rawQuery);
  const terms = tokenize(rawQuery).filter((token) => !STOPWORDS.has(token));

  if (terms.length === 0) {
    return { products: [], approximate: false };
  }

  const indexes = products.map((product) => buildIndex(product, config));

  const strict: { product: Product; score: number }[] = [];
  const partial: { product: Product; score: number }[] = [];

  for (const indexed of indexes) {
    const { score, matched } = matchIndexedProduct(indexed, terms, phrase);

    if (matched === terms.length) {
      strict.push({ product: indexed.product, score });
      continue;
    }

    if (matched >= Math.max(1, Math.ceil(terms.length / 2))) {
      partial.push({ product: indexed.product, score });
    }
  }

  if (strict.length > 0) {
    return { products: sortOutcome(strict), approximate: false };
  }

  if (partial.length > 0) {
    return { products: sortOutcome(partial), approximate: true };
  }

  const vocabulary = new Set<string>();
  for (const indexed of indexes) {
    for (const token of indexed.tokens.keys()) {
      vocabulary.add(token);
    }
  }

  const vocabularyList = [...vocabulary];
  const fuzzy: { product: Product; score: number }[] = [];

  for (const indexed of indexes) {
    const { score, matched } = matchFuzzyProduct(
      indexed,
      terms,
      vocabularyList,
    );

    if (matched === terms.length) {
      fuzzy.push({ product: indexed.product, score });
    }
  }

  if (fuzzy.length > 0) {
    return { products: sortOutcome(fuzzy), approximate: true };
  }

  return { products: [], approximate: false };
}

