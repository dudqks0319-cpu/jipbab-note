// 이 파일은 초보자가 냉장고 재료로 바로 따라 할 수 있는 집밥 레시피 라이브러리와 검증 규칙을 제공합니다.
import { normalizeKoreanIngredient } from "./matching.ts";
import type {
  RecipeHeatLevel,
  RecipePublishStatus,
  RecipeReleaseTier,
  RecipeSafetyLevel,
  RecipeSourceType,
} from "../types/index";

export type BeginnerRecipeIngredient = {
  name: string;
  amount: string;
  required: boolean;
  substitute: string | null;
  beginnerNote: string;
};

export type BeginnerRecipeStep = {
  order: number;
  title: string;
  action: string;
  heat: RecipeHeatLevel;
  minutes: number;
  visualCue: string;
  commonMistake: string;
  rescueTip: string;
};

export type BeginnerRecipeSource = {
  sourceType: RecipeSourceType;
  sourceName: string;
  sourceUrl: string | null;
  licenseOrUsageNote: string;
  rightsNote: string;
  imageUsageAllowed: boolean;
  adaptedByJipbabNote: boolean;
};

export type BeginnerRecipeSafety = {
  safetyLevel: RecipeSafetyLevel;
  copyrightRisk: "low" | "medium" | "high";
  privacyRisk: "low" | "medium" | "high";
  commercialUseRisk: "low" | "medium" | "high";
  notes: string;
};

export type BeginnerRecipeHomeCardCopy = {
  title: string;
  subtitle: string;
  badge: string;
  cta: string;
};

export type BeginnerRecipe = {
  id: string;
  slug: string;
  title: string;
  category: string;
  oneLineDescription: string;
  difficultyLevel: 1 | 2 | 3 | 4 | 5;
  beginnerScore: number;
  beginnerLabel: string;
  servings: number;
  totalMinutes: number;
  activeMinutes: number;
  requiredTools: string[];
  ingredients: BeginnerRecipeIngredient[];
  beforeStart: string[];
  steps: BeginnerRecipeStep[];
  successCheck: string[];
  storageTip: string;
  reheatTip: string;
  fallbackMeal: string;
  homeCardCopy: BeginnerRecipeHomeCardCopy;
  source: BeginnerRecipeSource;
  safety: BeginnerRecipeSafety;
  releaseTier: RecipeReleaseTier;
  publishStatus: RecipePublishStatus;
};

export const BEGINNER_RECIPE_SAFETY_POLICY = {
  A: [
    "공공누리 제1유형 등 이용 조건이 비교적 명확한 자료만 사용합니다.",
    "출처 표시는 하되 기관이 추천하거나 후원한 것처럼 보이지 않게 작성합니다.",
  ],
  B: [
    "일반 가정식 조리 원리 기반으로 집밥노트가 자체 작성한 레시피입니다.",
    "앱 본문 기본 노출이 가능합니다.",
  ],
  C: [
    "플랫폼, 영상, SNS, 블로그, 트렌드는 참고용으로만 분류합니다.",
    "원문, 사진, 썸네일, 자막, 고유 표현은 사용하지 않습니다.",
    "완전 재작성과 검수 후에만 B로 승격합니다.",
  ],
  D: [
    "오븐, 튀김, 생선 손질, 브랜드 의존, 권리 불명확, 초보자 부적합 메뉴는 앱 콘텐츠로 쓰지 않습니다.",
  ],
} as const;

export const ONBOARDING_RECIPE_10_NAMES = [
  "냉두부",
  "계란간장밥",
  "전자레인지 계란찜",
  "참치마요덮밥",
  "김치볶음밥",
  "두부부침",
  "연두부 간장비빔",
  "전자레인지 감자버터",
  "콩나물국",
  "어묵볶음",
] as const;

export const RELEASE_RECIPE_30_NAMES = [
  "계란간장밥",
  "전자레인지 계란찜",
  "프라이팬 계란말이",
  "달걀국",
  "스크램블에그 덮밥",
  "달걀죽",
  "버터간장계란밥",
  "양파계란덮밥",
  "김치볶음밥",
  "참치김치볶음밥",
  "참치마요덮밥",
  "햄야채볶음밥",
  "김치덮밥",
  "김치계란밥",
  "주먹밥",
  "스팸마요덮밥",
  "두부부침",
  "두부조림",
  "연두부 간장비빔",
  "순두부계란탕",
  "콩나물국",
  "콩나물무침",
  "감자볶음",
  "감자국",
  "참치김치찌개",
  "어묵볶음",
  "어묵탕",
  "된장두부국",
  "간장비빔국수",
  "전자레인지 감자버터",
] as const;

