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
