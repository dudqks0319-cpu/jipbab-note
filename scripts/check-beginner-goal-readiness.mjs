// 집밥노트 초보자 레시피 확장 목표의 로컬 완료 조건을 한 번에 검사합니다.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  BEGINNER_RECIPE_LIBRARY,
  CORE_RECIPE_50_NAMES,
  ONBOARDING_RECIPE_10_NAMES,
  RELEASE_RECIPE_30_NAMES,
  canPublishRecipe,
  canShowOnHome,
  getCoreRecipes,
  getMicrowaveRecipes,
  getMissingIngredients,
  getNoFireRecipes,
  getOnboardingRecipes,
  getReleaseRecipes,
  matchRecipesByIngredients,
  resolveBeginnerRecipeTitle,
  sortRecipesForBeginnerHome,
} from "../lib/beginner-recipes.ts";
import { filterBeginnerHomeRecipes } from "../lib/beginner-recipe-contract.ts";
import { CURATED_RECIPE_RECORDS } from "../lib/curated-recipes.ts";

const cwd = process.cwd();

const REQUIRED_RECIPE_100_NAMES = [
  "계란간장밥",
  "전자레인지 계란찜",
  "프라이팬 계란말이",
  "달걀국",
  "스크램블에그 덮밥",
  "토마토달걀볶음",
  "양배추달걀전",
  "참치계란말이",
  "달걀죽",
  "치즈계란밥",
  "버터간장계란밥",
  "양파계란덮밥",
  "김치볶음밥",
  "참치김치볶음밥",
  "참치마요덮밥",
  "햄야채볶음밥",
  "김치덮밥",
  "김치계란밥",
  "주먹밥",
  "김치주먹밥",
  "스팸마요덮밥",
  "콩나물밥",
  "간장버터밥",
  "참치주먹밥",
  "깻잎주먹밥",
  "나물비빔밥",
  "두부부침",
  "두부조림",
  "연두부 간장비빔",
  "순두부계란탕",
  "콩나물국",
  "콩나물무침",
  "감자볶음",
  "감자국",
  "감자채전",
  "양파두부볶음",
  "감자채볶음",
  "두부미역국",
  "들기름두부구이",
  "순두부간장비빔",
  "브로콜리버터볶음",
  "냉두부",
  "오이무침",
  "감자달걀샐러드",
  "깻잎무침",
  "깻잎두부무침",
  "참치김치찌개",
  "참치두부조림",
  "스팸김치볶음",
  "햄감자볶음",
  "어묵볶음",
  "어묵탕",
  "어묵우동",
  "소시지야채볶음",
  "참치샐러드",
  "통조림옥수수햄볶음",
  "어묵달걀국",
  "어묵간장볶음",
  "참치양배추덮밥",
  "햄계란전",
  "깻잎어묵볶음",
  "참치오이무침",
  "된장두부국",
  "미역국",
  "북엇국",
  "김치국",
  "된장찌개",
  "김치찌개",
  "두부버섯국",
  "떡국떡달걀국",
  "감자된장국",
  "콩나물김치국",
  "순두부국",
  "애호박된장국",
  "양파국",
  "배추된장국",
  "만두국",
  "부추달걀국",
  "간장비빔국수",
  "비빔국수",
  "잔치국수",
  "김치라면",
  "라면계란죽",
  "볶음우동",
  "어묵우동볶음",
  "토마토파스타",
  "참치파스타",
  "우동",
  "참치라면",
  "냉국수",
  "비빔우동",
  "간장라면",
  "전자레인지 감자버터",
  "전자레인지 햄계란밥",
  "전자레인지 두부찜",
  "전자레인지 콘치즈",
  "오이참치무침",
  "양배추볶음",
  "양배추참치덮밥",
  "전자레인지 참치치즈밥",
];

const DANGEROUS_PHRASES = [
  "백종원",
  "백종원 스타일",
  "공식 레시피",
  "만개의레시피 원문",
  "우리의식탁 원문",
];

const checks = [];

function addCheck(label, passed, detail) {
  checks.push({ label, passed, detail });
}

function fileText(relativePath) {
  return readFileSync(path.join(cwd, relativePath), "utf8");
}

