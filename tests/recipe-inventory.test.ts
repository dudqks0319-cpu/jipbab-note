import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = process.cwd();
const inventoryPath = path.join(projectRoot, "docs/recipe-inventory.csv");
const sourceLedgerPath = path.join(projectRoot, "docs/recipe-source-ledger.csv");
const summaryPath = path.join(projectRoot, "docs/recipe-inventory.md");

const REQUIRED_COLUMNS = [
  "recipe_id",
  "title",
  "category",
  "source",
  "source_url",
  "source_license",
  "content_origin",
  "difficulty",
  "servings",
  "prep_time",
  "cook_time",
  "total_time",
  "ingredient_count",
  "step_count",
  "beginner_review_status",
  "actual_cooking_test_status",
  "image_rights_status",
  "publish_status",
  "last_reviewed_at",
  "reviewer",
];

function parseCsv(text: string): Array<Record<string, string>> {
  const parsedRows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (quoted && character === '"' && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && character === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (!quoted && character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      parsedRows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += character;
  }

  if (cell || row.length > 0) {
    row.push(cell);
    parsedRows.push(row);
  }

  const [headers, ...dataRows] = parsedRows;
  assert.ok(headers, "CSV header is required");
  return dataRows
    .filter((values) => values.some(Boolean))
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function readCsv(filePath: string) {
  assert.equal(fs.existsSync(filePath), true, `${filePath} must exist`);
  const text = fs.readFileSync(filePath, "utf8");
  const header = text.slice(0, text.indexOf("\n")).split(",");
  return { text, header, rows: parseCsv(text) };
}

test("recipe inventory and source ledger include every required column", () => {
  const inventory = readCsv(inventoryPath);
  const sourceLedger = readCsv(sourceLedgerPath);

  for (const column of REQUIRED_COLUMNS) {
    assert.ok(inventory.header.includes(column), `inventory missing ${column}`);
    assert.ok(sourceLedger.header.includes(column), `source ledger missing ${column}`);
  }
  for (const column of ["inventory_key", "inventory_scope", "source_type_original", "source_type_app_projection"]) {
    assert.ok(inventory.header.includes(column), `inventory missing ${column}`);
    assert.ok(sourceLedger.header.includes(column), `source ledger missing ${column}`);
  }
});

test("Phase 0 snapshot keeps live and local records separate and blocks unverified publication", () => {
  const inventory = readCsv(inventoryPath);
  const liveRows = inventory.rows.filter((row) => row.inventory_scope === "live_supabase");
  const localRows = inventory.rows.filter((row) => row.inventory_scope === "local_runtime_catalog");

  assert.equal(liveRows.length, 1152);
  assert.equal(localRows.length, 186);
  assert.equal(inventory.rows.length, 1338);
  assert.equal(inventory.rows.filter((row) => row.publish_status === "eligible").length, 0);
  assert.ok(liveRows.every((row) => row.current_public_exposure === "exposed_by_current_rls"));
  assert.ok(inventory.rows.every((row) => row.actual_cooking_test_status === "not_recorded"));
});

test("source ledger preserves original reference relationships and matches inventory keys", () => {
  const inventory = readCsv(inventoryPath);
  const sourceLedger = readCsv(sourceLedgerPath);
  const inventoryKeys = new Set(inventory.rows.map((row) => row.inventory_key));
  const sourceKeys = new Set(sourceLedger.rows.map((row) => row.inventory_key));

  assert.equal(sourceLedger.rows.length, inventory.rows.length);
  assert.deepEqual(sourceKeys, inventoryKeys);
  assert.equal(
    sourceLedger.rows.filter((row) => row.source_type_original === "reference-link").length,
    65,
  );
  assert.ok(
    sourceLedger.rows
      .filter((row) => row.source_type_original === "reference-link")
      .every((row) => row.source_url.startsWith("https://")),
  );
});

test("generated inventory artifacts contain no credential values", () => {
  const artifacts = [inventoryPath, sourceLedgerPath, summaryPath]
    .map((filePath) => fs.readFileSync(filePath, "utf8"))
    .join("\n");

  assert.doesNotMatch(artifacts, /SUPABASE_SERVICE_ROLE_KEY\s*=/i);
  assert.doesNotMatch(artifacts, /NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=/i);
  assert.doesNotMatch(artifacts, /eyJ[A-Za-z0-9_-]{40,}\.[A-Za-z0-9_-]{20,}/);
  assert.match(artifacts, /계획서 기준 공개 가능 수는 \*\*0건\*\*/);
});
