import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const homePage = readFileSync("app/page.tsx", "utf8");

test("home keeps recipe publication fail-closed without legacy fallbacks", () => {
  assert.match(homePage, /useRecipeCatalog\(12,/);
  assert.match(homePage, /filterPublicationApprovedRecipes/);
  assert.doesNotMatch(homePage, /APPSTORE_DEMO_RECIPES\s*:\s*recipeCatalog\s*\|\|/);
});

test("home waits for resolved non-empty ingredients before requesting recommendations", () => {
  assert.match(
    homePage,
    /enabled:\s*demoModeReady\s*&&\s*!isAppStoreDemo\s*&&\s*!ingredientsLoading\s*&&\s*activeDisplayIngredients\.length\s*>\s*0/,
  );
});

test("home renders one safe recovery state instead of duplicate raw sync errors", () => {
  assert.match(homePage, /const homeRecoveryKind/);
  assert.match(homePage, /const hasRecipePreview = previewRecipes\.length > 0/);
  assert.match(homePage, /recipesError && !hasPublishedRecipes && !hasRecipePreview/);
  assert.match(homePage, /<HomeRecoveryCard/);
  assert.match(homePage, /role="alert"/);
  assert.match(homePage, /메뉴 추천을 불러오지 못했어요/);
  assert.match(homePage, /냉장고 재료는 그대로예요\. 잠시 후 다시 시도해 주세요\./);
  assert.match(homePage, /냉장고를 불러오지 못했어요/);
  assert.match(homePage, /입력한 재료는 변경되지 않았어요\. 잠시 후 다시 시도해 주세요\./);
  assert.doesNotMatch(homePage, /syncErrorMessage/);
  assert.doesNotMatch(homePage, /동기화가 지연되고 있어요/);
});

test("home shows the safe recipe preview instead of a blocking API error", () => {
  assert.match(homePage, /<RecipePublicationEmptyCard previewRecipe=\{previewRecipes\[0\] \?\? null\}/);
  assert.match(homePage, /레시피를 먼저 둘러볼 수 있어요/);
  assert.match(homePage, /previewRecipes\.length > 0/);
  assert.match(homePage, /const visibleRecipeCount = hasPublishedRecipes[\s\S]{0,120}RECIPE_PREVIEW_CATALOG\.length/);
  assert.match(homePage, /label="메뉴" value=\{`\$\{visibleRecipeCount\}개`\}/);
});

test("home recovery prevents parallel retries and keeps one clear action label", () => {
  assert.match(homePage, /disabled=\{isRetrying\}/);
  assert.match(homePage, /isRetrying\s*\?\s*'다시 시도 중'\s*:\s*'다시 시도'/);
});
