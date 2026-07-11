import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { BEGINNER_RECIPE_LIBRARY } from "../lib/beginner-recipes.ts";
import { CURATED_JIPBAB_RECIPES } from "../lib/curated-recipes.ts";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "..");
const docsDir = path.join(projectRoot, "docs");
const envFilePath = path.join(projectRoot, ".env.local");

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

const INVENTORY_COLUMNS = [
  "inventory_key",
  "inventory_scope",
  "storage_location",
  ...REQUIRED_COLUMNS,
  "declared_publish_status",
  "current_public_exposure",
  "source_record_status",
  "source_type_original",
  "source_type_app_projection",
  "required_gate_failures",
];

const SOURCE_LEDGER_COLUMNS = [
  "inventory_key",
  "inventory_scope",
  ...REQUIRED_COLUMNS,
  "source_record_status",
  "source_type_original",
  "source_type_app_projection",
  "attribution",
  "current_public_exposure",
];

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        const key = line.slice(0, separatorIndex).trim();
        const value = line
          .slice(separatorIndex + 1)
          .trim()
          .replace(/^(["'])(.*)\1$/, "$2");
        return [key, value];
      }),
  );
}

function requiredEnv(env, name) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required to generate the live recipe inventory`);
  return value;
}

function normalizeTitle(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .toLocaleLowerCase("ko-KR");
}

function blank(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function arrayLength(value) {
  return Array.isArray(value) ? value.length : 0;
}

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows, columns) {
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
  ].join("\n") + "\n";
}

async function fetchAllRows({ supabaseUrl, anonKey, table, select, order }) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const query = new URLSearchParams({ select });
    if (order) query.set("order", order);
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${query.toString()}`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Range: `${from}-${from + 999}`,
      },
    });

    if (!response.ok) {
      throw new Error(`${table} inventory fetch failed with HTTP ${response.status}`);
    }

    const page = await response.json();
    if (!Array.isArray(page)) throw new Error(`${table} inventory response is not an array`);
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}

function liveGateFailures(recipe, sourceRecord) {
  const failures = [];
  if (blank(recipe.title)) failures.push("missing_title");
  if (blank(recipe.category)) failures.push("missing_category");
  if (!Number.isFinite(recipe.servings) || recipe.servings < 1) failures.push("missing_servings");
  if (!Number.isFinite(recipe.cooking_time) || recipe.cooking_time < 1) failures.push("missing_total_time");
  if (arrayLength(recipe.ingredients) < 3) failures.push("ingredients_under_3");
  if (arrayLength(recipe.steps) < 3) failures.push("steps_under_3");
  if (!recipe.reviewed_for_beginner) failures.push("beginner_review_missing");
  if (!sourceRecord) failures.push("source_ledger_missing");
  failures.push("actual_cooking_test_missing");
  return failures;
}

function liveInventoryRow(recipe, sourceRecord) {
  const failures = liveGateFailures(recipe, sourceRecord);
  return {
    inventory_key: `live_supabase:${recipe.id}`,
    inventory_scope: "live_supabase",
    storage_location: "public.recipes",
    recipe_id: recipe.id,
    title: recipe.title,
    category: recipe.category,
    source: sourceRecord?.provider ?? recipe.source,
    source_url: sourceRecord?.source_url ?? "",
    source_license: sourceRecord?.license ?? "",
    content_origin: recipe.content_origin,
    difficulty: recipe.difficulty,
    servings: recipe.servings,
    prep_time: "",
    cook_time: recipe.cooking_time,
    total_time: "",
    ingredient_count: arrayLength(recipe.ingredients),
    step_count: arrayLength(recipe.steps),
    beginner_review_status: recipe.reviewed_for_beginner ? "flag_true_evidence_unverified" : "not_reviewed",
    actual_cooking_test_status: "not_recorded",
    image_rights_status: sourceRecord?.license ? "source_recorded_review_unverified" : "unresolved",
    publish_status: failures.length === 0 ? "eligible" : "blocked",
    last_reviewed_at: "",
    reviewer: "",
    declared_publish_status: "not_available_in_schema",
    current_public_exposure: "exposed_by_current_rls",
    source_record_status: sourceRecord ? "linked" : "missing",
    source_type_original: recipe.content_origin ?? "unresolved",
    source_type_app_projection: "",
    required_gate_failures: failures.join("|"),
    attribution: sourceRecord?.attribution ?? "",
  };
}

function localContentOrigin(recipe) {
  const sourceType = recipe.source?.sourceType ?? "";
  if (sourceType.startsWith("original")) return "original";
  if (sourceType === "public-data") return "public_api";
  if (sourceType.includes("licensed")) return "licensed";
  return "unresolved";
}

