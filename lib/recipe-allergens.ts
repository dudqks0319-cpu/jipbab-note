// 이 파일은 추천 하드 필터에서 사용하는 구조화 알레르기 분류를 정의합니다.

export const RECIPE_ALLERGEN_OPTIONS = [
  { id: "eggs", label: "난류" },
  { id: "milk", label: "우유" },
  { id: "buckwheat", label: "메밀" },
  { id: "peanut", label: "땅콩" },
  { id: "soy", label: "대두" },
  { id: "wheat", label: "밀" },
  { id: "mackerel", label: "고등어" },
  { id: "crab", label: "게" },
  { id: "shrimp", label: "새우" },
  { id: "pork", label: "돼지고기" },
  { id: "peach", label: "복숭아" },
  { id: "tomato", label: "토마토" },
  { id: "sulfites", label: "아황산류" },
  { id: "walnut", label: "호두" },
  { id: "chicken", label: "닭고기" },
  { id: "beef", label: "쇠고기" },
  { id: "squid", label: "오징어" },
  { id: "shellfish", label: "조개류" },
  { id: "pine-nut", label: "잣" },
] as const;

export type RecipeAllergenId = (typeof RECIPE_ALLERGEN_OPTIONS)[number]["id"];

const RECIPE_ALLERGEN_IDS = new Set<string>(
  RECIPE_ALLERGEN_OPTIONS.map((option) => option.id),
);

export function isRecipeAllergenId(value: unknown): value is RecipeAllergenId {
  return typeof value === "string" && RECIPE_ALLERGEN_IDS.has(value);
}

export function parseRecipeAllergenIds(value: unknown, maximum = RECIPE_ALLERGEN_OPTIONS.length): RecipeAllergenId[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > maximum) {
    throw new Error("invalid_allergen_id_list");
  }

  const normalized = value.map((item) =>
    typeof item === "string" ? item.trim().toLowerCase() : "",
  );
  if (normalized.some((item) => !isRecipeAllergenId(item))) {
    throw new Error("invalid_allergen_id");
  }
  return [...new Set(normalized)] as RecipeAllergenId[];
}
