import assert from "node:assert/strict";
import test from "node:test";

import {
  getIngredientCatalog,
  getIngredientCatalogByCategory,
  searchIngredientCatalog,
} from "../lib/ingredient-catalog.ts";
import {
  getIngredientCategoryDisplayLabel,
  normalizeLegacyIngredientCategory,
  normalizeIngredientInput,
  suggestIngredientCategory,
} from "../lib/ingredient-category.ts";
import { getIngredientPhotoUrl } from "../lib/utils.ts";

test("returns many curated items for frozen foods", () => {
  const items = getIngredientCatalogByCategory("냉동식품");

  assert.ok(items.length >= 12);
  assert.ok(items.some((item) => item.name === "냉동만두"));
  assert.ok(items.some((item) => item.name === "냉동새우"));
});

test("ingredient catalog has broad first-batch competitive coverage", () => {
  const items = getIngredientCatalog();

  assert.ok(items.length >= 160);
  assert.ok(items.some((item) => item.name === "고추" && item.aliases?.includes("청양고추")));
  assert.ok(items.some((item) => item.name === "맛술" && item.aliases?.includes("미림")));
  assert.ok(items.some((item) => item.name === "당면"));
  assert.ok(items.some((item) => item.name === "토마토캔"));
});

test("search matches aliases as well as direct names", () => {
  const items = searchIngredientCatalog({
    category: "조미료",
    query: "간장",
    limit: 20,
  });

  assert.ok(items.some((item) => item.name === "진간장"));
  assert.ok(items.some((item) => item.name === "국간장"));
});

test("search can find a direct-input escape hatch candidate by keyword miss", () => {
  const items = searchIngredientCatalog({
    category: "채소",
    query: "방울",
    limit: 20,
  });

  assert.ok(items.some((item) => item.name === "방울토마토"));
});

test("ingredient photos avoid misleading generic fallbacks for common confusing items", () => {
  assert.equal(getIngredientPhotoUrl("밥", "냉동식품"), "/images/ingredients/cooked-rice-shop.png");
  assert.equal(getIngredientPhotoUrl("즉석밥", "냉동식품"), "/images/ingredients/cooked-rice-shop.png");
  assert.equal(getIngredientPhotoUrl("쌀", "곡물/면/빵"), "/images/ingredients/rice-bag-shop.png");
  assert.equal(getIngredientPhotoUrl("파", "채소"), "/images/ingredients/green-onion-shop.png");
  assert.equal(getIngredientPhotoUrl("양파", "채소"), "/images/ingredients/onion-shop.png");
  assert.equal(getIngredientPhotoUrl("파프리카", "채소"), "/images/ingredients/paprika-shop.png");
  assert.equal(getIngredientPhotoUrl("닭고기", "육류"), "/images/ingredients/chicken-raw-photo.png");
  assert.equal(getIngredientPhotoUrl("참치", "수산물"), "/images/ingredients/tuna-raw-photo.png");
  assert.equal(getIngredientPhotoUrl("문어", "수산물"), "/images/ingredients/octopus-photo.png");
  assert.equal(getIngredientPhotoUrl("냉동야채믹스", "냉동식품"), "/images/ingredients/frozen-vegetable-mix-photo.png");
  assert.equal(getIngredientPhotoUrl("들기름", "조미료"), "/images/ingredients/perilla-oil-photo.png");
  assert.equal(getIngredientPhotoUrl("쌈장", "조미료"), "/images/ingredients/ssamjang-photo.png");
});

test("ingredient photo matching uses exact and explicit alias matches without substring fallback", () => {
  assert.equal(getIngredientPhotoUrl("파", "채소"), "/images/ingredients/green-onion-shop.png");
  assert.equal(getIngredientPhotoUrl("대파", "채소"), "/images/ingredients/green-onion-shop.png");
  assert.equal(getIngredientPhotoUrl("파스타", "곡물/면/빵"), "/images/ingredients/spaghetti-shop.png");
  assert.equal(getIngredientPhotoUrl("파스타면", "곡물/면/빵"), "/images/ingredients/spaghetti-shop.png");
  assert.equal(getIngredientPhotoUrl("파인애플", "과일"), "/images/ingredients/pineapple-shop.png");
  assert.notEqual(getIngredientPhotoUrl("파스타샐러드", "곡물/면/빵"), "/images/ingredients/green-onion-shop.png");
});