function localInventoryRow(recipe, originalRecipe) {
  const projectedSource = recipe.source;
  const source = originalRecipe?.source ?? projectedSource;
  const imageRightsRecorded = Boolean(
    projectedSource?.imageUsageAllowed === true &&
      projectedSource.licenseOrUsageNote?.trim() &&
      projectedSource.rightsNote?.trim(),
  );
  const declaredPublishStatus = recipe.publishStatus ?? "not_declared";
  const currentFallbackEligible = !recipe.publishStatus || recipe.publishStatus === "published";
  const ingredientCount = Array.isArray(recipe.ingredientDetails)
    ? recipe.ingredientDetails.length
    : Array.isArray(recipe.ingredientList)
      ? recipe.ingredientList.length
      : String(recipe.ingredients ?? "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean).length;
  const failures = ["actual_cooking_test_missing"];
  if (!recipe.reviewedForBeginner) failures.push("beginner_review_evidence_missing");
  if (!imageRightsRecorded) failures.push("image_rights_unresolved");

  return {
    inventory_key: `local_runtime_catalog:${recipe.id}`,
    inventory_scope: "local_runtime_catalog",
    storage_location: "lib/curated-recipes.ts",
    recipe_id: recipe.id,
    title: recipe.title ?? recipe.name,
    category: recipe.category,
    source: source?.sourceName ?? recipe.sourceName ?? "",
    source_url: source?.sourceUrl ?? recipe.sourceUrl ?? "",
    source_license: source?.licenseOrUsageNote ?? "",
    content_origin: localContentOrigin({ ...recipe, source: projectedSource }),
    difficulty: recipe.difficultyLevel ?? recipe.difficulty ?? "",
    servings: recipe.servings ?? "",
    prep_time: "",
    cook_time: recipe.cookingTime ?? "",
    total_time: recipe.totalMinutes ?? "",
    ingredient_count: ingredientCount,
    step_count: arrayLength(recipe.steps),
    beginner_review_status: recipe.reviewedForBeginner ? "code_flag_true_evidence_unverified" : "not_recorded",
    actual_cooking_test_status: "not_recorded",
    image_rights_status: imageRightsRecorded ? "metadata_recorded_legal_review_unverified" : "unresolved",
    publish_status: "blocked",
    last_reviewed_at: "",
    reviewer: "",
    declared_publish_status: declaredPublishStatus,
    current_public_exposure: currentFallbackEligible ? "client_fallback_eligible" : "not_exposed_by_fallback",
    source_record_status: source ? "embedded_metadata" : "missing",
    source_type_original: source?.sourceType ?? "unresolved",
    source_type_app_projection: projectedSource?.sourceType ?? "unresolved",
    required_gate_failures: failures.join("|"),
    attribution: source?.rightsNote ?? "",
  };
}

function countBy(rows, key) {
  const counts = new Map();
  for (const row of rows) {
    const value = String(row[key] ?? "blank") || "blank";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => left.localeCompare(right, "ko-KR")));
}

function markdownTable(counts) {
  return Object.entries(counts)
    .map(([label, count]) => `| ${label} | ${count} |`)
    .join("\n");
}

