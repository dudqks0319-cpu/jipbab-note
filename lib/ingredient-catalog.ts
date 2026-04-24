import type { IngredientCategory, IngredientStorageType } from "@/types";

export interface IngredientCatalogItem {
  name: string;
  category: IngredientCategory;
  storageType: IngredientStorageType;
}

export const INGREDIENT_CATALOG: IngredientCatalogItem[] = [
  { name: "양파", category: "채소", storageType: "냉장" },
  { name: "대파", category: "채소", storageType: "냉장" },
  { name: "쪽파", category: "채소", storageType: "냉장" },
  { name: "마늘", category: "채소", storageType: "냉장" },
  { name: "감자", category: "채소", storageType: "실온" },
  { name: "고구마", category: "채소", storageType: "실온" },
  { name: "당근", category: "채소", storageType: "냉장" },
  { name: "애호박", category: "채소", storageType: "냉장" },
  { name: "단호박", category: "채소", storageType: "실온" },
  { name: "오이", category: "채소", storageType: "냉장" },
  { name: "가지", category: "채소", storageType: "냉장" },
  { name: "토마토", category: "채소", storageType: "냉장" },
  { name: "방울토마토", category: "채소", storageType: "냉장" },
  { name: "상추", category: "채소", storageType: "냉장" },
  { name: "깻잎", category: "채소", storageType: "냉장" },
  { name: "양배추", category: "채소", storageType: "냉장" },
  { name: "배추", category: "채소", storageType: "냉장" },
  { name: "무", category: "채소", storageType: "냉장" },
  { name: "시금치", category: "채소", storageType: "냉장" },
  { name: "부추", category: "채소", storageType: "냉장" },
  { name: "숙주", category: "채소", storageType: "냉장" },
  { name: "콩나물", category: "채소", storageType: "냉장" },
  { name: "브로콜리", category: "채소", storageType: "냉장" },
  { name: "파프리카", category: "채소", storageType: "냉장" },
  { name: "청양고추", category: "채소", storageType: "냉장" },
  { name: "표고버섯", category: "채소", storageType: "냉장" },
  { name: "새송이버섯", category: "채소", storageType: "냉장" },
  { name: "팽이버섯", category: "채소", storageType: "냉장" },
  { name: "사과", category: "과일", storageType: "냉장" },
  { name: "배", category: "과일", storageType: "냉장" },
  { name: "바나나", category: "과일", storageType: "실온" },
  { name: "딸기", category: "과일", storageType: "냉장" },
  { name: "블루베리", category: "과일", storageType: "냉장" },
  { name: "포도", category: "과일", storageType: "냉장" },
  { name: "귤", category: "과일", storageType: "냉장" },
  { name: "오렌지", category: "과일", storageType: "냉장" },
  { name: "레몬", category: "과일", storageType: "냉장" },
  { name: "키위", category: "과일", storageType: "냉장" },
  { name: "복숭아", category: "과일", storageType: "냉장" },
  { name: "망고", category: "과일", storageType: "냉장" },
  { name: "아보카도", category: "과일", storageType: "실온" },
  { name: "소고기", category: "육류", storageType: "냉장" },
  { name: "불고기용 소고기", category: "육류", storageType: "냉동" },
  { name: "차돌박이", category: "육류", storageType: "냉동" },
  { name: "우삼겹", category: "육류", storageType: "냉동" },
  { name: "돼지고기", category: "육류", storageType: "냉장" },
  { name: "삼겹살", category: "육류", storageType: "냉장" },
  { name: "목살", category: "육류", storageType: "냉장" },
  { name: "다짐육", category: "육류", storageType: "냉동" },
  { name: "닭고기", category: "육류", storageType: "냉장" },
  { name: "닭가슴살", category: "육류", storageType: "냉장" },
  { name: "닭다리살", category: "육류", storageType: "냉장" },
  { name: "오리고기", category: "육류", storageType: "냉동" },
  { name: "베이컨", category: "육류", storageType: "냉장" },
  { name: "햄", category: "육류", storageType: "냉장" },
  { name: "소시지", category: "육류", storageType: "냉장" },
  { name: "고등어", category: "수산물", storageType: "냉동" },
  { name: "갈치", category: "수산물", storageType: "냉동" },
  { name: "연어", category: "수산물", storageType: "냉장" },
  { name: "참치캔", category: "수산물", storageType: "실온" },
  { name: "새우", category: "수산물", storageType: "냉동" },
  { name: "오징어", category: "수산물", storageType: "냉동" },
  { name: "낙지", category: "수산물", storageType: "냉동" },
  { name: "바지락", category: "수산물", storageType: "냉장" },
  { name: "홍합", category: "수산물", storageType: "냉장" },
  { name: "멸치", category: "수산물", storageType: "실온" },
  { name: "김", category: "수산물", storageType: "실온" },
  { name: "미역", category: "수산물", storageType: "실온" },
  { name: "다시마", category: "수산물", storageType: "실온" },
  { name: "어묵", category: "수산물", storageType: "냉장" },
  { name: "계란", category: "유제품", storageType: "냉장" },
  { name: "우유", category: "유제품", storageType: "냉장" },
  { name: "두부", category: "유제품", storageType: "냉장" },
  { name: "순두부", category: "유제품", storageType: "냉장" },
  { name: "치즈", category: "유제품", storageType: "냉장" },
  { name: "모짜렐라치즈", category: "유제품", storageType: "냉장" },
  { name: "버터", category: "유제품", storageType: "냉장" },
  { name: "요거트", category: "유제품", storageType: "냉장" },
  { name: "생크림", category: "유제품", storageType: "냉장" },
  { name: "두유", category: "유제품", storageType: "실온" },
  { name: "간장", category: "양념", storageType: "실온" },
  { name: "국간장", category: "양념", storageType: "실온" },
  { name: "고추장", category: "양념", storageType: "실온" },
  { name: "된장", category: "양념", storageType: "실온" },
  { name: "쌈장", category: "양념", storageType: "실온" },
  { name: "소금", category: "양념", storageType: "실온" },
  { name: "설탕", category: "양념", storageType: "실온" },
  { name: "식초", category: "양념", storageType: "실온" },
  { name: "참기름", category: "양념", storageType: "실온" },
  { name: "들기름", category: "양념", storageType: "실온" },
  { name: "고춧가루", category: "양념", storageType: "실온" },
  { name: "후추", category: "양념", storageType: "실온" },
  { name: "다진마늘", category: "양념", storageType: "냉장" },
  { name: "굴소스", category: "양념", storageType: "냉장" },
  { name: "케첩", category: "양념", storageType: "냉장" },
  { name: "마요네즈", category: "양념", storageType: "냉장" },
  { name: "식용유", category: "양념", storageType: "실온" },
  { name: "올리브오일", category: "양념", storageType: "실온" },
  { name: "카레가루", category: "양념", storageType: "실온" },
  { name: "쌀", category: "기타", storageType: "실온" },
  { name: "현미", category: "기타", storageType: "실온" },
  { name: "밀가루", category: "기타", storageType: "실온" },
  { name: "부침가루", category: "기타", storageType: "실온" },
  { name: "빵가루", category: "기타", storageType: "실온" },
  { name: "파스타면", category: "기타", storageType: "실온" },
  { name: "소면", category: "기타", storageType: "실온" },
  { name: "우동면", category: "기타", storageType: "냉장" },
  { name: "라면", category: "기타", storageType: "실온" },
  { name: "떡", category: "기타", storageType: "냉동" },
  { name: "김치", category: "기타", storageType: "냉장" },
  { name: "통조림 옥수수", category: "기타", storageType: "실온" },
  { name: "견과류", category: "기타", storageType: "실온" },
];

export const INGREDIENTS_BY_CATEGORY = INGREDIENT_CATALOG.reduce<Record<IngredientCategory, string[]>>(
  (acc, item) => {
    acc[item.category] = [...(acc[item.category] ?? []), item.name];
    return acc;
  },
  {
    채소: [],
    과일: [],
    육류: [],
    수산물: [],
    유제품: [],
    양념: [],
    기타: [],
  },
);

export function findCatalogIngredient(name: string): IngredientCatalogItem | null {
  const normalized = name.replace(/\s+/g, "").toLowerCase();
  return INGREDIENT_CATALOG.find((item) => item.name.replace(/\s+/g, "").toLowerCase() === normalized) ?? null;
}

export function getIngredientImageUrl(name: string, category?: string | null): string {
  const params = new URLSearchParams({ name });
  if (category) {
    params.set("category", category);
  }
  return `/api/ingredient-image?${params.toString()}`;
}
