import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const source = readFileSync("scripts/check-beginner-goal-readiness.mjs", "utf8");
const mobileEvidenceSource = readFileSync("scripts/check-beginner-mobile-evidence.mjs", "utf8");
const curatedGuidanceSource = readFileSync("scripts/check-curated-beginner-guidance.mjs", "utf8");
const releaseReadinessSource = readFileSync("scripts/release-readiness-check.mjs", "utf8");

test("beginner goal readiness command is wired into package scripts", () => {
  assert.equal(
    packageJson.scripts["check:beginner-goal-readiness"],
    "node --experimental-strip-types scripts/check-beginner-goal-readiness.mjs",
  );
  assert.equal(
    packageJson.scripts["check:beginner-mobile-evidence"],
    "node scripts/check-beginner-mobile-evidence.mjs",
  );
  assert.equal(
    packageJson.scripts["check:curated-beginner-guidance"],
    "node --experimental-strip-types scripts/check-curated-beginner-guidance.mjs",
  );
});

test("beginner goal readiness audits the user-visible completion surfaces", () => {
  assert.match(source, /REQUIRED_RECIPE_100_NAMES/);
  assert.match(source, /ONBOARDING_RECIPE_10_NAMES/);
  assert.match(source, /RELEASE_RECIPE_30_NAMES/);
  assert.match(source, /CORE_RECIPE_50_NAMES/);
  assert.match(source, /filterBeginnerHomeRecipes/);
  assert.match(source, /RecipeCookMode/);
  assert.match(source, /RecipeShoppingAssistant/);
  assert.match(source, /부서졌을 때/);
  assert.match(source, /TodayActionCard/);
  assert.match(source, /StarterActionCard/);
  assert.match(source, /buildHomeHref/);
  assert.match(source, /지금 바로 가능/);
  assert.match(source, /1개만 사면 가능/);
  assert.match(source, /재료 확인하고 만들기/);
  assert.match(source, /부족 재료 보기/);
  assert.match(source, /냉장고 열고 고민 끝/);
  assert.match(source, /메뉴 더 찾기/);
  assert.match(source, /레시피 목록\/검색\/필터\/정렬 연결/);
  assert.match(source, /matchesRecipeListFilters/);
  assert.match(source, /sortRecipeListRecipes/);
  assert.match(source, /Supabase 가족 scope\/RLS migration/);
  assert.match(source, /docs\/recipe-content-rights\.md/);
});

test("beginner mobile evidence checker validates captured mobile widths", () => {
  assert.match(mobileEvidenceSource, /jipbab-home-360-beginner-family\.png/);
  assert.match(mobileEvidenceSource, /jipbab-recipe-390-filters-final\.png/);
  assert.match(mobileEvidenceSource, /jipbab-recipe-detail-cook-430\.png/);
  assert.match(mobileEvidenceSource, /jipbab-recipe-detail-shopping-390\.png/);
  assert.match(mobileEvidenceSource, /readUInt32BE\(16\)/);
  assert.match(mobileEvidenceSource, /expected width/);
});

test("release readiness checks generated curated beginner guidance data", () => {
  assert.match(curatedGuidanceSource, /CURATED_JIPBAB_RECIPES/);
  assert.match(curatedGuidanceSource, /beginnerSummary/);
  assert.match(curatedGuidanceSource, /measurementTips/);
  assert.match(curatedGuidanceSource, /beginnerTip/);
  assert.match(curatedGuidanceSource, /visualCue/);
  assert.match(releaseReadinessSource, /check-curated-beginner-guidance\.mjs/);
  assert.match(releaseReadinessSource, /--experimental-strip-types/);
});

test("curated beginner guidance command passes against generated recipe data", () => {
  const output = execFileSync("node", ["--experimental-strip-types", "scripts/check-curated-beginner-guidance.mjs"], {
    encoding: "utf8",
  });

  assert.match(output, /Curated beginner guidance check/);
  assert.match(output, /PASS - \d+ curated recipes include beginner summary/);
});

test("beginner goal readiness command passes against the current local implementation", () => {
  const output = execFileSync("node", ["--experimental-strip-types", "scripts/check-beginner-goal-readiness.mjs"], {
    encoding: "utf8",
  });

  assert.match(output, /Beginner goal readiness check/);
  assert.match(output, /Failures: 0/);
  assert.match(output, /PASS - 사용자 지정 기본 100개 후보 전체 포함/);
  assert.match(output, /PASS - 홈 초보자 추천\/상태\/섹션 연결/);
  assert.match(output, /PASS - 레시피 목록\/검색\/필터\/정렬 연결/);
});
