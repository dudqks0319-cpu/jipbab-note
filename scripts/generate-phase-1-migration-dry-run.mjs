import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { auditLegacyRecipeForV2 } from "../lib/recipe-v2-migration-audit.ts";

const cwd = process.cwd();
const envPath = path.join(cwd, ".env.local");
const csvPath = path.join(cwd, "docs/phase-1-migration-dry-run.csv");
const reportPath = path.join(cwd, "docs/phase-1-migration-dry-run.md");

function readEnv(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }
  return Object.fromEntries(
    readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        const value = line
          .slice(index + 1)
          .trim()
          .replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, "$1$2");
        return [key, value];
      }),
  );
}

function required(value, label) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new Error(`${label} is required for the read-only migration dry run`);
  }
  return normalized;
}

async function fetchRecipes(supabaseUrl, anonKey) {
  const rows = [];
  const select = [
    "id",
    "title",
    "description",
    "category",
    "difficulty",
    "cooking_time",
    "servings",
    "thumbnail_url",
    "ingredients",
    "steps",
    "source_id",
    "content_origin",
    "reviewed_for_beginner",
    "created_at",
  ].join(",");

  for (let from = 0; ; from += 1000) {
    const query = new URLSearchParams({ select, order: "created_at.asc" });
    const response = await fetch(`${supabaseUrl}/rest/v1/recipes?${query.toString()}`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Range: `${from}-${from + 999}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Recipe dry-run fetch failed with HTTP ${response.status}`);
    }
    const page = await response.json();
    if (!Array.isArray(page)) {
      throw new Error("Recipe dry-run response is not an array");
    }
    rows.push(...page);
    if (page.length < 1000) {
      return rows;
    }
  }
}

function countBy(rows, getValue) {
  const counts = new Map();
  for (const row of rows) {
    const value = getValue(row) || "blank";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "ko"));
}

function csvValue(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function markdownTable(rows, leftLabel, rightLabel) {
  return [
    `| ${leftLabel} | ${rightLabel} |`,
    "|---|---:|",
    ...rows.map(([label, count]) => `| ${label} | ${count} |`),
  ].join("\n");
}

const env = { ...readEnv(envPath), ...process.env };
const supabaseUrl = required(env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
const anonKey = required(env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY");
const recipes = await fetchRecipes(supabaseUrl, anonKey);
const audited = recipes.map(auditLegacyRecipeForV2);
const statusCounts = countBy(audited, (row) => row.conversionStatus);
const categoryCounts = countBy(audited, (row) => `${row.categoryStatus}:${row.sourceCategory || "blank"}`);
const shapeCounts = countBy(audited, (row) => row.ingredientShape);
const blockerCounts = countBy(
  audited.flatMap((row) => row.blockers.map((blocker) => ({ blocker }))),
  (row) => row.blocker,
);

const csvColumns = [
  "recipeId",
  "title",
  "sourceCategory",
  "categoryStatus",
  "categoryId",
  "ingredientCount",
  "ingredientShape",
  "matchedIngredientCount",
  "unmatchedIngredientCount",
  "stepCount",
  "completeV2StepCount",
  "sourceLinked",
  "conversionStatus",
  "blockers",
];

const csv = [
  csvColumns.join(","),
  ...audited.map((row) =>
    csvColumns
      .map((column) => csvValue(column === "blockers" ? row.blockers.join("|") : row[column]))
      .join(","),
  ),
].join("\n");

const v2Candidates = audited.filter((row) => row.conversionStatus === "v2_candidate").length;
const sourceLinked = audited.filter((row) => row.sourceLinked).length;
const fullyStructuredSteps = audited.filter(
  (row) => row.stepCount > 0 && row.completeV2StepCount === row.stepCount,
).length;

const report = [
  "# Phase 1 recipe migration dry run",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "This is a read-only classification of the live public recipe rows. It does not execute SQL, assign evidence, publish a recipe, or infer missing category, quantity, timing, safety, or source facts.",
  "",
  "## Result",
  "",
  `- Live rows inspected: **${audited.length}**`,
  `- Complete v2 candidates: **${v2Candidates}**`,
  `- Rows linked to recipe_sources: **${sourceLinked}**`,
  `- Rows whose every step already has instruction, heat, duration, and visual cue: **${fullyStructuredSteps}**`,
  "- Legacy string ingredients are reported for editor parsing and are never converted by this dry run.",
  "- Ambiguous categories remain unresolved instead of being mapped by keyword guesswork.",
  "",
  "## Conversion status",
  "",
  markdownTable(statusCounts, "Status", "Rows"),
  "",
  "## Ingredient shape",
  "",
  markdownTable(shapeCounts, "Shape", "Rows"),
  "",
  "## Category resolution",
  "",
  markdownTable(categoryCounts, "Resolution and source value", "Rows"),
  "",
  "## Blocking fields",
  "",
  markdownTable(blockerCounts, "Blocker", "Rows"),
  "",
  "## Rollout rule",
  "",
  "The generated CSV is an editor queue, not an import payload. A row may be promoted to schema_version 2 only after its normalized ingredients and steps, source ledger, category, review evidence, and actual cooking test are independently recorded and validated. Production rollout remains blocked by the migration-history drift and restorable-backup requirement.",
  "",
].join("\n");

writeFileSync(csvPath, `${csv}\n`, "utf8");
writeFileSync(reportPath, report, "utf8");
console.log(`Phase 1 migration dry run generated: ${audited.length} rows, ${v2Candidates} v2 candidates`);
