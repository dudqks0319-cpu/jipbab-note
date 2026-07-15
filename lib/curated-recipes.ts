// 이 파일은 경쟁 앱 대비 첫 체감 품질을 높이기 위한 한국 집밥 큐레이션 레시피를 제공합니다.
import type {
  BeginnerRecipeSafety,
  BeginnerRecipeSource,
  RecipeHomeCardCopy,
  RecipeDetailRecord,
  RecipeDetailStep,
  RecipeDifficultyLevel,
  RecipeIngredientDetail,
  RecipeRecord,
} from "@/types";
import {
  BEGINNER_RECIPE_LIBRARY,
  CORE_RECIPE_50_NAMES as BEGINNER_CORE_RECIPE_50_NAMES,
  ONBOARDING_RECIPE_10_NAMES as BEGINNER_ONBOARDING_RECIPE_10_NAMES,
  RELEASE_RECIPE_30_NAMES as BEGINNER_RELEASE_RECIPE_30_NAMES,
  type BeginnerRecipe,
} from "./beginner-recipes.ts";

export type CuratedRecipe = RecipeDetailRecord & {
  trustLabel: string;
  featuredReason: string;
  sourceName?: string;
  sourceUrl?: string | null;
};

export const ONBOARDING_RECIPE_10_NAMES = BEGINNER_ONBOARDING_RECIPE_10_NAMES;
export const RELEASE_RECIPE_30_NAMES = BEGINNER_RELEASE_RECIPE_30_NAMES;
export const CORE_RECIPE_50_NAMES = BEGINNER_CORE_RECIPE_50_NAMES;

const DEFAULT_MEASUREMENT_TIPS = [
  "1큰술 = 밥숟가락 평평하게 1번 = 약 15ml",
  "1작은술 = 티스푼 평평하게 1번 = 약 5ml",
  "1컵 = 일반 종이컵 1컵 = 약 180ml",
  "한줌 = 한 손으로 가볍게 집히는 양 = 약 30~50g",
];

const BEGINNER_MATCH_PANTRY_STAPLES = new Set([
  "물",
]);

const JIPBAB_ORIGINAL_SOURCE: BeginnerRecipeSource = {
  sourceType: "original-general-principle",
  sourceName: "집밥노트 자체 작성",
  sourceUrl: null,
  licenseOrUsageNote: "외부 레시피 원문, 자막, 사진, 썸네일을 복제하지 않고 일반 조리 원리만 바탕으로 새로 작성",
  rightsNote: "상업 앱 본문 노출 가능하도록 집밥노트 문장으로 작성",
  imageUsageAllowed: true,
  adaptedByJipbabNote: true,
};

const REFERENCE_LINK_SAFETY: BeginnerRecipeSafety = {
  safetyLevel: "B",
  copyrightRisk: "medium",
  privacyRisk: "low",
  commercialUseRisk: "medium",
  notes: "외부 링크는 참고 출처로만 표시하고 원문, 이미지, 자막은 복사하지 않은 집밥노트 자체 재작성 콘텐츠",
  imageUsageAllowed: false,
  adaptedByJipbabNote: true,
};

function referenceSource(sourceName: string, sourceUrl: string): BeginnerRecipeSource {
  return {
    sourceType: "reference-link",
    sourceName,
    sourceUrl,
    licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
    rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
    imageUsageAllowed: false,
    adaptedByJipbabNote: true,
  };
}

function getAppSafeBeginnerRecipeSource(source: BeginnerRecipeSource): BeginnerRecipeSource {
  if (source.sourceType !== "reference-link") return source;

  return {
    ...source,
    sourceType: "original-general-principle",
    licenseOrUsageNote: "외부 링크는 메뉴 아이디어 참고용이며, 레시피 문장·계량·이미지는 집밥노트가 자체 작성·제작합니다.",
    rightsNote: "외부 원문·사진·썸네일을 복제하지 않고 집밥노트의 조리 흐름과 자체 제작 이미지만 사용합니다.",
    imageUsageAllowed: true,
    adaptedByJipbabNote: true,
  };
}

const SOY_EGG_RICE_REFERENCE_SOURCE = referenceSource(
  "만개의레시피 참고 링크: 간장계란밥",
  "https://www.10000recipe.com/recipe/6893429",
);

const GYERAN_MARI_REFERENCE_SOURCE = referenceSource(
  "만개의레시피 참고 링크: 계란말이 만드는법",
  "https://www.10000recipe.com/recipe/6916604",
);

const EGG_DROP_SOUP_REFERENCE_SOURCE = referenceSource(
  "만개의레시피 참고 링크: 달걀국/계란국",
  "https://www.10000recipe.com/recipe/6919200",
);

const SCRAMBLED_EGG_RICE_REFERENCE_SOURCE = referenceSource(
  "만개의레시피 참고 링크: 스크램블 에그 덮밥",
  "https://www.10000recipe.com/recipe/6912532",
);

const TOMATO_EGG_STIR_FRY_REFERENCE_SOURCE = referenceSource(
  "만개의레시피 참고 링크: 토마토 달걀볶음",
  "https://www.10000recipe.com/recipe/6895279",
);

const CABBAGE_EGG_JEON_REFERENCE_SOURCE = referenceSource(
  "만개의레시피 참고 링크: 양배추 계란전",
  "https://www.10000recipe.com/recipe/6889709",
);

const TUNA_GYERAN_MARI_REFERENCE_SOURCE = referenceSource(
  "만개의레시피 참고 링크: 참치 계란말이",
  "https://www.10000recipe.com/recipe/5202322",
);

const JIPBAB_ORIGINAL_SAFETY: BeginnerRecipeSafety = {
  safetyLevel: "B",
  copyrightRisk: "low",
  privacyRisk: "low",
  commercialUseRisk: "low",
  notes: "이미지는 public/images/recipes/SOURCES.md에 기록된 집밥노트용 로컬 자산만 사용",
  imageUsageAllowed: true,
  adaptedByJipbabNote: true,
};

const BEGINNER_RECIPE_VISUAL_GUIDES_ENABLED = true;

const BEGINNER_RECIPE_IMAGE_SLUGS_001_TO_176 = Array.from(
  { length: 176 },
  (_, index) => `beginner-${String(index + 1).padStart(3, "0")}`,
);

const BEGINNER_RECIPE_IMAGE_SLUGS_121_TO_176 = Array.from(
  { length: 56 },
  (_, index) => `beginner-${String(index + 121).padStart(3, "0")}`,
);

const BEGINNER_RECIPE_STEP_CARD_SLUGS_113_TO_176 = Array.from(
  { length: 64 },
  (_, index) => `beginner-${String(index + 113).padStart(3, "0")}`,
);

const IMAGEGEN_RECIPE_POSTER_SLUGS = new Set([
  "beginner-001",
  "beginner-002",
  "beginner-003",
  "beginner-004",
  "beginner-005",
  "beginner-006",
  "beginner-007",
  "beginner-008",
  "beginner-009",
  "beginner-010",
  "beginner-011",
  "beginner-012",
  "beginner-013",
  "beginner-014",
  "beginner-015",
  "beginner-016",
  "beginner-017",
  "beginner-018",
  "beginner-019",
  "beginner-020",
  "beginner-021",
  "beginner-022",
  "beginner-023",
  "beginner-024",
  "beginner-025",
  "beginner-026",
  "beginner-027",
  "beginner-028",
  "beginner-029",
  "beginner-030",
  "beginner-031",
  "beginner-032",
  "beginner-033",
  "beginner-034",
  "beginner-035",
  "beginner-036",
  "beginner-037",
  "beginner-038",
  "beginner-039",
  "beginner-040",
  "beginner-041",
  "beginner-042",
  "beginner-043",
  "beginner-044",
  "beginner-045",
  "beginner-046",
  "beginner-047",
  "beginner-048",
  "beginner-049",
  "beginner-050",
  "beginner-051",
  "beginner-052",
  "beginner-053",
  "beginner-054",
  "beginner-055",
  "beginner-056",
  "beginner-057",
  "beginner-058",
  "beginner-059",
  "beginner-060",
  "beginner-061",
  "beginner-062",
  "beginner-063",
  "beginner-064",
  "beginner-065",
  "beginner-066",
  "beginner-067",
  "beginner-068",
  "beginner-069",
  "beginner-070",
  "beginner-071",
  "beginner-072",
  "beginner-073",
  "beginner-074",
  "beginner-075",
  "beginner-076",
  "beginner-077",
  "beginner-078",
  "beginner-079",
  "beginner-080",
  "beginner-081",
  "beginner-082",
  "beginner-083",
  "beginner-084",
  "beginner-085",
  "beginner-086",
  "beginner-087",
  "beginner-088",
  "beginner-089",
  "beginner-090",
  "beginner-091",
  "beginner-092",
  "beginner-093",
  "beginner-094",
  "beginner-095",
  "beginner-096",
  "beginner-097",
  "beginner-098",
  "beginner-099",
  "beginner-100",
  "beginner-101",
  "beginner-102",
  "beginner-103",
  "beginner-104",
  "beginner-105",
  "beginner-106",
  "beginner-107",
  "beginner-108",
  "beginner-109",
  "beginner-110",
  "beginner-111",
  "beginner-112",
  "beginner-113",
  "beginner-114",
  "beginner-115",
  "beginner-116",
  "beginner-117",
  "beginner-118",
  "beginner-119",
  "beginner-120",
  ...BEGINNER_RECIPE_IMAGE_SLUGS_121_TO_176,
]);

const BEGINNER_RECIPE_STEP_CARD_IMAGE_SLUGS = new Set([
  ...BEGINNER_RECIPE_IMAGE_SLUGS_001_TO_176,
  "beginner-047",
  "beginner-048",
  "beginner-049",
  "beginner-050",
  "beginner-051",
  "beginner-052",
  "beginner-053",
  "beginner-054",
  "beginner-055",
  "beginner-056",
  "beginner-057",
  "beginner-058",
  "beginner-059",
  "beginner-060",
  "beginner-061",
  "beginner-062",
  "beginner-063",
  "beginner-064",
  "beginner-065",
  "beginner-066",
  "beginner-067",
  "beginner-068",
  "beginner-069",
  "beginner-070",
  "beginner-071",
  "beginner-072",
  "beginner-073",
  "beginner-074",
  "beginner-075",
  "beginner-076",
  "beginner-077",
  "beginner-078",
  "beginner-079",
  "beginner-080",
  "beginner-081",
  "beginner-082",
  "beginner-083",
  "beginner-084",
  "beginner-085",
  "beginner-086",
  "beginner-087",
  "beginner-088",
  "beginner-089",
  "beginner-090",
  "beginner-091",
  "beginner-092",
  "beginner-093",
  "beginner-094",
  "beginner-095",
  "beginner-096",
  "beginner-097",
  "beginner-098",
  "beginner-099",
  "beginner-100",
  "beginner-101",
  "beginner-102",
  "beginner-103",
  "beginner-104",
  "beginner-105",
  "beginner-106",
  "beginner-107",
  "beginner-108",
  "beginner-109",
  "beginner-110",
  "beginner-111",
  "beginner-112",
  ...BEGINNER_RECIPE_STEP_CARD_SLUGS_113_TO_176,
]);

const NO_FIRE_METHODS = new Set(["비비기", "무치기"]);

const inferRequiredTools = (recipe: CuratedRecipe): string[] => {
  if (recipe.name.includes("전자레인지")) {
    return ["전자레인지", "전자레인지용 그릇", "숟가락"];
  }
  if (recipe.name.includes("냉두부") || recipe.name.includes("연두부") || NO_FIRE_METHODS.has(recipe.method)) {
    return ["그릇", "숟가락"];
  }
  if (recipe.method.includes("볶") || recipe.method.includes("부치")) {
    return ["프라이팬", "뒤집개", "그릇"];
  }
  if (recipe.method.includes("끓") || recipe.method.includes("국") || recipe.method.includes("찌개")) {
    return ["냄비", "국자", "그릇"];
  }
  return ["그릇", "숟가락"];
};

const inferDifficultyLevel = (recipe: CuratedRecipe): RecipeDifficultyLevel => {
  const raw = typeof recipe.difficulty === "number" ? recipe.difficulty : Number.parseInt(String(recipe.difficulty ?? 2), 10);
  const normalized = Number.isFinite(raw) ? Math.max(1, Math.min(2, raw)) : 2;
  return normalized as RecipeDifficultyLevel;
};

const inferBeginnerScore = (recipe: CuratedRecipe): number => {
  const ingredientPenalty = Math.max(0, recipe.ingredientList.length - 5) * 2;
  const stepPenalty = Math.max(0, recipe.steps.length - 4) * 2;
  const timePenalty = Math.max(0, (recipe.cookingTime ?? 20) - 12);
  const noFireBonus = recipe.name.includes("냉두부") || recipe.name.includes("연두부") || NO_FIRE_METHODS.has(recipe.method) ? 4 : 0;
  const microwaveBonus = recipe.name.includes("전자레인지") ? 3 : 0;
  return Math.max(80, Math.min(96, 92 + noFireBonus + microwaveBonus - ingredientPenalty - timePenalty - stepPenalty));
};

const inferStepMinutes = (description: string): number | null => {
  const minuteMatch = description.match(/(\d+(?:\.\d+)?)\s*분/);
  if (minuteMatch) {
    return Number(minuteMatch[1]);
  }
  const secondMatch = description.match(/(\d+)\s*초/);
  if (secondMatch) {
    return Math.max(0.5, Number(secondMatch[1]) / 60);
  }
  return null;
};

const inferStepHeat = (recipe: CuratedRecipe, description: string): string => {
  if (recipe.name.includes("전자레인지") || description.includes("전자레인지")) {
    return "불 없음";
  }
  if (recipe.name.includes("냉두부") || recipe.name.includes("연두부") || NO_FIRE_METHODS.has(recipe.method)) {
    return "불 없음";
  }
  if (description.includes("강불")) {
    return "강불";
  }
  if (description.includes("약불")) {
    return "약불";
  }
  if (description.includes("중불")) {
    return "중불";
  }
  return "중불";
};

const enrichStepForBeginner = (recipe: CuratedRecipe, step: RecipeDetailStep, index: number): RecipeDetailStep => {
  const stepIndex = step.index ?? index + 1;
  const recipeSlug = recipe.slug;
  const fallbackImageUrl = recipe.id.startsWith("beginner-recipe-") && typeof recipeSlug === "string"
    ? getBeginnerRecipeStepCardImageBySlug(recipeSlug, stepIndex, recipe.steps.length)
    : null;

  return {
    ...step,
    index: stepIndex,
    imageUrl: step.imageUrl ?? fallbackImageUrl,
    imageAlt: step.imageAlt ?? `${recipe.name} ${stepIndex}단계`,
    heat: step.heat ?? inferStepHeat(recipe, step.description),
    minutes: step.minutes ?? inferStepMinutes(step.description) ?? 1,
    commonMistake: step.commonMistake ?? "불을 너무 세게 하거나 한 번에 많이 섞으면 기준을 놓치기 쉽습니다.",
    rescueTip: step.rescueTip ?? "타거나 짜다고 느껴지면 불을 끄고 밥, 두부, 물 중 하나로 맛을 연하게 만드세요.",
  };
};

const enrichBeginnerRecipe = (recipe: CuratedRecipe): CuratedRecipe => {
  const requiredTools = recipe.requiredTools ?? inferRequiredTools(recipe);
  const totalMinutes = recipe.totalMinutes ?? recipe.cookingTime ?? 20;
  const inferredBeginnerScore = recipe.beginnerScore ?? inferBeginnerScore(recipe);
  const beginnerScore = ONBOARDING_RECIPE_10_NAMES.some((recipeName) => recipeName === recipe.name)
    ? Math.max(88, inferredBeginnerScore)
    : inferredBeginnerScore;
  return {
    ...recipe,
    difficultyLevel: recipe.difficultyLevel ?? inferDifficultyLevel(recipe),
    beginnerScore,
    totalMinutes,
    activeMinutes: recipe.activeMinutes ?? totalMinutes,
    requiredTools,
    substituteIngredients: recipe.substituteIngredients ?? [],
    beforeStart: recipe.beforeStart ?? [
      "재료를 먼저 꺼내고 양념은 밥숟가락 기준으로 준비합니다.",
      "팬이나 냄비를 쓰는 메뉴는 불을 켜기 전에 물, 기름, 양념을 손 닿는 곳에 둡니다.",
    ],
    steps: recipe.steps.map((step, index) => enrichStepForBeginner(recipe, step, index)),
    successCheck: recipe.successCheck ?? recipe.imageCaption ?? recipe.beginnerSummary ?? "먹기 전 중심부가 충분히 익었는지 확인합니다.",
    storageTip: recipe.storageTip ?? "남은 음식은 식힌 뒤 밀폐 용기에 담아 냉장 보관하고 가능하면 다음 날 먹습니다.",
    reheatTip: recipe.reheatTip ?? "다시 데울 때는 김이 충분히 올라올 때까지 데우고 중간에 한 번 섞습니다.",
    fallbackMeal: recipe.fallbackMeal ?? "간이 세거나 모양이 무너지면 밥 위에 올려 덮밥처럼 먹습니다.",
    homeCardCopy: recipe.homeCardCopy ?? {
      title: recipe.name,
      subtitle: recipe.featuredReason,
      badge: recipe.trustLabel,
      cta: "지금 만들기",
    },
    noFire: recipe.noFire ?? requiredTools.every((tool) => tool !== "프라이팬" && tool !== "냄비"),
    microwave: recipe.microwave ?? recipe.name.includes("전자레인지"),
    source: recipe.source ?? JIPBAB_ORIGINAL_SOURCE,
    safety: recipe.safety ?? JIPBAB_ORIGINAL_SAFETY,
    reviewedForBeginner: true,
  };
};

function ingredient(
  name: string,
  display: string,
  beginnerNote?: string,
  prepNote?: string,
  required?: boolean,
): RecipeIngredientDetail {
  return {
    name,
    display,
    ...(required === undefined ? {} : { required }),
    beginnerNote: beginnerNote ?? null,
    prepNote: prepNote ?? null,
  };
}

type ReleaseRecipeDraft = {
  id: string;
  name: string;
  category: string;
  method: string;
  calories: string;
  thumbnailUrl: string;
  ingredients: Array<[name: string, display: string, beginnerNote?: string, prepNote?: string, required?: boolean]>;
  cookingTime: number;
  servings: number;
  trustLabel: string;
  featuredReason: string;
  beginnerSummary: string;
  imageCaption: string;
  steps: Array<[description: string, beginnerTip: string, visualCue: string]>;
  source?: BeginnerRecipeSource;
};

function releaseRecipe(draft: ReleaseRecipeDraft): CuratedRecipe {
  return {
    id: draft.id,
    name: draft.name,
    category: draft.category,
    method: draft.method,
    calories: draft.calories,
    thumbnailUrl: draft.thumbnailUrl,
    recipePosterImageUrl: draft.thumbnailUrl,
    recipeGuideImageUrl: draft.thumbnailUrl,
    recipePrepImageUrl: draft.thumbnailUrl,
    recipeStepsImageUrl: draft.thumbnailUrl,
    ingredients: draft.ingredients.map(([name]) => name).join(", "),
    hashTag: "#초보가능 #집밥노트 #실패복구",
    ingredientList: draft.ingredients.map(([name]) => name),
    ingredientDetails: draft.ingredients.map(([name, display, beginnerNote, prepNote, required]) =>
      ingredient(name, display, beginnerNote, prepNote, required ?? true),
    ),
    trustLabel: draft.trustLabel,
    featuredReason: draft.featuredReason,
    difficulty: 1,
    cookingTime: draft.cookingTime,
    servings: draft.servings,
    beginnerSummary: draft.beginnerSummary,
    measurementTips: DEFAULT_MEASUREMENT_TIPS,
    imageAlt: `${draft.name} 완성 예시`,
    imageCaption: draft.imageCaption,
    source: draft.source ?? JIPBAB_ORIGINAL_SOURCE,
    safety: draft.source ? REFERENCE_LINK_SAFETY : JIPBAB_ORIGINAL_SAFETY,
    steps: draft.steps.map(([description, beginnerTip, visualCue], index) => ({
      index: index + 1,
      description,
      imageUrl: null,
      beginnerTip,
      visualCue,
    })),
  };
}

