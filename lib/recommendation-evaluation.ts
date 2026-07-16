// 이 파일은 추천 회귀를 측정하는 100개 합성 라벨 Top 3 시나리오를 결정적으로 생성합니다.
import { CURATED_JIPBAB_RECIPES } from "./curated-recipes.ts";
import { extractRecipeIngredients, rankRecipeRecommendations } from "./matching.ts";

export const RECOMMENDATION_EVALUATION_TARGETS = [
  "간장계란밥", "계란볶음밥", "참치김치볶음밥", "김치볶음밥", "프라이팬 계란말이",
  "전자레인지 계란찜", "두부조림", "감자조림", "어묵볶음", "콩나물무침",
  "된장찌개", "돼지고기 김치찌개", "미역국", "북엇국", "제육볶음",
  "간장불고기", "잔치국수", "떡볶이", "토마토달걀볶음", "닭가슴살 채소볶음",
] as const;

export type RecommendationEvaluationScenario = {
  id: string;
  targetRecipeName: string;
  inventory: Array<string | { name: string }>;
};

export function buildRecommendationEvaluationScenarios(): RecommendationEvaluationScenario[] {
  return RECOMMENDATION_EVALUATION_TARGETS.flatMap((targetRecipeName, targetIndex) => {
    const recipe = CURATED_JIPBAB_RECIPES.find((candidate) => candidate.name === targetRecipeName);
    if (!recipe) throw new Error(`missing_evaluation_recipe:${targetRecipeName}`);
    const ingredients = extractRecipeIngredients(recipe.ingredients);
    const variants: RecommendationEvaluationScenario["inventory"][] = [
      ingredients,
      [...ingredients, "바나나"],
      [...ingredients, "우유", "사과"],
      [...ingredients].reverse(),
      ingredients.map((name) => ({ name })),
    ];
    return variants.map((inventory, variantIndex) => ({
      id: `top3-${String(targetIndex + 1).padStart(2, "0")}-${variantIndex + 1}`,
      targetRecipeName,
      inventory,
    }));
  });
}

export function evaluateRecommendationTop3() {
  const scenarios = buildRecommendationEvaluationScenarios();
  const results = scenarios.map((scenario) => {
    const top3 = rankRecipeRecommendations(
      CURATED_JIPBAB_RECIPES,
      scenario.inventory,
      new Date("2026-07-17T00:00:00.000Z"),
    ).slice(0, 3).map((result) => result.recipe.name);
    return { ...scenario, top3, passed: top3.includes(scenario.targetRecipeName) };
  });
  const passed = results.filter((result) => result.passed).length;
  return {
    scenarioCount: results.length,
    passed,
    failed: results.length - passed,
    top3HitRatePercent: results.length === 0 ? 0 : Number(((passed / results.length) * 100).toFixed(1)),
    results,
  };
}
