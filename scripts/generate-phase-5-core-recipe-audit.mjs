import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CURATED_JIPBAB_RECIPES } from "../lib/curated-recipes.ts";

export const PHASE5_CORE_20_SELECTIONS = [
  { order: 1, requestedTitle: "간장계란밥", selectedTitle: "간장계란밥", replacementReason: null },
  { order: 2, requestedTitle: "계란볶음밥", selectedTitle: "햄야채볶음밥", replacementReason: "정확한 제목 후보가 없어 계란을 포함한 초보자용 볶음밥으로 대체" },
  { order: 3, requestedTitle: "참치김치볶음밥", selectedTitle: "참치김치볶음밥", replacementReason: null },
  { order: 4, requestedTitle: "김치볶음밥", selectedTitle: "김치볶음밥", replacementReason: null },
  { order: 5, requestedTitle: "계란말이", selectedTitle: "프라이팬 계란말이", replacementReason: null },
  { order: 6, requestedTitle: "계란찜", selectedTitle: "전자레인지 계란찜", replacementReason: null },
  { order: 7, requestedTitle: "두부조림", selectedTitle: "두부조림", replacementReason: null },
  { order: 8, requestedTitle: "감자조림", selectedTitle: "감자조림", replacementReason: null },
  { order: 9, requestedTitle: "어묵볶음", selectedTitle: "어묵볶음", replacementReason: null },
  { order: 10, requestedTitle: "콩나물무침", selectedTitle: "콩나물무침", replacementReason: null },
  { order: 11, requestedTitle: "된장찌개", selectedTitle: "된장찌개", replacementReason: null },
  { order: 12, requestedTitle: "돼지고기 김치찌개", selectedTitle: "돼지고기 김치찌개", replacementReason: null },
  { order: 13, requestedTitle: "미역국", selectedTitle: "미역국", replacementReason: null },
  { order: 14, requestedTitle: "북엇국", selectedTitle: "북엇국", replacementReason: null },
  { order: 15, requestedTitle: "제육볶음", selectedTitle: "제육볶음", replacementReason: null },
  { order: 16, requestedTitle: "간장불고기", selectedTitle: "간장마늘 닭조림", replacementReason: "정확한 제목 후보가 없어 간장 양념 단백질 메인 요리로 대체" },
  { order: 17, requestedTitle: "잔치국수", selectedTitle: "잔치국수", replacementReason: null },
  { order: 18, requestedTitle: "떡볶이", selectedTitle: "떡국떡달걀국", replacementReason: "정확한 제목 후보가 없어 같은 떡국떡을 쓰는 초보자용 메뉴로 대체" },
  { order: 19, requestedTitle: "토마토달걀볶음", selectedTitle: "토마토달걀볶음", replacementReason: null },
  { order: 20, requestedTitle: "닭가슴살 채소볶음", selectedTitle: "닭가슴살양배추덮밥", replacementReason: "정확한 제목 후보가 없어 닭가슴살과 채소를 볶는 한 그릇 메뉴로 대체" },
];

const VAGUE_PHRASES = ["적당히", "노릇하게", "익을 때까지"];
const BITMAP_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);
const COOKING_TEMPLATE_PATH = "docs/phase-5-actual-cooking-template.csv";
const COOKING_TEMPLATE_COLUMNS = [
  "order",
  "requested_title",
  "selected_title",
  "recipe_id",
  "recipe_version",
  "test_date",
  "tester_code",
  "heat_source",
  "cookware",
  "started_at",
  "completed_at",
  "actual_minutes",
  "completed",
  "failed_step",
  "failure_code",
  "safety_issue",
  "copy_change",
  "image_change",
  "evidence_path",
  "status",
];