const RELEASE_RECIPE_30_ADDITIONS: CuratedRecipe[] = [
  releaseRecipe({
    id: "curated-egg-drop-soup",
    name: "달걀국",
    category: "국·찌개",
    method: "끓이기",
    calories: "170",
    thumbnailUrl: "/images/recipes/beginner-food-photos/beginner-004-egg-drop-soup.png",
    ingredients: [
      ["계란", "2개", "국물에 풀면 부드럽게 익습니다."],
      ["물", "500ml", "종이컵 약 2컵 반입니다."],
      ["대파", "2큰술", "송송 썰어 마지막에 넣습니다."],
      ["국간장", "1큰술", "없으면 진간장 1큰술로 시작하세요."],
      ["소금", "1꼬집", "마지막 간 맞춤용입니다."],
    ],
    cookingTime: 10,
    servings: 2,
    trustLabel: "10분 국",
    featuredReason: "계란 2개로 바로 끓이는 가장 쉬운 국",
    beginnerSummary: "계란은 한 번에 붓지 말고 얇게 흘려 넣어야 큰 덩어리로 뭉치지 않습니다.",
    imageCaption: "계란이 노랗게 떠 있고 국물이 맑으면 완성입니다.",
    source: EGG_DROP_SOUP_REFERENCE_SOURCE,
    steps: [
      ["냄비에 물 500ml와 국간장 1큰술을 넣고 중불로 끓입니다.", "물이 끓기 전부터 간장을 넣으면 간이 고르게 퍼집니다.", "냄비 가장자리에 작은 기포가 올라오면 다음 단계입니다."],
      ["계란 2개를 그릇에 풀어 젓가락으로 20번 정도 섞습니다.", "흰자 줄이 조금 남아도 괜찮지만 큰 덩어리는 풀어주세요.", "노른자와 흰자가 노란색으로 섞이면 됩니다."],
      ["국물이 끓으면 계란물을 얇게 돌려 넣고 20초 그대로 둡니다.", "넣자마자 저으면 국물이 탁해질 수 있습니다.", "계란이 구름처럼 떠오르면 젓가락으로 한 번만 저어주세요."],
      ["대파를 넣고 맛을 본 뒤 싱거우면 소금 1꼬집으로 마무리합니다.", "짠맛은 되돌리기 어려우니 소금은 아주 조금만 넣습니다.", "계란이 하얗고 노랗게 굳으면 먹어도 됩니다."],
    ],
  }),
  releaseRecipe({
    id: "curated-scrambled-egg-rice",
    name: "스크램블에그 덮밥",
    category: "밥",
    method: "볶기",
    calories: "520",
    thumbnailUrl: "/images/recipes/jipbab-curated/soy-egg-rice.png",
    ingredients: [
      ["계란", "2개", "덮밥 한 그릇에 넉넉한 양입니다."],
      ["밥", "1공기", "즉석밥 1개도 가능합니다."],
      ["우유", "2큰술", "없으면 물 2큰술로 대체하세요."],
      ["간장", "1작은술", "마지막에 밥 가장자리로 넣습니다."],
      ["식용유", "1작은술", "팬을 얇게 코팅하는 양입니다."],
    ],
    cookingTime: 8,
    servings: 1,
    trustLabel: "계란 한끼",
    featuredReason: "계란을 부드럽게 익혀 밥 위에 올리는 덮밥",
    beginnerSummary: "스크램블은 다 익기 전에 불을 끄면 남은 열로 촉촉하게 마무리됩니다.",
    imageCaption: "계란 표면이 살짝 촉촉할 때 밥 위에 올리면 부드럽습니다.",
    steps: [
      ["계란 2개와 우유 2큰술을 그릇에 넣고 잘 풉니다.", "우유가 없으면 물을 넣어도 퍽퍽함이 줄어듭니다.", "계란물이 연한 노란색으로 고르게 섞이면 됩니다."],
      ["팬에 식용유 1작은술을 두르고 약불로 30초 데웁니다.", "팬이 너무 뜨거우면 계란이 바로 굳습니다.", "기름이 팬 바닥에 얇게 퍼지면 충분합니다."],
      ["계란물을 붓고 젓가락으로 천천히 밀어가며 1분 익힙니다.", "빠르게 휘젓기보다 가장자리에서 가운데로 밀어주세요.", "계란이 몽글몽글하지만 윤기가 남아 있으면 됩니다."],
      ["밥 위에 계란을 올리고 간장 1작은술을 가장자리로 둘러 마무리합니다.", "싱거우면 간장을 1작은술만 더 추가하세요.", "밥과 계란을 섞었을 때 질척하지 않으면 완성입니다."],
    ],
  }),
  releaseRecipe({
    id: "curated-ham-vegetable-fried-rice",
    name: "햄야채볶음밥",
    category: "밥",
    method: "볶기",
    calories: "560",
    thumbnailUrl: "/images/recipes/beginner-food-photos/beginner-016-ham-vegetable-fried-rice.png",
    ingredients: [
      ["밥", "1공기", "찬밥이면 더 고슬고슬합니다."],
      ["햄", "1/3캔", "스팸이나 슬라이스햄 모두 가능합니다."],
      ["양파", "1/4개", "작게 썰수록 빨리 익습니다."],
      ["계란", "1개", "볶음밥을 부드럽게 잡아줍니다."],
      ["간장", "1큰술", "팬 가장자리로 넣으면 향이 납니다."],
    ],
    cookingTime: 15,
    servings: 1,
    trustLabel: "팬 1개",
    featuredReason: "햄과 남은 채소로 만드는 기본 볶음밥",
    beginnerSummary: "밥을 넣기 전에 햄과 양파를 먼저 볶아야 물기가 줄고 질척하지 않습니다.",
    imageCaption: "밥알이 따로 움직이고 햄 가장자리가 노릇하면 완성입니다.",
    steps: [
      ["햄과 양파를 새끼손톱 크기로 작게 자릅니다.", "크기가 작을수록 익는 시간이 짧아 실패가 줄어듭니다.", "햄과 양파 크기가 비슷하면 볶기 쉽습니다."],
      ["팬에 햄과 양파를 넣고 중불에서 3분 볶습니다.", "햄에서 기름이 나오면 식용유를 많이 넣지 않아도 됩니다.", "양파가 투명해지고 햄 가장자리가 갈색이면 됩니다."],
      ["밥 1공기를 넣고 주걱으로 눌러 풀며 2분 볶습니다.", "밥덩어리가 크면 불을 잠깐 약하게 줄이세요.", "밥알에 햄 기름이 고르게 묻으면 됩니다."],
      ["계란 1개와 간장 1큰술을 넣고 1분 더 볶아 마무리합니다.", "계란이 팬 바닥에 눌기 전에 밥과 섞어주세요.", "계란이 익고 밥이 고슬고슬하면 완성입니다."],
    ],
  }),
  releaseRecipe({
    id: "curated-kimchi-rice-bowl",
    name: "김치덮밥",
    category: "밥",
    method: "볶기",
    calories: "480",
    thumbnailUrl: "/images/recipes/kimchi-fried-rice.png",
    ingredients: [
      ["김치", "1컵", "가위로 잘게 잘라도 됩니다."],
      ["밥", "1공기", "따뜻한 밥이면 바로 올릴 수 있습니다."],
      ["계란", "1개", "프라이로 올리면 간이 부드러워집니다."],
      ["설탕", "1작은술", "신김치의 신맛을 줄입니다."],
      ["참기름", "1작은술", "마지막 향내기용입니다."],
    ],
    cookingTime: 12,
    servings: 1,
    trustLabel: "김치 활용",
    featuredReason: "볶음밥보다 쉬운 김치 한 그릇",
    beginnerSummary: "밥을 같이 볶지 않고 김치만 볶아 올리면 눌어붙을 걱정이 줄어듭니다.",
    imageCaption: "김치가 부드럽고 국물이 자작하게 남으면 밥 위에 올리기 좋습니다.",
    steps: [
      ["김치를 1cm 크기로 자르고 설탕 1작은술을 섞습니다.", "신김치일수록 설탕이 신맛을 줄여줍니다.", "김치 조각이 숟가락에 잘 올라가면 됩니다."],
      ["팬에 김치를 넣고 중불에서 4분 볶습니다.", "타기 시작하면 물 2큰술을 넣어주세요.", "김치 색이 진해지고 줄기가 부드러워지면 됩니다."],
      ["따뜻한 밥 1공기를 그릇에 담고 볶은 김치를 올립니다.", "밥은 전자레인지로 데우면 덮밥이 더 맛있습니다.", "김치가 밥 위를 반 정도 덮으면 간이 적당합니다."],
      ["계란프라이와 참기름 1작은술을 올려 마무리합니다.", "계란이 어렵다면 김가루만 올려도 됩니다.", "밥과 섞었을 때 짜면 밥을 조금 더 넣으세요."],
    ],
  }),
  releaseRecipe({
    id: "curated-rice-balls",
    name: "주먹밥",
    category: "밥",
    method: "비비기",
    calories: "430",
    thumbnailUrl: "/images/recipes/jipbab-curated/soy-egg-rice.png",
    ingredients: [
      ["밥", "1공기", "따뜻할 때 뭉치기 쉽습니다."],
      ["김", "2장", "조미김 1봉도 가능합니다."],
      ["참치캔", "1/2캔", "기름을 빼면 덜 질척합니다."],
      ["참기름", "1작은술", "고소한 향을 냅니다."],
      ["소금", "1꼬집", "간이 부족할 때만 넣습니다."],
    ],
    cookingTime: 8,
    servings: 1,
    trustLabel: "불 없이",
    featuredReason: "불 없이 손으로 뭉치는 간단 한끼",
    beginnerSummary: "밥이 너무 뜨거우면 손을 데일 수 있으니 1분 식힌 뒤 비닐장갑을 끼고 뭉치세요.",
    imageCaption: "손에 밥알이 많이 묻지 않고 동그랗게 잡히면 완성입니다.",
    steps: [
      ["참치캔 기름을 빼고 김은 잘게 부숩니다.", "캔 뚜껑으로 참치를 눌러 기름을 빼면 쉽습니다.", "참치에 기름이 고이지 않으면 됩니다."],
      ["밥에 참치, 김, 참기름 1작은술을 넣고 섞습니다.", "뜨거운 밥은 1분 식힌 뒤 섞어주세요.", "밥알 전체에 김이 고르게 보이면 됩니다."],
      ["맛을 보고 싱거우면 소금 1꼬집만 넣습니다.", "조미김을 쓰면 이미 짤 수 있으니 먼저 맛을 보세요.", "짠맛이 약하게 느껴지는 정도가 좋습니다."],
      ["비닐장갑을 끼고 한입 크기로 꾹 눌러 뭉칩니다.", "잘 안 뭉치면 밥을 조금 더 따뜻하게 데우세요.", "들었을 때 부서지지 않으면 완성입니다."],
    ],
  }),
  releaseRecipe({
    id: "curated-pan-fried-tofu",
    name: "두부부침",
    category: "반찬",
    method: "부치기",
    calories: "260",
    thumbnailUrl: "/images/recipes/jipbab-curated/dubu-jorim-basic.png",
    ingredients: [
      ["두부", "1모", "부침용 두부가 가장 쉽습니다."],
      ["소금", "1꼬집", "두부 밑간용입니다."],
      ["식용유", "1큰술", "팬을 코팅하는 양입니다."],
      ["간장", "1큰술", "찍어 먹는 양념입니다."],
      ["대파", "1큰술", "양념에 넣으면 향이 납니다."],
    ],
    cookingTime: 15,
    servings: 2,
    trustLabel: "두부 기본",
    featuredReason: "두부 한 모로 바로 만드는 쉬운 반찬",
    beginnerSummary: "두부 물기를 키친타월로 닦아야 기름이 덜 튀고 모양이 덜 부서집니다.",
    imageCaption: "두부 겉면이 연한 갈색이고 가운데가 따뜻하면 완성입니다.",
    steps: [
      ["두부를 손가락 두께로 자르고 키친타월로 물기를 닦습니다.", "물기가 많으면 기름이 튈 수 있습니다.", "두부 표면에 물방울이 거의 없으면 됩니다."],
      ["두부 양면에 소금 1꼬집을 나눠 뿌립니다.", "소금을 많이 뿌리면 짜니 아주 조금만 씁니다.", "두부 표면에 소금 알갱이가 살짝 보이면 충분합니다."],
      ["팬에 식용유 1큰술을 두르고 중불에서 두부를 3분 부칩니다.", "뒤집기 전까지 자주 만지지 마세요.", "가장자리가 연한 갈색이면 뒤집을 때입니다."],
      ["뒤집어 3분 더 부치고 간장과 대파를 섞어 곁들입니다.", "부서지면 그대로 밥 위에 올려도 맛있습니다.", "양면이 단단하게 잡히면 완성입니다."],
    ],
  }),
  releaseRecipe({
    id: "curated-soft-tofu-soy-bowl",
    name: "연두부 간장비빔",
    category: "반찬",
    method: "비비기",
    calories: "180",
    thumbnailUrl: "/images/recipes/jipbab-curated/dubu-jorim-basic.png",
    ingredients: [
      ["연두부", "1팩", "차갑게 먹어도 됩니다."],
      ["간장", "1큰술", "짠맛의 기준입니다."],
      ["참기름", "1작은술", "고소한 향을 냅니다."],
      ["참깨", "1작은술", "없으면 생략 가능합니다."],
      ["대파", "1큰술", "생략해도 됩니다."],
    ],
    cookingTime: 5,
    servings: 1,
    trustLabel: "불 없이",
    featuredReason: "포장만 뜯으면 완성되는 초저난도 반찬",
    beginnerSummary: "연두부는 쉽게 깨지므로 숟가락으로 크게 떠서 그릇에 옮기면 모양이 덜 무너집니다.",
    imageCaption: "간장이 바닥에 살짝 고이고 김이 위에 올라가면 완성입니다.",
    steps: [
      ["연두부 포장을 열고 물을 조심히 따라냅니다.", "두부가 떨어질 수 있으니 싱크대 위에서 여세요.", "포장 안에 물이 거의 남지 않으면 됩니다."],
      ["연두부를 숟가락으로 크게 떠서 그릇에 담습니다.", "한 번에 뒤집으려다 깨져도 먹는 데 문제없습니다.", "두부가 그릇 중앙에 모이면 됩니다."],
      ["간장 1큰술과 참기름 1작은술을 두부 위에 뿌립니다.", "간장은 처음부터 많이 넣지 마세요.", "간장이 두부 옆으로 살짝 흘러내리면 충분합니다."],
      ["김과 대파를 올리고 숟가락으로 크게 떠 먹습니다.", "짰다면 밥 위에 올려 덮밥처럼 먹으면 됩니다.", "두부가 차갑고 고소하게 느껴지면 완성입니다."],
    ],
  }),
  releaseRecipe({
    id: "curated-soondubu-egg-soup",
    name: "순두부계란탕",
    category: "국·찌개",
    method: "끓이기",
    calories: "240",
    thumbnailUrl: "/images/recipes/jipbab-curated/doenjang-jjigae-basic.png",
    ingredients: [
      ["순두부", "1팩", "봉지째 반으로 잘라 넣으면 쉽습니다."],
      ["계란", "1개", "마지막에 넣어 부드럽게 익힙니다."],
      ["물", "400ml", "종이컵 약 2컵입니다."],
      ["국간장", "1큰술", "기본 간입니다."],
      ["대파", "2큰술", "마지막 향내기용입니다."],
    ],
    cookingTime: 12,
    servings: 2,
    trustLabel: "부드러운 국",
    featuredReason: "순두부와 계란으로 부담 없이 끓이는 탕",
    beginnerSummary: "순두부는 오래 저으면 잘게 부서지니 넣은 뒤에는 크게 한두 번만 저어주세요.",
    imageCaption: "순두부가 따뜻하고 계란 흰자가 하얗게 익으면 완성입니다.",
    steps: [
      ["냄비에 물 400ml와 국간장 1큰술을 넣고 끓입니다.", "간은 마지막에 다시 맞출 수 있으니 처음엔 1큰술만 넣습니다.", "물이 보글보글 끓으면 다음 단계입니다."],
      ["순두부를 넣고 숟가락으로 큰 덩어리만 나눕니다.", "잘게 으깨지 않아도 먹기 좋습니다.", "두부 덩어리가 숟가락 크기면 됩니다."],
      ["중불에서 5분 끓인 뒤 계란 1개를 넣습니다.", "계란을 넣고 바로 세게 젓지 마세요.", "흰자가 하얗게 변하면 익고 있는 상태입니다."],
      ["대파를 넣고 1분 더 끓인 뒤 맛을 봅니다.", "싱거우면 국간장 1작은술만 더 넣으세요.", "국물이 뜨겁고 계란이 흐르지 않으면 완성입니다."],
    ],
  }),
  releaseRecipe({
    id: "curated-bean-sprout-muchim",
    name: "콩나물무침",
    category: "반찬",
    method: "무치기",
    calories: "120",
    thumbnailUrl: "/images/recipes/jipbab-curated/bean-sprout-soup.png",
    ingredients: [
      ["콩나물", "1봉", "씻어서 물기를 빼고 사용합니다."],
      ["소금", "1/3작은술", "삶을 때와 무칠 때 나눠 씁니다."],
      ["참기름", "1작은술", "마지막 향내기용입니다."],
      ["다진마늘", "1/2작은술", "없으면 생략 가능합니다."],
      ["대파", "1큰술", "색과 향을 냅니다."],
    ],
    cookingTime: 12,
    servings: 2,
    trustLabel: "기본 반찬",
    featuredReason: "콩나물 한 봉지로 만드는 쉬운 나물",
    beginnerSummary: "콩나물은 뚜껑을 열고 삶으면 비린내 걱정이 적고 익은 정도를 보기 쉽습니다.",
    imageCaption: "콩나물 줄기가 반투명하고 아삭하게 휘어지면 완성입니다.",
    steps: [
      ["콩나물을 흐르는 물에 씻고 지저분한 껍질을 골라냅니다.", "뿌리를 전부 다듬지 않아도 괜찮습니다.", "물에 떠다니는 껍질이 줄면 됩니다."],
      ["끓는 물에 소금 한 꼬집을 넣고 콩나물을 4분 삶습니다.", "처음이면 뚜껑을 열고 삶는 편이 안전합니다.", "콩나물이 살짝 투명해지면 익은 상태입니다."],
      ["찬물에 10초 헹군 뒤 체에 밭쳐 물기를 뺍니다.", "물기가 많으면 양념이 싱거워집니다.", "손으로 잡았을 때 물이 뚝뚝 떨어지지 않으면 됩니다."],
      ["참기름, 다진마늘, 대파, 소금을 넣고 살살 무칩니다.", "세게 주무르면 콩나물이 부러집니다.", "양념이 고르게 묻고 고소한 향이 나면 완성입니다."],
    ],
  }),
  releaseRecipe({
    id: "curated-gamja-bokkeum",
    name: "감자볶음",
    category: "반찬",
    method: "볶기",
    calories: "250",
    thumbnailUrl: "/images/recipes/beginner-food-photos/beginner-034-gamja-guk.png",
    ingredients: [
      ["감자", "2개", "얇게 썰수록 빨리 익습니다."],
      ["양파", "1/4개", "단맛을 더합니다."],
      ["소금", "1/3작은술", "처음 간은 적게 합니다."],
      ["식용유", "1큰술", "팬 코팅용입니다."],
      ["후추", "1꼬집", "생략 가능합니다."],
    ],
    cookingTime: 15,
    servings: 2,
    trustLabel: "감자 기본",
    featuredReason: "감자 2개로 만드는 도시락 반찬",
    beginnerSummary: "감자를 너무 두껍게 썰면 겉은 타고 속은 덜 익으니 얇은 막대 모양으로 썰어주세요.",
    imageCaption: "감자가 젓가락으로 눌렀을 때 부드럽게 들어가면 완성입니다.",
    steps: [
      ["감자는 얇은 막대 모양으로 썰고 물에 3분 담급니다.", "전분을 빼면 팬에 덜 달라붙습니다.", "물이 살짝 뿌옇게 변하면 충분합니다."],
      ["감자 물기를 빼고 키친타월로 겉물을 닦습니다.", "물기가 많으면 기름이 튈 수 있습니다.", "감자 표면이 축축하지 않으면 됩니다."],
      ["팬에 식용유를 두르고 감자를 중불에서 6분 볶습니다.", "자주 뒤집기보다 1분마다 섞어주세요.", "감자 가장자리가 투명해지면 익고 있습니다."],
      ["양파와 소금을 넣고 3분 더 볶아 후추로 마무리합니다.", "덜 익었으면 물 2큰술을 넣고 2분 더 익히세요.", "감자가 휘어지고 부드러우면 완성입니다."],
    ],
  }),
  releaseRecipe({
    id: "curated-gamja-guk",
    name: "감자국",
    category: "국·찌개",
    method: "끓이기",
    calories: "190",
    thumbnailUrl: "/images/recipes/jipbab-curated/gamja-jorim-basic.png",
    ingredients: [
      ["감자", "2개", "얇게 썰면 빨리 익습니다."],
      ["계란", "1개", "마지막에 풀어 넣습니다."],
      ["물", "600ml", "종이컵 약 3컵입니다."],
      ["국간장", "1큰술", "기본 간입니다."],
      ["대파", "2큰술", "마지막 향내기용입니다."],
    ],
    cookingTime: 15,
    servings: 2,
    trustLabel: "쉬운 국",
    featuredReason: "감자와 계란으로 끓이는 담백한 국",
    beginnerSummary: "감자는 얇게 썰어야 10분 안에 속까지 익고 국물이 탁해지지 않습니다.",
    imageCaption: "감자 가장자리가 투명하고 젓가락이 들어가면 완성입니다.",
    steps: [
      ["감자는 반달 모양으로 얇게 썰고 계란은 풀어둡니다.", "감자가 두꺼우면 익는 시간이 길어집니다.", "감자 두께가 동전 2개 정도면 좋습니다."],
      ["냄비에 물과 감자를 넣고 중불에서 8분 끓입니다.", "처음부터 감자를 넣어야 속까지 익습니다.", "감자 가장자리가 투명해지면 됩니다."],
      ["국간장 1큰술을 넣고 계란물을 얇게 돌려 붓습니다.", "계란을 넣고 20초 기다린 뒤 저어주세요.", "계란이 노랗게 떠오르면 됩니다."],
      ["대파를 넣고 1분 더 끓인 뒤 맛을 봅니다.", "싱거우면 소금 한 꼬집만 넣으세요.", "감자가 부드럽고 국물이 뜨거우면 완성입니다."],
    ],
  }),
  releaseRecipe({
    id: "curated-tuna-kimchi-jjigae",
    name: "참치김치찌개",
    category: "국·찌개",
    method: "끓이기",
    calories: "360",
    thumbnailUrl: "/images/recipes/beginner-food-photos/beginner-047-tuna-kimchi-jjigae.png",
    ingredients: [
      ["김치", "1컵", "신김치면 더 맛이 납니다."],
      ["참치캔", "1/2캔", "기름은 1큰술만 남기면 덜 느끼합니다."],
      ["물", "2컵", "국물 양의 기준입니다."],
      ["국간장", "1큰술", "처음에는 1큰술만 넣고 마지막에 맛을 봅니다."],
      ["두부", "1/2모", "없으면 생략 가능합니다.", undefined, false],
      ["대파", "2큰술", "마지막 향내기용입니다.", undefined, false],
    ],
    cookingTime: 18,
    servings: 2,
    trustLabel: "캔 찌개",
    featuredReason: "참치캔과 김치로 끓이는 초보자 찌개",
    beginnerSummary: "참치는 오래 끓이면 부서지므로 김치를 먼저 끓인 뒤 마지막 쪽에 넣습니다.",
    imageCaption: "김치가 부드럽고 참치 향이 국물에 섞이면 완성입니다.",
    steps: [
      ["김치를 한입 크기로 자르고 냄비에 넣습니다.", "가위로 잘라도 충분합니다.", "김치가 숟가락에 올라가는 크기면 됩니다."],
      ["물 2컵을 넣고 중불에서 7분 끓입니다.", "김치가 딱딱하면 2분 더 끓여도 됩니다.", "김치 줄기가 휘어지면 부드러워진 상태입니다."],
      ["참치와 두부가 있으면 넣고 3분 더 끓입니다.", "참치는 너무 많이 젓지 않아야 덜 부서집니다.", "두부가 뜨겁고 국물이 다시 끓으면 됩니다."],
      ["국간장 1큰술과 대파가 있으면 넣고 맛을 봅니다.", "싱거우면 국간장 1작은술만 더 넣으세요.", "밥에 올렸을 때 간이 맞으면 완성입니다."],
    ],
  }),
  releaseRecipe({
    id: "curated-spam-kimchi-bokkeum",
    name: "스팸김치볶음",
    category: "반찬",
    method: "볶기",
    calories: "420",
    thumbnailUrl: "/images/recipes/beginner-food-photos/beginner-049-spam-kimchi-bokkeum.png",
    ingredients: [
      ["스팸", "1/3캔", "작은 깍둑 모양으로 자릅니다."],
      ["김치", "1컵", "잘게 자르면 먹기 쉽습니다."],
      ["식용유", "1작은술", "스팸에서 기름이 나오면 생략해도 됩니다.", undefined, false],
      ["양파", "1/4개", "단맛을 더합니다.", undefined, false],
      ["설탕", "1/2작은술", "신맛을 줄입니다.", undefined, false],
      ["참기름", "1작은술", "마지막 향내기용입니다.", undefined, false],
    ],
    cookingTime: 12,
    servings: 2,
    trustLabel: "밥반찬",
    featuredReason: "스팸과 김치로 만드는 실패 적은 반찬",
    beginnerSummary: "스팸이 짜기 때문에 간장은 넣지 않고 김치와 설탕만으로 맛을 맞춥니다.",
    imageCaption: "김치가 부드럽고 스팸 가장자리가 갈색이면 완성입니다.",
    steps: [
      ["스팸은 깍둑썰고 김치와 양파는 작게 자릅니다.", "스팸이 크면 짠맛이 한쪽에 몰립니다.", "재료가 숟가락에 올라가는 크기면 됩니다."],
      ["팬에 스팸을 넣고 중불에서 2분 볶습니다.", "스팸에서 기름이 나와 식용유가 없어도 됩니다.", "스팸 가장자리가 살짝 갈색이면 됩니다."],
      ["김치, 양파, 설탕을 넣고 5분 볶습니다.", "타면 물 2큰술을 넣어주세요.", "김치 색이 진해지고 양파가 투명해지면 됩니다."],
      ["불을 끄고 참기름 1작은술을 넣어 섞습니다.", "짜면 밥 위에 올려 덮밥처럼 먹으면 됩니다.", "기름 향이 올라오면 완성입니다."],
    ],
  }),
  releaseRecipe({
    id: "curated-eomuk-tang",
    name: "어묵탕",
    category: "국·찌개",
    method: "끓이기",
    calories: "260",
    thumbnailUrl: "/images/recipes/beginner-food-photos/beginner-052-eomuk-tang.png",
    ingredients: [
      ["어묵", "3장", "한입 크기로 자릅니다."],
      ["물", "2컵", "국물 양의 기준입니다."],
      ["무", "1/2컵", "없으면 생략 가능합니다.", undefined, false],
      ["국간장", "1큰술", "기본 간입니다."],
      ["대파", "2큰술", "마지막 향내기용입니다.", undefined, false],
    ],
    cookingTime: 18,
    servings: 2,
    trustLabel: "따뜻한 국",
    featuredReason: "어묵만 있으면 끓일 수 있는 쉬운 국물",
    beginnerSummary: "어묵은 이미 익은 식품이라 오래 끓일 필요가 없고, 무가 익은 뒤 넣으면 됩니다.",
    imageCaption: "어묵이 부풀고 국물이 따뜻하게 우러나면 완성입니다.",
    steps: [
      ["어묵과 무를 한입 크기로 자릅니다.", "어묵은 가위로 잘라도 됩니다.", "조각이 숟가락에 올라가는 크기면 됩니다."],
      ["냄비에 물과 무를 넣고 중불에서 10분 끓입니다.", "무가 없으면 이 단계를 5분으로 줄이세요.", "무 가장자리가 투명해지면 됩니다."],
      ["어묵과 국간장 1큰술을 넣고 5분 끓입니다.", "어묵은 오래 끓이면 너무 불 수 있습니다.", "어묵이 살짝 부풀면 됩니다."],
      ["대파를 넣고 맛을 본 뒤 싱거우면 소금 한 꼬집을 더합니다.", "짜면 물을 조금 추가하세요.", "국물이 뜨겁고 어묵이 부드러우면 완성입니다."],
    ],
  }),
  releaseRecipe({
    id: "curated-doenjang-dubu-guk",
    name: "된장두부국",
    category: "국·찌개",
    method: "끓이기",
    calories: "210",
    thumbnailUrl: "/images/recipes/jipbab-curated/doenjang-jjigae-basic.png",
    ingredients: [
      ["된장", "1큰술", "처음에는 적게 풀고 맛을 봅니다."],
      ["두부", "1/2모", "숟가락 크기로 자릅니다."],
      ["물", "600ml", "종이컵 약 3컵입니다."],
      ["애호박", "1/3개", "없으면 양파로 대체 가능합니다.", undefined, false],
      ["대파", "2큰술", "마지막에 넣습니다.", undefined, false],
    ],
    cookingTime: 15,
    servings: 2,
    trustLabel: "된장 기본",
    featuredReason: "두부와 된장으로 끓이는 쉬운 국",
    beginnerSummary: "된장은 한 번에 많이 넣지 말고 1큰술부터 풀어야 짜지 않습니다.",
    imageCaption: "된장이 풀려 국물이 탁한 베이지색이고 두부가 뜨거우면 완성입니다.",
    steps: [
      ["냄비에 물 600ml를 넣고 된장 1큰술을 풀어 끓입니다.", "된장이 덩어리로 남으면 숟가락으로 눌러 풀어주세요.", "국물이 고르게 베이지색이면 됩니다."],
      ["애호박을 넣고 중불에서 5분 끓입니다.", "애호박이 없으면 양파를 넣어도 됩니다.", "애호박 가장자리가 투명해지면 됩니다."],
      ["두부를 넣고 4분 더 끓입니다.", "두부를 넣은 뒤 세게 젓지 마세요.", "두부가 국물 위로 살짝 떠오르면 따뜻해진 상태입니다."],
      ["대파를 넣고 맛을 본 뒤 짜면 물을 조금 더합니다.", "싱거우면 된장 1작은술만 추가하세요.", "밥과 먹었을 때 간이 맞으면 완성입니다."],
    ],
  }),
  releaseRecipe({
    id: "curated-kimchi-guk",
    name: "김치국",
    category: "국·찌개",
    method: "끓이기",
    calories: "180",
    thumbnailUrl: "/images/recipes/kimchi-fried-rice.png",
    ingredients: [
      ["김치", "1컵", "신김치가 잘 어울립니다."],
      ["물", "700ml", "종이컵 약 3컵 반입니다."],
      ["두부", "1/2모", "없으면 생략 가능합니다."],
      ["국간장", "1큰술", "기본 간입니다."],
      ["대파", "2큰술", "마지막 향내기용입니다."],
    ],
    cookingTime: 15,
    servings: 2,
    trustLabel: "김치 국물",
    featuredReason: "김치만 있어도 끓이는 시원한 국",
    beginnerSummary: "김치는 충분히 끓여야 신맛이 부드러워지고 국물 맛이 납니다.",
    imageCaption: "김치 줄기가 부드럽고 국물이 붉게 우러나면 완성입니다.",
    steps: [
      ["김치를 한입 크기로 자르고 냄비에 넣습니다.", "가위로 잘라도 됩니다.", "김치 조각이 숟가락에 올라가면 됩니다."],
      ["물 700ml를 넣고 중불에서 10분 끓입니다.", "김치가 덜 익으면 맛이 날카로울 수 있습니다.", "김치 줄기가 휘어지면 부드러워진 상태입니다."],
      ["두부와 국간장 1큰술을 넣고 3분 더 끓입니다.", "국간장은 짜니 처음엔 1큰술만 넣습니다.", "두부가 뜨거워지고 국물이 다시 끓으면 됩니다."],
      ["대파를 넣고 맛을 본 뒤 물이나 김치국물로 조절합니다.", "짜면 물, 싱거우면 김치국물을 조금 넣으세요.", "밥과 먹기 좋은 간이면 완성입니다."],
    ],
  }),
  releaseRecipe({
    id: "curated-soy-bibim-guksu",
    name: "간장비빔국수",
    category: "일품",
    method: "비비기",
    calories: "430",
    thumbnailUrl: "/images/recipes/jipbab-curated/bibim-guksu.png",
    ingredients: [
      ["소면", "1인분", "500원 동전 굵기 정도입니다."],
      ["간장", "1큰술", "양념의 기본입니다."],
      ["참기름", "1작은술", "고소한 향을 냅니다."],
      ["설탕", "1작은술", "단맛을 맞춥니다."],
      ["김", "1장", "잘게 부숴 올립니다."],
    ],
    cookingTime: 12,
    servings: 1,
    trustLabel: "맵지 않은 면",
    featuredReason: "고추장 없이 만드는 초보자 비빔국수",
    beginnerSummary: "면은 삶은 뒤 찬물에 충분히 헹궈야 끈적이지 않고 양념이 깔끔하게 묻습니다.",
    imageCaption: "면이 갈색 양념으로 고르게 코팅되면 완성입니다.",
    steps: [
      ["끓는 물에 소면을 넣고 3분 삶습니다.", "물이 넘치려 하면 찬물 반 컵을 넣으세요.", "면 한 가닥을 먹어 봤을 때 딱딱한 심이 없으면 됩니다."],
      ["삶은 면을 찬물에 20초 헹구고 물기를 뺍니다.", "전분을 씻어내야 면이 달라붙지 않습니다.", "손으로 만졌을 때 미끈함이 줄면 됩니다."],
      ["간장, 참기름, 설탕을 그릇에 섞습니다.", "양념은 2/3만 먼저 넣어도 됩니다.", "설탕 알갱이가 거의 녹으면 됩니다."],
      ["면과 양념을 비빈 뒤 김을 올립니다.", "짜면 면이나 오이를 조금 더 넣어주세요.", "면 전체가 반짝이면 완성입니다."],
    ],
  }),
  releaseRecipe({
    id: "curated-kimchi-ramyeon",
    name: "김치라면",
    category: "일품",
    method: "끓이기",
    calories: "540",
    thumbnailUrl: "/images/recipes/kimchi-fried-rice.png",
    ingredients: [
      ["라면", "1봉", "기본 봉지라면 기준입니다."],
      ["김치", "1/2컵", "잘게 자르면 먹기 쉽습니다."],
      ["계란", "1개", "선택이지만 부드러워집니다."],
      ["대파", "1큰술", "없으면 생략 가능합니다."],
      ["물", "550ml", "라면 봉지 기준을 우선합니다."],
    ],
    cookingTime: 8,
    servings: 1,
    trustLabel: "초간단",
    featuredReason: "라면에 김치를 더해 한 끼로 만드는 메뉴",
    beginnerSummary: "김치를 먼저 넣고 끓이면 신맛이 국물에 풀리고, 계란은 마지막에 넣어야 부드럽습니다.",
    imageCaption: "면이 풀리고 계란 흰자가 하얗게 익으면 완성입니다.",
    steps: [
      ["냄비에 물과 김치를 넣고 중불에서 끓입니다.", "김치가 크면 가위로 잘라 넣으세요.", "물이 붉게 끓기 시작하면 됩니다."],
      ["라면 스프와 면을 넣고 3분 끓입니다.", "면을 억지로 누르지 말고 풀릴 때까지 기다리세요.", "면이 젓가락으로 들리면 풀린 상태입니다."],
      ["계란 1개를 넣고 40초 그대로 둡니다.", "국물을 맑게 먹고 싶으면 계란을 휘젓지 마세요.", "흰자가 하얗게 변하면 익고 있습니다."],
      ["대파를 넣고 면 익힘을 확인한 뒤 불을 끕니다.", "덜 익었으면 30초만 더 끓이세요.", "면 가운데 딱딱함이 없으면 완성입니다."],
    ],
  }),
  releaseRecipe({
    id: "curated-microwave-butter-potato",
    name: "전자레인지 감자버터",
    category: "일품",
    method: "전자레인지",
    calories: "290",
    thumbnailUrl: "/images/recipes/jipbab-curated/gamja-jorim-basic.png",
    ingredients: [
      ["감자", "1개", "중간 크기 1개입니다."],
      ["버터", "1조각", "밥숟가락 1/2큰술 정도입니다."],
      ["소금", "1꼬집", "마지막 간입니다."],
      ["후추", "1꼬집", "생략 가능합니다."],
      ["치즈", "1장", "없으면 빼도 됩니다."],
    ],
    cookingTime: 8,
    servings: 1,
    trustLabel: "전자레인지",
    featuredReason: "불 없이 감자 하나로 만드는 간식 겸 한끼",
    beginnerSummary: "감자는 젓가락으로 찔러 보고 딱딱하면 1분씩 추가로 돌리면 됩니다.",
    imageCaption: "감자 속이 포슬하고 버터가 녹으면 완성입니다.",
    steps: [
      ["감자를 깨끗이 씻고 포크로 5번 찌릅니다.", "구멍을 내야 전자레인지에서 터질 위험이 줄어듭니다.", "감자 표면에 작은 구멍이 보이면 됩니다."],
      ["젖은 키친타월로 감자를 감싸 전자레인지에 4분 돌립니다.", "마른 상태보다 촉촉하게 익습니다.", "감자가 뜨거워지고 껍질이 살짝 주름지면 됩니다."],
      ["젓가락으로 찔러 보고 딱딱하면 1분 더 돌립니다.", "한 번에 오래 돌리기보다 1분씩 추가하세요.", "젓가락이 가운데까지 들어가면 익은 상태입니다."],
      ["반을 갈라 버터, 소금, 후추, 치즈를 올립니다.", "너무 뜨거우니 장갑이나 집게를 쓰세요.", "버터가 녹아 감자에 스며들면 완성입니다."],
    ],
  }),
  releaseRecipe({
    id: "curated-cold-tofu",
    name: "냉두부",
    category: "반찬",
    method: "비비기",
    calories: "160",
    thumbnailUrl: "/images/recipes/jipbab-curated/dubu-jorim-basic.png",
    ingredients: [
      ["두부", "1/2모", "부드러운 찌개두부도 가능합니다."],
      ["간장", "1큰술", "짜면 줄여도 됩니다."],
      ["참기름", "1작은술", "고소한 향을 냅니다.", undefined, false],
      ["참깨", "1작은술", "없으면 생략 가능합니다.", undefined, false],
      ["대파", "1큰술", "없으면 생략 가능합니다.", undefined, false],
    ],
    cookingTime: 5,
    servings: 1,
    trustLabel: "불 없이",
    featuredReason: "처음 요리하는 날에도 바로 성공하는 반찬",
    beginnerSummary: "두부는 꺼내서 물만 빼면 먹을 수 있어 첫 성공 경험을 만들기 좋습니다.",
    imageCaption: "두부 위에 양념과 대파나 참깨가 올라가면 바로 먹을 수 있습니다.",
    steps: [
      ["두부 포장을 열고 물을 따라냅니다.", "싱크대 위에서 열면 흘려도 정리하기 쉽습니다.", "포장 안에 물이 거의 없으면 됩니다."],
      ["두부를 접시에 옮기고 먹기 좋은 크기로 자릅니다.", "모양이 무너져도 괜찮습니다.", "숟가락으로 떠먹기 좋은 크기면 됩니다."],
      ["간장과 참기름을 두부 위에 뿌립니다.", "간장은 1큰술만 먼저 넣고 맛을 보세요.", "양념이 두부 옆으로 살짝 흐르면 충분합니다."],
      ["대파나 참깨가 있으면 조금 올리고 한입 맛본 뒤 남은 간장을 찍어 먹습니다.", "간장은 처음부터 전부 붓지 말고 절반부터 올리세요.", "불을 쓰지 않아도 바로 먹을 수 있는 상태입니다."],
    ],
  }),
];

