import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CURATED_JIPBAB_RECIPES } from "../lib/curated-recipes.ts";

export const PHASE5_CORE_20_SELECTIONS = [
  { order: 1, requestedTitle: "간장계란밥", selectedTitle: "간장계란밥", replacementReason: null },
  { order: 2, requestedTitle: "계란볶음밥", selectedTitle: "계란볶음밥", replacementReason: null },
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
  { order: 16, requestedTitle: "간장불고기", selectedTitle: "간장불고기", replacementReason: null },
  { order: 17, requestedTitle: "잔치국수", selectedTitle: "잔치국수", replacementReason: null },
  { order: 18, requestedTitle: "떡볶이", selectedTitle: "떡볶이", replacementReason: null },
  { order: 19, requestedTitle: "토마토달걀볶음", selectedTitle: "토마토달걀볶음", replacementReason: null },
  { order: 20, requestedTitle: "닭가슴살 채소볶음", selectedTitle: "닭가슴살 채소볶음", replacementReason: null },
];

const VAGUE_PHRASES = ["적당히", "노릇하게", "익을 때까지"];
const BITMAP_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);
export const PHASE5_COOKING_TEMPLATE_PATH = "docs/phase-5-actual-cooking-template.csv";
export const PHASE5_HUMAN_REVIEW_TEMPLATE_PATH = "docs/phase-5-human-review-template.csv";
export const PHASE5_HUMAN_TEST_PACKETS_PATH = "docs/phase-5-human-test-packets.md";
export const PHASE5_HUMAN_REVIEW_TYPES = ["beginner", "food_safety", "legal_source", "image_rights"];
export const PHASE5_COOKING_TEMPLATE_COLUMNS = [
  "order",
  "requested_title",
  "selected_title",
  "recipe_id",
  "recipe_version",
  "attempt_id",
  "app_build_sha",
  "test_surface",
  "test_device",
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
export const PHASE5_HUMAN_REVIEW_TEMPLATE_COLUMNS = [
  "order",
  "requested_title",
  "selected_title",
  "recipe_id",
  "recipe_version",
  "review_type",
  "reviewer_code",
  "reviewed_at",
  "score",
  "result",
  "notes",
  "evidence_path",
  "db_recipe_id",
  "source_record_id",
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

export function contentVersionForRecipe(recipe) {
  const evidenceBoundContent = {
    id: recipe.id,
    name: recipe.name,
    category: recipe.category,
    servings: recipe.servings,
    totalMinutes: recipe.totalMinutes ?? recipe.cookingTime,
    thumbnailUrl: recipe.thumbnailUrl,
    requiredTools: recipe.requiredTools,
    ingredientDetails: recipe.ingredientDetails,
    substituteIngredients: recipe.substituteIngredients,
    beforeStart: recipe.beforeStart,
    steps: recipe.steps,
    successCheck: recipe.successCheck,
    storageTip: recipe.storageTip,
    reheatTip: recipe.reheatTip,
    fallbackMeal: recipe.fallbackMeal,
    source: recipe.source,
    safety: recipe.safety,
    safetyNotes: recipe.safetyNotes,
  };
  const digest = createHash("sha256").update(JSON.stringify(evidenceBoundContent)).digest("hex");
  return `phase5-sha256-${digest.slice(0, 24)}`;
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
    const recipeVersion = contentVersionForRecipe(recipe);
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
      recipeVersion,
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

export function parseCsvRows(text) {
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
    header.length !== PHASE5_COOKING_TEMPLATE_COLUMNS.length ||
    !header.every((column, index) => column === PHASE5_COOKING_TEMPLATE_COLUMNS[index]) ||
    dataRows.length < audits.length
  ) {
    return false;
  }
  const auditsByRecipeId = new Map(audits.map((audit) => [audit.recipe.id, audit]));
  const presentRecipeIds = new Set();
  const rowsMatch = dataRows.every((values) => {
    const audit = auditsByRecipeId.get(values[3]);
    if (!audit) return false;
    presentRecipeIds.add(audit.recipe.id);
    return (
      values.length === PHASE5_COOKING_TEMPLATE_COLUMNS.length &&
      values[0] === String(audit.order) &&
      values[1] === audit.requestedTitle &&
      values[2] === audit.selectedTitle &&
      values[4] === audit.recipeVersion
    );
  });
  return rowsMatch && audits.every((audit) => presentRecipeIds.has(audit.recipe.id));
}

function cookingTemplateIsEmptyPending(text, audits) {
  const parsedRows = parseCsvRows(text);
  if (!parsedRows || parsedRows.length === 0) return false;
  const [header, ...rows] = parsedRows;
  const dataRows = rows.filter((values) => values.some(Boolean));
  if (
    header.length < 5 ||
    !header.slice(0, 4).every((column, index) => column === PHASE5_COOKING_TEMPLATE_COLUMNS[index]) ||
    !header.includes("status") ||
    dataRows.length !== audits.length
  ) {
    return false;
  }
  return dataRows.every((values, index) => {
    const audit = audits[index];
    const identityMatches =
      values[0] === String(audit.order) &&
      values[1] === audit.requestedTitle &&
      values[2] === audit.selectedTitle &&
      values[3] === audit.recipe.id;
    const evidenceIsEmpty = header.every(
      (column, columnIndex) =>
        columnIndex < 4 ||
        column === "recipe_version" ||
        values[columnIndex] === "" ||
        (column === "status" && values[columnIndex] === "pending"),
    );
    return identityMatches && evidenceIsEmpty;
  });
}

function humanReviewTemplateIsCompatible(text, audits) {
  const parsedRows = parseCsvRows(text);
  if (!parsedRows || parsedRows.length === 0) return false;
  const [header, ...rows] = parsedRows;
  const dataRows = rows.filter((values) => values.some(Boolean));
  const expectedRows = audits.flatMap((audit) =>
    PHASE5_HUMAN_REVIEW_TYPES.map((reviewType) => ({ audit, reviewType })),
  );
  if (
    header.length !== PHASE5_HUMAN_REVIEW_TEMPLATE_COLUMNS.length ||
    !header.every((column, index) => column === PHASE5_HUMAN_REVIEW_TEMPLATE_COLUMNS[index]) ||
    dataRows.length !== expectedRows.length
  ) {
    return false;
  }

  return dataRows.every((values, index) => {
    const expected = expectedRows[index];
    return (
      values.length === PHASE5_HUMAN_REVIEW_TEMPLATE_COLUMNS.length &&
      values[0] === String(expected.audit.order) &&
      values[1] === expected.audit.requestedTitle &&
      values[2] === expected.audit.selectedTitle &&
      values[3] === expected.audit.recipe.id &&
      values[4] === expected.audit.recipeVersion &&
      values[5] === expected.reviewType
    );
  });
}

function humanReviewTemplateIsEmptyPending(text, audits) {
  const parsedRows = parseCsvRows(text);
  if (!parsedRows || parsedRows.length === 0) return false;
  const [header, ...rows] = parsedRows;
  const dataRows = rows.filter((values) => values.some(Boolean));
  const expectedRows = audits.flatMap((audit) =>
    PHASE5_HUMAN_REVIEW_TYPES.map((reviewType) => ({ audit, reviewType })),
  );
  if (
    header.length !== PHASE5_HUMAN_REVIEW_TEMPLATE_COLUMNS.length ||
    !header.every((column, index) => column === PHASE5_HUMAN_REVIEW_TEMPLATE_COLUMNS[index]) ||
    dataRows.length !== expectedRows.length
  ) {
    return false;
  }
  return dataRows.every((values, index) => {
    const expected = expectedRows[index];
    const identityMatches =
      values[0] === String(expected.audit.order) &&
      values[1] === expected.audit.requestedTitle &&
      values[2] === expected.audit.selectedTitle &&
      values[3] === expected.audit.recipe.id &&
      values[5] === expected.reviewType;
    const evidenceIsEmpty = header.every(
      (column, columnIndex) =>
        columnIndex < 4 ||
        column === "recipe_version" ||
        column === "review_type" ||
        values[columnIndex] === "" ||
        (column === "result" && values[columnIndex] === "pending"),
    );
    return identityMatches && evidenceIsEmpty;
  });
}

function auditCsv(audits) {
  const columns = [
    "order",
    "requested_title",
    "selected_title",
    "recipe_id",
    "recipe_version",
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
      recipe_version: audit.recipeVersion,
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
    PHASE5_COOKING_TEMPLATE_COLUMNS,
    audits.map((audit) => ({
      order: audit.order,
      requested_title: audit.requestedTitle,
      selected_title: audit.selectedTitle,
      recipe_id: audit.recipe.id,
      recipe_version: audit.recipeVersion,
      attempt_id: "",
      app_build_sha: "",
      test_surface: "",
      test_device: "",
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

function humanReviewTemplateCsv(audits) {
  return toCsv(
    PHASE5_HUMAN_REVIEW_TEMPLATE_COLUMNS,
    audits.flatMap((audit) =>
      PHASE5_HUMAN_REVIEW_TYPES.map((reviewType) => ({
        order: audit.order,
        requested_title: audit.requestedTitle,
        selected_title: audit.selectedTitle,
        recipe_id: audit.recipe.id,
        recipe_version: audit.recipeVersion,
        review_type: reviewType,
        reviewer_code: "",
        reviewed_at: "",
        score: "",
        result: "pending",
        notes: "",
        evidence_path: "",
        db_recipe_id: "",
        source_record_id: "",
      })),
    ),
  );
}

function compactMarkdownText(value) {
  return String(value ?? "").replace(/\s+/gu, " ").trim();
}

function humanTestPacketsMarkdown(audits) {
  const packets = audits
    .map((audit) => {
      const recipe = audit.recipe;
      const ingredients = (recipe.ingredientDetails ?? [])
        .map(
          (ingredient) =>
            `- **${compactMarkdownText(ingredient.name)} ${compactMarkdownText(ingredient.display)}** — ${compactMarkdownText(ingredient.beginnerNote)} ${compactMarkdownText(ingredient.prepNote)}`.trim(),
        )
        .join("\n");
      const substitutes = (recipe.substituteIngredients ?? [])
        .map((ingredient) => `- ${compactMarkdownText(ingredient.name)} → ${compactMarkdownText(ingredient.display)}`)
        .join("\n");
      const beforeStart = (recipe.beforeStart ?? [])
        .map((item) => `- ${compactMarkdownText(item)}`)
        .join("\n");
      const steps = (recipe.steps ?? [])
        .map(
          (step, index) =>
            `${index + 1}. ${compactMarkdownText(step.action ?? step.description)}\n   - 불: ${compactMarkdownText(step.heat)} / 기준 시간: ${step.minutes ?? "기록 없음"}분\n   - 완료 신호: ${compactMarkdownText(step.visualCue)}\n   - 흔한 실수: ${compactMarkdownText(step.commonMistake)}\n   - 복구: ${compactMarkdownText(step.rescueTip)}`,
        )
        .join("\n");
      const safetyItems = [
        ...(recipe.safetyNotes ?? []),
        ...(recipe.safety?.notes ? [recipe.safety.notes] : []),
      ].map(compactMarkdownText).filter(Boolean);
      const safety = [...new Set(safetyItems)].map((item) => `- ${item}`).join("\n");
      const replacement = audit.replacementReason
        ? `- 계획 메뉴 대체: ${compactMarkdownText(audit.replacementReason)}`
        : "- 계획 메뉴 대체: 없음";

      return `## ${String(audit.order).padStart(2, "0")}. ${recipe.name}

- 계획 메뉴: ${audit.requestedTitle}
- 선택 메뉴: ${audit.selectedTitle}
${replacement}
- 레시피 ID: \`${recipe.id}\`
- 콘텐츠 버전: \`${audit.recipeVersion}\`
- 기준: ${recipe.servings}인분 / ${recipe.totalMinutes ?? recipe.cookingTime}분 / 난이도 ${recipe.difficultyLevel ?? recipe.difficulty}
- 필요한 도구: ${(recipe.requiredTools ?? []).map(compactMarkdownText).join(", ")}
- 대표 이미지: \`${recipe.thumbnailUrl ?? "없음"}\`

### 현장 고정값

- 실제 앱 Git SHA: ____________________
- 테스트 표면(web/ios/android): ____________________
- 기기·OS: ____________________
- 익명 테스터 코드: ____________________
- 시도 코드: ____________________
- 시작 시각: ____________________

### 재료

${ingredients || "- 구조화된 재료 없음 — 테스트 금지"}

### 허용된 대체 재료

${substitutes || "- 없음"}

### 시작 전 확인

${beforeStart || "- 없음"}

### 앱 안내대로 조리

${steps || "1. 구조화된 단계 없음 — 테스트 금지"}

### 성공·복구·안전

- 완성 신호: ${compactMarkdownText(recipe.successCheck)}
- 실패 복구: ${compactMarkdownText(recipe.fallbackMeal)}
- 보관: ${compactMarkdownText(recipe.storageTip)}
- 재가열: ${compactMarkdownText(recipe.reheatTip)}
${safety || "- 안전 안내 없음 — 테스트 금지"}

### 사람 증거 기록

- 증거 폴더: \`output/phase5-human-evidence/${recipe.id}/${audit.recipeVersion}/<session_code>/\`
- [ ] 실제 조리 결과를 성공·실패와 무관하게 조리 CSV에 기록
- [ ] beginner 검수
- [ ] food_safety 검수
- [ ] legal_source 검수와 DB recipe/source UUID 확인
- [ ] image_rights 검수와 메뉴·단계 이미지 일치 확인
- [ ] 이메일·전화번호·얼굴·주소·계정 알림이 증거에 없는지 확인
- 참고 출처: ${compactMarkdownText(recipe.source?.sourceName)} (${compactMarkdownText(recipe.source?.sourceUrl)})
- 사용 조건: ${compactMarkdownText(recipe.source?.licenseOrUsageNote)}
`;
    })
    .join("\n---\n\n");

  return `# Phase 5 핵심 20개 실제 조리·사람 검수 패킷

이 문서는 현재 코드의 조리 안내를 결정적 콘텐츠 버전에 고정해 현장 테스트에 전달한다. 실제 사람이 앱 화면만 보고 조리한 결과만 기록하며 자동 점수, 문서 생성, 체크박스 작성만으로 승인하지 않는다.

## 운영 경계

- 각 패킷의 콘텐츠 버전과 실제 테스트 앱 Git SHA를 함께 기록한다.
- 실패·중단·안전 문제를 숨기지 않고 최신 재시험도 새 시도로 추가한다.
- 이 문서는 증거 입력을 돕는 실행서이며 사람 증거를 자동 승인하거나 DB에 반영하지 않는다.
- 조리 안내, 재료, 이미지, 출처 또는 안전 문구가 바뀌면 콘텐츠 버전도 바뀌며 이전 증거는 새 버전에 재사용할 수 없다.
- 원본 증거는 \`output/phase5-human-evidence/\` 아래에 두고 Git에 커밋하지 않는다.

${packets}`;
}

function auditMarkdown(audits) {
  const exactCount = audits.filter((audit) => !audit.replacementReason).length;
  const substituteCount = audits.length - exactCount;
  const score90Count = audits.filter((audit) => audit.score.total >= 90).length;
  const bitmapCount = audits.filter((audit) => audit.score.bitmapState === "local_bitmap_present").length;
  const rows = audits
    .map(
      (audit) =>
        `| ${audit.order} | ${audit.requestedTitle} | ${audit.selectedTitle} | ${audit.recipe.id} | ${audit.recipeVersion} | ${audit.replacementReason ?? "-"} | ${audit.score.total} | ${audit.score.bitmapState} | blocked |`,
    )
    .join("\n");

  return `# Phase 5 핵심 20개 레시피 감사\n\n이 문서는 현재 로컬 카탈로그를 계획서의 Phase 5 후보와 매핑하고 자동 편집 검사를 실행한 결과다. 자동 점수는 편집 우선순위일 뿐이며 실제 조리, 초보자, 식품 안전, 법무 출처, 이미지 권리 검수를 대신하지 않는다.\n\n## 결과\n\n- 후보: **${audits.length}개**\n- 정확한 메뉴 또는 명시적 조리 변형: **${exactCount}개**\n- 정확한 후보 부재로 유사 메뉴 대체: **${substituteCount}개**\n- 자동 편집 점수 90점 이상: **${score90Count}개**\n- 로컬 비트맵 파일 확인: **${bitmapCount}개**\n- 인간 실제 조리 테스트 증거: **0/${audits.length}개**\n- Phase 5 공개 승인: **0/${audits.length}개**\n\n## 진실 표면\n\n모든 후보는 DB의 \`recipe_sources\` 연결, 검수자·검수일·메모가 있는 초보자/식품 안전/법무 출처/이미지 권리 검수, 실제 사람이 수행한 조리 테스트 증거가 없으므로 \`blocked_missing_human_evidence\`다. 코드의 \`published\`, \`reviewedForBeginner\`, 점수 또는 자동 테스트 성공을 이 증거로 승격하지 않는다. 조리·재료·이미지·출처·안전 필드에서 계산한 콘텐츠 버전이 달라지면 사람 증거도 새 버전으로 다시 수집한다.\n\n## 후보 목록\n\n| 순서 | 계획 메뉴 | 선택 메뉴 | 로컬 ID | 콘텐츠 버전 | 대체 사유 | 자동 점수 | 이미지 | 하드 게이트 |\n|---:|---|---|---|---|---|---:|---|---|\n${rows}\n\n## 점수 해석\n\n- 기본 구조 15, 재료·계량 20, 단계 실행 가능성 25, 초보자 언어·복구 15, 식품 안전·보관 15, 출처·이미지 권리 10으로 계산한다.\n- 정형 알레르기 정보, 단계별 최소·최대 시간, 재료-단계 연결이 없으면 자동 점수가 차감된다.\n- 90점 이상이어도 하드 게이트가 하나라도 없으면 공개 불가다.\n\n## 다음 게이트\n\n1. \`docs/phase-5-human-test-packets.md\`의 현재 콘텐츠 버전으로 실제 조리를 수행한다.\n2. \`docs/phase-5-actual-cooking-template.csv\`에 익명 테스터 코드와 실패 사례를 포함한 실제 조리 결과를 기록한다.\n3. 각 레시피에 구조/편집/초보자/식품 안전/실제 조리/법무 출처 검수를 별도 증거로 남긴다.\n4. 이미지 파일과 레시피 단계가 일치하는지 사람이 확인하고 권리 검수 일시를 기록한다.\n5. 증거가 완성된 레시피만 관리자 경로에서 DB 공개 필드를 갱신한다.\n`;
}

export function buildPhase5Artifacts(cwd = process.cwd()) {
  const audits = resolveSelections(cwd);
  return {
    audits,
    files: {
      "docs/phase-5-core-20-audit.csv": auditCsv(audits),
      "docs/phase-5-core-20-audit.md": auditMarkdown(audits),
      [PHASE5_COOKING_TEMPLATE_PATH]: cookingTemplateCsv(audits),
      [PHASE5_HUMAN_REVIEW_TEMPLATE_PATH]: humanReviewTemplateCsv(audits),
      [PHASE5_HUMAN_TEST_PACKETS_PATH]: humanTestPacketsMarkdown(audits),
    },
  };
}

export function writePhase5Artifacts(cwd = process.cwd()) {
  const artifacts = buildPhase5Artifacts(cwd);
  for (const [relativePath, content] of Object.entries(artifacts.files)) {
    const absolutePath = path.join(cwd, relativePath);
    const isCookingTemplate = relativePath === PHASE5_COOKING_TEMPLATE_PATH;
    const isHumanReviewTemplate = relativePath === PHASE5_HUMAN_REVIEW_TEMPLATE_PATH;
    if ((isCookingTemplate || isHumanReviewTemplate) && existsSync(absolutePath)) {
      const existingTemplate = readFileSync(absolutePath, "utf8");
      const isCompatible = isCookingTemplate
        ? cookingTemplateIsCompatible(existingTemplate, artifacts.audits)
        : humanReviewTemplateIsCompatible(existingTemplate, artifacts.audits);
      if (!isCompatible) {
        const canReplaceEmptyPending = isCookingTemplate
          ? cookingTemplateIsEmptyPending(existingTemplate, artifacts.audits)
          : humanReviewTemplateIsEmptyPending(existingTemplate, artifacts.audits);
        if (canReplaceEmptyPending) {
          writeFileSync(absolutePath, content, "utf8");
          continue;
        }
        throw new Error(
          `Phase 5 human evidence is incompatible with the current selection; reconcile it manually: ${relativePath}`,
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
      if (relativePath === PHASE5_COOKING_TEMPLATE_PATH) {
        return !cookingTemplateIsCompatible(actual, artifacts.audits);
      }
      if (relativePath === PHASE5_HUMAN_REVIEW_TEMPLATE_PATH) {
        return !humanReviewTemplateIsCompatible(actual, artifacts.audits);
      }
      return actual !== expected;
    })
    .map(([relativePath]) => relativePath);
  return { ...artifacts, stale };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const cwd = process.cwd();
  const args = process.argv.slice(2);
  const usage = "Usage: node --experimental-strip-types scripts/generate-phase-5-core-recipe-audit.mjs [--check|--help]";
  const unknownArgs = args.filter((argument) => argument !== "--check" && argument !== "--help");
  if (unknownArgs.length > 0 || args.filter((argument) => argument === "--check").length > 1) {
    console.error(usage);
    process.exitCode = 2;
  } else if (args.includes("--help")) {
    console.log(usage);
    console.log("Without flags, regenerate the Phase 5 audit, versioned human-test packets, and empty evidence templates.");
    console.log("--check verifies tracked artifacts without changing files.");
  } else if (args.includes("--check")) {
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