function sourceCheckText(check) {
  const paths = Array.isArray(check.path) ? check.path : [check.path];
  return paths.map((relativePath) => fileText(relativePath)).join("\n");
}

function sourceCheckLabel(check) {
  return Array.isArray(check.path) ? check.path.join(", ") : check.path;
}

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

function missingTerms(source, terms) {
  return terms.filter((term) => !source.includes(term));
}

function missingFiles(paths) {
  return paths.filter((relativePath) => !existsSync(path.join(cwd, relativePath)));
}

function isHttpSourceUrl(value) {
  return typeof value === "string" && /^https?:\/\/\S+$/u.test(value);
}

function hasSourceRightsSafeguards(source) {
  return (
    source?.adaptedByJipbabNote === true &&
    typeof source.rightsNote === "string" &&
    source.rightsNote.includes("집밥노트") &&
    typeof source.licenseOrUsageNote === "string" &&
    source.licenseOrUsageNote.includes("원문") &&
    (source.licenseOrUsageNote.includes("사진") || source.licenseOrUsageNote.includes("이미지"))
  );
}

function sourcePolicyAllows(source) {
  if (!hasSourceRightsSafeguards(source)) return false;
  return source.sourceUrl === null || isHttpSourceUrl(source.sourceUrl);
}

const byTitle = new Map(BEGINNER_RECIPE_LIBRARY.map((recipe) => [recipe.title, recipe]));
const recipeForRequiredName = (name) => byTitle.get(resolveBeginnerRecipeTitle(name));
const publishedRecipes = BEGINNER_RECIPE_LIBRARY.filter((recipe) => recipe.publishStatus === "published");
const homeRecipes = filterBeginnerHomeRecipes(CURATED_RECIPE_RECORDS);

addCheck(
  "100개 이상 초보자 레시피 후보",
  BEGINNER_RECIPE_LIBRARY.length >= 100,
  `${BEGINNER_RECIPE_LIBRARY.length} candidates`,
);
const missingRequired100 = REQUIRED_RECIPE_100_NAMES.filter((name) => !recipeForRequiredName(name));
addCheck(
  "사용자 지정 기본 100개 후보 전체 포함",
  missingRequired100.length === 0,
  missingRequired100.length === 0 ? "all present" : `missing: ${missingRequired100.join(", ")}`,
);
addCheck(
  "published 레시피는 publish rule 통과",
  publishedRecipes.length >= 100 && publishedRecipes.every(canPublishRecipe),
  `${publishedRecipes.length} published recipes`,
);
addCheck(
  "홈 노출 후보는 beginner/safety/source 계약 통과",
  homeRecipes.length >= 30 && homeRecipes.every((recipe) => recipe.safety?.safetyLevel === "A" || recipe.safety?.safetyLevel === "B"),
  `${homeRecipes.length} safe home recipes`,
);

const onboardingRecipes = getOnboardingRecipes();
addCheck(
  "온보딩 10개 완성",
  onboardingRecipes.length === 10 &&
    ONBOARDING_RECIPE_10_NAMES.length === 10 &&
    onboardingRecipes.every((recipe) =>
      recipe.beginnerScore >= 89 &&
      recipe.publishStatus === "published" &&
      (recipe.safety.safetyLevel === "A" || recipe.safety.safetyLevel === "B") &&
      recipe.totalMinutes <= 15 &&
      canShowOnHome(recipe)
    ),
  `${onboardingRecipes.length}/10 onboarding recipes`,
);

const releaseRecipes = getReleaseRecipes();
addCheck(
  "출시 30개 홈/냉장고 추천 가능",
  releaseRecipes.length === 30 &&
    RELEASE_RECIPE_30_NAMES.length === 30 &&
    releaseRecipes.every((recipe) =>
      recipe.beginnerScore >= 80 &&
      recipe.difficultyLevel <= 2 &&
      canShowOnHome(recipe)
    ),
  `${releaseRecipes.length}/30 release recipes`,
);

const coreRecipes = getCoreRecipes();
addCheck(
  "핵심 50개 카테고리/검색 후보",
  coreRecipes.length === 50 && CORE_RECIPE_50_NAMES.length === 50,
  `${coreRecipes.length}/50 core recipes`,
);