export const CORE_RECIPE_50_NAMES = [
  ...RELEASE_RECIPE_30_NAMES,
  "전자레인지 햄계란밥",
  "전자레인지 두부찜",
  "오이무침",
  "오이참치무침",
  "양배추볶음",
  "양배추참치덮밥",
  "햄계란전",
  "참치두부조림",
  "햄감자볶음",
  "어묵우동",
  "참치주먹밥",
  "미역국",
  "북엇국",
  "비빔국수",
  "라면계란죽",
  "소시지야채볶음",
  "감자채볶음",
  "순두부간장비빔",
  "들기름두부구이",
  "전자레인지 콘치즈",
] as const;

export const BEGINNER_RECIPE_TITLES = [
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
  "게맛살계란볶음",
  "두부계란부침",
  "스팸계란볶음밥",
  "누룽지 두부 계란죽",
  "고구마죽",
  "참치김치국",
  "숙주볶음",
  "숙주계란볶음",
  "김가루계란밥",
  "들기름계란국수",
  "두부참치비빔밥",
  "양배추계란덮밥",
  "감자참치조림",
  "햄두부구이",
  "김치콩나물밥",
  "전자레인지 달걀밥",
  "전자레인지 두부계란찜",
  "오이간장비빔국수",
  "만두계란국",
  "어묵김치국",
] as const;

const REWRITTEN_REFERENCE_TITLES = new Set([
  "토마토달걀볶음",
  "양배추달걀전",
  "참치계란말이",
  "치즈계란밥",
  "김치주먹밥",
  "나물비빔밥",
  "브로콜리버터볶음",
  "참치양배추덮밥",
  "토마토파스타",
  "참치파스타",
  "참치라면",
  "냉국수",
  "비빔우동",
  "전자레인지 콘치즈",
  "양배추참치덮밥",
  "전자레인지 참치치즈밥",
]);

const RECIPE_NAME_SETS = {
  onboarding: new Set<string>(ONBOARDING_RECIPE_10_NAMES),
  release30: new Set<string>(RELEASE_RECIPE_30_NAMES),
  core50: new Set<string>(CORE_RECIPE_50_NAMES),
};

const PANTRY_NAMES = new Set(["물", "소금", "후추", "식용유", "참기름", "간장", "국간장", "설탕"]);

function hasAny(title: string, keywords: string[]): boolean {
  return keywords.some((keyword) => title.includes(keyword));
}

function inferCategory(title: string): string {
  if (title.includes("전자레인지")) return "전자레인지/노불";
  if (hasAny(title, ["국", "탕", "찌개", "죽"])) return "국/찌개";
  if (hasAny(title, ["국수", "우동", "라면", "파스타"])) return "면요리";
  if (hasAny(title, ["참치", "스팸", "햄", "어묵", "소시지"])) return "참치캔/스팸/햄/어묵";
  if (hasAny(title, ["김치", "밥", "덮밥", "주먹밥", "비빔밥"])) return "김치/밥 요리";
  if (hasAny(title, ["두부", "감자", "콩나물", "양배추", "오이", "깻잎", "숙주"])) return "두부/저렴 재료";
  if (hasAny(title, ["계란", "달걀"])) return "계란요리";
  return "도시락/반찬";
}

function inferMethod(title: string): string {
  if (hasAny(title, ["국", "탕", "찌개", "죽", "우동", "라면", "파스타", "잔치국수"])) return "끓이기";
  if (hasAny(title, ["볶음", "볶음밥", "볶음우동", "덮밥"])) return "볶기";
  if (hasAny(title, ["부침", "전", "계란말이"])) return "부치기";
  if (hasAny(title, ["무침", "비빔", "주먹밥", "샐러드", "냉두부"])) return "비비기";
  if (title.includes("전자레인지")) return "전자레인지";
  return "비비기";
}

function isMicrowaveRecipe(title: string): boolean {
  return title.includes("전자레인지");
}

function isNoFireRecipe(title: string): boolean {
  return hasAny(title, [
    "냉두부",
    "연두부 간장비빔",
    "순두부간장비빔",
    "주먹밥",
    "오이무침",
    "깻잎무침",
    "참치샐러드",
    "참치오이무침",
    "오이참치무침",
    "나물비빔밥",
    "감자달걀샐러드",
  ]);
}

function inferRequiredTools(title: string): string[] {
  if (isMicrowaveRecipe(title)) return ["전자레인지", "전자레인지용 그릇", "숟가락"];
  if (isNoFireRecipe(title)) return ["그릇", "숟가락"];
  if (hasAny(title, ["국", "탕", "찌개", "죽", "우동", "라면", "파스타", "잔치국수"])) return ["냄비", "국자", "그릇"];
  if (hasAny(title, ["볶음", "볶음밥", "부침", "전", "계란말이", "덮밥"])) return ["프라이팬", "뒤집개", "그릇"];
  return ["그릇", "숟가락"];
}

