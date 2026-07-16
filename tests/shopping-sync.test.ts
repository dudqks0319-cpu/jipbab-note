import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { mergeShoppingItems } from "../lib/shopping-sync.ts";
import type { ShoppingItem } from "../types/index.ts";

function shoppingItem(overrides: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    id: "shopping-1",
    deviceId: "device-1",
    userId: null,
    name: "두부",
    quantity: "1모",
    category: "유제품",
    checked: false,
    sourceRecipeId: null,
    sourceRecipeName: null,
    createdAt: "2026-05-18T00:00:00.000Z",
    updatedAt: "2026-05-18T00:00:00.000Z",
    ...overrides,
  };
}

test("keeps local-only shopping items when remote query returns no rows", () => {
  const merged = mergeShoppingItems(
    [shoppingItem({ id: "local-1", name: "계란" })],
    [],
  );

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.name, "계란");
});

test("prefers the newer remote shopping item for the same id", () => {
  const merged = mergeShoppingItems(
    [shoppingItem({ id: "shared", checked: false, updatedAt: "2026-05-18T00:00:00.000Z" })],
    [shoppingItem({ id: "shared", checked: true, updatedAt: "2026-05-19T00:00:00.000Z" })],
  );

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.checked, true);
});

test("sorts merged shopping items by newest update first", () => {
  const merged = mergeShoppingItems(
    [shoppingItem({ id: "old", name: "양파", updatedAt: "2026-05-18T00:00:00.000Z" })],
    [shoppingItem({ id: "new", name: "대파", updatedAt: "2026-05-19T00:00:00.000Z" })],
  );

  assert.deepEqual(merged.map((item) => item.id), ["new", "old"]);
});

test("shopping page exposes direct add, quick chips, duplicate merge, and fridge options", () => {
  const pageSource = readFileSync(new URL("../app/shopping/page.tsx", import.meta.url), "utf8");
  const hookSource = readFileSync(new URL("../hooks/useShopping.ts", import.meta.url), "utf8");

  assert.match(pageSource, /\+ 직접 추가/);
  assert.match(pageSource, /QUICK_SHOPPING_CHIPS/);
  assert.match(pageSource, /이미 장보기 목록에 있어요/);
  assert.match(pageSource, /INGREDIENT_STORAGE_TYPES/);
  assert.match(pageSource, /EXPIRY_PRESETS/);
  assert.match(hookSource, /mergeDuplicates/);
  assert.match(hookSource, /mergeQuantityDisplay/);
});

test("shopping page exposes category catalog adds and purchase links", () => {
  const pageSource = readFileSync(new URL("../app/shopping/page.tsx", import.meta.url), "utf8");

  assert.match(pageSource, /SHOPPING_CATALOG_GROUPS/);
  assert.match(pageSource, /id: 'all'/);
  assert.match(pageSource, /getIngredientCatalog/);
  assert.match(pageSource, /재료 찾아 담기/);
  assert.doesNotMatch(pageSource, /로켓프레시식/);
  assert.doesNotMatch(pageSource, /Safari에서 여세요/);
  assert.match(pageSource, /getShoppingCatalogSubcategoryItems/);
  assert.match(pageSource, /setSelectedCatalogSubcategoryId\('all'\)/);
  assert.match(pageSource, /상추\/쌈채소/);
  assert.match(pageSource, /시금치\/나물/);
  assert.match(pageSource, /냉동\/간편/);
  assert.match(pageSource, /ShoppingCatalogCard/);
  assert.match(pageSource, /duplicateMode: 'merge'/);
  assert.match(pageSource, /getCoupangPurchaseLink\(\{ name: item\.name, category: item\.category \}/);
  assert.match(pageSource, /쿠팡 링크/);
});

test("shopping page prioritizes the user's list before quick add and a collapsed catalog", () => {
  const pageSource = readFileSync(new URL("../app/shopping/page.tsx", import.meta.url), "utf8");
  const catalogSource = readFileSync(new URL("../lib/ingredient-catalog.ts", import.meta.url), "utf8");

  const listIndex = pageSource.indexOf('data-testid="shopping-list-section"');
  const quickAddIndex = pageSource.indexOf('data-testid="shopping-quick-add-section"');
  const catalogIndex = pageSource.indexOf('data-testid="shopping-catalog-section"');

  assert.ok(listIndex >= 0);
  assert.ok(quickAddIndex > listIndex);
  assert.ok(catalogIndex > quickAddIndex);
  assert.match(pageSource, /const \[showCatalog, setShowCatalog\] = useState\(false\)/);
  assert.match(pageSource, /aria-expanded=\{showCatalog\}/);
  assert.match(pageSource, /외부 구매 링크는 새 브라우저 화면에서 열려요/);
  assert.match(pageSource, /지금 이 기기에 저장했어요/);
  assert.match(pageSource, /로그인되어 있고 인터넷이 연결되면 자동으로 동기화돼요/);
  assert.match(pageSource, /로그인되어 있고 인터넷이 연결되면 자동으로 다시 동기화해요/);
  assert.doesNotMatch(pageSource, /네트워크가 연결되면 자동으로 다시 저장해요/);
  assert.doesNotMatch(pageSource, /로그인하면 클라우드에 동기화됩니다/);
  assert.match(pageSource, /name: '계란', quantity: '10개', category: '육류'/);
  assert.match(pageSource, /name: '두부', quantity: '1모', category: '통조림\/가공식품'/);
  assert.match(catalogSource, /id: "dairy-egg", category: "육류", name: "계란"/);
  assert.match(catalogSource, /id: "dairy-tofu", category: "통조림\/가공식품", name: "두부"/);
});

test("recipe shopping assistant supports scoped and selective missing ingredient adds", () => {
  const assistantSource = readFileSync(new URL("../components/recipe/RecipeShoppingAssistant.tsx", import.meta.url), "utf8");
  const shoppingPageSource = readFileSync(new URL("../app/shopping/page.tsx", import.meta.url), "utf8");

  assert.match(assistantSource, /useFamilyShare/);
  assert.match(assistantSource, /selectedMissingNames/);
  assert.match(assistantSource, /requiredIngredientNames/);
  assert.match(assistantSource, /required !== false/);
  assert.match(assistantSource, /scope: activeScope/);
  assert.match(assistantSource, /familyGroupId/);
  assert.match(assistantSource, /가족 장보기/);
  assert.match(assistantSource, /이미 담긴 항목/);
  assert.match(assistantSource, /필수 부족 재료/);
  assert.match(assistantSource, /대체:/);
  assert.match(shoppingPageSource, /useFamilyShare/);
  assert.match(shoppingPageSource, /내 장보기/);
  assert.match(shoppingPageSource, /가족 장보기/);
  assert.match(shoppingPageSource, /scope: activeScope/);
});
