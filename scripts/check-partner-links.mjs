import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const docsPath = path.join(cwd, "docs/coupang-partners-links.md");
const migrationPaths = [
  path.join(cwd, "supabase/migrations/20260508133307_add_partner_links.sql"),
  path.join(cwd, "supabase/migrations/20260711170000_reclassify_egg_tofu_catalog.sql"),
];
const catalogPath = path.join(cwd, "lib/ingredient-catalog.ts");
const typesPath = path.join(cwd, "types/index.ts");

const partnerUrlPattern = /^https:\/\/link\.coupang\.com\/a\/[A-Za-z0-9_-]+(?:[/?#].*)?$/;

const failures = [];
const warnings = [];
const passes = [];

function readRequired(filePath) {
  if (!existsSync(filePath)) {
    failures.push(`${path.relative(cwd, filePath)} is missing`);
    return "";
  }

  return readFileSync(filePath, "utf8");
}

function unquoteSql(value) {
  return value === "null" ? null : value.slice(1, -1).replaceAll("''", "'");
}

function normalizeKey(value) {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

function parseDocsRows(markdown) {
  const rows = [];
  for (const line of markdown.split("\n")) {
    const match = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(https?:\/\/[^|\s]+)\s*\|$/);
    if (!match || match[1] === "---") {
      continue;
    }

    rows.push({
      name: match[1].trim(),
      category: match[2].trim(),
      url: match[3].trim(),
    });
  }
  return rows;
}

function parseMigrationRows(sql) {
  const rows = [];
  const tuplePattern =
    /\('(?<kind>item|category)',\s*(?<name>null|'(?:[^']|'')+'),\s*(?<category>null|'(?:[^']|'')+'),\s*'(?<key>(?:[^']|'')+)',\s*'(?<url>https:\/\/link\.coupang\.com\/a\/[^']+)',\s*(?<order>\d+),\s*'(?<memo>(?:[^']|'')*)'\)/g;

  for (const match of sql.matchAll(tuplePattern)) {
    rows.push({
      kind: match.groups.kind,
      name: unquoteSql(match.groups.name),
      category: unquoteSql(match.groups.category),
      normalizedKey: unquoteSql(`'${match.groups.key}'`),
      url: match.groups.url,
      displayOrder: Number(match.groups.order),
      memo: unquoteSql(`'${match.groups.memo}'`),
    });
  }

  return rows;
}

function parseQuotedList(source, declarationName) {
  const match = source.match(new RegExp(`export const ${declarationName} = \\[([\\s\\S]*?)\\] as const`));
  if (!match) {
    return [];
  }

  return Array.from(match[1].matchAll(/"([^"]+)"/g), (item) => item[1]);
}

function parseCatalogNames(source) {
  const values = new Set();
  for (const match of source.matchAll(/\bname:\s*"([^"]+)"/g)) {
    values.add(match[1]);
  }

  for (const match of source.matchAll(/\baliases:\s*\[([^\]]*)\]/g)) {
    for (const alias of match[1].matchAll(/"([^"]+)"/g)) {
      values.add(alias[1]);
    }
  }

  return values;
}

const docs = readRequired(docsPath);
const migration = migrationPaths.map(readRequired).join("\n");
const catalog = readRequired(catalogPath);
const types = readRequired(typesPath);

const docsRows = parseDocsRows(docs);
const migrationRows = parseMigrationRows(migration);
const catalogNames = parseCatalogNames(catalog);
const categories = parseQuotedList(types, "INGREDIENT_CATEGORIES");
const itemRows = migrationRows.filter((row) => row.kind === "item");
const categoryRows = migrationRows.filter((row) => row.kind === "category");
const itemsByName = new Map(itemRows.map((row) => [row.name, row]));
const docsByName = new Map(docsRows.map((row) => [row.name, row]));
const categoryFallbacks = new Map(categoryRows.map((row) => [row.category, row]));
const displayOrders = new Set();

if (docsRows.length === 0) {
  failures.push("docs/coupang-partners-links.md has no partner link rows");
} else {
  passes.push(`${docsRows.length} documented priority item links`);
}

if (itemRows.length === 0) {
  failures.push("partner_links migration has no item seed rows");
} else {
  passes.push(`${itemRows.length} item seed rows`);
}

for (const row of [...docsRows, ...migrationRows]) {
  if (!partnerUrlPattern.test(row.url)) {
    failures.push(`${row.name ?? row.category} has a non-partner URL: ${row.url}`);
  }
}

for (const row of docsRows) {
  if (!catalogNames.has(row.name)) {
    failures.push(`${row.name} is documented but missing from ingredient catalog names/aliases`);
  }

  const migrationRow = itemsByName.get(row.name);
  if (!migrationRow) {
    failures.push(`${row.name} is documented but missing from partner_links item seed`);
    continue;
  }

  if (migrationRow.url !== row.url) {
    failures.push(`${row.name} URL differs between docs and migration`);
  }
}

for (const row of itemRows) {
  const docsRow = docsByName.get(row.name);
  if (!docsRow) {
    failures.push(`${row.name} is seeded but missing from docs/coupang-partners-links.md`);
  }

  if (row.normalizedKey !== normalizeKey(row.name)) {
    failures.push(`${row.name} normalized_key should be ${normalizeKey(row.name)}`);
  }
}

for (const row of migrationRows) {
  if (displayOrders.has(row.displayOrder)) {
    failures.push(`display_order ${row.displayOrder} is duplicated`);
  }
  displayOrders.add(row.displayOrder);
}

for (const category of categories) {
  if (!categoryFallbacks.has(category)) {
    warnings.push(`${category} category fallback partner link is not seeded`);
  }
}

if (categoryRows.length > 0) {
  passes.push(`${categoryRows.length}/${categories.length} category fallback links`);
}

if (!/create\s+index\s+if\s+not\s+exists\s+idx_partner_links_active_lookup[\s\S]*where\s+active\s*=\s*true/i.test(migration)) {
  failures.push("partner_links migration is missing the active partial lookup index");
} else {
  passes.push("active partial lookup index");
}

if (!/revoke\s+insert,\s*update,\s*delete\s+on\s+public\.partner_links\s+from\s+anon,\s*authenticated/i.test(migration)) {
  failures.push("partner_links migration must revoke anon/authenticated writes");
} else {
  passes.push("anon/authenticated writes revoked");
}

if (!/comment\s+on\s+table\s+public\.partner_links[\s\S]*service-role\/admin/i.test(migration)) {
  failures.push("partner_links migration must document admin write risk");
} else {
  passes.push("admin write risk documented");
}

console.log("Partner link harness");
console.log(`Passes: ${passes.length}`);
console.log(`Warnings: ${warnings.length}`);
console.log(`Failures: ${failures.length}`);

if (passes.length > 0) {
  console.log("\nPASS");
  for (const item of passes) {
    console.log(`- ${item}`);
  }
}

if (warnings.length > 0) {
  console.log("\nWARN");
  for (const item of warnings) {
    console.log(`- ${item}`);
  }
}

if (failures.length > 0) {
  console.log("\nFAIL");
  for (const item of failures) {
    console.log(`- ${item}`);
  }
  process.exitCode = 1;
}