function inferMinutes(title: string): number {
  if (isNoFireRecipe(title)) return 6;
  if (isMicrowaveRecipe(title)) return 8;
  if (hasAny(title, ["찌개", "국", "탕", "죽", "만두국"])) return 15;
  if (hasAny(title, ["볶음밥", "볶음", "부침", "전", "계란말이"])) return 12;
  if (hasAny(title, ["국수", "우동", "라면", "파스타"])) return 15;
  return 10;
}

function inferServings(title: string): number {
  return hasAny(title, ["국", "탕", "찌개", "볶음", "무침", "부침", "전"]) ? 2 : 1;
}

function makeIngredientNote(name: string): string {
  if (PANTRY_NAMES.has(name)) {
    return "처음에는 적은 양으로 넣고 마지막에 맛을 보며 조절하세요.";
  }
  return `${name}은 한입 크기나 숟가락에 올라가는 크기로 준비하면 먹기 쉽습니다.`;
}

function buildIngredients(title: string): BeginnerRecipeIngredient[] {
  const ingredients: BeginnerRecipeIngredient[] = [];
  const seen = new Set<string>();

  const add = (
    name: string,
    amount: string,
    required = true,
    substitute: string | null = null,
    beginnerNote = makeIngredientNote(name),
  ) => {
    const key = normalizeKoreanIngredient(name);
    if (seen.has(key)) return;
    seen.add(key);
    ingredients.push({ name, amount, required, substitute, beginnerNote });
  };

  if (hasAny(title, ["계란", "달걀"])) add("계란", title.includes("국") ? "1개" : "2개", true, "달걀");
  if (hasAny(title, ["밥", "덮밥", "볶음밥", "주먹밥", "비빔밥", "달걀죽", "계란죽"])) add("밥", "1공기", true, "즉석밥 1개");
  if (title.includes("김치")) add("김치", "1컵", true, "잘 익은 배추김치");
  if (title.includes("참치")) add("참치캔", "1/2캔", true, null, "기름은 절반만 빼면 덜 질척합니다.");
  if (title.includes("스팸")) add("스팸", "1/3캔", true, "햄");
  if (title.includes("햄")) add("햄", "1/3컵", true, "스팸");
  if (title.includes("소시지")) add("소시지", "2개", true, "햄");
  if (title.includes("어묵")) add("어묵", "3장", true, null);
  if (title.includes("콩나물")) add("콩나물", "1/2봉", true, "숙주");
  if (title.includes("숙주")) add("숙주", "1/2봉", true, "콩나물");
  if (title.includes("감자")) add("감자", "1개", true, "고구마");
  if (title.includes("고구마")) add("고구마", "1개", true, "감자");
  if (title.includes("양파")) add("양파", "1/4개", true, null);
  if (title.includes("양배추")) add("양배추", "2줌", true, "배추");
  if (title.includes("오이")) add("오이", "1/2개", true, null);
  if (title.includes("깻잎")) add("깻잎", "6장", true, "김");
  if (title.includes("브로콜리")) add("브로콜리", "1컵", true, "양배추");
  if (title.includes("미역")) add("불린 미역", "1컵", true, null);
  if (title.includes("북어")) add("북어채", "1줌", true, null);
  if (title.includes("된장")) add("된장", "1큰술", true, null);
  if (title.includes("두부")) add(title.includes("순두부") ? "순두부" : title.includes("연두부") ? "연두부" : "두부", title.includes("국") || title.includes("탕") ? "1/2모" : "1모", true, title.includes("순두부") || title.includes("연두부") ? null : "부침용 두부");
  if (title.includes("버섯")) add("버섯", "1줌", true, "양파");
  if (title.includes("애호박")) add("애호박", "1/3개", true, "양파");
  if (title.includes("배추")) add("배추", "2장", true, "양배추");
  if (title.includes("부추")) add("부추", "1줌", true, "대파");
  if (title.includes("만두")) add("냉동만두", "4개", true, null);
  if (title.includes("떡국떡")) add("떡국떡", "1컵", true, null);
  if (title.includes("국수")) add("소면", "1인분", true, "중면");
  if (title.includes("우동")) add("우동면", "1봉", true, null);
  if (title.includes("라면")) add("라면", "1봉", true, null);
  if (title.includes("파스타")) add("파스타면", "1인분", true, "스파게티면");
  if (title.includes("토마토")) add("토마토", "1개", true, "방울토마토 8개");
  if (title.includes("옥수수") || title.includes("콘치즈")) add("통조림 옥수수", "1/2컵", true, null);
  if (title.includes("치즈")) add("치즈", "1장", true, "모차렐라 치즈 2큰술");
  if (title.includes("게맛살")) add("게맛살", "2줄", true, "햄");
  if (title.includes("누룽지")) add("누룽지", "1컵", true, "밥 1공기");
  if (title.includes("김가루") || title.includes("김")) add("김", "1장", true, "김가루 2큰술");

  const method = inferMethod(title);
  if (method === "끓이기") {
    add("물", "2컵", true, null, "종이컵 2컵 정도로 시작하고 넘치면 불을 줄이세요.");
    if (!title.includes("된장")) add("국간장", "1큰술", true, "간장");
    add("대파", "2큰술", false, "파");
  } else if (method === "볶기" || method === "부치기") {
    add("식용유", "1큰술", true, null);
    if (!title.includes("마요")) add("간장", "1작은술", false, "소금 한 꼬집");
  } else {
    add("간장", "1큰술", true, "소금 한 꼬집");
    add("참기름", "1작은술", false, null);
  }

  if (ingredients.length < 3 && !title.includes("전자레인지")) add("대파", "1큰술", false, "파");

  return ingredients.slice(0, 8).map((ingredient, index) => ({
    ...ingredient,
    required: index < 7 ? ingredient.required : false,
  }));
}