const BEGINNER_FOOD_PHOTO_THUMBNAILS = new Map<string, string>([
  ["beginner-001", "/images/recipes/jipbab-curated/soy-egg-rice.png"],
  ["beginner-002", "/images/recipes/jipbab-curated/steamed-egg.png"],
  ["beginner-003", "/images/recipes/jipbab-curated/gyeran-mari-basic.png"],
  ["beginner-004", "/images/recipes/beginner-food-photos/beginner-004-egg-drop-soup.png"],
  ["beginner-005", "/images/recipes/beginner-food-photos/beginner-005-scrambled-egg-rice.png"],
  ["beginner-006", "/images/recipes/beginner-food-photos/beginner-006-tomato-egg-stirfry.png"],
  ["beginner-007", "/images/recipes/beginner-food-photos/beginner-007-cabbage-egg-jeon.png"],
  ["beginner-008", "/images/recipes/beginner-food-photos/beginner-008-tuna-gyeran-mari.png"],
  ["beginner-009", "/images/recipes/beginner-food-photos/beginner-009-egg-porridge.png"],
  ["beginner-010", "/images/recipes/beginner-food-photos/beginner-010-cheese-egg-rice.png"],
  ["beginner-011", "/images/recipes/beginner-food-photos/beginner-011-butter-soy-egg-rice.png"],
  ["beginner-012", "/images/recipes/beginner-food-photos/beginner-012-onion-egg-rice-bowl.png"],
  ["beginner-013", "/images/recipes/kimchi-fried-rice.png"],
  ["beginner-014", "/images/recipes/jipbab-curated/tuna-kimchi-fried-rice.png"],
  ["beginner-015", "/images/recipes/jipbab-curated/tuna-mayo-rice-bowl.png"],
  ["beginner-016", "/images/recipes/beginner-food-photos/beginner-016-ham-vegetable-fried-rice.png"],
  ["beginner-017", "/images/recipes/beginner-food-photos/beginner-017-kimchi-rice-bowl.png"],
  ["beginner-018", "/images/recipes/beginner-food-photos/beginner-018-kimchi-egg-rice.png"],
  ["beginner-019", "/images/recipes/beginner-food-photos/beginner-019-rice-balls.png"],
  ["beginner-020", "/images/recipes/beginner-food-photos/beginner-020-kimchi-rice-balls.png"],
  ["beginner-021", "/images/recipes/beginner-food-photos/beginner-021-spam-mayo-rice-bowl.png"],
  ["beginner-022", "/images/recipes/beginner-food-photos/beginner-022-bean-sprout-rice.png"],
  ["beginner-023", "/images/recipes/beginner-food-photos/beginner-023-soy-butter-rice.png"],
  ["beginner-024", "/images/recipes/beginner-food-photos/beginner-024-tuna-rice-balls.png"],
  ["beginner-025", "/images/recipes/beginner-food-photos/beginner-025-perilla-leaf-rice-balls.png"],
  ["beginner-026", "/images/recipes/beginner-food-photos/beginner-026-namul-bibimbap.png"],
  ["beginner-027", "/images/recipes/beginner-food-photos/beginner-027-pan-fried-tofu.png"],
  ["beginner-028", "/images/recipes/jipbab-curated/dubu-jorim-basic.png"],
  ["beginner-029", "/images/recipes/beginner-food-photos/beginner-029-soft-tofu-soy-bowl.png"],
  ["beginner-030", "/images/recipes/beginner-food-photos/beginner-030-soondubu-egg-soup.png"],
  ["beginner-031", "/images/recipes/jipbab-curated/bean-sprout-soup.png"],
  ["beginner-032", "/images/recipes/beginner-food-photos/beginner-032-bean-sprout-muchim.png"],
  ["beginner-033", "/images/recipes/beginner-food-photos/beginner-033-gamja-bokkeum.png"],
  ["beginner-034", "/images/recipes/beginner-food-photos/beginner-034-gamja-guk.png"],
  ["beginner-035", "/images/recipes/beginner-food-photos/beginner-035-gamja-chae-jeon.png"],
  ["beginner-036", "/images/recipes/beginner-food-photos/beginner-036-onion-tofu-bokkeum.png"],
  ["beginner-037", "/images/recipes/beginner-food-photos/beginner-037-gamja-chae-bokkeum.png"],
  ["beginner-038", "/images/recipes/beginner-food-photos/beginner-038-dubu-miyeok-guk.png"],
  ["beginner-039", "/images/recipes/beginner-food-photos/beginner-039-perilla-oil-grilled-tofu.png"],
  ["beginner-040", "/images/recipes/beginner-food-photos/beginner-040-soondubu-soy-bowl.png"],
  ["beginner-041", "/images/recipes/beginner-food-photos/beginner-041-broccoli-butter-bokkeum.png"],
  ["beginner-042", "/images/recipes/beginner-food-photos/beginner-042-cold-tofu.png"],
  ["beginner-043", "/images/recipes/beginner-food-photos/beginner-043-cucumber-muchim.png"],
  ["beginner-044", "/images/recipes/beginner-food-photos/beginner-044-potato-egg-salad.png"],
  ["beginner-045", "/images/recipes/beginner-food-photos/beginner-045-perilla-leaf-muchim.png"],
  ["beginner-046", "/images/recipes/beginner-food-photos/beginner-046-perilla-leaf-tofu-muchim.png"],
  ["beginner-047", "/images/recipes/beginner-food-photos/beginner-047-tuna-kimchi-jjigae.png"],
  ["beginner-048", "/images/recipes/beginner-food-photos/beginner-048-tuna-dubu-jorim.png"],
  ["beginner-049", "/images/recipes/beginner-food-photos/beginner-049-spam-kimchi-bokkeum.png"],
  ["beginner-050", "/images/recipes/beginner-food-photos/beginner-050-ham-gamja-bokkeum.png"],
  ["beginner-051", "/images/recipes/jipbab-curated/fishcake-bokkeum.png"],
  ["beginner-052", "/images/recipes/beginner-food-photos/beginner-052-eomuk-tang.png"],
  ["beginner-053", "/images/recipes/beginner-food-photos/beginner-053-eomuk-udon.png"],
  ["beginner-054", "/images/recipes/beginner-food-photos/beginner-054-sausage-vegetable-bokkeum.png"],
  ["beginner-055", "/images/recipes/beginner-food-photos/beginner-055-tuna-salad.png"],
  ["beginner-056", "/images/recipes/beginner-food-photos/beginner-056-canned-corn-ham-bokkeum.png"],
  ["beginner-057", "/images/recipes/beginner-food-photos/beginner-057-eomuk-egg-guk.png"],
  ["beginner-058", "/images/recipes/beginner-food-photos/beginner-058-soy-eomuk-bokkeum.png"],
  ["beginner-059", "/images/recipes/beginner-food-photos/beginner-059-tuna-cabbage-rice-bowl.png"],
  ["beginner-060", "/images/recipes/beginner-food-photos/beginner-060-ham-egg-jeon.png"],
  ["beginner-061", "/images/recipes/beginner-food-photos/beginner-061-perilla-leaf-eomuk-bokkeum.png"],
  ["beginner-062", "/images/recipes/beginner-food-photos/beginner-062-tuna-cucumber-muchim.png"],
  ["beginner-063", "/images/recipes/beginner-food-photos/beginner-063-doenjang-dubu-guk.png"],
  ["beginner-064", "/images/recipes/beginner-food-photos/beginner-064-miyeok-guk.png"],
  ["beginner-065", "/images/recipes/beginner-food-photos/beginner-065-bugeot-guk.png"],
  ["beginner-066", "/images/recipes/beginner-food-photos/beginner-066-kimchi-guk.png"],
  ["beginner-067", "/images/recipes/beginner-food-photos/beginner-067-doenjang-jjigae.png"],
  ["beginner-068", "/images/recipes/beginner-food-photos/beginner-068-kimchi-jjigae.png"],
  ["beginner-069", "/images/recipes/beginner-food-photos/beginner-069-tofu-mushroom-guk.png"],
  ["beginner-070", "/images/recipes/beginner-food-photos/beginner-070-tteok-egg-guk.png"],
  ["beginner-071", "/images/recipes/beginner-food-photos/beginner-071-potato-doenjang-guk.png"],
  ["beginner-072", "/images/recipes/beginner-food-photos/beginner-072-bean-sprout-kimchi-guk.png"],
  ["beginner-073", "/images/recipes/beginner-food-photos/beginner-073-soondubu-guk.png"],
  ["beginner-074", "/images/recipes/beginner-food-photos/beginner-074-zucchini-doenjang-guk.png"],
  ["beginner-075", "/images/recipes/beginner-food-photos/beginner-075-onion-guk.png"],
  ["beginner-076", "/images/recipes/beginner-food-photos/beginner-076-napa-cabbage-doenjang-guk.png"],
  ["beginner-077", "/images/recipes/beginner-food-photos/beginner-077-mandu-guk.png"],
  ["beginner-078", "/images/recipes/beginner-food-photos/beginner-078-chive-egg-guk.png"],
  ["beginner-079", "/images/recipes/beginner-food-photos/beginner-079-soy-bibim-guksu.png"],
  ["beginner-080", "/images/recipes/beginner-food-photos/beginner-080-bibim-guksu.png"],
  ["beginner-081", "/images/recipes/beginner-food-photos/beginner-081-janchi-guksu.png"],
  ["beginner-082", "/images/recipes/beginner-food-photos/beginner-082-kimchi-ramyeon.png"],
  ["beginner-083", "/images/recipes/beginner-food-photos/beginner-083-ramen-egg-porridge.png"],
  ["beginner-084", "/images/recipes/beginner-food-photos/beginner-084-bokkeum-udon.png"],
  ["beginner-085", "/images/recipes/beginner-food-photos/beginner-085-eomuk-udon-bokkeum.png"],
  ["beginner-086", "/images/recipes/beginner-food-photos/beginner-086-tomato-pasta.png"],
  ["beginner-087", "/images/recipes/beginner-food-photos/beginner-087-tuna-pasta.png"],
  ["beginner-088", "/images/recipes/beginner-food-photos/beginner-088-udon.png"],
  ["beginner-089", "/images/recipes/beginner-food-photos/beginner-089-tuna-ramyeon.png"],
  ["beginner-090", "/images/recipes/beginner-food-photos/beginner-090-cold-guksu.png"],
  ["beginner-091", "/images/recipes/beginner-food-photos/beginner-091-bibim-udon.png"],
  ["beginner-092", "/images/recipes/beginner-food-photos/beginner-092-soy-ramyeon.png"],
  ["beginner-093", "/images/recipes/beginner-food-photos/beginner-093-microwave-butter-potato.png"],
  ["beginner-094", "/images/recipes/beginner-food-photos/beginner-094-microwave-ham-egg-rice.png"],
  ["beginner-095", "/images/recipes/beginner-food-photos/beginner-095-microwave-dubu-jjim.png"],
  ["beginner-096", "/images/recipes/beginner-food-photos/beginner-096-microwave-corn-cheese.png"],
  ["beginner-097", "/images/recipes/beginner-food-photos/beginner-097-cucumber-tuna-muchim.png"],
  ["beginner-098", "/images/recipes/beginner-food-photos/beginner-098-cabbage-bokkeum.png"],
  ["beginner-099", "/images/recipes/beginner-food-photos/beginner-099-cabbage-tuna-rice-bowl.png"],
  ["beginner-100", "/images/recipes/beginner-food-photos/beginner-100-microwave-tuna-cheese-rice.png"],
  ["beginner-101", "/images/recipes/beginner-food-photos/beginner-101-crab-stick-egg-bokkeum.png"],
  ["beginner-102", "/images/recipes/beginner-food-photos/beginner-102-tofu-egg-jeon.png"],
  ["beginner-103", "/images/recipes/beginner-food-photos/beginner-103-spam-egg-fried-rice.png"],
  ["beginner-104", "/images/recipes/beginner-food-photos/beginner-104-nurungji-tofu-egg-porridge.png"],
  ["beginner-105", "/images/recipes/beginner-food-photos/beginner-105-sweet-potato-porridge.png"],
  ["beginner-106", "/images/recipes/beginner-food-photos/beginner-106-tuna-kimchi-guk.png"],
  ["beginner-107", "/images/recipes/beginner-food-photos/beginner-107-mung-bean-sprout-bokkeum.png"],
  ["beginner-108", "/images/recipes/beginner-food-photos/beginner-108-mung-bean-sprout-egg-bokkeum.png"],
  ["beginner-109", "/images/recipes/beginner-food-photos/beginner-109-seaweed-egg-rice.png"],
  ["beginner-110", "/images/recipes/beginner-food-photos/beginner-110-perilla-oil-egg-guksu.png"],
  ["beginner-111", "/images/recipes/beginner-food-photos/beginner-111-tofu-tuna-bibimbap.png"],
  ["beginner-112", "/images/recipes/beginner-food-photos/beginner-112-cabbage-egg-rice-bowl.png"],
  ["beginner-113", "/images/recipes/beginner-food-photos/beginner-113-potato-tuna-jorim.png"],
  ["beginner-114", "/images/recipes/beginner-food-photos/beginner-114-ham-tofu-gui.png"],
  ["beginner-115", "/images/recipes/beginner-food-photos/beginner-115-kimchi-bean-sprout-rice.png"],
  ["beginner-116", "/images/recipes/beginner-food-photos/beginner-116-microwave-egg-rice.png"],
  ["beginner-117", "/images/recipes/beginner-food-photos/beginner-117-microwave-tofu-egg-jjim.png"],
  ["beginner-118", "/images/recipes/beginner-food-photos/beginner-118-cucumber-soy-guksu.png"],
  ["beginner-119", "/images/recipes/beginner-food-photos/beginner-119-mandu-egg-guk.png"],
  ["beginner-120", "/images/recipes/beginner-food-photos/beginner-120-eomuk-kimchi-guk.png"],
  ["beginner-121", "/images/recipes/generated/dubu-egg-rice-bowl.png"],
  ["beginner-122", "/images/recipes/generated/tuna-onion-rice-bowl.png"],
  ["beginner-123", "/images/recipes/generated/potato-egg-soup.png"],
  ["beginner-124", "/images/recipes/generated/soy-napa-cabbage-muchim.png"],
  ["beginner-125", "/images/recipes/generated/enoki-mushroom-jeon.png"],
  ["beginner-126", "/images/recipes/generated/egg-toast.png"],
  ["beginner-127", "/images/recipes/generated/cucumber-cold-soup.png"],
  ["beginner-128", "/images/recipes/generated/egg-fried-ramen.png"],
  ["beginner-129", "/images/recipes/generated/zucchini-jeon.png"],
  ["beginner-130", "/images/recipes/generated/radish-muchim.png"],
  ["beginner-131", "/images/recipes/generated/spicy-tuna-bibimbap.png"],
  ["beginner-132", "/images/recipes/generated/king-oyster-mushroom-bokkeum.png"],
  ["beginner-133", "/images/recipes/generated/tuna-kimchi-fried-rice.png"],
  ["beginner-134", "/images/recipes/generated/eggplant-muchim.png"],
  ["beginner-135", "/images/recipes/generated/jinmichae-muchim.png"],
  ["beginner-136", "/images/recipes/generated/enoki-rice-bowl.png"],
  ["beginner-137", "/images/recipes/generated/kimchi-bibim-guksu.png"],
  ["beginner-138", "/images/recipes/generated/dubu-kimchi.png"],
  ["beginner-139", "/images/recipes/generated/cucumber-crab-stick-muchim.png"],
  ["beginner-140", "/images/recipes/generated/tuna-ssamjang.png"],
  ["beginner-141", "/images/recipes/generated/potato-corn-salad.png"],
  ["beginner-142", "/images/recipes/generated/eggplant-rice-bowl.png"],
  ["beginner-143", "/images/recipes/generated/tofu-salad.png"],
  ["beginner-144", "/images/recipes/generated/soy-marinated-eggs.png"],
  ["beginner-145", "/images/recipes/generated/cabbage-rapee.png"],
  ["beginner-146", "/images/recipes/generated/tomato-marinade.png"],
  ["beginner-147", "/images/recipes/generated/lettuce-geotjeori.png"],
  ["beginner-148", "/images/recipes/generated/kimchi-mari-guksu.png"],
  ["beginner-149", "/images/recipes/generated/egg-cucumber-sandwich.png"],
  ["beginner-150", "/images/recipes/generated/cabbage-tuna-salad.png"],
  ["beginner-151", "/images/recipes/generated/cucumber-gimbap.png"],
  ["beginner-152", "/images/recipes/generated/bean-sprout-bibim-ramyeon.png"],
  ["beginner-153", "/images/recipes/generated/tomato-caprese.png"],
  ["beginner-154", "/images/recipes/generated/tofu-noodle-bibim-guksu.png"],
  ["beginner-155", "/images/recipes/generated/crab-yubu-sushi.png"],
  ["beginner-156", "/images/recipes/generated/tomato-egg-soup.png"],
  ["beginner-157", "/images/recipes/generated/cucumber-tuna-bibimbap.png"],
  ["beginner-158", "/images/recipes/generated/tuna-mayo-rice-balls.png"],
  ["beginner-159", "/images/recipes/generated/cabbage-egg-toast.png"],
  ["beginner-160", "/images/recipes/generated/kimchi-bean-sprout-soup.png"],
  ["beginner-161", "/images/recipes/generated/bean-sprout-cold-soup.png"],
  ["beginner-162", "/images/recipes/generated/egg-curry-rice-bowl.png"],
  ["beginner-163", "/images/recipes/generated/kimchi-cheese-rice-balls.png"],
  ["beginner-164", "/images/recipes/generated/chicken-cucumber-naengchae.png"],
  ["beginner-165", "/images/recipes/generated/tofu-noodle-salad.png"],
  ["beginner-166", "/images/recipes/generated/broccoli-egg-stir-fry.png"],
  ["beginner-167", "/images/recipes/generated/tuna-egg-porridge.png"],
  ["beginner-168", "/images/recipes/generated/fish-cake-gimbap.png"],
  ["beginner-169", "/images/recipes/generated/cabbage-egg-soup.png"],
  ["beginner-170", "/images/recipes/generated/chicken-cabbage-rice-bowl.png"],
  ["beginner-171", "/images/recipes/generated/tofu-tuna-patties.png"],
  ["beginner-172", "/images/recipes/generated/cucumber-tofu-muchim.png"],
  ["beginner-173", "/images/recipes/generated/spam-musubi.png"],
  ["beginner-174", "/images/recipes/generated/eggplant-tomato-stir-fry.png"],
  ["beginner-175", "/images/recipes/generated/kimchi-fish-cake-stir-fry.png"],
  ["beginner-176", "/images/recipes/generated/onion-egg-stir-fry.png"],
]);

function getBeginnerRecipeThumbnail(recipe: BeginnerRecipe): string {
  return BEGINNER_FOOD_PHOTO_THUMBNAILS.get(recipe.slug) ?? `/images/recipes/beginner-scenes/${recipe.slug}/cover.svg`;
}

function getBeginnerRecipeGuideImage(recipe: BeginnerRecipe): string | null {
  return BEGINNER_RECIPE_VISUAL_GUIDES_ENABLED || IMAGEGEN_RECIPE_POSTER_SLUGS.has(recipe.slug)
    ? `/images/recipes/beginner-recipe-guides/${recipe.slug}.png`
    : null;
}

function getBeginnerRecipePrepImage(recipe: BeginnerRecipe): string | null {
  return BEGINNER_RECIPE_VISUAL_GUIDES_ENABLED || IMAGEGEN_RECIPE_POSTER_SLUGS.has(recipe.slug)
    ? `/images/recipes/beginner-recipe-guides/prep/${recipe.slug}.png`
    : null;
}

function getBeginnerRecipeStepsImage(recipe: BeginnerRecipe): string | null {
  return BEGINNER_RECIPE_VISUAL_GUIDES_ENABLED || IMAGEGEN_RECIPE_POSTER_SLUGS.has(recipe.slug)
    ? `/images/recipes/beginner-recipe-guides/steps/${recipe.slug}.png`
    : null;
}

function getBeginnerRecipeStepCardImageBySlug(slug: string, order: number, stepCount: number): string | null {
  if (!BEGINNER_RECIPE_STEP_CARD_IMAGE_SLUGS.has(slug)) return null;
  if (order <= 1) return `/images/recipes/beginner-recipe-guides/prep/${slug}.png`;
  if (order >= stepCount) return `/images/recipes/beginner-recipe-guides/${slug}.png`;
  return `/images/recipes/beginner-recipe-guides/steps/${slug}.png`;
}

function getBeginnerGuideAssetSlug(recipe: CuratedRecipe): string | null {
  if (typeof recipe.slug === "string" && /^beginner-\d{3}$/.test(recipe.slug)) return recipe.slug;
  if (typeof recipe.id !== "string") return null;
  const match = /^beginner-recipe-(\d{3})$/.exec(recipe.id);
  const recipeNumber = match?.[1];
  return recipeNumber ? `beginner-${recipeNumber}` : null;
}

function enforceBeginnerGuideAssets(recipe: CuratedRecipe): CuratedRecipe {
  const slug = getBeginnerGuideAssetSlug(recipe);
  if (!slug) return recipe;

  const guideImageUrl = `/images/recipes/beginner-recipe-guides/${slug}.png`;
  const prepImageUrl = `/images/recipes/beginner-recipe-guides/prep/${slug}.png`;
  const stepsImageUrl = `/images/recipes/beginner-recipe-guides/steps/${slug}.png`;

  return {
    ...recipe,
    recipePosterImageUrl: null,
    recipeGuideImageUrl: guideImageUrl,
    recipePrepImageUrl: prepImageUrl,
    recipeStepsImageUrl: stepsImageUrl,
    steps: recipe.steps.map((step, index) => {
      if (typeof step === "string") {
        return {
          index: index + 1,
          title: `${recipe.name} ${index + 1}단계`,
          description: step,
          imageUrl: null,
          imageAlt: null,
        };
      }

      return {
        ...step,
        index: step.index ?? index + 1,
        imageUrl: null,
        imageAlt: null,
      };
    }),
  };
}

function getBeginnerRecipeMethod(recipe: BeginnerRecipe): string {
  if (recipe.title === "스팸무스비") return "굽기";
  if (recipe.title === "가지토마토볶음") return "볶기";
  if (recipe.title === "김치어묵볶음") return "볶기";
  if (recipe.title === "양파달걀볶음") return "볶기";
  if (recipe.title === "양배추계란국") return "끓이기";
  if (recipe.title === "닭가슴살양배추덮밥") return "볶기";
  if (recipe.title === "두부참치전") return "부치기";
  if (recipe.title === "오이두부무침") return "비비기";
  if (recipe.title === "두부면샐러드") return "비비기";
  if (recipe.title === "브로콜리계란볶음") return "볶기";
  if (recipe.title === "참치계란죽") return "끓이기";
  if (recipe.title === "어묵김밥") return "말기";
  if (recipe.title === "계란토스트") return "부치기";
  if (recipe.title === "계란볶음라면") return "볶기";
  if (recipe.title === "오이냉국") return "비비기";
  if (recipe.title === "김치비빔국수") return "비비기";
  if (recipe.requiredTools.includes("전자레인지")) return "전자레인지";
  if (recipe.requiredTools.includes("냄비")) return "끓이기";
  if (recipe.requiredTools.includes("프라이팬")) {
    return recipe.title.includes("전") || recipe.title.includes("부침") || recipe.title.includes("계란말이")
      ? "부치기"
      : "볶기";
  }
  return "비비기";
}

function beginnerRecipeToCurated(recipe: BeginnerRecipe): CuratedRecipe {
  const requiredIngredients = recipe.ingredients.filter((ingredientItem) => ingredientItem.required);
  const beginnerMatchIngredients = requiredIngredients.filter(
    (ingredientItem) => !BEGINNER_MATCH_PANTRY_STAPLES.has(ingredientItem.name),
  );
  const homeCardCopy: RecipeHomeCardCopy = recipe.homeCardCopy;

  return {
    id: recipe.id,
    slug: recipe.slug,
    title: recipe.title,
    name: recipe.title,
    category: recipe.category,
    method: getBeginnerRecipeMethod(recipe),
    calories: "-",
    thumbnailUrl: getBeginnerRecipeThumbnail(recipe),
    recipePosterImageUrl: null,
    recipeGuideImageUrl: getBeginnerRecipeGuideImage(recipe),
    recipePrepImageUrl: getBeginnerRecipePrepImage(recipe),
    recipeStepsImageUrl: getBeginnerRecipeStepsImage(recipe),
    ingredients: beginnerMatchIngredients.map((ingredientItem) => ingredientItem.name).join(", "),
    hashTag: "#초보가능 #집밥노트 #냉장고추천",
    ingredientList: requiredIngredients.map((ingredientItem) => ingredientItem.name),
    ingredientDetails: recipe.ingredients.map((ingredientItem) =>
      ingredient(
        ingredientItem.name,
        ingredientItem.amount,
        ingredientItem.beginnerNote,
        undefined,
        ingredientItem.required,
      ),
    ).map((ingredientItem, index) => ({
      ...ingredientItem,
      required: recipe.ingredients[index]?.required ?? true,
      substitute: recipe.ingredients[index]?.substitute ?? null,
    })),
    substituteIngredients: recipe.ingredients
      .filter((ingredientItem) => ingredientItem.substitute)
      .map((ingredientItem) => ({
        name: ingredientItem.name,
        display: ingredientItem.substitute ?? "",
        amount: null,
        unit: null,
        required: false,
        substitute: null,
        beginnerNote: "원래 재료가 없을 때만 사용하는 대체 재료입니다.",
        prepNote: null,
      })),
    trustLabel: recipe.homeCardCopy.badge,
    featuredReason: recipe.oneLineDescription,
    difficulty: recipe.difficultyLevel,
    difficultyLevel: recipe.difficultyLevel,
    cookingTime: recipe.totalMinutes,
    totalMinutes: recipe.totalMinutes,
    activeMinutes: recipe.activeMinutes,
    servings: recipe.servings,
    requiredTools: recipe.requiredTools,
    beginnerScore: recipe.beginnerScore,
    beginnerSummary: recipe.oneLineDescription,
    measurementTips: DEFAULT_MEASUREMENT_TIPS,
    imageAlt: `${recipe.title} 완성 예시`,
    imageCaption: `${recipe.title} 레시피는 초보자 기준으로 상태 확인 문장을 붙인 집밥노트 자체 레시피입니다.`,
    beforeStart: recipe.beforeStart,
    steps: recipe.steps.map((step) => ({
      index: step.order,
      order: step.order,
      title: step.title,
      action: step.action,
      description: step.action,
      imageUrl: null,
      imageAlt: null,
      heat: step.heat,
      minutes: step.minutes,
      beginnerTip: step.commonMistake,
      visualCue: step.visualCue,
      commonMistake: step.commonMistake,
      rescueTip: step.rescueTip,
    })),
    successCheck: recipe.successCheck.join(" "),
    storageTip: recipe.storageTip,
    reheatTip: recipe.reheatTip,
    fallbackMeal: recipe.fallbackMeal,
    homeCardCopy,
    noFire: recipe.steps.every((step) => step.heat === "불 없음"),
    microwave: recipe.requiredTools.includes("전자레인지"),
    source: getAppSafeBeginnerRecipeSource(recipe.source),
    safety: {
      ...recipe.safety,
      imageUsageAllowed: getAppSafeBeginnerRecipeSource(recipe.source).imageUsageAllowed,
      adaptedByJipbabNote: getAppSafeBeginnerRecipeSource(recipe.source).adaptedByJipbabNote,
    },
    reviewedForBeginner: true,
    releaseTier: recipe.releaseTier,
    publishStatus: recipe.publishStatus,
  };
}

