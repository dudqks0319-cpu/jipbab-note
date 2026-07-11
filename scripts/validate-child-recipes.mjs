import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentDirectory = path.join(root, "content", "child-meals", "toddler-24-36");

const ALLOWED_ALLERGEN_CODES = new Set([
  "egg",
  "milk",
  "wheat",
  "soy",
  "peanut",
  "tree_nut",
  "sesame",
  "buckwheat",
  "fish",
  "shellfish",
  "pork",
  "chicken",
  "beef",
  "peach",
  "tomato",
  "sulfite",
  "pine_nut",
]);

const FORBIDDEN_HEALTH_CLAIMS = [
  "면역력 향상",
  "면역력 강화",
  "키 크는",
  "키가 크는",
  "두뇌 발달 보장",
  "편식 치료",
  "알레르기 치료",
  "감기 예방",
];

const FORBIDDEN_HIGH_RISK_TERMS = [
  "통견과",
  "통 견과",
  "팝콘",
  "마시멜로",
  "젤리",
  "통포도",
  "통 포도",
  "소시지 원형",
  "방울토마토 통째",
];

const INGREDIENT_ALLERGEN_RULES = [
  { pattern: /달걀|계란/, code: "egg" },
  { pattern: /두부|연두부/, code: "soy" },
  { pattern: /치즈|우유|요거트/, code: "milk" },
  { pattern: /식빵|밀가루/, code: "wheat" },
  { pattern: /소고기/, code: "beef" },
  { pattern: /닭고기|닭안심|생닭/, code: "chicken" },
  { pattern: /토마토/, code: "tomato" },
  { pattern: /생선|연어|흰살생선/, code: "fish" },
  { pattern: /새우|게|조개/, code: "shellfish" },
];

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function recipeText(recipe) {
  return JSON.stringify(recipe);
}

function ingredientText(recipe) {
  return Array.isArray(recipe.ingredients)
    ? recipe.ingredients.map((ingredient) => `${ingredient.name ?? ""} ${ingredient.prepNote ?? ""}`).join("\n")
    : "";
}

function hasCompleteHeatingCue(recipe) {
  const combined = (recipe.steps ?? [])
    .map((step) => `${step.title ?? ""} ${step.action ?? ""} ${step.visualCue ?? ""} ${step.safetyNote ?? ""}`)
    .join("\n");
  return /완전|불투명|붉은 부분.*없|분홍색.*없|젖은.*없|맑은 달걀물.*나오지/.test(combined);
}

function isPublished(recipe) {
  return recipe.publication?.publishStatus === "published" || recipe.publication?.publishedAt;
}

const files = (await readdir(contentDirectory))
  .filter((filename) => /^recipes-\d{2}-\d{2}\.json$/.test(filename))
  .sort();

if (files.length === 0) {
  console.error("Child recipe validation failed: no recipe files found");
  process.exit(1);
}

const recipes = [];
const issues = [];

for (const filename of files) {
  const fullPath = path.join(contentDirectory, filename);
  let payload;
  try {
    payload = JSON.parse(await readFile(fullPath, "utf8"));
  } catch (error) {
    issues.push(`${filename}: invalid JSON (${error instanceof Error ? error.message : "unknown error"})`);
    continue;
  }

  if (payload.status !== "draft_only_do_not_publish") {
    issues.push(`${filename}: dataset status must remain draft_only_do_not_publish until review`);
  }
  if (!Array.isArray(payload.recipes)) {
    issues.push(`${filename}: recipes must be an array`);
    continue;
  }
  recipes.push(...payload.recipes.map((recipe) => ({ ...recipe, __filename: filename })));
}

const seenSlugs = new Set();
const seenTitles = new Set();