function buildSteps(title: string): BeginnerRecipeStep[] {
  const method = inferMethod(title);
  const mainName = title.replace(/^전자레인지\s*/, "");

  if (isMicrowaveRecipe(title)) {
    return [
      {
        order: 1,
        title: "그릇 준비",
        action: `${mainName} 재료를 전자레인지용 그릇에 담고 큰 덩어리는 숟가락으로 풀어 주세요.`,
        heat: "불 없음",
        minutes: 2,
        visualCue: "그릇 안 재료가 한쪽에 몰리지 않고 바닥에 고르게 퍼져 있으면 됩니다.",
        commonMistake: "금속 그릇이나 은박지를 넣으면 위험합니다.",
        rescueTip: "전용 그릇이 없으면 전자레인지 사용 가능 표시가 있는 그릇으로 바꾸세요.",
      },
      {
        order: 2,
        title: "덮개 덮기",
        action: "랩이나 뚜껑은 완전히 밀봉하지 말고 한쪽을 조금 열어 김이 빠지게 합니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "덮개 한쪽에 손가락 한 마디 정도 틈이 보이면 안전합니다.",
        commonMistake: "완전히 막으면 수증기가 모여 넘칠 수 있습니다.",
        rescueTip: "이미 넘쳤다면 닦고 같은 그릇에 물 1큰술을 더해 짧게 다시 데우세요.",
      },
      {
        order: 3,
        title: "짧게 돌리기",
        action: "전자레인지에 1분씩 돌리고 꺼내어 가운데를 한 번 섞습니다.",
        heat: "불 없음",
        minutes: 4,
        visualCue: "가운데가 차갑지 않고 가장자리부터 익은 색이 보이면 거의 됐습니다.",
        commonMistake: "처음부터 오래 돌리면 가장자리가 딱딱해집니다.",
        rescueTip: "마른 느낌이면 물이나 우유 1큰술을 넣고 30초만 더 돌리세요.",
      },
      {
        order: 4,
        title: "마무리 확인",
        action: "그릇이 뜨거우니 장갑이나 마른 행주로 꺼내고 1분 식힌 뒤 먹습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "숟가락으로 가운데를 떠도 차가운 부분이 없으면 완성입니다.",
        commonMistake: "뜨거운 그릇을 맨손으로 잡으면 데일 수 있습니다.",
        rescueTip: "속이 차가우면 30초씩 추가로 돌리고 매번 가운데를 확인하세요.",
      },
    ];
  }

  if (isNoFireRecipe(title)) {
    return [
      {
        order: 1,
        title: "재료 꺼내기",
        action: `${mainName}에 쓸 재료를 꺼내 물기나 기름기를 먼저 빼 주세요.`,
        heat: "불 없음",
        minutes: 2,
        visualCue: "그릇 바닥에 물이나 기름이 많이 고이지 않으면 됩니다.",
        commonMistake: "물기가 많으면 양념이 묽어지고 싱겁게 느껴집니다.",
        rescueTip: "물기가 많으면 키친타월이나 체로 한 번 더 빼 주세요.",
      },
      {
        order: 2,
        title: "양념 넣기",
        action: "간장이나 참기름은 한 번에 많이 넣지 말고 표시된 양의 절반부터 넣습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "재료 표면에 양념이 얇게 묻고 바닥에 조금만 고이면 충분합니다.",
        commonMistake: "처음부터 많이 넣으면 짜서 되돌리기 어렵습니다.",
        rescueTip: "짠맛이 강하면 밥, 두부, 오이를 더해 맛을 연하게 만드세요.",
      },
      {
        order: 3,
        title: "살살 섞기",
        action: "숟가락 두 개나 젓가락으로 아래에서 위로 들어 올리듯 섞습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "재료가 부서지지 않고 양념 색이 고르게 보이면 됩니다.",
        commonMistake: "세게 누르며 섞으면 두부나 밥이 뭉개집니다.",
        rescueTip: "모양이 무너지면 그릇에 담아 덮밥이나 비빔밥처럼 먹으면 됩니다.",
      },
      {
        order: 4,
        title: "맛 확인",
        action: "한 숟가락 맛보고 싱거우면 간장 1작은술만 더 넣습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "한입 먹었을 때 짠맛보다 재료 맛이 먼저 느껴지면 좋습니다.",
        commonMistake: "맛을 보지 않고 양념을 추가하면 쉽게 짜집니다.",
        rescueTip: "짠맛이 나면 참기름이 아니라 밥이나 채소를 더 넣어야 합니다.",
      },
    ];
  }

  if (method === "끓이기") {
    return [
      {
        order: 1,
        title: "냄비 시작",
        action: "냄비에 물과 기본 양념을 넣고 중불로 올립니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "냄비 가장자리에 작은 기포가 올라오면 다음 재료를 넣을 때입니다.",
        commonMistake: "처음부터 강불로 끓이면 넘치거나 바닥이 눌 수 있습니다.",
        rescueTip: "넘치려 하면 바로 약불로 낮추고 국자로 거품을 걷어내세요.",
      },
      {
        order: 2,
        title: "주재료 넣기",
        action: `${mainName}의 주재료를 숟가락에 올라가는 크기로 넣습니다.`,
        heat: "중불",
        minutes: 5,
        visualCue: "재료 가장자리가 부드럽게 휘거나 색이 진해지면 익고 있습니다.",
        commonMistake: "재료를 너무 크게 넣으면 겉만 뜨겁고 속은 차가울 수 있습니다.",
        rescueTip: "크게 넣었다면 국자나 가위로 냄비 안에서 작게 나눠 주세요.",
      },
      {
        order: 3,
        title: "간 보기",
        action: "국물을 한 숟가락 떠서 맛보고 싱거우면 국간장 1작은술만 추가합니다.",
        heat: "중약불",
        minutes: 3,
        visualCue: "국물이 재료 색을 조금 머금고 향이 올라오면 간을 볼 수 있습니다.",
        commonMistake: "끓기 전에 간을 맞추면 나중에 더 짜질 수 있습니다.",
        rescueTip: "짠맛이 강하면 물 1/2컵을 넣고 2분 더 끓이세요.",
      },
      {
        order: 4,
        title: "완성 확인",
        action: "가장 두꺼운 재료를 젓가락으로 찔러 부드럽게 들어가면 불을 끕니다.",
        heat: "약불",
        minutes: 2,
        visualCue: "재료 속까지 따뜻하고 국물이 다시 한 번 보글거리면 완성입니다.",
        commonMistake: "마지막에 오래 끓이면 두부나 계란이 부서질 수 있습니다.",
        rescueTip: "재료가 부서졌다면 밥 위에 얹어 국밥처럼 먹으면 됩니다.",
      },
    ];
  }

  return [
    {
      order: 1,
      title: "재료 자르기",
      action: `${mainName}에 들어갈 재료를 새끼손톱 크기나 얇은 막대 모양으로 준비합니다.`,
      heat: "불 없음",
      minutes: 3,
      visualCue: "재료 크기가 비슷하면 팬에서 같은 속도로 익습니다.",
      commonMistake: "크기가 들쭉날쭉하면 어떤 것은 타고 어떤 것은 덜 익습니다.",
      rescueTip: "큰 조각은 팬에 넣기 전 가위로 한 번 더 잘라 주세요.",
    },
    {
      order: 2,
      title: "팬 데우기",
      action: "팬에 식용유를 두르고 중불에서 30초만 데웁니다.",
      heat: "중불",
      minutes: 1,
      visualCue: "기름이 팬 바닥에 얇게 퍼지고 천천히 움직이면 시작해도 됩니다.",
      commonMistake: "팬을 오래 비워 두면 재료를 넣자마자 탈 수 있습니다.",
      rescueTip: "연기가 나면 불을 끄고 1분 식힌 뒤 다시 시작하세요.",
    },
    {
      order: 3,
      title: "익히기",
      action: "재료를 넣고 1분마다 뒤집거나 섞으며 중불에서 익힙니다.",
      heat: "중불",
      minutes: 6,
      visualCue: "가장자리 색이 진해지고 젓가락으로 눌렀을 때 단단함이 줄면 됩니다.",
      commonMistake: "계속 휘저으면 물이 나오거나 모양이 쉽게 부서집니다.",
      rescueTip: "바닥이 붙으면 물 2큰술을 넣고 주걱으로 살살 떼세요.",
    },
    {
      order: 4,
      title: "마무리",
      action: "불을 약하게 줄이고 양념을 넣은 뒤 30초만 섞어 접시에 옮깁니다.",
      heat: "약불",
      minutes: 2,
      visualCue: "양념이 재료 겉면에 얇게 묻고 팬 바닥에 타는 자국이 없으면 완성입니다.",
      commonMistake: "양념을 넣은 뒤 오래 볶으면 짜고 마른 맛이 납니다.",
      rescueTip: "짜면 밥, 계란, 두부 중 하나를 더해 덮밥처럼 바꾸세요.",
    },
  ];
}

