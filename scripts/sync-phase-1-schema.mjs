import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const schemaPath = path.join(cwd, "supabase/schema.sql");
const schemaBlocks = [
  {
    startMarker: "-- PHASE1_RECIPE_V2_SCHEMA_START",
    endMarker: "-- PHASE1_RECIPE_V2_SCHEMA_END",
    migrationPaths: [
      "supabase/migrations/20260710150000_add_recipe_v2_schema_and_versioning.sql",
      "supabase/migrations/20260710151000_seed_phase1_ingredient_catalog.sql",
      "supabase/migrations/20260715100000_add_recipe_serving_variants.sql",
    ],
  },
  {
    startMarker: "-- PHASE2_API_FOUNDATION_SCHEMA_START",
    endMarker: "-- PHASE2_API_FOUNDATION_SCHEMA_END",
    migrationPaths: ["supabase/migrations/20260710160000_add_distributed_api_rate_limits.sql"],
  },
  {
    startMarker: "-- PHASE7_RECIPE_FEEDBACK_SCHEMA_START",
    endMarker: "-- PHASE7_RECIPE_FEEDBACK_SCHEMA_END",
    migrationPaths: [
      "supabase/migrations/20260714100000_add_recipe_feedback.sql",
      "supabase/migrations/20260714110000_extend_recipe_feedback_completion_details.sql",
    ],
  },
  {
    startMarker: "-- PHASE4_RECIPE_PROGRESS_SCHEMA_START",
    endMarker: "-- PHASE4_RECIPE_PROGRESS_SCHEMA_END",
    migrationPaths: ["supabase/migrations/20260715110000_add_recipe_progress.sql"],
  },
];

let schema = readFileSync(schemaPath, "utf8");
for (const block of schemaBlocks) {
  const markerPattern = new RegExp(
    `\\n${block.startMarker}[\\s\\S]*?${block.endMarker}\\n?`,
    "m",
  );
  schema = schema.replace(markerPattern, "\n");
}

const renderedBlocks = schemaBlocks
  .filter((block) => block.migrationPaths.every((filePath) => existsSync(path.join(cwd, filePath))))
  .map((block) => [
    block.startMarker,
    ...block.migrationPaths.map((filePath) =>
      readFileSync(path.join(cwd, filePath), "utf8").trim(),
    ),
    block.endMarker,
  ].join("\n\n"));

writeFileSync(schemaPath, `${schema.trimEnd()}\n\n${renderedBlocks.join("\n\n")}\n`, "utf8");
console.log(`Release schema synchronized from ${renderedBlocks.length} ordered blocks`);
