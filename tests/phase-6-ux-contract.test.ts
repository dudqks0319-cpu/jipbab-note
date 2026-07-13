import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("starter and cook flows expose stable selectors instead of marketing copy", () => {
  const starter = source("components/home/StarterActionCard.tsx");
  const cookMode = source("components/recipe/RecipeCookMode.tsx");

  assert.match(starter, /data-testid={`starter-ingredient-/);
  assert.match(starter, /data-testid="starter-submit"/);
  assert.match(cookMode, /data-testid="recipe-start-cooking"/);
  assert.match(cookMode, /data-testid="cook-next-step"/);
  assert.match(cookMode, /data-testid="cook-timer-toggle"/);
  assert.match(cookMode, /completedEventRef\.current = Boolean\(saved\.completedAt\)/);
});

test("recipe list keeps three primary filters and moves secondary tools later", () => {
  const recipePage = source("app/recipe/page.tsx");
  const labels = source("lib/recipe-list-labels.ts");

  assert.match(labels, /10분 이내/);
  assert.match(labels, /지금 바로 가능/);
  assert.match(labels, /재료 5개 이하/);
  assert.ok(recipePage.indexOf("레시피 검색") < recipePage.indexOf("주간 식단"));
  assert.ok(recipePage.indexOf("주간 식단") > recipePage.indexOf("filteredRecipes.map"));
});

test("shopping prioritizes the user's list and uses platform-neutral language", () => {
  const shoppingPage = source("app/shopping/page.tsx");

  assert.doesNotMatch(shoppingPage, /로켓프레시식 카테고리/);
  assert.doesNotMatch(shoppingPage, /외부 쇼핑 링크는 Safari에서/);
  assert.match(shoppingPage, /외부 구매 링크는 새 브라우저 화면에서 열려요/);
  assert.ok(shoppingPage.indexOf("내 장보기") < shoppingPage.indexOf("재료 찾아 담기"));
  assert.match(shoppingPage, /data-testid="shopping-quick-input"/);
  assert.match(shoppingPage, /data-testid="shopping-quick-submit"/);
  assert.doesNotMatch(shoppingPage, /바로 사기/);
});

test("metadata states the product promise without claiming completed human review", () => {
  const layout = source("app/layout.tsx");
  const globalStyles = source("app/globals.css");

  assert.match(layout, /집밥노트 \| 냉장고 재료로 찾는 초보 집밥 레시피/);
  assert.match(layout, /부족한 재료 확인부터 장보기, 단계별 조리까지/);
  assert.match(layout, /metadataBase/);
  assert.doesNotMatch(layout, /초보자 검수 완료/);
  assert.doesNotMatch(layout, /cdn\.jsdelivr\.net/);
  assert.match(globalStyles, /Apple SD Gothic Neo/);
});
