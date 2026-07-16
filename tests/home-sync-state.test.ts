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

test("home exposes recipe previews before the user has saved fridge ingredients", () => {
  assert.match(homePage, /const shouldShowEmptyHome = isEmptyFridge/);
  assert.match(homePage, /<StarterActionCard[\s\S]*<section className="space-y-5 px-5 pt-5">/);
  assert.doesNotMatch(
    homePage,
    /\{!shouldShowEmptyHome \? \(\s*<section className="space-y-5 px-5 pt-5">/,
  );
  assert.match(homePage, /<h2 className="text-\[16px\] font-black text-\[#2f2117\]">먼저 보는 레시피<\/h2>/);
});

test("home prefers safe recipe previews over loading skeletons", () => {
  assert.match(
    homePage,
    /!hasPublishedRecipes\s*&&\s*\(hasRecipePreview\s*\|\|\s*!isLoading\)/,
  );
  assert.match(
    homePage,
    /homeRecipeSections\.length === 0 \? \(\s*previewRecipes\.length > 0 \? \(/,
  );

  const previewBranchIndex = homePage.indexOf(
    'homeRecipeSections.length === 0 ? (',
  );
  const loadingFallbackIndex = homePage.indexOf(
    'isLoading && recommendedRecipes.length === 0 ? (',
    previewBranchIndex,
  );

  assert.ok(previewBranchIndex >= 0, "preview branch must exist");
  assert.ok(loadingFallbackIndex > previewBranchIndex, "loading skeleton must remain a fallback after safe previews");
});

test("home prioritizes recipe discovery before the full fridge visualization", () => {
  const recipeSectionIndex = homePage.indexOf(
    '<section className="space-y-5 px-5 pt-5">',
  );
  const fridgeSectionIndex = homePage.indexOf(
    '<p className="text-[12px] font-black text-[#2f2117]">냉장고에 있는 재료</p>',
  );

  assert.ok(recipeSectionIndex >= 0, "recipe discovery section must exist");
  assert.ok(fridgeSectionIndex >= 0, "fridge summary section must exist");
  assert.ok(
    recipeSectionIndex < fridgeSectionIndex,
    "recipe discovery must render before the full fridge visualization",
  );
});

test("home recipe cards use plain-language difficulty instead of a rating star", () => {
  assert.doesNotMatch(homePage, /<Star(?:\s|>)/);
  assert.match(homePage, /<ChefHat size=\{13\}/);
  assert.match(homePage, /formatHomeDifficulty\(recipe\.difficultyLevel\)/);
  assert.match(homePage, /return '난이도 쉬움'/);
  assert.match(homePage, /return '난이도 보통'/);
  assert.match(homePage, /return '난이도 어려움'/);
});

test("home recipe cards keep core preview information readable", () => {
  assert.match(homePage, /min-h-10 text-\[14px\] font-black leading-5/);
  assert.match(homePage, /text-\[12px\] font-bold text-\[#7d6d5f\]/);
  assert.match(homePage, /text-\[12px\] font-black text-\[#d94d19\]">조리 검수 중/);
  assert.match(homePage, /집밥노트가 직접 작성한 레시피예요/);
  assert.match(homePage, /실제 조리 검수가 끝날 때까지 추천과 조리 시작은 잠겨 있어요/);
});

test("home recovery prevents parallel retries and keeps one clear action label", () => {
  assert.match(homePage, /disabled=\{isRetrying\}/);
  assert.match(homePage, /isRetrying\s*\?\s*'다시 시도 중'\s*:\s*'다시 시도'/);
});