function buildBeforeStart(title: string): string[] {
  return [
    `${title} 재료를 모두 꺼내고 필수 재료가 빠졌는지 먼저 확인합니다.`,
    "간장, 소금, 기름은 손에 닿는 곳에 두고 처음에는 적은 양으로 시작합니다.",
    isMicrowaveRecipe(title)
      ? "전자레인지용 그릇인지 확인하고 금속 도구는 넣지 않습니다."
      : "팬이나 냄비를 쓰는 메뉴는 물 1/2컵을 옆에 두면 탈 때 바로 살릴 수 있습니다.",
  ];
}

function inferBeginnerScore(title: string, releaseTier: RecipeReleaseTier): number {
  if (RECIPE_NAME_SETS.onboarding.has(title)) return 92;
  let score = releaseTier === "release_30" ? 88 : releaseTier === "core_50" ? 85 : 82;
  if (isNoFireRecipe(title)) score += 5;
  if (isMicrowaveRecipe(title)) score += 4;
  if (inferRequiredTools(title).length <= 2) score += 2;
  if (inferMinutes(title) <= 10) score += 2;
  if (hasAny(title, ["파스타", "계란말이", "찌개"])) score -= 2;
  return Math.max(80, Math.min(96, score));
}

function getReleaseTier(title: string, index: number): RecipeReleaseTier {
  if (RECIPE_NAME_SETS.onboarding.has(title)) return "onboarding";
  if (RECIPE_NAME_SETS.release30.has(title)) return "release_30";
  if (RECIPE_NAME_SETS.core50.has(title)) return "core_50";
  if (index <= 100) return "library_100";
  return "candidate";
}