test("ingredient photos cover App Store QA aliases without dumpling or water fallbacks", () => {
  assert.equal(getIngredientPhotoUrl("옥수수캔", "통조림/가공식품"), "/images/ingredients/corn-can-shop.png");
  assert.equal(getIngredientPhotoUrl("통조림 옥수수", "통조림/가공식품"), "/images/ingredients/corn-can-shop.png");
  assert.equal(getIngredientPhotoUrl("옥수수", "통조림/가공식품"), "/images/ingredients/corn-can-shop.png");
  assert.equal(getIngredientPhotoUrl("냉동볶음밥", "냉동식품"), "/images/ingredients/frozen-fried-rice-photo.png");
  assert.equal(getIngredientPhotoUrl("냉동피자", "냉동식품"), "/images/ingredients/frozen-pizza-photo.png");
  assert.equal(getIngredientPhotoUrl("냉동돈까스", "냉동식품"), "/images/ingredients/frozen-donkatsu-photo.png");
  assert.equal(getIngredientPhotoUrl("냉동감자튀김", "냉동식품"), "/images/ingredients/frozen-fries-photo.png");
  assert.equal(getIngredientPhotoUrl("커피", "음료/기타"), "/images/ingredients/coffee-beans-photo.png");
  assert.equal(getIngredientPhotoUrl("원두커피", "음료/기타"), "/images/ingredients/coffee-beans-photo.png");
  assert.equal(getIngredientPhotoUrl("코코아가루", "음료/기타"), "/images/ingredients/cocoa-powder-photo.png");
  assert.equal(getIngredientPhotoUrl("올리고당", "음료/기타"), "/images/ingredients/oligosaccharide-syrup-photo.png");
});

test("ingredient photos tolerate amounts and harmless descriptors without substring matching", () => {
  assert.equal(getIngredientPhotoUrl("대파 조금", "채소"), "/images/ingredients/green-onion-shop.png");
  assert.equal(getIngredientPhotoUrl("냉동피자 1판", "냉동식품"), "/images/ingredients/frozen-pizza-photo.png");
  assert.equal(getIngredientPhotoUrl("사과 2개", "과일"), "/images/ingredients/apple-shop.png");
  assert.equal(getIngredientPhotoUrl("돼지고기 목살", "육류"), "/images/ingredients/pork-shop.png");
  assert.equal(getIngredientPhotoUrl("코코아가루 작은 봉지", "음료/기타"), "/images/ingredients/cocoa-powder-photo.png");
  assert.notEqual(getIngredientPhotoUrl("파스타샐러드", "곡물/면/빵"), "/images/ingredients/green-onion-shop.png");
});

test("ingredient category suggestion uses catalog names and aliases", () => {
  assert.equal(suggestIngredientCategory("사과", "채소"), "과일");
  assert.equal(suggestIngredientCategory("양조간장", "채소"), "조미료");
  assert.equal(suggestIngredientCategory("목살", "채소"), "육류");
  assert.equal(suggestIngredientCategory("모르는재료", "채소"), "채소");
});

test("ingredient input normalization trims whitespace and conservative trailing jamo", () => {
  assert.equal(normalizeIngredientInput("  테스트재료ㅍ  "), "테스트재료");
  assert.equal(normalizeIngredientInput("청양 고추"), "청양 고추");
  assert.equal(normalizeIngredientInput("ㅋㅋ"), "ㅋㅋ");
});

test("repairs only known legacy dairy misclassifications", () => {
  assert.equal(normalizeLegacyIngredientCategory("계란", "유제품"), "육류");
  assert.equal(normalizeLegacyIngredientCategory("달걀", "유제품"), "육류");
  assert.equal(normalizeLegacyIngredientCategory("두부", "유제품"), "통조림/가공식품");
  assert.equal(normalizeLegacyIngredientCategory("우유", "유제품"), "유제품");
  assert.equal(normalizeLegacyIngredientCategory("계란", "수산물"), "육류");
  assert.equal(normalizeLegacyIngredientCategory("두부", "채소"), "통조림/가공식품");
});

test("ingredient category labels describe egg and tofu without changing canonical storage values", () => {
  assert.equal(getIngredientCategoryDisplayLabel("계란", "육류"), "계란·난류");
  assert.equal(getIngredientCategoryDisplayLabel("달걀", "육류"), "계란·난류");
  assert.equal(getIngredientCategoryDisplayLabel("두부", "통조림/가공식품"), "콩·두부");
  assert.equal(getIngredientCategoryDisplayLabel("돼지고기", "육류"), "육류");
  assert.equal(getIngredientCategoryDisplayLabel("참치캔", "통조림/가공식품"), "통조림/가공식품");
  assert.equal(getIngredientCategoryDisplayLabel("직접입력", null), "기타");
});