const cOrDVisible = BEGINNER_RECIPE_LIBRARY.filter(
  (recipe) => (recipe.safety.safetyLevel === "C" || recipe.safety.safetyLevel === "D") && canShowOnHome(recipe),
);
addCheck("C/D 등급 기본 비노출", cOrDVisible.length === 0, `${cOrDVisible.length} visible C/D recipes`);

const allRecipeText = collectText(BEGINNER_RECIPE_LIBRARY).join("\n");
const dangerousMatches = DANGEROUS_PHRASES.filter((phrase) => allRecipeText.includes(phrase));
addCheck(
  "외부 원문/브랜드 오인 위험 표현 없음",
  dangerousMatches.length === 0,
  dangerousMatches.length === 0 ? "clean" : dangerousMatches.join(", "),
);

addCheck(
  "출처/권리 메타데이터는 자체 작성 또는 외부 참고 정책 통과",
  BEGINNER_RECIPE_LIBRARY.every((recipe) => sourcePolicyAllows(recipe.source)),
  "sourceUrl null or http(s), adaptedByJipbabNote true, rights/license safeguards",
);

const noFireRecipes = getNoFireRecipes();
const microwaveRecipes = getMicrowaveRecipes();
const eggRiceRecipe = recipeForRequiredName("계란간장밥");
const sortedEmptyFridge = sortRecipesForBeginnerHome(onboardingRecipes, []);
const eggRiceMissing = eggRiceRecipe ? getMissingIngredients(eggRiceRecipe, ["계란", "밥", "간장"]) : [];
const ingredientMatches = matchRecipesByIngredients(releaseRecipes, ["계란", "밥", "간장", "김치"]);
addCheck(
  "추천 헬퍼가 온보딩/노불/전자레인지/재료매칭을 반환",
  sortedEmptyFridge.length === 10 &&
    noFireRecipes.length > 0 &&
    microwaveRecipes.length > 0 &&
    ingredientMatches.length === 30 &&
    eggRiceMissing.length >= 0,
  `empty=${sortedEmptyFridge.length}, noFire=${noFireRecipes.length}, microwave=${microwaveRecipes.length}`,
);

const requiredDocs = [
  "docs/beginner-recipes.md",
  "docs/recipe-content-rights.md",
  "docs/release-qa-beginner-recipes.md",
];
const missingRequiredDocs = missingFiles(requiredDocs);
addCheck(
  "초보자 레시피 운영 문서 존재",
  missingRequiredDocs.length === 0,
  missingRequiredDocs.length === 0 ? "all docs present" : `missing: ${missingRequiredDocs.join(", ")}`,
);

const packageJson = JSON.parse(fileText("package.json"));
addCheck(
  "검증 스크립트 package script 연결",
  packageJson.scripts?.["validate:recipes"] === "node --experimental-strip-types scripts/validate-recipes.mjs" &&
    packageJson.scripts?.["check:beginner-goal-readiness"] === "node --experimental-strip-types scripts/check-beginner-goal-readiness.mjs",
  "validate:recipes and check:beginner-goal-readiness",
);

