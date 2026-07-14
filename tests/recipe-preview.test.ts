import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { RECIPE_PREVIEW_CATALOG, findRecipePreview } from "../lib/recipe-preview.ts";

test("preview catalog exposes only original structured recipes with local images", () => {
  assert.equal(RECIPE_PREVIEW_CATALOG.length, 8);

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

test("preview surface is explicit and cannot start cooking, shopping, or favorites", () => {
  const home = readFileSync("app/page.tsx", "utf8");
  const list = readFileSync("app/recipe/page.tsx", "utf8");
  const detail = readFileSync("app/recipe/preview/[id]/page.tsx", "utf8");

  assert.match(home, /RECIPE_PREVIEW_CATALOG/);
  assert.match(list, /RECIPE_PREVIEW_CATALOG/);
  assert.match(list, /\/recipe\/preview\//);
  assert.ok(
    list.indexOf(") : publicationEmpty ? (") < list.indexOf(") : error && !isAppStoreDemo ? ("),
    "the safe preview must remain visible when the recipe API is unavailable",
  );
  assert.match(detail, /검수 중 미리보기/);
  assert.match(detail, /아직 조리 승인 전이에요/);
  assert.match(detail, /index:\s*false/);
  assert.doesNotMatch(detail, /RecipeCookMode|RecipeShoppingAssistant|RecipeFavoriteButton/);
});