function nonBlank(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function scoreIf(condition, points) {
  return condition ? points : 0;
}

function recipeText(recipe) {
  return JSON.stringify(recipe);
}

function hasDurationRange(step) {
  return (
    (Number.isFinite(step.durationSecondsMin) && Number.isFinite(step.durationSecondsMax)) ||
    /\d+\s*[~～-]\s*\d+\s*(?:분|초)/u.test(`${step.title ?? ""} ${step.action ?? step.description ?? ""}`)
  );
}

function localBitmapState(recipe, cwd) {
  const imageUrl = recipe.thumbnailUrl;
  if (!nonBlank(imageUrl)) return "missing_url";
  if (/^https?:\/\//u.test(imageUrl)) return "remote_not_verified";
  const relativePath = imageUrl.startsWith("/") ? imageUrl.slice(1) : imageUrl;
  const extension = path.extname(relativePath).toLowerCase();
  if (!BITMAP_EXTENSIONS.has(extension)) return "not_bitmap";
  return existsSync(path.join(cwd, "public", relativePath)) ? "local_bitmap_present" : "missing_file";
}

function scoreRecipe(recipe, cwd) {
  const ingredients = Array.isArray(recipe.ingredientDetails) ? recipe.ingredientDetails : [];
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
  const allStepsHave = (field) => steps.length >= 3 && steps.every((step) => nonBlank(step[field]));
  const allStepActions = steps.length >= 3 && steps.every((step) => nonBlank(step.action ?? step.description));
  const allStepMinutes = steps.length >= 3 && steps.every((step) => Number.isFinite(step.minutes) && step.minutes >= 0);
  const everyStepMentionsIngredient =
    steps.length >= 3 &&
    steps.every((step) => ingredients.some((ingredient) => `${step.action ?? step.description ?? ""}`.includes(ingredient.name)));
  const text = recipeText(recipe);
  const bitmapState = localBitmapState(recipe, cwd);

  const structure =
    scoreIf(nonBlank(recipe.name), 2) +
    scoreIf(nonBlank(recipe.beginnerSummary ?? recipe.featuredReason), 2) +
    scoreIf(nonBlank(recipe.category), 2) +
    scoreIf(Number.isFinite(recipe.difficultyLevel ?? recipe.difficulty), 2) +
    scoreIf(Number.isFinite(recipe.servings) && recipe.servings > 0, 2) +
    scoreIf(Number.isFinite(recipe.totalMinutes ?? recipe.cookingTime), 3) +
    scoreIf(Array.isArray(recipe.beforeStart) && recipe.beforeStart.length >= 2, 2);

  const ingredientScore =
    scoreIf(ingredients.length >= 3, 4) +
    scoreIf(ingredients.length >= 3 && ingredients.every((ingredient) => nonBlank(ingredient.display)), 4) +
    scoreIf(ingredients.length >= 3 && ingredients.every((ingredient) => nonBlank(ingredient.beginnerNote)), 3) +
    scoreIf(ingredients.length >= 3 && ingredients.every((ingredient) => typeof ingredient.required === "boolean"), 3) +
    scoreIf(ingredients.some((ingredient) => nonBlank(ingredient.substitute)) || (recipe.substituteIngredients?.length ?? 0) > 0, 3) +
    scoreIf(/알레르기|알러지|대두|밀|우유|견과|갑각류/u.test(text), 3);

  const stepScore =
    scoreIf(steps.length >= 3, 4) +
    scoreIf(allStepActions, 4) +
    scoreIf(allStepsHave("heat"), 4) +
    scoreIf(allStepMinutes, 2) +
    scoreIf(steps.length >= 3 && steps.every(hasDurationRange), 2) +
    scoreIf(allStepsHave("visualCue"), 4) +
    scoreIf(everyStepMentionsIngredient, 3) +
    scoreIf(steps.length >= 3 && steps.length <= 6 && allStepActions, 2);

  const beginner =
    scoreIf(!VAGUE_PHRASES.some((phrase) => text.includes(phrase)), 4) +
    scoreIf(allStepsHave("commonMistake"), 4) +
    scoreIf(allStepsHave("rescueTip"), 4) +
    scoreIf(allStepsHave("beginnerTip"), 3);

  const safety =
    scoreIf(nonBlank(recipe.safety?.notes), 3) +
    scoreIf(Array.isArray(recipe.safetyNotes) && recipe.safetyNotes.length >= 2, 4) +
    scoreIf(nonBlank(recipe.storageTip), 3) +
    scoreIf(nonBlank(recipe.reheatTip), 3) +
    scoreIf(/2시간|다음 날|\d+일/u.test(`${recipe.storageTip ?? ""} ${recipe.safetyNotes?.join(" ") ?? ""}`), 2);

  const rights =
    scoreIf(nonBlank(recipe.source?.sourceName), 3) +
    scoreIf(nonBlank(recipe.source?.licenseOrUsageNote), 2) +
    scoreIf(nonBlank(recipe.source?.rightsNote), 2) +
    scoreIf(recipe.source?.imageUsageAllowed === true && bitmapState === "local_bitmap_present", 3);

  return {
    structure,
    ingredients: ingredientScore,
    steps: stepScore,
    beginner,
    safety,
    rights,
    total: structure + ingredientScore + stepScore + beginner + safety + rights,
    bitmapState,
  };
}

function resolveSelections(cwd) {
  const selectedTitles = new Set();
  return PHASE5_CORE_20_SELECTIONS.map((selection) => {
    if (selectedTitles.has(selection.selectedTitle)) {
      throw new Error(`Phase 5 selected title is duplicated: ${selection.selectedTitle}`);
    }
    selectedTitles.add(selection.selectedTitle);
    const matches = CURATED_JIPBAB_RECIPES.filter((recipe) => recipe.name === selection.selectedTitle);
    if (matches.length !== 1) {
      throw new Error(`Phase 5 selection must resolve exactly once: ${selection.selectedTitle} (${matches.length})`);
    }
    const recipe = matches[0];
    const score = scoreRecipe(recipe, cwd);
    const structuralGate =
      (recipe.ingredientDetails?.length ?? 0) >= 3 &&
      recipe.steps.length >= 3 &&
      recipe.steps.every(
        (step) =>
          nonBlank(step.action ?? step.description) &&
          nonBlank(step.heat) &&
          Number.isFinite(step.minutes) &&
          nonBlank(step.visualCue),
      );
    const blockingGates = [
      "db_recipe_sources_link",
      "legal_source_human_review",
      "beginner_human_review",
      "food_safety_human_review",
      "image_rights_human_review",
      "actual_cooking_test",
      ...(structuralGate ? [] : ["structured_content"]),
    ];
    return {
      ...selection,
      recipe,
      score,
      hardGateStatus: "blocked",
      blockingGates,
      publishDecision: "blocked_missing_human_evidence",
    };
  });
}

function csvValue(value) {
  const text = String(value ?? "");
  return /[",\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(columns, rows) {
  return `${columns.join(",")}\n${rows.map((row) => columns.map((column) => csvValue(row[column])).join(",")).join("\n")}\n`;
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (quoted && character === '"' && next === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (!quoted && character === ",") {
      row.push(cell);
      cell = "";
    } else if (!quoted && character === "\n") {
      row.push(cell.replace(/\r$/u, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (quoted) return null;
  if (cell || row.length > 0) {
    row.push(cell.replace(/\r$/u, ""));
    rows.push(row);
  }
  return rows;
}

function cookingTemplateIsCompatible(text, audits) {
  const parsedRows = parseCsvRows(text);
  if (!parsedRows || parsedRows.length === 0) return false;
  const [header, ...rows] = parsedRows;
  const dataRows = rows.filter((values) => values.some(Boolean));
  if (
    header.length !== COOKING_TEMPLATE_COLUMNS.length ||
    !header.every((column, index) => column === COOKING_TEMPLATE_COLUMNS[index]) ||
    dataRows.length !== audits.length
  ) {
    return false;
  }

  return dataRows.every(
    (values, index) =>
      values.length === COOKING_TEMPLATE_COLUMNS.length &&
      values[0] === String(audits[index].order) &&
      values[1] === audits[index].requestedTitle &&
      values[2] === audits[index].selectedTitle &&
      values[3] === audits[index].recipe.id,
  );
}

function auditCsv(audits) {
  const columns = [
    "order",
    "requested_title",
    "selected_title",
    "recipe_id",
    "is_substitute",
    "replacement_reason",
    "automatic_editorial_score",
    "structure_score",
    "ingredients_score",
    "steps_score",
    "beginner_score",
    "safety_score",
    "rights_score",
    "local_bitmap_state",
    "hard_gate_status",
    "blocking_gates",
    "publish_decision",
  ];
  return toCsv(
    columns,
    audits.map((audit) => ({
      order: audit.order,
      requested_title: audit.requestedTitle,
      selected_title: audit.selectedTitle,
      recipe_id: audit.recipe.id,
      is_substitute: audit.replacementReason ? "true" : "false",
      replacement_reason: audit.replacementReason ?? "",
      automatic_editorial_score: audit.score.total,
      structure_score: audit.score.structure,
      ingredients_score: audit.score.ingredients,
      steps_score: audit.score.steps,
      beginner_score: audit.score.beginner,
      safety_score: audit.score.safety,
      rights_score: audit.score.rights,
      local_bitmap_state: audit.score.bitmapState,
      hard_gate_status: audit.hardGateStatus,
      blocking_gates: audit.blockingGates.join("|"),
      publish_decision: audit.publishDecision,
    })),
  );
}

function cookingTemplateCsv(audits) {
  return toCsv(
    COOKING_TEMPLATE_COLUMNS,
    audits.map((audit) => ({
      order: audit.order,
      requested_title: audit.requestedTitle,
      selected_title: audit.selectedTitle,
      recipe_id: audit.recipe.id,
      recipe_version: "",
      test_date: "",
      tester_code: "",
      heat_source: "",
      cookware: "",
      started_at: "",
      completed_at: "",
      actual_minutes: "",
      completed: "",
      failed_step: "",
      failure_code: "",
      safety_issue: "",
      copy_change: "",
      image_change: "",
      evidence_path: "",
      status: "pending",
    })),
  );
}

function auditMarkdown(audits) {
  const exactCount = audits.filter((audit) => !audit.replacementReason).length;
  const substituteCount = audits.length - exactCount;
  const score90Count = audits.filter((audit) => audit.score.total >= 90).length;
  const bitmapCount = audits.filter((audit) => audit.score.bitmapState === "local_bitmap_present").length;
  const rows = audits
    .map(
      (audit) =>
        `| ${audit.order} | ${audit.requestedTitle} | ${audit.selectedTitle} | ${audit.recipe.id} | ${audit.replacementReason ?? "-"} | ${audit.score.total} | ${audit.score.bitmapState} | blocked |`,
    )
    .join("\n");

  return `# Phase 5 핵심 20개 레시피 감사\n\n이 문서는 현재 로컬 카탈로그를 계획서의 Phase 5 후보와 매핑하고 자동 편집 검사를 실행한 결과다. 자동 점수는 편집 우선순위일 뿐이며 실제 조리, 초보자, 식품 안전, 법무 출처, 이미지 권리 검수를 대신하지 않는다.\n\n## 결과\n\n- 후보: **${audits.length}개**\n- 정확한 메뉴 또는 명시적 조리 변형: **${exactCount}개**\n- 정확한 후보 부재로 유사 메뉴 대체: **${substituteCount}개**\n- 자동 편집 점수 90점 이상: **${score90Count}개**\n- 로컬 비트맵 파일 확인: **${bitmapCount}개**\n- 인간 실제 조리 테스트 증거: **0/${audits.length}개**\n- Phase 5 공개 승인: **0/${audits.length}개**\n\n## 진실 표면\n\n모든 후보는 DB의 \`recipe_sources\` 연결, 검수자·검수일·메모가 있는 초보자/식품 안전/법무 출처/이미지 권리 검수, 실제 사람이 수행한 조리 테스트 증거가 없으므로 \`blocked_missing_human_evidence\`다. 코드의 \`published\`, \`reviewedForBeginner\`, 점수 또는 자동 테스트 성공을 이 증거로 승격하지 않는다.\n\n## 후보 목록\n\n| 순서 | 계획 메뉴 | 선택 메뉴 | 로컬 ID | 대체 사유 | 자동 점수 | 이미지 | 하드 게이트 |\n|---:|---|---|---|---|---:|---|---|\n${rows}\n\n## 점수 해석\n\n- 기본 구조 15, 재료·계량 20, 단계 실행 가능성 25, 초보자 언어·복구 15, 식품 안전·보관 15, 출처·이미지 권리 10으로 계산한다.\n- 정형 알레르기 정보, 단계별 최소·최대 시간, 재료-단계 연결이 없으면 자동 점수가 차감된다.\n- 90점 이상이어도 하드 게이트가 하나라도 없으면 공개 불가다.\n\n## 다음 게이트\n\n1. \`docs/phase-5-actual-cooking-template.csv\`에 익명 테스터 코드와 실패 사례를 포함한 실제 조리 결과를 기록한다.\n2. 각 레시피에 구조/편집/초보자/식품 안전/실제 조리/법무 출처 검수를 별도 증거로 남긴다.\n3. 이미지 파일과 레시피 단계가 일치하는지 사람이 확인하고 권리 검수 일시를 기록한다.\n4. 증거가 완성된 레시피만 관리자 경로에서 DB 공개 필드를 갱신한다.\n`;
}

export function buildPhase5Artifacts(cwd = process.cwd()) {
  const audits = resolveSelections(cwd);
  return {
    audits,
    files: {
      "docs/phase-5-core-20-audit.csv": auditCsv(audits),
      "docs/phase-5-core-20-audit.md": auditMarkdown(audits),
      [COOKING_TEMPLATE_PATH]: cookingTemplateCsv(audits),
    },
  };
}

export function writePhase5Artifacts(cwd = process.cwd()) {
  const artifacts = buildPhase5Artifacts(cwd);
  for (const [relativePath, content] of Object.entries(artifacts.files)) {
    const absolutePath = path.join(cwd, relativePath);
    if (relativePath === COOKING_TEMPLATE_PATH && existsSync(absolutePath)) {
      const existingTemplate = readFileSync(absolutePath, "utf8");
      if (!cookingTemplateIsCompatible(existingTemplate, artifacts.audits)) {
        throw new Error(
          `Phase 5 actual cooking evidence is incompatible with the current selection; reconcile it manually: ${relativePath}`,
        );
      }
      continue;
    }
    writeFileSync(absolutePath, content, "utf8");
  }
  return artifacts;
}

export function checkPhase5Artifacts(cwd = process.cwd()) {
  const artifacts = buildPhase5Artifacts(cwd);
  const stale = Object.entries(artifacts.files)
    .filter(([relativePath, expected]) => {
      const absolutePath = path.join(cwd, relativePath);
      if (!existsSync(absolutePath)) return true;
      const actual = readFileSync(absolutePath, "utf8");
      if (relativePath === COOKING_TEMPLATE_PATH) {
        return !cookingTemplateIsCompatible(actual, artifacts.audits);
      }
      return actual !== expected;
    })
    .map(([relativePath]) => relativePath);
  return { ...artifacts, stale };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const cwd = process.cwd();
  if (process.argv.includes("--check")) {
    const result = checkPhase5Artifacts(cwd);
    if (result.stale.length > 0) {
      console.error(`Phase 5 audit artifacts are stale: ${result.stale.join(", ")}`);
      process.exit(1);
    }
    console.log(`Phase 5 audit artifacts are current: ${result.audits.length} recipes`);
  } else {
    const result = writePhase5Artifacts(cwd);
    console.log(`Phase 5 audit generated: ${result.audits.length} recipes`);
  }
}
