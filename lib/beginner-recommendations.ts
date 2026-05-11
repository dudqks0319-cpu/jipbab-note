// 이 파일은 요리 초보자용 상황 추천과 레시피 난이도 표시 기준을 담당합니다.
import type { RecipeRecord } from "@/types";

import { extractRecipeIngredients } from "@/lib/matching";

export type BeginnerSituationId =
  | "quick"
  | "few-ingredients"
  | "low-fail"
  | "hearty"
  | "soup"
  | "budget";

export interface BeginnerSituation {
  id: BeginnerSituationId;
  label: string;
  helper: string;
  icon: string;
}

export interface BeginnerRecipeProfile {
  minutes: number;
  difficultyLevel: 1 | 2 | 3;
  difficultyLabel: string;
  confidenceLabel: string;
  ingredientCount: number;
}

const recipeProfileOverrides: Record<string, Partial<BeginnerRecipeProfile>> = {
  "sample-egg-roll": { minutes: 12, difficultyLevel: 1, confidenceLabel: "팬만 있으면 가능" },
  "sample-fried-rice": { minutes: 10, difficultyLevel: 1, confidenceLabel: "한 팬으로 끝" },
  "sample-rice-ball": { minutes: 8, difficultyLevel: 1, confidenceLabel: "불 없이 가능" },
  "sample-tomato-egg-stirfry": { minutes: 12, difficultyLevel: 1, confidenceLabel: "볶기만 하면 됨" },
  "sample-miso-soup": { minutes: 15, difficultyLevel: 2, confidenceLabel: "간 맞추기 쉬움" },
  "sample-kimchi-jjigae": { minutes: 20, difficultyLevel: 2, confidenceLabel: "끓이면 맛이 남" },
  "sample-soy-pasta": { minutes: 18, difficultyLevel: 2, confidenceLabel: "소스가 단순함" },
  "sample-curry-udon": { minutes: 12, difficultyLevel: 1, confidenceLabel: "카레가 맛을 잡아줌" },
  "sample-tteokbokki": { minutes: 15, difficultyLevel: 1, confidenceLabel: "양념 비율이 쉬움" },
  "sample-banana-pancake": { minutes: 15, difficultyLevel: 2, confidenceLabel: "천천히 구우면 됨" },
  "sample-noodle-soup": { minutes: 18, difficultyLevel: 2, confidenceLabel: "고명은 생략 가능" },
  "sample-chicken-salad": { minutes: 10, difficultyLevel: 1, confidenceLabel: "섞어서 바로 완성" },
};

const budgetStaples = ["계란", "김치", "두부", "밥", "양파", "대파", "참치", "고추장", "된장", "간장", "떡"];

export const BEGINNER_SITUATIONS: BeginnerSituation[] = [
  { id: "quick", label: "10분 안에", helper: "빨리 먹고 싶을 때", icon: "⏱️" },
  { id: "few-ingredients", label: "재료 3개 이하", helper: "냉장고가 비었을 때", icon: "🥚" },
  { id: "low-fail", label: "실패 적게", helper: "처음 만들어도 안전하게", icon: "✨" },
  { id: "hearty", label: "든든한 한 끼", helper: "밥심이 필요할 때", icon: "🍚" },
  { id: "soup", label: "국물 땡김", helper: "따뜻하게 먹고 싶을 때", icon: "🍲" },
  { id: "budget", label: "월급 전", helper: "있는 재료로 알뜰하게", icon: "💸" },
];

export function getBeginnerSituation(id: BeginnerSituationId): BeginnerSituation {
  return BEGINNER_SITUATIONS.find((situation) => situation.id === id) ?? BEGINNER_SITUATIONS[0];
}

function inferMinutes(recipe: RecipeRecord, ingredientCount: number): number {
  if (recipe.method.includes("무치") || recipe.method.includes("섞")) return 8;
  if (recipe.method.includes("볶") || recipe.method.includes("삶")) return 12;
  if (recipe.method.includes("굽") || recipe.method.includes("부치")) return 15;
  if (recipe.method.includes("끓")) return ingredientCount <= 5 ? 15 : 20;
  return 18;
}

function inferDifficulty(recipe: RecipeRecord, ingredientCount: number): 1 | 2 | 3 {
  if (ingredientCount <= 4) return 1;
  if (recipe.method.includes("무치") || recipe.method.includes("섞")) return 1;
  if (recipe.method.includes("볶") || recipe.method.includes("끓")) return 2;
  return 2;
}

function getDifficultyLabel(level: 1 | 2 | 3): string {
  if (level === 1) return "초보 쉬움";
  if (level === 2) return "천천히 가능";
  return "조금 연습";
}

export function getBeginnerRecipeProfile(recipe: RecipeRecord): BeginnerRecipeProfile {
  const ingredientCount = extractRecipeIngredients(recipe.ingredients).length;
  const override = recipeProfileOverrides[recipe.id] ?? {};
  const difficultyLevel = override.difficultyLevel ?? inferDifficulty(recipe, ingredientCount);

  return {
    minutes: override.minutes ?? inferMinutes(recipe, ingredientCount),
    difficultyLevel,
    difficultyLabel: override.difficultyLabel ?? getDifficultyLabel(difficultyLevel),
    confidenceLabel: override.confidenceLabel ?? "순서대로 하면 가능",
    ingredientCount,
  };
}

export function getSituationRecipeScore(
  recipe: RecipeRecord,
  situationId: BeginnerSituationId,
  matchRate = 0,
): number {
  const profile = getBeginnerRecipeProfile(recipe);
  const text = `${recipe.name} ${recipe.category} ${recipe.method} ${recipe.ingredients} ${recipe.hashTag}`;
  let score = Math.round(matchRate / 10);

  if (situationId === "quick") {
    if (profile.minutes <= 10) score += 9;
    else if (profile.minutes <= 15) score += 6;
    else if (profile.minutes <= 20) score += 2;
  }

  if (situationId === "few-ingredients") {
    if (profile.ingredientCount <= 3) score += 10;
    else if (profile.ingredientCount <= 5) score += 6;
  }

  if (situationId === "low-fail") {
    if (profile.difficultyLevel === 1) score += 9;
    if (text.includes("카레") || text.includes("볶음밥") || text.includes("주먹밥")) score += 3;
  }

  if (situationId === "hearty") {
    if (["밥", "한식", "국·찌개", "면요리", "일품"].includes(recipe.category)) score += 8;
    if (text.includes("밥") || text.includes("고기") || text.includes("우동")) score += 3;
  }

  if (situationId === "soup") {
    if (recipe.category === "국·찌개") score += 10;
    if (text.includes("국") || text.includes("찌개") || text.includes("우동") || text.includes("국수")) score += 4;
  }

  if (situationId === "budget") {
    const stapleHits = budgetStaples.filter((staple) => text.includes(staple)).length;
    score += Math.min(stapleHits * 2, 10);
    if (profile.ingredientCount <= 5) score += 2;
  }

  return score;
}