function getPublishStatus(index: number): RecipePublishStatus {
  return index <= 100 ? "published" : "qa_ready";
}

function makeSource(title: string): BeginnerRecipeSource {
  const rewrittenReference = REWRITTEN_REFERENCE_TITLES.has(title);
  return {
    sourceType: "original-general-principle",
    sourceName: "집밥노트 자체 작성",
    sourceUrl: null,
    licenseOrUsageNote: "외부 레시피 원문, 사진, 썸네일, 자막을 사용하지 않고 일반 가정식 조리 원리로 작성",
    rightsNote: rewrittenReference
      ? "원문/이미지 미사용, 집밥노트 자체 재작성"
      : "집밥노트가 자체 문장으로 작성한 초보자용 조리 안내",
    imageUsageAllowed: true,
    adaptedByJipbabNote: true,
  };
}

function makeSafety(title: string): BeginnerRecipeSafety {
  return {
    safetyLevel: "B",
    copyrightRisk: "low",
    privacyRisk: "low",
    commercialUseRisk: "low",
    notes: REWRITTEN_REFERENCE_TITLES.has(title)
      ? "참고 가능성이 있는 메뉴명을 일반 조리 원리와 집밥노트 자체 문장으로 재작성한 B등급 콘텐츠"
      : "일반 가정식 원리 기반의 집밥노트 자체 작성 콘텐츠",
  };
}

