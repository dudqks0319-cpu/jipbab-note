import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { RECIPE_PREVIEW_CATALOG, findRecipePreview } from "../lib/recipe-preview.ts";

test("preview catalog exposes only original structured recipes with local images", () => {
  const expectedTitles = [
    "버터간장계란밥",
    "김치볶음밥",
    "참치마요덮밥",
    "햄야채볶음밥",
    "스팸마요덮밥",
    "간장버터밥",
    "참치주먹밥",
    "두부부침",
    "두부조림",
    "어묵볶음",
  ];

  assert.deepEqual(RECIPE_PREVIEW_CATALOG.map((recipe) => recipe.name), expectedTitles);
  assert.equal(new Set(RECIPE_PREVIEW_CATALOG.map((recipe) => recipe.id)).size, expectedTitles.length);

  for (const recipe of RECIPE_PREVIEW_CATALOG) {
    assert.equal(recipe.source?.sourceName, "집밥노트 자체 작성");
    assert.equal(recipe.source?.imageUsageAllowed, true);
    assert.ok(recipe.thumbnailUrl?.startsWith("/images/recipes/"));
    assert.ok(existsSync(`public${recipe.thumbnailUrl}`), recipe.name);
    assert.ok((recipe.ingredientDetails?.length ?? 0) >= 3, recipe.name);
    assert.ok(recipe.steps.length >= 3, recipe.name);
    for (const step of recipe.steps) {
      assert.ok(step.commonMistake, `${recipe.name} ${step.index}단계 실수 주의`);
      assert.ok(step.rescueTip, `${recipe.name} ${step.index}단계 복구 방법`);
      assert.notEqual(
        step.beginnerTip,
        step.commonMistake,
        `${recipe.name} ${step.index}단계 실수 문구를 초보 팁으로 중복 표시하면 안 됩니다.`,
      );
    }
    assert.equal(recipe.publicationEvidence, undefined);
    assert.equal(findRecipePreview(recipe.id)?.name, recipe.name);
  }
});

test("preview ingredient metadata keeps required state separate from preparation guidance", () => {
  const optionalGuidance = /생략|없어도|선택/;

  for (const recipe of RECIPE_PREVIEW_CATALOG) {
    for (const ingredient of recipe.ingredientDetails ?? []) {
      assert.equal(typeof ingredient.required, "boolean", `${recipe.name}: ${ingredient.name}`);
      assert.ok(ingredient.beginnerNote, `${recipe.name}: ${ingredient.name}`);
      assert.doesNotMatch(
        ingredient.prepNote ?? "",
        /필수 재료입니다|있으면 더 좋아요/,
        `${recipe.name}: ${ingredient.name}`,
      );
      if (optionalGuidance.test([ingredient.beginnerNote, ingredient.prepNote].filter(Boolean).join(" "))) {
        assert.equal(
          ingredient.required,
          false,
          `${recipe.name}: ${ingredient.name} is described as optional`,
        );
      }
    }
  }
});

test("preview surface is explicit and cannot start cooking or shopping", () => {
  const home = readFileSync("app/page.tsx", "utf8");
  const list = readFileSync("app/recipe/page.tsx", "utf8");
  const detail = readFileSync("app/recipe/preview/[id]/page.tsx", "utf8");

  assert.match(home, /RECIPE_PREVIEW_CATALOG/);
  assert.match(list, /RECIPE_PREVIEW_CATALOG/);
  assert.match(list, /\/recipe\/preview\//);
  assert.match(detail, /검수 중 미리보기/);
  assert.match(detail, /아직 조리 승인 전이에요/);
  assert.match(detail, /필수 재료/);
  assert.match(detail, /선택 재료/);
  assert.match(detail, /준비 팁:/);
  assert.match(detail, /대체:/);
  assert.match(detail, /RecipeShareButton/);
  assert.match(detail, /route="preview"/);
  assert.match(detail, /요리 전에 준비해요/);
  assert.match(detail, /계량법 보기/);
  assert.match(detail, /보관/);
  assert.match(detail, /다시 데우기/);
  assert.match(detail, /레시피 작성 및 검수 상태/);
  assert.match(detail, /실제 조리 검수/);
  assert.match(detail, /식품 안전 검수/);
  assert.doesNotMatch(detail, /RecipeCookMode|RecipeShoppingAssistant|RecipeFavoriteButton|RecipeComments/);
});

test("preview list prioritizes recipe discovery over inactive or secondary controls", () => {
  const list = readFileSync("app/recipe/page.tsx", "utf8");

  assert.match(list, /지금 볼 수 있는 레시피 \$\{RECIPE_PREVIEW_CATALOG\.length\}개/);
  assert.doesNotMatch(list, /공개 승인 0개/);
  assert.match(list, /먼저 둘러볼 수 있는 쉬운 집밥이에요/);
  assert.match(list, /실제 조리 검수가 끝날 때까지 장보기와 조리 시작은 잠겨 있어요/);
  assert.match(list, /검색 결과 \{filteredPreviewRecipes\.length\}개/);
  assert.match(list, /\{recipe\.steps\.length\}단계/);
  assert.match(list, /\{recipe\.requiredTools\?\.length \?\? 0\}개/);
  assert.match(list, /\{!previewMode \? \(\s*<section className="px-5 pt-3">/);
  assert.match(list, /\{!previewMode && totalPages > 1 \? \(\s*<section/);
  assert.ok(
    list.indexOf('placeholder="레시피 검색"') < list.indexOf('id="recipe-more-tools"'),
    "secondary recipe tools must stay below the primary discovery controls",
  );
  assert.match(list, /\{!previewMode \? \(\s*<button[\s\S]*?<Heart size=\{14\}/);
  assert.match(list, /RECIPE_PREVIEW_CATALOG\.length\}개 레시피를 다시 볼 수 있어요/);
});

test("recipe instructions expose mistakes and recovery separately", () => {
  const instructions = readFileSync("components/recipe/RecipeInstructionView.tsx", "utf8");

  assert.match(instructions, /실수 주의:/);
  assert.match(instructions, /복구 방법:/);
  assert.match(instructions, /step\.beginnerTip !== step\.commonMistake/);
});

test("preview search stays visible while the approved catalog refreshes", () => {
  const list = readFileSync("app/recipe/page.tsx", "utf8");

  assert.match(list, /!isAppStoreDemo\s*&&\s*visibleTotalCount\s*===\s*0/);
  assert.match(list, /loading\s*&&\s*!previewMode/);
});