async function run() {
  const env = { ...readEnvFile(envFilePath), ...process.env };
  const supabaseUrl = requiredEnv(env, "NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requiredEnv(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const generatedAt = process.env.INVENTORY_GENERATED_AT?.trim() || new Date().toISOString();

  const [liveRecipes, sourceRecords] = await Promise.all([
    fetchAllRows({
      supabaseUrl,
      anonKey,
      table: "recipes",
      select:
        "id,title,category,difficulty,cooking_time,servings,thumbnail_url,ingredients,steps,source,source_id,content_origin,reviewed_for_beginner,created_at",
      order: "created_at.asc",
    }),
    fetchAllRows({
      supabaseUrl,
      anonKey,
      table: "recipe_sources",
      select: "id,provider,external_id,title,source_url,license,attribution,imported_at",
      order: "imported_at.asc",
    }),
  ]);

  const sourceById = new Map(sourceRecords.map((record) => [record.id, record]));
  const beginnerById = new Map(BEGINNER_RECIPE_LIBRARY.map((recipe) => [recipe.id, recipe]));
  const liveRows = liveRecipes.map((recipe) => liveInventoryRow(recipe, sourceById.get(recipe.source_id)));
  const localRows = CURATED_JIPBAB_RECIPES.map((recipe) => localInventoryRow(recipe, beginnerById.get(recipe.id)));
  const inventoryRows = [...liveRows, ...localRows];

  const liveTitles = new Set(liveRows.map((row) => normalizeTitle(row.title)));
  const localTitleOverlap = localRows.filter((row) => liveTitles.has(normalizeTitle(row.title))).length;
  const liveEligible = liveRows.filter((row) => row.publish_status === "eligible").length;
  const localFallbackEligible = localRows.filter(
    (row) => row.current_public_exposure === "client_fallback_eligible",
  ).length;

  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(path.join(docsDir, "recipe-inventory.csv"), toCsv(inventoryRows, INVENTORY_COLUMNS));
  fs.writeFileSync(path.join(docsDir, "recipe-source-ledger.csv"), toCsv(inventoryRows, SOURCE_LEDGER_COLUMNS));

  const summary = `# 집밥노트 레시피 인벤토리\n\nGenerated: ${generatedAt}\n\n이 문서는 운영 Supabase와 로컬 런타임 카탈로그를 같은 목록으로 오인하지 않도록 두 범위를 분리해 기록합니다. 수치는 추정이 아니라 생성 시점의 운영 REST 응답과 현재 코드에서 직접 계산했습니다.\n\n## 결론\n\n- 운영 Supabase \`public.recipes\`: **${liveRows.length}건**\n- 운영 \`recipe_sources\`: **${sourceRecords.length}건**\n- 계획서의 최소 공개 게이트를 모두 충족한 운영 레시피: **${liveEligible}건**\n- 로컬 런타임 카탈로그: **${localRows.length}건**\n- 현재 클라이언트 fallback 조건에 걸리는 로컬 레시피: **${localFallbackEligible}건**\n- 운영 DB와 로컬 카탈로그의 정규화 제목 중복: **${localTitleOverlap}건**\n- 두 저장소를 단순 합산한 레코드 수: **${inventoryRows.length}건**\n\n정규화 제목이 같아도 ID, 출처, 단계가 동일하다는 증거가 없으므로 자동 병합하지 않았습니다. 따라서 논리 레시피 총수는 중복 판정과 콘텐츠 검수 전까지 확정하지 않습니다. 현재 계획서 기준 공개 가능 수는 **0건**입니다.\n\n## 운영 데이터 품질\n\n| 항목 | 건수 |\n|---|---:|\n| 초보자 검수 플래그 true | ${liveRecipes.filter((recipe) => recipe.reviewed_for_beginner === true).length} |\n| source_id 연결 | ${liveRecipes.filter((recipe) => !blank(recipe.source_id)).length} |\n| 난이도 누락 | ${liveRecipes.filter((recipe) => recipe.difficulty === null).length} |\n| 조리시간 누락 | ${liveRecipes.filter((recipe) => recipe.cooking_time === null).length} |\n| 인분 누락 | ${liveRecipes.filter((recipe) => recipe.servings === null).length} |\n| 재료 3개 미만 | ${liveRecipes.filter((recipe) => arrayLength(recipe.ingredients) < 3).length} |\n| 단계 3개 미만 | ${liveRecipes.filter((recipe) => arrayLength(recipe.steps) < 3).length} |\n\n## 운영 content_origin\n\n| 값 | 건수 |\n|---|---:|\n${markdownTable(countBy(liveRows, "content_origin"))}\n\n## 로컬 선언 상태\n\n| 값 | 건수 |\n|---|---:|\n${markdownTable(countBy(localRows, "declared_publish_status"))}\n\n로컬의 \`published\`나 \`reviewedForBeginner\` 값은 코드 메타데이터입니다. 실제 초보자 조리 테스트 증거와 동일하게 취급하지 않으며, \`publish_status\`는 모두 \`blocked\`로 기록했습니다.\n\n## 파일 해석\n\n- \`recipe-inventory.csv\`: 필수 제품·콘텐츠 필드와 현재 노출/출시 게이트 상태\n- \`recipe-source-ledger.csv\`: 같은 레코드를 출처·라이선스·attribution 중심으로 재정렬한 대장\n- \`current_public_exposure\`: 지금 코드/RLS가 노출하는지에 대한 사실\n- \`publish_status\`: 첨부 계획서의 출시 게이트를 충족하는지에 대한 판정\n- \`declared_publish_status\`: 기존 코드가 선언한 상태. 실제 검수 증거로 승격하지 않음\n\n## 재생성\n\n\`pnpm inventory:recipes\`\n\n명령은 \`.env.local\` 또는 프로세스 환경에서 공개 Supabase URL과 anon key를 읽지만, 키 값은 출력하거나 문서에 저장하지 않습니다.\n`;

  fs.writeFileSync(path.join(docsDir, "recipe-inventory.md"), summary);
  console.log(`Recipe inventory generated: ${liveRows.length} live, ${localRows.length} local, ${liveEligible} eligible`);
}

await run();