const sourceChecks = [
  {
    label: "홈 초보자 추천/상태/섹션 연결",
    path: ["app/page.tsx", "components/home/TodayActionCard.tsx", "components/home/StarterActionCard.tsx", "lib/home-actions.ts"],
    terms: [
      "TodayActionCard",
      "StarterActionCard",
      "useRecipeCatalog(12, {",
      "ingredientIds: recipeIngredientIds",
      "enabled: demoModeReady && !isAppStoreDemo",
      "resolveIngredientCatalogIds",
      "rankRecipeRecommendations",
      "beginnerHomeRecipeCatalog",
      "getEssentialMissingIngredients",
      "findExpiringMatchedIngredients",
      "buildHomeHref",
      "getTodayActionPrimaryCta",
      "냉장고 열고 고민 끝",
      "있는 재료로 오늘 메뉴 정해요",
      "있는 재료만 골라주세요",
      "있는 재료를 골라주세요",
      "직접 추가하기",
      "지금 바로 가능",
      "1개만 사면 가능",
      "냉장고에 있는 재료",
      "메뉴 더 찾기",
      "다른 메뉴도 보고 싶다면",
      "지금 만들기",
      "재료 확인하고 만들기",
      "부족 재료 보기",
      "재시도",
    ],
  },
  {
    label: "레시피 목록/검색/필터/정렬 연결",
    path: "app/recipe/page.tsx",
    terms: [
      "matchesRecipeListFilters",
      "sortRecipeListRecipes",
      "difficultyFilter",
      "timeFilter",
      "toolFilter",
      "fridgeFilter",
      "sortMode",
      "목록 필터",
    ],
  },
  {
    label: "레시피 목록 필터/정렬 로직",
    path: "lib/recipe-list-filters.ts",
    terms: [
      "RecipeDifficultyListFilter",
      "RecipeTimeListFilter",
      "RecipeToolListFilter",
      "RecipeFridgeListFilter",
      "RecipeListSortMode",
      "matchesRecipeListFilters",
      "sortRecipeListRecipes",
      "부족 재료 적은 순",
      "초보 점수 높은 순",
    ],
  },
  {
    label: "레시피 상세 한 단계씩 보기/복구/권리 연결",
    path: [
      "app/recipe/[id]/page.tsx",
      "lib/recipe-api-v1-client.ts",
      "components/recipe/RecipeInstructionView.tsx",
    ],
    terms: [
      "RecipeCookMode",
      "RecipeShoppingAssistant",
      "getPublicRecipeDetailV1",
      "recipeApiV1DetailToRecord",
      "isRecipeDetailPublicationApproved",
      "ingredient.required",
      "ingredient.substitute",
      "step.heatLevel",
      "step.durationSeconds.min",
      "step.recoveryTip",
      "recipe.safetyNotes",
      "storageTip",
      "reheatTip",
      "sourceAttribution",
    ],
  },
  {
    label: "부족 재료 개인/가족 장보기 연결",
    path: "components/recipe/RecipeShoppingAssistant.tsx",
    terms: [
      "scope: activeScope",
      "familyGroupId",
      "selectedMissingNames",
      "requiredIngredientNames",
      "required !== false",
      "addItems",
      "이미 장보기에 있는 재료",
      "필수 부족 재료",
      "대체:",
      "가족 장보기",
      "재시도",
    ],
  },
  {
    label: "가족 냉장고 추천 연결",
    path: "app/family/page.tsx",
    terms: [
      "filterBeginnerHomeRecipes",
      "rankRecipeRecommendations",
      "scope: group ? \"family\" : \"personal\"",
      "?scope=family#shopping-assistant",
    ],
  },
  {
    label: "개인/가족 냉장고 scope hook",
    path: ["hooks/useIngredients.ts", "lib/sync/ingredient-sync-service.ts"],
    terms: [
      "familyGroupId?: string | null",
      "enabled?: boolean",
      "applyIngredientScope",
      "family_group_id",
      "hasMissingFamilyScopeColumnError",
    ],
  },
  {
    label: "개인/가족 장보기 scope hook",
    path: ["hooks/useShopping.ts", "lib/sync/shopping-sync-service.ts"],
    terms: [
      "familyGroupId?: string | null",
      "applyShoppingScope",
      "family_group_id",
      "skippedDuplicates",
      "mergeDuplicates",
    ],
  },
  {
    label: "Supabase 가족 scope/RLS migration",
    path: "supabase/migrations/20260527093000_add_family_scoped_fridge_shopping.sql",
    terms: [
      "add column if not exists family_group_id",
      "public.ingredients",
      "public.shopping_items",
      "from public.family_members m",
      "family_group_id is null",
      "family_group_id is not null",
    ],
  },
];

for (const check of sourceChecks) {
  const source = sourceCheckText(check);
  const missing = missingTerms(source, check.terms);
  addCheck(
    check.label,
    missing.length === 0,
    missing.length === 0 ? sourceCheckLabel(check) : `${sourceCheckLabel(check)} missing: ${missing.join(", ")}`,
  );
}

const failures = checks.filter((check) => !check.passed);

console.log("Beginner goal readiness check");
console.log(`Passes: ${checks.length - failures.length}`);
console.log(`Failures: ${failures.length}`);
console.log("");

for (const check of checks) {
  console.log(`${check.passed ? "PASS" : "FAIL"} - ${check.label}: ${check.detail}`);
}

if (failures.length > 0) {
  process.exit(1);
}