function makeRecipe(title: string, index: number): BeginnerRecipe {
  const releaseTier = getReleaseTier(title, index);
  const totalMinutes = inferMinutes(title);
  const difficultyLevel = totalMinutes <= 10 || isNoFireRecipe(title) || isMicrowaveRecipe(title) ? 1 : 2;
  const beginnerScore = inferBeginnerScore(title, releaseTier);
  const ingredients = buildIngredients(title);
  const missingRescueBase = hasAny(title, ["밥", "덮밥", "볶음밥", "주먹밥", "국수", "라면"])
    ? "짜거나 모양이 무너지면 밥이나 면을 조금 더 넣어 한 그릇 메뉴로 살립니다."
    : "짜거나 부서지면 밥 위에 올려 덮밥처럼 먹으면 실패감이 줄어듭니다.";

  return {
    id: `beginner-recipe-${String(index).padStart(3, "0")}`,
    slug: `beginner-${String(index).padStart(3, "0")}`,
    title,
    category: inferCategory(title),
    oneLineDescription: `${title}은 ${totalMinutes}분 안에 만들 수 있는 초보자용 집밥 메뉴입니다.`,
    difficultyLevel,
    beginnerScore,
    beginnerLabel: beginnerScore >= 90 ? "처음 요리 추천" : beginnerScore >= 85 ? "초보 안심" : "천천히 가능",
    servings: inferServings(title),
    totalMinutes,
    activeMinutes: Math.max(5, totalMinutes - 2),
    requiredTools: inferRequiredTools(title),
    ingredients,
    beforeStart: buildBeforeStart(title),
    steps: buildSteps(title),
    successCheck: [
      "가장 두꺼운 재료가 차갑지 않고 젓가락이나 숟가락으로 쉽게 나뉩니다.",
      "한입 맛봤을 때 짠맛이 강하면 밥이나 물로 바로 조절할 수 있습니다.",
    ],
    storageTip: "남으면 한 김 식힌 뒤 밀폐 용기에 담아 냉장 보관하고 가능하면 다음 날 먹습니다.",
    reheatTip: "다시 데울 때는 물 1큰술을 더하고 가운데까지 따뜻해졌는지 확인합니다.",
    fallbackMeal: missingRescueBase,
    homeCardCopy: {
      title,
      subtitle: ingredients.slice(0, 3).map((ingredient) => ingredient.name).join(" + "),
      badge: beginnerScore >= 90 ? "첫 요리 추천" : totalMinutes <= 10 ? "10분 안심" : "초보 가능",
      cta: "지금 만들기",
    },
    source: makeSource(title),
    safety: makeSafety(title),
    releaseTier,
    publishStatus: getPublishStatus(index),
  };
}

export const BEGINNER_RECIPE_LIBRARY: BeginnerRecipe[] = BEGINNER_RECIPE_TITLES.map((title, index) =>
  makeRecipe(title, index + 1),
);

export type BeginnerRecipeMatch = {
  recipe: BeginnerRecipe;
  matchRate: number;
  matchedIngredients: string[];
  missingIngredients: string[];
  score: number;
};

function getRequiredIngredients(recipe: BeginnerRecipe): BeginnerRecipeIngredient[] {
  return recipe.ingredients.filter((ingredient) => ingredient.required);
}

function toAvailableNames(ingredients: Array<string | { name: string }>): string[] {
  return ingredients
    .map((ingredient) => (typeof ingredient === "string" ? ingredient : ingredient.name))
    .map((name) => normalizeKoreanIngredient(name))
    .filter(Boolean);
}

function ingredientMatches(ingredient: BeginnerRecipeIngredient, available: Set<string>): boolean {
  const candidates = [
    ingredient.name,
    ...(ingredient.substitute?.split(/[·,/|]/g).map((item) => item.trim()).filter(Boolean) ?? []),
  ].map((name) => normalizeKoreanIngredient(name));

  return candidates.some((candidate) => available.has(candidate));
}

export function getMissingIngredients(
  recipe: BeginnerRecipe,
  ingredients: Array<string | { name: string }>,
): BeginnerRecipeIngredient[] {
  const available = new Set(toAvailableNames(ingredients));
  return getRequiredIngredients(recipe).filter((ingredient) => !ingredientMatches(ingredient, available));
}

export function matchRecipesByIngredients(
  recipes: BeginnerRecipe[],
  ingredients: Array<string | { name: string }>,
): BeginnerRecipeMatch[] {
  const available = new Set(toAvailableNames(ingredients));
  return recipes.map((recipe) => {
    const required = getRequiredIngredients(recipe);
    const matchedIngredients = required
      .filter((ingredient) => ingredientMatches(ingredient, available))
      .map((ingredient) => ingredient.name);
    const missingIngredients = required
      .filter((ingredient) => !ingredientMatches(ingredient, available))
      .map((ingredient) => ingredient.name);
    const matchRate = required.length === 0 ? 0 : Math.round((matchedIngredients.length / required.length) * 100);
    return {
      recipe,
      matchRate,
      matchedIngredients,
      missingIngredients,
      score: calculateBeginnerHomeRankScore(recipe, matchedIngredients.length, missingIngredients.length),
    };
  });
}

