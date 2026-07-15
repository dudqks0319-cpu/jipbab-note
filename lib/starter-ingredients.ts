// 이 파일은 첫 사용자가 냉장고를 30초 안에 채울 수 있는 기본 재료 세트를 제공합니다.
import type { IngredientFormPayload } from "@/types";

type StarterIngredientTemplate = Omit<IngredientFormPayload, "expiryDate"> & {
  expiryOffsetDays: number;
  reason: string;
};

export const STARTER_INGREDIENT_TEMPLATES: StarterIngredientTemplate[] = [
  {
    name: "계란",
    category: "육류",
    storageType: "냉장",
    quantity: "10개",
    expiryOffsetDays: 10,
    memo: "첫 냉장고 세팅",
    reason: "볶음밥, 계란말이, 국에 바로 쓰는 기본 단백질",
  },
  {
    name: "두부",
    category: "통조림/가공식품",
    storageType: "냉장",
    quantity: "1모",
    expiryOffsetDays: 5,
    memo: "첫 냉장고 세팅",
    reason: "찌개와 조림에 자주 쓰는 집밥 핵심 재료",
  },
  {
    name: "대파",
    category: "채소",
    storageType: "냉장",
    quantity: "1단",
    expiryOffsetDays: 7,
    memo: "첫 냉장고 세팅",
    reason: "국물, 볶음, 양념 베이스에 거의 항상 쓰는 향채",
  },
  {
    name: "김치",
    category: "통조림/가공식품",
    storageType: "냉장",
    quantity: "1팩",
    expiryOffsetDays: 21,
    memo: "첫 냉장고 세팅",
    reason: "찌개, 볶음밥, 전까지 확장되는 한국 집밥 베이스",
  },
  {
    name: "양파",
    category: "채소",
    storageType: "냉장",
    quantity: "2개",
    expiryOffsetDays: 14,
    memo: "첫 냉장고 세팅",
    reason: "볶음과 국물에 단맛을 더하는 가장 대중적인 채소",
  },
  {
    name: "밥",
    category: "곡물/면/빵",
    storageType: "냉장",
    quantity: "1공기",
    expiryOffsetDays: 2,
    memo: "첫 냉장고 세팅",
    reason: "볶음밥과 덮밥으로 바로 이어지는 기본 주식",
  },
  {
    name: "감자",
    category: "채소",
    storageType: "실온",
    quantity: "3개",
    expiryOffsetDays: 14,
    memo: "첫 냉장고 세팅",
    reason: "볶음, 국, 전자레인지 조리에 모두 쓰기 쉬운 재료",
  },
  {
    name: "참치캔",
    category: "통조림/가공식품",
    storageType: "실온",
    quantity: "1캔",
    expiryOffsetDays: 120,
    memo: "첫 냉장고 세팅",
    reason: "김치찌개, 덮밥, 주먹밥에 바로 쓰는 비상 단백질",
  },
];

export const STARTER_INGREDIENT_NAMES = STARTER_INGREDIENT_TEMPLATES.map((item) => item.name);

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildFutureDate(offsetDays: number): string {
  const target = new Date();
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + offsetDays);
  return formatLocalDate(target);
}

export function buildStarterIngredientPayloads(
  existingIngredientNames: string[],
  selectedIngredientNames?: string[],
): IngredientFormPayload[] {
  const existing = new Set(existingIngredientNames.map((name) => name.trim().toLowerCase()));
  const selected = selectedIngredientNames
    ? new Set(selectedIngredientNames.map((name) => name.trim().toLowerCase()).filter(Boolean))
    : null;

  return STARTER_INGREDIENT_TEMPLATES
    .filter((item) => !selected || selected.has(item.name.toLowerCase()))
    .filter((item) => !existing.has(item.name.toLowerCase()))
    .map((item) => ({
      name: item.name,
      category: item.category,
      storageType: item.storageType,
      quantity: item.quantity,
      memo: item.memo,
      expiryDate: buildFutureDate(item.expiryOffsetDays),
    }));
}
