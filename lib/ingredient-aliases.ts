// 이 파일은 재료 별칭을 표준 재료명으로 맞춰 추천과 중복 검사를 안정화합니다.
import { getIngredientCatalog } from "./ingredient-catalog.ts";

const MANUAL_INGREDIENT_ALIASES: Record<string, string[]> = {
  계란: ["계란", "달걀", "알", "신선란", "왕란", "특란"],
  대파: ["대파", "파", "흰파", "깐대파", "대파채"],
  쪽파: ["쪽파", "실파", "잔파"],
  양파: ["양파", "깐양파", "햇양파", "흰양파", "적양파"],
  두부: ["두부", "찌개두부", "찌개용두부", "부침두부", "순두부", "연두부"],
  돼지고기: ["돼지고기", "앞다리살", "뒷다리살", "목살", "삼겹살", "다짐육", "돼지고기다짐육", "제육용"],
  닭고기: ["닭고기", "닭가슴살", "닭다리살", "닭안심", "닭정육", "닭봉", "닭날개"],
  소고기: ["소고기", "쇠고기", "국거리", "불고기용소고기", "소고기다짐육"],
  고춧가루: ["고춧가루", "고추가루", "고운고춧가루", "굵은고춧가루"],
  고추장: ["고추장", "초고추장"],
  된장: ["된장", "집된장", "재래된장"],
  간장: ["간장", "진간장", "양조간장", "국간장", "조선간장", "맛간장"],
  마늘: ["마늘", "다진마늘", "간마늘", "깐마늘", "통마늘"],
  고추: ["고추", "청양고추", "홍고추", "풋고추"],
  김치: ["김치", "배추김치", "묵은지", "신김치", "익은김치"],
  멸치육수: ["멸치육수", "멸치다시마육수", "육수팩", "다시팩", "코인육수", "멸치육수팩"],
  감자: ["감자", "수미감자", "햇감자"],
  애호박: ["애호박", "주키니", "쥬키니"],
  참기름: ["참기름", "고소한참기름"],
  들기름: ["들기름"],
  후추: ["후추", "후춧가루", "후추가루", "통후추"],
  설탕: ["설탕", "백설탕", "갈색설탕", "흑설탕"],
  소금: ["소금", "꽃소금", "굵은소금", "천일염"],
  식초: ["식초", "양조식초", "사과식초"],
  맛술: ["맛술", "미림", "요리술"],
  밥: ["밥", "찬밥", "햇반", "즉석밥"],
  떡: ["떡", "떡국떡", "떡볶이떡"],
  버섯: ["버섯", "양송이버섯", "느타리버섯", "표고버섯", "새송이버섯"],
};

function normalizeAliasToken(value: string): string {
  return value
    .normalize("NFC")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
}

function buildIngredientAliases(): Record<string, string[]> {
  const aliases: Record<string, Set<string>> = {};

  for (const item of getIngredientCatalog()) {
    const canonical = item.name;
    aliases[canonical] = aliases[canonical] ?? new Set<string>();
    aliases[canonical].add(canonical);
    for (const alias of item.aliases ?? []) {
      aliases[canonical].add(alias);
    }
  }

  for (const [canonical, values] of Object.entries(MANUAL_INGREDIENT_ALIASES)) {
    aliases[canonical] = aliases[canonical] ?? new Set<string>();
    aliases[canonical].add(canonical);
    for (const value of values) {
      aliases[canonical].add(value);
    }
  }

  return Object.fromEntries(
    Object.entries(aliases).map(([canonical, values]) => [canonical, Array.from(values)]),
  );
}

export const ingredientAliases = buildIngredientAliases();

const exactAliasLookup = new Map<string, string>();
for (const [canonical, aliases] of Object.entries(ingredientAliases)) {
  for (const alias of aliases) {
    exactAliasLookup.set(normalizeAliasToken(alias), canonical);
  }
}

const containsAliasLookup = Array.from(exactAliasLookup.entries())
  .filter(([alias]) => alias.length >= 2)
  .sort((left, right) => right[0].length - left[0].length);

export function canonicalizeIngredientName(value: string): string {
  const compact = normalizeAliasToken(value);
  if (!compact) {
    return "";
  }

  const exact = exactAliasLookup.get(compact);
  if (exact) {
    return exact;
  }

  for (const [alias, canonical] of containsAliasLookup) {
    if (compact.includes(alias)) {
      return canonical;
    }
  }

  return value.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

export function areIngredientNamesEquivalent(left: string, right: string): boolean {
  const leftCanonical = canonicalizeIngredientName(left);
  const rightCanonical = canonicalizeIngredientName(right);
  return Boolean(leftCanonical && rightCanonical && leftCanonical === rightCanonical);
}

export function getIngredientAliasCount(): number {
  return Object.values(ingredientAliases).reduce((total, aliases) => total + aliases.length, 0);
}