const RAW_CURATED_JIPBAB_RECIPES: CuratedRecipe[] = [
  ...RELEASE_RECIPE_30_ADDITIONS,
  {
    id: "curated-kimchi-fried-rice",
    name: "김치볶음밥",
    category: "밥",
    method: "볶기",
    calories: "520",
    thumbnailUrl: "/images/recipes/kimchi-fried-rice.png",
    ingredients: "김치, 밥, 계란, 대파, 참기름",
    hashTag: "#한그릇 #냉장고파먹기 #초보가능",
    ingredientList: ["김치", "밥", "계란", "대파", "참기름"],
    ingredientDetails: [
      ingredient("김치", "1컵", "종이컵에 잘게 썬 김치를 가볍게 담은 양이에요.", "가위로 잘라도 괜찮아요."),
      ingredient("밥", "1공기", "햇반 1개 또는 밥공기 수북하지 않게 1그릇이에요.", "찬밥이면 더 잘 볶아져요."),
      ingredient("계란", "1개", "프라이로 올리면 실패해도 맛이 안정돼요."),
      ingredient("대파", "1/3대", "송송 썰어 밥숟가락 3큰술 정도면 충분해요."),
      ingredient("참기름", "1작은술", "티스푼 1번, 향만 내는 양이에요."),
    ],
    trustLabel: "집밥 기본",
    featuredReason: "김치와 계란만 있어도 바로 만들 수 있는 국민 한 그릇",
    difficulty: 1,
    cookingTime: 12,
    servings: 1,
    beginnerSummary: "김치가 짜면 간장을 빼고, 밥은 마지막에 넣어 눌어붙지 않게 풀어가며 볶으면 됩니다.",
    measurementTips: DEFAULT_MEASUREMENT_TIPS,
    imageAlt: "계란프라이가 올라간 김치볶음밥 완성 사진",
    imageCaption: "김치는 충분히 볶고 밥은 마지막에 넣어야 질척하지 않아요.",
    steps: [
      {
        index: 1,
        description: "김치는 가위로 1cm 크기 정도로 잘게 자르고 대파는 송송 썹니다.",
        imageUrl: null,
        beginnerTip: "칼이 무서우면 김치를 그릇에 담고 주방가위로 잘라도 됩니다.",
        visualCue: "김치 조각이 숟가락에 올라가기 좋은 크기면 충분해요.",
      },
      {
        index: 2,
        description: "팬에 식용유 1큰술을 두르고 대파를 중불에서 30초 볶아 향을 냅니다.",
        imageUrl: null,
        beginnerTip: "식용유 1큰술은 밥숟가락으로 평평하게 1번입니다.",
        visualCue: "대파 향이 올라오고 가장자리가 살짝 투명해지면 다음 단계예요.",
      },
      {
        index: 3,
        description: "김치를 넣고 2분 정도 볶은 뒤 밥 1공기를 넣어 주걱으로 눌러 풀어줍니다.",
        imageUrl: null,
        beginnerTip: "밥덩어리가 있으면 불을 잠깐 약하게 줄이고 천천히 풀어도 됩니다.",
        visualCue: "밥알이 붉은 김치 양념색으로 고르게 물들면 됩니다.",
      },
      {
        index: 4,
        description: "불을 끄고 참기름 1작은술을 섞은 뒤 계란프라이를 올립니다.",
        imageUrl: null,
        beginnerTip: "참기름은 오래 가열하면 향이 날아가니 마지막에 넣어요.",
        visualCue: "밥에서 고소한 향이 나고 윤기가 살짝 돌면 완성입니다.",
      },
    ],
  },
  {
    id: "curated-doenjang-jjigae",
    name: "된장찌개",
    category: "국·찌개",
    method: "끓이기",
    calories: "290",
    thumbnailUrl: "/images/recipes/jipbab-curated/doenjang-jjigae-basic.png",
    ingredients: "된장, 두부, 애호박, 양파, 대파",
    hashTag: "#국물 #집밥 #초보찌개",
    ingredientList: ["된장", "두부", "애호박", "양파", "대파"],
    ingredientDetails: [
      ingredient("된장", "2큰술", "밥숟가락 평평하게 2번, 약 30ml예요."),
      ingredient("두부", "1/2모", "마트 두부 한 모를 반으로 자른 양이에요.", "2cm 큐브로 썰면 잘 부서지지 않아요."),
      ingredient("애호박", "1/3개", "손가락 두 마디 길이 정도를 반달 모양으로 썰어요."),
      ingredient("양파", "1/4개", "작은 양파는 반 개까지 넣어도 괜찮아요."),
      ingredient("대파", "1/2대", "마지막 향을 내는 재료라 얇게 어슷썰면 좋아요."),
    ],
    trustLabel: "집밥 기본",
    featuredReason: "두부와 양파를 소진하기 좋은 가장 익숙한 찌개",
    difficulty: 1,
    cookingTime: 20,
    servings: 2,
    beginnerSummary: "된장은 처음부터 많이 넣지 말고 2큰술로 시작한 뒤 마지막에 맛을 보고 추가하세요.",
    measurementTips: DEFAULT_MEASUREMENT_TIPS,
    imageAlt: "두부와 애호박이 보이는 된장찌개 완성 사진",
    imageCaption: "두부는 마지막 쪽에 넣어야 모양이 덜 부서집니다.",
    steps: [
      {
        index: 1,
        description: "냄비에 물 500ml를 붓고 된장 2큰술을 체나 숟가락으로 풀어줍니다.",
        imageUrl: null,
        beginnerTip: "500ml는 종이컵 약 2컵 반입니다.",
        visualCue: "된장 덩어리가 거의 안 보이면 충분히 풀린 상태예요.",
      },
      {
        index: 2,
        description: "애호박과 양파를 넣고 중불에서 5분 끓입니다.",
        imageUrl: null,
        beginnerTip: "끓기 시작하면 불을 중불로 낮춰 넘치지 않게 합니다.",
        visualCue: "애호박 가장자리가 반투명해지면 익기 시작한 거예요.",
      },
      {
        index: 3,
        description: "두부와 대파를 넣고 3분 더 끓입니다.",
        imageUrl: null,
        beginnerTip: "두부를 넣은 뒤에는 세게 젓지 말고 숟가락으로 살살 밀어주세요.",
        visualCue: "두부가 따뜻해지고 국물이 다시 보글보글 끓으면 됩니다.",
      },
      {
        index: 4,
        description: "간을 보고 싱거우면 된장 1작은술을 더 풀어 마무리합니다.",
        imageUrl: null,
        beginnerTip: "짜면 물 100ml를 추가하고 1분 더 끓이면 됩니다.",
        visualCue: "국물이 짜지 않고 구수하면 완성입니다.",
      },
    ],
  },
  {
    id: "curated-gyeran-mari",
    name: "프라이팬 계란말이",
    category: "반찬",
    method: "부치기",
    calories: "260",
    thumbnailUrl: "/images/recipes/jipbab-curated/gyeran-mari-basic.png",
    recipePosterImageUrl: "/images/recipes/jipbab-curated/gyeran-mari-basic.png",
    recipeGuideImageUrl: "/images/recipes/jipbab-curated/gyeran-mari-basic.png",
    recipePrepImageUrl: "/images/recipes/jipbab-curated/gyeran-mari-basic.png",
    recipeStepsImageUrl: "/images/recipes/jipbab-curated/gyeran-mari-basic.png",
    ingredients: "계란, 대파, 당근, 소금, 식용유",
    hashTag: "#반찬 #도시락 #초보팬요리",
    ingredientList: ["계란", "대파", "당근", "소금", "식용유"],
    ingredientDetails: [
      ingredient("계란", "4개", "2인 반찬 기준입니다. 처음이면 3개보다 4개가 말기 쉬워요."),
      ingredient("대파", "2큰술", "잘게 썬 대파를 밥숟가락으로 2번 떠 넣는 양이에요."),
      ingredient("당근", "2큰술", "색을 내는 정도라 없으면 생략해도 됩니다."),
      ingredient("소금", "1/4작은술", "티스푼 끝에 얇게 깔리는 정도예요."),
      ingredient("식용유", "1큰술", "팬을 코팅할 만큼만 얇게 둘러요."),
    ],
    trustLabel: "집밥 기본",
    featuredReason: "계란 소진과 반찬 준비를 동시에 해결",
    difficulty: 1,
    cookingTime: 15,
    servings: 2,
    source: GYERAN_MARI_REFERENCE_SOURCE,
    safety: REFERENCE_LINK_SAFETY,
    beginnerSummary: "계란말이는 센불보다 약불이 중요합니다. 찢어져도 다음 계란물로 감싸면 모양이 살아납니다.",
    measurementTips: DEFAULT_MEASUREMENT_TIPS,
    imageAlt: "대파와 당근이 들어간 계란말이 완성 사진",
    imageCaption: "약불에서 천천히 말면 겉은 타지 않고 속까지 익습니다.",
    steps: [
      {
        index: 1,
        description: "계란 4개를 그릇에 깨고 소금 1/4작은술, 다진 대파와 당근을 섞습니다.",
        imageUrl: null,
        beginnerTip: "젓가락으로 흰자 덩어리가 안 보일 때까지 풀면 표면이 매끈해져요.",
        visualCue: "계란물 색이 균일하고 채소가 골고루 보이면 됩니다.",
      },
      {
        index: 2,
        description: "약불 팬에 식용유 1큰술을 두르고 키친타월로 얇게 펴 바릅니다.",
        imageUrl: null,
        beginnerTip: "기름이 너무 많으면 계란이 미끄러져 말기 어려워요.",
        visualCue: "팬 표면이 살짝 반짝이는 정도면 충분합니다.",
      },
      {
        index: 3,
        description: "계란물을 얇게 붓고 윗면이 70% 정도 익으면 끝에서부터 접듯이 말아줍니다.",
        imageUrl: null,
        beginnerTip: "젖은 부분이 조금 남아 있어야 다음 층과 잘 붙습니다.",
        visualCue: "윗면이 흐르지 않지만 촉촉해 보이는 순간이 말기 좋아요.",
      },
      {
        index: 4,
        description: "남은 계란물을 2~3번 나눠 붓고 같은 방식으로 말아 두껍게 만듭니다.",
        imageUrl: null,
        beginnerTip: "찢어지면 당황하지 말고 다음 계란물로 덮어서 말면 됩니다.",
        visualCue: "전체가 네모난 막대 모양이 되면 불을 끕니다.",
      },
      {
        index: 5,
        description: "2분 식힌 뒤 1.5cm 두께로 썰어 접시에 담습니다.",
        imageUrl: null,
        beginnerTip: "뜨거울 때 바로 썰면 부서지기 쉬워요.",
        visualCue: "칼에 계란이 많이 묻지 않으면 썰기 좋은 온도입니다.",
      },
    ],
  },
  {
    id: "curated-dubu-jorim",
    name: "두부조림",
    category: "반찬",
    method: "조리기",
    calories: "310",
    thumbnailUrl: "/images/recipes/jipbab-curated/dubu-jorim-basic.png",
    ingredients: "두부, 간장, 대파, 고춧가루, 마늘",
    hashTag: "#두부 #밑반찬 #양념장",
    ingredientList: ["두부", "간장", "대파", "고춧가루", "마늘"],
    ingredientDetails: [
      ingredient("두부", "1모", "일반 부침용 두부 300g 한 팩 기준이에요.", "키친타월로 물기를 닦으면 덜 튀어요."),
      ingredient("간장", "2큰술", "밥숟가락 평평하게 2번, 약 30ml예요."),
      ingredient("고춧가루", "1큰술", "매운맛이 걱정되면 1/2큰술부터 시작하세요."),
      ingredient("마늘", "1작은술", "다진 마늘을 티스푼으로 1번 넣는 양입니다."),
      ingredient("대파", "1/2대", "양념에 섞을 만큼 송송 썰어요."),
    ],
    trustLabel: "집밥 기본",
    featuredReason: "유통기한 짧은 두부를 가장 빨리 처리하는 반찬",
    difficulty: 1,
    cookingTime: 18,
    servings: 2,
    beginnerSummary: "두부는 먼저 구워야 잘 부서지지 않고, 양념장은 물을 조금 섞어야 타지 않습니다.",
    measurementTips: DEFAULT_MEASUREMENT_TIPS,
    imageAlt: "간장 고춧가루 양념이 배어 있는 두부조림 완성 사진",
    imageCaption: "양념을 넣은 뒤에는 센불보다 중약불에서 천천히 졸입니다.",
    steps: [
      {
        index: 1,
        description: "두부 1모를 1.5cm 두께로 썰고 키친타월로 앞뒤 물기를 닦습니다.",
        imageUrl: null,
        beginnerTip: "두부 물기가 많으면 기름이 튈 수 있어요.",
        visualCue: "두부 표면이 번들거리지 않고 보송하면 됩니다.",
      },
      {
        index: 2,
        description: "간장 2큰술, 고춧가루 1큰술, 마늘 1작은술, 물 4큰술, 대파를 섞습니다.",
        imageUrl: null,
        beginnerTip: "물 4큰술은 밥숟가락으로 4번, 약 60ml입니다.",
        visualCue: "양념이 되직한 고추장보다 묽게 흐르면 좋아요.",
      },
      {
        index: 3,
        description: "팬에 식용유 1큰술을 두르고 두부를 앞뒤로 2분씩 굽습니다.",
        imageUrl: null,
        beginnerTip: "자주 뒤집으면 부서지니 한 면이 익을 때까지 기다립니다.",
        visualCue: "두부 가장자리가 연한 갈색이 되면 뒤집습니다.",
      },
      {
        index: 4,
        description: "양념장을 두부 위에 붓고 중약불에서 4분 정도 자작하게 조립니다.",
        imageUrl: null,
        beginnerTip: "국물이 너무 빨리 줄면 물 2큰술을 추가하세요.",
        visualCue: "양념이 두부 사이에 남아 있고 팬 바닥이 마르지 않으면 됩니다.",
      },
    ],
  },
  {
    id: "curated-pork-kimchi-jjigae",
    name: "돼지고기 김치찌개",
    category: "국·찌개",
    method: "끓이기",
    calories: "430",
    thumbnailUrl: "/images/recipes/jipbab-curated/pork-kimchi-jjigae-basic.png",
    ingredients: "김치, 돼지고기, 물, 두부, 대파, 고춧가루",
    hashTag: "#김치찌개 #저녁메뉴 #국물",
    ingredientList: ["김치", "돼지고기", "물", "두부", "대파", "고춧가루"],
    ingredientDetails: [
      ingredient("김치", "200g", "가위로 2~3cm 크기로 자르고 김치국물은 3큰술만 따로 둡니다.", "신김치가 아니면 설탕 1/2작은술을 선택합니다."),
      ingredient("돼지고기", "200g", "앞다리살이나 목살을 2~3cm 크기로 자릅니다.", "생고기용 도마와 집게는 다른 재료와 분리합니다."),
      ingredient("물", "550ml", "처음에는 500ml를 넣고 끓는 동안 너무 졸면 50ml를 추가합니다."),
      ingredient("두부", "150g", "두부 한 모의 절반 정도를 2cm 크기로 자릅니다."),
      ingredient("대파", "1/2대", "마지막에 넣으면 향이 살아납니다."),
      ingredient("고춧가루", "1큰술", "덜 맵게 먹으려면 1/2큰술만 넣으세요."),
    ],
    trustLabel: "저녁 추천",
    featuredReason: "김치와 두부가 있을 때 만족도가 높은 메인 메뉴",
    difficulty: 1,
    cookingTime: 25,
    totalMinutes: 25,
    activeMinutes: 10,
    beginnerScore: 92,
    servings: 2,
    beginnerSummary: "돼지고기 200g을 2~3cm로 잘라 2분, 김치를 3분 볶고 물 550ml로 10분+7분 끓인 뒤 중심까지 익었는지 확인합니다.",
    measurementTips: DEFAULT_MEASUREMENT_TIPS,
    imageAlt: "돼지고기와 두부가 들어간 김치찌개 완성 사진",
    imageCaption: "돼지고기의 분홍색이 사라지고 김치 줄기가 부드럽게 휘며 국물이 붉게 우러나면 완성입니다.",
    beforeStart: [
      "돼지고기 200g은 2~3cm로 자르고 생고기용 도마와 집게를 다른 재료와 분리합니다.",
      "김치 200g, 물 550ml, 두부 150g을 계량하고 냄비를 중불에서 30초만 예열합니다.",
      "생고기를 만진 손과 도구는 비누로 씻고 완성 음식에 다시 사용하지 않습니다.",
    ],
    steps: [
      {
        index: 1,
        title: "고기와 김치 준비",
        description: "돼지고기 200g과 김치 200g을 각각 2~3cm 크기로 자르고 생고기용 도구는 바로 씻습니다.",
        imageUrl: null,
        heat: "불 없음",
        minutes: 3,
        beginnerTip: "고기와 김치를 같은 도마에서 자르지 않아야 교차오염을 줄일 수 있습니다.",
        visualCue: "고기와 김치가 숟가락에 한두 조각씩 올라가는 비슷한 크기면 됩니다.",
        commonMistake: "생고기 집게로 두부나 완성 음식을 다시 집으면 교차오염될 수 있습니다.",
        rescueTip: "도구가 섞였다면 즉시 세제로 씻고 깨끗한 도구로 바꿔 사용하세요.",
      },
      {
        index: 2,
        title: "돼지고기 2분 볶기",
        description: "냄비를 중불에서 30초 예열하고 식용유 1작은술과 돼지고기를 넣어 2분 볶습니다.",
        imageUrl: null,
        heat: "중불",
        minutes: 2,
        beginnerTip: "고기끼리 겹치지 않게 펴야 겉면이 고르게 익습니다.",
        visualCue: "고기 겉면의 분홍색이 대부분 사라지고 냄비 바닥에 육즙이 살짝 보이면 됩니다.",
        commonMistake: "센불로 시작하면 겉은 타고 속은 아직 차가울 수 있습니다.",
        rescueTip: "바닥이 갈색으로 붙기 시작하면 물 2큰술을 넣고 불을 중약불로 낮추세요.",
      },
      {
        index: 3,
        title: "김치 3분 볶기",
        description: "김치와 김치국물 3큰술을 넣고 중불에서 3분 볶습니다.",
        imageUrl: null,
        heat: "중불",
        minutes: 3,
        beginnerTip: "김치 수분으로 냄비 바닥의 붙은 맛을 긁어 섞으면 타는 것을 막을 수 있습니다.",
        visualCue: "김치색이 진해지고 신 냄새가 부드러워지며 냄비 바닥이 타지 않으면 됩니다.",
        commonMistake: "김치가 마른데 계속 볶으면 고춧가루와 김치가 탑니다.",
        rescueTip: "김치가 마르면 물 2큰술을 먼저 넣고 30초 더 볶으세요.",
      },
      {
        index: 4,
        title: "국물 10분 끓이기",
        description: "물 550ml와 고춧가루 1큰술을 넣고 끓으면 중불로 낮춰 10분 끓입니다.",
        imageUrl: null,
        heat: "중불",
        minutes: 10,
        beginnerTip: "국물이 세게 넘치면 뚜껑을 열고 불을 한 단계 낮춥니다.",
        visualCue: "국물이 붉게 우러나고 김치 줄기가 부드럽게 휘면 됩니다.",
        commonMistake: "강불로 계속 끓이면 물이 빨리 줄어 짜집니다.",
        rescueTip: "국물이 너무 줄면 물 50ml를 넣고 다시 끓이세요.",
      },
      {
        index: 5,
        title: "두부 7분, 대파 1분",
        description: "두부를 넣어 7분 끓이고 대파를 넣어 1분 더 끓인 뒤 가장 큰 고기 조각을 잘라 중심까지 익었는지 확인합니다.",
        imageUrl: null,
        heat: "중불",
        minutes: 8,
        beginnerTip: "고기 중심에 분홍색이나 차가운 부분이 있으면 2분 더 끓입니다.",
        visualCue: "고기 중심이 회갈색으로 익고 두부 가운데까지 뜨거우며 대파 향이 나면 완성입니다.",
        commonMistake: "겉면 색만 보고 불을 끄면 두꺼운 고기 안쪽이 덜 익을 수 있습니다.",
        rescueTip: "덜 익었으면 물 50ml를 추가하고 중불에서 2분 더 끓인 뒤 다시 확인하세요.",
      },
    ],
    successCheck: "돼지고기 중심의 분홍색과 차가운 부분이 없고, 김치 줄기가 부드러우며 국물이 짜지 않게 붉게 우러나면 성공입니다.",
    safetyNotes: [
      "생돼지고기와 완성 음식의 도마, 집게, 젓가락을 분리합니다.",
      "가장 큰 고기 조각을 잘라 중심까지 분홍색 없이 익었는지 확인합니다.",
      "조리 후 2시간 안에 식혀 냉장하고 재가열할 때는 국물이 끓도록 충분히 데웁니다.",
    ],
    storageTip: "남으면 2시간 안에 얕은 밀폐 용기에 나눠 냉장하고 다음 날까지 먹습니다.",
    reheatTip: "냄비에서 국물이 전체적으로 끓기 시작한 뒤 2분 더 데우고 고기와 두부 중심이 뜨거운지 확인합니다.",
    fallbackMeal: "짜면 물 100ml와 두부 100g을 추가하고, 고기가 덜 익었으면 중불에서 2분씩 추가해 중심을 다시 확인합니다.",
  },
  {
    id: "curated-gamja-jorim",
    name: "감자조림",
    category: "반찬",
    method: "조리기",
    calories: "250",
    thumbnailUrl: "/images/recipes/jipbab-curated/gamja-jorim-basic.png",
    ingredients: "감자, 간장, 설탕, 식용유, 참기름",
    hashTag: "#감자 #밑반찬 #도시락",
    ingredientList: ["감자", "간장", "설탕", "식용유", "참기름"],
    ingredientDetails: [
      ingredient("감자", "350g", "중간 크기 감자 2개 정도이며 2cm 크기로 맞추면 익는 시간이 비슷합니다."),
      ingredient("간장", "2큰술", "밥숟가락 2번, 약 30ml입니다."),
      ingredient("설탕", "1큰술", "단맛이 부담되면 1/2큰술만 넣어도 됩니다."),
      ingredient("식용유", "1큰술", "감자 겉면을 코팅하는 양입니다."),
      ingredient("참기름", "1작은술", "마지막 향내기용이라 불 끈 뒤 넣어요."),
    ],
    trustLabel: "밑반찬",
    featuredReason: "상온 재료와 기본 양념만으로 만들기 쉬운 반찬",
    difficulty: 1,
    cookingTime: 22,
    totalMinutes: 22,
    activeMinutes: 10,
    beginnerScore: 92,
    servings: 2,
    beginnerSummary: "감자 350g을 2cm로 잘라 24cm 팬에서 물 200ml로 10~12분 익히고 2~3분만 졸이면 속은 부드럽고 타지 않습니다.",
    measurementTips: DEFAULT_MEASUREMENT_TIPS,
    imageAlt: "윤기 있게 졸인 감자조림 완성 사진",
    imageCaption: "젓가락이 감자 중심까지 들어가고 팬 바닥에 양념이 2~3큰술 남을 때 불을 끕니다.",
    beforeStart: [
      "감자 350g을 2cm 크기로 맞춰 썰고 찬물에 5분 담갔다가 물기를 뺍니다.",
      "24cm 프라이팬, 뚜껑, 물 200ml, 간장 2큰술, 설탕 1큰술을 준비합니다.",
      "감자 조각이 크면 익는 시간이 달라지므로 큰 조각은 2cm로 한 번 더 자릅니다.",
    ],
    steps: [
      {
        index: 1,
        title: "감자 2cm로 준비",
        description: "감자 350g을 2cm 크기로 맞춰 썰어 찬물에 5분 담갔다가 체에 밭쳐 물기를 뺍니다.",
        imageUrl: null,
        heat: "불 없음",
        minutes: 5,
        beginnerTip: "전분을 빼면 팬에 덜 들러붙습니다.",
        visualCue: "감자 조각 크기가 비슷하고 표면의 뿌연 전분물이 줄면 됩니다.",
        commonMistake: "크기가 들쭉날쭉하면 작은 감자는 부서지고 큰 감자는 덜 익습니다.",
        rescueTip: "큰 조각만 골라 2cm 크기로 한 번 더 자르세요.",
      },
      {
        index: 2,
        title: "감자 2분 볶기",
        description: "24cm 프라이팬에 식용유 1큰술을 두르고 감자를 중불에서 2분 볶습니다.",
        imageUrl: null,
        heat: "중불",
        minutes: 2,
        beginnerTip: "감자가 팬에 붙으면 불을 조금 낮추세요.",
        visualCue: "감자 겉면이 살짝 투명해지면 됩니다.",
        commonMistake: "물기를 충분히 빼지 않으면 기름이 튀고 감자가 팬에 붙습니다.",
        rescueTip: "붙기 시작하면 물 1큰술을 넣고 뒤집개로 바닥을 천천히 떼세요.",
      },
      {
        index: 3,
        title: "10~12분 익히기",
        description: "간장 2큰술, 설탕 1큰술, 물 200ml를 넣고 뚜껑을 덮어 중약불에서 10~12분 익힙니다.",
        imageUrl: null,
        heat: "중약불",
        minutes: 12,
        beginnerTip: "5분 지났을 때 한 번만 뒤집고 국물이 거의 없으면 물 50ml를 더합니다.",
        visualCue: "젓가락이 감자 중심까지 힘주지 않고 들어가면 익은 상태입니다.",
        commonMistake: "센불에서 익히면 물이 먼저 줄어 겉은 짜고 속은 딱딱합니다.",
        rescueTip: "감자가 딱딱한데 물이 없으면 물 50ml를 넣고 뚜껑을 덮어 3분 더 익히세요.",
      },
      {
        index: 4,
        title: "2~3분 졸이기",
        description: "뚜껑을 열고 중불에서 2~3분만 팬을 흔들어 졸인 뒤 불을 끄고 참기름 1작은술을 섞습니다.",
        imageUrl: null,
        heat: "중불",
        minutes: 3,
        beginnerTip: "국물이 완전히 없어질 때까지 졸이면 탈 수 있어요.",
        visualCue: "감자 표면에 윤기가 돌고 팬 바닥에 양념이 조금 남으면 완성입니다.",
        commonMistake: "뒤집개로 세게 저으면 익은 감자가 으깨집니다.",
        rescueTip: "감자가 부서지기 시작하면 젓지 말고 팬을 좌우로만 흔들어 마무리하세요.",
      },
    ],
    successCheck: "감자 중심까지 젓가락이 쉽게 들어가고 표면에 윤기가 돌며 팬 바닥에 양념이 2~3큰술 남으면 성공입니다.",
    safetyNotes: [
      "젖은 감자를 뜨거운 기름에 넣으면 튈 수 있으므로 체에 밭쳐 물기를 뺍니다.",
      "뚜껑을 열 때 수증기가 얼굴과 손 반대쪽으로 빠지게 엽니다.",
      "상온에 2시간 넘게 두지 말고 식힌 뒤 냉장 보관합니다.",
    ],
    storageTip: "한 김 식힌 뒤 밀폐 용기에 담아 냉장하고 2일 안에 먹습니다.",
    reheatTip: "물 1큰술을 넣고 덮어 중약불에서 3분 데운 뒤 감자 중심이 뜨거운지 확인합니다.",
    fallbackMeal: "감자가 덜 익으면 물 50ml를 넣어 3분 더 익히고, 짜면 물 2큰술과 감자 100g을 추가합니다.",
  },
  {
    id: "curated-soy-garlic-chicken",
    name: "간장마늘 닭조림",
    category: "일품",
    method: "조리기",
    calories: "610",
    thumbnailUrl: "/images/recipes/soy-garlic-chicken.png",
    ingredients: "닭고기, 간장, 마늘, 양파, 대파",
    hashTag: "#닭고기 #메인반찬 #간장양념",
    ingredientList: ["닭고기", "간장", "마늘", "양파", "대파"],
    ingredientDetails: [
      ingredient("닭고기", "400g", "닭다리살이나 닭가슴살 2인분 정도예요.", "키친타월로 물기를 닦으면 잡내가 줄어요."),
      ingredient("간장", "3큰술", "밥숟가락 3번, 약 45ml입니다."),
      ingredient("마늘", "1큰술", "다진 마늘 밥숟가락 1번입니다."),
      ingredient("양파", "1/2개", "채 썰어 넣으면 단맛이 나요."),
      ingredient("대파", "1/2대", "마지막에 넣어 향을 살립니다."),
    ],
    trustLabel: "저녁 추천",
    featuredReason: "냉장고 채소를 곁들여 메인 요리로 만들기 좋음",
    difficulty: 2,
    cookingTime: 30,
    totalMinutes: 30,
    beginnerScore: 92,
    servings: 2,
    beginnerSummary: "닭은 먼저 겉면을 익힌 뒤 물을 넣고 졸이면 속까지 익고 양념이 잘 배어듭니다.",
    measurementTips: DEFAULT_MEASUREMENT_TIPS,
    imageAlt: "감자와 당근이 들어간 간장마늘 닭조림 완성 사진",
    imageCaption: "양념이 걸쭉해지고 닭 속이 하얗게 익으면 완성입니다.",
    steps: [
      {
        index: 1,
        description: "닭고기는 한입 크기로 자르고 키친타월로 물기를 닦습니다.",
        imageUrl: null,
        beginnerTip: "물기가 많으면 굽는 대신 삶아지는 느낌이 날 수 있어요.",
        visualCue: "표면이 번들거리지 않고 보송하면 됩니다.",
      },
      {
        index: 2,
        description: "팬에 닭고기를 넣고 중불에서 겉면이 하얗게 될 때까지 4분 굽습니다.",
        imageUrl: null,
        beginnerTip: "처음에는 자주 뒤집지 말고 한 면씩 익히세요.",
        visualCue: "닭 겉면의 분홍색이 거의 사라지면 다음 단계입니다.",
      },
      {
        index: 3,
        description: "간장 3큰술, 마늘 1큰술, 물 200ml, 양파를 넣고 15분 조립니다.",
        imageUrl: null,
        beginnerTip: "200ml는 종이컵 1컵보다 조금 많은 양입니다.",
        visualCue: "양념이 반 정도 줄고 닭에 갈색 윤기가 돌면 좋아요.",
      },
      {
        index: 4,
        description: "대파를 넣고 2분 더 졸여 마무리합니다.",
        imageUrl: null,
        beginnerTip: "닭이 익었는지 걱정되면 가장 두꺼운 조각을 잘라 속이 하얀지 확인하세요.",
        visualCue: "속살이 분홍색 없이 하얗고 육즙이 맑으면 익은 상태입니다.",
      },
    ],
    safetyNotes: [
      "생닭과 채소의 도마, 칼, 집게를 분리하고 생닭을 만진 손은 비누로 씻습니다.",
      "가장 두꺼운 닭 조각을 잘라 중심에 분홍색이 없고 육즙이 맑은지 확인합니다.",
      "조리 후 2시간 안에 냉장하고 재가열할 때 닭 중심까지 뜨겁게 데웁니다.",
    ],
    storageTip: "한 김 식힌 뒤 얕은 밀폐 용기에 담아 2시간 안에 냉장하고 다음 날까지 먹습니다.",
    reheatTip: "물 2큰술을 넣고 뚜껑을 덮어 중약불에서 4분 데운 뒤 가장 큰 조각의 중심을 확인합니다.",
    fallbackMeal: "닭 중심이 분홍색이면 물 50ml를 넣고 3분 더 익히며, 짜면 양파와 물을 추가합니다.",
  },
  {
    id: "curated-tuna-kimchi-fried-rice",
    name: "참치김치볶음밥",
    category: "밥",
    method: "볶기",
    calories: "560",
    thumbnailUrl: "/images/recipes/jipbab-curated/tuna-kimchi-fried-rice.png",
    ingredients: "참치캔, 김치, 밥, 대파, 계란",
    hashTag: "#참치캔 #한그릇 #자취요리",
    ingredientList: ["참치캔", "김치", "밥", "대파", "계란"],
    ingredientDetails: [
      ingredient("참치캔", "1/2캔", "작은 캔 기준 반 캔입니다. 기름은 1큰술만 남기면 고소해요."),
      ingredient("김치", "1컵", "종이컵 1컵, 잘게 자른 양입니다."),
      ingredient("밥", "1공기", "찬밥이나 즉석밥 1개 기준입니다."),
      ingredient("대파", "1/3대", "송송 썰어 향을 냅니다."),
      ingredient("계란", "1개", "프라이로 올리면 한 끼 느낌이 좋아집니다."),
    ],
    trustLabel: "한그릇",
    featuredReason: "캔참치와 남은 김치로 빠르게 해결하는 메뉴",
    difficulty: 1,
    cookingTime: 12,
    servings: 1,
    beginnerSummary: "참치 기름을 조금 남겨 볶으면 식용유를 많이 쓰지 않아도 고소합니다.",
    measurementTips: DEFAULT_MEASUREMENT_TIPS,
    imageAlt: "계란프라이가 올라간 참치김치볶음밥 완성 사진",
    imageCaption: "참치는 오래 볶지 말고 김치가 익은 뒤 넣어야 퍽퍽하지 않습니다.",
    steps: [
      {
        index: 1,
        description: "참치캔은 기름 1큰술만 남기고 김치는 1cm 크기로 자릅니다.",
        imageUrl: null,
        beginnerTip: "참치 기름을 전부 버리지 않으면 볶을 때 고소한 맛이 납니다.",
        visualCue: "캔 바닥에 기름이 살짝 남은 정도면 됩니다.",
      },
      {
        index: 2,
        description: "팬에 대파를 30초 볶고 김치를 넣어 2분 더 볶습니다.",
        imageUrl: null,
        beginnerTip: "김치가 너무 시면 설탕 1작은술을 넣어도 됩니다.",
        visualCue: "김치 색이 진해지고 신 냄새가 줄면 됩니다.",
      },
      {
        index: 3,
        description: "참치와 밥을 넣고 밥알을 풀어가며 2분 볶습니다.",
        imageUrl: null,
        beginnerTip: "밥이 뭉치면 주걱을 세워 자르듯이 풀어주세요.",
        visualCue: "밥알에 김치색이 골고루 묻으면 됩니다.",
      },
      {
        index: 4,
        description: "불을 끄고 참기름 1작은술을 섞은 뒤 계란프라이를 올립니다.",
        imageUrl: null,
        beginnerTip: "계란은 반숙이 어려우면 완숙으로 익혀도 괜찮아요.",
        visualCue: "밥이 고슬고슬하고 기름지게 뭉치지 않으면 완성입니다.",
      },
    ],
  },
  {
    id: "curated-soy-egg-rice",
    name: "계란간장밥",
    category: "밥",
    method: "비비기",
    calories: "460",
    thumbnailUrl: "/images/recipes/jipbab-curated/soy-egg-rice.png",
    ingredients: "계란, 밥, 간장, 참기름, 김",
    hashTag: "#5분요리 #계란 #자취밥",
    ingredientList: ["계란", "밥", "간장", "참기름", "김"],
    ingredientDetails: [
      ingredient("밥", "1공기", "즉석밥 1개 또는 밥공기 1그릇이에요."),
      ingredient("계란", "1개", "처음이면 완숙 프라이가 가장 쉽습니다."),
      ingredient("간장", "1큰술", "밥숟가락 평평하게 1번, 약 15ml입니다."),
      ingredient("참기름", "1작은술", "티스푼 1번, 약 5ml만 넣어도 향이 충분해요."),
      ingredient("김", "1장", "조미김 1봉을 부숴 넣어도 됩니다."),
    ],
    trustLabel: "5분 한끼",
    featuredReason: "계란 하나로 바로 해결하는 가장 쉬운 집밥",
    difficulty: 1,
    cookingTime: 5,
    servings: 1,
    beginnerSummary: "간장은 처음부터 많이 넣지 말고 1큰술만 넣은 뒤 비벼서 맛을 보고 추가하세요.",
    measurementTips: DEFAULT_MEASUREMENT_TIPS,
    imageAlt: "계란을 올린 간장계란밥 완성 예시",
    imageCaption: "노른자를 터뜨려 밥과 먼저 섞으면 간장이 적어도 고소합니다.",
    steps: [
      {
        index: 1,
        description: "따뜻한 밥 1공기를 그릇에 담습니다.",
        imageUrl: null,
        beginnerTip: "찬밥이면 전자레인지에 1분 데우면 비비기 쉬워요.",
        visualCue: "밥알이 따뜻하고 뭉친 부분이 풀리면 됩니다.",
      },
      {
        index: 2,
        description: "팬에 식용유 1작은술을 두르고 계란 1개를 프라이합니다.",
        imageUrl: null,
        beginnerTip: "반숙이 어렵다면 노른자까지 완전히 익혀도 괜찮아요.",
        visualCue: "흰자가 투명하지 않고 하얗게 굳으면 먹을 수 있습니다.",
      },
      {
        index: 3,
        description: "밥 위에 계란, 간장 1큰술, 참기름 1작은술을 올립니다.",
        imageUrl: null,
        beginnerTip: "간장 1큰술은 밥숟가락으로 넘치지 않게 한 번입니다.",
        visualCue: "간장이 밥 위에 한 바퀴 얇게 도는 정도면 충분해요.",
      },
      {
        index: 4,
        description: "김을 잘게 부숴 넣고 숟가락으로 골고루 비빕니다.",
        imageUrl: null,
        beginnerTip: "싱거우면 간장 1작은술만 추가하세요.",
        visualCue: "밥알에 노른자와 간장이 고르게 묻으면 완성입니다.",
      },
    ],
  },
  {
    id: "curated-steamed-egg",
    name: "전자레인지 계란찜",
    category: "반찬",
    method: "찌기",
    calories: "210",
    thumbnailUrl: "/images/recipes/jipbab-curated/steamed-egg.png",
    ingredients: "계란, 물, 대파, 소금, 참기름",
    hashTag: "#계란찜 #부드러운반찬 #초보가능",
    ingredientList: ["계란", "물", "대파", "소금", "참기름"],
    ingredientDetails: [
      ingredient("계란", "3개", "작은 뚝배기나 전자레인지용 그릇 1개 분량입니다."),
      ingredient("물", "150ml", "종이컵 4/5컵 정도예요."),
      ingredient("대파", "1큰술", "송송 썬 대파를 밥숟가락 1번 넣습니다."),
      ingredient("소금", "1/4작은술", "티스푼 끝에 얇게 깔리는 정도입니다."),
      ingredient("참기름", "1/2작은술", "마지막 향내기용이라 생략해도 됩니다."),
    ],
    trustLabel: "초보 반찬",
    featuredReason: "계란을 많이 보유했을 때 실패 적게 만드는 반찬",
    difficulty: 1,
    cookingTime: 12,
    servings: 2,
    beginnerSummary: "계란과 물 비율은 계란 3개에 물 150ml로 시작하면 너무 단단하지 않습니다.",
    measurementTips: DEFAULT_MEASUREMENT_TIPS,
    imageAlt: "부드러운 계란찜 완성 예시",
    imageCaption: "센불로 오래 끓이면 구멍이 커지니 약불로 천천히 익힙니다.",
    steps: [
      {
        index: 1,
        description: "그릇에 계란 3개, 물 150ml, 소금 1/4작은술을 넣고 잘 풉니다.",
        imageUrl: null,
        beginnerTip: "체에 거르면 더 부드럽지만, 처음에는 젓가락으로 충분히 풀어도 됩니다.",
        visualCue: "흰자 덩어리가 거의 보이지 않으면 좋아요.",
      },
      {
        index: 2,
        description: "작은 냄비나 뚝배기에 계란물을 붓고 중약불에 올립니다.",
        imageUrl: null,
        beginnerTip: "바닥이 눌어붙지 않게 처음 1분은 숟가락으로 천천히 저어주세요.",
        visualCue: "가장자리가 살짝 익기 시작하면 불을 약하게 줄입니다.",
      },
      {
        index: 3,
        description: "뚜껑을 덮고 약불에서 6분 익힌 뒤 대파를 올립니다.",
        imageUrl: null,
        beginnerTip: "전자레인지라면 랩을 살짝 덮고 2분 30초부터 확인하세요.",
        visualCue: "가운데가 출렁이지만 물처럼 흐르지 않으면 거의 익은 상태입니다.",
      },
      {
        index: 4,
        description: "불을 끄고 2분 뜸을 들인 뒤 참기름을 살짝 둘러 마무리합니다.",
        imageUrl: null,
        beginnerTip: "덜 익었으면 약불로 1분만 더 익히세요.",
        visualCue: "숟가락으로 떠도 물이 고이지 않으면 완성입니다.",
      },
    ],
  },
  {
    id: "curated-bean-sprout-soup",
    name: "콩나물국",
    category: "국·찌개",
    method: "끓이기",
    calories: "120",
    thumbnailUrl: "/images/recipes/jipbab-curated/bean-sprout-soup.png",
    ingredients: "콩나물, 대파, 마늘, 국간장, 소금",
    hashTag: "#국물 #콩나물 #해장",
    ingredientList: ["콩나물", "대파", "마늘", "국간장", "소금"],
    ingredientDetails: [
      ingredient("콩나물", "200g", "마트 콩나물 작은 봉지 1개 정도입니다.", "흐르는 물에 2번 헹궈요."),
      ingredient("대파", "1/2대", "송송 썰어 마지막에 넣습니다."),
      ingredient("마늘", "1작은술", "다진 마늘 티스푼 1번입니다."),
      ingredient("국간장", "1큰술", "밥숟가락 1번, 약 15ml입니다."),
      ingredient("소금", "1/4작은술", "마지막 간 조절용입니다."),
    ],
    trustLabel: "국물 기본",
    featuredReason: "콩나물 한 봉지를 가장 쉽게 소진하는 국",
    difficulty: 1,
    cookingTime: 15,
    servings: 2,
    beginnerSummary: "콩나물 비린내가 걱정되면 끓는 동안 뚜껑을 열고 끝까지 끓이는 방식으로 가세요.",
    measurementTips: DEFAULT_MEASUREMENT_TIPS,
    imageAlt: "맑은 콩나물국 완성 예시",
    imageCaption: "맑은 국물은 간장을 적게 쓰고 소금으로 마무리하면 색이 탁해지지 않습니다.",
    steps: [
      {
        index: 1,
        description: "콩나물을 흐르는 물에 2번 헹구고 물기를 뺍니다.",
        imageUrl: null,
        beginnerTip: "상한 냄새가 나거나 물컹한 콩나물은 빼주세요.",
        visualCue: "콩나물 머리가 노랗고 줄기가 단단하면 신선합니다.",
      },
      {
        index: 2,
        description: "냄비에 물 700ml를 붓고 콩나물과 마늘 1작은술을 넣어 끓입니다.",
        imageUrl: null,
        beginnerTip: "700ml는 종이컵 약 4컵입니다.",
        visualCue: "물이 끓으며 콩나물이 위로 떠오르면 익기 시작한 거예요.",
      },
      {
        index: 3,
        description: "끓어오르면 중불로 낮추고 7분 더 끓입니다.",
        imageUrl: null,
        beginnerTip: "뚜껑을 열었다 닫았다 하면 비린내가 날 수 있으니 처음부터 열고 끓이세요.",
        visualCue: "콩나물 줄기가 반투명하고 부드러워지면 됩니다.",
      },
      {
        index: 4,
        description: "국간장 1큰술과 대파를 넣고, 싱거우면 소금을 조금 넣어 마무리합니다.",
        imageUrl: null,
        beginnerTip: "소금은 한 번에 많이 넣지 말고 한 꼬집씩 넣어 맛을 보세요.",
        visualCue: "국물이 맑고 콩나물 비린 향이 줄면 완성입니다.",
      },
    ],
  },
  {
    id: "curated-cucumber-muchim",
    name: "오이무침",
    category: "반찬",
    method: "무치기",
    calories: "90",
    thumbnailUrl: "/images/recipes/jipbab-curated/cucumber-muchim.png",
    ingredients: "오이, 간장, 식초, 설탕",
    hashTag: "#오이 #무침 #10분반찬",
    ingredientList: ["오이", "간장", "식초", "설탕"],
    ingredientDetails: [
      ingredient("오이", "1개", "일반 오이 1개 기준입니다.", "양끝을 살짝 잘라내고 씻어요."),
      ingredient("간장", "1큰술", "처음부터 많이 넣지 말고 1큰술에서 멈춥니다."),
      ingredient("식초", "1큰술", "밥숟가락 1번, 새콤한 맛을 냅니다."),
      ingredient("설탕", "1작은술", "티스푼 1번, 신맛을 부드럽게 합니다."),
    ],
    trustLabel: "10분 반찬",
    featuredReason: "불 없이 바로 만드는 상큼한 냉장고 반찬",
    difficulty: 1,
    cookingTime: 8,
    servings: 2,
    beginnerSummary: "오이는 너무 얇게 썰면 금방 물러지니 0.5cm 두께를 기준으로 썰면 식감이 좋습니다.",
    measurementTips: DEFAULT_MEASUREMENT_TIPS,
    imageAlt: "상큼하게 무친 오이무침 완성 예시",
    imageCaption: "먹기 직전에 무치면 물이 덜 생기고 아삭합니다.",
    steps: [
      {
        index: 1,
        description: "오이를 0.5cm 두께로 어슷하게 썹니다.",
        imageUrl: null,
        beginnerTip: "칼이 어렵다면 반달 모양으로 잘라도 맛은 같습니다.",
        visualCue: "오이 조각이 너무 얇아 접히지 않으면 좋아요.",
      },
      {
        index: 2,
        description: "그릇에 간장 1큰술, 식초 1큰술, 설탕 1작은술을 넣고 설탕이 보이지 않을 때까지 섞습니다.",
        imageUrl: null,
        beginnerTip: "고춧가루는 맵게 먹고 싶을 때만 마지막에 조금 넣으세요.",
        visualCue: "설탕 알갱이가 보이지 않고 양념이 묽게 섞이면 됩니다.",
      },
      {
        index: 3,
        description: "오이를 넣고 손이나 숟가락으로 가볍게 버무립니다.",
        imageUrl: null,
        beginnerTip: "세게 주무르면 오이가 물러지니 살살 섞어주세요.",
        visualCue: "오이 표면에 양념이 얇게 묻고 그릇 바닥에 물이 많이 고이지 않으면 됩니다.",
      },
      {
        index: 4,
        description: "맛을 보고 싱거우면 소금 한 꼬집을 넣어 마무리합니다.",
        imageUrl: null,
        beginnerTip: "짠맛보다 새콤달콤한 맛이 먼저 나야 밥반찬으로 좋아요.",
        visualCue: "그릇 바닥에 물이 많이 생기기 전 바로 먹으면 가장 아삭합니다.",
      },
    ],
  },
  {
    id: "curated-jeyuk-bokkeum",
    name: "제육볶음",
    category: "일품",
    method: "볶기",
    calories: "650",
    thumbnailUrl: "/images/recipes/jipbab-curated/jeyuk-bokkeum.png",
    ingredients: "돼지고기, 양파, 대파, 고추장, 간장",
    hashTag: "#돼지고기 #매콤 #저녁메뉴",
    ingredientList: ["돼지고기", "양파", "대파", "고추장", "간장"],
    ingredientDetails: [
      ingredient("돼지고기", "300g", "앞다리살이나 목살 2인분 정도입니다.", "키친타월로 핏물을 닦으면 잡내가 줄어요.", true),
      ingredient("양파", "1/2개", "채 썰면 단맛이 잘 나옵니다.", "손가락 반 마디 폭으로 썹니다.", true),
      ingredient("대파", "1/2대", "마지막에 넣어 향을 살립니다.", "어슷하게 썹니다.", true),
      ingredient("고추장", "1큰술", "밥숟가락 평평하게 1번입니다.", "고기와 먼저 섞습니다.", true),
      ingredient("간장", "2큰술", "밥숟가락 2번, 약 30ml입니다.", "고추장과 섞습니다.", true),
    ],
    trustLabel: "저녁 추천",
    featuredReason: "돼지고기와 양파만 있어도 식사 만족도가 높은 메뉴",
    difficulty: 2,
    cookingTime: 25,
    totalMinutes: 25,
    beginnerScore: 92,
    servings: 2,
    beginnerSummary: "양념은 고기와 먼저 섞어두고, 팬에서는 센불보다 중불로 볶아야 타지 않습니다.",
    measurementTips: DEFAULT_MEASUREMENT_TIPS,
    imageAlt: "매콤한 제육볶음 완성 예시",
    imageCaption: "양념이 고기에 붙고 양파가 투명해지면 거의 완성입니다.",
    steps: [
      {
        index: 1,
        description: "돼지고기 300g에 고추장 1큰술, 간장 2큰술, 설탕 1큰술, 마늘 1큰술을 섞습니다.",
        imageUrl: null,
        beginnerTip: "설탕과 마늘은 기본 양념입니다. 없으면 설탕만 넣어도 됩니다.",
        visualCue: "고기 겉면이 빨간 양념으로 고르게 덮이면 됩니다.",
      },
      {
        index: 2,
        description: "양파는 채 썰고 대파는 어슷하게 썹니다.",
        imageUrl: null,
        beginnerTip: "두께가 일정하지 않아도 익으면서 숨이 죽습니다.",
        visualCue: "양파가 손가락 반 마디 폭 정도면 볶기 좋습니다.",
      },
      {
        index: 3,
        description: "팬을 중불로 달군 뒤 양념한 고기를 6분 볶습니다.",
        imageUrl: null,
        beginnerTip: "양념이 탈 것 같으면 물 2큰술을 넣고 볶으세요.",
        visualCue: "고기의 분홍색이 사라지고 양념이 끓듯이 붙으면 됩니다.",
      },
      {
        index: 4,
        description: "양파와 대파를 넣고 4분 더 볶아 마무리합니다.",
        imageUrl: null,
        beginnerTip: "고기 한 조각을 잘라 속까지 하얗게 익었는지 확인하세요.",
        visualCue: "양파가 투명하고 팬 바닥에 양념이 살짝 남으면 완성입니다.",
      },
    ],
    safetyNotes: [
      "생돼지고기와 채소의 도마, 칼, 집게를 분리하고 생고기를 만진 손을 비누로 씻습니다.",
      "가장 두꺼운 고기 조각을 잘라 중심의 분홍색이 사라졌는지 확인합니다.",
      "조리 후 2시간 안에 냉장하고 재가열할 때 고기 중심까지 뜨겁게 데웁니다.",
    ],
    storageTip: "한 김 식힌 뒤 2시간 안에 밀폐 용기에 담아 냉장하고 다음 날까지 먹습니다.",
    reheatTip: "물 2큰술을 넣고 중약불에서 4분 볶아 고기 중심이 뜨거운지 확인합니다.",
    fallbackMeal: "고기가 덜 익으면 물 2큰술을 넣고 2분씩 더 볶으며, 짜면 양파나 밥을 추가합니다.",
  },
  {
    id: "curated-seaweed-soup",
    name: "소고기 미역국",
    category: "국·찌개",
    method: "끓이기",
    calories: "310",
    thumbnailUrl: "/images/recipes/jipbab-curated/beef-seaweed-soup.png",
    ingredients: "미역, 소고기, 국간장, 마늘, 참기름",
    hashTag: "#미역국 #국물 #기본한식",
    ingredientList: ["미역", "소고기", "국간장", "마늘", "참기름"],
    ingredientDetails: [
      ingredient("마른 미역", "10g", "한 줌보다 적은 양도 불리면 4배 이상 늘어납니다.", "찬물에 10분 불려요."),
      ingredient("소고기", "100g", "국거리 한 줌 정도입니다."),
      ingredient("국간장", "1큰술", "밥숟가락 1번, 약 15ml입니다."),
      ingredient("마늘", "1작은술", "다진 마늘 티스푼 1번입니다."),
      ingredient("참기름", "1큰술", "미역과 고기를 볶을 때 사용합니다."),
    ],
    trustLabel: "기본 한식",
    featuredReason: "마른 미역과 소고기로 오래 끓이지 않아도 깊은 국물",
    difficulty: 1,
    cookingTime: 25,
    servings: 2,
    beginnerSummary: "미역은 생각보다 많이 불어나니 처음에는 10g만 사용하고, 국간장은 색과 향을 내는 정도로 시작하세요.",
    measurementTips: DEFAULT_MEASUREMENT_TIPS,
    imageAlt: "소고기 미역국 완성 예시",
    imageCaption: "미역을 참기름에 먼저 볶으면 국물 향이 깊어집니다.",
    steps: [
      {
        index: 1,
        description: "마른 미역 10g을 찬물에 10분 불린 뒤 물기를 짜고 먹기 좋게 자릅니다.",
        imageUrl: null,
        beginnerTip: "불린 미역이 너무 길면 가위로 잘라도 됩니다.",
        visualCue: "미역이 부드럽고 진한 초록색으로 풀리면 됩니다.",
      },
      {
        index: 2,
        description: "냄비에 참기름 1큰술을 두르고 소고기와 미역을 중불에서 3분 볶습니다.",
        imageUrl: null,
        beginnerTip: "고기가 냄비에 붙으면 불을 조금 낮추세요.",
        visualCue: "고기 겉면이 갈색으로 변하고 미역 향이 올라오면 됩니다.",
      },
      {
        index: 3,
        description: "물 800ml, 국간장 1큰술, 마늘 1작은술을 넣고 15분 끓입니다.",
        imageUrl: null,
        beginnerTip: "800ml는 종이컵 약 4컵 반입니다.",
        visualCue: "국물이 맑은 갈색이고 미역이 부드러워지면 좋아요.",
      },
      {
        index: 4,
        description: "맛을 보고 싱거우면 소금을 한 꼬집씩 넣어 마무리합니다.",
        imageUrl: null,
        beginnerTip: "국간장을 많이 넣으면 색이 진해지니 마지막 간은 소금이 안전합니다.",
        visualCue: "국물이 짜지 않고 고소하면 완성입니다.",
      },
    ],
  },
  {
    id: "curated-curry-rice",
    name: "카레라이스",
    category: "밥",
    method: "끓이기",
    calories: "620",
    thumbnailUrl: "/images/recipes/jipbab-curated/curry-rice.png",
    ingredients: "카레가루, 감자, 양파, 당근, 밥",
    hashTag: "#카레 #냉장고채소 #한그릇",
    ingredientList: ["카레가루", "감자", "양파", "당근", "밥"],
    ingredientDetails: [
      ingredient("카레가루", "4큰술", "고형 카레라면 2조각 정도입니다."),
      ingredient("감자", "1개", "작은 주사위 크기로 썰면 빨리 익어요."),
      ingredient("양파", "1/2개", "채소 단맛을 내는 기본 재료입니다."),
      ingredient("당근", "1/3개", "색을 내는 정도라 없으면 생략 가능합니다."),
      ingredient("밥", "2공기", "2인분 기준입니다."),
    ],
    trustLabel: "한그릇",
    featuredReason: "남은 채소를 한 번에 정리하기 좋은 메뉴",
    difficulty: 1,
    cookingTime: 25,
    servings: 2,
    beginnerSummary: "카레는 가루를 바로 넣으면 뭉칠 수 있어 불을 잠깐 끄고 풀어 넣는 게 안전합니다.",
    measurementTips: DEFAULT_MEASUREMENT_TIPS,
    imageAlt: "감자와 양파가 들어간 카레라이스 완성 예시",
    imageCaption: "채소 크기를 작게 맞추면 초보자도 익힘 실패가 적습니다.",
    steps: [
      {
        index: 1,
        description: "감자, 양파, 당근을 1.5cm 크기로 썹니다.",
        imageUrl: null,
        beginnerTip: "크기가 조금 달라도 감자만 너무 크지 않으면 됩니다.",
        visualCue: "숟가락에 2~3조각 올라가는 크기면 먹기 좋아요.",
      },
      {
        index: 2,
        description: "냄비에 식용유 1큰술을 두르고 채소를 중불에서 3분 볶습니다.",
        imageUrl: null,
        beginnerTip: "양파가 먼저 투명해지면 단맛이 나기 시작합니다.",
        visualCue: "감자 가장자리가 살짝 투명해지면 물을 넣어도 됩니다.",
      },
      {
        index: 3,
        description: "물 500ml를 넣고 감자가 익을 때까지 10분 끓입니다.",
        imageUrl: null,
        beginnerTip: "500ml는 종이컵 약 2컵 반입니다.",
        visualCue: "젓가락이 감자에 부드럽게 들어가면 익은 상태입니다.",
      },
      {
        index: 4,
        description: "불을 약하게 줄이고 카레가루 4큰술을 풀어 3분 더 끓입니다.",
        imageUrl: null,
        beginnerTip: "가루가 뭉치면 국자로 눌러 풀어주세요.",
        visualCue: "국물이 걸쭉해지고 숟가락 뒷면에 묻으면 완성입니다.",
      },
    ],
  },
  {
    id: "curated-dumpling-soup",
    name: "떡만두국",
    category: "국·찌개",
    method: "끓이기",
    calories: "540",
    thumbnailUrl: "/images/recipes/jipbab-curated/tteok-mandu-guk.png",
    ingredients: "냉동만두, 떡, 계란, 대파, 국간장",
    hashTag: "#냉동만두 #떡국 #간단국물",
    ingredientList: ["냉동만두", "떡", "계란", "대파", "국간장"],
    ingredientDetails: [
      ingredient("냉동만두", "6개", "2인분 기준 중간 크기 만두 6개입니다."),
      ingredient("떡국떡", "1컵", "종이컵 1컵, 물에 한 번 헹궈요."),
      ingredient("계란", "1개", "마지막에 풀어 넣습니다."),
      ingredient("대파", "1/2대", "송송 썰어 국물 향을 냅니다."),
      ingredient("국간장", "1큰술", "밥숟가락 1번, 약 15ml입니다."),
    ],
    trustLabel: "냉동 활용",
    featuredReason: "냉동만두와 떡으로 빠르게 든든한 한 그릇",
    difficulty: 1,
    cookingTime: 15,
    servings: 2,
    beginnerSummary: "만두는 오래 끓이면 터질 수 있으니 떡을 먼저 넣고 만두는 중간에 넣는 순서가 좋습니다.",
    measurementTips: DEFAULT_MEASUREMENT_TIPS,
    imageAlt: "떡과 만두가 들어간 국 완성 예시",
    imageCaption: "만두피가 투명해지고 떡이 말랑하면 완성입니다.",
    steps: [
      {
        index: 1,
        description: "떡국떡 1컵을 물에 헹구고 대파를 송송 썹니다.",
        imageUrl: null,
        beginnerTip: "떡이 딱딱하면 찬물에 5분 담가두세요.",
        visualCue: "떡 표면의 하얀 가루가 씻겨 나가면 됩니다.",
      },
      {
        index: 2,
        description: "냄비에 물 700ml와 국간장 1큰술을 넣고 끓입니다.",
        imageUrl: null,
        beginnerTip: "육수팩이 있으면 같이 넣고 5분 뒤 빼면 더 맛있습니다.",
        visualCue: "물이 크게 끓어오르면 떡을 넣을 준비가 된 상태입니다.",
      },
      {
        index: 3,
        description: "떡을 넣고 3분 끓인 뒤 냉동만두 6개를 넣어 6분 더 끓입니다.",
        imageUrl: null,
        beginnerTip: "만두를 세게 저으면 터지니 국자로 살살 밀어주세요.",
        visualCue: "떡이 떠오르고 만두피가 살짝 투명해지면 익은 거예요.",
      },
      {
        index: 4,
        description: "계란 1개를 풀어 둘러 넣고 대파를 넣어 1분 더 끓입니다.",
        imageUrl: null,
        beginnerTip: "계란을 넣은 뒤 바로 세게 젓지 말고 10초 기다리세요.",
        visualCue: "계란이 노란 실처럼 익고 국물이 다시 끓으면 완성입니다.",
      },
    ],
  },
  {
    id: "curated-bibim-guksu",
    name: "비빔국수",
    category: "분식",
    method: "비비기",
    calories: "510",
    thumbnailUrl: "/images/recipes/jipbab-curated/bibim-guksu.png",
    ingredients: "국수, 고추장, 식초, 설탕, 참기름",
    hashTag: "#분식 #매콤새콤 #10분요리",
    ingredientList: ["국수", "고추장", "식초", "설탕", "참기름"],
    ingredientDetails: [
      ingredient("국수", "100g", "500원 동전 크기로 잡은 한 줌이 1인분 정도입니다."),
      ingredient("고추장", "1큰술", "밥숟가락 평평하게 1번입니다."),
      ingredient("식초", "1큰술", "새콤한 맛을 내는 기본 양입니다."),
      ingredient("설탕", "1큰술", "고추장 매운맛을 부드럽게 합니다."),
      ingredient("참기름", "1작은술", "마지막에 넣어 고소한 향을 냅니다."),
    ],
    trustLabel: "10분 한끼",
    featuredReason: "국수와 기본 양념만 있으면 바로 만드는 매콤한 한 끼",
    difficulty: 1,
    cookingTime: 12,
    servings: 1,
    beginnerSummary: "면은 삶은 뒤 찬물에 충분히 헹궈야 끈적이지 않고 양념이 깔끔하게 묻습니다.",
    measurementTips: DEFAULT_MEASUREMENT_TIPS,
    imageAlt: "매콤한 비빔국수 완성 예시",
    imageCaption: "면의 물기를 잘 빼야 양념이 묽어지지 않습니다.",
    steps: [
      {
        index: 1,
        description: "끓는 물에 국수 100g을 넣고 봉지 표기 시간보다 30초 짧게 삶습니다.",
        imageUrl: null,
        beginnerTip: "거품이 넘치면 찬물 1/2컵을 넣으면 가라앉습니다.",
        visualCue: "면 한 가닥을 먹었을 때 가운데 딱딱함이 없으면 됩니다.",
      },
      {
        index: 2,
        description: "삶은 면을 찬물에 2번 헹구고 체에 밭쳐 물기를 뺍니다.",
        imageUrl: null,
        beginnerTip: "손으로 가볍게 비벼 전분기를 씻어내세요.",
        visualCue: "면이 미끄럽지 않고 차갑게 식으면 좋습니다.",
      },
      {
        index: 3,
        description: "고추장 1큰술, 식초 1큰술, 설탕 1큰술, 참기름 1작은술을 섞습니다.",
        imageUrl: null,
        beginnerTip: "매운맛이 걱정되면 고추장을 1/2큰술로 줄이세요.",
        visualCue: "양념이 되직하지만 숟가락에서 천천히 떨어지면 됩니다.",
      },
      {
        index: 4,
        description: "면에 양념을 넣고 젓가락으로 들어 올리며 비빕니다.",
        imageUrl: null,
        beginnerTip: "양념은 2/3만 먼저 넣고 맛을 본 뒤 추가하면 안전합니다.",
        visualCue: "면 전체가 붉은색으로 고르게 물들면 완성입니다.",
      },
    ],
  },
  {
    id: "curated-tuna-mayo-rice",
    name: "참치마요덮밥",
    category: "밥",
    method: "비비기",
    calories: "620",
    thumbnailUrl: "/images/recipes/jipbab-curated/tuna-mayo-rice-bowl.png",
    ingredients: "참치캔, 밥, 마요네즈, 간장, 김",
    hashTag: "#참치캔 #덮밥 #자취요리",
    ingredientList: ["참치캔", "밥", "마요네즈", "간장", "김"],
    ingredientDetails: [
      ingredient("참치캔", "1캔", "작은 캔 1개 기준입니다.", "기름은 대부분 빼고 사용합니다."),
      ingredient("밥", "1공기", "즉석밥 1개도 가능합니다."),
      ingredient("마요네즈", "1큰술", "밥숟가락 1번, 느끼하면 1/2큰술만 넣으세요."),
      ingredient("간장", "1작은술", "티스푼 1번, 짠맛을 살짝 보탭니다."),
      ingredient("김", "1장", "조미김 1봉을 부숴도 됩니다."),
    ],
    trustLabel: "캔 활용",
    featuredReason: "불 없이 캔참치로 만드는 실패 적은 덮밥",
    difficulty: 1,
    cookingTime: 7,
    servings: 1,
    beginnerSummary: "참치 기름을 너무 많이 남기면 느끼하니 숟가락으로 꾹 눌러 대부분 빼고 시작하세요.",
    measurementTips: DEFAULT_MEASUREMENT_TIPS,
    imageAlt: "참치마요덮밥 완성 예시",
    imageCaption: "마요네즈는 처음부터 많이 넣지 말고 부족하면 추가합니다.",
    steps: [
      {
        index: 1,
        description: "참치캔 기름을 빼고 참치를 그릇에 담습니다.",
        imageUrl: null,
        beginnerTip: "캔 뚜껑으로 참치를 눌러 기름을 빼면 쉽습니다.",
        visualCue: "참치가 축축하지만 기름이 고이지 않으면 됩니다.",
      },
      {
        index: 2,
        description: "참치에 마요네즈 1큰술, 간장 1작은술을 넣고 섞습니다.",
        imageUrl: null,
        beginnerTip: "마요네즈가 많으면 느끼하니 처음엔 1큰술만 넣으세요.",
        visualCue: "참치가 촉촉하게 뭉치면 충분합니다.",
      },
      {
        index: 3,
        description: "따뜻한 밥 1공기 위에 참치마요를 올립니다.",
        imageUrl: null,
        beginnerTip: "밥이 너무 뜨거우면 마요네즈가 묽어지니 1분 식혀도 좋습니다.",
        visualCue: "참치가 밥 위에 고르게 덮이면 먹기 편합니다.",
      },
      {
        index: 4,
        description: "김을 잘게 부숴 올리고 기호에 따라 계란프라이를 곁들입니다.",
        imageUrl: null,
        beginnerTip: "싱거우면 간장 1작은술을 밥 가장자리로 추가하세요.",
        visualCue: "김이 눅눅해지기 전 바로 먹으면 가장 맛있습니다.",
      },
    ],
  },
  {
    id: "curated-cabbage-egg-stir-fry",
    name: "양배추계란볶음",
    category: "반찬",
    method: "볶기",
    calories: "260",
    thumbnailUrl: "/images/recipes/jipbab-curated/cabbage-egg-stirfry.png",
    ingredients: "양배추, 계란, 굴소스, 대파, 식용유",
    hashTag: "#양배추 #계란 #가벼운반찬",
    ingredientList: ["양배추", "계란", "굴소스", "대파", "식용유"],
    ingredientDetails: [
      ingredient("양배추", "2컵", "채 썬 양배추를 종이컵으로 2컵 담은 양입니다."),
      ingredient("계란", "2개", "양배추와 함께 볶으면 한 끼 반찬이 됩니다."),
      ingredient("굴소스", "1큰술", "밥숟가락 1번, 없으면 간장 1큰술로 대체하세요."),
      ingredient("대파", "1/3대", "기름에 먼저 볶아 향을 냅니다."),
      ingredient("식용유", "1큰술", "팬을 코팅하는 양입니다."),
    ],
    trustLabel: "냉장고 털기",
    featuredReason: "남은 양배추와 계란을 빠르게 처리하는 반찬",
    difficulty: 1,
    cookingTime: 12,
    servings: 2,
    beginnerSummary: "양배추는 오래 볶으면 물이 많이 생기니 숨이 살짝 죽는 정도에서 멈추세요.",
    measurementTips: DEFAULT_MEASUREMENT_TIPS,
    imageAlt: "양배추와 계란을 함께 볶은 반찬 완성 예시",
    imageCaption: "양배추가 살짝 투명해질 때 계란을 넣으면 식감이 살아 있습니다.",
    steps: [
      {
        index: 1,
        description: "양배추는 얇게 채 썰고 대파는 송송 썹니다.",
        imageUrl: null,
        beginnerTip: "칼질이 어렵다면 양배추를 손으로 작게 찢어도 됩니다.",
        visualCue: "양배추 조각이 한입에 들어가는 크기면 됩니다.",
      },
      {
        index: 2,
        description: "계란 2개를 그릇에 풀어둡니다.",
        imageUrl: null,
        beginnerTip: "흰자 덩어리가 조금 남아도 볶음에는 괜찮습니다.",
        visualCue: "노른자와 흰자가 대략 섞이면 충분합니다.",
      },
      {
        index: 3,
        description: "팬에 식용유 1큰술과 대파를 넣고 30초 볶은 뒤 양배추를 넣어 3분 볶습니다.",
        imageUrl: null,
        beginnerTip: "양배추가 많아 보여도 익으면 금방 줄어듭니다.",
        visualCue: "양배추 가장자리가 투명해지면 계란을 넣을 때입니다.",
      },
      {
        index: 4,
        description: "계란과 굴소스 1큰술을 넣고 1분 더 볶아 마무리합니다.",
        imageUrl: null,
        beginnerTip: "계란이 너무 익기 전에 불을 끄면 촉촉합니다.",
        visualCue: "계란이 노랗게 굳고 양배추와 섞이면 완성입니다.",
      },
    ],
  },
  {
    id: "curated-eomuk-bokkeum",
    name: "어묵볶음",
    category: "반찬",
    method: "볶기",
    calories: "290",
    thumbnailUrl: "/images/recipes/jipbab-curated/fishcake-bokkeum.png",
    ingredients: "어묵, 양파, 간장, 설탕, 대파",
    hashTag: "#어묵 #밑반찬 #도시락",
    ingredientList: ["어묵", "양파", "간장", "설탕", "대파"],
    ingredientDetails: [
      ingredient("어묵", "4장", "사각어묵 4장 기준입니다.", "뜨거운 물을 살짝 부으면 기름기가 줄어요."),
      ingredient("양파", "1/2개", "채 썰어 단맛을 냅니다."),
      ingredient("간장", "2큰술", "밥숟가락 2번, 약 30ml입니다."),
      ingredient("설탕", "1큰술", "단짠 양념의 단맛입니다."),
      ingredient("대파", "1/3대", "마지막 향내기용입니다."),
    ],
    trustLabel: "밑반찬",
    featuredReason: "냉장 어묵을 빠르게 처리하는 국민 반찬",
    difficulty: 1,
    cookingTime: 12,
    servings: 2,
    beginnerSummary: "어묵은 이미 익은 식품이라 오래 볶지 않아도 됩니다. 양념이 묻고 따뜻해지면 충분합니다.",
    measurementTips: DEFAULT_MEASUREMENT_TIPS,
    imageAlt: "간장 양념 어묵볶음 완성 예시",
    imageCaption: "양념이 팬 바닥에 조금 남을 때 불을 꺼야 촉촉합니다.",
    steps: [
      {
        index: 1,
        description: "어묵은 한입 크기로 자르고 양파는 채 썹니다.",
        imageUrl: null,
        beginnerTip: "어묵은 가위로 잘라도 모양이 크게 상관없습니다.",
        visualCue: "어묵 조각이 숟가락에 올라가는 크기면 됩니다.",
      },
      {
        index: 2,
        description: "간장 2큰술, 설탕 1큰술, 물 3큰술을 섞어 양념장을 만듭니다.",
        imageUrl: null,
        beginnerTip: "물 3큰술을 넣어야 양념이 바로 타지 않습니다.",
        visualCue: "설탕 알갱이가 거의 녹으면 됩니다.",
      },
      {
        index: 3,
        description: "팬에 식용유 1작은술을 두르고 양파를 1분 볶습니다.",
        imageUrl: null,
        beginnerTip: "양파를 먼저 볶으면 단맛이 나와요.",
        visualCue: "양파 가장자리가 투명해지면 어묵을 넣습니다.",
      },
      {
        index: 4,
        description: "어묵과 양념장을 넣고 3분 볶은 뒤 대파를 넣어 마무리합니다.",
        imageUrl: null,
        beginnerTip: "불이 세면 간장이 빨리 타니 중불을 유지하세요.",
        visualCue: "어묵 표면에 갈색 윤기가 돌면 완성입니다.",
      },
    ],
  },
  {
    id: "curated-spinach-namul",
    name: "시금치나물",
    category: "반찬",
    method: "데치기",
    calories: "80",
    thumbnailUrl: "/images/recipes/jipbab-curated/spinach-namul.png",
    ingredients: "시금치, 소금, 참기름, 마늘, 깨",
    hashTag: "#나물 #초록반찬 #기본반찬",
    ingredientList: ["시금치", "소금", "참기름", "마늘", "깨"],
    ingredientDetails: [
      ingredient("시금치", "1단", "마트 시금치 한 묶음 기준입니다.", "뿌리 끝을 다듬고 흙을 씻어요."),
      ingredient("소금", "1/2작은술", "데칠 물과 무침 간에 나눠 씁니다."),
      ingredient("참기름", "1큰술", "고소한 향을 내는 핵심입니다."),
      ingredient("마늘", "1/2작은술", "많이 넣으면 매워질 수 있어 조금만 넣습니다."),
      ingredient("깨", "1작은술", "마지막에 뿌리면 고소합니다."),
    ],
    trustLabel: "기본 반찬",
    featuredReason: "시금치 한 단을 실패 없이 처리하는 기본 나물",
    difficulty: 1,
    cookingTime: 10,
    servings: 2,
    beginnerSummary: "시금치는 오래 데치면 물러지므로 끓는 물에 30초만 데치고 바로 찬물에 헹구세요.",
    measurementTips: DEFAULT_MEASUREMENT_TIPS,
    imageAlt: "참기름에 무친 시금치나물 완성 예시",
    imageCaption: "물기를 꼭 짜야 양념이 싱거워지지 않습니다.",
    steps: [
      {
        index: 1,
        description: "시금치를 흐르는 물에 씻고 뿌리 끝을 다듬습니다.",
        imageUrl: null,
        beginnerTip: "흙이 남기 쉬우니 물을 갈아가며 2번 씻으세요.",
        visualCue: "잎 사이에 흙이 보이지 않으면 됩니다.",
      },
      {
        index: 2,
        description: "끓는 물에 소금 한 꼬집을 넣고 시금치를 30초 데칩니다.",
        imageUrl: null,
        beginnerTip: "시금치를 넣은 뒤 젓가락으로 한 번 뒤집어 주세요.",
        visualCue: "숨이 죽고 색이 진한 초록색이 되면 바로 꺼냅니다.",
      },
      {
        index: 3,
        description: "찬물에 헹군 뒤 두 손으로 물기를 꼭 짭니다.",
        imageUrl: null,
        beginnerTip: "물기가 많으면 양념이 흐려져 싱거워집니다.",
        visualCue: "손으로 눌렀을 때 물방울이 많이 떨어지지 않으면 됩니다.",
      },
      {
        index: 4,
        description: "참기름 1큰술, 마늘 1/2작은술, 소금 한 꼬집, 깨를 넣고 무칩니다.",
        imageUrl: null,
        beginnerTip: "소금은 한 번에 많이 넣지 말고 맛을 보며 추가하세요.",
        visualCue: "시금치에 윤기가 돌고 고소한 향이 나면 완성입니다.",
      },
    ],
  },
  {
    id: "curated-kimchi-jeon",
    name: "김치전",
    category: "분식",
    method: "부치기",
    calories: "430",
    thumbnailUrl: "/images/recipes/jipbab-curated/kimchi-jeon.png",
    ingredients: "김치, 밀가루, 물, 대파, 식용유",
    hashTag: "#김치 #부침개 #비오는날",
    ingredientList: ["김치", "밀가루", "물", "대파", "식용유"],
    ingredientDetails: [
      ingredient("김치", "1컵", "잘게 썬 김치를 종이컵 1컵 담은 양입니다."),
      ingredient("밀가루", "1컵", "종이컵 1컵, 부침가루로 대체 가능합니다."),
      ingredient("물", "2/3컵", "종이컵 기준 2/3컵, 약 120ml입니다."),
      ingredient("대파", "2큰술", "송송 썬 대파를 밥숟가락 2번 넣습니다."),
      ingredient("식용유", "3큰술", "전을 바삭하게 부치려면 넉넉히 둘러요."),
    ],
    trustLabel: "김치 활용",
    featuredReason: "익은 김치를 간단한 간식이나 반찬으로 전환",
    difficulty: 2,
    cookingTime: 18,
    servings: 2,
    beginnerSummary: "반죽은 너무 되직하면 두껍고, 너무 묽으면 찢어집니다. 숟가락에서 천천히 흐르는 농도를 목표로 하세요.",
    measurementTips: DEFAULT_MEASUREMENT_TIPS,
    imageAlt: "노릇하게 부친 김치전 완성 예시",
    imageCaption: "가장자리가 바삭하게 갈색이 되면 뒤집기 좋은 타이밍입니다.",
    steps: [
      {
        index: 1,
        description: "김치는 1cm 크기로 자르고 대파는 송송 썹니다.",
        imageUrl: null,
        beginnerTip: "김치 국물 2큰술을 넣으면 색과 맛이 좋아집니다.",
        visualCue: "김치가 반죽에 골고루 섞일 작은 크기면 됩니다.",
      },
      {
        index: 2,
        description: "그릇에 김치, 밀가루 1컵, 물 2/3컵, 대파를 넣고 섞습니다.",
        imageUrl: null,
        beginnerTip: "반죽이 너무 뻑뻑하면 물 1큰술씩 추가하세요.",
        visualCue: "숟가락으로 떴을 때 천천히 떨어지는 농도면 좋습니다.",
      },
      {
        index: 3,
        description: "팬에 식용유 2큰술을 두르고 반죽을 얇게 펴 중불에서 4분 부칩니다.",
        imageUrl: null,
        beginnerTip: "두껍게 부치면 속이 익기 전에 겉이 탈 수 있습니다.",
        visualCue: "가장자리가 마르고 갈색으로 변하면 뒤집을 때입니다.",
      },
      {
        index: 4,
        description: "뒤집어서 식용유 1큰술을 가장자리에 추가하고 3분 더 부칩니다.",
        imageUrl: null,
        beginnerTip: "뒤집기가 어렵다면 작은 크기로 여러 장 부쳐도 됩니다.",
        visualCue: "양면이 노릇하고 가운데가 질척하지 않으면 완성입니다.",
      },
    ],
  },
  {
    id: "curated-tomato-egg-stir-fry",
    name: "토마토달걀볶음",
    category: "일품",
    method: "볶기",
    calories: "300",
    thumbnailUrl: "/images/recipes/jipbab-curated/tomato-egg-stirfry.png",
    ingredients: "토마토, 계란, 대파, 소금, 식용유",
    hashTag: "#토마토 #계란 #가벼운한끼",
    ingredientList: ["토마토", "계란", "대파", "소금", "식용유"],
    ingredientDetails: [
      ingredient("토마토", "2개", "중간 크기 토마토 2개 또는 방울토마토 12개입니다."),
      ingredient("계란", "3개", "부드럽게 먹으려면 넉넉히 넣습니다."),
      ingredient("대파", "1/3대", "향을 내는 재료라 생략 가능해요."),
      ingredient("소금", "1/4작은술", "계란 간을 맞추는 양입니다."),
      ingredient("식용유", "1큰술", "계란을 먼저 익힐 때 씁니다."),
    ],
    trustLabel: "가벼운 한끼",
    featuredReason: "토마토와 계란만으로 만드는 부드러운 볶음",
    difficulty: 1,
    cookingTime: 12,
    servings: 2,
    beginnerSummary: "계란을 먼저 부드럽게 익혀 덜어낸 뒤 토마토와 다시 섞으면 질척하지 않습니다.",
    measurementTips: DEFAULT_MEASUREMENT_TIPS,
    imageAlt: "토마토와 계란을 볶은 완성 예시",
    imageCaption: "토마토가 살짝 무너지고 계란이 촉촉하면 완성입니다.",
    steps: [
      {
        index: 1,
        description: "토마토는 한입 크기로 자르고 계란 3개는 소금과 함께 풀어둡니다.",
        imageUrl: null,
        beginnerTip: "토마토 껍질이 신경 쓰이면 끓는 물에 10초 데쳐 벗겨도 됩니다.",
        visualCue: "토마토 조각이 숟가락에 올라가는 크기면 됩니다.",
      },
      {
        index: 2,
        description: "팬에 식용유 1큰술을 두르고 계란을 70% 정도 익혀 그릇에 덜어둡니다.",
        imageUrl: null,
        beginnerTip: "계란은 완전히 익히지 않아야 마지막에 촉촉합니다.",
        visualCue: "계란이 덩어리졌지만 표면이 살짝 촉촉하면 꺼내세요.",
      },
      {
        index: 3,
        description: "같은 팬에 대파와 토마토를 넣고 중불에서 3분 볶습니다.",
        imageUrl: null,
        beginnerTip: "토마토에서 물이 나오니 기름을 더 넣지 않아도 됩니다.",
        visualCue: "토마토 가장자리가 부드럽게 무너지면 됩니다.",
      },
      {
        index: 4,
        description: "계란을 다시 넣고 30초만 섞어 마무리합니다.",
        imageUrl: null,
        beginnerTip: "싱거우면 소금 한 꼬집을 추가하세요.",
        visualCue: "계란과 토마토가 섞였지만 계란이 촉촉하면 완성입니다.",
      },
    ],
  },
];

