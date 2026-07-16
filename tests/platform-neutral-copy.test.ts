import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("recipe external-link guidance works across web, iOS, and Android", () => {
  const exploreLinks = readFileSync("components/recipe/RecipeExploreLinks.tsx", "utf8");
  const importedRecipes = readFileSync("app/recipe/import/page.tsx", "utf8");

  assert.match(exploreLinks, /외부 페이지는 새 브라우저 화면에서 열립니다/);
  assert.match(importedRecipes, /새 화면에서 열기/);
  assert.doesNotMatch(`${exploreLinks}\n${importedRecipes}`, /Safari에서/);
});
