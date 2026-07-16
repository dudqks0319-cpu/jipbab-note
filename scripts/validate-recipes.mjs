// BeginnerRecipe 라이브러리의 노출/권리/초보자 문장 계약을 검증합니다.
import {
  BEGINNER_RECIPE_LIBRARY,
  CORE_RECIPE_50_NAMES,
  ONBOARDING_RECIPE_10_NAMES,
  RELEASE_RECIPE_30_NAMES,
  canPublishRecipe,
} from "../lib/beginner-recipes.ts";

const DANGEROUS_PHRASES = [
  "백종원",
  "백종원 스타일",
  "공식 레시피",
  "공식",
  "유튜브",
  "만개의레시피 원문",
  "우리의식탁 원문",
];

const VAGUE_PHRASES = ["적당히", "노릇하게", "익을 때까지"];
const TITLE_INGREDIENT_RULES = [
  { keyword: /버터/, required: /버터/, label: "버터" },
  { keyword: /마요/, required: /마요|마요네즈/, label: "마요네즈" },
  { keyword: /샐러드/, required: /마요|마요네즈|드레싱|요거트/, label: "샐러드 양념" },
  { keyword: /계란|달걀/, required: /계란|달걀/, label: "계란" },
  { keyword: /밥|덮밥|볶음밥|주먹밥|비빔밥/, required: /밥|즉석밥/, label: "밥" },
  { keyword: /김치/, required: /김치/, label: "김치" },
  { keyword: /참치/, required: /참치/, label: "참치" },
  { keyword: /스팸/, required: /스팸|햄/, label: "스팸/햄" },
  { keyword: /햄/, required: /햄|스팸/, label: "햄" },
  { keyword: /어묵/, required: /어묵/, label: "어묵" },
  { keyword: /두부|순두부|연두부/, required: /두부|순두부|연두부/, label: "두부" },
  { keyword: /감자/, required: /감자/, label: "감자" },
  { keyword: /된장/, required: /된장/, label: "된장" },
  { keyword: /파스타/, required: /파스타|스파게티/, label: "파스타면" },
];

function collectText(value, output = []) {
  if (typeof value === "string") {
    output.push(value);
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectText(item, output);
    return output;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectText(item, output);
  }
  return output;
}

function collectIngredientText(recipe) {
  return recipe.ingredients
    .map((ingredient) => `${ingredient.name} ${ingredient.amount} ${ingredient.substitute ?? ""}`)
    .join("\n");
}

function findDuplicates(items, field) {
  const seen = new Map();
  const duplicates = [];
  for (const item of items) {
    const value = item[field];
    if (seen.has(value)) {
      duplicates.push(`${field}:${value}`);
    }
    seen.set(value, true);
  }
  return duplicates;
}

function requireRecipeSet(names, minScore, label) {
  const byTitle = new Map(BEGINNER_RECIPE_LIBRARY.map((recipe) => [recipe.title, recipe]));
  const issues = [];
  for (const name of names) {
    const recipe = byTitle.get(name);
    if (!recipe) {
      issues.push(`${label}: missing ${name}`);
      continue;
    }
    if (recipe.beginnerScore < minScore) issues.push(`${label}: ${name} beginnerScore < ${minScore}`);
    if (recipe.publishStatus !== "published") issues.push(`${label}: ${name} is not published`);
    if (!["A", "B"].includes(recipe.safety.safetyLevel)) issues.push(`${label}: ${name} is not A/B`);
    if (recipe.totalMinutes > 20) issues.push(`${label}: ${name} exceeds 20 minutes`);
  }
  return issues;
}

const issues = [];

if (BEGINNER_RECIPE_LIBRARY.length < 100) {
  issues.push(`library has ${BEGINNER_RECIPE_LIBRARY.length}; expected at least 100`);
}

issues.push(...findDuplicates(BEGINNER_RECIPE_LIBRARY, "id"));
issues.push(...findDuplicates(BEGINNER_RECIPE_LIBRARY, "slug"));
issues.push(...findDuplicates(BEGINNER_RECIPE_LIBRARY, "title"));
issues.push(...requireRecipeSet(ONBOARDING_RECIPE_10_NAMES, 89, "onboarding_10"));
issues.push(...requireRecipeSet(RELEASE_RECIPE_30_NAMES, 80, "release_30"));
issues.push(...requireRecipeSet(CORE_RECIPE_50_NAMES, 80, "core_50"));

for (const recipe of BEGINNER_RECIPE_LIBRARY) {
  const requiredIngredients = recipe.ingredients.filter((ingredient) => ingredient.required);
  const allText = collectText(recipe).join("\n");
  const ingredientText = collectIngredientText(recipe);

  for (const phrase of DANGEROUS_PHRASES) {
    if (allText.includes(phrase)) {
      issues.push(`${recipe.id}: 위험 표현 포함 ${phrase}`);
    }
  }

  for (const phrase of VAGUE_PHRASES) {
    if (allText.includes(phrase)) {
      issues.push(`${recipe.id}: 초보자에게 모호한 표현 포함 ${phrase}`);
    }
  }

  for (const rule of TITLE_INGREDIENT_RULES) {
    if (rule.keyword.test(recipe.title) && !rule.required.test(ingredientText)) {
      issues.push(`${recipe.id}: 제목에 ${rule.label}이 있으나 재료에 없음`);
    }
  }

  if (recipe.publishStatus === "published") {
    if (!["A", "B"].includes(recipe.safety.safetyLevel)) {
      issues.push(`${recipe.id}: published recipe must be A/B`);
    }
    if (recipe.beginnerScore < 80) issues.push(`${recipe.id}: beginnerScore < 80`);
    if (recipe.difficultyLevel > 2) issues.push(`${recipe.id}: difficultyLevel > 2`);
    if (requiredIngredients.length > 7) issues.push(`${recipe.id}: required ingredients > 7`);
    if (recipe.requiredTools.length > 3) issues.push(`${recipe.id}: required tools > 3`);
    if (recipe.totalMinutes > 20) issues.push(`${recipe.id}: totalMinutes > 20`);
    if (!recipe.source.adaptedByJipbabNote) issues.push(`${recipe.id}: source.adaptedByJipbabNote required`);
    if (recipe.source.imageUsageAllowed && (!recipe.source.licenseOrUsageNote || !recipe.source.rightsNote)) {
      issues.push(`${recipe.id}: image usage note and rights note required`);
    }
    if (!canPublishRecipe(recipe)) issues.push(`${recipe.id}: canPublishRecipe rejected published recipe`);
    for (const step of recipe.steps) {
      if (!step.action || !step.heat || !Number.isFinite(step.minutes) || !step.visualCue || !step.commonMistake || !step.rescueTip) {
        issues.push(`${recipe.id}: step ${step.order} is missing required beginner fields`);
      }
    }
  }

  if ((recipe.safety.safetyLevel === "C" || recipe.safety.safetyLevel === "D") && recipe.publishStatus === "published") {
    issues.push(`${recipe.id}: C/D recipe cannot be published`);
  }
}

if (issues.length > 0) {
  console.error(`Recipe validation failed (${issues.length})`);
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`Recipe validation passed: ${BEGINNER_RECIPE_LIBRARY.length} candidates`);
