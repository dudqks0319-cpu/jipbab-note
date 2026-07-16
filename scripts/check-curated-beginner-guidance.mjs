// 집밥노트 큐레이션 레시피의 초보자 안내 필드를 실제 exported 데이터 기준으로 검증합니다.
import { CURATED_JIPBAB_RECIPES } from "../lib/curated-recipes.ts";

const MIN_CURATED_RECIPE_COUNT = 20;
const failures = [];

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function addFailure(recipe, detail) {
  failures.push(`${recipe.id ?? "unknown"} (${recipe.name ?? recipe.title ?? "제목 없음"}): ${detail}`);
}

for (const recipe of CURATED_JIPBAB_RECIPES) {
  if (!hasText(recipe.beginnerSummary)) {
    addFailure(recipe, "beginnerSummary missing");
  }

  if (!Array.isArray(recipe.measurementTips) || recipe.measurementTips.length === 0 || recipe.measurementTips.some((tip) => !hasText(tip))) {
    addFailure(recipe, "measurementTips missing");
  }

  if (!Array.isArray(recipe.steps) || recipe.steps.length < 4) {
    addFailure(recipe, `at least 4 beginner steps required, got ${recipe.steps?.length ?? 0}`);
    continue;
  }

  recipe.steps.forEach((step, index) => {
    const stepLabel = step.title ?? step.description?.slice(0, 24) ?? `step ${index + 1}`;
    if (!hasText(step.beginnerTip)) {
      addFailure(recipe, `${stepLabel}: beginnerTip missing`);
    }
    if (!hasText(step.visualCue)) {
      addFailure(recipe, `${stepLabel}: visualCue missing`);
    }
  });
}

console.log("Curated beginner guidance check");

if (CURATED_JIPBAB_RECIPES.length < MIN_CURATED_RECIPE_COUNT) {
  failures.push(`${CURATED_JIPBAB_RECIPES.length}/${MIN_CURATED_RECIPE_COUNT} curated recipes configured`);
}

if (failures.length > 0) {
  console.log(`FAIL - ${failures.length} beginner guidance issue(s)`);
  for (const failure of failures.slice(0, 20)) {
    console.log(`- ${failure}`);
  }
  if (failures.length > 20) {
    console.log(`- ... ${failures.length - 20} more`);
  }
  process.exit(1);
}

console.log(
  `PASS - ${CURATED_JIPBAB_RECIPES.length} curated recipes include beginner summary, measurement tips, beginner tips, and visual cues`,
);