const LEGACY_CURATED_FALLBACK_RECIPES: CuratedRecipe[] = RAW_CURATED_JIPBAB_RECIPES.map(enrichBeginnerRecipe);
const LEGACY_RECIPE_BY_TITLE = new Map(LEGACY_CURATED_FALLBACK_RECIPES.map((recipe) => [recipe.name, recipe]));

function mergeBeginnerContractIntoLegacyRecipe(recipe: BeginnerRecipe, legacy: CuratedRecipe): CuratedRecipe {
  const beginner = beginnerRecipeToCurated(recipe);

  return {
    ...beginner,
    calories: legacy.calories ?? beginner.calories,
    hashTag: legacy.hashTag ?? beginner.hashTag,
    trustLabel: legacy.trustLabel ?? beginner.trustLabel,
    featuredReason: legacy.featuredReason ?? beginner.featuredReason,
    difficulty: legacy.difficulty ?? beginner.difficulty,
    difficultyLevel: legacy.difficultyLevel ?? beginner.difficultyLevel,
    beginnerScore: Math.max(legacy.beginnerScore ?? 0, recipe.beginnerScore),
    imageCaption: legacy.imageCaption ?? beginner.imageCaption,
    noFire: legacy.noFire ?? beginner.noFire,
    microwave: legacy.microwave ?? beginner.microwave,
    reviewedForBeginner: true,
  };
}

const LEGACY_RECIPE_TITLE_ALIASES = new Map<string, string>([
  ["간장계란밥", "계란간장밥"],
]);
const LEGACY_RECIPE_NAME_ALIASES = new Map<string, string>([
  ["계란간장밥", "간장계란밥"],
]);

function withBeginnerGuideAssets(
  recipe: CuratedRecipe,
  recipeNumber: string,
  thumbnailUrl: string,
  imageAltPrefix: string,
  stepTitles: string[],
): CuratedRecipe {
  const guideImageUrl = `/images/recipes/beginner-recipe-guides/beginner-${recipeNumber}.png`;
  const prepImageUrl = `/images/recipes/beginner-recipe-guides/prep/beginner-${recipeNumber}.png`;
  const stepsImageUrl = `/images/recipes/beginner-recipe-guides/steps/beginner-${recipeNumber}.png`;
  return {
    ...recipe,
    thumbnailUrl,
    recipePosterImageUrl: null,
    recipeGuideImageUrl: guideImageUrl,
    recipePrepImageUrl: prepImageUrl,
    recipeStepsImageUrl: stepsImageUrl,
    steps: recipe.steps.map((step, index) => {
      if (typeof step === "string") {
        return {
          index: index + 1,
          title: stepTitles[index] ?? "조리하기",
          description: step,
          imageUrl: null,
          imageAlt: null,
        };
      }

      return {
        ...step,
        index: step.index ?? index + 1,
        title: step.title ?? stepTitles[index] ?? "조리하기",
          imageUrl: null,
          imageAlt: null,
      };
    }),
    source: JIPBAB_ORIGINAL_SOURCE,
    sourceName: JIPBAB_ORIGINAL_SOURCE.sourceName,
    sourceUrl: JIPBAB_ORIGINAL_SOURCE.sourceUrl,
    safety: JIPBAB_ORIGINAL_SAFETY,
  };
}