for (const recipe of recipes) {
  const label = `${recipe.__filename}:${recipe.slug || recipe.title || "unknown"}`;
  const allText = recipeText(recipe);
  const ingredients = ingredientText(recipe);

  if (!text(recipe.slug)) issues.push(`${label}: slug required`);
  if (!text(recipe.title)) issues.push(`${label}: title required`);
  if (!text(recipe.summary)) issues.push(`${label}: summary required`);
  if (seenSlugs.has(recipe.slug)) issues.push(`${label}: duplicate slug`);
  if (seenTitles.has(recipe.title)) issues.push(`${label}: duplicate title`);
  seenSlugs.add(recipe.slug);
  seenTitles.add(recipe.title);

  if (recipe.audience !== "toddler") issues.push(`${label}: audience must be toddler`);
  if (recipe.minAgeMonths !== 24 || recipe.maxAgeMonths !== 36) {
    issues.push(`${label}: first release must be bounded to 24-36 months`);
  }
  if (recipe.textureLevel !== "soft_bite" && recipe.textureLevel !== "family_cut") {
    issues.push(`${label}: unsupported textureLevel`);
  }
  if (!Array.isArray(recipe.mealTypes) || recipe.mealTypes.length === 0) {
    issues.push(`${label}: mealTypes required`);
  }
  if (!Number.isInteger(recipe.activeTimeMinutes) || recipe.activeTimeMinutes < 1 || recipe.activeTimeMinutes > 20) {
    issues.push(`${label}: activeTimeMinutes must be 1-20`);
  }
  if (!Number.isInteger(recipe.totalTimeMinutes) || recipe.totalTimeMinutes < recipe.activeTimeMinutes) {
    issues.push(`${label}: totalTimeMinutes must cover active time`);
  }
  if (!Array.isArray(recipe.tools) || recipe.tools.length < 1 || recipe.tools.length > 3) {
    issues.push(`${label}: tools must contain 1-3 items`);
  }
  if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length < 3) {
    issues.push(`${label}: at least three ingredients required`);
  }
  if (!Array.isArray(recipe.steps) || recipe.steps.length < 3) {
    issues.push(`${label}: at least three steps required`);
  } else {
    for (const step of recipe.steps) {
      if (
        !Number.isInteger(step.order) ||
        !text(step.action) ||
        !text(step.heat) ||
        !Number.isFinite(step.minutes) ||
        step.minutes < 0 ||
        !text(step.visualCue) ||
        !text(step.commonMistake) ||
        !text(step.rescueTip)
      ) {
        issues.push(`${label}: step ${step.order ?? "?"} misses action/heat/minutes/cue/mistake/rescue`);
      }
    }
  }

  if (!Array.isArray(recipe.allergenCodes)) {
    issues.push(`${label}: allergenCodes required`);
  } else if (recipe.allergenCodes.some((code) => !ALLOWED_ALLERGEN_CODES.has(code))) {
    issues.push(`${label}: unsupported allergen code`);
  }

  for (const rule of INGREDIENT_ALLERGEN_RULES) {
    if (rule.pattern.test(ingredients) && !recipe.allergenCodes?.includes(rule.code)) {
      issues.push(`${label}: ingredient implies missing allergen ${rule.code}`);
    }
  }

  if (/달걀|계란|소고기|닭고기|닭안심|생선|연어/.test(ingredients) && !hasCompleteHeatingCue(recipe)) {
    issues.push(`${label}: egg/meat/fish recipe needs an explicit complete-heating cue`);
  }

  if (/생선|연어|흰살생선/.test(ingredients) && !/가시/.test(allText)) {
    issues.push(`${label}: fish recipe needs a bone-check instruction`);
  }

  if (!Array.isArray(recipe.servingShapeNotes) || recipe.servingShapeNotes.length === 0) {
    issues.push(`${label}: servingShapeNotes required`);
  }
  if (!text(recipe.sodiumStrategy)) issues.push(`${label}: sodiumStrategy required`);
  if (recipe.familySplitSupported) {
    if (!text(recipe.familySplitInstruction)) {
      issues.push(`${label}: family split instruction required`);
    }
    if (!recipe.steps?.some((step) => step.familySplitPoint === true)) {
      issues.push(`${label}: family split recipe needs a marked split step`);
    }
  }
  if (!text(recipe.storageGuide) || !text(recipe.reheatingGuide)) {
    issues.push(`${label}: storage and reheating guidance required`);
  }
  if (!text(recipe.pickyEatingTip) || !text(recipe.caregiverNote)) {
    issues.push(`${label}: responsive-feeding copy required`);
  }
  if (!Array.isArray(recipe.sourceReferences) || recipe.sourceReferences.length < 3) {
    issues.push(`${label}: at least three references required`);
  } else if (!recipe.sourceReferences.some((reference) => reference.referenceType === "official_guidance")) {
    issues.push(`${label}: official safety guidance reference required`);
  }

  for (const phrase of FORBIDDEN_HEALTH_CLAIMS) {
    if (allText.includes(phrase)) issues.push(`${label}: forbidden health claim ${phrase}`);
  }
  for (const phrase of FORBIDDEN_HIGH_RISK_TERMS) {
    if (allText.includes(phrase)) issues.push(`${label}: unsupported high-risk form ${phrase}`);
  }

  if (isPublished(recipe)) {
    const publication = recipe.publication ?? {};
    if (
      publication.actualCookingTested !== true ||
      publication.foodSafetyReviewed !== true ||
      publication.childFeedingReviewed !== true ||
      publication.requirementsVerified !== true ||
      !["approved", "no_image_approved"].includes(publication.imageRightsStatus)
    ) {
      issues.push(`${label}: published child recipe does not satisfy all human review gates`);
    }
  } else if (recipe.publication?.publishStatus !== "draft") {
    issues.push(`${label}: unreviewed recipe must remain draft`);
  }
}

if (recipes.length !== 12) {
  issues.push(`dataset: expected exactly 12 first-release drafts, found ${recipes.length}`);
}

if (issues.length > 0) {
  console.error(`Child recipe validation failed (${issues.length})`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`Child recipe validation passed: ${recipes.length} draft recipes in ${files.length} files`);