function calculateBeginnerHomeRankScore(recipe: BeginnerRecipe, matchedCount: number, missingCount: number): number {
  return (
    recipe.beginnerScore +
    matchedCount * 8 -
    missingCount * 12 +
    (recipe.requiredTools.length <= 2 ? 4 : 0) +
    (recipe.totalMinutes <= 10 ? 4 : 0) +
    (recipe.requiredTools.includes("전자레인지") ? 4 : 0) +
    (recipe.requiredTools.length === 2 && recipe.requiredTools.includes("그릇") ? 3 : 0) +
    (recipe.fallbackMeal ? 2 : 0)
  );
}

export function sortRecipesForBeginnerHome(
  recipes: BeginnerRecipe[],
  ingredients: Array<string | { name: string }>,
): BeginnerRecipeMatch[] {
  return matchRecipesByIngredients(recipes.filter(canShowOnHome), ingredients).sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (left.missingIngredients.length !== right.missingIngredients.length) {
      return left.missingIngredients.length - right.missingIngredients.length;
    }
    return right.recipe.beginnerScore - left.recipe.beginnerScore;
  });
}

export function calculateBeginnerScore(recipe: BeginnerRecipe): number {
  return calculateBeginnerHomeRankScore(
    recipe,
    getRequiredIngredients(recipe).length,
    0,
  );
}

export function validateScore(recipe: BeginnerRecipe): boolean {
  return Number.isFinite(recipe.beginnerScore) && recipe.beginnerScore >= 80 && calculateBeginnerScore(recipe) >= 80;
}

export function canPublishRecipe(recipe: BeginnerRecipe): boolean {
  const requiredIngredientCount = getRequiredIngredients(recipe).length;
  const sourceAllowsImage =
    recipe.source.imageUsageAllowed === false ||
    (recipe.source.imageUsageAllowed === true &&
      recipe.source.licenseOrUsageNote.trim().length > 0 &&
      recipe.source.rightsNote.trim().length > 0);

  return (
    recipe.publishStatus === "published" &&
    (recipe.safety.safetyLevel === "A" || recipe.safety.safetyLevel === "B") &&
    recipe.beginnerScore >= 80 &&
    recipe.difficultyLevel <= 2 &&
    recipe.totalMinutes <= 20 &&
    recipe.requiredTools.length <= 3 &&
    requiredIngredientCount <= 7 &&
    recipe.steps.every(
      (step) =>
        step.action.trim().length > 0 &&
        step.heat.trim().length > 0 &&
        Number.isFinite(step.minutes) &&
        step.minutes >= 0 &&
        step.visualCue.trim().length > 0 &&
        step.commonMistake.trim().length > 0 &&
        step.rescueTip.trim().length > 0,
    ) &&
    recipe.source.adaptedByJipbabNote === true &&
    sourceAllowsImage
  );
}

export function canShowOnHome(recipe: BeginnerRecipe): boolean {
  return canPublishRecipe(recipe);
}

export function getBeginnerRecipes(): BeginnerRecipe[] {
  return BEGINNER_RECIPE_LIBRARY.filter(canPublishRecipe);
}

function getByTitles(titles: readonly string[]): BeginnerRecipe[] {
  const byTitle = new Map(BEGINNER_RECIPE_LIBRARY.map((recipe) => [recipe.title, recipe]));
  return titles
    .map((title) => byTitle.get(title))
    .filter((recipe): recipe is BeginnerRecipe => Boolean(recipe));
}

export function getOnboardingRecipes(): BeginnerRecipe[] {
  return getByTitles(ONBOARDING_RECIPE_10_NAMES).filter(canPublishRecipe);
}

export function getReleaseRecipes(): BeginnerRecipe[] {
  return getByTitles(RELEASE_RECIPE_30_NAMES).filter(canPublishRecipe);
}

export function getCoreRecipes(): BeginnerRecipe[] {
  return getByTitles(CORE_RECIPE_50_NAMES).filter(canPublishRecipe);
}

export function getRecipesByCategory(category: string): BeginnerRecipe[] {
  return getBeginnerRecipes().filter((recipe) => recipe.category === category);
}

export function getNoFireRecipes(): BeginnerRecipe[] {
  return getBeginnerRecipes().filter((recipe) => isNoFireRecipe(recipe.title));
}

export function getMicrowaveRecipes(): BeginnerRecipe[] {
  return getBeginnerRecipes().filter((recipe) => isMicrowaveRecipe(recipe.title));
}