function overrideCuratedRecipeContent(recipe: CuratedRecipe): CuratedRecipe {
  if (recipe.name === "간장계란밥" || recipe.name === "계란간장밥") {
    return {
      ...recipe,
      name: "간장계란밥",
      title: "간장계란밥",
      category: "밥",
      method: "비비기",
      calories: "620",
      thumbnailUrl: "/images/recipes/ganjang-egg-rice/step-04-finished.png",
      recipePosterImageUrl: "/images/recipes/ganjang-egg-rice/step-04-finished.png",
      recipeGuideImageUrl: "/images/recipes/ganjang-egg-rice/step-03-seasoning.png",
      recipePrepImageUrl: "/images/recipes/ganjang-egg-rice/step-01-fried-eggs.png",
      recipeStepsImageUrl: "/images/recipes/ganjang-egg-rice/step-02-rice-and-eggs.png",
      ingredients: "밥, 계란, 간장, 참기름, 참깨, 식용유",
      hashTag: "#간장계란밥 #계란간장밥 #초보가능 #한그릇",
      ingredientList: ["밥", "계란", "간장", "참기름", "참깨", "식용유"],
      ingredientDetails: [
        ingredient("밥", "1.5공기", "평소 밥공기 기준 한 공기 반입니다.", "따뜻하게 데우면 양념이 잘 섞입니다."),
        ingredient("계란", "2~3개", "2개는 가볍게, 3개는 든든한 한 끼 양입니다.", "프라이팬에서 튀기듯 익힙니다."),
        ingredient("간장", "2큰술", "밥숟가락으로 평평하게 2번 넣습니다.", "처음에는 2큰술만 넣고 부족하면 1작은술씩 추가합니다."),
        ingredient("참기름", "1큰술", "고소한 기본량입니다. 기호에 따라 1.5큰술까지 가능합니다.", "불을 끈 뒤 밥에 바로 넣습니다."),
        ingredient("참깨", "1작은술", "마지막에 넣으면 고소한 향이 납니다.", "깨소금으로 바꿔도 됩니다."),
        ingredient("식용유", "1큰술", "계란 가장자리를 바삭하게 익히는 양입니다.", "팬 바닥에 얇게 퍼지게 합니다."),
      ],
      trustLabel: "5분 한그릇",
      featuredReason: "계란 2~3개를 튀기듯 익혀 밥, 간장, 참기름에 바로 비비는 가장 쉬운 한 끼",
      difficulty: 1,
      cookingTime: 8,
      servings: 1,
      beginnerSummary: "계란을 튀기듯 익힌 뒤 밥 1.5공기에 간장 2큰술, 참기름 1큰술, 참깨를 넣고 비비면 됩니다.",
      imageAlt: "간장계란밥 완성 사진",
      imageCaption: "밥알이 연한 갈색으로 코팅되고 계란 조각과 참깨가 골고루 보이면 완성입니다.",
      difficultyLevel: 1,
      beginnerScore: 96,
      totalMinutes: 8,
      activeMinutes: 8,
      requiredTools: ["프라이팬", "뒤집개", "그릇"],
      beforeStart: [
        "밥은 따뜻하게 데우고 계란, 간장, 참기름, 참깨를 먼저 꺼냅니다.",
        "간장은 처음에 2큰술만 넣고, 마지막에 맛을 본 뒤 1작은술씩 추가합니다.",
      ],
      steps: [
        {
          index: 1,
          description: "팬에 식용유 1큰술을 두르고 중불에서 계란 2~3개를 가장자리가 바삭해질 때까지 프라이합니다.",
          imageUrl: "/images/recipes/ganjang-egg-rice/step-01-fried-eggs.png",
          imageAlt: "간장계란밥 계란 프라이 단계",
          heat: "중불",
          minutes: 3,
          beginnerTip: "계란이 찢어져도 밥에 비빌 메뉴라 괜찮습니다.",
          visualCue: "흰자는 완전히 하얗고 가장자리는 연한 갈색이면 됩니다.",
          commonMistake: "기름이 너무 적으면 계란이 팬에 붙고 바삭한 가장자리가 생기지 않습니다.",
          rescueTip: "팬에 붙으면 뒤집개로 긁지 말고 불을 약하게 줄인 뒤 20초 기다렸다가 떼세요.",
        },
        {
          index: 2,
          description: "따뜻한 밥 1.5공기를 그릇에 담고 프라이한 계란을 밥 위에 올립니다.",
          imageUrl: "/images/recipes/ganjang-egg-rice/step-02-rice-and-eggs.png",
          imageAlt: "밥 위에 계란을 올린 간장계란밥 단계",
          heat: "불 없음",
          minutes: 1,
          beginnerTip: "찬밥이면 전자레인지에 1분 데워야 양념이 고르게 섞입니다.",
          visualCue: "계란이 밥을 덮고 노른자가 가운데 오면 비비기 쉽습니다.",
          commonMistake: "찬밥을 그대로 쓰면 간장과 참기름이 한쪽에 뭉칩니다.",
          rescueTip: "밥이 차가우면 계란을 올린 채로 전자레인지에 30초만 데우세요.",
        },
        {
          index: 3,
          description: "간장 2큰술, 참기름 1큰술, 참깨 1작은술을 넣습니다. 더 고소하게 먹고 싶으면 참기름은 1.5큰술까지 넣습니다.",
          imageUrl: "/images/recipes/ganjang-egg-rice/step-03-seasoning.png",
          imageAlt: "간장 참기름 참깨를 넣는 간장계란밥 단계",
          heat: "불 없음",
          minutes: 1,
          beginnerTip: "간장은 더 넣기 쉽지만 빼기는 어렵기 때문에 2큰술에서 시작합니다.",
          visualCue: "간장이 밥 가장자리로 살짝 흐르고 참깨가 계란 위에 보이면 충분합니다.",
          commonMistake: "간장을 눈대중으로 많이 넣으면 첫입부터 짜집니다.",
          rescueTip: "짜면 밥을 반 공기 더 넣고, 싱거우면 간장 1작은술만 추가하세요.",
        },
        {
          index: 4,
          description: "숟가락으로 계란을 잘라 밥과 양념이 고르게 섞이도록 비벼 완성합니다.",
          imageUrl: "/images/recipes/ganjang-egg-rice/step-04-finished.png",
          imageAlt: "완성된 간장계란밥",
          heat: "불 없음",
          minutes: 1,
          beginnerTip: "노른자를 먼저 터뜨린 뒤 밥을 아래에서 위로 섞으면 고르게 비벼집니다.",
          visualCue: "밥알이 연한 갈색으로 코팅되고 계란 조각이 골고루 보이면 완성입니다.",
          commonMistake: "대충 섞으면 한쪽은 짜고 한쪽은 싱거워집니다.",
          rescueTip: "질척하면 김가루나 참깨를 조금 더 넣어 고소하게 잡으세요.",
        },
      ],
      successCheck: "밥알 전체가 연한 갈색이고 계란 조각, 참깨, 참기름 향이 고르게 느껴지면 성공입니다.",
      safetyNotes: [
        "계란 껍데기가 들어가면 숟가락으로 건지고 손과 작업대를 씻습니다.",
        "흰자가 투명하지 않게 완전히 익히고 뜨거운 팬 손잡이를 안쪽으로 둡니다.",
        "완성한 밥은 2시간 안에 냉장하고 재가열할 때 가운데까지 뜨겁게 데웁니다.",
      ],
      storageTip: "계란 프라이가 들어간 밥은 바로 먹고, 남으면 2시간 안에 냉장해 다음 날까지 먹습니다.",
      reheatTip: "물 1큰술을 넣고 전자레인지에 1분 데운 뒤 섞고 가운데가 차가우면 30초 더 데웁니다.",
      fallbackMeal: "짜면 밥을 더 넣고, 싱거우면 간장 1작은술을 추가해 다시 비빕니다.",
      homeCardCopy: {
        title: "간장계란밥",
        subtitle: "계란 2~3개 + 밥 1.5공기 + 간장 2",
        badge: "첫 요리 추천",
        cta: "5분 한그릇 만들기",
      },
      noFire: false,
      microwave: false,
      source: SOY_EGG_RICE_REFERENCE_SOURCE,
      safety: REFERENCE_LINK_SAFETY,
    };
  }

  if (recipe.name === "프라이팬 계란말이") {
    return {
      ...recipe,
      recipePosterImageUrl: "/images/recipes/jipbab-curated/gyeran-mari-basic.png",
      recipeGuideImageUrl: "/images/recipes/jipbab-curated/gyeran-mari-basic.png",
      recipePrepImageUrl: "/images/recipes/jipbab-curated/gyeran-mari-basic.png",
      recipeStepsImageUrl: "/images/recipes/jipbab-curated/gyeran-mari-basic.png",
      safetyNotes: [
        "계란 껍데기가 들어가면 숟가락으로 건지고 손과 작업대를 씻습니다.",
        "단면에 묽은 계란물이 보이면 약불에서 1분 더 익혀 완전히 굳힙니다.",
        "조리 후 2시간 안에 냉장하고 재가열할 때 가운데까지 뜨겁게 데웁니다.",
      ],
      storageTip: "2시간 안에 밀폐 용기에 담아 냉장하고 다음 날까지 먹습니다.",
      reheatTip: "전자레인지용 접시에 올려 30초씩 나눠 데우고 가운데가 차갑지 않은지 확인합니다.",
      fallbackMeal: "찢어지면 다음 계란물로 덮어 이어 붙이고, 모양이 무너지면 완전히 익혀 계란볶음처럼 밥에 올립니다.",
      source: GYERAN_MARI_REFERENCE_SOURCE,
      safety: REFERENCE_LINK_SAFETY,
    };
  }

  if (recipe.name === "된장찌개") {
    return {
      ...recipe,
      safetyNotes: [
        "감자를 1.5cm로 잘라 중심까지 익히고 두부를 넣은 뒤에는 세게 젓지 않습니다.",
        "끓는 냄비의 뚜껑은 수증기가 몸 반대쪽으로 빠지게 엽니다.",
        "조리 후 2시간 안에 냉장하고 다시 먹을 때 국물이 끓도록 충분히 데웁니다.",
      ],
      storageTip: "한 김 식힌 뒤 얕은 밀폐 용기에 담아 냉장하고 다음 날까지 먹습니다.",
      reheatTip: "물 2큰술을 넣고 국물이 전체적으로 끓기 시작한 뒤 1분 더 데웁니다.",
      fallbackMeal: "짜면 물 100ml를 넣고 1분 더 끓이며, 감자가 딱딱하면 두부를 건드리지 말고 2분씩 더 익힙니다.",
    };
  }

  if (recipe.name === "스크램블에그 덮밥") {
    return {
      ...recipe,
      recipePosterImageUrl: recipe.thumbnailUrl,
      recipeGuideImageUrl: recipe.thumbnailUrl,
      recipePrepImageUrl: recipe.thumbnailUrl,
      recipeStepsImageUrl: recipe.thumbnailUrl,
      source: SCRAMBLED_EGG_RICE_REFERENCE_SOURCE,
      safety: REFERENCE_LINK_SAFETY,
    };
  }

  if (recipe.name === "토마토달걀볶음") {
    return {
      ...recipe,
      recipePosterImageUrl: recipe.thumbnailUrl,
      recipeGuideImageUrl: recipe.thumbnailUrl,
      recipePrepImageUrl: recipe.thumbnailUrl,
      recipeStepsImageUrl: recipe.thumbnailUrl,
      source: TOMATO_EGG_STIR_FRY_REFERENCE_SOURCE,
      safety: REFERENCE_LINK_SAFETY,
    };
  }

  if (recipe.name === "양배추달걀전") {
    return {
      ...recipe,
      recipePosterImageUrl: recipe.thumbnailUrl,
      recipeGuideImageUrl: recipe.thumbnailUrl,
      recipePrepImageUrl: recipe.thumbnailUrl,
      recipeStepsImageUrl: recipe.thumbnailUrl,
      source: CABBAGE_EGG_JEON_REFERENCE_SOURCE,
      safety: REFERENCE_LINK_SAFETY,
    };
  }

  if (recipe.name === "참치계란말이") {
    return {
      ...recipe,
      recipePosterImageUrl: recipe.thumbnailUrl,
      recipeGuideImageUrl: recipe.thumbnailUrl,
      recipePrepImageUrl: recipe.thumbnailUrl,
      recipeStepsImageUrl: recipe.thumbnailUrl,
      source: TUNA_GYERAN_MARI_REFERENCE_SOURCE,
      safety: REFERENCE_LINK_SAFETY,
    };
  }

  if (recipe.name === "달걀국") {
    return {
      ...recipe,
      recipePosterImageUrl: "/images/recipes/beginner-food-photos/beginner-004-egg-drop-soup.png",
      recipeGuideImageUrl: "/images/recipes/beginner-food-photos/beginner-004-egg-drop-soup.png",
      recipePrepImageUrl: "/images/recipes/beginner-food-photos/beginner-004-egg-drop-soup.png",
      recipeStepsImageUrl: "/images/recipes/beginner-food-photos/beginner-004-egg-drop-soup.png",
      source: EGG_DROP_SOUP_REFERENCE_SOURCE,
      safety: REFERENCE_LINK_SAFETY,
    };
  }

  if (recipe.name === "달걀죽") {
    return {
      ...recipe,
      recipePosterImageUrl: recipe.thumbnailUrl,
      recipeGuideImageUrl: recipe.thumbnailUrl,
      recipePrepImageUrl: recipe.thumbnailUrl,
      recipeStepsImageUrl: recipe.thumbnailUrl,
      source: JIPBAB_ORIGINAL_SOURCE,
      safety: JIPBAB_ORIGINAL_SAFETY,
    };
  }

  if (recipe.name === "치즈계란밥") {
    return {
      ...recipe,
      recipePosterImageUrl: recipe.thumbnailUrl,
      recipeGuideImageUrl: recipe.thumbnailUrl,
      recipePrepImageUrl: recipe.thumbnailUrl,
      recipeStepsImageUrl: recipe.thumbnailUrl,
      source: JIPBAB_ORIGINAL_SOURCE,
      safety: JIPBAB_ORIGINAL_SAFETY,
    };
  }

  if (recipe.name === "버터간장계란밥") {
    return {
      ...recipe,
      thumbnailUrl: "/images/recipes/butter-soy-egg-rice/step-04-finished.png",
      recipePosterImageUrl: "/images/recipes/butter-soy-egg-rice/step-04-finished.png",
      recipeGuideImageUrl: "/images/recipes/butter-soy-egg-rice/step-03-seasoning.png",
      recipePrepImageUrl: "/images/recipes/butter-soy-egg-rice/step-02-butter-rice.png",
      recipeStepsImageUrl: "/images/recipes/butter-soy-egg-rice/step-01-fried-eggs.png",
      ingredients: "밥, 계란, 버터, 간장, 참기름, 참깨, 식용유",
      ingredientList: ["밥", "계란", "버터", "간장", "참기름", "참깨", "식용유"],
      ingredientDetails: [
        ingredient("밥", "1공기", "따뜻할수록 버터가 잘 녹습니다.", "차가우면 전자레인지에 1분 데웁니다."),
        ingredient("계란", "2개", "반숙 또는 완숙 모두 가능합니다.", "프라이팬에서 먼저 익힙니다."),
        ingredient("버터", "1작은술", "많이 넣으면 느끼하니 작은 숟가락 1번만 넣습니다.", "뜨거운 밥 위에서 녹입니다."),
        ingredient("간장", "1큰술", "버터가 들어가므로 간장은 적게 시작합니다.", "부족하면 1작은술만 추가합니다."),
        ingredient("참기름", "1작은술", "버터 향이 강하면 생략해도 됩니다.", "마지막에 넣습니다."),
        ingredient("참깨", "1작은술", "고소함을 더합니다.", "깨소금도 가능합니다."),
        ingredient("식용유", "1작은술", "계란 프라이용입니다.", "팬에 얇게 펴 바릅니다."),
      ],
      requiredTools: ["프라이팬", "뒤집개", "그릇"],
      beginnerSummary: "계란을 먼저 프라이하고 뜨거운 밥에 버터를 녹인 뒤 간장 1큰술부터 넣어 비비는 한 그릇입니다.",
      beforeStart: [
        "밥은 뜨겁게 준비해야 버터가 덩어리로 남지 않습니다.",
        "버터가 들어가므로 간장은 1큰술부터 넣고 마지막에 맛을 봅니다.",
      ],
      steps: [
        {
          index: 1,
          description: "팬에 식용유 1작은술을 두르고 계란 2개를 중불에서 프라이합니다.",
          imageUrl: "/images/recipes/butter-soy-egg-rice/step-01-fried-eggs.png",
          imageAlt: "버터간장계란밥 계란 프라이 단계",
          heat: "중불",
          minutes: 3,
          beginnerTip: "계란은 완숙으로 익혀도 밥에 비비면 충분히 부드럽습니다.",
          visualCue: "흰자가 하얗게 굳으면 밥에 올릴 수 있습니다.",
          commonMistake: "센 불에서 오래 익히면 밑면만 탑니다.",
          rescueTip: "가장자리가 빨리 타면 불을 약하게 낮추세요.",
        },
        {
          index: 2,
          description: "뜨거운 밥 1공기 위에 버터 1작은술을 넣고 밥으로 덮어 30초 녹입니다.",
          imageUrl: "/images/recipes/butter-soy-egg-rice/step-02-butter-rice.png",
          imageAlt: "뜨거운 밥에 버터를 녹이는 단계",
          heat: "불 없음",
          minutes: 1,
          beginnerTip: "버터는 적게 넣어야 간장과 계란 맛이 살아납니다.",
          visualCue: "밥 사이로 버터가 녹아 윤기가 보이면 됩니다.",
          commonMistake: "찬밥에 버터를 넣으면 덩어리로 남습니다.",
          rescueTip: "버터가 안 녹으면 전자레인지에 20초만 더 데우세요.",
        },
        {
          index: 3,
          description: "계란을 올리고 간장 1큰술, 참기름 1작은술, 참깨를 넣습니다.",
          imageUrl: "/images/recipes/butter-soy-egg-rice/step-03-seasoning.png",
          imageAlt: "버터간장계란밥 양념 단계",
          heat: "불 없음",
          minutes: 1,
          beginnerTip: "버터가 짭짤하게 느껴질 수 있어 간장은 적게 시작합니다.",
          visualCue: "간장이 밥 가장자리로 살짝 보이면 충분합니다.",
          commonMistake: "간장을 2큰술 이상 넣으면 버터와 합쳐져 짜질 수 있습니다.",
          rescueTip: "짜면 밥을 반 공기 더 넣어 다시 비비세요.",
        },
        {
          index: 4,
          description: "숟가락으로 계란을 잘라 밥과 버터, 간장이 고르게 섞이도록 비빕니다.",
          imageUrl: "/images/recipes/butter-soy-egg-rice/step-04-finished.png",
          imageAlt: "완성된 버터간장계란밥",
          heat: "불 없음",
          minutes: 1,
          beginnerTip: "버터가 한쪽에 몰리지 않게 밥 아래쪽까지 크게 섞습니다.",
          visualCue: "밥알에 윤기가 돌고 계란 조각이 골고루 보이면 완성입니다.",
          commonMistake: "버터 덩어리가 남으면 한입마다 맛이 달라집니다.",
          rescueTip: "버터 향이 강하면 김가루나 참깨를 더 넣어 잡으세요.",
        },
      ],
      successCheck: "버터가 덩어리로 남지 않고 밥알에 윤기가 돌면 성공입니다.",
      fallbackMeal: "느끼하면 김가루를 넣고, 짜면 밥을 조금 더 넣어 비빕니다.",
      noFire: false,
      microwave: false,
      source: JIPBAB_ORIGINAL_SOURCE,
      safety: JIPBAB_ORIGINAL_SAFETY,
    };
  }

  if (recipe.name === "양파계란덮밥") {
    return {
      ...recipe,
      recipePosterImageUrl: recipe.thumbnailUrl,
      recipeGuideImageUrl: recipe.thumbnailUrl,
      recipePrepImageUrl: recipe.thumbnailUrl,
      recipeStepsImageUrl: recipe.thumbnailUrl,
      source: JIPBAB_ORIGINAL_SOURCE,
      safety: JIPBAB_ORIGINAL_SAFETY,
    };
  }

  if (recipe.name === "김치볶음밥") {
    return {
      ...recipe,
      recipePosterImageUrl: "/images/recipes/beginner-imagegen-posters/beginner-013.png",
      recipeGuideImageUrl: "/images/recipes/beginner-recipe-guides/beginner-013.png",
      recipePrepImageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-013.png",
      recipeStepsImageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-013.png",
      ingredientDetails: [
        ingredient("밥", "1공기", "찬밥이면 더 고슬고슬하고, 따뜻한 밥이면 먼저 덩어리를 풀어 둡니다."),
        ingredient("김치", "1컵", "가위로 잘게 자르면 초보자도 먹기 좋은 크기가 됩니다."),
        ingredient("대파", "2큰술", "없어도 되지만 넣으면 볶음밥 향이 좋아집니다."),
        ingredient("계란", "1개", "프라이로 올리면 짠맛을 부드럽게 잡아줍니다."),
        ingredient("식용유", "1큰술", "김치를 먼저 볶을 때 팬에 둘러줍니다."),
        ingredient("간장", "1작은술", "김치가 짜면 생략하세요."),
        ingredient("참기름", "1작은술", "불을 끄고 넣어야 향이 살아납니다."),
      ],
      steps: [
        { index: 1, title: "김치 자르기", description: "김치 1컵을 그릇에 담고 주방가위로 숟가락에 올라갈 크기로 잘게 자릅니다.", imageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-013.png", imageAlt: "김치볶음밥 김치 자르기", heat: "불 없음", minutes: 2, beginnerTip: "칼이 무서우면 그릇 안에서 가위로 자르면 됩니다.", visualCue: "김치 조각이 1cm 정도로 작아지면 밥과 잘 섞입니다.", commonMistake: "김치가 크면 볶음밥에서 따로 씹히고 비비기 어렵습니다.", rescueTip: "팬에 넣은 뒤에도 가위로 한 번 더 잘라도 됩니다." },
        { index: 2, title: "김치 먼저 볶기", description: "팬에 식용유 1큰술과 대파를 넣고 30초 볶은 뒤 김치를 넣어 중불에서 3분 볶습니다.", imageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-013.png", imageAlt: "김치볶음밥 김치 볶기", heat: "중불", minutes: 3, beginnerTip: "김치를 먼저 볶아야 물기가 줄고 밥이 질척하지 않습니다.", visualCue: "김치 색이 진해지고 신 냄새가 부드러워지면 됩니다.", commonMistake: "밥을 너무 빨리 넣으면 김치 수분 때문에 질척해집니다.", rescueTip: "물이 많으면 밥 넣기 전에 1분 더 볶아 수분을 날리세요." },
        { index: 3, title: "밥 넣기", description: "밥 1공기를 넣고 뒤집개로 누르듯 풀며 2분 볶습니다.", imageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-013.png", imageAlt: "김치볶음밥 밥 볶기", heat: "중불", minutes: 2, beginnerTip: "찬밥 덩어리는 팬에서 누르듯 풀면 됩니다.", visualCue: "밥알 전체가 붉게 물들고 큰 덩어리가 없어지면 됩니다.", commonMistake: "밥 덩어리를 그대로 두면 간이 한쪽에만 몰립니다.", rescueTip: "덩어리는 뒤집개 등으로 눌러 펴고 30초 더 볶으세요." },
        { index: 4, title: "마무리", description: "간을 보고 싱거우면 간장 1작은술만 팬 가장자리로 둘러 섞고, 불을 끈 뒤 참기름을 넣습니다.", imageUrl: "/images/recipes/beginner-recipe-guides/beginner-013.png", imageAlt: "완성된 김치볶음밥", heat: "불 없음", minutes: 1, beginnerTip: "김치가 짜면 간장은 생략해도 됩니다.", visualCue: "밥알이 기름지지 않게 윤기만 돌면 완성입니다.", commonMistake: "김치가 짠데 간장을 또 넣으면 전체가 짜집니다.", rescueTip: "짜면 밥을 반 공기 더 넣거나 계란프라이를 올리세요." },
      ],
      source: JIPBAB_ORIGINAL_SOURCE,
      safety: JIPBAB_ORIGINAL_SAFETY,
    };
  }

  if (recipe.name === "참치김치볶음밥") {
    return {
      ...recipe,
      recipePosterImageUrl: "/images/recipes/beginner-imagegen-posters/beginner-014.png",
      recipeGuideImageUrl: "/images/recipes/beginner-recipe-guides/beginner-014.png",
      recipePrepImageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-014.png",
      recipeStepsImageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-014.png",
      safetyNotes: [
        "참치캔 뚜껑 가장자리에 손을 베이지 않게 완전히 분리해 바로 치웁니다.",
        "김치와 참치가 이미 짤 수 있으므로 완성 후 맛을 보기 전에는 간장을 추가하지 않습니다.",
        "조리한 볶음밥은 2시간 안에 냉장하고 재가열할 때 가운데까지 뜨겁게 데웁니다.",
      ],
      storageTip: "넓은 용기에 펴서 한 김 식힌 뒤 2시간 안에 냉장하고 다음 날까지 먹습니다.",
      reheatTip: "물 1큰술을 넣고 덮어 전자레인지에서 1분 데운 뒤 섞고, 가운데가 차가우면 30초 더 데웁니다.",
      fallbackMeal: "짜면 밥 100g이나 완숙 계란프라이를 추가하고, 질척하면 중불에서 1분 더 볶아 수분을 날립니다.",
      source: recipe.source?.sourceUrl ? recipe.source : JIPBAB_ORIGINAL_SOURCE,
      safety: recipe.source?.sourceUrl ? REFERENCE_LINK_SAFETY : JIPBAB_ORIGINAL_SAFETY,
    };
  }

  if (recipe.name === "참치마요덮밥") {
    return {
      ...recipe,
      recipePosterImageUrl: "/images/recipes/beginner-imagegen-posters/beginner-015.png",
      recipeGuideImageUrl: "/images/recipes/beginner-recipe-guides/beginner-015.png",
      recipePrepImageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-015.png",
      recipeStepsImageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-015.png",
      source: JIPBAB_ORIGINAL_SOURCE,
      safety: JIPBAB_ORIGINAL_SAFETY,
    };
  }

  if (recipe.name === "햄야채볶음밥") {
    return {
      ...recipe,
      recipePosterImageUrl: "/images/recipes/beginner-imagegen-posters/beginner-016.png",
      recipeGuideImageUrl: "/images/recipes/beginner-recipe-guides/beginner-016.png",
      recipePrepImageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-016.png",
      recipeStepsImageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-016.png",
      source: JIPBAB_ORIGINAL_SOURCE,
      safety: JIPBAB_ORIGINAL_SAFETY,
    };
  }

  if (recipe.name === "김치덮밥") {
    return {
      ...recipe,
      recipePosterImageUrl: "/images/recipes/beginner-imagegen-posters/beginner-017.png",
      recipeGuideImageUrl: "/images/recipes/beginner-recipe-guides/beginner-017.png",
      recipePrepImageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-017.png",
      recipeStepsImageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-017.png",
      ingredientDetails: [
        ingredient("밥", "1공기", "따뜻하게 데워야 볶은 김치와 잘 섞입니다."),
        ingredient("김치", "3/4컵", "국물을 살짝 짜고 작게 자르면 덮밥이 질척하지 않습니다."),
        ingredient("계란", "1개", "있으면 프라이로 올려 짠맛을 부드럽게 잡습니다."),
        ingredient("식용유", "1작은술", "김치를 볶을 때 팬에 얇게 두릅니다."),
        ingredient("참기름", "1작은술", "불을 끈 뒤 넣어야 향이 살아납니다."),
        ingredient("김가루", "1큰술", "마지막에 올리면 한 그릇 느낌이 납니다."),
      ],
      steps: [
        { index: 1, title: "밥 준비", description: "밥 1공기를 따뜻하게 데워 그릇에 담고 가운데를 살짝 낮게 눌러 둡니다.", imageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-017.png", imageAlt: "김치덮밥 밥 준비", heat: "불 없음", minutes: 1, beginnerTip: "찬밥이면 전자레인지에 1분 데운 뒤 사용합니다.", visualCue: "밥에서 김이 살짝 나고 가운데에 토핑 자리가 보이면 됩니다.", commonMistake: "찬밥을 그대로 쓰면 볶은 김치와 따로 놉니다.", rescueTip: "찬밥이면 전자레인지에 1분만 데우세요." },
        { index: 2, title: "김치 자르기", description: "김치 3/4컵은 국물을 살짝 짜고 가위로 1cm 크기로 자릅니다.", imageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-017.png", imageAlt: "김치덮밥 김치 자르기", heat: "불 없음", minutes: 2, beginnerTip: "칼 대신 그릇 안에서 가위로 자르면 안전합니다.", visualCue: "김치 조각이 숟가락에 쉽게 올라갈 크기면 됩니다.", commonMistake: "김치국물이 많으면 밥 위에 올렸을 때 질척합니다.", rescueTip: "국물이 많으면 숟가락으로 한 번 더 눌러 빼세요." },
        { index: 3, title: "김치 볶기", description: "팬에 식용유 1작은술을 두르고 김치를 중불에서 3분 볶습니다.", imageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-017.png", imageAlt: "김치덮밥 김치 볶기", heat: "중불", minutes: 3, beginnerTip: "김치 물기를 줄여야 밥 위에 올렸을 때 덮밥처럼 먹기 쉽습니다.", visualCue: "김치 색이 진해지고 팬 바닥에 물기가 거의 없으면 됩니다.", commonMistake: "센불로 볶으면 김치 가장자리만 탈 수 있습니다.", rescueTip: "타는 냄새가 나면 불을 약하게 줄이고 물 1큰술을 넣으세요." },
        { index: 4, title: "밥 위에 올리기", description: "볶은 김치를 밥 위에 올리고 참기름 1작은술과 김가루를 뿌립니다.", imageUrl: "/images/recipes/beginner-recipe-guides/beginner-017.png", imageAlt: "완성된 김치덮밥", heat: "불 없음", minutes: 1, beginnerTip: "김치가 짜면 간장은 넣지 않아도 됩니다.", visualCue: "밥 가운데 김치가 모이고 가장자리에 밥이 보이면 비비기 좋습니다.", commonMistake: "간장을 먼저 넣으면 김치와 합쳐져 짤 수 있습니다.", rescueTip: "싱거우면 간장 1/2작은술만 추가하세요." },
      ],
      source: JIPBAB_ORIGINAL_SOURCE,
      safety: JIPBAB_ORIGINAL_SAFETY,
    };
  }

  if (recipe.name === "김치계란밥") {
    return {
      ...recipe,
      recipePosterImageUrl: "/images/recipes/beginner-imagegen-posters/beginner-018.png",
      recipeGuideImageUrl: "/images/recipes/beginner-recipe-guides/beginner-018.png",
      recipePrepImageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-018.png",
      recipeStepsImageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-018.png",
      ingredientDetails: [
        ingredient("밥", "1공기", "따뜻할수록 계란과 김치가 고르게 비벼집니다."),
        ingredient("계란", "2개", "한 개는 부족할 수 있어 2개가 초보자 한 끼에 안정적입니다."),
        ingredient("김치", "1/2컵", "가위로 작게 자르면 계란과 같이 먹기 쉽습니다."),
        ingredient("간장", "1작은술", "김치가 짜면 생략해도 됩니다."),
        ingredient("참기름", "1작은술", "불을 끈 뒤 넣으면 고소합니다."),
        ingredient("김가루", "1큰술", "마지막에 넣으면 물기를 잡아줍니다."),
      ],
      steps: [
        { index: 1, title: "김치 준비", description: "김치 1/2컵을 가위로 작게 자르고 국물이 많으면 숟가락으로 눌러 뺍니다.", imageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-018.png", imageAlt: "김치계란밥 김치 준비", heat: "불 없음", minutes: 2, beginnerTip: "김치가 너무 크면 비빌 때 불편하니 먼저 작게 자릅니다.", visualCue: "김치 조각이 밥알보다 조금 큰 정도면 됩니다.", commonMistake: "큰 김치를 그대로 넣으면 계란과 밥에 고르게 섞이지 않습니다.", rescueTip: "이미 넣었다면 그릇 안에서 가위로 한 번 더 자르세요." },
        { index: 2, title: "계란 프라이", description: "팬에 식용유를 얇게 두르고 계란 2개를 중불에서 프라이합니다.", imageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-018.png", imageAlt: "김치계란밥 계란 프라이", heat: "중불", minutes: 3, beginnerTip: "완숙이어도 밥에 비비면 충분히 부드럽습니다.", visualCue: "흰자가 하얗게 굳고 노른자가 가운데에 있으면 됩니다.", commonMistake: "센불에서 오래 익히면 밑면이 딱딱해집니다.", rescueTip: "가장자리가 빨리 갈색이 되면 불을 약하게 줄이세요." },
        { index: 3, title: "밥에 올리기", description: "따뜻한 밥 1공기 위에 김치와 계란을 올리고 간장 1작은술만 넣습니다.", imageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-018.png", imageAlt: "김치계란밥 밥에 올리기", heat: "불 없음", minutes: 1, beginnerTip: "김치가 짭짤하면 간장은 생략해도 됩니다.", visualCue: "밥 위에 김치, 계란, 간장이 따로 보여야 비비기 쉽습니다.", commonMistake: "김치가 짠데 간장을 1큰술 넣으면 전체가 짜집니다.", rescueTip: "짜면 밥 반 공기나 김가루를 더 넣어 비비세요." },
        { index: 4, title: "비벼 마무리", description: "계란을 숟가락으로 잘라 밥과 김치가 고르게 섞이도록 비비고 참기름을 넣습니다.", imageUrl: "/images/recipes/beginner-recipe-guides/beginner-018.png", imageAlt: "완성된 김치계란밥", heat: "불 없음", minutes: 1, beginnerTip: "노른자를 먼저 터뜨린 뒤 아래에서 위로 섞으면 쉽습니다.", visualCue: "밥알에 김치 색이 연하게 묻고 계란 조각이 고르게 보이면 완성입니다.", commonMistake: "대충 섞으면 한입은 짜고 한입은 싱겁습니다.", rescueTip: "간이 약하면 간장 1/2작은술만 추가하세요." },
      ],
      source: JIPBAB_ORIGINAL_SOURCE,
      safety: JIPBAB_ORIGINAL_SAFETY,
    };
  }

  if (recipe.name === "주먹밥") {
    return {
      ...recipe,
      recipePosterImageUrl: "/images/recipes/beginner-imagegen-posters/beginner-019.png",
      recipeGuideImageUrl: "/images/recipes/beginner-recipe-guides/beginner-019.png",
      recipePrepImageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-019.png",
      recipeStepsImageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-019.png",
      ingredientDetails: [
        ingredient("밥", "1공기", "따뜻할 때 양념해야 잘 뭉쳐집니다."),
        ingredient("김가루", "2큰술", "김을 잘게 부수면 초보자도 모양 잡기가 쉽습니다."),
        ingredient("참기름", "1작은술", "밥을 고소하게 하고 덜 달라붙게 합니다."),
        ingredient("참깨", "1작은술", "마지막 고소함을 더합니다."),
        ingredient("소금", "한 꼬집", "간은 아주 약하게 시작해야 짜지 않습니다."),
      ],
      steps: [
        { index: 1, title: "밥 식히기", description: "따뜻한 밥 1공기를 그릇에 담고 1분 식혀 손으로 만질 수 있게 합니다.", imageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-019.png", imageAlt: "주먹밥 밥 식히기", heat: "불 없음", minutes: 1, beginnerTip: "너무 뜨거우면 손에 달라붙으니 잠깐 식힙니다.", visualCue: "김은 나지만 손 가까이에 두어도 너무 뜨겁지 않으면 됩니다.", commonMistake: "너무 뜨거운 밥은 손에 달라붙고 모양 잡기 어렵습니다.", rescueTip: "접시에 넓게 펴서 1분 더 식히세요." },
        { index: 2, title: "양념 섞기", description: "밥에 김가루 2큰술, 참기름 1작은술, 소금 한 꼬집을 넣고 숟가락으로 섞습니다.", imageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-019.png", imageAlt: "주먹밥 양념 섞기", heat: "불 없음", minutes: 2, beginnerTip: "간장은 밥을 질게 만들 수 있어 소금 한 꼬집이 더 쉽습니다.", visualCue: "밥알 사이에 김가루가 고르게 보이면 됩니다.", commonMistake: "간장을 많이 넣으면 밥이 질어져 잘 안 뭉칩니다.", rescueTip: "질어졌다면 김가루 1큰술을 더 넣으세요." },
        { index: 3, title: "한입 크기로 나누기", description: "밥을 숟가락으로 4등분해 같은 크기로 나눕니다.", imageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-019.png", imageAlt: "주먹밥 밥 나누기", heat: "불 없음", minutes: 1, beginnerTip: "먼저 나누면 주먹밥 크기가 들쭉날쭉하지 않습니다.", visualCue: "각 덩어리가 탁구공보다 조금 작은 크기면 먹기 쉽습니다.", commonMistake: "크기가 크면 속까지 간이 약하게 느껴집니다.", rescueTip: "큰 덩어리는 반으로 나눠 다시 뭉치세요." },
        { index: 4, title: "뭉치기", description: "손에 물을 살짝 묻히고 밥을 가볍게 눌러 동그랗게 뭉칩니다.", imageUrl: "/images/recipes/beginner-recipe-guides/beginner-019.png", imageAlt: "완성된 주먹밥", heat: "불 없음", minutes: 3, beginnerTip: "손에 물을 묻히면 밥알이 덜 붙습니다.", visualCue: "집었을 때 부서지지 않고 표면에 김가루가 보이면 완성입니다.", commonMistake: "너무 세게 누르면 밥알이 뭉개져 딱딱해집니다.", rescueTip: "부서지면 참기름을 아주 조금 묻혀 다시 뭉치세요." },
      ],
      source: JIPBAB_ORIGINAL_SOURCE,
      safety: JIPBAB_ORIGINAL_SAFETY,
    };
  }

  if (recipe.name === "김치주먹밥") {
    return {
      ...recipe,
      recipePosterImageUrl: "/images/recipes/beginner-imagegen-posters/beginner-020.png",
      recipeGuideImageUrl: "/images/recipes/beginner-recipe-guides/beginner-020.png",
      recipePrepImageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-020.png",
      recipeStepsImageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-020.png",
      ingredientDetails: [
        ingredient("밥", "1공기", "따뜻할 때 섞어야 김치와 잘 붙습니다."),
        ingredient("김치", "1/2컵", "국물을 꼭 짜야 주먹밥이 질어지지 않습니다."),
        ingredient("김가루", "2큰술", "김치 수분을 잡아 모양을 유지합니다."),
        ingredient("참기름", "1작은술", "김치의 신맛을 부드럽게 합니다."),
        ingredient("참깨", "1작은술", "마지막에 섞으면 고소합니다."),
      ],
      steps: [
        { index: 1, title: "김치 물기 빼기", description: "김치 1/2컵은 국물을 꼭 짜고 가위로 밥알보다 조금 크게 자릅니다.", imageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-020.png", imageAlt: "김치주먹밥 김치 물기 빼기", heat: "불 없음", minutes: 2, beginnerTip: "김치국물을 줄이는 것이 모양 유지의 핵심입니다.", visualCue: "그릇 바닥에 김치국물이 고이지 않으면 됩니다.", commonMistake: "김치국물이 많으면 주먹밥이 질어지고 손에 붙습니다.", rescueTip: "이미 질어졌다면 김가루를 1큰술씩 추가하세요." },
        { index: 2, title: "밥 섞기", description: "밥 1공기에 김치, 김가루 2큰술, 참기름 1작은술을 넣고 숟가락으로 섞습니다.", imageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-020.png", imageAlt: "김치주먹밥 밥 섞기", heat: "불 없음", minutes: 2, beginnerTip: "숟가락으로 누르지 말고 아래에서 위로 들어 올리듯 섞습니다.", visualCue: "밥알 전체에 김치 색이 연하게 묻으면 됩니다.", commonMistake: "밥을 누르며 섞으면 떡처럼 뭉칩니다.", rescueTip: "숟가락 두 개로 들어 올리듯 다시 풀어주세요." },
        { index: 3, title: "간 보기", description: "한 숟가락 맛보고 싱거울 때만 소금 한 꼬집이나 김가루를 조금 더 넣습니다.", imageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-020.png", imageAlt: "김치주먹밥 간 보기", heat: "불 없음", minutes: 1, beginnerTip: "김치가 짜면 추가 간은 필요 없습니다.", visualCue: "김치 맛이 먼저 나고 밥이 싱겁지 않으면 충분합니다.", commonMistake: "간장을 넣으면 밥이 더 질어질 수 있습니다.", rescueTip: "간장을 넣었다면 김가루를 더해 수분을 잡으세요." },
        { index: 4, title: "작게 뭉치기", description: "손에 물을 살짝 묻히고 밥을 4개로 나눠 한입 크기로 뭉칩니다.", imageUrl: "/images/recipes/beginner-recipe-guides/beginner-020.png", imageAlt: "완성된 김치주먹밥", heat: "불 없음", minutes: 3, beginnerTip: "작게 만들어야 초보자도 덜 부서지게 잡을 수 있습니다.", visualCue: "들었을 때 모양이 유지되고 김치가 밖으로 많이 튀어나오지 않으면 완성입니다.", commonMistake: "크게 만들면 먹다가 쉽게 부서집니다.", rescueTip: "부서지는 밥은 작은 컵에 눌러 컵주먹밥처럼 담아도 됩니다." },
      ],
      source: JIPBAB_ORIGINAL_SOURCE,
      safety: JIPBAB_ORIGINAL_SAFETY,
    };
  }

  if (recipe.name === "스팸마요덮밥") {
    return {
      ...recipe,
      recipePosterImageUrl: "/images/recipes/beginner-imagegen-posters/beginner-021.png",
      recipeGuideImageUrl: "/images/recipes/beginner-recipe-guides/beginner-021.png",
      recipePrepImageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-021.png",
      recipeStepsImageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-021.png",
      ingredientDetails: [
        ingredient("밥", "1공기", "따뜻하게 데워야 토핑과 잘 섞입니다."),
        ingredient("스팸", "1/3캔", "작게 썰어야 짠맛이 한쪽에 몰리지 않습니다."),
        ingredient("계란", "1개", "스크램블이나 프라이로 올리면 짠맛이 부드러워집니다."),
        ingredient("마요네즈", "1큰술", "많이 넣으면 느끼하니 1큰술부터 시작합니다."),
        ingredient("간장", "1작은술", "스팸이 짜면 생략해도 됩니다."),
        ingredient("김가루", "1큰술", "마지막에 올리면 한 그릇 느낌이 납니다."),
      ],
      steps: [
        { index: 1, title: "밥 담기", description: "따뜻한 밥 1공기를 그릇에 담고 가운데를 살짝 낮게 눌러 토핑 자리를 만듭니다.", imageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-021.png", imageAlt: "스팸마요덮밥 밥 담기", heat: "불 없음", minutes: 1, beginnerTip: "찬밥이면 전자레인지에 1분 데우세요.", visualCue: "밥 가운데가 낮고 가장자리가 살짝 올라오면 토핑이 흘러내리지 않습니다.", commonMistake: "찬밥을 쓰면 마요네즈와 토핑이 따로 놉니다.", rescueTip: "찬밥이면 전자레인지에 1분 데우세요." },
        { index: 2, title: "스팸 굽기", description: "스팸 1/3캔을 작은 주사위 모양으로 썰고 중불에서 3분 볶습니다.", imageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-021.png", imageAlt: "스팸마요덮밥 스팸 굽기", heat: "중불", minutes: 3, beginnerTip: "작게 썰수록 한입이 덜 짜고 밥과 잘 섞입니다.", visualCue: "스팸 가장자리가 연한 갈색이고 기름이 살짝 나오면 됩니다.", commonMistake: "크게 썰면 한입이 너무 짜집니다.", rescueTip: "크게 썰었다면 팬에서 가위로 한 번 더 자르세요." },
        { index: 3, title: "계란 익히기", description: "계란 1개를 같은 팬 한쪽에서 크게 저어 촉촉한 스크램블로 익힙니다.", imageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-021.png", imageAlt: "스팸마요덮밥 계란 익히기", heat: "약불", minutes: 2, beginnerTip: "계란은 완전히 예쁜 모양이 아니어도 밥 위에 올리면 됩니다.", visualCue: "계란이 촉촉한 노란 덩어리로 굳으면 됩니다.", commonMistake: "센불에서 익히면 계란이 퍽퍽해집니다.", rescueTip: "퍽퍽하면 밥 위에 올린 뒤 마요네즈를 조금 더 얹으세요." },
        { index: 4, title: "마요 올리기", description: "밥 위에 스팸과 계란을 올리고 마요네즈 1큰술, 간장 1작은술, 김가루를 뿌립니다.", imageUrl: "/images/recipes/beginner-recipe-guides/beginner-021.png", imageAlt: "완성된 스팸마요덮밥", heat: "불 없음", minutes: 1, beginnerTip: "스팸이 짠 편이면 간장은 반만 넣어도 됩니다.", visualCue: "밥 위에 스팸, 계란, 마요네즈가 따로 보이면 비비기 좋습니다.", commonMistake: "스팸이 짠데 간장을 많이 넣으면 전체가 짭니다.", rescueTip: "짜면 밥을 반 공기 더 넣거나 마요네즈를 조금 더해 부드럽게 잡으세요." },
      ],
      source: JIPBAB_ORIGINAL_SOURCE,
      safety: JIPBAB_ORIGINAL_SAFETY,
    };
  }

  if (recipe.name === "콩나물밥") {
    return {
      ...recipe,
      recipePosterImageUrl: "/images/recipes/beginner-imagegen-posters/beginner-022.png",
      recipeGuideImageUrl: "/images/recipes/beginner-recipe-guides/beginner-022.png",
      recipePrepImageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-022.png",
      recipeStepsImageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-022.png",
      ingredientDetails: [
        ingredient("밥", "1공기", "따뜻하게 데워 콩나물과 바로 섞습니다."),
        ingredient("콩나물", "1줌", "처음에는 한 줌만 쓰면 실패가 적습니다."),
        ingredient("물", "1/2컵", "콩나물을 짧게 익히는 양입니다."),
        ingredient("간장", "1큰술", "비벼 먹는 양념의 기본 간입니다."),
        ingredient("참기름", "1작은술", "콩나물 비린 향을 줄이고 고소하게 합니다."),
        ingredient("대파", "1큰술", "양념장에 넣으면 향이 좋아집니다."),
      ],
      steps: [
        { index: 1, title: "콩나물 씻기", description: "콩나물 1줌을 흐르는 물에 헹구고 검게 상한 부분만 골라냅니다.", imageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-022.png", imageAlt: "콩나물밥 콩나물 씻기", heat: "불 없음", minutes: 2, beginnerTip: "처음에는 많이 넣지 말고 한 줌만 쓰면 밥과 비율이 맞습니다.", visualCue: "물에 떠다니는 껍질이 줄고 콩나물이 깨끗해 보이면 됩니다.", commonMistake: "콩나물을 너무 많이 쓰면 초보자 한 그릇에 비율이 맞지 않습니다.", rescueTip: "많이 씻었다면 절반만 쓰고 나머지는 국에 넣으세요." },
        { index: 2, title: "콩나물 익히기", description: "냄비에 콩나물과 물 1/2컵을 넣고 중불에서 5분 익힙니다.", imageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-022.png", imageAlt: "콩나물밥 콩나물 익히기", heat: "중불", minutes: 5, beginnerTip: "뚜껑을 계속 신경 쓰기 어렵다면 처음부터 열고 익히세요.", visualCue: "콩나물 줄기가 살짝 투명해지고 숨이 죽으면 됩니다.", commonMistake: "뚜껑을 열었다 닫았다 하면 비린내가 날 수 있습니다.", rescueTip: "처음부터 뚜껑을 열고 익히면 실패가 적습니다." },
        { index: 3, title: "양념장 만들기", description: "간장 1큰술, 참기름 1작은술, 대파, 참깨를 작은 그릇에 섞습니다.", imageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-022.png", imageAlt: "콩나물밥 양념장 만들기", heat: "불 없음", minutes: 1, beginnerTip: "양념장은 처음부터 다 넣지 말고 절반부터 넣으면 안전합니다.", visualCue: "간장 위에 참기름이 얇게 떠 있고 대파가 고르게 보이면 됩니다.", commonMistake: "간장을 많이 넣으면 밥 전체가 짜집니다.", rescueTip: "짠맛이 걱정되면 양념장은 절반만 먼저 넣으세요." },
        { index: 4, title: "밥과 비비기", description: "따뜻한 밥 1공기 위에 익힌 콩나물을 올리고 양념장을 절반부터 넣어 비빕니다.", imageUrl: "/images/recipes/beginner-recipe-guides/beginner-022.png", imageAlt: "완성된 콩나물밥", heat: "불 없음", minutes: 2, beginnerTip: "콩나물 삶은 물은 많이 넣지 말고 콩나물만 건져 올립니다.", visualCue: "밥알 사이에 콩나물이 고르게 섞이고 윤기가 돌면 완성입니다.", commonMistake: "콩나물 물을 많이 넣으면 밥이 질어집니다.", rescueTip: "질어졌다면 김가루나 밥을 조금 더 넣어 잡으세요." },
      ],
      source: JIPBAB_ORIGINAL_SOURCE,
      safety: JIPBAB_ORIGINAL_SAFETY,
    };
  }

  if (recipe.name === "간장버터밥") {
    return {
      ...recipe,
      recipePosterImageUrl: "/images/recipes/beginner-imagegen-posters/beginner-023.png",
      recipeGuideImageUrl: "/images/recipes/beginner-recipe-guides/beginner-023.png",
      recipePrepImageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-023.png",
      recipeStepsImageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-023.png",
      ingredientDetails: [
        ingredient("밥", "1공기", "뜨거워야 버터가 덩어리 없이 녹습니다."),
        ingredient("버터", "1작은술", "많이 넣으면 느끼하니 작은 숟가락 1번만 넣습니다."),
        ingredient("간장", "1큰술", "버터가 들어가므로 처음에는 1큰술만 넣습니다."),
        ingredient("참깨", "1작은술", "마지막에 넣으면 고소합니다."),
        ingredient("김가루", "1큰술", "느끼함을 잡고 간을 부드럽게 합니다."),
      ],
      steps: [
        { index: 1, title: "밥 뜨겁게 준비", description: "밥 1공기를 뜨겁게 데워 그릇에 담습니다.", imageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-023.png", imageAlt: "간장버터밥 밥 준비", heat: "불 없음", minutes: 1, beginnerTip: "즉석밥이면 표시 시간대로 데우면 됩니다.", visualCue: "밥에서 김이 올라오면 버터가 잘 녹을 온도입니다.", commonMistake: "찬밥에 버터를 넣으면 덩어리로 남습니다.", rescueTip: "버터가 안 녹으면 전자레인지에 20초만 더 데우세요." },
        { index: 2, title: "버터 녹이기", description: "버터 1작은술을 밥 가운데 넣고 밥으로 덮어 30초 둡니다.", imageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-023.png", imageAlt: "간장버터밥 버터 녹이기", heat: "불 없음", minutes: 1, beginnerTip: "버터는 적게 넣어야 간장 맛과 균형이 맞습니다.", visualCue: "밥 사이로 버터가 녹아 윤기가 보이면 됩니다.", commonMistake: "버터를 크게 한 숟가락 넣으면 느끼하고 질척합니다.", rescueTip: "느끼하면 김가루를 넣거나 밥을 조금 더 넣으세요." },
        { index: 3, title: "간장 넣기", description: "간장 1큰술을 밥 가장자리로 둘러 넣고 숟가락으로 아래에서 위로 섞습니다.", imageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-023.png", imageAlt: "간장버터밥 간장 넣기", heat: "불 없음", minutes: 1, beginnerTip: "간장은 더 넣기 쉽지만 빼기는 어려워 1큰술부터 시작합니다.", visualCue: "밥알 일부가 연한 갈색으로 변하면 간장이 섞이고 있습니다.", commonMistake: "간장을 한가운데 붓고 그대로 두면 한입만 짭니다.", rescueTip: "짠 부분이 있으면 흰 밥 쪽과 크게 섞어주세요." },
        { index: 4, title: "마무리", description: "참깨나 김가루를 넣고 한입 맛본 뒤 싱거울 때만 간장 1/2작은술을 더합니다.", imageUrl: "/images/recipes/beginner-recipe-guides/beginner-023.png", imageAlt: "완성된 간장버터밥", heat: "불 없음", minutes: 1, beginnerTip: "김가루를 넣으면 느끼함과 짠맛이 조금 부드러워집니다.", visualCue: "밥알에 윤기가 돌고 버터 덩어리가 보이지 않으면 완성입니다.", commonMistake: "처음부터 간장을 더 넣으면 되돌리기 어렵습니다.", rescueTip: "짜면 밥을 반 공기 더 넣어 다시 비비세요." },
      ],
      source: JIPBAB_ORIGINAL_SOURCE,
      safety: JIPBAB_ORIGINAL_SAFETY,
    };
  }

  if (recipe.name === "참치주먹밥") {
    return {
      ...recipe,
      recipePosterImageUrl: "/images/recipes/beginner-imagegen-posters/beginner-024.png",
      recipeGuideImageUrl: "/images/recipes/beginner-recipe-guides/beginner-024.png",
      recipePrepImageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-024.png",
      recipeStepsImageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-024.png",
      ingredientDetails: [
        ingredient("밥", "1공기", "따뜻할 때 섞어야 참치와 잘 붙습니다."),
        ingredient("참치캔", "1/2캔", "기름을 대부분 빼야 주먹밥이 질어지지 않습니다."),
        ingredient("김가루", "2큰술", "참치 수분을 잡아 모양을 유지합니다."),
        ingredient("마요네즈", "1작은술", "참치를 부드럽게 묶지만 많이 넣으면 질어집니다."),
        ingredient("간장", "1작은술", "참치 비린맛을 줄이고 간을 맞춥니다."),
        ingredient("참깨", "1작은술", "마지막 고소함을 더합니다."),
      ],
      steps: [
        { index: 1, title: "참치 기름 빼기", description: "참치캔 1/2캔은 숟가락으로 눌러 기름을 대부분 빼고 그릇에 담습니다.", imageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-024.png", imageAlt: "참치주먹밥 참치 기름 빼기", heat: "불 없음", minutes: 2, beginnerTip: "참치가 조금 촉촉한 정도만 남기면 됩니다.", visualCue: "그릇 바닥에 기름이 고이지 않으면 됩니다.", commonMistake: "기름이 많으면 주먹밥이 질어지고 손에 묻습니다.", rescueTip: "이미 질어졌다면 김가루를 1큰술씩 더 넣으세요." },
        { index: 2, title: "밥 섞기", description: "밥 1공기에 참치, 김가루 2큰술, 간장 1작은술, 마요네즈 1작은술을 넣고 섞습니다.", imageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-024.png", imageAlt: "참치주먹밥 밥 섞기", heat: "불 없음", minutes: 2, beginnerTip: "마요네즈는 1작은술만 넣어야 모양이 잘 잡힙니다.", visualCue: "밥알 사이에 참치와 김가루가 고르게 보이면 됩니다.", commonMistake: "마요네즈를 많이 넣으면 모양이 풀립니다.", rescueTip: "질척하면 김가루나 밥을 조금 더 넣으세요." },
        { index: 3, title: "간 보기", description: "한 숟가락 맛보고 싱거울 때만 소금 한 꼬집이나 간장 1/2작은술을 더합니다.", imageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-024.png", imageAlt: "참치주먹밥 간 보기", heat: "불 없음", minutes: 1, beginnerTip: "참치 자체에 간이 있으니 먼저 맛본 뒤 보충합니다.", visualCue: "참치 맛이 나고 밥이 싱겁지 않으면 충분합니다.", commonMistake: "참치 자체 간을 잊고 간장을 많이 넣기 쉽습니다.", rescueTip: "짜면 밥을 더 넣고 김가루를 추가하세요." },
        { index: 4, title: "작게 뭉치기", description: "손에 물을 살짝 묻히고 밥을 4개로 나눠 한입 크기로 뭉칩니다.", imageUrl: "/images/recipes/beginner-recipe-guides/beginner-024.png", imageAlt: "완성된 참치주먹밥", heat: "불 없음", minutes: 3, beginnerTip: "작게 만들면 부서지기 전에 한입에 먹기 좋습니다.", visualCue: "집었을 때 부서지지 않고 참치가 밖으로 많이 나오지 않으면 완성입니다.", commonMistake: "크게 만들면 먹다가 부서집니다.", rescueTip: "부서지는 밥은 컵에 눌러 담아 컵주먹밥처럼 먹어도 됩니다." },
      ],
      source: JIPBAB_ORIGINAL_SOURCE,
      safety: JIPBAB_ORIGINAL_SAFETY,
    };
  }

  if (recipe.name === "깻잎주먹밥") {
    return {
      ...recipe,
      recipePosterImageUrl: "/images/recipes/beginner-imagegen-posters/beginner-025.png",
      recipeGuideImageUrl: "/images/recipes/beginner-recipe-guides/beginner-025.png",
      recipePrepImageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-025.png",
      recipeStepsImageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-025.png",
      ingredientDetails: [
        ingredient("밥", "1공기", "따뜻할 때 양념해야 잘 뭉쳐집니다."),
        ingredient("깻잎", "4~6장", "물기를 꼭 털어야 밥이 질어지지 않습니다."),
        ingredient("김가루", "2큰술", "깻잎 향과 밥을 잘 묶어줍니다."),
        ingredient("참기름", "1작은술", "깻잎 향을 부드럽게 합니다."),
        ingredient("소금", "한 꼬집", "간은 약하게 시작해야 짜지 않습니다."),
        ingredient("참깨", "1작은술", "마지막 고소함을 더합니다."),
      ],
      steps: [
        { index: 1, title: "깻잎 물기 빼기", description: "깻잎 4~6장을 씻고 키친타월로 물기를 닦은 뒤 가위로 잘게 자릅니다.", imageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-025.png", imageAlt: "깻잎주먹밥 깻잎 손질", heat: "불 없음", minutes: 3, beginnerTip: "깻잎은 물기만 잘 빼도 주먹밥이 훨씬 잘 뭉칩니다.", visualCue: "깻잎에 물방울이 거의 없고 작은 조각으로 보이면 됩니다.", commonMistake: "깻잎 물기가 많으면 주먹밥이 질어집니다.", rescueTip: "이미 질어졌다면 김가루를 1큰술 더 넣으세요." },
        { index: 2, title: "밥 양념하기", description: "밥 1공기에 김가루 2큰술, 참기름 1작은술, 소금 한 꼬집을 넣고 섞습니다.", imageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-025.png", imageAlt: "깻잎주먹밥 밥 양념", heat: "불 없음", minutes: 2, beginnerTip: "간장은 밥을 질게 만들 수 있어 소금 한 꼬집이 더 쉽습니다.", visualCue: "밥알 사이에 김가루와 참기름 윤기가 고르게 보이면 됩니다.", commonMistake: "간장을 많이 넣으면 밥이 질어지고 짭니다.", rescueTip: "짰다면 밥을 조금 더 넣고 다시 섞으세요." },
        { index: 3, title: "깻잎 섞기", description: "잘게 자른 깻잎을 밥에 넣고 숟가락 두 개로 들어 올리듯 섞습니다.", imageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-025.png", imageAlt: "깻잎주먹밥 깻잎 섞기", heat: "불 없음", minutes: 1, beginnerTip: "깻잎은 마지막에 넣어야 향이 살아납니다.", visualCue: "밥 전체에 초록 깻잎 조각이 고르게 보이면 됩니다.", commonMistake: "세게 누르며 섞으면 밥이 떡처럼 뭉칩니다.", rescueTip: "뭉쳤다면 숟가락으로 옆에서 살살 풀어주세요." },
        { index: 4, title: "작게 뭉치기", description: "손에 물을 살짝 묻히고 밥을 4개로 나눠 한입 크기로 뭉칩니다.", imageUrl: "/images/recipes/beginner-recipe-guides/beginner-025.png", imageAlt: "완성된 깻잎주먹밥", heat: "불 없음", minutes: 3, beginnerTip: "작게 만들어야 덜 부서지고 한입에 먹기 쉽습니다.", visualCue: "집었을 때 부서지지 않고 깻잎이 표면에 보이면 완성입니다.", commonMistake: "크게 만들면 먹다가 잘 부서집니다.", rescueTip: "부서지면 작은 컵에 눌러 담아 컵주먹밥처럼 먹어도 됩니다." },
      ],
      source: JIPBAB_ORIGINAL_SOURCE,
      safety: JIPBAB_ORIGINAL_SAFETY,
    };
  }

  if (recipe.name === "나물비빔밥") {
    return {
      ...recipe,
      recipePosterImageUrl: "/images/recipes/beginner-imagegen-posters/beginner-026.png",
      recipeGuideImageUrl: "/images/recipes/beginner-recipe-guides/beginner-026.png",
      recipePrepImageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-026.png",
      recipeStepsImageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-026.png",
      ingredientDetails: [
        ingredient("밥", "1공기", "따뜻할수록 나물과 양념이 잘 섞입니다."),
        ingredient("시판 나물", "1컵", "처음에는 이미 무쳐진 나물을 쓰면 실패가 적습니다."),
        ingredient("계란", "1개", "있으면 한 끼가 더 든든해집니다."),
        ingredient("간장", "1큰술", "맵지 않은 기본 비빔 양념입니다."),
        ingredient("참기름", "1작은술", "나물 향을 살리고 밥을 부드럽게 합니다."),
        ingredient("참깨", "1작은술", "마지막에 뿌리면 고소합니다."),
      ],
      steps: [
        { index: 1, title: "나물 물기 확인", description: "시판 나물 1컵은 국물이 많으면 숟가락으로 살짝 눌러 물기를 덜어냅니다.", imageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-026.png", imageAlt: "나물비빔밥 나물 준비", heat: "불 없음", minutes: 1, beginnerTip: "초보자는 이미 무쳐진 나물을 쓰면 간 맞추기가 쉽습니다.", visualCue: "그릇 바닥에 나물 국물이 많이 고이지 않으면 됩니다.", commonMistake: "물기 많은 나물을 그대로 넣으면 밥이 질어집니다.", rescueTip: "질어졌다면 김가루나 밥을 조금 더 넣어 잡으세요." },
        { index: 2, title: "밥 담기", description: "따뜻한 밥 1공기를 큰 그릇에 담고 숟가락으로 가볍게 풀어둡니다.", imageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-026.png", imageAlt: "나물비빔밥 밥 담기", heat: "불 없음", minutes: 1, beginnerTip: "큰 그릇을 쓰면 비빌 때 밖으로 덜 흘립니다.", visualCue: "큰 밥덩어리가 없어지고 밥알이 따로 보이면 됩니다.", commonMistake: "찬밥 덩어리를 그대로 비비면 양념이 한쪽에 몰립니다.", rescueTip: "찬밥이면 전자레인지에 1분 데우세요." },
        { index: 3, title: "나물과 양념 올리기", description: "밥 위에 나물을 올리고 간장 1큰술, 참기름 1작은술을 먼저 넣습니다.", imageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-026.png", imageAlt: "나물비빔밥 양념 올리기", heat: "불 없음", minutes: 1, beginnerTip: "매운맛이 좋으면 고추장은 1작은술만 추가합니다.", visualCue: "밥 위에 나물과 양념이 따로 보이면 비비기 쉽습니다.", commonMistake: "양념을 많이 넣기 전 맛을 보지 않으면 짤 수 있습니다.", rescueTip: "간장은 절반만 넣고 비빈 뒤 부족하면 더 넣어도 됩니다." },
        { index: 4, title: "비비고 간 보기", description: "숟가락으로 아래에서 위로 크게 비빈 뒤 한입 맛보고 싱거우면 간장 1/2작은술만 더합니다.", imageUrl: "/images/recipes/beginner-recipe-guides/beginner-026.png", imageAlt: "완성된 나물비빔밥", heat: "불 없음", minutes: 2, beginnerTip: "비빌 때 밥을 누르지 말고 크게 섞어야 질어지지 않습니다.", visualCue: "밥알 사이에 나물이 고르게 섞이고 윤기가 돌면 완성입니다.", commonMistake: "세게 누르며 비비면 밥이 뭉개집니다.", rescueTip: "짜면 밥을 조금 더 넣고 참기름은 더 넣지 마세요." },
      ],
      source: JIPBAB_ORIGINAL_SOURCE,
      safety: JIPBAB_ORIGINAL_SAFETY,
    };
  }

  if (recipe.name === "두부부침") {
    return {
      ...recipe,
      recipePosterImageUrl: "/images/recipes/beginner-imagegen-posters/beginner-027.png",
      recipeGuideImageUrl: "/images/recipes/beginner-recipe-guides/beginner-027.png",
      recipePrepImageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-027.png",
      recipeStepsImageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-027.png",
      ingredientDetails: [
        ingredient("두부", "1모", "단단한 부침용 두부가 덜 부서져 초보자에게 쉽습니다."),
        ingredient("식용유", "1큰술", "두부가 팬에 달라붙지 않게 합니다."),
        ingredient("소금", "한 꼬집", "두부 밑간은 아주 약하게 합니다."),
        ingredient("간장", "1큰술", "찍어 먹는 양념의 기본입니다."),
        ingredient("대파", "1큰술", "간장에 섞으면 향이 좋아집니다."),
        ingredient("참기름", "1/2작은술", "간장 양념에 조금만 넣습니다."),
      ],
      steps: [
        { index: 1, title: "두부 물기 닦기", description: "두부 1모를 손가락 두께로 자르고 키친타월로 겉물기를 닦습니다.", imageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-027.png", imageAlt: "두부부침 두부 물기 닦기", heat: "불 없음", minutes: 3, beginnerTip: "두부 물기만 줄여도 팬에 덜 붙고 덜 튑니다.", visualCue: "두부 표면에 물방울이 거의 없으면 됩니다.", commonMistake: "물기가 많으면 팬에서 튀고 잘 부서집니다.", rescueTip: "물기가 남았으면 키친타월로 한 번 더 눌러주세요." },
        { index: 2, title: "밑간하기", description: "두부 양면에 소금 한 꼬집을 나눠 뿌리고 1분 둡니다.", imageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-027.png", imageAlt: "두부부침 밑간", heat: "불 없음", minutes: 1, beginnerTip: "소금은 손가락으로 아주 조금만 집어 나눠 뿌립니다.", visualCue: "두부 표면에 소금이 아주 살짝 보이는 정도면 됩니다.", commonMistake: "소금을 많이 뿌리면 간장 없이도 짭니다.", rescueTip: "많이 뿌렸다면 키친타월로 표면을 살짝 닦으세요." },
        { index: 3, title: "앞뒤로 부치기", description: "팬에 식용유 1큰술을 두르고 중불에서 두부를 앞면 3분, 뒷면 3분 부칩니다.", imageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-027.png", imageAlt: "두부부침 굽기", heat: "중불", minutes: 6, beginnerTip: "처음 3분은 자꾸 건드리지 않는 것이 덜 부서지는 핵심입니다.", visualCue: "두부 가장자리가 연한 노란색이고 뒤집개가 잘 들어가면 됩니다.", commonMistake: "너무 빨리 뒤집으면 두부가 찢어집니다.", rescueTip: "붙어 있으면 30초 더 기다렸다가 뒤집개를 깊게 넣으세요." },
        { index: 4, title: "간장 곁들이기", description: "간장 1큰술, 대파, 참기름을 섞어 두부 옆에 조금만 곁들입니다.", imageUrl: "/images/recipes/beginner-recipe-guides/beginner-027.png", imageAlt: "완성된 두부부침", heat: "불 없음", minutes: 1, beginnerTip: "양념은 두부 위에 붓지 말고 찍어 먹으면 덜 짭니다.", visualCue: "두부는 겉이 단단하고 간장은 따로 보이면 완성입니다.", commonMistake: "간장을 두부 위에 다 부으면 금방 짜집니다.", rescueTip: "짜면 밥과 같이 먹거나 양념 없는 두부를 추가하세요." },
      ],
      source: JIPBAB_ORIGINAL_SOURCE,
      safety: JIPBAB_ORIGINAL_SAFETY,
    };
  }

  if (recipe.name === "두부조림") {
    recipe = {
      ...recipe,
      recipePosterImageUrl: "/images/recipes/beginner-imagegen-posters/beginner-028.png",
      recipeGuideImageUrl: "/images/recipes/beginner-recipe-guides/beginner-028.png",
      recipePrepImageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-028.png",
      recipeStepsImageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-028.png",
    };
  }

  if (recipe.name === "연두부 간장비빔") {
    return withBeginnerGuideAssets(
      recipe,
      "029",
      "/images/recipes/beginner-food-photos/beginner-029-soft-tofu-soy-bowl.png",
      "연두부 간장비빔",
      ["연두부 물 빼기", "그릇에 옮기기", "양념 뿌리기", "대파나 참깨 올리기"],
    );
  }

  if (recipe.name === "순두부계란탕") {
    return withBeginnerGuideAssets(
      recipe,
      "030",
      "/images/recipes/beginner-food-photos/beginner-030-soondubu-egg-soup.png",
      "순두부계란탕",
      ["국물 끓이기", "순두부 넣기", "계란 넣기", "대파 넣고 간 보기"],
    );
  }

  if (recipe.name === "콩나물국") {
    return withBeginnerGuideAssets(
      recipe,
      "031",
      "/images/recipes/jipbab-curated/bean-sprout-soup.png",
      "콩나물국",
      ["콩나물 헹구기", "콩나물 끓이기", "간 맞추기", "대파 넣고 마무리"],
    );
  }

  if (recipe.name === "콩나물무침") {
    return withBeginnerGuideAssets(
      recipe,
      "032",
      "/images/recipes/beginner-food-photos/beginner-032-bean-sprout-muchim.png",
      "콩나물무침",
      ["콩나물 손질", "콩나물 삶기", "물기 빼기", "양념에 무치기"],
    );
  }

  if (recipe.name === "감자볶음") {
    return withBeginnerGuideAssets(
      recipe,
      "033",
      "/images/recipes/beginner-food-photos/beginner-033-gamja-bokkeum.png",
      "감자볶음",
      ["감자 썰고 담그기", "감자 물기 닦기", "감자 먼저 볶기", "양파 넣고 마무리"],
    );
  }

  if (recipe.name === "감자국") {
    return withBeginnerGuideAssets(
      recipe,
      "034",
      "/images/recipes/beginner-food-photos/beginner-034-gamja-guk.png",
      "감자국",
      ["감자와 계란 준비", "감자 끓이기", "계란물 붓기", "대파 넣고 간 보기"],
    );
  }

  if (recipe.name === "감자채전") {
    return withBeginnerGuideAssets(
      recipe,
      "035",
      "/images/recipes/beginner-food-photos/beginner-035-gamja-chae-jeon.png",
      "감자채전",
      ["감자 채 썰기", "반죽 만들기", "얇게 부치기", "뒤집어 마무리"],
    );
  }

  if (recipe.name === "양파두부볶음") {
    return withBeginnerGuideAssets(
      recipe,
      "036",
      "/images/recipes/beginner-food-photos/beginner-036-onion-tofu-bokkeum.png",
      "양파두부볶음",
      ["두부 물기 닦기", "양파 먼저 볶기", "두부 넣기", "간장 마무리"],
    );
  }

  if (recipe.name === "감자채볶음") {
    return withBeginnerGuideAssets(
      recipe,
      "037",
      "/images/recipes/beginner-food-photos/beginner-037-gamja-chae-bokkeum.png",
      "감자채볶음",
      ["감자 채 썰기", "감자 볶기", "양파 넣기", "간 보고 마무리"],
    );
  }

  if (recipe.name === "두부미역국") {
    return withBeginnerGuideAssets(
      recipe,
      "038",
      "/images/recipes/beginner-food-photos/beginner-038-dubu-miyeok-guk.png",
      "두부미역국",
      ["미역 준비", "미역 볶기", "국물 끓이기", "두부 넣기"],
    );
  }

  if (recipe.name === "들기름두부구이") {
    return withBeginnerGuideAssets(
      recipe,
      "039",
      "/images/recipes/beginner-food-photos/beginner-039-perilla-oil-grilled-tofu.png",
      "들기름두부구이",
      ["두부 물기 빼기", "기름 두르기", "두부 굽기", "간장 곁들이기"],
    );
  }

  if (recipe.name === "순두부간장비빔") {
    return withBeginnerGuideAssets(
      recipe,
      "040",
      "/images/recipes/beginner-food-photos/beginner-040-soondubu-soy-bowl.png",
      "순두부간장비빔",
      ["순두부 물 빼기", "양념 넣기", "김가루 올리기", "간 보고 먹기"],
    );
  }

  if (recipe.name === "전자레인지 계란찜") {
    return {
      ...recipe,
      category: "계란요리",
      method: "전자레인지",
      calories: "180",
      thumbnailUrl: "/images/recipes/jipbab-curated/steamed-egg.png",
      recipePosterImageUrl: "/images/recipes/jipbab-curated/steamed-egg.png",
      recipeGuideImageUrl: "/images/recipes/jipbab-curated/steamed-egg.png",
      recipePrepImageUrl: "/images/recipes/jipbab-curated/steamed-egg.png",
      recipeStepsImageUrl: "/images/recipes/jipbab-curated/steamed-egg.png",
      ingredients: "계란, 물, 국간장, 소금, 대파, 참기름",
      ingredientList: ["계란", "물", "국간장", "소금", "대파", "참기름"],
      ingredientDetails: [
        ingredient("계란", "2개", "작은 그릇 1개 분량입니다.", "포크나 젓가락으로 충분히 풀어 둡니다."),
        ingredient("물", "120ml", "종이컵 2/3컵 정도입니다.", "계란과 같은 방향으로 섞습니다."),
        ingredient("국간장", "1작은술", "감칠맛을 내는 기본 간입니다.", "없으면 소금 2꼬집으로 대체합니다."),
        ingredient("소금", "1꼬집", "마지막 간 보정용입니다.", "처음부터 많이 넣지 않습니다."),
        ingredient("대파", "1큰술", "없어도 됩니다.", "잘게 썰어 넣으면 향이 납니다."),
        ingredient("참기름", "1/2작은술", "완성 후 향내기용입니다.", "생략 가능합니다."),
      ],
      trustLabel: "전자레인지",
      featuredReason: "냄비 없이 계란 2개로 만드는 부드러운 계란찜",
      difficulty: 1,
      cookingTime: 8,
      servings: 1,
      beginnerSummary: "계란 2개와 물 120ml를 섞고 전자레인지에서 1분씩 나눠 돌리면 넘침을 줄일 수 있습니다.",
      imageCaption: "가운데를 숟가락으로 눌렀을 때 묽은 계란물이 나오지 않으면 완성입니다.",
      difficultyLevel: 1,
      beginnerScore: 94,
      totalMinutes: 8,
      activeMinutes: 5,
      requiredTools: ["전자레인지", "전자레인지용 그릇", "숟가락"],
      beforeStart: [
        "전자레인지 사용 가능 표시가 있는 깊은 그릇을 씁니다.",
        "랩이나 뚜껑은 완전히 밀봉하지 말고 김이 빠질 틈을 둡니다.",
      ],
      steps: [
        {
          index: 1,
          title: "계란 풀기",
          description: "계란 2개, 물 120ml, 국간장 1작은술을 그릇에 넣고 젓가락으로 30번 정도 섞습니다.",
          imageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-051.png",
          imageAlt: "계란찜 계란물 준비 단계",
          heat: "불 없음",
          minutes: 2,
          beginnerTip: "흰자 덩어리가 크면 익었을 때 뭉치니 충분히 풀어 주세요.",
          visualCue: "계란물이 연한 노란색으로 고르게 섞이면 됩니다.",
          commonMistake: "물을 적게 넣으면 퍽퍽하고 단단해집니다.",
          rescueTip: "계란물이 너무 진해 보이면 물 1큰술을 더 넣어 섞으세요.",
        },
        {
          index: 2,
          title: "덮개 열어 두기",
          description: "랩이나 전자레인지용 뚜껑을 덮되 한쪽을 손가락 한 마디만큼 열어 둡니다.",
          imageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-051.png",
          imageAlt: "계란찜 덮개 준비 단계",
          heat: "불 없음",
          minutes: 1,
          beginnerTip: "완전히 밀봉하면 수증기 때문에 넘칠 수 있습니다.",
          visualCue: "덮개 한쪽에 작은 틈이 보이면 안전합니다.",
          commonMistake: "금속 그릇이나 은박지를 쓰면 위험합니다.",
          rescueTip: "전용 그릇이 없으면 전자레인지 가능 표시가 있는 그릇으로 바꾸세요.",
        },
        {
          index: 3,
          title: "1분씩 돌리기",
          description: "전자레인지에 1분 돌리고 꺼내 한 번 섞은 뒤, 다시 1분 돌립니다.",
          imageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-051.png",
          imageAlt: "계란찜 전자레인지 조리 단계",
          heat: "불 없음",
          minutes: 3,
          beginnerTip: "처음부터 오래 돌리면 가장자리만 딱딱해집니다.",
          visualCue: "가장자리부터 하얗게 굳고 가운데가 살짝 흔들리면 거의 됐습니다.",
          commonMistake: "중간에 섞지 않으면 가운데만 덜 익을 수 있습니다.",
          rescueTip: "묽은 계란물이 보이면 30초씩 추가로 돌리세요.",
        },
        {
          index: 4,
          title: "마무리",
          description: "가운데가 익었는지 확인하고 대파와 참기름을 조금 올려 마무리합니다.",
          imageUrl: "/images/recipes/beginner-recipe-guides/beginner-051.png",
          imageAlt: "완성된 전자레인지 계란찜",
          heat: "불 없음",
          minutes: 1,
          beginnerTip: "그릇이 뜨거우니 마른 행주로 꺼냅니다.",
          visualCue: "숟가락으로 가운데를 떠도 묽은 계란물이 흐르지 않으면 완성입니다.",
          commonMistake: "뜨거운 그릇을 맨손으로 잡으면 데일 수 있습니다.",
          rescueTip: "짰다면 밥 위에 올려 계란덮밥처럼 먹으면 됩니다.",
        },
      ],
      successCheck: "가운데가 묽지 않고 숟가락으로 떴을 때 부드럽게 갈라지면 성공입니다.",
      safetyNotes: [
        "전자레인지 사용 가능 표시가 있는 깊은 그릇만 사용하고 금속이나 은박지는 넣지 않습니다.",
        "덮개는 완전히 밀봉하지 않고 뜨거운 수증기가 몸 반대쪽으로 빠지게 엽니다.",
        "가운데에 묽은 계란물이 남으면 30초씩 추가하고, 완성 후 2시간 안에 냉장합니다.",
      ],
      storageTip: "2시간 안에 밀폐 용기에 담아 냉장하고 다음 날까지 먹습니다.",
      reheatTip: "덮개를 살짝 열어 30초씩 데우고 가운데까지 뜨거운지 확인합니다.",
      fallbackMeal: "퍽퍽하면 물 1큰술을 넣고 섞어 밥 위에 올려 먹습니다.",
      noFire: true,
      microwave: true,
    };
  }

  if (recipe.name === "참치마요덮밥") {
    return {
      ...recipe,
      ingredients: "밥, 참치캔, 마요네즈, 간장, 김, 참깨",
      ingredientList: ["밥", "참치캔", "마요네즈", "간장", "김", "참깨"],
      ingredientDetails: [
        ingredient("밥", "1공기", "따뜻한 밥이면 마요네즈가 잘 섞입니다.", "즉석밥 1개도 가능합니다."),
        ingredient("참치캔", "1/2~1캔", "가볍게 먹으면 1/2캔, 든든하게 먹으면 1캔입니다.", "캔의 액체는 절반 정도 덜어냅니다."),
        ingredient("마요네즈", "1.5큰술", "참치를 부드럽게 묶는 양입니다.", "느끼하면 1큰술만 넣습니다."),
        ingredient("간장", "1작은술", "밥 간을 맞추는 최소량입니다.", "부족하면 마지막에 1작은술 추가합니다."),
        ingredient("김", "1장", "잘게 부숴 올리면 짭짤함이 납니다.", "김가루 2큰술도 좋습니다."),
        ingredient("참깨", "1작은술", "고소한 마무리입니다.", "생략 가능합니다."),
      ],
      requiredTools: ["그릇", "숟가락"],
      beginnerSummary: "참치캔 액체를 절반 덜고 마요네즈 1.5큰술에 섞어 밥 위에 올리는 불 없는 덮밥입니다.",
      steps: [
        {
          index: 1,
          title: "밥 준비",
          description: "따뜻한 밥 1공기를 그릇에 담고 간장 1작은술을 둘러 밥만 가볍게 섞습니다.",
          imageUrl: null,
          imageAlt: "참치마요덮밥 밥 준비 단계",
          heat: "불 없음",
          minutes: 1,
          beginnerTip: "간장은 처음부터 많이 넣지 마세요.",
          visualCue: "밥알에 아주 옅은 간장색이 돌면 됩니다.",
          commonMistake: "밥에 간장을 많이 넣으면 참치까지 더해져 짜집니다.",
          rescueTip: "짜면 밥을 조금 더 넣어 간을 낮추세요.",
        },
        {
          index: 2,
          title: "참치 섞기",
          description: "참치캔 액체를 절반 덜고 참치에 마요네즈 1.5큰술을 넣어 섞습니다.",
          imageUrl: null,
          imageAlt: "참치와 마요네즈를 섞는 단계",
          heat: "불 없음",
          minutes: 2,
          beginnerTip: "참치가 너무 촉촉하면 밥이 질척해집니다.",
          visualCue: "참치가 마요네즈에 코팅되어 한 덩어리처럼 모이면 됩니다.",
          commonMistake: "마요네즈를 많이 넣으면 느끼하고 무거워집니다.",
          rescueTip: "느끼하면 김가루를 더 넣거나 마요네즈 없는 참치를 조금 더 섞으세요.",
        },
        {
          index: 3,
          title: "밥 위에 올리기",
          description: "양념한 참치를 밥 위에 올리고 김을 잘게 부숴 뿌립니다.",
          imageUrl: null,
          imageAlt: "밥 위에 참치마요를 올리는 단계",
          heat: "불 없음",
          minutes: 1,
          beginnerTip: "참치를 가운데에 올리면 먹을 때 섞기 쉽습니다.",
          visualCue: "밥 위를 참치가 반 정도 덮으면 양이 적당합니다.",
          commonMistake: "김을 크게 올리면 한입에 몰릴 수 있습니다.",
          rescueTip: "김이 눅눅하면 마지막에 한 번 더 뿌리세요.",
        },
        {
          index: 4,
          title: "마무리",
          description: "참깨를 뿌리고 한입 맛본 뒤 부족하면 간장 1작은술만 더합니다.",
          imageUrl: null,
          imageAlt: "완성된 참치마요덮밥",
          heat: "불 없음",
          minutes: 1,
          beginnerTip: "먹기 직전에 비비면 밥알 식감이 덜 무너집니다.",
          visualCue: "참치, 밥, 김이 고르게 섞이면 완성입니다.",
          commonMistake: "소스를 더 넣기 전에 맛을 보지 않으면 쉽게 짜집니다.",
          rescueTip: "짜면 밥이나 오이를 더해 맛을 낮추세요.",
        },
      ],
      successCheck: "밥이 질척하지 않고 참치마요가 밥 위에 부드럽게 섞이면 성공입니다.",
      noFire: true,
      microwave: false,
    };
  }

  if (recipe.name === "햄야채볶음밥") {
    return {
      ...recipe,
      ingredients: "밥, 햄, 양파, 계란, 간장, 식용유",
      ingredientList: ["밥", "햄", "양파", "계란", "간장", "식용유"],
      ingredientDetails: [
        ingredient("밥", "1공기", "찬밥이면 더 고슬고슬합니다.", "덩어리는 미리 풀어 둡니다."),
        ingredient("햄", "1/3컵", "스팸이나 슬라이스햄 모두 가능합니다.", "작게 썰수록 짠맛이 고르게 퍼집니다."),
        ingredient("양파", "1/4개", "단맛과 수분을 더합니다.", "잘게 다집니다."),
        ingredient("계란", "1개", "볶음밥을 부드럽게 묶습니다.", "팬 한쪽에서 익힙니다."),
        ingredient("간장", "1큰술", "팬 가장자리로 넣으면 향이 납니다.", "싱거우면 마지막에 1작은술 추가합니다."),
        ingredient("식용유", "1큰술", "팬 코팅용입니다.", "햄이 달라붙지 않게 합니다."),
      ],
      requiredTools: ["프라이팬", "뒤집개", "그릇"],
      beginnerSummary: "햄과 양파를 먼저 볶아 향을 낸 뒤 밥과 계란, 간장으로 마무리하는 기본 볶음밥입니다.",
      steps: [
        {
          index: 1,
          title: "재료 작게 썰기",
          description: "햄과 양파를 밥알보다 조금 큰 크기로 작게 썹니다.",
          imageUrl: null,
          imageAlt: "햄야채볶음밥 재료 손질 단계",
          heat: "불 없음",
          minutes: 3,
          beginnerTip: "크기가 작아야 빨리 익고 밥과 잘 섞입니다.",
          visualCue: "햄과 양파가 숟가락에 한 번에 올라가는 크기면 됩니다.",
          commonMistake: "재료가 크면 볶음밥 한입마다 맛이 달라집니다.",
          rescueTip: "이미 크게 썰었다면 팬에 넣기 전 가위로 한 번 더 자르세요.",
        },
        {
          index: 2,
          title: "햄과 양파 볶기",
          description: "팬에 식용유 1큰술을 두르고 햄과 양파를 중불에서 3분 볶습니다.",
          imageUrl: null,
          imageAlt: "햄과 양파 볶는 단계",
          heat: "중불",
          minutes: 3,
          beginnerTip: "양파가 투명해질 때까지 먼저 볶아야 밥이 질척하지 않습니다.",
          visualCue: "양파가 투명하고 햄 가장자리가 살짝 갈색이면 됩니다.",
          commonMistake: "센 불에서 바로 볶으면 양파가 익기 전에 햄만 탑니다.",
          rescueTip: "타기 시작하면 물 1큰술을 넣고 불을 낮추세요.",
        },
        {
          index: 3,
          title: "밥 넣기",
          description: "밥 1공기를 넣고 뒤집개로 눌러 풀며 2분 볶습니다.",
          imageUrl: null,
          imageAlt: "밥을 넣고 볶는 단계",
          heat: "중불",
          minutes: 2,
          beginnerTip: "찬밥 덩어리는 팬에서 누르듯 풀면 됩니다.",
          visualCue: "밥알에 햄 기름과 양파 향이 고르게 묻으면 됩니다.",
          commonMistake: "밥덩어리를 그대로 두면 간장이 한쪽에만 묻습니다.",
          rescueTip: "밥이 너무 딱딱하면 물 1큰술을 넣고 30초 더 볶으세요.",
        },
        {
          index: 4,
          title: "계란과 간장",
          description: "팬 한쪽에 계란 1개를 깨서 익힌 뒤 밥과 섞고, 간장 1큰술을 가장자리로 둘러 마무리합니다.",
          imageUrl: null,
          imageAlt: "계란과 간장으로 마무리하는 단계",
          heat: "중불",
          minutes: 2,
          beginnerTip: "간장은 팬 가장자리에서 살짝 끓이면 향이 좋아집니다.",
          visualCue: "계란이 익고 밥알이 따로 움직이면 완성입니다.",
          commonMistake: "계란을 바로 전체에 섞으면 밥이 질척할 수 있습니다.",
          rescueTip: "질척하면 불을 약하게 두고 1분 더 볶아 수분을 날리세요.",
        },
      ],
      successCheck: "밥알이 뭉치지 않고 햄과 계란이 골고루 보이면 성공입니다.",
    };
  }

  if (recipe.name === "두부조림") {
    return {
      ...recipe,
      method: "조리기",
      ingredients: "두부, 간장, 물, 설탕, 대파, 식용유",
      ingredientList: ["두부", "간장", "물", "설탕", "대파", "식용유"],
      ingredientDetails: [
        ingredient("두부", "300g", "부침용 두부가 가장 쉽습니다.", "1.5cm로 썰어 키친타월 위에 5분 둡니다."),
        ingredient("간장", "2큰술", "조림 양념의 기준입니다.", "처음부터 더 넣지 않습니다."),
        ingredient("물", "100ml", "양념이 타지 않고 5~7분 조려질 수 있는 양입니다.", "계량컵으로 100ml를 준비합니다."),
        ingredient("설탕", "1작은술", "짠맛을 부드럽게 합니다.", "생략 가능하지만 넣으면 초보자가 먹기 쉽습니다."),
        ingredient("대파", "2큰술", "향을 더합니다.", "없으면 생략 가능합니다."),
        ingredient("식용유", "1큰술", "두부 겉면을 잡아줍니다.", "팬에 얇게 펴 바릅니다."),
      ],
      requiredTools: ["프라이팬", "뒤집개", "그릇"],
      totalMinutes: 18,
      activeMinutes: 18,
      beginnerScore: 92,
      beginnerSummary: "두부 300g을 1.5cm로 잘라 5분 물기를 빼고 24cm 팬에서 앞뒤 2~3분씩 부친 뒤 물 100ml로 5~7분 조립니다.",
      beforeStart: [
        "24cm 프라이팬과 넓은 뒤집개를 준비하고 부침용 두부 300g을 1.5cm 두께로 자릅니다.",
        "두부를 키친타월 위에 5분 두어 물기를 빼고 간장 2큰술, 물 100ml, 설탕 1작은술을 섞습니다.",
        "기름이 튈 수 있으니 젖은 손과 조리도구의 물기를 닦고 팬 손잡이를 안쪽으로 둡니다.",
      ],
      steps: [
        {
          index: 1,
          title: "두부 자르고 물기 빼기",
          description: "두부 300g을 1.5cm 두께로 자르고 키친타월 위에 5분 두어 앞뒤 물기를 뺍니다.",
          imageUrl: null,
          imageAlt: "두부조림 두부 준비 단계",
          heat: "불 없음",
          minutes: 5,
          beginnerTip: "물기가 많으면 기름이 튀고 두부가 잘 부서집니다.",
          visualCue: "두부 표면에 흐르는 물방울이 없고 키친타월 물 자국이 옅어지면 됩니다.",
          commonMistake: "두부를 너무 얇게 자르면 뒤집을 때 찢어집니다.",
          rescueTip: "물기가 남으면 키친타월을 새것으로 바꾸고 위에서도 30초 가볍게 눌러 주세요.",
        },
        {
          index: 2,
          title: "두부 부치기",
          description: "24cm 프라이팬에 식용유 1큰술을 두르고 두부를 중불에서 앞면 2~3분, 뒷면 2~3분 부칩니다.",
          imageUrl: null,
          imageAlt: "두부를 팬에 부치는 단계",
          heat: "중불",
          minutes: 6,
          beginnerTip: "뒤집기 전까지 자주 만지지 않아야 모양이 잡힙니다.",
          visualCue: "두부 가장자리가 연한 갈색이면 뒤집을 때입니다.",
          commonMistake: "급하게 뒤집으면 두부가 찢어집니다.",
          rescueTip: "붙었으면 불을 약하게 낮추고 30초 기다린 뒤 뒤집개를 깊게 넣으세요.",
        },
        {
          index: 3,
          title: "양념 넣기",
          description: "간장 2큰술, 물 100ml, 설탕 1작은술을 섞어 팬에 붓고 중약불로 낮춥니다.",
          imageUrl: null,
          imageAlt: "두부조림 양념 넣는 단계",
          heat: "중약불",
          minutes: 1,
          beginnerTip: "물이 있어야 간장이 바로 타지 않습니다.",
          visualCue: "양념이 두부 높이의 절반보다 낮고 가장자리에서 작은 거품이 나면 됩니다.",
          commonMistake: "간장만 붓고 오래 끓이면 짜고 탑니다.",
          rescueTip: "짜면 물 2큰술을 더 넣고 1분만 더 끓이세요.",
        },
        {
          index: 4,
          title: "5~7분 조리기",
          description: "대파를 넣고 중약불에서 5~7분 동안 양념을 3~4번 끼얹으며 조립니다.",
          imageUrl: null,
          imageAlt: "완성된 두부조림",
          heat: "약불",
          minutes: 6,
          beginnerTip: "두부를 뒤적이기보다 양념을 끼얹으면 덜 부서집니다.",
          visualCue: "팬 바닥에 양념이 2~3큰술 남으면 완성입니다.",
          commonMistake: "두부를 계속 뒤집으면 부서지고 양념을 모두 말리면 짜집니다.",
          rescueTip: "두부가 부서지면 더 건드리지 말고, 너무 졸면 물 2큰술을 넣고 불을 끄세요.",
        },
      ],
      successCheck: "두부 겉면이 연한 갈색이고 가운데까지 따뜻하며, 양념이 묻고 팬 바닥에 2~3큰술 남으면 성공입니다.",
      safetyNotes: [
        "두부 물기를 5분 빼 기름 튐을 줄이고 젖은 손으로 뜨거운 팬을 만지지 않습니다.",
        "팬 손잡이를 안쪽으로 두고 두부를 뒤집을 때 몸 반대 방향으로 움직입니다.",
        "조리 후 2시간 안에 냉장하고 재가열할 때 두부 가운데까지 뜨겁게 데웁니다.",
      ],
      storageTip: "한 김 식힌 뒤 밀폐 용기에 담아 냉장하고 다음 날까지 먹습니다.",
      reheatTip: "물 1큰술을 넣고 뚜껑을 덮어 중약불에서 3분 데운 뒤 두부 가운데가 뜨거운지 확인합니다.",
      fallbackMeal: "부서지면 더 뒤집지 말고 밥 위에 올리고, 짜면 물 2큰술과 두부를 더해 간을 낮춥니다.",
      noFire: false,
      microwave: false,
    };
  }

  if (recipe.name === "어묵볶음") {
    return {
      ...recipe,
      ingredients: "어묵, 양파, 간장, 물, 설탕, 식용유, 대파",
      ingredientList: ["어묵", "양파", "간장", "물", "설탕", "식용유", "대파"],
      ingredientDetails: [
        ingredient("어묵", "3장", "얇은 사각 어묵이 가장 쉽습니다.", "한입 크기로 자릅니다."),
        ingredient("양파", "1/4개", "단맛을 더합니다.", "얇게 채 썹니다.", false),
        ingredient("간장", "1큰술", "기본 간입니다.", "처음에는 1큰술만 넣습니다."),
        ingredient("물", "2큰술", "양념이 타지 않게 합니다.", "팬에 바로 넣습니다."),
        ingredient("설탕", "1작은술", "짠맛을 부드럽게 합니다.", "올리고당 1작은술도 가능합니다.", false),
        ingredient("식용유", "1큰술", "팬 코팅용입니다.", "어묵이 달라붙지 않게 합니다."),
        ingredient("대파", "1큰술", "마지막 향내기용입니다.", "생략 가능합니다.", false),
      ],
      requiredTools: ["프라이팬", "뒤집개", "그릇"],
      beginnerSummary: "어묵과 양파를 먼저 볶고 간장 1큰술, 물 2큰술로 짧게 코팅하면 타지 않고 촉촉합니다.",
      steps: [
        {
          index: 1,
          title: "어묵 자르기",
          description: "어묵은 손가락 두 마디 크기로 자르고 양파는 얇게 썹니다.",
          imageUrl: "/images/recipes/beginner-recipe-guides/prep/beginner-051.png",
          imageAlt: "어묵볶음 재료 손질 단계",
          heat: "불 없음",
          minutes: 3,
          beginnerTip: "어묵을 너무 작게 자르면 볶는 동안 마를 수 있습니다.",
          visualCue: "어묵 조각이 숟가락에 2~3개 올라가는 크기면 됩니다.",
          commonMistake: "크기가 들쭉날쭉하면 어떤 조각은 타고 어떤 조각은 싱겁습니다.",
          rescueTip: "큰 조각은 팬에 넣기 전 가위로 한 번 더 자르세요.",
        },
        {
          index: 2,
          title: "먼저 볶기",
          description: "팬에 식용유 1큰술을 두르고 어묵과 양파를 중불에서 3분 볶습니다.",
          imageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-051.png",
          imageAlt: "어묵과 양파를 볶는 단계",
          heat: "중불",
          minutes: 3,
          beginnerTip: "양파가 투명해지면 단맛이 나고 어묵 냄새도 줄어듭니다.",
          visualCue: "양파가 투명하고 어묵 가장자리가 살짝 말리면 됩니다.",
          commonMistake: "처음부터 양념을 넣으면 간장이 먼저 탑니다.",
          rescueTip: "팬이 마르면 물 1큰술을 넣어 붙은 부분을 떼세요.",
        },
        {
          index: 3,
          title: "양념 넣기",
          description: "간장 1큰술, 물 2큰술, 설탕 1작은술을 넣고 약불로 낮춥니다.",
          imageUrl: "/images/recipes/beginner-recipe-guides/steps/beginner-051.png",
          imageAlt: "어묵볶음 양념 단계",
          heat: "약불",
          minutes: 2,
          beginnerTip: "물을 같이 넣으면 간장이 타지 않고 어묵에 천천히 묻습니다.",
          visualCue: "양념이 팬 바닥에서 거품을 내며 어묵에 묻으면 됩니다.",
          commonMistake: "강불에서 양념을 넣으면 순식간에 짜고 마릅니다.",
          rescueTip: "짜면 물 2큰술과 양파를 조금 더 넣어 1분 볶으세요.",
        },
        {
          index: 4,
          title: "마무리",
          description: "대파를 넣고 30초만 더 섞어 접시에 옮깁니다.",
          imageUrl: "/images/recipes/beginner-recipe-guides/beginner-051.png",
          imageAlt: "완성된 어묵볶음",
          heat: "약불",
          minutes: 1,
          beginnerTip: "양념이 완전히 마르기 전에 꺼내야 촉촉합니다.",
          visualCue: "어묵 표면에 윤기가 남고 팬 바닥이 타지 않았으면 완성입니다.",
          commonMistake: "오래 볶으면 어묵이 질겨집니다.",
          rescueTip: "마르면 물 1큰술을 넣고 20초만 다시 볶으세요.",
        },
      ],
      successCheck: "어묵이 촉촉하고 간장 양념이 얇게 코팅되어 있으면 성공입니다.",
    };
  }

  if (recipe.name === "비빔국수" && recipe.id !== "beginner-recipe-080") {
    return {
      ...recipe,
      ingredients: "소면, 고추장, 간장, 참기름, 설탕, 김치, 오이",
      ingredientList: ["소면", "고추장", "간장", "참기름", "설탕", "김치", "오이"],
      ingredientDetails: [
        ingredient("소면", "1인분", "엄지와 검지로 잡았을 때 500원 동전 정도 굵기입니다.", "중면도 가능합니다."),
        ingredient("고추장", "1큰술", "비빔 양념의 기준입니다.", "처음부터 많이 넣지 않습니다."),
        ingredient("간장", "1작은술", "간을 보태는 양입니다.", "부족하면 마지막에 조금만 추가합니다."),
        ingredient("참기름", "1작은술", "면이 덜 달라붙고 고소해집니다.", "들기름도 가능합니다."),
        ingredient("설탕", "1작은술", "매운맛을 부드럽게 합니다.", "올리고당도 가능합니다."),
        ingredient("김치", "1/3컵", "잘게 썰어 넣으면 초보자도 맛을 내기 쉽습니다.", "없으면 생략 가능합니다."),
        ingredient("오이", "1/4개", "아삭함을 더합니다.", "없으면 김가루를 넣어도 됩니다."),
      ],
      beginnerSummary: "소면을 삶아 찬물에 헹군 뒤 고추장 1큰술부터 넣어 비비는 기본 비빔국수입니다.",
      requiredTools: ["냄비", "체", "그릇", "젓가락"],
      noFire: false,
      microwave: false,
    };
  }

  if (["감자조림", "간장마늘 닭조림", "시금치나물"].includes(recipe.name)) {
    return {
      ...recipe,
      noFire: false,
      microwave: false,
    };
  }

  return recipe;
}

const BEGINNER_CURATED_RECIPES = BEGINNER_RECIPE_LIBRARY.map((recipe) => {
  const legacy = LEGACY_RECIPE_BY_TITLE.get(LEGACY_RECIPE_TITLE_ALIASES.get(recipe.title) ?? recipe.title);
  return legacy ? mergeBeginnerContractIntoLegacyRecipe(recipe, legacy) : beginnerRecipeToCurated(recipe);
}).map((recipe) => enforceBeginnerGuideAssets(overrideCuratedRecipeContent(recipe)));
const BEGINNER_CURATED_RECIPE_BY_BEGINNER_ID = new Map(
  BEGINNER_RECIPE_LIBRARY.map((recipe, index) => [recipe.id, BEGINNER_CURATED_RECIPES[index]]),
);
const BEGINNER_RECIPE_TITLES = new Set(BEGINNER_CURATED_RECIPES.map((recipe) => recipe.name));
const LEGACY_NON_DUPLICATE_RECIPES = LEGACY_CURATED_FALLBACK_RECIPES.filter(
  (recipe) => !BEGINNER_RECIPE_TITLES.has(LEGACY_RECIPE_NAME_ALIASES.get(recipe.name) ?? recipe.name),
).map((recipe) => overrideCuratedRecipeContent(recipe));

function normalizeCuratedRecipeForApp(recipe: CuratedRecipe): CuratedRecipe {
  const source = getAppSafeBeginnerRecipeSource(recipe.source ?? JIPBAB_ORIGINAL_SOURCE);
  const safety = recipe.safety ?? JIPBAB_ORIGINAL_SAFETY;
  return {
    ...recipe,
    ingredientDetails: recipe.ingredientDetails?.map((ingredientItem) => ({
      ...ingredientItem,
      required: ingredientItem.required ?? true,
    })),
    source,
    safety: {
      ...safety,
      imageUsageAllowed: source.imageUsageAllowed,
      adaptedByJipbabNote: source.adaptedByJipbabNote,
    },
  };
}

export const CURATED_JIPBAB_RECIPES: CuratedRecipe[] = [
  ...BEGINNER_CURATED_RECIPES,
  ...LEGACY_NON_DUPLICATE_RECIPES,
].map(normalizeCuratedRecipeForApp);

export const CURATED_RECIPE_RECORDS: RecipeRecord[] = CURATED_JIPBAB_RECIPES.map((recipe) => ({
  id: recipe.id,
  slug: recipe.slug,
  title: recipe.title ?? recipe.name,
  name: recipe.name,
  category: recipe.category,
  method: recipe.method,
  calories: recipe.calories,
  thumbnailUrl: recipe.thumbnailUrl,
  ingredients: recipe.ingredients,
  hashTag: recipe.hashTag,
  difficultyLevel: recipe.difficultyLevel,
  beginnerScore: recipe.beginnerScore,
  totalMinutes: recipe.totalMinutes,
  activeMinutes: recipe.activeMinutes,
  requiredTools: recipe.requiredTools,
  homeCardCopy: recipe.homeCardCopy,
  noFire: recipe.noFire,
  microwave: recipe.microwave,
  fallbackMeal: recipe.fallbackMeal,
  source: recipe.source,
  safety: recipe.safety,
  releaseTier: recipe.releaseTier,
  publishStatus: recipe.publishStatus,
}));

export function findCuratedRecipe(recipeId: string): CuratedRecipe | null {
  return (
    CURATED_JIPBAB_RECIPES.find((recipe) => recipe.id === recipeId) ??
    BEGINNER_CURATED_RECIPE_BY_BEGINNER_ID.get(recipeId) ??
    LEGACY_CURATED_FALLBACK_RECIPES.find((recipe) => recipe.id === recipeId) ??
    null
  );
}
