import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { RECIPE_PREVIEW_CATALOG, findRecipePreview } from "../lib/recipe-preview.ts";

test("preview catalog exposes only original structured recipes with local images", () => {
  assert.equal(RECIPE_PREVIEW_CATALOG.length, 20);
  assert.equal(new Set(RECIPE_PREVIEW_CATALOG.map((recipe) => recipe.id)).size, 20);

  for (const recipe of RECIPE_PREVIEW_CATALOG) {
    assert.equal(recipe.source?.sourceName, "집밥노트 자체 작성");
    assert.equal(recipe.source?.imageUsageAllowed, true);
    assert.ok(recipe.thumbnailUrl?.startsWith("/images/recipes/"));
    assert.ok(existsSync(`public${recipe.thumbnailUrl}`), recipe.name);
    assert.ok((recipe.ingredientDetails?.length ?? 0) >= 3, recipe.name);
    assert.ok(recipe.steps.length >= 3, recipe.name);
    assert.equal(recipe.publicationEvidence, undefined);
    assert.equal(findRecipePreview(recipe.id)?.name, recipe.name);
  }
});

test("preview ingredient metadata keeps required state separate from preparation guidance", () => {
  for (const recipe of RECIPE_PREVIEW_CATALOG) {
    for (const ingredient of recipe.ingredientDetails ?? []) {
      assert.equal(typeof ingredient.required, "boolean", `${recipe.name}: ${ingredient.name}`);
      assert.ok(ingredient.beginnerNote, `${recipe.name}: ${ingredient.name}`);
      assert.doesNotMatch(
        ingredient.prepNote ?? "",
        /필수 재료입니다|있으면 더 좋아요/,
        `${recipe.name}: ${ingredient.name}`,
      );
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
  assert.doesNotMatch(detail, /RecipeCookMode|RecipeShoppingAssistant|RecipeFavoriteButton/);
});

test("preview list prioritizes recipe discovery over inactive or secondary controls", () => {
  const list = readFileSync("app/recipe/page.tsx", "utf8");

  assert.match(list, /지금 볼 수 있는 레시피 \$\{RECIPE_PREVIEW_CATALOG\.length\}개/);
  assert.doesNotMatch(list, /공개 승인 0개/);
  assert.match(list, /먼저 둘러볼 수 있는 쉬운 집밥이에요/);
  assert.match(list, /실제 조리 검수가 끝날 때까지 장보기와 조리 시작은 잠겨 있어요/);
  assert.match(list, /<Eye size=\{11\} \/> 조리 검수 중/);
  assert.match(list, /\{!previewMode \? \(\s*<section className="px-5 pt-3">/);
  assert.match(list, /\{!previewMode && totalPages > 1 \? \(\s*<section/);
  assert.ok(
    list.indexOf('placeholder="레시피 검색"') < list.indexOf('id="recipe-more-tools"'),
    "secondary recipe tools must stay below the primary discovery controls",
  );
  assert.match(list, /\{!previewMode \? \(\s*<button[\s\S]*?<Heart size=\{14\}/);
  assert.match(list, /RECIPE_PREVIEW_CATALOG\.length\}개 레시피를 다시 볼 수 있어요/);
});

test("preview search stays visible while the approved catalog refreshes", () => {
  const list = readFileSync("app/recipe/page.tsx", "utf8");

  assert.match(list, /!isAppStoreDemo\s*&&\s*visibleTotalCount\s*===\s*0/);
  assert.match(list, /loading\s*&&\s*!previewMode/);
});
