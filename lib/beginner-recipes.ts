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
  "간장계란밥",
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
  "간장계란밥",
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

export const BEGINNER_RECIPE_TITLE_ALIASES = new Map<string, string>([
  ["계란간장밥", "간장계란밥"],
]);

export function resolveBeginnerRecipeTitle(title: string): string {
  return BEGINNER_RECIPE_TITLE_ALIASES.get(title) ?? title;
}

export const BEGINNER_RECIPE_TITLES = [
  "간장계란밥",
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
  "두부계란덮밥",
  "양파참치덮밥",
  "감자계란국",
  "알배추간장무침",
  "팽이버섯전",
  "계란토스트",
  "오이냉국",
  "계란볶음라면",
  "애호박전",
  "무생채",
  "고추참치비빔밥",
  "새송이버섯볶음",
  "김치참치볶음밥",
  "가지무침",
  "진미채무침",
  "팽이버섯덮밥",
  "김치비빔국수",
  "두부김치",
  "오이크래미무침",
  "참치쌈장",
  "감자옥수수샐러드",
  "가지덮밥",
  "두부샐러드",
  "간장계란장",
  "양배추라페",
  "토마토마리네이드",
  "상추겉절이",
  "김치말이국수",
  "오이계란샌드위치",
  "양배추참치샐러드",
  "오이김밥",
  "콩나물비빔라면",
  "토마토카프레제",
  "두부면비빔국수",
  "크래미유부초밥",
  "토마토계란국",
  "오이참치비빔밥",
  "참치마요주먹밥",
  "계란양배추토스트",
  "김치콩나물국",
  "콩나물냉국",
  "계란카레덮밥",
  "김치치즈주먹밥",
  "닭가슴살오이냉채",
  "두부면샐러드",
  "브로콜리계란볶음",
  "참치계란죽",
  "어묵김밥",
  "양배추계란국",
  "닭가슴살양배추덮밥",
  "두부참치전",
  "오이두부무침",
  "스팸무스비",
  "가지토마토볶음",
  "김치어묵볶음",
  "양파달걀볶음",
] as const;

const REWRITTEN_REFERENCE_TITLES = new Set([
  "간장계란밥",
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
  "두부계란덮밥",
  "양파참치덮밥",
  "감자계란국",
  "알배추간장무침",
  "팽이버섯전",
  "계란토스트",
  "오이냉국",
  "계란볶음라면",
  "애호박전",
  "무생채",
  "고추참치비빔밥",
  "새송이버섯볶음",
  "김치참치볶음밥",
  "가지무침",
  "진미채무침",
  "팽이버섯덮밥",
  "김치비빔국수",
  "두부김치",
  "오이크래미무침",
  "참치쌈장",
  "감자옥수수샐러드",
  "가지덮밥",
  "두부샐러드",
  "간장계란장",
  "양배추라페",
  "토마토마리네이드",
  "상추겉절이",
  "김치말이국수",
  "오이계란샌드위치",
  "양배추참치샐러드",
  "오이김밥",
  "콩나물비빔라면",
  "토마토카프레제",
  "두부면비빔국수",
  "크래미유부초밥",
  "토마토계란국",
  "오이참치비빔밥",
  "참치마요주먹밥",
  "계란양배추토스트",
  "김치콩나물국",
  "콩나물냉국",
  "계란카레덮밥",
  "김치치즈주먹밥",
  "닭가슴살오이냉채",
  "두부면샐러드",
  "브로콜리계란볶음",
  "참치계란죽",
  "어묵김밥",
  "양배추계란국",
  "닭가슴살양배추덮밥",
  "두부참치전",
  "오이두부무침",
  "스팸무스비",
  "가지토마토볶음",
  "김치어묵볶음",
  "양파달걀볶음",
]);

const EXTERNAL_REFERENCE_SOURCES = new Map<string, BeginnerRecipeSource>([
  [
    "간장계란밥",
    {
      sourceType: "reference-link",
      sourceName: "만개의레시피 참고 링크: 간장계란밥",
      sourceUrl: "https://www.10000recipe.com/recipe/6893429",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "전자레인지 계란찜",
    {
      sourceType: "reference-link",
      sourceName: "만개의레시피 참고 링크: 전자레인지 계란찜",
      sourceUrl: "https://www.10000recipe.com/recipe/6948438",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "프라이팬 계란말이",
    {
      sourceType: "reference-link",
      sourceName: "만개의레시피 참고 링크: 계란말이 만드는법",
      sourceUrl: "https://www.10000recipe.com/recipe/6916604",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "달걀국",
    {
      sourceType: "reference-link",
      sourceName: "만개의레시피 참고 링크: 달걀국/계란국",
      sourceUrl: "https://www.10000recipe.com/recipe/6919200",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "스크램블에그 덮밥",
    {
      sourceType: "reference-link",
      sourceName: "만개의레시피 참고 링크: 스크램블 에그 덮밥",
      sourceUrl: "https://www.10000recipe.com/recipe/6912532",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "토마토달걀볶음",
    {
      sourceType: "reference-link",
      sourceName: "만개의레시피 참고 링크: 토마토 달걀볶음",
      sourceUrl: "https://www.10000recipe.com/recipe/6895279",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "양배추달걀전",
    {
      sourceType: "reference-link",
      sourceName: "만개의레시피 참고 링크: 양배추 계란전",
      sourceUrl: "https://www.10000recipe.com/recipe/6889709",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "참치계란말이",
    {
      sourceType: "reference-link",
      sourceName: "만개의레시피 참고 링크: 참치 계란말이",
      sourceUrl: "https://www.10000recipe.com/recipe/5202322",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "두부계란덮밥",
    {
      sourceType: "reference-link",
      sourceName: "YouTube 참고 링크: 두부계란덮밥 레시피",
      sourceUrl: "https://www.youtube.com/watch?v=5rHCokNUKf8",
      licenseOrUsageNote: "외부 영상은 참고 링크로만 표시하고 원문, 자막, 이미지, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "양파참치덮밥",
    {
      sourceType: "reference-link",
      sourceName: "YouTube 참고 링크: 참치 양파 요리",
      sourceUrl: "https://www.youtube.com/watch?v=LRNsOAa6XxI",
      licenseOrUsageNote: "외부 영상은 참고 링크로만 표시하고 원문, 자막, 이미지, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "감자계란국",
    {
      sourceType: "reference-link",
      sourceName: "YouTube 참고 링크: 감자계란국",
      sourceUrl: "https://www.youtube.com/watch?v=I0ym7GG1NTw",
      licenseOrUsageNote: "외부 영상은 참고 링크로만 표시하고 원문, 자막, 이미지, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "알배추간장무침",
    {
      sourceType: "reference-link",
      sourceName: "네이버 블로그 참고 링크: 혼족의제왕 알배추 레시피",
      sourceUrl: "https://blog.naver.com/honjokking/222803385444",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "팽이버섯전",
    {
      sourceType: "reference-link",
      sourceName: "네이버 블로그 참고 링크: 팽이버섯전 초간단 레시피",
      sourceUrl: "https://blog.naver.com/kebirain1/224291104945",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "계란토스트",
    {
      sourceType: "reference-link",
      sourceName: "YouTube 참고 링크: 원팬 계란토스트",
      sourceUrl: "https://www.youtube.com/watch?v=Ug0n59Qrccc",
      licenseOrUsageNote: "외부 영상은 참고 링크로만 표시하고 원문, 자막, 이미지, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "오이냉국",
    {
      sourceType: "reference-link",
      sourceName: "YouTube 참고 링크: 오이냉국",
      sourceUrl: "https://www.youtube.com/watch?v=YK2N2OtfbMM",
      licenseOrUsageNote: "외부 영상은 참고 링크로만 표시하고 원문, 자막, 이미지, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "계란볶음라면",
    {
      sourceType: "reference-link",
      sourceName: "네이버 블로그 참고 링크: 계란볶음라면 레시피",
      sourceUrl: "https://blog.naver.com/wookyungmom/223335736678",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "애호박전",
    {
      sourceType: "reference-link",
      sourceName: "YouTube 참고 링크: 손쉽게 애호박전 만들기",
      sourceUrl: "https://www.youtube.com/watch?v=tNtgzZ2j_wc",
      licenseOrUsageNote: "외부 영상은 참고 링크로만 표시하고 원문, 자막, 이미지, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "무생채",
    {
      sourceType: "reference-link",
      sourceName: "YouTube 참고 링크: 초간단 무생채",
      sourceUrl: "https://www.youtube.com/watch?v=Eeo4oriCVIw",
      licenseOrUsageNote: "외부 영상은 참고 링크로만 표시하고 원문, 자막, 이미지, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "고추참치비빔밥",
    {
      sourceType: "reference-link",
      sourceName: "네이버 블로그 참고 링크: 고추참치비빔밥 만들기",
      sourceUrl: "https://blog.naver.com/da-isso/223665592897",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "새송이버섯볶음",
    {
      sourceType: "reference-link",
      sourceName: "네이버 블로그 참고 링크: 새송이버섯볶음 초간단 레시피",
      sourceUrl: "https://blog.naver.com/nacf653/224330858912",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "김치참치볶음밥",
    {
      sourceType: "reference-link",
      sourceName: "YouTube 참고 링크: 참치김치볶음밥 만들기",
      sourceUrl: "https://www.youtube.com/watch?v=xqxHaCzlVzs",
      licenseOrUsageNote: "외부 영상은 참고 링크로만 표시하고 원문, 자막, 이미지, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "참치김치볶음밥",
    {
      sourceType: "reference-link",
      sourceName: "YouTube 참고 링크: 참치김치볶음밥 만들기",
      sourceUrl: "https://www.youtube.com/watch?v=xqxHaCzlVzs",
      licenseOrUsageNote: "외부 영상은 참고 링크로만 표시하고 원문, 자막, 이미지, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "가지무침",
    {
      sourceType: "reference-link",
      sourceName: "YouTube 참고 링크: 가지무침 레시피",
      sourceUrl: "https://www.youtube.com/watch?v=W0YcBqrVJ0o",
      licenseOrUsageNote: "외부 영상은 참고 링크로만 표시하고 원문, 자막, 이미지, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "진미채무침",
    {
      sourceType: "reference-link",
      sourceName: "네이버 블로그 참고 링크: 고추장 진미채무침",
      sourceUrl: "https://blog.naver.com/handa2006/224237199614",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "팽이버섯덮밥",
    {
      sourceType: "reference-link",
      sourceName: "네이버 블로그 참고 링크: 팽이버섯 덮밥 6분컷",
      sourceUrl: "https://blog.naver.com/kyoungmik/223953836600",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "김치비빔국수",
    {
      sourceType: "reference-link",
      sourceName: "YouTube 참고 링크: 김치비빔국수",
      sourceUrl: "https://www.youtube.com/watch?v=uvpvrOJQop0",
      licenseOrUsageNote: "외부 영상은 참고 링크로만 표시하고 원문, 자막, 이미지, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "두부김치",
    {
      sourceType: "reference-link",
      sourceName: "YouTube 참고 링크: 두부김치",
      sourceUrl: "https://www.youtube.com/watch?v=TNvShfSntRU",
      licenseOrUsageNote: "외부 영상은 참고 링크로만 표시하고 원문, 자막, 이미지, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "오이크래미무침",
    {
      sourceType: "reference-link",
      sourceName: "네이버 블로그 참고 링크: 크래미 오이냉채 무침",
      sourceUrl: "https://blog.naver.com/jh2y3/224275735258",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "참치쌈장",
    {
      sourceType: "reference-link",
      sourceName: "네이버 블로그 참고 링크: 참치쌈장 만들기",
      sourceUrl: "https://blog.naver.com/gabuki6611/224330668759",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "감자옥수수샐러드",
    {
      sourceType: "reference-link",
      sourceName: "네이버 블로그 참고 링크: 감자 캔옥수수 샐러드",
      sourceUrl: "https://blog.naver.com/sky304211/224283739136",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "가지덮밥",
    {
      sourceType: "reference-link",
      sourceName: "YouTube 참고 링크: 가지덮밥 초간단 레시피",
      sourceUrl: "https://www.youtube.com/watch?v=ohPEGOtw5cs",
      licenseOrUsageNote: "외부 영상은 참고 링크로만 표시하고 원문, 자막, 이미지, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "두부샐러드",
    {
      sourceType: "reference-link",
      sourceName: "네이버 블로그 참고 링크: 두부 계란 상추 샐러드",
      sourceUrl: "https://blog.naver.com/gabuki6611/224319281465",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "간장계란장",
    {
      sourceType: "reference-link",
      sourceName: "YouTube 참고 링크: 계란장 황금비율",
      sourceUrl: "https://www.youtube.com/watch?v=CDc9arjUXzg",
      licenseOrUsageNote: "외부 영상은 참고 링크로만 표시하고 원문, 자막, 이미지, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "양배추라페",
    {
      sourceType: "reference-link",
      sourceName: "네이버 블로그 참고 링크: 양배추당근라페",
      sourceUrl: "https://blog.naver.com/sundoong2/224309554711",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "토마토마리네이드",
    {
      sourceType: "reference-link",
      sourceName: "네이버 블로그 참고 링크: 방울 토마토 마리네이드",
      sourceUrl: "https://blog.naver.com/lalacucina/224127830076",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "상추겉절이",
    {
      sourceType: "reference-link",
      sourceName: "YouTube 참고 링크: 상추겉절이 황금비율",
      sourceUrl: "https://www.youtube.com/watch?v=VNqu2ovqqxM",
      licenseOrUsageNote: "외부 영상은 참고 링크로만 표시하고 원문, 자막, 이미지, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "김치말이국수",
    {
      sourceType: "reference-link",
      sourceName: "YouTube 참고 링크: 김치말이국수",
      sourceUrl: "https://www.youtube.com/watch?v=1P7PJBYOJRQ",
      licenseOrUsageNote: "외부 영상은 참고 링크로만 표시하고 원문, 자막, 이미지, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "오이계란샌드위치",
    {
      sourceType: "reference-link",
      sourceName: "네이버 블로그 참고 링크: 오이 계란 샌드위치",
      sourceUrl: "https://blog.naver.com/gabuki6611/224312284423",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "양배추참치샐러드",
    {
      sourceType: "reference-link",
      sourceName: "네이버 블로그 참고 링크: 양배추 참치 샐러드",
      sourceUrl: "https://blog.naver.com/wookyungmom/224325597716",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "오이김밥",
    {
      sourceType: "reference-link",
      sourceName: "네이버 블로그 참고 링크: 5분 초간단 오이김밥",
      sourceUrl: "https://blog.naver.com/kh2187782-/224258292994",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "콩나물비빔라면",
    {
      sourceType: "reference-link",
      sourceName: "YouTube 참고 링크: 콩나물 비빔라면",
      sourceUrl: "https://www.youtube.com/watch?v=oUmUkUP_KkI",
      licenseOrUsageNote: "외부 영상은 참고 링크로만 표시하고 원문, 자막, 이미지, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "토마토카프레제",
    {
      sourceType: "reference-link",
      sourceName: "네이버 블로그 참고 링크: 토마토 카프레제",
      sourceUrl: "https://blog.naver.com/wookyungmom/224227464486",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "두부면비빔국수",
    {
      sourceType: "reference-link",
      sourceName: "네이버 블로그 참고 링크: 두부면 비빔국수",
      sourceUrl: "https://blog.naver.com/uetma8/224111451783",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "크래미유부초밥",
    {
      sourceType: "reference-link",
      sourceName: "네이버 블로그 참고 링크: 크래미 유부초밥 만들기",
      sourceUrl: "https://blog.naver.com/naettee/224264247408",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "토마토계란국",
    {
      sourceType: "reference-link",
      sourceName: "네이버 블로그 참고 링크: 토마토 계란탕 만드는 법",
      sourceUrl: "https://blog.naver.com/storm_0370/224010808279",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "오이참치비빔밥",
    {
      sourceType: "reference-link",
      sourceName: "네이버 블로그 참고 링크: 오이 참치 비빔밥",
      sourceUrl: "https://blog.naver.com/magicpass82/224226748387",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "참치마요주먹밥",
    {
      sourceType: "reference-link",
      sourceName: "네이버 블로그 참고 링크: 참치마요 주먹밥",
      sourceUrl: "https://blog.naver.com/sky304211/224312314339",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "계란양배추토스트",
    {
      sourceType: "reference-link",
      sourceName: "네이버 블로그 참고 링크: 계란 양배추 토스트",
      sourceUrl: "https://blog.naver.com/sundoong2/224247504011",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "김치콩나물국",
    {
      sourceType: "reference-link",
      sourceName: "네이버 블로그 참고 링크: 김치 콩나물국",
      sourceUrl: "https://blog.naver.com/dhdmsdo79/224193163444",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "콩나물냉국",
    {
      sourceType: "reference-link",
      sourceName: "네이버 블로그 참고 링크: 콩나물냉국",
      sourceUrl: "https://blog.naver.com/firehouse79/224300976322",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "계란카레덮밥",
    {
      sourceType: "reference-link",
      sourceName: "네이버 블로그 참고 링크: 계란 카레덮밥",
      sourceUrl: "https://blog.naver.com/yeonhong3639/224107115215",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "김치치즈주먹밥",
    {
      sourceType: "reference-link",
      sourceName: "네이버 블로그 참고 링크: 김치치즈 주먹밥",
      sourceUrl: "https://blog.naver.com/toya0824/224293192067",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "닭가슴살오이냉채",
    {
      sourceType: "reference-link",
      sourceName: "네이버 블로그 참고 링크: 오이 닭가슴살 냉채",
      sourceUrl: "https://blog.naver.com/jhj6972/224334260351",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "두부면샐러드",
    {
      sourceType: "reference-link",
      sourceName: "만개의레시피 참고 링크: 두부면샐러드",
      sourceUrl: "https://www.10000recipe.com/recipe/7006474",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "브로콜리계란볶음",
    {
      sourceType: "reference-link",
      sourceName: "만개의레시피 참고 링크: 브로콜리 계란 볶음",
      sourceUrl: "https://www.10000recipe.com/recipe/6917680",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "참치계란죽",
    {
      sourceType: "reference-link",
      sourceName: "만개의레시피 참고 링크: 참치계란죽",
      sourceUrl: "https://www.10000recipe.com/recipe/6969729",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "어묵김밥",
    {
      sourceType: "reference-link",
      sourceName: "만개의레시피 참고 링크: 어묵김밥",
      sourceUrl: "https://www.10000recipe.com/recipe/6879826",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "양배추계란국",
    {
      sourceType: "reference-link",
      sourceName: "만개의레시피 참고 링크: 양배추 계란국",
      sourceUrl: "https://www.10000recipe.com/recipe/6843294",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "닭가슴살양배추덮밥",
    {
      sourceType: "reference-link",
      sourceName: "만개의레시피 참고 링크: 닭가슴살 양배추 덮밥",
      sourceUrl: "https://www.10000recipe.com/recipe/6953644",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "두부참치전",
    {
      sourceType: "reference-link",
      sourceName: "만개의레시피 참고 링크: 두부참치전",
      sourceUrl: "https://www.10000recipe.com/recipe/6932155",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "오이두부무침",
    {
      sourceType: "reference-link",
      sourceName: "만개의레시피 참고 링크: 오이두부무침",
      sourceUrl: "https://www.10000recipe.com/recipe/7075346",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "스팸무스비",
    {
      sourceType: "reference-link",
      sourceName: "만개의레시피 참고 링크: 스팸무스비",
      sourceUrl: "https://www.10000recipe.com/recipe/6882686",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "가지토마토볶음",
    {
      sourceType: "reference-link",
      sourceName: "만개의레시피 참고 링크: 가지토마토볶음",
      sourceUrl: "https://www.10000recipe.com/recipe/6891642",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "김치어묵볶음",
    {
      sourceType: "reference-link",
      sourceName: "만개의레시피 참고 링크: 김치어묵볶음",
      sourceUrl: "https://www.10000recipe.com/recipe/5666375",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
  [
    "양파달걀볶음",
    {
      sourceType: "reference-link",
      sourceName: "만개의레시피 참고 링크: 양파 달걀 볶음",
      sourceUrl: "https://www.10000recipe.com/recipe/6914667",
      licenseOrUsageNote: "외부 글은 참고 링크로만 표시하고 원문, 사진, 썸네일은 사용하지 않음",
      rightsNote: "메뉴 아이디어와 일반 조리 흐름만 참고, 집밥노트 자체 문장과 계량으로 초보자용 재작성",
      imageUsageAllowed: false,
      adaptedByJipbabNote: true,
    },
  ],
]);

const RECIPE_NAME_SETS = {
  onboarding: new Set<string>(ONBOARDING_RECIPE_10_NAMES),
  release30: new Set<string>(RELEASE_RECIPE_30_NAMES),
  core50: new Set<string>(CORE_RECIPE_50_NAMES),
};

const PANTRY_NAMES = new Set(["물", "소금", "후추", "식용유", "참기름", "들기름", "버터", "마요네즈", "간장", "국간장", "설탕"]);

function hasAny(title: string, keywords: string[]): boolean {
  return keywords.some((keyword) => title.includes(keyword));
}

const TITLE_INGREDIENT_LABELS: Array<[string, string]> = [
  ["고추참치", "고추참치캔"],
  ["진미채", "진미채"],
  ["참치", "참치캔"],
  ["스팸", "스팸"],
  ["햄", "햄"],
  ["소시지", "소시지"],
  ["어묵", "어묵"],
  ["콩나물", "콩나물"],
  ["숙주", "숙주"],
  ["감자", "감자"],
  ["고구마", "고구마"],
  ["계란장", "계란"],
  ["무생채", "무"],
  ["무", "무"],
  ["양파", "양파"],
  ["양배추", "양배추"],
  ["오이", "오이"],
  ["가지", "가지"],
  ["깻잎", "깻잎"],
  ["브로콜리", "브로콜리"],
  ["미역", "미역"],
  ["북어", "북어채"],
  ["순두부", "순두부"],
  ["연두부", "연두부"],
  ["두부", "두부"],
  ["팽이버섯", "팽이버섯"],
  ["새송이버섯", "새송이버섯"],
  ["버섯", "버섯"],
  ["애호박", "애호박"],
  ["알배추", "알배추"],
  ["배추", "배추"],
  ["부추", "부추"],
  ["상추", "상추"],
  ["만두", "만두"],
  ["떡국떡", "떡국떡"],
  ["토마토", "토마토"],
  ["옥수수", "옥수수"],
  ["콘치즈", "옥수수"],
  ["크래미", "크래미"],
  ["맛살", "게맛살"],
  ["게맛살", "게맛살"],
  ["누룽지", "누룽지"],
  ["김치", "김치"],
  ["계란", "계란"],
  ["달걀", "계란"],
  ["국수", "소면"],
  ["우동", "우동면"],
  ["라면", "라면"],
  ["파스타", "파스타면"],
  ["토스트", "식빵"],
  ["식빵", "식빵"],
  ["치즈", "치즈"],
  ["김가루", "김"],
];

function sentenceJoin(items: string[]): string {
  const unique = Array.from(new Set(items.filter((item) => item.length > 0)));
  if (unique.length <= 1) return unique[0] ?? "재료";
  return unique.join(", ");
}

function getTitleIngredientNames(title: string): string[] {
  const labels = TITLE_INGREDIENT_LABELS.filter(([keyword]) => title.includes(keyword)).map(([, label]) => label);
  return labels.filter((label) => !(label === "배추" && labels.includes("알배추")));
}

function getMainIngredientPhrase(title: string): string {
  const nonStaples = getTitleIngredientNames(title).filter((name) => !["밥", "소면", "우동면", "라면", "파스타면"].includes(name));
  return sentenceJoin(nonStaples.slice(0, 4));
}

function getNoodleName(title: string): string {
  if (title.includes("우동")) return "우동면";
  if (title.includes("라면")) return "라면";
  if (title.includes("파스타")) return "파스타면";
  return "소면";
}

function getSoupSeasoning(title: string): string {
  if (title.includes("된장")) return "된장 1큰술";
  if (title.includes("라면")) return "라면스프 1/2봉";
  return "국간장 1큰술";
}

function inferCategory(title: string): string {
  if (title === "스팸무스비") return "간식/브런치";
  if (title === "가지토마토볶음") return "도시락/반찬";
  if (title === "김치어묵볶음") return "도시락/반찬";
  if (title === "양파달걀볶음") return "도시락/반찬";

  // 오이두부무침_CATEGORY_BATCH13
  if (title === "양배추계란국") return "국/찌개";
  if (title === "닭가슴살양배추덮밥") return "밥/덮밥";
  if (title === "두부참치전") return "도시락/반찬";
  if (title === "오이두부무침") return "도시락/반찬";

  // 어묵김밥_CATEGORY_BATCH12
  if (title === "두부면샐러드") return "간식/브런치";
  if (title === "브로콜리계란볶음") return "도시락/반찬";
  if (title === "참치계란죽") return "국/찌개";
  if (title === "어묵김밥") return "간식/브런치";

  // 닭가슴살오이냉채_CATEGORY_BATCH11
  if (title === "콩나물냉국") return "국/찌개";
  if (title === "계란카레덮밥") return "밥/덮밥";
  if (title === "김치치즈주먹밥") return "간식/브런치";
  if (title === "닭가슴살오이냉채") return "반찬";

  // 김치콩나물국_CATEGORY_BATCH10
  if (hasAny(title, ["오이참치비빔밥", "참치마요주먹밥"])) return "밥/덮밥";
  if (title === "계란양배추토스트") return "간식/브런치";
  if (title === "김치콩나물국") return "국/찌개";

  // 토마토계란국_CATEGORY_BATCH9
  if (title === "토마토카프레제") return "간식/브런치";
  if (title === "두부면비빔국수") return "면요리";
  if (title === "크래미유부초밥") return "밥/덮밥";
  if (title === "토마토계란국") return "국/찌개";

  if (title === "오이계란샌드위치" || title === "양배추참치샐러드" || title === "오이김밥") return "간식/브런치";
  if (title === "콩나물비빔라면") return "면요리";
  if (title === "양배추라페" || title === "토마토마리네이드") return "간식/브런치";
  if (title === "상추겉절이") return "도시락/반찬";
  if (title === "김치말이국수") return "면요리";
  if (title === "계란토스트") return "간식/브런치";
  if (title === "감자옥수수샐러드" || title === "두부샐러드") return "간식/브런치";
  if (title === "김치비빔국수") return "면요리";
  if (
    title === "무생채" ||
    title === "애호박전" ||
    title === "새송이버섯볶음" ||
    title === "가지무침" ||
    title === "진미채무침" ||
    title === "오이크래미무침" ||
    title === "참치쌈장" ||
    title === "두부김치" ||
    title === "간장계란장"
  )
    return "도시락/반찬";
  if (title.includes("전자레인지")) return "전자레인지/노불";
  if (title === "오이냉국") return "전자레인지/노불";
  if (hasAny(title, ["국", "탕", "찌개", "죽"])) return "국/찌개";
  if (hasAny(title, ["국수", "우동", "라면", "파스타"])) return "면요리";
  if (hasAny(title, ["참치", "스팸", "햄", "어묵", "소시지"])) return "참치캔/스팸/햄/어묵";
  if (hasAny(title, ["김치", "밥", "덮밥", "주먹밥", "비빔밥"])) return "김치/밥 요리";
  if (hasAny(title, ["두부", "감자", "콩나물", "양배추", "오이", "깻잎", "숙주"])) return "두부/저렴 재료";
  if (hasAny(title, ["계란", "달걀"])) return "계란요리";
  return "도시락/반찬";
}

function inferMethod(title: string): string {
  if (title === "스팸무스비") return "굽기";
  if (title === "가지토마토볶음") return "볶기";
  if (title === "김치어묵볶음") return "볶기";
  if (title === "양파달걀볶음") return "볶기";

  // 오이두부무침_METHOD_BATCH13
  if (title === "양배추계란국") return "끓이기";
  if (title === "닭가슴살양배추덮밥") return "볶기";
  if (title === "두부참치전") return "부치기";
  if (title === "오이두부무침") return "비비기";

  // 어묵김밥_METHOD_BATCH12
  if (title === "두부면샐러드") return "비비기";
  if (title === "브로콜리계란볶음") return "볶기";
  if (title === "참치계란죽") return "끓이기";
  if (title === "어묵김밥") return "말기";

  // 닭가슴살오이냉채_METHOD_BATCH11
  if (title === "콩나물냉국") return "끓이기";
  if (title === "계란카레덮밥") return "끓이기";
  if (title === "김치치즈주먹밥") return "굽기";
  if (title === "닭가슴살오이냉채") return "비비기";

  // 김치콩나물국_METHOD_BATCH10
  if (hasAny(title, ["오이참치비빔밥", "참치마요주먹밥"])) return "비비기";
  if (title === "계란양배추토스트") return "굽기";
  if (title === "김치콩나물국") return "끓이기";

  // 토마토계란국_METHOD_BATCH9
  if (hasAny(title, ["토마토카프레제", "두부면비빔국수", "크래미유부초밥"])) return "비비기";
  if (title === "토마토계란국") return "끓이기";

  if (title === "오이계란샌드위치" || title === "양배추참치샐러드" || title === "오이김밥" || title === "콩나물비빔라면") return "비비기";
  if (title === "양배추라페" || title === "토마토마리네이드" || title === "상추겉절이" || title === "김치말이국수") return "비비기";
  if (
    title === "오이냉국" ||
    title === "무생채" ||
    title === "고추참치비빔밥" ||
    title === "진미채무침" ||
    title === "오이크래미무침" ||
    title === "참치쌈장" ||
    title === "김치비빔국수" ||
    title === "두부샐러드"
  )
    return "비비기";
  if (title === "가지무침") return "전자레인지";
  if (title === "감자옥수수샐러드") return "전자레인지";
  if (title === "두부김치") return "볶기";
  if (title === "간장계란장") return "끓이기";
  if (title === "계란볶음라면") return "볶기";
  if (title === "팽이버섯전" || title === "계란토스트" || title === "애호박전") return "부치기";
  if (title === "새송이버섯볶음") return "볶기";
  if (title.includes("전자레인지")) return "전자레인지";
  if (hasAny(title, ["국", "탕", "찌개", "죽", "우동", "라면", "파스타", "잔치국수"])) return "끓이기";
  if (title.includes("조림")) return "조리기";
  if (title.includes("구이")) return "굽기";
  if (hasAny(title, ["볶음", "볶음밥", "볶음우동", "덮밥"])) return "볶기";
  if (hasAny(title, ["부침", "전", "계란말이"])) return "부치기";
  if (hasAny(title, ["무침", "비빔", "주먹밥", "샐러드", "냉두부"])) return "비비기";
  return "비비기";
}

function isMicrowaveRecipe(title: string): boolean {
  return title.includes("전자레인지");
}

function isNoFireRecipe(title: string): boolean {
  // 오이두부무침_NOFIRE_BATCH13
  if (title === "오이두부무침") return true;

  // 어묵김밥_NOFIRE_BATCH12
  if (title === "두부면샐러드") return true;

  // 닭가슴살오이냉채_NOFIRE_BATCH11
  if (title === "닭가슴살오이냉채") return true;

  // 김치콩나물국_NOFIRE_BATCH10
  if (hasAny(title, ["오이참치비빔밥", "참치마요주먹밥"])) return true;

  // 토마토계란국_NOFIRE_BATCH9
  if (hasAny(title, ["토마토카프레제", "두부면비빔국수", "크래미유부초밥"])) return true;

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
    "알배추간장무침",
    "오이냉국",
    "무생채",
    "고추참치비빔밥",
    "진미채무침",
    "오이크래미무침",
    "참치쌈장",
    "두부샐러드",
    "양배추라페",
    "토마토마리네이드",
    "상추겉절이",
    "오이계란샌드위치",
    "양배추참치샐러드",
    "오이김밥",
  ]);
}

function inferRequiredTools(title: string): string[] {
  if (title === "스팸무스비") return ["프라이팬", "칼", "랩"];
  if (title === "가지토마토볶음") return ["프라이팬", "주걱", "그릇"];
  if (title === "김치어묵볶음") return ["프라이팬", "주걱", "가위"];
  if (title === "양파달걀볶음") return ["프라이팬", "젓가락", "그릇"];

  // 오이두부무침_TOOLS_BATCH13
  if (title === "양배추계란국") return ["냄비", "국자", "그릇"];
  if (title === "닭가슴살양배추덮밥") return ["프라이팬", "주걱", "그릇"];
  if (title === "두부참치전") return ["프라이팬", "뒤집개", "그릇"];
  if (title === "오이두부무침") return ["그릇", "칼", "숟가락"];

  // 어묵김밥_TOOLS_BATCH12
  if (title === "두부면샐러드") return ["그릇", "체", "젓가락"];
  if (title === "브로콜리계란볶음") return ["프라이팬", "주걱", "그릇"];
  if (title === "참치계란죽") return ["냄비", "국자", "그릇"];
  if (title === "어묵김밥") return ["프라이팬", "김발", "칼"];

  // 닭가슴살오이냉채_TOOLS_BATCH11
  if (title === "콩나물냉국") return ["냄비", "체", "그릇"];
  if (title === "계란카레덮밥") return ["냄비", "프라이팬", "그릇"];
  if (title === "김치치즈주먹밥") return ["그릇", "위생장갑", "프라이팬"];
  if (title === "닭가슴살오이냉채") return ["그릇", "칼", "젓가락"];

  // 김치콩나물국_TOOLS_BATCH10
  if (title === "오이참치비빔밥") return ["그릇", "숟가락", "칼"];
  if (title === "참치마요주먹밥") return ["그릇", "숟가락", "위생장갑"];
  if (title === "계란양배추토스트") return ["프라이팬", "뒤집개", "그릇"];
  if (title === "김치콩나물국") return ["냄비", "국자", "그릇"];

  // 토마토계란국_TOOLS_BATCH9
  if (title === "토마토카프레제") return ["그릇", "칼", "숟가락"];
  if (title === "두부면비빔국수") return ["그릇", "젓가락"];
  if (title === "크래미유부초밥") return ["그릇", "숟가락"];
  if (title === "토마토계란국") return ["냄비", "국자", "그릇"];

  if (title === "오이계란샌드위치" || title === "양배추참치샐러드") return ["그릇", "숟가락", "칼"];
  if (title === "오이김밥") return ["김발", "그릇", "칼"];
  if (title === "콩나물비빔라면") return ["냄비", "그릇", "젓가락"];
  if (title === "양배추라페" || title === "토마토마리네이드" || title === "상추겉절이") return ["그릇", "숟가락"];
  if (title === "김치말이국수") return ["냄비", "그릇", "젓가락"];
  if (title === "오이냉국") return ["그릇", "숟가락", "계량컵"];
  if (title === "무생채" || title === "고추참치비빔밥" || title === "진미채무침" || title === "오이크래미무침" || title === "참치쌈장")
    return ["그릇", "숟가락"];
  if (title === "가지무침") return ["전자레인지", "전자레인지용 그릇", "숟가락"];
  if (title === "감자옥수수샐러드") return ["전자레인지", "전자레인지용 그릇", "숟가락"];
  if (title === "김치비빔국수") return ["냄비", "그릇", "젓가락"];
  if (title === "두부김치") return ["프라이팬", "뒤집개", "그릇"];
  if (title === "두부샐러드") return ["그릇", "숟가락"];
  if (title === "간장계란장") return ["냄비", "그릇", "숟가락"];
  if (title === "브로콜리버터볶음") return ["프라이팬", "뒤집개", "그릇"];
  if (title === "감자달걀샐러드") return ["냄비", "그릇", "숟가락"];
  if (title === "냉두부" || title === "오이무침" || title === "깻잎무침" || title === "깻잎두부무침") return ["그릇", "칼", "숟가락"];
  if (title === "참치김치찌개" || title === "어묵탕") return ["냄비", "국자", "그릇"];
  if (title === "참치두부조림" || title === "스팸김치볶음" || title === "햄감자볶음" || title === "어묵볶음") return ["프라이팬", "뒤집개", "그릇"];
  if (title === "계란볶음라면") return ["냄비", "프라이팬", "젓가락"];
  if (title === "계란토스트" || title === "팽이버섯전" || title === "애호박전") return ["프라이팬", "뒤집개", "그릇"];
  if (title === "새송이버섯볶음") return ["프라이팬", "뒤집개", "그릇"];
  if (isMicrowaveRecipe(title)) return ["전자레인지", "전자레인지용 그릇", "숟가락"];
  if (isNoFireRecipe(title)) return ["그릇", "숟가락"];
  if (hasAny(title, ["계란밥", "달걀밥"])) return ["프라이팬", "뒤집개", "그릇"];
  if (hasAny(title, ["국", "탕", "찌개", "죽", "우동", "라면", "파스타", "잔치국수"])) return ["냄비", "국자", "그릇"];
  if (hasAny(title, ["볶음", "볶음밥", "부침", "전", "계란말이", "덮밥", "조림", "구이"])) return ["프라이팬", "뒤집개", "그릇"];
  if (title.includes("샐러드")) return ["냄비", "그릇", "숟가락"];
  return ["그릇", "숟가락"];
}

function inferMinutes(title: string): number {
  if (title === "스팸무스비") return 12;
  if (title === "가지토마토볶음") return 10;
  if (title === "김치어묵볶음") return 10;
  if (title === "양파달걀볶음") return 8;

  // 오이두부무침_MINUTES_BATCH13
  if (title === "양배추계란국") return 10;
  if (title === "닭가슴살양배추덮밥") return 12;
  if (title === "두부참치전") return 12;
  if (title === "오이두부무침") return 7;

  // 어묵김밥_MINUTES_BATCH12
  if (title === "두부면샐러드") return 7;
  if (title === "브로콜리계란볶음") return 10;
  if (title === "참치계란죽") return 12;
  if (title === "어묵김밥") return 15;

  // 닭가슴살오이냉채_MINUTES_BATCH11
  if (title === "콩나물냉국") return 12;
  if (title === "계란카레덮밥") return 10;
  if (title === "김치치즈주먹밥") return 10;
  if (title === "닭가슴살오이냉채") return 8;

  // 김치콩나물국_MINUTES_BATCH10
  if (title === "오이참치비빔밥") return 7;
  if (title === "참치마요주먹밥") return 8;
  if (title === "계란양배추토스트") return 10;
  if (title === "김치콩나물국") return 12;

  // 토마토계란국_MINUTES_BATCH9
  if (title === "토마토카프레제") return 7;
  if (title === "두부면비빔국수") return 7;
  if (title === "크래미유부초밥") return 10;
  if (title === "토마토계란국") return 10;

  if (title === "오이계란샌드위치") return 7;
  if (title === "양배추참치샐러드") return 6;
  if (title === "오이김밥") return 10;
  if (title === "콩나물비빔라면") return 10;
  if (title === "양배추라페") return 8;
  if (title === "토마토마리네이드") return 7;
  if (title === "상추겉절이") return 5;
  if (title === "김치말이국수") return 12;
  if (title === "오이냉국") return 7;
  if (title === "계란토스트") return 8;
  if (title === "팽이버섯전") return 10;
  if (title === "계란볶음라면") return 10;
  if (title === "애호박전") return 10;
  if (title === "무생채") return 8;
  if (title === "고추참치비빔밥") return 5;
  if (title === "새송이버섯볶음") return 10;
  if (title === "김치참치볶음밥") return 10;
  if (title === "가지무침") return 8;
  if (title === "진미채무침") return 8;
  if (title === "팽이버섯덮밥") return 8;
  if (title === "김치비빔국수") return 12;
  if (title === "두부김치") return 10;
  if (title === "오이크래미무침") return 7;
  if (title === "참치쌈장") return 5;
  if (title === "감자옥수수샐러드") return 10;
  if (title === "가지덮밥") return 10;
  if (title === "두부샐러드") return 7;
  if (title === "간장계란장") return 15;
  if (isNoFireRecipe(title)) return 6;
  if (isMicrowaveRecipe(title)) return 8;
  if (hasAny(title, ["찌개", "국", "탕", "죽", "만두국"])) return 15;
  if (hasAny(title, ["조림", "구이", "샐러드"])) return 15;
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
  return `${name} 재료는 한입 크기나 숟가락에 올라가는 크기로 준비하면 먹기 쉽습니다.`;
}

function buildIngredients(title: string): BeginnerRecipeIngredient[] {
  if (title === "감자참치조림") {
    return [
      { name: "감자", amount: "1개", required: true, substitute: null, beginnerNote: "껍질을 벗기고 1cm 두께 한입 크기로 썰면 10분 안에 익습니다." },
      { name: "참치캔", amount: "1/2캔", required: true, substitute: "고추참치 1/2캔", beginnerNote: "기름은 절반만 빼야 조림이 너무 퍽퍽하지 않습니다." },
      { name: "물", amount: "1/2컵", required: true, substitute: "멸치육수 1/2컵", beginnerNote: "감자가 잠기지 않아도 뚜껑을 덮으면 익습니다." },
      { name: "간장", amount: "1큰술", required: true, substitute: "쯔유 1큰술", beginnerNote: "처음부터 많이 넣지 말고 1큰술로 시작합니다." },
      { name: "설탕", amount: "1작은술", required: false, substitute: "올리고당 1작은술", beginnerNote: "김치나 고추참치를 쓰면 생략해도 됩니다." },
      { name: "대파", amount: "1큰술", required: false, substitute: "쪽파 조금", beginnerNote: "마지막에 넣으면 색과 향이 살아납니다." },
    ];
  }

  if (title === "김치콩나물밥") {
    return [
      { name: "밥", amount: "1공기", required: true, substitute: "즉석밥 1개", beginnerNote: "따뜻한 밥을 쓰면 김치와 콩나물이 빨리 섞입니다." },
      { name: "김치", amount: "1컵", required: true, substitute: "볶음김치 3/4컵", beginnerNote: "가위로 작게 자르면 숟가락으로 먹기 쉽습니다." },
      { name: "콩나물", amount: "1/2봉", required: true, substitute: "숙주 1줌", beginnerNote: "흐르는 물에 헹군 뒤 물기를 가볍게 털어둡니다." },
      { name: "물", amount: "2큰술", required: true, substitute: null, beginnerNote: "콩나물을 숨죽이는 최소한의 물입니다." },
      { name: "간장", amount: "1큰술", required: true, substitute: "쯔유 1큰술", beginnerNote: "김치가 짜면 절반만 먼저 넣고 맛을 보세요." },
      { name: "김", amount: "1장", required: false, substitute: "김가루 2큰술", beginnerNote: "마지막에 부숴 넣으면 물기를 잡고 고소합니다." },
      { name: "참기름", amount: "1작은술", required: false, substitute: "들기름 1작은술", beginnerNote: "불을 끄고 넣어야 향이 좋습니다." },
    ];
  }

  if (title === "달걀죽") {
    return [
      { name: "밥", amount: "1공기", required: true, substitute: "즉석밥 1개", beginnerNote: "찬밥도 물에 풀어 끓이면 부드럽게 살아납니다." },
      { name: "계란", amount: "2개", required: true, substitute: null, beginnerNote: "그릇에 먼저 풀어두면 냄비에서 덩어리지지 않습니다." },
      { name: "물", amount: "2.5컵", required: true, substitute: "멸치육수 2.5컵", beginnerNote: "죽은 끓으면서 되직해지니 처음에는 물을 넉넉히 잡습니다." },
      { name: "국간장", amount: "1작은술", required: true, substitute: "소금 2꼬집", beginnerNote: "처음부터 많이 넣지 말고 마지막에 간을 보세요." },
      { name: "참기름", amount: "1작은술", required: false, substitute: "들기름 1작은술", beginnerNote: "마지막에 넣으면 고소한 향이 납니다." },
      { name: "대파", amount: "1큰술", required: false, substitute: "쪽파 조금", beginnerNote: "없으면 생략해도 됩니다." },
    ];
  }

  if (title === "치즈계란밥") {
    return [
      { name: "밥", amount: "1공기", required: true, substitute: "즉석밥 1개", beginnerNote: "뜨거운 밥이어야 치즈가 잘 녹습니다." },
      { name: "계란", amount: "2개", required: true, substitute: null, beginnerNote: "반숙이 어렵다면 완숙 프라이로 해도 됩니다." },
      { name: "슬라이스치즈", amount: "1장", required: true, substitute: "피자치즈 2큰술", beginnerNote: "밥 위에 바로 올리면 잔열로 녹습니다." },
      { name: "간장", amount: "1큰술", required: true, substitute: "쯔유 1큰술", beginnerNote: "치즈가 짭짤하니 간장은 1큰술에서 멈추세요." },
      { name: "참기름", amount: "1작은술", required: false, substitute: "버터 1작은술", beginnerNote: "고소함을 더하는 선택 재료입니다." },
      { name: "김가루", amount: "1큰술", required: false, substitute: "참깨 1작은술", beginnerNote: "짜면 생략하고 향만 더하고 싶을 때 넣습니다." },
    ];
  }

  if (title === "버터간장계란밥") {
    return [
      { name: "밥", amount: "1공기", required: true, substitute: "즉석밥 1개", beginnerNote: "뜨거운 밥이어야 버터가 덩어리 없이 녹습니다." },
      { name: "계란", amount: "2개", required: true, substitute: null, beginnerNote: "밥에 비빌 메뉴라 모양이 조금 망가져도 괜찮습니다." },
      { name: "버터", amount: "1작은술", required: true, substitute: "마가린 1작은술", beginnerNote: "많이 넣으면 느끼하니 처음에는 작게 시작합니다." },
      { name: "간장", amount: "1큰술", required: true, substitute: "쯔유 1큰술", beginnerNote: "팬 가장자리에 살짝 둘러 향을 내도 좋습니다." },
      { name: "참기름", amount: "1/2작은술", required: false, substitute: null, beginnerNote: "버터가 들어가므로 아주 조금만 넣거나 생략합니다." },
      { name: "참깨", amount: "1작은술", required: false, substitute: "김가루", beginnerNote: "마지막에 뿌리는 선택 재료입니다." },
    ];
  }

  if (title === "감자채전") {
    return [
      { name: "감자", amount: "2개", required: true, substitute: null, beginnerNote: "채칼이나 강판이 있으면 더 쉽고, 칼로 썰 때는 얇게 맞춥니다." },
      { name: "부침가루", amount: "2큰술", required: true, substitute: "전분 1큰술", beginnerNote: "감자가 서로 붙게 하는 최소량입니다." },
      { name: "소금", amount: "1/4작은술", required: true, substitute: null, beginnerNote: "처음부터 많이 넣지 말고 작게 시작합니다." },
      { name: "식용유", amount: "2큰술", required: true, substitute: null, beginnerNote: "팬 바닥에 얇게 고일 정도가 바삭합니다." },
      { name: "물", amount: "1큰술", required: false, substitute: null, beginnerNote: "반죽이 너무 뻑뻑할 때만 조금 넣습니다." },
    ];
  }

  if (title === "양파두부볶음") {
    return [
      { name: "두부", amount: "1/2모", required: true, substitute: "부침용 두부 1/2모", beginnerNote: "물기를 닦아야 팬에서 덜 튑니다." },
      { name: "양파", amount: "1/2개", required: true, substitute: "대파 1대", beginnerNote: "얇게 썰수록 빨리 달아집니다." },
      { name: "간장", amount: "1큰술", required: true, substitute: "쯔유 1큰술", beginnerNote: "두부가 싱거우니 간장은 1큰술에서 시작합니다." },
      { name: "식용유", amount: "1큰술", required: true, substitute: null, beginnerNote: "양파와 두부가 팬에 붙지 않을 정도입니다." },
      { name: "참기름", amount: "1작은술", required: false, substitute: "들기름 1작은술", beginnerNote: "불을 끄고 넣어야 향이 좋습니다." },
      { name: "참깨", amount: "1작은술", required: false, substitute: null, beginnerNote: "마지막에 뿌리면 보기 좋습니다." },
    ];
  }

  if (title === "감자채볶음") {
    return [
      { name: "감자", amount: "2개", required: true, substitute: null, beginnerNote: "얇게 채 썰어야 속까지 빨리 익습니다." },
      { name: "양파", amount: "1/4개", required: false, substitute: "당근 조금", beginnerNote: "단맛과 색을 더하는 선택 재료입니다." },
      { name: "소금", amount: "1/3작은술", required: true, substitute: "간장 1작은술", beginnerNote: "마지막에 간을 보고 부족하면 한 꼬집만 더합니다." },
      { name: "식용유", amount: "1큰술", required: true, substitute: null, beginnerNote: "감자가 팬에 달라붙지 않게 합니다." },
      { name: "후추", amount: "조금", required: false, substitute: null, beginnerNote: "없으면 생략해도 됩니다." },
    ];
  }

  if (title === "두부미역국") {
    return [
      { name: "불린 미역", amount: "1/2컵", required: true, substitute: "건미역 1큰술", beginnerNote: "건미역은 물에 불리면 크게 늘어나니 조금만 씁니다." },
      { name: "두부", amount: "1/2모", required: true, substitute: "순두부 1/2팩", beginnerNote: "한입 크기로 작게 자르면 숟가락에 잘 올라갑니다." },
      { name: "물", amount: "3컵", required: true, substitute: "멸치육수 3컵", beginnerNote: "종이컵 기준 3컵이면 2인분 국물입니다." },
      { name: "국간장", amount: "1큰술", required: true, substitute: "진간장 1큰술", beginnerNote: "국물 색이 진해지지 않게 처음엔 1큰술만 넣습니다." },
      { name: "참기름", amount: "1작은술", required: false, substitute: "들기름 1작은술", beginnerNote: "미역을 먼저 볶을 때 넣으면 고소합니다." },
      { name: "다진마늘", amount: "1/2작은술", required: false, substitute: null, beginnerNote: "없으면 생략해도 깔끔합니다." },
    ];
  }

  if (title === "들기름두부구이") {
    return [
      { name: "두부", amount: "1모", required: true, substitute: "부침용 두부 1모", beginnerNote: "단단한 두부가 굽기 쉽습니다." },
      { name: "들기름", amount: "1큰술", required: true, substitute: "참기름 1작은술 + 식용유 1작은술", beginnerNote: "향이 강하니 처음엔 1큰술만 씁니다." },
      { name: "식용유", amount: "1작은술", required: true, substitute: null, beginnerNote: "들기름만 쓰면 빨리 탈 수 있어 조금 섞습니다." },
      { name: "소금", amount: "1꼬집", required: true, substitute: "간장 1작은술", beginnerNote: "두부 밑간용으로 아주 조금만 씁니다." },
      { name: "간장", amount: "1큰술", required: false, substitute: "쯔유 1큰술", beginnerNote: "찍어 먹는 양념이라 두부 위에 다 붓지 않습니다." },
    ];
  }

  if (title === "순두부간장비빔") {
    return [
      { name: "순두부", amount: "1팩", required: true, substitute: "연두부 1팩", beginnerNote: "포장을 열고 물을 따라낸 뒤 숟가락으로 떠 씁니다." },
      { name: "간장", amount: "1큰술", required: true, substitute: "쯔유 1큰술", beginnerNote: "순두부가 부드러워 짠맛이 바로 느껴지니 1큰술부터 시작합니다." },
      { name: "참기름", amount: "1작은술", required: true, substitute: "들기름 1작은술", beginnerNote: "고소한 향을 더합니다." },
      { name: "김가루", amount: "1큰술", required: false, substitute: "구운 김 1장", beginnerNote: "물기를 잡고 밥과 같이 먹기 좋게 합니다." },
      { name: "대파", amount: "1큰술", required: false, substitute: "쪽파 조금", beginnerNote: "없으면 생략해도 됩니다." },
      { name: "참깨", amount: "1작은술", required: false, substitute: null, beginnerNote: "마지막에 뿌립니다." },
    ];
  }

  if (title === "브로콜리버터볶음") {
    return [
      { name: "브로콜리", amount: "1컵", required: true, substitute: "냉동 브로콜리 1컵", beginnerNote: "한입 크기 송이로 자르면 초보자도 익은 정도를 보기 쉽습니다." },
      { name: "물", amount: "2큰술", required: true, substitute: null, beginnerNote: "먼저 살짝 찌듯 익히는 안전장치입니다." },
      { name: "버터", amount: "1작은술", required: true, substitute: "마가린 1작은술", beginnerNote: "마지막에 넣어야 타지 않고 향이 납니다." },
      { name: "식용유", amount: "1작은술", required: true, substitute: null, beginnerNote: "버터가 타지 않게 도와줍니다." },
      { name: "소금", amount: "1꼬집", required: true, substitute: "간장 1작은술", beginnerNote: "처음에는 아주 조금만 넣고 마지막에 맛을 봅니다." },
    ];
  }

  if (title === "냉두부") {
    return [
      { name: "두부", amount: "1/2모", required: true, substitute: "연두부 1팩", beginnerNote: "차갑게 먹는 메뉴라 물기를 빼야 양념이 묽어지지 않습니다." },
      { name: "간장", amount: "1큰술", required: true, substitute: "쯔유 1큰술", beginnerNote: "두부 위에 전부 붓지 말고 절반부터 올립니다." },
      { name: "참기름", amount: "1작은술", required: false, substitute: "들기름 1작은술", beginnerNote: "고소함을 더하는 선택 재료입니다." },
      { name: "대파", amount: "1큰술", required: false, substitute: "김가루 1큰술", beginnerNote: "없으면 생략해도 됩니다." },
      { name: "참깨", amount: "1작은술", required: false, substitute: null, beginnerNote: "마지막에 뿌리는 선택 재료입니다." },
    ];
  }

  if (title === "오이무침") {
    return [
      { name: "오이", amount: "1개", required: true, substitute: null, beginnerNote: "얇은 반달 모양으로 썰면 양념이 빨리 묻습니다." },
      { name: "간장", amount: "1큰술", required: true, substitute: "소금 2꼬집", beginnerNote: "처음부터 많이 넣지 말고 1큰술에서 멈춥니다." },
      { name: "식초", amount: "1큰술", required: true, substitute: "레몬즙 1큰술", beginnerNote: "새콤한 맛을 내는 재료입니다." },
      { name: "설탕", amount: "1작은술", required: true, substitute: "올리고당 1작은술", beginnerNote: "식초의 신맛을 부드럽게 합니다." },
      { name: "고춧가루", amount: "1작은술", required: false, substitute: null, beginnerNote: "맵게 먹고 싶을 때만 넣습니다." },
      { name: "참기름", amount: "1작은술", required: false, substitute: null, beginnerNote: "고소한 향이 필요할 때 마지막에 넣습니다." },
    ];
  }

  if (title === "감자달걀샐러드") {
    return [
      { name: "감자", amount: "1개", required: true, substitute: "고구마 1개", beginnerNote: "젓가락이 부드럽게 들어갈 때까지 익혀야 으깨기 쉽습니다." },
      { name: "계란", amount: "2개", required: true, substitute: "삶은 달걀 2개", beginnerNote: "완숙으로 삶아야 샐러드가 질척하지 않습니다." },
      { name: "마요네즈", amount: "1큰술", required: true, substitute: "플레인 요거트 1큰술", beginnerNote: "처음에는 1큰술만 넣고 부족하면 조금 더합니다." },
      { name: "소금", amount: "1꼬집", required: true, substitute: null, beginnerNote: "맛을 본 뒤 부족할 때만 한 꼬집 더합니다." },
      { name: "후추", amount: "조금", required: false, substitute: null, beginnerNote: "없으면 생략해도 됩니다." },
      { name: "오이", amount: "1/4개", required: false, substitute: "양배추 조금", beginnerNote: "아삭함을 더하는 선택 재료입니다." },
    ];
  }

  if (title === "깻잎무침") {
    return [
      { name: "깻잎", amount: "10장", required: true, substitute: "상추 6장", beginnerNote: "씻은 뒤 물기를 털어야 양념이 묽어지지 않습니다." },
      { name: "간장", amount: "1큰술", required: true, substitute: "쯔유 1큰술", beginnerNote: "잎이 얇아 짠맛이 빨리 배니 1큰술만 씁니다." },
      { name: "참기름", amount: "1작은술", required: true, substitute: "들기름 1작은술", beginnerNote: "깻잎 향과 잘 맞는 기본 양념입니다." },
      { name: "고춧가루", amount: "1/2작은술", required: false, substitute: null, beginnerNote: "맵게 먹고 싶을 때만 넣습니다." },
      { name: "참깨", amount: "1작은술", required: false, substitute: null, beginnerNote: "마지막에 뿌리는 선택 재료입니다." },
    ];
  }

  if (title === "깻잎두부무침") {
    return [
      { name: "깻잎", amount: "8장", required: true, substitute: "상추 5장", beginnerNote: "손으로 찢어도 되니 칼이 서툴러도 괜찮습니다." },
      { name: "두부", amount: "1/2모", required: true, substitute: "연두부 1팩", beginnerNote: "물기를 빼야 무쳤을 때 싱거워지지 않습니다." },
      { name: "간장", amount: "1큰술", required: true, substitute: "쯔유 1큰술", beginnerNote: "두부에 바로 붓지 말고 그릇 가장자리로 넣습니다." },
      { name: "참기름", amount: "1작은술", required: true, substitute: "들기름 1작은술", beginnerNote: "고소한 향을 더합니다." },
      { name: "참깨", amount: "1작은술", required: false, substitute: null, beginnerNote: "마지막에 뿌리면 보기 좋습니다." },
    ];
  }

  if (title === "양파계란덮밥") {
    return [
      { name: "밥", amount: "1공기", required: true, substitute: "즉석밥 1개", beginnerNote: "소스가 올라가니 넓은 그릇에 담으면 먹기 쉽습니다." },
      { name: "계란", amount: "2개", required: true, substitute: null, beginnerNote: "미리 풀어두면 양파 위에 고르게 퍼집니다." },
      { name: "양파", amount: "1/2개", required: true, substitute: "대파 1대", beginnerNote: "얇게 썰수록 빨리 달아지고 부드럽습니다." },
      { name: "물", amount: "4큰술", required: true, substitute: "다시마육수 4큰술", beginnerNote: "양파를 태우지 않고 소스를 만드는 안전장치입니다." },
      { name: "간장", amount: "1큰술", required: true, substitute: "쯔유 1큰술", beginnerNote: "덮밥 소스의 기본 간입니다." },
      { name: "설탕", amount: "1작은술", required: false, substitute: "올리고당 1작은술", beginnerNote: "양파 단맛이 부족할 때만 넣습니다." },
    ];
  }

  if (title === "김치볶음밥") {
    return [
      { name: "밥", amount: "1공기", required: true, substitute: "즉석밥 1개", beginnerNote: "찬밥이면 더 고슬고슬하고, 따뜻한 밥이면 먼저 덩어리를 풀어 둡니다." },
      { name: "김치", amount: "1컵", required: true, substitute: "볶음김치 1컵", beginnerNote: "가위로 잘게 자르면 초보자도 먹기 좋은 크기가 됩니다." },
      { name: "대파", amount: "2큰술", required: false, substitute: "양파 2큰술", beginnerNote: "없어도 되지만 넣으면 볶음밥 향이 좋아집니다." },
      { name: "계란", amount: "1개", required: false, substitute: null, beginnerNote: "프라이로 올리면 짠맛을 부드럽게 잡아줍니다." },
      { name: "식용유", amount: "1큰술", required: true, substitute: null, beginnerNote: "김치를 먼저 볶을 때 팬에 둘러줍니다." },
      { name: "간장", amount: "1작은술", required: false, substitute: "김치국물 1큰술", beginnerNote: "김치가 짜면 생략하세요." },
      { name: "참기름", amount: "1작은술", required: false, substitute: "들기름 1작은술", beginnerNote: "불을 끄고 넣어야 향이 살아납니다." },
    ];
  }

  if (title === "참치김치볶음밥") {
    return [
      { name: "밥", amount: "1공기", required: true, substitute: "즉석밥 1개", beginnerNote: "찬밥이면 좋고 즉석밥은 데운 뒤 1분 식혀 씁니다." },
      { name: "김치", amount: "3/4컵", required: true, substitute: "볶음김치 3/4컵", beginnerNote: "참치가 들어가니 김치는 김치볶음밥보다 조금 적게 잡습니다." },
      { name: "참치캔", amount: "1/2캔", required: true, substitute: "닭가슴살 1/2팩", beginnerNote: "기름은 1큰술만 남기고 덜어내야 질척하지 않습니다." },
      { name: "대파", amount: "2큰술", required: false, substitute: "양파 2큰술", beginnerNote: "볶음 향을 내는 선택 재료입니다." },
      { name: "식용유", amount: "1작은술", required: true, substitute: "참치기름 1큰술", beginnerNote: "참치기름을 쓰면 식용유는 적게 넣어도 됩니다." },
      { name: "간장", amount: "1작은술", required: false, substitute: null, beginnerNote: "김치와 참치가 짜면 넣지 마세요." },
      { name: "김가루", amount: "1큰술", required: false, substitute: "참깨 1작은술", beginnerNote: "마지막에 올리면 짠맛과 고소함이 정리됩니다." },
    ];
  }

  if (title === "참치마요덮밥") {
    return [
      { name: "밥", amount: "1공기", required: true, substitute: "즉석밥 1개", beginnerNote: "따뜻한 밥이면 마요네즈와 참치가 잘 섞입니다." },
      { name: "참치캔", amount: "1/2캔", required: true, substitute: "닭가슴살 1/2팩", beginnerNote: "기름은 숟가락으로 눌러 대부분 빼야 느끼하지 않습니다." },
      { name: "마요네즈", amount: "1큰술", required: true, substitute: "플레인요거트 1큰술", beginnerNote: "처음에는 1큰술만 넣고 부족하면 조금 더합니다." },
      { name: "간장", amount: "1작은술", required: true, substitute: "쯔유 1작은술", beginnerNote: "밥에 향만 입히는 양입니다." },
      { name: "김", amount: "1장", required: false, substitute: "김가루 2큰술", beginnerNote: "마요네즈의 느끼함을 잡아줍니다." },
      { name: "참깨", amount: "1작은술", required: false, substitute: null, beginnerNote: "마지막 고소한 향을 더합니다." },
    ];
  }

  if (title === "햄야채볶음밥") {
    return [
      { name: "밥", amount: "1공기", required: true, substitute: "즉석밥 1개", beginnerNote: "찬밥이면 좋고 따뜻한 밥은 먼저 펼쳐 김을 빼세요." },
      { name: "햄", amount: "1/3컵", required: true, substitute: "스팸 1/4캔", beginnerNote: "잘게 썰수록 짠맛이 밥 전체에 고르게 퍼집니다." },
      { name: "양파", amount: "1/4개", required: true, substitute: "대파 3큰술", beginnerNote: "작게 썰면 빨리 익고 단맛이 납니다." },
      { name: "계란", amount: "1개", required: false, substitute: null, beginnerNote: "팬 한쪽에서 익혀 섞으면 밥이 덜 질척합니다." },
      { name: "식용유", amount: "1큰술", required: true, substitute: null, beginnerNote: "햄과 양파가 팬에 붙지 않을 정도면 됩니다." },
      { name: "간장", amount: "1작은술", required: true, substitute: "소금 1꼬집", beginnerNote: "햄이 짜니 간장은 작게 시작하세요." },
    ];
  }

  if (title === "스팸무스비") {
    return [
      { name: "밥", amount: "1.5공기", required: true, substitute: "즉석밥 2개", beginnerNote: "따뜻할 때 간하면 모양 잡기가 쉽습니다." },
      { name: "스팸", amount: "1/2캔", required: true, substitute: "구이용 햄 4장", beginnerNote: "너무 두껍지 않게 썰어야 한입에 먹기 좋습니다." },
      { name: "김밥김", amount: "2장", required: true, substitute: "구운김 4장", beginnerNote: "폭을 맞춰 잘라두면 감쌀 때 덜 찢어집니다." },
      { name: "참기름", amount: "1큰술", required: true, substitute: "들기름 1큰술", beginnerNote: "밥에 먼저 섞으면 고소하고 덜 달라붙습니다." },
      { name: "참깨", amount: "1작은술", required: false, substitute: "깨소금", beginnerNote: "밥에 섞거나 마지막에 뿌립니다." },
      { name: "간장", amount: "1작은술", required: false, substitute: null, beginnerNote: "햄이 짜면 생략하세요." },
    ];
  }

  if (title === "가지토마토볶음") {
    return [
      { name: "가지", amount: "1개", required: true, substitute: "애호박 1/2개", beginnerNote: "반달 모양으로 썰면 빨리 익고 먹기 쉽습니다." },
      { name: "토마토", amount: "1개", required: true, substitute: "방울토마토 6개", beginnerNote: "너무 작게 자르면 물이 많이 나오니 큼직하게 썹니다." },
      { name: "식용유", amount: "1큰술", required: true, substitute: "올리브유 1큰술", beginnerNote: "가지가 기름을 잘 먹으니 처음부터 많이 붓지 마세요." },
      { name: "간장", amount: "1큰술", required: true, substitute: "굴소스 1작은술", beginnerNote: "팬 가장자리에 둘러 넣으면 향이 납니다." },
      { name: "다진마늘", amount: "1작은술", required: false, substitute: "마늘가루 조금", beginnerNote: "없으면 생략해도 토마토 향으로 충분합니다." },
      { name: "설탕", amount: "1/2작은술", required: false, substitute: "올리고당 조금", beginnerNote: "토마토가 새콤할 때만 조금 넣습니다." },
      { name: "대파", amount: "1큰술", required: false, substitute: "쪽파 조금", beginnerNote: "마무리 향을 더합니다." },
    ];
  }

  if (title === "김치어묵볶음") {
    return [
      { name: "김치", amount: "1/2컵", required: true, substitute: "볶음김치 1/2컵", beginnerNote: "너무 시면 설탕을 조금 넣으면 맛이 둥글어집니다." },
      { name: "어묵", amount: "2장", required: true, substitute: "비엔나소시지 5개", beginnerNote: "가위로 자르면 칼 없이도 준비할 수 있습니다." },
      { name: "식용유", amount: "1큰술", required: true, substitute: null, beginnerNote: "김치를 먼저 볶을 때 팬에 둘러줍니다." },
      { name: "설탕", amount: "1작은술", required: true, substitute: "올리고당 1작은술", beginnerNote: "김치 신맛을 줄이는 역할입니다." },
      { name: "간장", amount: "1작은술", required: true, substitute: "굴소스 1작은술", beginnerNote: "어묵에만 살짝 간이 배도록 적게 넣습니다." },
      { name: "참기름", amount: "1작은술", required: true, substitute: "들기름 1작은술", beginnerNote: "불을 끄고 넣어야 향이 남습니다." },
      { name: "대파", amount: "1큰술", required: false, substitute: "쪽파 조금", beginnerNote: "없으면 생략해도 됩니다." },
    ];
  }

  if (title === "양파달걀볶음") {
    return [
      { name: "양파", amount: "1/2개", required: true, substitute: "대파 1대", beginnerNote: "얇게 썰수록 빨리 달아지고 부드러워집니다." },
      { name: "달걀", amount: "2개", required: true, substitute: "계란 2개", beginnerNote: "그릇에 먼저 풀어두면 팬에서 당황하지 않습니다." },
      { name: "식용유", amount: "1큰술", required: true, substitute: "버터 1작은술", beginnerNote: "팬 바닥에 얇게 퍼질 정도면 충분합니다." },
      { name: "간장", amount: "1작은술", required: true, substitute: "소금 1꼬집", beginnerNote: "양파와 달걀에 살짝 향만 입힙니다." },
      { name: "소금", amount: "1꼬집", required: false, substitute: null, beginnerNote: "마지막에 싱거울 때만 씁니다." },
      { name: "후추", amount: "조금", required: false, substitute: null, beginnerNote: "달걀 비린 향이 걱정될 때만 넣습니다." },
      { name: "대파", amount: "1큰술", required: false, substitute: "쪽파 조금", beginnerNote: "색과 향을 더합니다." },
    ];
  }

  // 오이두부무침_INGREDIENTS_BATCH13
  if (title === "양배추계란국") {
    return [
      { name: "양배추", amount: "1줌", required: true, substitute: "배추 1줌", beginnerNote: "가늘게 썰수록 금방 익고 국물에 단맛이 납니다." },
      { name: "계란", amount: "2개", required: true, substitute: null, beginnerNote: "미리 풀어두면 국물에 부드럽게 퍼집니다." },
      { name: "물", amount: "2컵", required: true, substitute: "멸치육수 2컵", beginnerNote: "처음에는 물만 써도 충분히 담백합니다." },
      { name: "국간장", amount: "1큰술", required: true, substitute: "진간장 1큰술", beginnerNote: "마지막에 맛보고 1작은술씩만 더하세요." },
      { name: "대파", amount: "1큰술", required: false, substitute: "쪽파 조금", beginnerNote: "없으면 생략해도 됩니다." },
      { name: "소금", amount: "1꼬집", required: false, substitute: null, beginnerNote: "간이 부족할 때만 마지막에 씁니다." },
    ];
  }

  if (title === "닭가슴살양배추덮밥") {
    return [
      { name: "밥", amount: "1공기", required: true, substitute: "즉석밥 1개", beginnerNote: "따뜻한 밥이면 양념이 잘 섞입니다." },
      { name: "익힌 닭가슴살", amount: "1팩", required: true, substitute: "참치캔 1/2캔", beginnerNote: "편의점 닭가슴살처럼 바로 먹는 제품을 쓰면 쉽습니다." },
      { name: "양배추", amount: "1줌", required: true, substitute: "숙주 1줌", beginnerNote: "채 썬 제품을 쓰면 칼질을 줄일 수 있습니다." },
      { name: "간장", amount: "1큰술", required: true, substitute: "쯔유 1큰술", beginnerNote: "덮밥 양념의 기본입니다." },
      { name: "물", amount: "2큰술", required: true, substitute: null, beginnerNote: "양배추를 태우지 않고 숨 죽이는 용도입니다." },
      { name: "참기름", amount: "1작은술", required: true, substitute: "들기름 1작은술", beginnerNote: "불을 끄고 넣으면 향이 납니다." },
      { name: "참깨", amount: "1작은술", required: false, substitute: "김가루", beginnerNote: "마무리용입니다." },
    ];
  }

  if (title === "두부참치전") {
    return [
      { name: "두부", amount: "1/2모", required: true, substitute: "연두부 1팩", beginnerNote: "물기를 눌러 빼야 전이 덜 부서집니다." },
      { name: "참치캔", amount: "1/2캔", required: true, substitute: "닭가슴살 1/2팩", beginnerNote: "기름을 빼야 반죽이 질어지지 않습니다." },
      { name: "계란", amount: "1개", required: true, substitute: null, beginnerNote: "반죽을 붙여주는 역할입니다." },
      { name: "부침가루", amount: "2큰술", required: true, substitute: "밀가루 2큰술", beginnerNote: "없으면 전분 1큰술로도 모양을 잡을 수 있습니다." },
      { name: "대파", amount: "1큰술", required: false, substitute: "양파 1큰술", beginnerNote: "작게 썰수록 전이 잘 뭉칩니다." },
      { name: "식용유", amount: "1큰술", required: true, substitute: null, beginnerNote: "팬 바닥에 얇게 퍼질 정도면 됩니다." },
      { name: "간장", amount: "1작은술", required: false, substitute: "소금 1꼬집", beginnerNote: "반죽에 아주 살짝만 간합니다." },
    ];
  }

  if (title === "오이두부무침") {
    return [
      { name: "두부", amount: "1/2모", required: true, substitute: "연두부 1팩", beginnerNote: "단단한 두부면 모양이 잘 유지됩니다." },
      { name: "오이", amount: "1/2개", required: true, substitute: "양배추 한 줌", beginnerNote: "얇게 썰면 두부와 같이 먹기 쉽습니다." },
      { name: "간장", amount: "1큰술", required: true, substitute: "쯔유 1큰술", beginnerNote: "처음에는 1큰술만 넣고 맛을 보세요." },
      { name: "식초", amount: "1작은술", required: false, substitute: "레몬즙 조금", beginnerNote: "상큼한 맛을 더합니다." },
      { name: "참기름", amount: "1작은술", required: true, substitute: "들기름 1작은술", beginnerNote: "고소한 향을 냅니다." },
      { name: "참깨", amount: "1작은술", required: false, substitute: "깨소금", beginnerNote: "마지막에 뿌립니다." },
    ];
  }

  // 어묵김밥_INGREDIENTS_BATCH12
  if (title === "두부면샐러드") {
    return [
      { name: "두부면", amount: "1팩", required: true, substitute: "곤약면 1팩", beginnerNote: "포장 물을 버리고 찬물에 한 번 헹구면 냄새가 줄어듭니다." },
      { name: "샐러드채소", amount: "1줌", required: true, substitute: "상추 4장", beginnerNote: "씻은 채소를 쓰면 바로 만들 수 있습니다." },
      { name: "오이", amount: "1/4개", required: false, substitute: "양배추 한 줌", beginnerNote: "얇게 썰수록 면과 같이 집기 쉽습니다." },
      { name: "방울토마토", amount: "4개", required: false, substitute: "토마토 1/2개", beginnerNote: "없어도 되지만 넣으면 상큼합니다." },
      { name: "간장드레싱", amount: "간장 1큰술 + 식초 1큰술 + 참기름 1작은술", required: true, substitute: "쯔유 1큰술 + 식초 1작은술", beginnerNote: "드레싱은 먼저 섞은 뒤 절반만 넣고 맛을 보며 추가하세요." },
      { name: "참깨", amount: "1작은술", required: false, substitute: "깨소금", beginnerNote: "마지막에 뿌리면 보기 좋습니다." },
    ];
  }

  if (title === "브로콜리계란볶음") {
    return [
      { name: "브로콜리", amount: "1컵", required: true, substitute: "냉동 브로콜리 1컵", beginnerNote: "큰 송이는 한입 크기로 잘라야 빨리 익습니다." },
      { name: "계란", amount: "2개", required: true, substitute: null, beginnerNote: "먼저 풀어두면 팬에서 허둥대지 않습니다." },
      { name: "식용유", amount: "1큰술", required: true, substitute: "버터 1작은술", beginnerNote: "팬 바닥에 얇게 퍼질 정도면 됩니다." },
      { name: "물", amount: "2큰술", required: true, substitute: null, beginnerNote: "브로콜리를 태우지 않고 익히는 안전장치입니다." },
      { name: "간장", amount: "1작은술", required: true, substitute: "소금 1꼬집", beginnerNote: "브로콜리와 계란에 살짝 간만 합니다." },
      { name: "후추", amount: "조금", required: false, substitute: null, beginnerNote: "계란 비린 향이 걱정될 때만 넣으세요." },
    ];
  }

  if (title === "참치계란죽") {
    return [
      { name: "밥", amount: "1공기", required: true, substitute: "즉석밥 1개", beginnerNote: "찬밥이어도 물에 풀어 끓이면 괜찮습니다." },
      { name: "참치캔", amount: "1/2캔", required: true, substitute: "닭가슴살 1/2팩", beginnerNote: "기름을 반만 빼면 고소하고 너무 느끼하지 않습니다." },
      { name: "계란", amount: "1개", required: true, substitute: null, beginnerNote: "마지막에 넣어야 부드럽게 익습니다." },
      { name: "물", amount: "2컵", required: true, substitute: "멸치육수 2컵", beginnerNote: "처음에는 물만 써도 충분합니다." },
      { name: "국간장", amount: "1큰술", required: true, substitute: "소금 2꼬집", beginnerNote: "죽은 졸면서 짜질 수 있어 마지막에 맛을 봅니다." },
      { name: "참기름", amount: "1작은술", required: false, substitute: null, beginnerNote: "불을 끄고 넣으면 향이 살아납니다." },
      { name: "대파", amount: "1큰술", required: false, substitute: "김가루", beginnerNote: "없으면 생략해도 됩니다." },
    ];
  }

  if (title === "어묵김밥") {
    return [
      { name: "밥", amount: "1.5공기", required: true, substitute: "즉석밥 2개", beginnerNote: "너무 뜨거우면 김이 눅눅해지니 2분 식힙니다." },
      { name: "김밥김", amount: "2장", required: true, substitute: "구운김 4장", beginnerNote: "거친 면이 위로 오게 두면 밥이 잘 붙습니다." },
      { name: "사각어묵", amount: "2장", required: true, substitute: "맛살 3개", beginnerNote: "얇게 썰수록 김밥 안에서 잘 씹힙니다." },
      { name: "오이", amount: "1/2개", required: true, substitute: "단무지 2줄", beginnerNote: "물기가 많으면 키친타월로 한 번 닦습니다." },
      { name: "간장", amount: "1큰술", required: true, substitute: "쯔유 1큰술", beginnerNote: "어묵에만 간을 해서 밥은 담백하게 둡니다." },
      { name: "참기름", amount: "1큰술", required: true, substitute: "들기름 1큰술", beginnerNote: "밥과 김밥 겉면에 나눠 씁니다." },
      { name: "참깨", amount: "1작은술", required: false, substitute: "깨소금", beginnerNote: "마무리용입니다." },
    ];
  }

  // 닭가슴살오이냉채_INGREDIENTS_BATCH11
  if (title === "콩나물냉국") {
    return [
      { name: "콩나물", amount: "1줌", required: true, substitute: "숙주 1줌", beginnerNote: "꼬리를 다듬지 않아도 됩니다. 물에 한 번만 헹구세요." },
      { name: "물", amount: "2컵", required: true, substitute: "차가운 생수 2컵", beginnerNote: "끓일 물과 국물 양을 단순하게 맞춥니다." },
      { name: "국간장", amount: "1큰술", required: true, substitute: "진간장 1큰술", beginnerNote: "간은 마지막에 조금씩 더 맞추세요." },
      { name: "식초", amount: "1큰술", required: true, substitute: "레몬즙 1작은술", beginnerNote: "시원하고 새콤한 맛을 냅니다." },
      { name: "설탕", amount: "1작은술", required: true, substitute: "올리고당 1작은술", beginnerNote: "식초 맛을 부드럽게 잡습니다." },
      { name: "오이", amount: "1/4개", required: false, substitute: "대파 조금", beginnerNote: "얇게 썰면 국물에 잘 어울립니다." },
      { name: "얼음", amount: "3~4개", required: false, substitute: "차가운 물 1/2컵", beginnerNote: "바로 시원하게 먹고 싶을 때 넣습니다." },
    ];
  }

  if (title === "계란카레덮밥") {
    return [
      { name: "밥", amount: "1공기", required: true, substitute: "즉석밥 1개", beginnerNote: "따뜻한 밥이면 카레가 잘 스며듭니다." },
      { name: "즉석카레", amount: "1봉", required: true, substitute: "카레가루 2큰술", beginnerNote: "처음에는 데우기만 하는 즉석카레가 가장 쉽습니다." },
      { name: "계란", amount: "2개", required: true, substitute: null, beginnerNote: "스크램블처럼 익히면 덮밥에 잘 섞입니다." },
      { name: "식용유", amount: "1작은술", required: true, substitute: "버터 1작은술", beginnerNote: "계란이 팬에 붙지 않게 합니다." },
      { name: "양파", amount: "1/4개", required: false, substitute: "대파 조금", beginnerNote: "없어도 되지만 넣으면 단맛이 납니다." },
      { name: "물", amount: "냄비 절반", required: true, substitute: null, beginnerNote: "카레 봉지를 데울 용도입니다." },
    ];
  }

  if (title === "김치치즈주먹밥") {
    return [
      { name: "밥", amount: "1공기", required: true, substitute: "즉석밥 1개", beginnerNote: "너무 뜨거우면 손으로 뭉치기 어려우니 2분 식힙니다." },
      { name: "김치", amount: "1/3컵", required: true, substitute: "볶음김치 1/3컵", beginnerNote: "국물을 꼭 짜야 밥이 질어지지 않습니다." },
      { name: "슬라이스치즈", amount: "1장", required: true, substitute: "모짜렐라치즈 2큰술", beginnerNote: "작게 찢어 넣으면 고르게 녹습니다." },
      { name: "김가루", amount: "1줌", required: true, substitute: "구운 김 1장", beginnerNote: "밥이 잘 뭉치고 간도 맞습니다." },
      { name: "참기름", amount: "1작은술", required: true, substitute: "들기름 1작은술", beginnerNote: "고소한 향을 더합니다." },
      { name: "참깨", amount: "1작은술", required: false, substitute: "깨소금", beginnerNote: "마무리용입니다." },
    ];
  }

  if (title === "닭가슴살오이냉채") {
    return [
      { name: "익힌 닭가슴살", amount: "1팩", required: true, substitute: "크래미 3개", beginnerNote: "편의점 닭가슴살처럼 바로 먹는 제품을 쓰면 불이 필요 없습니다." },
      { name: "오이", amount: "1/2개", required: true, substitute: "양배추 한 줌", beginnerNote: "얇게 썰어야 소스가 잘 묻습니다." },
      { name: "식초", amount: "1큰술", required: true, substitute: "레몬즙 1작은술", beginnerNote: "냉채의 새콤한 맛을 냅니다." },
      { name: "간장", amount: "1큰술", required: true, substitute: "소금 한 꼬집", beginnerNote: "소스의 기본 간입니다." },
      { name: "설탕", amount: "1작은술", required: true, substitute: "올리고당 1작은술", beginnerNote: "식초 맛을 둥글게 만듭니다." },
      { name: "연겨자", amount: "1/2작은술", required: false, substitute: "머스터드 1작은술", beginnerNote: "처음이면 아주 조금만 넣으세요." },
      { name: "참깨", amount: "1작은술", required: false, substitute: "깨소금", beginnerNote: "마지막 고소한 맛입니다." },
    ];
  }

  // 김치콩나물국_INGREDIENTS_BATCH10
  if (title === "오이참치비빔밥") {
    return [
      { name: "밥", amount: "1공기", required: true, substitute: "즉석밥 1개", beginnerNote: "따뜻한 밥이면 양념이 더 잘 섞입니다." },
      { name: "참치캔", amount: "1/2캔", required: true, substitute: "닭가슴살 1/2팩", beginnerNote: "기름은 먼저 빼야 비빔밥이 질척하지 않습니다." },
      { name: "오이", amount: "1/3개", required: true, substitute: "상추 3장", beginnerNote: "작게 썰면 비빌 때 밥과 잘 섞입니다." },
      { name: "고추장", amount: "1큰술", required: true, substitute: "초고추장 1큰술", beginnerNote: "매운맛이 걱정되면 2/3큰술부터 시작하세요." },
      { name: "간장", amount: "1작은술", required: true, substitute: "소금 한 꼬집", beginnerNote: "참치와 밥의 간을 맞춥니다." },
      { name: "참기름", amount: "1작은술", required: true, substitute: "들기름 1작은술", beginnerNote: "마지막 향을 냅니다." },
      { name: "김가루", amount: "1줌", required: false, substitute: "구운 김 1장", beginnerNote: "없어도 되지만 넣으면 밥맛이 좋아집니다." },
    ];
  }

  if (title === "참치마요주먹밥") {
    return [
      { name: "밥", amount: "1공기", required: true, substitute: "즉석밥 1개", beginnerNote: "너무 뜨거우면 손으로 뭉치기 어려우니 2분 식히세요." },
      { name: "참치캔", amount: "1/2캔", required: true, substitute: "크래미 2개", beginnerNote: "기름을 빼야 주먹밥이 잘 뭉칩니다." },
      { name: "마요네즈", amount: "1큰술", required: true, substitute: "요거트 1큰술", beginnerNote: "참치가 촉촉하게 붙게 합니다." },
      { name: "간장", amount: "1작은술", required: true, substitute: "소금 한 꼬집", beginnerNote: "마요네즈만 넣으면 싱거울 수 있습니다." },
      { name: "김가루", amount: "1줌", required: true, substitute: "구운 김 1장", beginnerNote: "비닐봉지에 김을 넣고 부수면 편합니다." },
      { name: "참깨", amount: "1작은술", required: false, substitute: "깨소금", beginnerNote: "고소한 맛을 더합니다." },
    ];
  }

  if (title === "계란양배추토스트") {
    return [
      { name: "식빵", amount: "2장", required: true, substitute: "모닝빵 2개", beginnerNote: "팬에 구우면 더 바삭하지만 그대로 써도 됩니다." },
      { name: "계란", amount: "1개", required: true, substitute: null, beginnerNote: "양배추와 같이 부쳐 속재료를 만듭니다." },
      { name: "양배추", amount: "1줌", required: true, substitute: "채 썬 양배추 1팩", beginnerNote: "가늘게 썰수록 빨리 익고 먹기 쉽습니다." },
      { name: "식용유", amount: "1작은술", required: true, substitute: "버터 1작은술", beginnerNote: "팬에 얇게 바를 정도면 됩니다." },
      { name: "케첩", amount: "1큰술", required: true, substitute: "토마토소스 1큰술", beginnerNote: "단맛과 새콤한 맛을 냅니다." },
      { name: "마요네즈", amount: "1작은술", required: false, substitute: "머스터드 1작은술", beginnerNote: "고소한 맛을 더하고 싶을 때만 넣습니다." },
      { name: "소금", amount: "한 꼬집", required: false, substitute: null, beginnerNote: "계란 간을 살짝 맞춥니다." },
    ];
  }

  if (title === "김치콩나물국") {
    return [
      { name: "콩나물", amount: "1줌", required: true, substitute: "숙주 1줌", beginnerNote: "물에 한 번 헹궈 쓰면 냄새가 덜 납니다." },
      { name: "김치", amount: "1/2컵", required: true, substitute: "김치국물 2큰술", beginnerNote: "잘 익은 김치일수록 국물 맛이 좋습니다." },
      { name: "물", amount: "2컵", required: true, substitute: "멸치육수 2컵", beginnerNote: "종이컵 기준 두 컵이면 1~2인분입니다." },
      { name: "국간장", amount: "1큰술", required: true, substitute: "진간장 1큰술", beginnerNote: "먼저 1큰술만 넣고 마지막에 간을 봅니다." },
      { name: "다진 마늘", amount: "1/2작은술", required: false, substitute: null, beginnerNote: "없어도 되지만 넣으면 국물 맛이 깊어집니다." },
      { name: "대파", amount: "조금", required: false, substitute: "쪽파 조금", beginnerNote: "마지막 향을 내는 재료입니다." },
    ];
  }

  // 토마토계란국_INGREDIENTS_BATCH9
  if (title === "토마토카프레제") {
    return [
      { name: "토마토", amount: "1개", required: true, substitute: "방울토마토 8개", beginnerNote: "너무 무른 것보다 단단한 토마토가 썰기 쉽습니다." },
      { name: "모짜렐라치즈", amount: "1/2컵", required: true, substitute: "스트링치즈 2개", beginnerNote: "한입 크기로 자르면 초보자도 모양 내기 쉽습니다." },
      { name: "올리브유", amount: "1큰술", required: true, substitute: "식용유 1작은술", beginnerNote: "향이 약하면 소금과 후추로 맛을 맞추세요." },
      { name: "소금", amount: "한 꼬집", required: true, substitute: null, beginnerNote: "토마토 위에 아주 조금만 뿌립니다." },
      { name: "후추", amount: "조금", required: false, substitute: null, beginnerNote: "향을 더하고 싶을 때만 넣습니다." },
      { name: "발사믹식초", amount: "1작은술", required: false, substitute: "레몬즙 몇 방울", beginnerNote: "없어도 완성됩니다." },
    ];
  }

  if (title === "두부면비빔국수") {
    return [
      { name: "두부면", amount: "1팩", required: true, substitute: "곤약면 1팩", beginnerNote: "봉지 물을 버리고 한 번 헹구면 냄새가 줄어듭니다." },
      { name: "오이", amount: "1/4개", required: false, substitute: "양배추 한 줌", beginnerNote: "없어도 되지만 넣으면 식감이 살아납니다." },
      { name: "고추장", amount: "1큰술", required: true, substitute: "초고추장 1큰술", beginnerNote: "매운맛이 걱정되면 2/3큰술부터 시작하세요." },
      { name: "식초", amount: "1큰술", required: true, substitute: "레몬즙 1작은술", beginnerNote: "새콤한 맛을 만드는 핵심입니다." },
      { name: "설탕", amount: "1작은술", required: true, substitute: "올리고당 1작은술", beginnerNote: "고추장의 텁텁함을 줄입니다." },
      { name: "참기름", amount: "1작은술", required: true, substitute: "들기름 1작은술", beginnerNote: "마지막에 넣어야 향이 좋습니다." },
      { name: "참깨", amount: "1작은술", required: false, substitute: "깨소금", beginnerNote: "마무리용입니다." },
    ];
  }

  if (title === "크래미유부초밥") {
    return [
      { name: "유부초밥키트", amount: "1팩", required: true, substitute: null, beginnerNote: "초밥초와 조미유부가 같이 들어 있는 제품이면 가장 쉽습니다." },
      { name: "밥", amount: "1공기", required: true, substitute: "즉석밥 1개", beginnerNote: "따뜻할 때 초밥초를 섞어야 맛이 고르게 납니다." },
      { name: "크래미", amount: "2개", required: true, substitute: "맛살 2개", beginnerNote: "손으로 찢으면 칼 없이도 준비됩니다." },
      { name: "마요네즈", amount: "1큰술", required: true, substitute: "요거트 1큰술", beginnerNote: "크래미가 촉촉하게 붙게 합니다." },
      { name: "오이", amount: "1/4개", required: false, substitute: "단무지 조금", beginnerNote: "잘게 썰어 넣으면 느끼함이 줄어듭니다." },
      { name: "참깨", amount: "1작은술", required: false, substitute: "깨소금", beginnerNote: "마지막에 올리면 고소합니다." },
    ];
  }

  if (title === "토마토계란국") {
    return [
      { name: "토마토", amount: "1개", required: true, substitute: "방울토마토 8개", beginnerNote: "큼직하게 썰어야 끓여도 너무 풀어지지 않습니다." },
      { name: "계란", amount: "1개", required: true, substitute: null, beginnerNote: "그릇에 먼저 풀어두면 국에 넣기 쉽습니다." },
      { name: "물", amount: "2컵", required: true, substitute: "멸치육수 2컵", beginnerNote: "종이컵 기준 두 컵이면 1~2인분입니다." },
      { name: "국간장", amount: "1큰술", required: true, substitute: "진간장 1큰술", beginnerNote: "마지막 간은 소금으로 조금씩 맞추세요." },
      { name: "대파", amount: "조금", required: false, substitute: "쪽파 조금", beginnerNote: "없어도 됩니다." },
      { name: "소금", amount: "한 꼬집", required: false, substitute: null, beginnerNote: "싱거울 때만 마지막에 넣습니다." },
    ];
  }

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

  if (title === "간장계란밥") {
    add("계란", "2~3개", true, "달걀", "2개는 가볍게, 3개는 든든하게 먹는 양입니다.");
    add("밥", "1.5공기", true, "즉석밥 1.5개", "평소 밥공기 기준 한 공기 반입니다.");
    add("간장", "2큰술", true, null, "밥숟가락으로 평평하게 2번 넣습니다.");
    add("참기름", "1큰술", true, "들기름 1큰술", "기호에 따라 1.5큰술까지 늘릴 수 있습니다.");
    add("참깨", "1작은술", false, "깨소금", "마지막에 넣으면 고소한 향이 납니다.");
    add("식용유", "1큰술", true, null, "계란 가장자리를 바삭하게 익히는 양입니다.");
    return ingredients;
  }

  if (title === "양배추달걀전") {
    add("양배추", "1줌", true, "채 썬 양배추", "가늘게 썰수록 빨리 익고 뒤집기 쉽습니다.");
    add("계란", "2개", true, "달걀 2개", "양배추를 붙여 주는 핵심 재료입니다.");
    add("소금", "1꼬집", true, null, "계란물에 먼저 섞으면 간이 고르게 퍼집니다.");
    add("식용유", "1큰술", true, null, "팬 바닥에 얇게 퍼질 정도면 충분합니다.");
    add("케첩", "1큰술", false, "간장 1작은술", "완성 후 찍어 먹는 용도라 없어도 됩니다.");
    return ingredients;
  }

  if (title === "참치계란말이") {
    add("계란", "4개", true, "달걀 4개", "계란이 넉넉해야 참치를 감싸기 쉽습니다.");
    add("참치캔", "1/2캔", true, "작은 참치캔 1개", "기름을 빼야 계란말이가 덜 질척합니다.");
    add("대파", "1큰술", false, "양파 1큰술", "잘게 썰어야 말 때 찢어지지 않습니다.");
    add("소금", "1꼬집", true, null, "참치가 짭짤하니 아주 조금만 넣습니다.");
    add("식용유", "1큰술", true, null, "팬을 얇게 코팅하는 정도로만 씁니다.");
    return ingredients;
  }

  if (title === "팽이버섯전") {
    add("팽이버섯", "1봉", true, "느타리버섯 1줌", "밑동을 2cm 정도 자르고 손으로 가볍게 찢어 준비합니다.");
    add("계란", "2개", true, "달걀", "버섯을 붙여 주는 역할이라 꼭 필요합니다.");
    add("부침가루", "2큰술", false, "밀가루 2큰술", "없어도 만들 수 있지만 넣으면 뒤집기 쉽습니다.");
    add("소금", "한 꼬집", true, null, "계란에 먼저 섞으면 간이 고르게 퍼집니다.");
    add("식용유", "1큰술", true, null, "팬 바닥에 얇게 퍼질 정도면 충분합니다.");
    return ingredients;
  }

  if (title === "계란토스트") {
    add("식빵", "2장", true, "모닝빵 1개", "너무 두꺼운 빵보다 기본 식빵이 팬에서 익히기 쉽습니다.");
    add("계란", "1개", true, "달걀", "빵을 붙이고 속을 부드럽게 만드는 핵심 재료입니다.");
    add("치즈", "1장", false, "슬라이스 햄 1장", "없어도 되지만 넣으면 초보자도 맛을 내기 쉽습니다.");
    add("버터", "1작은술", false, "식용유 1작은술", "팬에 얇게 녹이면 빵이 고소하게 구워집니다.");
    add("소금", "한 꼬집", true, null, "계란에만 살짝 넣으면 전체 간이 맞습니다.");
    return ingredients;
  }

  if (title === "오이냉국") {
    add("오이", "1/2개", true, null, "얇게 썰수록 국물에 빨리 어울립니다.");
    add("물", "1.5컵", true, "차가운 생수", "차갑게 준비하면 바로 먹기 좋습니다.");
    add("식초", "2큰술", true, null, "새콤한 맛은 마지막에 1작은술씩 추가하세요.");
    add("설탕", "1큰술", true, "올리고당 1큰술", "식초의 강한 맛을 부드럽게 잡습니다.");
    add("간장", "1큰술", true, "소금 1/2작은술", "국물 색이 진해지지 않도록 정량만 넣습니다.");
    add("얼음", "4~5개", false, null, "바로 먹을 때 넣으면 더 시원합니다.");
    add("참깨", "1작은술", false, "깨소금", "마지막에 넣으면 고소한 향이 납니다.");
    return ingredients;
  }

  if (title === "계란볶음라면") {
    add("라면", "1봉", true, null, "면은 살짝 덜 익혀야 볶을 때 퍼지지 않습니다.");
    add("계란", "1개", true, "달걀", "면을 부드럽게 잡아 주는 재료입니다.");
    add("라면스프", "1/2봉", true, "간장 1큰술", "처음부터 전부 넣으면 짤 수 있어 절반만 씁니다.");
    add("대파", "2큰술", false, "양파 1/4개", "있으면 향이 좋아지지만 없어도 됩니다.");
    add("식용유", "1큰술", true, null, "계란과 면이 팬에 붙지 않게 합니다.");
    add("물", "2큰술", true, null, "면을 볶을 때 뻑뻑하면 조금씩 넣습니다.");
    return ingredients;
  }

  if (title === "애호박전") {
    add("애호박", "1/2개", true, "주키니 1/2개", "0.5cm 정도로 얇게 썰면 초보자도 속까지 익히기 쉽습니다.");
    add("계란", "1개", true, "달걀", "애호박에 얇게 입혀 고소하게 부치는 역할입니다.");
    add("부침가루", "2큰술", true, "밀가루 2큰술", "애호박 물기를 잡고 뒤집기 쉽게 합니다.");
    add("소금", "한 꼬집", true, null, "애호박에 직접 많이 뿌리지 말고 계란물에 조금만 넣습니다.");
    add("식용유", "1큰술", true, null, "팬 바닥에 얇게 퍼질 정도면 충분합니다.");
    return ingredients;
  }

  if (title === "무생채") {
    add("무", "1/5개", true, "콜라비 1/4개", "손가락 길이로 얇게 채 썰면 양념이 빨리 배어듭니다.");
    add("고춧가루", "1큰술", true, null, "색을 먼저 입히면 양념이 고르게 보입니다.");
    add("식초", "1큰술", true, null, "새콤한 맛은 마지막에 1작은술씩 조절하세요.");
    add("설탕", "1큰술", true, "올리고당 1큰술", "무의 매운맛을 부드럽게 잡습니다.");
    add("소금", "1/2작은술", true, null, "처음에는 적게 넣고 마지막에 맛을 봅니다.");
    add("참기름", "1작은술", false, null, "마지막에 넣으면 고소하지만 생략해도 됩니다.");
    return ingredients;
  }

  if (title === "고추참치비빔밥") {
    add("밥", "1공기", true, "즉석밥 1개", "따뜻해야 고추참치 양념이 잘 섞입니다.");
    add("고추참치캔", "1/2캔", true, "참치캔 1/2캔+고추장 1작은술", "기름과 양념을 모두 조금씩 넣으면 비비기 쉽습니다.");
    add("김", "1장", false, "김가루 2큰술", "비린맛을 잡고 고소하게 만듭니다.");
    add("참기름", "1작은술", false, "들기름 1작은술", "마지막 향을 내는 정도만 넣습니다.");
    add("참깨", "1작은술", false, "깨소금", "없어도 되지만 넣으면 간단한 한 그릇 느낌이 납니다.");
    return ingredients;
  }

  if (title === "새송이버섯볶음") {
    add("새송이버섯", "2개", true, "느타리버섯 1줌", "너무 두껍지 않게 길게 썰면 쫄깃하게 익습니다.");
    add("양파", "1/4개", false, "대파 2큰술", "단맛을 보태지만 없어도 됩니다.");
    add("식용유", "1큰술", true, null, "버섯이 팬에 붙지 않게 하는 양입니다.");
    add("간장", "1큰술", true, "소금 한 꼬집", "팬 가장자리에 넣으면 향이 빨리 올라옵니다.");
    add("참기름", "1작은술", false, null, "불을 끈 뒤 넣어야 향이 살아납니다.");
    return ingredients;
  }

  if (title === "김치참치볶음밥") {
    add("밥", "1공기", true, "즉석밥 1개", "따뜻한 밥을 쓰면 팬에서 뭉치지 않고 빨리 볶입니다.");
    add("김치", "1/2컵", true, "잘 익은 배추김치", "가위로 작게 자르면 초보자도 볶기 쉽습니다.");
    add("참치캔", "1/2캔", true, "고추참치캔 1/2캔", "기름은 반만 빼야 밥이 덜 질척합니다.");
    add("대파", "2큰술", false, "양파 1/4개", "있으면 향이 좋아지지만 없어도 됩니다.");
    add("간장", "1작은술", true, "김치국물 1큰술", "팬 가장자리에 넣으면 볶음밥 향이 납니다.");
    add("식용유", "1큰술", true, null, "김치가 팬에 붙지 않게 하는 양입니다.");
    return ingredients;
  }

  if (title === "가지무침") {
    add("가지", "1개", true, "애호박 1/2개", "길게 반 갈라 5cm 길이로 자르면 전자레인지에 고르게 익습니다.");
    add("간장", "1큰술", true, "국간장 1작은술", "처음에는 적게 넣고 마지막에 간을 봅니다.");
    add("참기름", "1작은술", true, "들기름 1작은술", "전자레인지로 익힌 가지의 물맛을 고소하게 잡습니다.");
    add("고춧가루", "1작은술", false, null, "매운맛이 싫으면 빼도 됩니다.");
    add("다진마늘", "1/2작은술", false, null, "많이 넣으면 생마늘 맛이 강하니 조금만 씁니다.");
    add("참깨", "1작은술", false, "깨소금", "마지막에 넣으면 반찬 느낌이 납니다.");
    return ingredients;
  }

  if (title === "진미채무침") {
    add("진미채", "1줌", true, "일미채 1줌", "딱딱하면 물에 30초만 헹궈 꼭 짜서 씁니다.");
    add("마요네즈", "1큰술", true, "참기름 1작은술", "진미채를 부드럽게 하고 양념이 잘 붙게 합니다.");
    add("고추장", "1큰술", true, "간장 1큰술+고춧가루 1작은술", "초보자는 많이 넣기보다 정량부터 시작합니다.");
    add("올리고당", "1큰술", true, "설탕 1큰술", "매운맛을 둥글게 잡고 윤기를 냅니다.");
    add("참기름", "1작은술", false, null, "마지막 향을 내는 정도만 넣습니다.");
    add("참깨", "1작은술", false, "깨소금", "없어도 되지만 넣으면 더 고소합니다.");
    return ingredients;
  }

  if (title === "팽이버섯덮밥") {
    add("밥", "1공기", true, "즉석밥 1개", "따뜻한 밥 위에 바로 올려야 덮밥처럼 먹기 좋습니다.");
    add("팽이버섯", "1봉", true, "느타리버섯 1줌", "밑동을 자르고 손으로 찢으면 칼질이 줄어듭니다.");
    add("계란", "1개", false, "달걀", "마지막에 넣으면 덮밥이 부드러워집니다.");
    add("간장", "1큰술", true, "굴소스 1작은술", "덮밥 간의 중심이니 처음에는 1큰술만 넣습니다.");
    add("설탕", "1/2작은술", false, "올리고당 1/2작은술", "짠맛을 부드럽게 잡습니다.");
    add("식용유", "1큰술", true, null, "팽이버섯이 팬에 붙지 않게 합니다.");
    return ingredients;
  }

  if (title === "김치비빔국수") {
    add("소면", "1인분", true, "중면 1인분", "한 줌보다 조금 적게 잡으면 초보자 1인분으로 맞추기 쉽습니다.");
    add("김치", "1/2컵", true, "잘 익은 배추김치", "가위로 작게 자르면 국수와 한입에 먹기 좋습니다.");
    add("고추장", "1큰술", true, "고춧가루 1큰술+간장 1작은술", "양념의 중심이라 처음에는 정량만 넣습니다.");
    add("식초", "1큰술", true, null, "새콤한 맛은 마지막에 1작은술씩 추가하세요.");
    add("설탕", "1큰술", true, "올리고당 1큰술", "김치의 신맛과 고추장의 매운맛을 둥글게 잡습니다.");
    add("참기름", "1작은술", false, "들기름 1작은술", "마지막 향을 내는 정도만 넣습니다.");
    return ingredients;
  }

  if (title === "두부김치") {
    add("두부", "1/2모", true, "순두부 1/2팩", "따뜻하게 데워 옆에 두면 김치볶음과 바로 먹기 좋습니다.");
    add("김치", "1컵", true, "잘 익은 배추김치", "가위로 2~3번 자르면 초보자도 볶기 쉽습니다.");
    add("대파", "2큰술", false, "양파 1/4개", "있으면 향이 좋아지지만 없어도 됩니다.");
    add("식용유", "1큰술", true, null, "김치가 팬에 붙지 않게 합니다.");
    add("설탕", "1/2작은술", false, "올리고당 1/2작은술", "김치가 많이 시면 조금만 넣습니다.");
    add("참기름", "1작은술", false, null, "불을 끈 뒤 넣으면 고소한 향이 살아납니다.");
    return ingredients;
  }

  if (title === "오이크래미무침") {
    add("오이", "1/2개", true, null, "얇게 어슷썰면 양념이 빨리 배고 먹기 편합니다.");
    add("크래미", "2개", true, "게맛살 2개", "손으로 찢으면 칼질 없이 준비할 수 있습니다.");
    add("식초", "1큰술", true, null, "새콤한 맛은 마지막에 조금씩 조절하세요.");
    add("설탕", "1큰술", true, "올리고당 1큰술", "식초의 날카로운 맛을 줄입니다.");
    add("연겨자", "1/2작은술", false, "머스터드 1작은술", "매운 향이 싫으면 빼도 됩니다.");
    add("참깨", "1작은술", false, "깨소금", "마지막에 넣으면 고소합니다.");
    return ingredients;
  }

  if (title === "참치쌈장") {
    add("참치캔", "1/2캔", true, null, "기름은 거의 빼야 쌈장이 질척하지 않습니다.");
    add("된장", "1큰술", true, "쌈장 1큰술", "간의 중심이라 처음에는 1큰술만 넣습니다.");
    add("고추장", "1작은술", false, "고춧가루 1작은술", "매운맛과 색을 더하지만 없어도 됩니다.");
    add("다진마늘", "1/2작은술", false, null, "많이 넣으면 생마늘 맛이 강합니다.");
    add("참기름", "1작은술", true, "들기름 1작은술", "참치와 된장의 짠맛을 부드럽게 합니다.");
    add("상추", "4장", false, "양배추쌈", "곁들이면 바로 한 끼로 먹기 좋습니다.");
    return ingredients;
  }

  if (title === "감자옥수수샐러드") {
    add("감자", "1개", true, "고구마 1개", "작게 자르면 전자레인지에서 빨리 익습니다.");
    add("통조림 옥수수", "3큰술", true, "냉동 옥수수 3큰술", "물기를 빼야 샐러드가 질어지지 않습니다.");
    add("마요네즈", "1큰술", true, "플레인 요거트 1큰술", "감자를 부드럽게 묶는 역할입니다.");
    add("소금", "한 꼬집", true, null, "감자가 싱거우면 맛이 흐려지니 아주 조금만 넣습니다.");
    add("후추", "약간", false, null, "느끼함을 줄이고 향을 더합니다.");
    add("식빵", "1장", false, "모닝빵 1개", "샌드위치로 먹고 싶을 때 곁들입니다.");
    return ingredients;
  }

  if (title === "김치덮밥") {
    add("밥", "1공기", true, "즉석밥 1개", "따뜻하게 데워야 볶은 김치와 잘 섞입니다.");
    add("김치", "3/4컵", true, "잘 익은 배추김치", "국물을 살짝 짜고 작게 자르면 덮밥이 질척하지 않습니다.");
    add("계란", "1개", false, null, "프라이를 올리면 김치의 짠맛을 부드럽게 잡습니다.");
    add("식용유", "1작은술", true, null, "김치를 볶을 때 팬에 얇게 두릅니다.");
    add("설탕", "1/2작은술", false, "올리고당 1/2작은술", "김치가 많이 시면 조금만 넣습니다.");
    add("참기름", "1작은술", false, "들기름 1작은술", "불을 끈 뒤 넣어야 향이 살아납니다.");
    add("김가루", "1큰술", false, "김 1/2장", "마지막에 올리면 한 그릇 느낌이 납니다.");
    return ingredients;
  }

  if (title === "김치계란밥") {
    add("밥", "1공기", true, "즉석밥 1개", "따뜻할수록 계란과 김치가 고르게 비벼집니다.");
    add("계란", "2개", true, "달걀 2개", "한 개는 부족할 수 있어 2개가 초보자 한 끼에 안정적입니다.");
    add("김치", "1/2컵", true, "잘 익은 배추김치", "가위로 작게 자르면 계란과 같이 먹기 쉽습니다.");
    add("간장", "1작은술", true, "소금 한 꼬집", "김치가 짜면 생략해도 됩니다.");
    add("참기름", "1작은술", false, "들기름 1작은술", "불을 끈 뒤 넣으면 고소합니다.");
    add("김가루", "1큰술", false, "김 1/2장", "마지막에 넣으면 물기를 잡아줍니다.");
    return ingredients;
  }

  if (title === "주먹밥") {
    add("밥", "1공기", true, "즉석밥 1개", "따뜻할 때 양념해야 잘 뭉쳐집니다.");
    add("김가루", "2큰술", true, "김 1장", "김을 잘게 부수면 초보자도 모양 잡기가 쉽습니다.");
    add("참기름", "1작은술", true, "들기름 1작은술", "밥을 고소하게 하고 덜 달라붙게 합니다.");
    add("참깨", "1작은술", false, "깨소금", "마지막 고소함을 더합니다.");
    add("소금", "한 꼬집", true, "간장 1/2작은술", "간은 아주 약하게 시작해야 짜지 않습니다.");
    return ingredients;
  }

  if (title === "김치주먹밥") {
    add("밥", "1공기", true, "즉석밥 1개", "따뜻할 때 섞어야 김치와 잘 붙습니다.");
    add("김치", "1/2컵", true, "잘 익은 배추김치", "국물을 꼭 짜야 주먹밥이 질어지지 않습니다.");
    add("김가루", "2큰술", true, "김 1장", "김가루가 김치 수분을 잡아 모양을 유지합니다.");
    add("참기름", "1작은술", true, "들기름 1작은술", "김치의 신맛을 부드럽게 합니다.");
    add("참깨", "1작은술", false, "깨소금", "마지막에 섞으면 고소합니다.");
    add("설탕", "1/3작은술", false, "올리고당 아주 조금", "김치가 많이 시면 조금만 넣습니다.");
    return ingredients;
  }

  if (title === "스팸마요덮밥") {
    add("밥", "1공기", true, "즉석밥 1개", "따뜻하게 데워야 토핑과 잘 섞입니다.");
    add("스팸", "1/3캔", true, "햄 1/3컵", "작게 썰어야 짠맛이 한쪽에 몰리지 않습니다.");
    add("계란", "1개", false, null, "스크램블이나 프라이로 올리면 짠맛이 부드러워집니다.");
    add("마요네즈", "1큰술", true, null, "많이 넣으면 느끼하니 1큰술부터 시작합니다.");
    add("간장", "1작은술", false, "소금 한 꼬집", "스팸이 짜면 생략해도 됩니다.");
    add("식용유", "1작은술", true, null, "스팸과 계란을 익힐 때 팬에 얇게 두릅니다.");
    add("김가루", "1큰술", false, "김 1/2장", "마지막에 올리면 한 그릇 느낌이 납니다.");
    return ingredients;
  }

  if (title === "콩나물밥") {
    add("밥", "1공기", true, "즉석밥 1개", "따뜻하게 데워 콩나물과 바로 섞습니다.");
    add("콩나물", "1줌", true, "숙주 1줌", "처음에는 한 줌만 쓰면 실패가 적습니다.");
    add("물", "1/2컵", true, null, "콩나물을 짧게 익히는 양입니다.");
    add("간장", "1큰술", true, "국간장 1작은술", "비벼 먹는 양념의 기본 간입니다.");
    add("참기름", "1작은술", true, "들기름 1작은술", "콩나물 비린 향을 줄이고 고소하게 합니다.");
    add("대파", "1큰술", false, "부추 1큰술", "양념장에 넣으면 향이 좋아집니다.");
    add("참깨", "1작은술", false, "깨소금", "마지막에 뿌리면 고소합니다.");
    return ingredients;
  }

  if (title === "간장버터밥") {
    add("밥", "1공기", true, "즉석밥 1개", "뜨거워야 버터가 덩어리 없이 녹습니다.");
    add("버터", "1작은술", true, null, "많이 넣으면 느끼하니 작은 숟가락 1번만 넣습니다.");
    add("간장", "1큰술", true, "소금 한 꼬집", "버터가 들어가므로 처음에는 1큰술만 넣습니다.");
    add("참깨", "1작은술", false, "깨소금", "마지막에 넣으면 고소합니다.");
    add("김가루", "1큰술", false, "김 1/2장", "느끼함을 잡고 간을 부드럽게 합니다.");
    return ingredients;
  }

  if (title === "참치주먹밥") {
    add("밥", "1공기", true, "즉석밥 1개", "따뜻할 때 섞어야 참치와 잘 붙습니다.");
    add("참치캔", "1/2캔", true, null, "기름을 대부분 빼야 주먹밥이 질어지지 않습니다.");
    add("김가루", "2큰술", true, "김 1장", "참치 수분을 잡아 모양을 유지합니다.");
    add("마요네즈", "1작은술", false, "참기름 1작은술", "참치를 부드럽게 묶지만 많이 넣으면 질어집니다.");
    add("간장", "1작은술", true, "소금 한 꼬집", "참치 비린맛을 줄이고 간을 맞춥니다.");
    add("참깨", "1작은술", false, "깨소금", "마지막 고소함을 더합니다.");
    return ingredients;
  }

  if (title === "깻잎주먹밥") {
    add("밥", "1공기", true, "즉석밥 1개", "따뜻할 때 양념해야 잘 뭉쳐집니다.");
    add("깻잎", "4~6장", true, "김 1장", "물기를 꼭 털어야 밥이 질어지지 않습니다.");
    add("김가루", "2큰술", true, "김 1장", "깻잎 향과 밥을 잘 묶어줍니다.");
    add("참기름", "1작은술", true, "들기름 1작은술", "깻잎 향을 부드럽게 합니다.");
    add("소금", "한 꼬집", true, "간장 1/2작은술", "간은 약하게 시작해야 짜지 않습니다.");
    add("참깨", "1작은술", false, "깨소금", "마지막 고소함을 더합니다.");
    return ingredients;
  }

  if (title === "나물비빔밥") {
    add("밥", "1공기", true, "즉석밥 1개", "따뜻할수록 나물과 양념이 잘 섞입니다.");
    add("시판 나물", "1컵", true, "남은 나물 1컵", "처음에는 이미 무쳐진 나물을 쓰면 실패가 적습니다.");
    add("계란", "1개", false, "구운계란 1개", "있으면 한 끼가 더 든든해집니다.");
    add("간장", "1큰술", true, "고추장 1작은술", "맵지 않은 기본 비빔 양념입니다.");
    add("참기름", "1작은술", true, "들기름 1작은술", "나물 향을 살리고 밥을 부드럽게 합니다.");
    add("참깨", "1작은술", false, "깨소금", "마지막에 뿌리면 고소합니다.");
    return ingredients;
  }

  if (title === "두부부침") {
    add("두부", "1모", true, "부침용 두부 1모", "단단한 두부가 덜 부서져 초보자에게 쉽습니다.");
    add("식용유", "1큰술", true, null, "두부가 팬에 달라붙지 않게 합니다.");
    add("소금", "한 꼬집", true, null, "두부 밑간은 아주 약하게 합니다.");
    add("간장", "1큰술", true, "초간장 1큰술", "찍어 먹는 양념의 기본입니다.");
    add("대파", "1큰술", false, "쪽파 1큰술", "간장에 섞으면 향이 좋아집니다.");
    add("참기름", "1/2작은술", false, null, "간장 양념에 조금만 넣습니다.");
    return ingredients;
  }

  if (title === "두부조림") {
    add("두부", "1모", true, "부침용 두부 1모", "단단한 두부가 조릴 때 덜 부서집니다.");
    add("식용유", "1큰술", true, null, "두부 겉면을 먼저 잡아줍니다.");
    add("간장", "2큰술", true, null, "조림 양념의 기준입니다.");
    add("물", "1/2컵", true, null, "양념이 타지 않게 합니다.");
    add("설탕", "1작은술", true, "올리고당 1작은술", "간장의 짠맛을 부드럽게 합니다.");
    add("대파", "2큰술", false, "양파 2큰술", "마지막 향을 더합니다.");
    add("고춧가루", "1작은술", false, null, "매운맛이 싫으면 빼도 됩니다.");
    return ingredients;
  }

  if (title === "가지덮밥") {
    add("밥", "1공기", true, "즉석밥 1개", "따뜻한 밥 위에 바로 올려야 덮밥처럼 먹기 좋습니다.");
    add("가지", "1개", true, "애호박 1/2개", "반달 모양으로 얇게 썰면 빨리 익습니다.");
    add("간장", "1큰술", true, "굴소스 1작은술", "덮밥 양념의 중심입니다.");
    add("설탕", "1/2작은술", false, "올리고당 1/2작은술", "간장의 짠맛을 부드럽게 잡습니다.");
    add("식용유", "1큰술", true, null, "가지가 팬에 붙지 않게 합니다.");
    add("참기름", "1작은술", false, null, "불을 끈 뒤 넣으면 고소합니다.");
    return ingredients;
  }

  if (title === "두부샐러드") {
    add("두부", "1/2모", true, "연두부 1팩", "물기를 빼야 소스가 싱거워지지 않습니다.");
    add("삶은계란", "1개", false, "구운계란 1개", "시판 삶은계란을 쓰면 불 없이 만들 수 있습니다.");
    add("상추", "4장", true, "양상추 2줌", "손으로 찢으면 칼질 없이 준비할 수 있습니다.");
    add("간장", "1큰술", true, "참깨드레싱 1큰술", "간단한 드레싱의 기본입니다.");
    add("참기름", "1작은술", true, "올리브유 1작은술", "두부의 밋밋함을 잡아 줍니다.");
    add("참깨", "1작은술", false, "깨소금", "마지막에 뿌리면 고소합니다.");
    return ingredients;
  }

  if (title === "간장계란장") {
    add("계란", "4개", true, "시판 삶은계란 4개", "처음 만들 때는 4개가 양념 비율 맞추기 쉽습니다.");
    add("간장", "4큰술", true, null, "계란 4개 기준 기본 간입니다.");
    add("물", "4큰술", true, null, "간장을 같은 양으로 희석해야 너무 짜지 않습니다.");
    add("설탕", "1큰술", true, "올리고당 1큰술", "간장의 짠맛을 부드럽게 잡습니다.");
    add("대파", "2큰술", false, "양파 2큰술", "잘게 썰어 넣으면 향이 좋아집니다.");
    add("참기름", "1작은술", false, null, "밥에 올려 먹을 때 마지막에 넣어도 됩니다.");
    return ingredients;
  }

  if (title === "양배추라페") {
    add("양배추", "2줌", true, "적채 1줌", "얇게 채 썰수록 소스가 빨리 배고 먹기 쉽습니다.");
    add("당근", "1/4개", false, "오이 1/3개", "색과 식감을 더하지만 없으면 양배추만으로도 됩니다.");
    add("식초", "1큰술", true, "레몬즙 1큰술", "새콤한 맛의 중심이라 처음에는 정량만 넣습니다.");
    add("설탕", "1큰술", true, "올리고당 1큰술", "식초의 날카로운 맛을 부드럽게 잡습니다.");
    add("소금", "한 꼬집", true, null, "채소 숨을 살짝 죽이고 간을 맞추는 양입니다.");
    add("올리브유", "1큰술", false, "식용유 1작은술", "윤기를 더하지만 없으면 생략해도 됩니다.");
    return ingredients;
  }

  if (title === "토마토마리네이드") {
    add("방울토마토", "10개", true, "토마토 1개", "반으로 자르면 소스가 빨리 배어듭니다.");
    add("양파", "2큰술", false, "오이 2큰술", "아주 얇게 썰어야 매운맛이 덜합니다.");
    add("올리브유", "1큰술", true, "식용유 1작은술", "토마토 표면에 소스를 붙게 합니다.");
    add("식초", "1큰술", true, "레몬즙 1큰술", "상큼한 맛을 내는 핵심입니다.");
    add("설탕", "1작은술", true, "올리고당 1작은술", "토마토 산미를 둥글게 잡습니다.");
    add("소금", "한 꼬집", true, null, "많이 넣으면 물이 빨리 나오니 아주 조금만 넣습니다.");
    return ingredients;
  }

  if (title === "상추겉절이") {
    add("상추", "8장", true, "양상추 2줌", "손으로 한입 크기로 찢으면 칼질 없이 준비됩니다.");
    add("간장", "1큰술", true, "액젓 1작은술", "간의 중심이라 처음에는 1큰술만 넣습니다.");
    add("식초", "1큰술", true, null, "상추를 산뜻하게 만드는 양입니다.");
    add("설탕", "1작은술", true, "올리고당 1작은술", "식초와 간장의 날카로운 맛을 줄입니다.");
    add("고춧가루", "1작은술", true, null, "색과 매운맛을 내지만 맵게 먹지 않으려면 반만 넣으세요.");
    add("참기름", "1작은술", true, "들기름 1작은술", "마지막 고소한 향을 냅니다.");
    add("참깨", "1작은술", false, "깨소금", "마지막에 뿌리면 겉절이 느낌이 납니다.");
    return ingredients;
  }

  if (title === "김치말이국수") {
    add("소면", "1인분", true, "중면 1인분", "500원 동전 굵기보다 조금 적게 잡으면 1인분입니다.");
    add("김치", "1/2컵", true, "잘 익은 배추김치", "가위로 작게 자르면 면과 같이 먹기 좋습니다.");
    add("시판 냉면육수", "1봉", true, "찬물 1컵+김치국물 1/2컵", "초보자는 시판 육수를 쓰면 간 맞추기가 쉽습니다.");
    add("오이", "1/4개", false, "김가루", "채 썰어 올리면 시원하지만 없어도 됩니다.");
    add("식초", "1작은술", false, null, "더 새콤하게 먹고 싶을 때만 넣습니다.");
    add("설탕", "1작은술", false, "올리고당 1작은술", "김치가 많이 시면 조금만 넣습니다.");
    add("참깨", "1작은술", false, "깨소금", "마지막에 뿌리면 고소합니다.");
    return ingredients;
  }

  if (title === "오이계란샌드위치") {
    add("식빵", "2장", true, "모닝빵 2개", "너무 두껍지 않은 기본 식빵이 초보자가 자르기 쉽습니다.");
    add("삶은계란", "2개", true, "구운계란 2개", "시판 삶은계란을 쓰면 불 없이 바로 만들 수 있습니다.");
    add("오이", "1/3개", true, null, "얇게 썰어야 빵 사이에서 빠지지 않습니다.");
    add("마요네즈", "1큰술", true, "플레인 요거트 1큰술", "계란을 부드럽게 묶는 역할입니다.");
    add("소금", "한 꼬집", true, null, "계란 간을 살짝 맞추는 정도입니다.");
    add("후추", "약간", false, null, "느끼함을 줄이고 향을 더합니다.");
    return ingredients;
  }

  if (title === "양배추참치샐러드") {
    add("양배추", "2줌", true, "양상추 2줌", "얇게 썰수록 참치와 잘 섞입니다.");
    add("참치캔", "1/2캔", true, null, "기름은 거의 빼야 샐러드가 질척하지 않습니다.");
    add("마요네즈", "1큰술", true, "플레인 요거트 1큰술", "재료를 묶는 정도만 넣습니다.");
    add("간장", "1작은술", false, "소금 한 꼬집", "참치의 비린맛을 줄이고 간을 잡습니다.");
    add("후추", "약간", false, null, "느끼함을 줄입니다.");
    add("참깨", "1작은술", false, "깨소금", "마지막에 뿌리면 고소합니다.");
    return ingredients;
  }

  if (title === "오이김밥") {
    add("김", "1장", true, "김밥김 1장", "구멍이 없는 김을 쓰면 말기 쉽습니다.");
    add("밥", "1공기", true, "즉석밥 1개", "따뜻할 때 양념해야 잘 펴집니다.");
    add("오이", "1/2개", true, null, "길게 잘라야 김밥 속에 곧게 들어갑니다.");
    add("참기름", "1작은술", true, "들기름 1작은술", "밥이 마르지 않고 고소해집니다.");
    add("소금", "한 꼬집", true, null, "밥 간을 맞추는 양입니다.");
    add("참깨", "1작은술", false, "깨소금", "밥에 섞으면 고소합니다.");
    return ingredients;
  }

  if (title === "콩나물비빔라면") {
    add("라면", "1봉", true, "비빔면 1봉", "면은 살짝 덜 익혀야 비빌 때 퍼지지 않습니다.");
    add("콩나물", "1줌", true, "숙주 1줌", "면과 같이 데치면 아삭한 식감이 납니다.");
    add("라면스프", "1/2봉", true, "고추장 1큰술", "전부 넣으면 짤 수 있어 절반부터 시작합니다.");
    add("고추장", "1작은술", false, "고춧가루 1작은술", "매운맛을 더하고 싶을 때만 넣습니다.");
    add("식초", "1큰술", true, null, "비빔라면의 새콤한 맛을 냅니다.");
    add("설탕", "1작은술", true, "올리고당 1작은술", "매운맛을 부드럽게 잡습니다.");
    add("참기름", "1작은술", false, "들기름 1작은술", "마지막 향을 더합니다.");
    return ingredients;
  }

  if (title === "참치김치찌개") {
    add("김치", "1컵", true, "잘 익은 배추김치", "가위로 작게 자르면 초보자도 숟가락으로 먹기 쉽습니다.");
    add("참치캔", "1/2캔", true, null, "기름은 1큰술만 남기고 넣으면 국물이 덜 느끼합니다.");
    add("물", "2컵", true, null, "김치가 짜도 물을 먼저 정량 넣어야 간 조절이 쉽습니다.");
    add("국간장", "1큰술", true, "간장 1큰술", "처음에는 1큰술만 넣고 마지막에 맛을 봅니다.");
    add("두부", "1/2모", false, "순두부 1/2팩", "있으면 넣고 없으면 생략해도 찌개가 됩니다.");
    add("대파", "2큰술", false, "양파 2큰술", "마지막 향을 더하는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "참치두부조림") {
    add("두부", "1/2모", true, "부침용 두부 1/2모", "단단한 두부가 조릴 때 덜 부서집니다.");
    add("참치캔", "1/2캔", true, null, "기름은 거의 빼야 양념이 너무 느끼하지 않습니다.");
    add("간장", "2큰술", true, null, "조림 양념의 기준이라 꼭 계량합니다.");
    add("물", "1/2컵", true, null, "간장이 타지 않게 하는 안전장치입니다.");
    add("설탕", "1작은술", false, "올리고당 1작은술", "짠맛을 부드럽게 하고 싶을 때만 넣습니다.");
    add("대파", "1큰술", false, "양파 2큰술", "마지막 향을 더하는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "스팸김치볶음") {
    add("스팸", "1/3캔", true, "햄 1/3컵", "작게 썰어야 짠맛이 한쪽에 몰리지 않습니다.");
    add("김치", "1컵", true, "잘 익은 배추김치", "국물을 살짝 짜고 자르면 볶을 때 덜 튑니다.");
    add("식용유", "1작은술", false, null, "스팸에서 기름이 나오면 생략해도 됩니다.");
    add("양파", "1/4개", false, "대파 2큰술", "단맛을 더하지만 없어도 됩니다.");
    add("설탕", "1/2작은술", false, "올리고당 1/2작은술", "김치가 많이 시면 조금만 넣습니다.");
    add("참기름", "1작은술", false, null, "불을 끈 뒤 넣으면 고소합니다.");
    return ingredients;
  }

  if (title === "햄감자볶음") {
    add("감자", "1개", true, "고구마 1개", "얇은 반달 모양으로 썰면 초보자도 속까지 익히기 쉽습니다.");
    add("햄", "1/3컵", true, "스팸 1/4캔", "작게 썰어야 감자와 한입에 먹기 좋습니다.");
    add("식용유", "1큰술", true, null, "감자가 팬에 붙지 않게 합니다.");
    add("물", "2큰술", true, null, "감자를 먼저 익히는 동안 타지 않게 합니다.");
    add("간장", "1작은술", false, "소금 한 꼬집", "햄이 짜면 생략해도 됩니다.");
    add("참깨", "1작은술", false, "깨소금", "마지막에 뿌리면 보기 좋습니다.");
    return ingredients;
  }

  if (title === "어묵볶음") {
    add("어묵", "3장", true, "사각어묵 3장", "가위로 잘라도 되니 칼이 서툴러도 괜찮습니다.");
    add("식용유", "1큰술", true, null, "어묵이 팬에 붙지 않게 합니다.");
    add("간장", "1큰술", true, null, "처음부터 많이 넣지 말고 1큰술에서 멈춥니다.");
    add("물", "2큰술", true, null, "간장이 바로 타지 않게 합니다.");
    add("양파", "1/4개", false, "대파 1큰술", "단맛과 향을 더하지만 없어도 됩니다.");
    add("설탕", "1작은술", false, "올리고당 1작은술", "단맛이 필요할 때만 넣습니다.");
    add("대파", "1큰술", false, "양파 1/4개", "마지막 향을 더하지만 없어도 됩니다.");
    return ingredients;
  }

  if (title === "어묵탕") {
    add("어묵", "3장", true, "꼬치어묵 3개", "한입 크기로 자르면 숟가락으로 먹기 쉽습니다.");
    add("물", "2컵", true, null, "국물 양의 기준입니다.");
    add("국간장", "1큰술", true, "간장 1큰술", "처음에는 1큰술만 넣고 마지막에 맛을 봅니다.");
    add("무", "1/2컵", false, null, "있으면 국물이 시원하지만 없어도 됩니다.");
    add("대파", "2큰술", false, "양파 2큰술", "마지막 향을 더하는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "어묵우동") {
    add("우동면", "1봉", true, "냉동 우동면 1개", "포장지의 조리 시간을 먼저 확인하면 실패가 적습니다.");
    add("어묵", "2장", true, "꼬치어묵 2개", "한입 크기로 자르면 면과 같이 먹기 좋습니다.");
    add("물", "2.5컵", true, null, "면과 어묵을 같이 끓일 국물 양입니다.");
    add("국간장", "1큰술", true, "쯔유 1큰술", "처음에는 1큰술만 넣고 마지막에 맛을 봅니다.");
    add("대파", "2큰술", false, "김가루 1큰술", "마지막 향을 더하지만 없어도 됩니다.");
    return ingredients;
  }

  if (title === "소시지야채볶음") {
    add("소시지", "2개", true, "비엔나소시지 6개", "칼집을 조금 넣으면 속까지 따뜻해지기 쉽습니다.");
    add("양파", "1/4개", false, "파프리카 1/4개", "야채가 있으면 같이 볶고 없으면 소시지만으로도 됩니다.");
    add("식용유", "1작은술", true, null, "팬에 붙지 않게 얇게 두르는 양입니다.");
    add("케첩", "1큰술", false, "간장 1작은술", "아이도 먹기 쉬운 맛을 내는 선택 양념입니다.");
    add("간장", "1작은술", false, "소금 한 꼬집", "케첩을 쓰지 않을 때만 살짝 넣습니다.");
    return ingredients;
  }

  if (title === "참치샐러드") {
    add("참치캔", "1/2캔", true, null, "기름이나 물을 거의 빼야 샐러드가 질척하지 않습니다.");
    add("마요네즈", "1큰술", true, "플레인 요거트 1큰술", "참치를 부드럽게 묶는 기본 재료입니다.");
    add("오이", "1/4개", false, "양배추 조금", "아삭함을 더하지만 없으면 생략해도 됩니다.");
    add("소금", "한 꼬집", false, "간장 1/2작은술", "맛을 본 뒤 싱거울 때만 넣습니다.");
    add("후추", "조금", false, null, "느끼함을 줄이고 싶을 때만 넣습니다.");
    return ingredients;
  }

  if (title === "통조림옥수수햄볶음") {
    add("통조림 옥수수", "1/2컵", true, "냉동 옥수수 1/2컵", "물기를 빼야 팬에서 튀지 않고 질척하지 않습니다.");
    add("햄", "1/3컵", true, "스팸 1/4캔", "작게 썰어야 옥수수와 같이 숟가락에 올라갑니다.");
    add("식용유", "1작은술", true, null, "팬에 붙지 않게 하는 최소량입니다.");
    add("간장", "1작은술", false, "소금 한 꼬집", "햄이 짜면 생략해도 됩니다.");
    add("버터", "1작은술", false, null, "고소하게 먹고 싶을 때만 마지막에 넣습니다.");
    return ingredients;
  }

  if (title === "어묵달걀국") {
    add("어묵", "2장", true, "사각어묵 2장", "한입 크기로 자르면 숟가락으로 먹기 쉽습니다.");
    add("계란", "1개", true, "달걀 1개", "그릇에 먼저 풀어야 국물에 부드럽게 퍼집니다.");
    add("물", "2컵", true, null, "국물 양의 기준입니다.");
    add("국간장", "1큰술", true, "간장 1큰술", "처음에는 1큰술만 넣고 마지막에 맛을 봅니다.");
    add("대파", "2큰술", false, "양파 2큰술", "마지막 향을 더하는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "어묵간장볶음") {
    add("어묵", "3장", true, "사각어묵 3장", "가위로 잘라도 되니 칼이 서툴러도 괜찮습니다.");
    add("식용유", "1큰술", true, null, "어묵이 팬에 붙지 않게 합니다.");
    add("간장", "1큰술", true, null, "볶음 양념의 기준이라 1큰술만 넣습니다.");
    add("물", "2큰술", true, null, "간장이 바로 타지 않게 합니다.");
    add("설탕", "1작은술", false, "올리고당 1작은술", "단맛이 필요할 때만 넣습니다.");
    add("대파", "1큰술", false, "양파 1/4개", "마지막 향을 더하지만 없어도 됩니다.");
    return ingredients;
  }

  if (title === "참치양배추덮밥") {
    add("밥", "1공기", true, "즉석밥 1개", "따뜻한 밥이어야 토핑과 잘 비벼집니다.");
    add("참치캔", "1/2캔", true, null, "기름은 거의 빼야 덮밥이 질척하지 않습니다.");
    add("양배추", "1컵", true, "채 썬 배추 1컵", "얇게 썰어야 짧은 시간에 부드러워집니다.");
    add("식용유", "1작은술", true, null, "양배추가 팬에 붙지 않게 합니다.");
    add("간장", "1큰술", true, null, "덮밥 간의 기준입니다.");
    add("물", "1큰술", false, null, "팬이 마를 때만 넣어 타는 것을 막습니다.");
    return ingredients;
  }

  if (title === "햄계란전") {
    add("계란", "2개", true, "달걀 2개", "계란물이 전의 기본이라 먼저 풀어 둡니다.");
    add("햄", "1/3컵", true, "스팸 1/4캔", "작게 썰어야 계란 안에서 골고루 익습니다.");
    add("식용유", "1큰술", true, null, "팬에 전이 붙지 않게 합니다.");
    add("소금", "한 꼬집", false, null, "햄이 싱거울 때만 넣습니다.");
    add("케첩", "1큰술", false, "간장 1작은술", "찍어 먹는 선택 소스입니다.");
    return ingredients;
  }

  if (title === "깻잎어묵볶음") {
    add("어묵", "3장", true, "사각어묵 3장", "가위로 길게 잘라도 됩니다.");
    add("깻잎", "6장", true, "대파 2큰술", "마지막에 넣어야 향이 살아납니다.");
    add("식용유", "1큰술", true, null, "어묵이 팬에 붙지 않게 합니다.");
    add("간장", "1큰술", true, null, "볶음 양념의 기준입니다.");
    add("물", "2큰술", true, null, "간장이 바로 타지 않게 합니다.");
    add("설탕", "1작은술", false, "올리고당 1작은술", "단맛이 필요할 때만 넣습니다.");
    return ingredients;
  }

  if (title === "참치오이무침") {
    add("참치캔", "1/2캔", true, null, "기름이나 물을 빼야 무침이 질척하지 않습니다.");
    add("오이", "1/2개", true, "양배추 1컵", "얇게 썰어야 참치와 같이 먹기 쉽습니다.");
    add("간장", "1작은술", true, "소금 한 꼬집", "처음에는 적게 넣고 맛을 봅니다.");
    add("참기름", "1작은술", false, null, "고소한 향을 더하지만 없어도 됩니다.");
    add("참깨", "1작은술", false, "깨소금", "마지막에 뿌리는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "된장두부국") {
    add("된장", "1큰술", true, null, "국물 간의 기준이라 먼저 풀어 줍니다.");
    add("두부", "1/2모", true, "찌개용 두부 1/2모", "숟가락에 올라가는 크기로 자릅니다.");
    add("물", "2컵", true, null, "국물 양의 기준입니다.");
    add("애호박", "1/4개", false, "양파 1/4개", "있으면 국물이 더 달지만 없어도 됩니다.");
    add("대파", "1큰술", false, null, "마지막 향을 더하는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "미역국") {
    add("불린 미역", "1컵", true, "마른 미역 1큰술을 불린 것", "먹기 좋게 가위로 자르면 초보자도 편합니다.");
    add("물", "2.5컵", true, null, "미역이 불면서 국물을 먹으니 2컵보다 조금 넉넉히 넣습니다.");
    add("국간장", "1큰술", true, "간장 1큰술", "처음에는 1큰술만 넣고 마지막에 맛을 봅니다.");
    add("참기름", "1작은술", false, null, "미역을 먼저 볶으면 고소하지만 없어도 됩니다.");
    add("대파", "1큰술", false, null, "마지막 향을 더하는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "북엇국") {
    add("북어채", "1줌", true, "황태채 1줌", "긴 조각은 가위로 잘라야 숟가락으로 먹기 쉽습니다.");
    add("물", "2.5컵", true, "멸치육수 2.5컵", "북어채가 국물을 먹으니 조금 넉넉히 넣습니다.");
    add("국간장", "1큰술", true, "간장 1큰술", "처음에는 1큰술만 넣고 마지막에 맛을 봅니다.");
    add("계란", "1개", false, "달걀 1개", "있으면 풀어 넣어 더 부드럽게 만듭니다.");
    add("대파", "1큰술", false, null, "마지막 향을 더하는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "김치국") {
    add("김치", "1컵", true, "잘 익은 배추김치", "가위로 작게 자르면 숟가락으로 먹기 쉽습니다.");
    add("물", "2.5컵", true, "멸치육수 2.5컵", "김치가 짜도 물을 정량 넣어야 간 조절이 쉽습니다.");
    add("국간장", "1큰술", true, "간장 1큰술", "처음에는 1큰술만 넣고 마지막에 맛을 봅니다.");
    add("두부", "1/2모", false, "어묵 1장", "있으면 넣고 없어도 김치국은 됩니다.");
    add("대파", "1큰술", false, null, "마지막 향을 더하는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "된장찌개") {
    add("된장", "2큰술", true, null, "밥숟가락으로 평평하게 2번 넣고, 싱거우면 마지막에 조금 더 넣습니다.");
    add("두부", "1/2모", true, "찌개용 두부 1/2모", "숟가락에 올라가는 크기로 자릅니다.");
    add("물", "2컵", true, null, "국물 양의 기준입니다.");
    add("애호박", "1/3개", true, "양파 1/4개", "손가락 두 마디 길이만큼 썰어 넣습니다.");
    add("양파", "1/4개", true, null, "얇게 썰면 빨리 익습니다.");
    add("대파", "1/2대", true, null, "마지막에 넣어 향을 냅니다.");
    return ingredients;
  }

  if (title === "김치찌개") {
    add("김치", "1컵", true, "잘 익은 배추김치", "가위로 작게 자르면 초보자도 먹기 쉽습니다.");
    add("물", "2컵", true, null, "김치찌개 국물 양의 기준입니다.");
    add("국간장", "1큰술", true, "간장 1큰술", "처음에는 1큰술만 넣고 마지막에 맛을 봅니다.");
    add("두부", "1/2모", false, "참치캔 1/2캔", "있으면 넣고 없어도 됩니다.");
    add("대파", "1큰술", false, null, "마지막 향을 더하는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "두부버섯국") {
    add("두부", "1/2모", true, "순두부 1/2팩", "숟가락에 올라가는 크기로 자릅니다.");
    add("버섯", "1줌", true, "팽이버섯 1/2봉", "손으로 찢으면 칼 없이도 준비됩니다.");
    add("물", "2컵", true, null, "국물 양의 기준입니다.");
    add("국간장", "1큰술", true, "간장 1큰술", "처음에는 1큰술만 넣고 마지막에 맛을 봅니다.");
    add("대파", "1큰술", false, null, "마지막 향을 더하는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "떡국떡달걀국") {
    add("떡국떡", "1컵", true, "냉동 떡국떡 1컵", "딱딱하면 물에 5분 담가 두면 빨리 익습니다.");
    add("계란", "1개", true, "달걀 1개", "그릇에 먼저 풀어야 국물에 부드럽게 퍼집니다.");
    add("물", "2.5컵", true, null, "떡이 익는 동안 줄어들 수 있어 조금 넉넉히 넣습니다.");
    add("국간장", "1큰술", true, "간장 1큰술", "처음에는 1큰술만 넣고 마지막에 맛을 봅니다.");
    add("대파", "1큰술", false, null, "마지막 향을 더하는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "감자된장국") {
    add("감자", "1개", true, "고구마 1개", "얇게 썰어야 국에서 빨리 익습니다.");
    add("된장", "1큰술", true, null, "국물 간의 기준이라 먼저 풀어 줍니다.");
    add("물", "2.5컵", true, null, "감자가 익는 동안 줄어들 수 있어 조금 넉넉히 넣습니다.");
    add("두부", "1/2모", false, "애호박 1/4개", "있으면 넣고 없어도 감자된장국은 됩니다.");
    add("대파", "1큰술", false, null, "마지막 향을 더하는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "콩나물김치국") {
    add("콩나물", "1줌", true, "숙주 1줌", "물에 한 번 헹구면 냄새가 줄어듭니다.");
    add("김치", "1/2컵", true, "잘 익은 배추김치", "가위로 작게 자르면 숟가락으로 먹기 쉽습니다.");
    add("물", "2.5컵", true, "멸치육수 2.5컵", "콩나물과 김치가 잠길 정도의 국물 양입니다.");
    add("국간장", "1큰술", true, "간장 1큰술", "김치 간을 본 뒤 부족할 때만 씁니다.");
    add("대파", "1큰술", false, null, "마지막 향을 더하는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "순두부국") {
    add("순두부", "1팩", true, "연두부 1팩", "숟가락으로 크게 떠 넣으면 칼이 필요 없습니다.");
    add("물", "2컵", true, null, "국물 양의 기준입니다.");
    add("국간장", "1큰술", true, "간장 1큰술", "처음에는 1큰술만 넣고 마지막에 맛을 봅니다.");
    add("계란", "1개", false, "달걀 1개", "있으면 마지막에 풀어 넣어 부드럽게 만듭니다.");
    add("대파", "1큰술", false, null, "마지막 향을 더하는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "애호박된장국") {
    add("애호박", "1/3개", true, "양파 1/4개", "얇게 반달 모양으로 썰면 빨리 익습니다.");
    add("된장", "1큰술", true, null, "국물 간의 기준이라 먼저 풀어 줍니다.");
    add("물", "2컵", true, null, "국물 양의 기준입니다.");
    add("두부", "1/2모", false, "감자 1/2개", "있으면 넣고 없어도 됩니다.");
    add("대파", "1큰술", false, null, "마지막 향을 더하는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "양파국") {
    add("양파", "1/2개", true, "대파 1대", "얇게 썰수록 단맛이 빨리 나옵니다.");
    add("물", "2컵", true, null, "국물 양의 기준입니다.");
    add("국간장", "1큰술", true, "간장 1큰술", "처음에는 1큰술만 넣고 마지막에 맛을 봅니다.");
    add("계란", "1개", false, "달걀 1개", "있으면 풀어 넣어 한 끼 국으로 든든해집니다.");
    add("후추", "조금", false, null, "마지막 향을 더하는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "배추된장국") {
    add("배추", "2장", true, "알배추 3장", "잎과 줄기를 한입 크기로 자릅니다.");
    add("된장", "1큰술", true, null, "국물 간의 기준이라 먼저 풀어 줍니다.");
    add("물", "2.5컵", true, null, "배추가 익으며 국물을 먹으니 조금 넉넉히 넣습니다.");
    add("두부", "1/2모", false, "감자 1/2개", "있으면 넣고 없어도 됩니다.");
    add("대파", "1큰술", false, null, "마지막 향을 더하는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "만두국") {
    add("냉동만두", "4개", true, "물만두 8개", "해동하지 않고 바로 넣어도 됩니다.");
    add("물", "2.5컵", true, "멸치육수 2.5컵", "만두가 잠길 정도의 국물 양입니다.");
    add("국간장", "1큰술", true, "간장 1큰술", "처음에는 1큰술만 넣고 마지막에 맛을 봅니다.");
    add("계란", "1개", false, "달걀 1개", "있으면 풀어 넣어 국물을 부드럽게 만듭니다.");
    add("대파", "1큰술", false, null, "마지막 향을 더하는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "부추달걀국") {
    add("계란", "1개", true, "달걀 1개", "작은 그릇에 먼저 풀어 두면 넣기 쉽습니다.");
    add("부추", "1줌", true, "대파 1큰술", "가위로 4cm 정도로 자르면 칼이 없어도 됩니다.");
    add("물", "2컵", true, null, "국물 양의 기준입니다.");
    add("국간장", "1큰술", true, "간장 1큰술", "처음에는 1큰술만 넣고 마지막에 맛을 봅니다.");
    add("참기름", "1작은술", false, null, "마지막에 넣으면 향이 좋아지는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "간장비빔국수") {
    add("소면", "1인분", true, "중면 1인분", "포장지 삶는 시간을 먼저 확인합니다.");
    add("간장", "1.5큰술", true, null, "처음에는 절반만 넣고 비빈 뒤 맛을 봅니다.");
    add("참기름", "1큰술", true, "들기름 1큰술", "면이 서로 달라붙지 않게 도와줍니다.");
    add("설탕", "1/2작은술", true, "올리고당 1작은술", "짠맛을 둥글게 만드는 양입니다.");
    add("김가루", "2큰술", false, "깨 1작은술", "있으면 마지막에 올리는 선택 재료입니다.");
    add("오이", "1/4개", false, null, "있으면 얇게 썰어 올리는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "비빔국수") {
    add("소면", "1인분", true, "중면 1인분", "포장지 삶는 시간을 먼저 확인합니다.");
    add("고추장", "1큰술", true, null, "매우면 1/2큰술부터 시작합니다.");
    add("간장", "1작은술", true, null, "양념의 짠맛을 맞추는 양입니다.");
    add("설탕", "1작은술", true, "올리고당 1큰술", "고추장 매운맛을 부드럽게 합니다.");
    add("참기름", "1큰술", true, "들기름 1큰술", "마지막에 넣어 면을 부드럽게 비빕니다.");
    add("김치", "1/3컵", false, "오이 1/4개", "있으면 작게 잘라 넣는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "잔치국수") {
    add("소면", "1인분", true, "중면 1인분", "포장지 삶는 시간을 먼저 확인합니다.");
    add("물", "2.5컵", true, "멸치육수 2.5컵", "국물 양의 기준입니다.");
    add("국간장", "1큰술", true, "간장 1큰술", "국물 간은 처음부터 많이 넣지 않습니다.");
    add("계란", "1개", false, "달걀 1개", "있으면 지단 대신 풀어 넣어도 됩니다.");
    add("대파", "1큰술", false, "김가루 2큰술", "마지막에 올리는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "김치라면") {
    add("라면", "1봉", true, null, "봉지에 적힌 삶는 시간을 확인합니다.");
    add("김치", "1/2컵", true, "잘 익은 배추김치", "가위로 작게 자르면 숟가락으로 먹기 쉽습니다.");
    add("물", "2.5컵", true, null, "라면 1봉 기준 물 양입니다.");
    add("라면스프", "1봉", true, null, "싱겁게 먹고 싶으면 2/3봉만 먼저 넣습니다.");
    add("계란", "1개", false, "달걀 1개", "있으면 마지막에 넣는 선택 재료입니다.");
    add("대파", "1큰술", false, null, "마지막 향을 더하는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "라면계란죽") {
    add("라면", "1/2봉", true, null, "면은 반만 잘라 쓰면 죽처럼 먹기 쉽습니다.");
    add("라면스프", "1/2봉", true, null, "처음부터 전부 넣으면 죽이 너무 짤 수 있습니다.");
    add("밥", "1/2공기", true, "즉석밥 1/2개", "찬밥도 괜찮고 뭉친 밥은 숟가락으로 풀어 둡니다.");
    add("계란", "1개", true, "달걀 1개", "마지막에 풀어 넣어 부드럽게 만듭니다.");
    add("물", "2.5컵", true, null, "졸아들 수 있어 라면보다 조금 넉넉히 넣습니다.");
    add("대파", "1큰술", false, null, "마지막 향을 더하는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "볶음우동") {
    add("우동면", "1봉", true, null, "냉장 우동면은 뜨거운 물에 살짝 풀어 쓰면 끊어지지 않습니다.");
    add("간장", "1큰술", true, null, "볶음 간의 기준입니다.");
    add("굴소스", "1큰술", true, "간장 1큰술", "없으면 간장을 1큰술 더 넣어도 됩니다.");
    add("설탕", "1/2작은술", true, "올리고당 1작은술", "짠맛을 부드럽게 합니다.");
    add("식용유", "1큰술", true, null, "면이 팬에 붙지 않게 합니다.");
    add("양배추", "1줌", false, "양파 1/4개", "있으면 넣고 없어도 기본 볶음우동은 됩니다.");
    return ingredients;
  }

  if (title === "어묵우동볶음") {
    add("우동면", "1봉", true, null, "뜨거운 물에 30초 담가 풀어 두면 볶기 쉽습니다.");
    add("어묵", "2장", true, null, "가위로 한입 크기로 자르면 칼이 없어도 됩니다.");
    add("간장", "1큰술", true, null, "볶음 간의 기준입니다.");
    add("설탕", "1/2작은술", true, "올리고당 1작은술", "간장 짠맛을 부드럽게 합니다.");
    add("식용유", "1큰술", true, null, "면과 어묵이 팬에 붙지 않게 합니다.");
    add("대파", "1큰술", false, "양파 1/4개", "있으면 마지막에 넣는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "토마토파스타") {
    add("파스타면", "1인분", true, "스파게티면 1인분", "포장지 삶는 시간을 먼저 확인합니다.");
    add("토마토소스", "1/2컵", true, "토마토 1개와 케첩 1큰술", "시판 소스를 쓰면 초보자도 간 맞추기 쉽습니다.");
    add("물", "넉넉히", true, null, "면 삶을 물입니다. 냄비의 절반 이하로만 채웁니다.");
    add("소금", "1작은술", true, null, "면 삶는 물에만 넣습니다.");
    add("올리브유", "1큰술", false, "식용유 1큰술", "있으면 면을 볶을 때 향이 좋아집니다.");
    add("치즈", "1장", false, "파마산 치즈 조금", "있으면 마지막에 올리는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "참치파스타") {
    add("파스타면", "1인분", true, "스파게티면 1인분", "포장지 삶는 시간을 먼저 확인합니다.");
    add("참치캔", "1/2캔", true, null, "기름은 절반만 빼면 덜 질척합니다.");
    add("간장", "1큰술", true, null, "참치와 면을 묶어 주는 기본 간입니다.");
    add("올리브유", "1큰술", true, "식용유 1큰술", "참치가 뻑뻑하지 않게 합니다.");
    add("물", "넉넉히", true, null, "면 삶을 물입니다. 냄비의 절반 이하로만 채웁니다.");
    add("후추", "조금", false, null, "있으면 마지막에 뿌리는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "우동") {
    add("우동면", "1봉", true, null, "냉장 우동면은 바로 넣어도 됩니다.");
    add("물", "2.5컵", true, "멸치육수 2.5컵", "우동 한 그릇 국물 양입니다.");
    add("쯔유", "2큰술", true, "간장 1큰술", "없으면 간장으로 대체하되 마지막에 맛을 봅니다.");
    add("어묵", "1장", false, "유부 1장", "있으면 한입 크기로 잘라 넣는 선택 재료입니다.");
    add("대파", "1큰술", false, null, "마지막 향을 더하는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "참치라면") {
    add("라면", "1봉", true, null, "봉지에 적힌 조리 시간을 먼저 확인합니다.");
    add("라면스프", "1봉", true, null, "짠맛이 걱정되면 2/3봉만 먼저 넣습니다.");
    add("물", "2.5컵", true, null, "라면 1봉 기준 국물 양입니다.");
    add("참치캔", "1/2캔", true, null, "기름은 절반만 빼면 국물이 덜 느끼합니다.");
    add("대파", "1큰술", false, "후추 조금", "있으면 마지막에 올리는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "냉국수") {
    add("소면", "1인분", true, "중면 1인분", "포장지 삶는 시간을 먼저 확인합니다.");
    add("시판 냉면육수", "1봉", true, "물 1컵+간장 1큰술+식초 1큰술+설탕 1큰술", "처음 만들 때는 시판 육수가 가장 안정적입니다.");
    add("얼음", "1/2컵", false, "차가운 물 1/2컵", "면을 차갑게 먹고 싶을 때만 넣습니다.");
    add("오이", "1/4개", false, "김가루 조금", "있으면 얇게 썰어 올립니다.");
    add("참깨", "1작은술", false, null, "마지막에 뿌리는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "비빔우동") {
    add("우동면", "1봉", true, null, "뜨거운 물에 풀면 면이 끊어지지 않습니다.");
    add("고추장", "1큰술", true, null, "매우면 1/2큰술부터 시작합니다.");
    add("간장", "1작은술", true, null, "양념의 짠맛을 맞추는 기준입니다.");
    add("설탕", "1작은술", true, "올리고당 1큰술", "매운맛을 부드럽게 합니다.");
    add("참기름", "1큰술", true, "들기름 1큰술", "면이 덜 뻑뻑하게 비벼집니다.");
    add("김가루", "1큰술", false, "오이 1/4개", "있으면 마지막에 올리는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "간장라면") {
    add("라면", "1봉", true, null, "면만 쓰고 스프는 넣지 않는 레시피입니다.");
    add("물", "넉넉히", true, null, "면 삶을 물입니다. 냄비의 절반 이하로만 채웁니다.");
    add("간장", "1큰술", true, null, "처음에는 1큰술만 넣고 마지막에 맛을 봅니다.");
    add("설탕", "1/2작은술", true, "올리고당 1작은술", "간장의 짠맛을 부드럽게 합니다.");
    add("참기름", "1작은술", true, "들기름 1작은술", "마지막 향을 더합니다.");
    add("계란", "1개", false, "달걀 1개", "있으면 반숙이나 프라이로 올립니다.");
    return ingredients;
  }

  if (title === "전자레인지 감자버터") {
    add("감자", "1개", true, "고구마 1개", "껍질째 쓰면 깨끗이 씻고 큰 감자는 반으로 자릅니다.");
    add("버터", "1작은술", true, null, "뜨거울 때 넣어야 잘 녹습니다.");
    add("소금", "한 꼬집", true, "간장 1작은술", "처음에는 아주 조금만 넣습니다.");
    add("물", "1큰술", true, null, "전자레인지에서 감자가 마르지 않게 합니다.");
    add("후추", "조금", false, "파슬리 조금", "있으면 마지막에 뿌립니다.");
    return ingredients;
  }

  if (title === "전자레인지 햄계란밥") {
    add("밥", "1공기", true, "즉석밥 1개", "차가운 밥은 뭉친 부분을 먼저 풀어 둡니다.");
    add("계란", "2개", true, "달걀 2개", "전자레인지에 넣기 전 반드시 풀어야 터지지 않습니다.");
    add("햄", "1/3컵", true, "스팸 1/4캔", "작게 자를수록 고르게 데워집니다.");
    add("간장", "1큰술", true, "소금 한 꼬집", "마지막에 비벼 간을 맞춥니다.");
    add("참기름", "1작은술", true, null, "전자레인지 조리 뒤 넣으면 향이 좋습니다.");
    add("물", "1큰술", false, null, "밥이 마를 때만 넣는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "전자레인지 두부찜") {
    add("두부", "1/2모", true, "연두부 1팩", "물기를 따라내야 양념이 싱거워지지 않습니다.");
    add("간장", "1큰술", true, "쯔유 1큰술", "처음에는 1큰술만 넣고 짜면 밥과 같이 먹습니다.");
    add("참기름", "1작은술", true, "들기름 1작은술", "전자레인지 조리 뒤 넣으면 향이 살아납니다.");
    add("물", "1큰술", true, null, "두부가 마르지 않게 그릇 바닥에 넣습니다.");
    add("대파", "1큰술", false, "쪽파 조금", "없으면 생략해도 됩니다.");
    add("참깨", "1작은술", false, null, "마지막에 뿌리는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "전자레인지 콘치즈") {
    add("통조림 옥수수", "1/2컵", true, "냉동 옥수수 1/2컵", "물기를 빼야 완성 후 질척하지 않습니다.");
    add("피자치즈", "1/2컵", true, "슬라이스치즈 1장", "옥수수 위에 골고루 덮어야 잘 녹습니다.");
    add("마요네즈", "1큰술", true, "버터 1작은술", "고소함과 촉촉함을 더합니다.");
    add("설탕", "1/2작은술", false, "올리고당 1작은술", "달게 먹고 싶을 때만 넣습니다.");
    add("후추", "조금", false, null, "없으면 생략해도 됩니다.");
    return ingredients;
  }

  if (title === "오이참치무침") {
    add("오이", "1개", true, null, "얇은 반달 모양으로 썰면 양념이 빨리 묻습니다.");
    add("참치캔", "1/2캔", true, "닭가슴살 1/2팩", "기름을 빼야 무침이 질척하지 않습니다.");
    add("간장", "1큰술", true, "소금 2꼬집", "처음부터 많이 넣지 말고 1큰술에서 멈춥니다.");
    add("참기름", "1작은술", true, "들기름 1작은술", "마지막 고소한 향을 냅니다.");
    add("식초", "1작은술", false, "레몬즙 1작은술", "상큼하게 먹고 싶을 때만 넣습니다.");
    add("참깨", "1작은술", false, null, "마지막에 뿌리면 보기 좋습니다.");
    return ingredients;
  }

  if (title === "양배추볶음") {
    add("양배추", "2줌", true, "숙주 2줌", "한입 크기로 썰면 초보자도 익은 정도를 보기 쉽습니다.");
    add("식용유", "1큰술", true, null, "양배추가 팬에 붙지 않게 합니다.");
    add("간장", "1큰술", true, "소금 2꼬집", "팬 가장자리로 넣으면 향이 나고 덜 짜게 느껴집니다.");
    add("물", "1큰술", true, null, "양배추를 태우지 않고 숨을 죽이는 안전장치입니다.");
    add("참깨", "1작은술", false, null, "마지막에 뿌리는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "양배추참치덮밥") {
    add("밥", "1공기", true, "즉석밥 1개", "토핑을 올릴 넓은 그릇에 담아 둡니다.");
    add("양배추", "2줌", true, "숙주 2줌", "얇게 썰수록 빨리 부드러워집니다.");
    add("참치캔", "1/2캔", true, "닭가슴살 1/2팩", "기름은 1큰술만 남기고 덜어내면 덜 느끼합니다.");
    add("간장", "1큰술", true, "쯔유 1큰술", "참치가 짜면 1/2큰술부터 넣습니다.");
    add("식용유", "1작은술", true, "참치기름 1큰술", "양배추를 볶을 때 팬에 둘러줍니다.");
    add("참기름", "1작은술", false, "들기름 1작은술", "불을 끄고 넣는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "전자레인지 참치치즈밥") {
    add("밥", "1공기", true, "즉석밥 1개", "차가운 밥은 먼저 덩어리를 풀어 둡니다.");
    add("참치캔", "1/2캔", true, "닭가슴살 1/2팩", "기름을 많이 넣으면 밥이 질척해집니다.");
    add("피자치즈", "1/2컵", true, "슬라이스치즈 1장", "밥 위에 고르게 덮어야 녹은 부분이 한쪽에 몰리지 않습니다.");
    add("간장", "1작은술", true, "소금 한 꼬집", "치즈와 참치가 짜니 처음에는 1작은술만 넣습니다.");
    add("참기름", "1작은술", false, "마요네즈 1작은술", "마지막에 비빌 때 넣는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "게맛살계란볶음") {
    add("계란", "2개", true, "달걀 2개", "그릇에 먼저 풀어두면 팬에서 덩어리지지 않습니다.");
    add("게맛살", "2줄", true, "크래미 2줄", "손으로 찢어도 되니 칼이 서툴러도 괜찮습니다.");
    add("식용유", "1큰술", true, null, "계란이 팬에 붙지 않게 합니다.");
    add("소금", "한 꼬집", true, "간장 1작은술", "게맛살이 짭짤하니 아주 조금만 넣습니다.");
    add("대파", "1큰술", false, "쪽파 조금", "있으면 마지막에 넣는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "두부계란부침") {
    add("두부", "1/2모", true, "부침용 두부 1/2모", "물기를 닦아야 팬에서 덜 튑니다.");
    add("계란", "1개", true, "달걀 1개", "두부에 입힐 계란물입니다.");
    add("식용유", "1큰술", true, null, "팬 바닥에 얇게 퍼질 정도면 됩니다.");
    add("소금", "한 꼬집", true, "간장 1작은술", "계란물에 아주 조금만 넣습니다.");
    add("간장", "1큰술", false, "쯔유 1큰술", "완성 뒤 찍어 먹는 선택 양념입니다.");
    return ingredients;
  }

  if (title === "스팸계란볶음밥") {
    add("밥", "1공기", true, "즉석밥 1개", "찬밥이면 덩어리를 먼저 풀어 둡니다.");
    add("스팸", "1/4캔", true, "햄 1/3컵", "작게 썰수록 한입이 덜 짭니다.");
    add("계란", "1개", true, "달걀 1개", "팬 한쪽에서 스크램블로 익힙니다.");
    add("식용유", "1큰술", true, null, "스팸 기름이 많으면 1작은술만 써도 됩니다.");
    add("간장", "1작은술", true, "소금 한 꼬집", "스팸이 짜니 1작은술에서 멈춥니다.");
    add("김가루", "1큰술", false, "참깨 1작은술", "마지막에 올리는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "누룽지 두부 계란죽") {
    add("누룽지", "1컵", true, "밥 1공기", "누룽지가 없으면 찬밥으로 더 부드러운 죽을 만들 수 있습니다.");
    add("두부", "1/2모", true, "순두부 1/2팩", "숟가락으로 떠먹기 좋게 작게 자릅니다.");
    add("계란", "1개", true, "달걀 1개", "그릇에 풀어두면 죽에 고르게 퍼집니다.");
    add("물", "3컵", true, "멸치육수 3컵", "누룽지가 불어야 하니 넉넉히 넣습니다.");
    add("소금", "두 꼬집", true, "간장 1작은술", "마지막에 간을 볼 때 조금씩 넣습니다.");
    add("대파", "1큰술", false, "참깨 조금", "없으면 생략해도 됩니다.");
    return ingredients;
  }

  if (title === "고구마죽") {
    add("고구마", "1개", true, "찐 고구마 1개", "젓가락이 들어갈 정도로 익혀야 쉽게 으깨집니다.");
    add("밥", "1/2공기", true, "누룽지 1/2컵", "죽을 걸쭉하게 잡아주는 재료입니다.");
    add("물", "2컵", true, "우유 1컵+물 1컵", "처음에는 물로 만들면 타지 않아 쉽습니다.");
    add("소금", "한 꼬집", true, null, "단맛을 살리는 정도로 아주 조금만 넣습니다.");
    add("설탕", "1작은술", false, "꿀 1작은술", "고구마가 덜 달 때만 넣습니다.");
    return ingredients;
  }

  if (title === "참치김치국") {
    add("김치", "3/4컵", true, "볶음김치 3/4컵", "가위로 작게 자르면 숟가락으로 먹기 쉽습니다.");
    add("참치캔", "1/2캔", true, "닭가슴살 1/2팩", "기름은 1큰술만 남기면 국물이 덜 느끼합니다.");
    add("물", "2.5컵", true, "쌀뜨물 2.5컵", "김치가 짜면 물을 더 넣어 조절합니다.");
    add("김치국물", "2큰술", false, "고춧가루 1/2작은술", "국물 맛이 싱거울 때만 넣습니다.");
    add("대파", "1큰술", false, "양파 조금", "없으면 생략해도 됩니다.");
    return ingredients;
  }

  if (title === "숙주볶음") {
    add("숙주", "2줌", true, "콩나물 2줌", "봉지 숙주는 물에 한 번 헹구고 물기를 털어 쓰면 됩니다.");
    add("식용유", "1큰술", true, null, "팬 바닥에 얇게 퍼질 정도면 충분합니다.");
    add("간장", "1큰술", true, "소금 2꼬집", "팬 가장자리에 넣으면 향이 나지만 많이 넣으면 짜집니다.");
    add("다진 마늘", "1/2작은술", false, null, "없어도 되며, 넣으면 숙주 냄새가 줄어듭니다.");
    add("참기름", "1작은술", false, "들기름 1작은술", "불을 끄고 넣어야 향이 살아납니다.");
    add("깨", "조금", false, null, "마지막에 뿌리는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "숙주계란볶음") {
    add("숙주", "2줌", true, "콩나물 2줌", "물에 한 번 헹구고 물기를 털어야 볶을 때 질척하지 않습니다.");
    add("계란", "2개", true, null, "그릇에 먼저 풀어두면 팬 앞에서 당황하지 않습니다.");
    add("식용유", "1큰술", true, null, "계란과 숙주가 팬에 달라붙지 않게 합니다.");
    add("간장", "1큰술", true, "소금 2꼬집", "숙주에 직접 붓기보다 팬 가장자리로 넣습니다.");
    add("대파", "1큰술", false, null, "가위로 잘라 넣어도 됩니다.");
    add("참기름", "1작은술", false, "들기름 1작은술", "불을 끈 뒤 넣는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "김가루계란밥") {
    add("밥", "1공기", true, "찬밥 1공기", "찬밥이면 전자레인지에 1분 데워 둡니다.");
    add("계란", "1개", true, null, "프라이 또는 스크램블로 올리면 됩니다.");
    add("김가루", "1줌", true, "김 1장을 잘게 부순 것", "큰 김은 봉지 안에서 부수면 손에 덜 묻습니다.");
    add("간장", "1큰술", true, "소금 2꼬집", "처음엔 1큰술만 넣고 부족하면 나중에 더합니다.");
    add("참기름", "1작은술", true, "들기름 1작은술", "김가루와 밥이 고소하게 섞이게 합니다.");
    add("깨", "조금", false, null, "마지막에 뿌리는 선택 재료입니다.");
    return ingredients;
  }

  if (title === "들기름계란국수") {
    add("소면", "1인분", true, "중면 1인분", "엄지와 검지로 잡아 500원 동전 정도면 1인분입니다.");
    add("계란", "1개", true, null, "삶거나 지단 대신 간단 스크램블로 올립니다.");
    add("들기름", "1큰술", true, "참기름 1큰술", "면을 비빌 때 넣어야 고소하고 덜 달라붙습니다.");
    add("간장", "1큰술", true, "쯔유 1큰술", "처음엔 1큰술만 넣어 짜지 않게 시작합니다.");
    add("김가루", "1줌", false, "깨 조금", "없으면 생략해도 됩니다.");
    add("깨", "조금", false, null, "마지막 고소한 향을 더합니다.");
    return ingredients;
  }

  if (title === "두부참치비빔밥") {
    add("밥", "1공기", true, "찬밥 1공기", "찬밥이면 따뜻하게 데운 뒤 비비면 쉽습니다.");
    add("두부", "1/2모", true, "연두부 1/2팩", "키친타월로 물기를 살짝 닦으면 밥이 질척하지 않습니다.");
    add("참치캔", "1/2캔", true, null, "기름이나 물은 숟가락으로 살짝 덜어냅니다.");
    add("간장", "1큰술", true, "고추장 1작은술", "초보자는 간장부터 넣으면 덜 맵고 실패가 적습니다.");
    add("참기름", "1작은술", true, "들기름 1작은술", "밥과 두부가 부드럽게 섞이게 합니다.");
    add("김가루", "1줌", false, "깨 조금", "없으면 생략해도 됩니다.");
    return ingredients;
  }

  if (title === "양배추계란덮밥") {
    add("밥", "1공기", true, "찬밥 1공기", "미리 그릇에 담아 두면 덮밥을 바로 올릴 수 있습니다.");
    add("양배추", "2줌", true, "채 썬 양배추 2줌", "굵으면 익는 데 오래 걸리니 얇게 썰거나 채 썬 제품을 씁니다.");
    add("계란", "2개", true, null, "그릇에 먼저 풀어두면 부드럽게 익힐 수 있습니다.");
    add("간장", "1큰술", true, "굴소스 1작은술", "처음엔 1큰술만 넣어 짜지 않게 시작합니다.");
    add("식용유", "1큰술", true, null, "양배추와 계란이 팬에 달라붙지 않게 합니다.");
    add("참기름", "1작은술", false, "들기름 1작은술", "불을 끄고 넣는 선택 재료입니다.");
    return ingredients;
  }

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
  if (title.includes("알배추")) add("알배추", "4장", true, "배추 2장", "잎을 한 장씩 떼어 씻고 물기를 털어 준비합니다.");
  else if (title.includes("배추")) add("배추", "2장", true, "양배추");
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
  if (title.includes("버터")) add("버터", "1작은술", true, null, "밥이나 팬의 열로 녹여 고소한 맛을 냅니다.");
  if (title.includes("들기름")) add("들기름", "1큰술", true, "참기름 1큰술", "불을 끈 뒤 넣어야 향이 살아납니다.");
  if (title.includes("마요")) add("마요네즈", "1큰술", true, null, "덮밥을 부드럽게 묶어주는 양입니다.");
  if (title.includes("샐러드")) add("마요네즈", "1큰술", true, "플레인 요거트 1큰술", "샐러드가 뻑뻑하지 않게 묶어줍니다.");
  if (title.includes("게맛살")) add("게맛살", "2줄", true, "햄");
  if (title.includes("누룽지")) add("누룽지", "1컵", true, "밥 1공기");
  if (title.includes("김가루") || title.includes("김")) add("김", "1장", true, "김가루 2큰술");

  const method = inferMethod(title);
  if (method === "끓이기") {
    add("물", "2컵", true, null, "종이컵 2컵 정도로 시작하고 넘치면 불을 줄이세요.");
    if (!title.includes("된장")) add("국간장", "1큰술", true, "간장");
    add("대파", "2큰술", false, "파");
  } else if (method === "볶기" || method === "부치기" || method === "조리기" || method === "굽기") {
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
  if (title === "감자참치조림") {
    return [
      { order: 1, title: "감자와 참치 준비", action: "감자 1개는 1cm 두께 한입 크기로 썰고, 참치캔 1/2캔은 기름을 절반만 빼 둡니다.", heat: "불 없음", minutes: 3, visualCue: "감자 조각이 비슷한 크기이고 참치가 너무 마르지 않게 촉촉하면 됩니다.", commonMistake: "감자를 크게 썰면 겉만 익고 가운데가 딱딱합니다.", rescueTip: "크게 썰었다면 냄비 안에서 가위로 한 번 더 자르세요." },
      { order: 2, title: "감자 먼저 조리기", action: "작은 냄비에 감자, 물 1/2컵, 간장 1큰술을 넣고 뚜껑을 덮어 중불에서 6분 끓입니다.", heat: "중불", minutes: 6, visualCue: "물이 보글보글 끓고 감자 가장자리가 살짝 투명해지면 됩니다.", commonMistake: "처음부터 센불로 끓이면 간장물이 빨리 졸아 짜집니다.", rescueTip: "물이 거의 없으면 물 2큰술을 더 넣고 불을 줄이세요." },
      { order: 3, title: "참치 넣고 졸이기", action: "참치 1/2캔과 설탕 1작은술을 넣고 숟가락으로 살살 섞은 뒤 약불에서 2분 더 졸입니다.", heat: "약불", minutes: 2, visualCue: "참치가 양념에 젖고 감자 사이에 고르게 보이면 됩니다.", commonMistake: "세게 저으면 감자가 부서져 으깬 감자처럼 됩니다.", rescueTip: "감자가 부서지기 시작하면 젓지 말고 냄비를 살짝 흔드세요." },
      { order: 4, title: "간 보고 마무리", action: "감자를 하나 눌러 익었는지 보고 대파 1큰술을 올린 뒤 팬 바닥에 양념이 2~3큰술 남으면 불을 끕니다.", heat: "불 없음", minutes: 1, visualCue: "감자가 숟가락으로 쉽게 갈라지고 양념이 흥건하지 않으면 완성입니다.", commonMistake: "양념을 모두 말리면 감자와 참치가 짜고 퍽퍽해집니다.", rescueTip: "짜거나 마르면 물 1큰술을 넣고 30초만 다시 데우세요." },
    ];
  }

  if (title === "김치콩나물밥") {
    return [
      { order: 1, title: "콩나물과 김치 준비", action: "콩나물 1/2봉은 흐르는 물에 헹구고, 김치 1컵은 가위로 1cm 크기로 자릅니다.", heat: "불 없음", minutes: 3, visualCue: "콩나물 물기가 털리고 김치 조각이 숟가락에 쉽게 올라갈 크기면 됩니다.", commonMistake: "김치를 크게 넣으면 밥과 고르게 섞이지 않습니다.", rescueTip: "이미 넣었다면 팬 안에서 가위로 한 번 더 자르세요." },
      { order: 2, title: "김치와 콩나물 익히기", action: "팬에 김치, 콩나물, 물 2큰술을 넣고 뚜껑 없이 중불에서 4분 볶듯이 익힙니다.", heat: "중불", minutes: 4, visualCue: "콩나물 숨이 살짝 죽고 김치색이 진해지면 됩니다.", commonMistake: "물을 많이 넣으면 밥을 넣었을 때 죽처럼 질어집니다.", rescueTip: "물이 많으면 뚜껑을 열고 1분 더 익혀 날리세요." },
      { order: 3, title: "밥과 간장 섞기", action: "따뜻한 밥 1공기와 간장 1큰술을 넣고 약불에서 2분 동안 아래에서 위로 크게 섞습니다.", heat: "약불", minutes: 2, visualCue: "밥알에 김치색이 연하게 묻고 콩나물이 밥 사이에 보이면 됩니다.", commonMistake: "밥을 세게 누르면 떡처럼 뭉칩니다.", rescueTip: "뭉치면 불을 끄고 숟가락 두 개로 살살 풀어주세요." },
      { order: 4, title: "김가루로 마무리", action: "불을 끄고 김 1장을 부숴 넣은 뒤 참기름 1작은술을 둘러 한 번만 더 섞습니다.", heat: "불 없음", minutes: 1, visualCue: "그릇 바닥에 물이 고이지 않고 김가루가 밥 사이에 고르게 보이면 완성입니다.", commonMistake: "참기름을 불 위에서 오래 볶으면 향이 사라집니다.", rescueTip: "짜면 밥을 조금 더 넣고 김가루를 더해 간을 낮추세요." },
    ];
  }

  if (title === "김치덮밥") {
    return [
      { order: 1, title: "밥 준비", action: "밥 1공기를 따뜻하게 데워 그릇에 담고 가운데를 살짝 낮게 눌러 둡니다.", heat: "불 없음", minutes: 1, visualCue: "밥에서 김이 살짝 나고 가운데에 토핑 자리가 보이면 됩니다.", commonMistake: "찬밥을 그대로 쓰면 볶은 김치와 따로 놉니다.", rescueTip: "찬밥이면 전자레인지에 1분만 데우세요." },
      { order: 2, title: "김치 자르기", action: "김치 3/4컵은 국물을 살짝 짜고 가위로 1cm 크기로 자릅니다.", heat: "불 없음", minutes: 2, visualCue: "김치 조각이 숟가락에 쉽게 올라갈 크기면 됩니다.", commonMistake: "김치국물이 많으면 밥 위에 올렸을 때 질척합니다.", rescueTip: "국물이 많으면 손이나 숟가락으로 한 번 더 눌러 빼세요." },
      { order: 3, title: "김치 볶기", action: "팬에 식용유 1작은술을 두르고 김치를 중불에서 3분 볶습니다.", heat: "중불", minutes: 3, visualCue: "김치 색이 진해지고 팬 바닥에 물기가 거의 없으면 됩니다.", commonMistake: "센불로 볶으면 김치 가장자리만 탈 수 있습니다.", rescueTip: "타는 냄새가 나면 불을 약하게 줄이고 물 1큰술을 넣으세요." },
      { order: 4, title: "밥 위에 올리기", action: "볶은 김치를 밥 위에 올리고 참기름 1작은술과 김가루를 뿌립니다.", heat: "불 없음", minutes: 1, visualCue: "밥 가운데 김치가 모이고 가장자리에 밥이 보이면 비비기 좋습니다.", commonMistake: "간장을 먼저 넣으면 김치와 합쳐져 짤 수 있습니다.", rescueTip: "싱거우면 간장 1/2작은술만 추가하세요." },
    ];
  }

  if (title === "김치계란밥") {
    return [
      { order: 1, title: "김치 준비", action: "김치 1/2컵을 가위로 작게 자르고 국물이 많으면 숟가락으로 눌러 뺍니다.", heat: "불 없음", minutes: 2, visualCue: "김치 조각이 밥알보다 조금 큰 정도면 됩니다.", commonMistake: "큰 김치를 그대로 넣으면 계란과 밥에 고르게 섞이지 않습니다.", rescueTip: "이미 넣었다면 그릇 안에서 가위로 한 번 더 자르세요." },
      { order: 2, title: "계란 프라이", action: "팬에 식용유를 얇게 두르고 계란 2개를 중불에서 프라이합니다.", heat: "중불", minutes: 3, visualCue: "흰자가 하얗게 굳고 노른자가 가운데에 있으면 됩니다.", commonMistake: "센불에서 오래 익히면 밑면이 딱딱해집니다.", rescueTip: "가장자리가 빨리 갈색이 되면 불을 약하게 줄이세요." },
      { order: 3, title: "밥에 올리기", action: "따뜻한 밥 1공기 위에 김치와 계란을 올리고 간장 1작은술만 넣습니다.", heat: "불 없음", minutes: 1, visualCue: "밥 위에 김치, 계란, 간장이 따로 보여야 비비기 쉽습니다.", commonMistake: "김치가 짠데 간장을 1큰술 넣으면 전체가 짜집니다.", rescueTip: "짜면 밥 반 공기나 김가루를 더 넣어 비비세요." },
      { order: 4, title: "비벼 마무리", action: "계란을 숟가락으로 잘라 밥과 김치가 고르게 섞이도록 비비고 참기름을 넣습니다.", heat: "불 없음", minutes: 1, visualCue: "밥알에 김치 색이 연하게 묻고 계란 조각이 고르게 보이면 완성입니다.", commonMistake: "대충 섞으면 한입은 짜고 한입은 싱겁습니다.", rescueTip: "간이 약하면 간장 1/2작은술만 추가하세요." },
    ];
  }

  if (title === "주먹밥") {
    return [
      { order: 1, title: "밥 식히기", action: "따뜻한 밥 1공기를 그릇에 담고 1분 식혀 손으로 만질 수 있게 합니다.", heat: "불 없음", minutes: 1, visualCue: "김은 나지만 손 가까이에 두어도 너무 뜨겁지 않으면 됩니다.", commonMistake: "너무 뜨거운 밥은 손에 달라붙고 모양 잡기 어렵습니다.", rescueTip: "접시에 넓게 펴서 1분 더 식히세요." },
      { order: 2, title: "양념 섞기", action: "밥에 김가루 2큰술, 참기름 1작은술, 소금 한 꼬집을 넣고 숟가락으로 섞습니다.", heat: "불 없음", minutes: 2, visualCue: "밥알 사이에 김가루가 고르게 보이면 됩니다.", commonMistake: "간장을 많이 넣으면 밥이 질어져 잘 안 뭉칩니다.", rescueTip: "질어졌다면 김가루 1큰술을 더 넣으세요." },
      { order: 3, title: "한입 크기로 나누기", action: "밥을 숟가락으로 4등분해 같은 크기로 나눕니다.", heat: "불 없음", minutes: 1, visualCue: "각 덩어리가 탁구공보다 조금 작은 크기면 먹기 쉽습니다.", commonMistake: "크기가 크면 속까지 간이 약하게 느껴집니다.", rescueTip: "큰 덩어리는 반으로 나눠 다시 뭉치세요." },
      { order: 4, title: "뭉치기", action: "손에 물을 살짝 묻히고 밥을 가볍게 눌러 동그랗게 뭉칩니다.", heat: "불 없음", minutes: 3, visualCue: "집었을 때 부서지지 않고 표면에 김가루가 보이면 완성입니다.", commonMistake: "너무 세게 누르면 밥알이 뭉개져 딱딱해집니다.", rescueTip: "부서지면 참기름을 아주 조금 묻혀 다시 뭉치세요." },
    ];
  }

  if (title === "김치주먹밥") {
    return [
      { order: 1, title: "김치 물기 빼기", action: "김치 1/2컵은 국물을 꼭 짜고 가위로 밥알보다 조금 크게 자릅니다.", heat: "불 없음", minutes: 2, visualCue: "그릇 바닥에 김치국물이 고이지 않으면 됩니다.", commonMistake: "김치국물이 많으면 주먹밥이 질어지고 손에 붙습니다.", rescueTip: "이미 질어졌다면 김가루를 1큰술씩 추가하세요." },
      { order: 2, title: "밥 섞기", action: "밥 1공기에 김치, 김가루 2큰술, 참기름 1작은술을 넣고 숟가락으로 섞습니다.", heat: "불 없음", minutes: 2, visualCue: "밥알 전체에 김치 색이 연하게 묻으면 됩니다.", commonMistake: "밥을 누르며 섞으면 떡처럼 뭉칩니다.", rescueTip: "숟가락 두 개로 들어 올리듯 다시 풀어주세요." },
      { order: 3, title: "간 보기", action: "한 숟가락 맛보고 싱거울 때만 소금 한 꼬집이나 김가루를 조금 더 넣습니다.", heat: "불 없음", minutes: 1, visualCue: "김치 맛이 먼저 나고 밥이 싱겁지 않으면 충분합니다.", commonMistake: "간장을 넣으면 밥이 더 질어질 수 있습니다.", rescueTip: "간장을 넣었다면 김가루를 더해 수분을 잡으세요." },
      { order: 4, title: "작게 뭉치기", action: "손에 물을 살짝 묻히고 밥을 4개로 나눠 한입 크기로 뭉칩니다.", heat: "불 없음", minutes: 3, visualCue: "들었을 때 모양이 유지되고 김치가 밖으로 많이 튀어나오지 않으면 완성입니다.", commonMistake: "크게 만들면 먹다가 쉽게 부서집니다.", rescueTip: "부서지는 밥은 작은 컵에 눌러 컵주먹밥처럼 담아도 됩니다." },
    ];
  }

  if (title === "스팸마요덮밥") {
    return [
      { order: 1, title: "밥 담기", action: "따뜻한 밥 1공기를 그릇에 담고 가운데를 살짝 낮게 눌러 토핑 자리를 만듭니다.", heat: "불 없음", minutes: 1, visualCue: "밥 가운데가 낮고 가장자리가 살짝 올라오면 토핑이 흘러내리지 않습니다.", commonMistake: "찬밥을 쓰면 마요네즈와 토핑이 따로 놉니다.", rescueTip: "찬밥이면 전자레인지에 1분 데우세요." },
      { order: 2, title: "스팸 굽기", action: "스팸 1/3캔을 작은 주사위 모양으로 썰고 중불에서 3분 볶습니다.", heat: "중불", minutes: 3, visualCue: "스팸 가장자리가 연한 갈색이고 기름이 살짝 나오면 됩니다.", commonMistake: "크게 썰면 한입이 너무 짜집니다.", rescueTip: "크게 썰었다면 팬에서 가위로 한 번 더 자르세요." },
      { order: 3, title: "계란 익히기", action: "계란 1개를 같은 팬 한쪽에서 크게 저어 촉촉한 스크램블로 익힙니다.", heat: "약불", minutes: 2, visualCue: "계란이 촉촉한 노란 덩어리로 굳으면 됩니다.", commonMistake: "센불에서 익히면 계란이 퍽퍽해집니다.", rescueTip: "퍽퍽하면 밥 위에 올린 뒤 마요네즈를 조금 더 얹으세요." },
      { order: 4, title: "마요 올리기", action: "밥 위에 스팸과 계란을 올리고 마요네즈 1큰술, 간장 1작은술, 김가루를 뿌립니다.", heat: "불 없음", minutes: 1, visualCue: "밥 위에 스팸, 계란, 마요네즈가 따로 보이면 비비기 좋습니다.", commonMistake: "스팸이 짠데 간장을 많이 넣으면 전체가 짭니다.", rescueTip: "짜면 밥을 반 공기 더 넣거나 마요네즈를 조금 더해 부드럽게 잡으세요." },
    ];
  }

  if (title === "콩나물밥") {
    return [
      { order: 1, title: "콩나물 씻기", action: "콩나물 1줌을 흐르는 물에 헹구고 검게 상한 부분만 골라냅니다.", heat: "불 없음", minutes: 2, visualCue: "물에 떠다니는 껍질이 줄고 콩나물이 깨끗해 보이면 됩니다.", commonMistake: "콩나물을 너무 많이 쓰면 초보자 한 그릇에 비율이 맞지 않습니다.", rescueTip: "많이 씻었다면 절반만 쓰고 나머지는 국에 넣으세요." },
      { order: 2, title: "콩나물 익히기", action: "냄비에 콩나물과 물 1/2컵을 넣고 중불에서 5분 익힙니다.", heat: "중불", minutes: 5, visualCue: "콩나물 줄기가 살짝 투명해지고 숨이 죽으면 됩니다.", commonMistake: "뚜껑을 열었다 닫았다 하면 비린내가 날 수 있습니다.", rescueTip: "처음부터 뚜껑을 열고 익히면 실패가 적습니다." },
      { order: 3, title: "양념장 만들기", action: "간장 1큰술, 참기름 1작은술, 대파, 참깨를 작은 그릇에 섞습니다.", heat: "불 없음", minutes: 1, visualCue: "간장 위에 참기름이 얇게 떠 있고 대파가 고르게 보이면 됩니다.", commonMistake: "간장을 많이 넣으면 밥 전체가 짜집니다.", rescueTip: "짠맛이 걱정되면 양념장은 절반만 먼저 넣으세요." },
      { order: 4, title: "밥과 비비기", action: "따뜻한 밥 1공기 위에 익힌 콩나물을 올리고 양념장을 절반부터 넣어 비빕니다.", heat: "불 없음", minutes: 2, visualCue: "밥알 사이에 콩나물이 고르게 섞이고 윤기가 돌면 완성입니다.", commonMistake: "콩나물 물을 많이 넣으면 밥이 질어집니다.", rescueTip: "질어졌다면 김가루나 밥을 조금 더 넣어 잡으세요." },
    ];
  }

  if (title === "간장버터밥") {
    return [
      { order: 1, title: "밥 뜨겁게 준비", action: "밥 1공기를 뜨겁게 데워 그릇에 담습니다.", heat: "불 없음", minutes: 1, visualCue: "밥에서 김이 올라오면 버터가 잘 녹을 온도입니다.", commonMistake: "찬밥에 버터를 넣으면 덩어리로 남습니다.", rescueTip: "버터가 안 녹으면 전자레인지에 20초만 더 데우세요." },
      { order: 2, title: "버터 녹이기", action: "버터 1작은술을 밥 가운데 넣고 밥으로 덮어 30초 둡니다.", heat: "불 없음", minutes: 1, visualCue: "밥 사이로 버터가 녹아 윤기가 보이면 됩니다.", commonMistake: "버터를 크게 한 숟가락 넣으면 느끼하고 질척합니다.", rescueTip: "느끼하면 김가루를 넣거나 밥을 조금 더 넣으세요." },
      { order: 3, title: "간장 넣기", action: "간장 1큰술을 밥 가장자리로 둘러 넣고 숟가락으로 아래에서 위로 섞습니다.", heat: "불 없음", minutes: 1, visualCue: "밥알 일부가 연한 갈색으로 변하면 간장이 섞이고 있습니다.", commonMistake: "간장을 한가운데 붓고 그대로 두면 한입만 짭니다.", rescueTip: "짠 부분이 있으면 흰 밥 쪽과 크게 섞어주세요." },
      { order: 4, title: "마무리", action: "참깨나 김가루를 넣고 한입 맛본 뒤 싱거울 때만 간장 1/2작은술을 더합니다.", heat: "불 없음", minutes: 1, visualCue: "밥알에 윤기가 돌고 버터 덩어리가 보이지 않으면 완성입니다.", commonMistake: "처음부터 간장을 더 넣으면 되돌리기 어렵습니다.", rescueTip: "짜면 밥을 반 공기 더 넣어 다시 비비세요." },
    ];
  }

  if (title === "참치주먹밥") {
    return [
      { order: 1, title: "참치 기름 빼기", action: "참치캔 1/2캔은 숟가락으로 눌러 기름을 대부분 빼고 그릇에 담습니다.", heat: "불 없음", minutes: 2, visualCue: "그릇 바닥에 기름이 고이지 않으면 됩니다.", commonMistake: "기름이 많으면 주먹밥이 질어지고 손에 묻습니다.", rescueTip: "이미 질어졌다면 김가루를 1큰술씩 더 넣으세요." },
      { order: 2, title: "밥 섞기", action: "밥 1공기에 참치, 김가루 2큰술, 간장 1작은술, 마요네즈 1작은술을 넣고 섞습니다.", heat: "불 없음", minutes: 2, visualCue: "밥알 사이에 참치와 김가루가 고르게 보이면 됩니다.", commonMistake: "마요네즈를 많이 넣으면 모양이 풀립니다.", rescueTip: "질척하면 김가루나 밥을 조금 더 넣으세요." },
      { order: 3, title: "간 보기", action: "한 숟가락 맛보고 싱거울 때만 소금 한 꼬집이나 간장 1/2작은술을 더합니다.", heat: "불 없음", minutes: 1, visualCue: "참치 맛이 나고 밥이 싱겁지 않으면 충분합니다.", commonMistake: "참치 자체 간을 잊고 간장을 많이 넣기 쉽습니다.", rescueTip: "짜면 밥을 더 넣고 김가루를 추가하세요." },
      { order: 4, title: "작게 뭉치기", action: "손에 물을 살짝 묻히고 밥을 4개로 나눠 한입 크기로 뭉칩니다.", heat: "불 없음", minutes: 3, visualCue: "집었을 때 부서지지 않고 참치가 밖으로 많이 나오지 않으면 완성입니다.", commonMistake: "크게 만들면 먹다가 부서집니다.", rescueTip: "부서지는 밥은 컵에 눌러 담아 컵주먹밥처럼 먹어도 됩니다." },
    ];
  }

  if (title === "깻잎주먹밥") {
    return [
      { order: 1, title: "깻잎 물기 빼기", action: "깻잎 4~6장을 씻고 키친타월로 물기를 닦은 뒤 가위로 잘게 자릅니다.", heat: "불 없음", minutes: 3, visualCue: "깻잎에 물방울이 거의 없고 작은 조각으로 보이면 됩니다.", commonMistake: "깻잎 물기가 많으면 주먹밥이 질어집니다.", rescueTip: "이미 질어졌다면 김가루를 1큰술 더 넣으세요." },
      { order: 2, title: "밥 양념하기", action: "밥 1공기에 김가루 2큰술, 참기름 1작은술, 소금 한 꼬집을 넣고 섞습니다.", heat: "불 없음", minutes: 2, visualCue: "밥알 사이에 김가루와 참기름 윤기가 고르게 보이면 됩니다.", commonMistake: "간장을 많이 넣으면 밥이 질어지고 짭니다.", rescueTip: "짰다면 밥을 조금 더 넣고 다시 섞으세요." },
      { order: 3, title: "깻잎 섞기", action: "잘게 자른 깻잎을 밥에 넣고 숟가락 두 개로 들어 올리듯 섞습니다.", heat: "불 없음", minutes: 1, visualCue: "밥 전체에 초록 깻잎 조각이 고르게 보이면 됩니다.", commonMistake: "세게 누르며 섞으면 밥이 떡처럼 뭉칩니다.", rescueTip: "뭉쳤다면 숟가락으로 옆에서 살살 풀어주세요." },
      { order: 4, title: "작게 뭉치기", action: "손에 물을 살짝 묻히고 밥을 4개로 나눠 한입 크기로 뭉칩니다.", heat: "불 없음", minutes: 3, visualCue: "집었을 때 부서지지 않고 깻잎이 표면에 보이면 완성입니다.", commonMistake: "크게 만들면 먹다가 잘 부서집니다.", rescueTip: "부서지면 작은 컵에 눌러 담아 컵주먹밥처럼 먹어도 됩니다." },
    ];
  }

  if (title === "나물비빔밥") {
    return [
      { order: 1, title: "나물 물기 확인", action: "시판 나물 1컵은 국물이 많으면 숟가락으로 살짝 눌러 물기를 덜어냅니다.", heat: "불 없음", minutes: 1, visualCue: "그릇 바닥에 나물 국물이 많이 고이지 않으면 됩니다.", commonMistake: "물기 많은 나물을 그대로 넣으면 밥이 질어집니다.", rescueTip: "질어졌다면 김가루나 밥을 조금 더 넣어 잡으세요." },
      { order: 2, title: "밥 담기", action: "따뜻한 밥 1공기를 큰 그릇에 담고 숟가락으로 가볍게 풀어둡니다.", heat: "불 없음", minutes: 1, visualCue: "큰 밥덩어리가 없어지고 밥알이 따로 보이면 됩니다.", commonMistake: "찬밥 덩어리를 그대로 비비면 양념이 한쪽에 몰립니다.", rescueTip: "찬밥이면 전자레인지에 1분 데우세요." },
      { order: 3, title: "나물과 양념 올리기", action: "밥 위에 나물을 올리고 간장 1큰술, 참기름 1작은술을 먼저 넣습니다.", heat: "불 없음", minutes: 1, visualCue: "밥 위에 나물과 양념이 따로 보이면 비비기 쉽습니다.", commonMistake: "양념을 많이 넣기 전 맛을 보지 않으면 짤 수 있습니다.", rescueTip: "간장은 절반만 넣고 비빈 뒤 부족하면 더 넣어도 됩니다." },
      { order: 4, title: "비비고 간 보기", action: "숟가락으로 아래에서 위로 크게 비빈 뒤 한입 맛보고 싱거우면 간장 1/2작은술만 더합니다.", heat: "불 없음", minutes: 2, visualCue: "밥알 사이에 나물이 고르게 섞이고 윤기가 돌면 완성입니다.", commonMistake: "세게 누르며 비비면 밥이 뭉개집니다.", rescueTip: "짜면 밥을 조금 더 넣고 참기름은 더 넣지 마세요." },
    ];
  }

  if (title === "감자채전") {
    return [
      { order: 1, title: "감자 채 썰기", action: "감자 2개를 얇게 채 썰고 찬물에 3분 담가 전분을 살짝 뺍니다.", heat: "불 없음", minutes: 5, visualCue: "감자채가 젓가락 굵기 정도로 얇고 물이 살짝 뿌옇게 보이면 됩니다.", commonMistake: "감자가 두꺼우면 겉은 타고 속은 덜 익습니다.", rescueTip: "두꺼운 감자는 가위로 반으로 잘라 더 작게 만드세요." },
      { order: 2, title: "반죽 만들기", action: "물기를 뺀 감자에 부침가루 2큰술, 소금 1/4작은술을 넣고 젓가락으로 섞습니다.", heat: "불 없음", minutes: 2, visualCue: "감자 표면에 가루가 얇게 묻고 숟가락으로 떠지는 정도면 됩니다.", commonMistake: "물을 많이 넣으면 전이 축축하고 잘 찢어집니다.", rescueTip: "질면 부침가루 1큰술을 더 넣어 묶어주세요." },
      { order: 3, title: "얇게 부치기", action: "팬에 식용유 2큰술을 두르고 중불에서 반죽을 얇게 펴 앞면 4분을 부칩니다.", heat: "중불", minutes: 4, visualCue: "가장자리가 노릇하고 뒤집개가 아래로 잘 들어가면 뒤집을 때입니다.", commonMistake: "두껍게 올리면 가운데가 익기 전에 겉만 탑니다.", rescueTip: "두꺼우면 뒤집개로 살짝 눌러 펴고 불을 약하게 낮추세요." },
      { order: 4, title: "뒤집어 마무리", action: "조심히 뒤집어 3분 더 부친 뒤 키친타월에 30초 올려 기름을 뺍니다.", heat: "중불", minutes: 3, visualCue: "양면이 노릇하고 감자가 투명하게 익으면 완성입니다.", commonMistake: "너무 빨리 뒤집으면 전이 찢어집니다.", rescueTip: "찢어져도 작은 감자전처럼 나눠 구우면 됩니다." },
    ];
  }

  if (title === "양파두부볶음") {
    return [
      { order: 1, title: "두부 물기 닦기", action: "두부 1/2모를 한입 크기로 자르고 키친타월로 겉물기를 닦습니다.", heat: "불 없음", minutes: 3, visualCue: "두부 표면에 물방울이 거의 없으면 됩니다.", commonMistake: "물기가 많으면 팬에서 튀고 양념이 묽어집니다.", rescueTip: "키친타월을 새로 깔고 1분 더 눌러주세요." },
      { order: 2, title: "양파 먼저 볶기", action: "팬에 식용유 1큰술을 두르고 얇게 썬 양파를 중불에서 3분 볶습니다.", heat: "중불", minutes: 3, visualCue: "양파 가장자리가 투명하고 단 냄새가 나면 됩니다.", commonMistake: "센불에서 바로 볶으면 양파 끝만 탑니다.", rescueTip: "타는 냄새가 나면 물 1큰술을 넣고 불을 낮추세요." },
      { order: 3, title: "두부 넣기", action: "두부를 넣고 부서지지 않게 팬을 살짝 흔들며 2분 더 볶습니다.", heat: "중불", minutes: 2, visualCue: "두부 겉면이 따뜻해지고 양파와 섞여 보이면 됩니다.", commonMistake: "주걱으로 세게 뒤적이면 두부가 으깨집니다.", rescueTip: "부서졌다면 덮밥 토핑처럼 밥 위에 올려 먹으면 됩니다." },
      { order: 4, title: "간장 마무리", action: "간장 1큰술을 팬 가장자리로 넣고 30초 섞습니다. 참기름 1작은술은 있으면 불을 끈 뒤 넣고, 없으면 생략합니다.", heat: "약불", minutes: 1, visualCue: "두부와 양파에 연한 갈색 양념이 묻으면 완성입니다.", commonMistake: "간장을 한곳에 붓고 오래 두면 짠 부분이 생깁니다.", rescueTip: "짜면 밥을 곁들이고 다음에는 간장을 2/3큰술만 넣으세요." },
    ];
  }

  if (title === "감자채볶음") {
    return [
      { order: 1, title: "감자 채 썰기", action: "감자 2개를 얇게 채 썰고 찬물에 3분 담근 뒤 물기를 뺍니다.", heat: "불 없음", minutes: 5, visualCue: "감자채가 비슷한 굵기이고 물기가 많이 떨어지지 않으면 됩니다.", commonMistake: "전분이 많으면 팬에 붙기 쉽습니다.", rescueTip: "물에 못 담갔다면 키친타월로 겉물기를 잘 닦으세요." },
      { order: 2, title: "감자 볶기", action: "팬에 식용유 1큰술을 두르고 감자를 중불에서 5분 볶습니다.", heat: "중불", minutes: 5, visualCue: "감자 가장자리가 투명해지고 살짝 휘어지면 익고 있습니다.", commonMistake: "계속 세게 뒤적이면 감자가 부서집니다.", rescueTip: "팬에 붙으면 물 1큰술을 넣고 1분 덮어 익히세요." },
      { order: 3, title: "양파 넣기", action: "양파 1/4개가 있으면 넣고 2분 더 볶습니다. 없으면 바로 소금 1/3작은술을 뿌립니다.", heat: "중불", minutes: 2, visualCue: "양파가 있으면 투명해지고, 없으면 감자가 서로 붙지 않게 풀려 있으면 됩니다.", commonMistake: "처음부터 소금을 많이 넣으면 물이 나와 질척합니다.", rescueTip: "물기가 생기면 뚜껑 없이 1분 더 볶아 날리세요." },
      { order: 4, title: "간 보고 마무리", action: "감자를 한 조각 먹어보고 속이 부드러우면 완성입니다. 후추는 있으면 조금 뿌리고, 없으면 생략합니다.", heat: "불 없음", minutes: 1, visualCue: "젓가락으로 감자가 쉽게 잘리면 완성입니다.", commonMistake: "겉색만 보고 끄면 속이 아삭하게 덜 익을 수 있습니다.", rescueTip: "덜 익었으면 물 2큰술을 넣고 2분 더 익히세요." },
    ];
  }

  if (title === "두부미역국") {
    return [
      { order: 1, title: "미역 준비", action: "건미역 1큰술을 물에 10분 불려 1/2컵으로 준비하거나, 이미 불린 미역 1/2컵을 씁니다. 긴 미역은 가위로 자릅니다.", heat: "불 없음", minutes: 10, visualCue: "미역이 부드럽게 풀리고 숟가락에 올라갈 크기면 됩니다.", commonMistake: "건미역을 많이 넣으면 국이 너무 빽빽해집니다.", rescueTip: "미역이 많으면 절반은 덜어 냉장 보관하세요." },
      { order: 2, title: "미역 볶기", action: "참기름 1작은술이 있으면 냄비에 미역과 함께 넣고 약불에서 1분 볶습니다. 없으면 물부터 넣고 끓여도 됩니다.", heat: "약불", minutes: 1, visualCue: "참기름을 썼다면 미역에 윤기가 돌고, 생략했다면 미역이 냄비 바닥에 고르게 깔리면 됩니다.", commonMistake: "센불에서 볶으면 참기름이 빨리 탑니다.", rescueTip: "타는 냄새가 나면 바로 물을 붓고 불을 낮추세요." },
      { order: 3, title: "국물 끓이기", action: "물 3컵과 국간장 1큰술을 넣고 중불에서 8분 끓입니다.", heat: "중불", minutes: 8, visualCue: "국물이 연한 초록빛이고 미역이 부드러워지면 됩니다.", commonMistake: "간장을 많이 넣으면 국물이 탁하고 짭니다.", rescueTip: "짜면 물 1/2컵을 더 넣고 1분 더 끓이세요." },
      { order: 4, title: "두부 넣기", action: "두부를 한입 크기로 넣고 2분 더 끓인 뒤 맛을 봅니다.", heat: "약불", minutes: 2, visualCue: "두부가 따뜻해지고 국물이 다시 보글거리면 완성입니다.", commonMistake: "두부를 넣고 오래 저으면 부서집니다.", rescueTip: "부서졌다면 그대로 순두부국처럼 먹어도 됩니다." },
    ];
  }

  if (title === "들기름두부구이") {
    return [
      { order: 1, title: "두부 물기 빼기", action: "두부 1모를 손가락 두께로 자르고 키친타월로 겉물기를 닦은 뒤, 두부 앞뒤에 소금 한 꼬집을 나눠 뿌립니다.", heat: "불 없음", minutes: 3, visualCue: "두부 표면이 축축하지만 물이 흐르지 않고 소금이 아주 조금 보이면 됩니다.", commonMistake: "물기가 많으면 들기름이 튀고 겉면이 덜 노릇합니다.", rescueTip: "키친타월로 한 번 더 눌러 물기를 빼세요." },
      { order: 2, title: "기름 두르기", action: "팬에 식용유 1작은술과 들기름 1큰술을 넣고 약불에서 30초 데웁니다.", heat: "약불", minutes: 1, visualCue: "기름이 팬 바닥에 얇게 퍼지고 향이 올라오면 됩니다.", commonMistake: "센불에서 들기름을 데우면 쓴맛이 날 수 있습니다.", rescueTip: "연기가 나면 불을 끄고 팬을 잠깐 식히세요." },
      { order: 3, title: "두부 굽기", action: "두부를 겹치지 않게 올리고 중불에서 앞면 4분, 뒷면 3분 굽습니다.", heat: "중불", minutes: 7, visualCue: "두부 가장자리가 노릇하고 뒤집개가 잘 들어가면 됩니다.", commonMistake: "자주 뒤집으면 두부가 부서집니다.", rescueTip: "붙어 있으면 30초 더 기다린 뒤 깊게 떠서 뒤집으세요." },
      { order: 4, title: "간장 곁들이기", action: "소금 한 꼬집이나 간장 1큰술을 따로 곁들여 찍어 먹습니다.", heat: "불 없음", minutes: 1, visualCue: "두부 겉은 노릇하고 속은 부드러우면 완성입니다.", commonMistake: "간장을 두부 위에 다 부으면 금방 짜집니다.", rescueTip: "짜면 밥 위에 올려 덮밥처럼 먹으세요." },
    ];
  }

  if (title === "순두부간장비빔") {
    return [
      { order: 1, title: "순두부 물 빼기", action: "순두부 포장을 열고 물을 조심히 따라낸 뒤 그릇에 크게 떠 담습니다.", heat: "불 없음", minutes: 2, visualCue: "그릇 바닥에 물이 조금만 남고 순두부가 크게 모이면 됩니다.", commonMistake: "포장을 세게 누르면 순두부가 으깨집니다.", rescueTip: "으깨져도 밥에 비벼 먹는 메뉴라 괜찮습니다." },
      { order: 2, title: "양념 넣기", action: "간장 1큰술과 참기름 1작은술을 순두부 위에 뿌립니다. 참깨는 있으면 마지막에 조금 뿌립니다.", heat: "불 없음", minutes: 1, visualCue: "간장이 순두부 옆으로 살짝 흐르면 충분합니다.", commonMistake: "간장을 많이 넣으면 순두부 전체가 바로 짜집니다.", rescueTip: "짜면 밥을 곁들이거나 순두부를 조금 더 넣으세요." },
      { order: 3, title: "김가루 올리기", action: "김가루와 대파는 있으면 올리고, 없으면 생략합니다. 숟가락으로 크게 두세 번만 섞습니다.", heat: "불 없음", minutes: 1, visualCue: "순두부가 크게 남아 있고 양념이 위에 고르게 보이면 됩니다.", commonMistake: "너무 오래 섞으면 순두부가 물처럼 풀립니다.", rescueTip: "많이 풀렸다면 밥 위에 올려 비빔밥처럼 먹으세요." },
      { order: 4, title: "간 보고 먹기", action: "한 숟가락 맛보고 싱거울 때만 간장 1작은술을 추가합니다.", heat: "불 없음", minutes: 1, visualCue: "고소한 향과 짠맛이 약하게 느껴지면 완성입니다.", commonMistake: "처음부터 간장을 추가하면 되돌리기 어렵습니다.", rescueTip: "간이 세면 김가루나 밥을 더해 잡으세요." },
    ];
  }

  if (title === "두부부침") {
    return [
      { order: 1, title: "두부 물기 닦기", action: "두부 1모를 손가락 두께로 자르고 키친타월로 겉물기를 닦습니다.", heat: "불 없음", minutes: 3, visualCue: "두부 표면에 물방울이 거의 없으면 됩니다.", commonMistake: "물기가 많으면 팬에서 튀고 잘 부서집니다.", rescueTip: "물기가 남았으면 키친타월로 한 번 더 눌러주세요." },
      { order: 2, title: "밑간하기", action: "두부 양면에 소금 한 꼬집을 나눠 뿌리고 1분 둡니다.", heat: "불 없음", minutes: 1, visualCue: "두부 표면에 소금이 아주 살짝 보이는 정도면 됩니다.", commonMistake: "소금을 많이 뿌리면 간장 없이도 짭니다.", rescueTip: "많이 뿌렸다면 키친타월로 표면을 살짝 닦으세요." },
      { order: 3, title: "앞뒤로 부치기", action: "팬에 식용유 1큰술을 두르고 중불에서 두부를 앞면 3분, 뒷면 3분 부칩니다.", heat: "중불", minutes: 6, visualCue: "두부 가장자리가 연한 노란색이고 뒤집개가 잘 들어가면 됩니다.", commonMistake: "너무 빨리 뒤집으면 두부가 찢어집니다.", rescueTip: "붙어 있으면 30초 더 기다렸다가 뒤집개를 깊게 넣으세요." },
      { order: 4, title: "간장 곁들이기", action: "간장 1큰술, 대파, 참기름을 섞어 두부 옆에 조금만 곁들입니다.", heat: "불 없음", minutes: 1, visualCue: "두부는 겉이 단단하고 간장은 따로 보이면 완성입니다.", commonMistake: "간장을 두부 위에 다 부으면 금방 짜집니다.", rescueTip: "짜면 밥과 같이 먹거나 양념 없는 두부를 추가하세요." },
    ];
  }

  if (title === "두부조림") {
    return [
      { order: 1, title: "두부 자르고 닦기", action: "두부 1모를 손가락 두께로 자르고 키친타월로 겉물기를 닦습니다.", heat: "불 없음", minutes: 3, visualCue: "두부 표면이 축축하지만 물이 흐르지 않으면 됩니다.", commonMistake: "물기가 많으면 팬에서 튀고 양념이 묽어집니다.", rescueTip: "물기가 많으면 키친타월을 새로 깔고 1분 더 두세요." },
      { order: 2, title: "두부 먼저 부치기", action: "팬에 식용유 1큰술을 두르고 두부를 중불에서 앞뒤로 2분씩 부칩니다.", heat: "중불", minutes: 4, visualCue: "두부 겉면이 살짝 노란색으로 단단해지면 됩니다.", commonMistake: "부치지 않고 바로 조리면 두부가 쉽게 부서집니다.", rescueTip: "부서진 두부는 건드리지 말고 양념을 끼얹어 마무리하세요." },
      { order: 3, title: "양념 넣기", action: "간장 2큰술, 물 1/2컵, 설탕 1작은술을 섞어 팬에 붓습니다.", heat: "중약불", minutes: 2, visualCue: "양념이 두부 가장자리에서 보글보글 끓으면 됩니다.", commonMistake: "물을 빼면 간장이 빨리 타고 짜집니다.", rescueTip: "양념이 빨리 졸면 물 2큰술을 더 넣으세요." },
      { order: 4, title: "끼얹어 조리기", action: "대파를 넣고 숟가락으로 양념을 두부 위에 3~4번 끼얹은 뒤 불을 끕니다.", heat: "중약불", minutes: 3, visualCue: "팬 바닥에 양념이 조금 남고 두부에 갈색 윤기가 돌면 완성입니다.", commonMistake: "오래 뒤적이면 두부가 부서집니다.", rescueTip: "뒤집지 말고 숟가락으로 양념만 끼얹으세요." },
    ];
  }

  if (title === "달걀죽") {
    return [
      { order: 1, title: "밥 풀기", action: "냄비에 밥 1공기와 물 2.5컵을 넣고 숟가락으로 밥알을 먼저 풀어줍니다.", heat: "불 없음", minutes: 2, visualCue: "큰 밥 덩어리가 없어지고 물이 살짝 뿌옇게 보이면 됩니다.", commonMistake: "밥을 덩어리째 끓이면 바닥에 붙고 속까지 잘 안 풀립니다.", rescueTip: "이미 덩어리가 남았다면 불을 끄고 숟가락 등으로 눌러 풀어주세요." },
      { order: 2, title: "죽 끓이기", action: "중불로 올려 끓기 시작하면 약불로 줄이고 8분 저어가며 끓입니다.", heat: "약불", minutes: 8, visualCue: "밥알이 퍼지고 숟가락으로 떠 올렸을 때 국물이 살짝 걸쭉하면 됩니다.", commonMistake: "센불로 계속 끓이면 바닥이 눌어붙습니다.", rescueTip: "눌어붙는 냄새가 나면 젓지 말고 윗부분만 다른 냄비로 옮기세요." },
      { order: 3, title: "계란 넣기", action: "풀어 둔 계란 2개를 냄비 가장자리로 천천히 붓고 젓가락으로 두세 번만 크게 저어줍니다.", heat: "약불", minutes: 2, visualCue: "노란 계란이 얇게 퍼져 죽 사이에 보이면 됩니다.", commonMistake: "계란을 넣자마자 세게 저으면 죽이 탁하고 계란이 잘게 부서집니다.", rescueTip: "이미 잘게 풀렸다면 그대로 1분만 더 끓여 부드러운 죽으로 마무리하세요." },
      { order: 4, title: "간 맞추기", action: "국간장 1작은술을 넣고 맛을 본 뒤 참기름과 대파를 올려 마무리합니다.", heat: "불 없음", minutes: 1, visualCue: "짠맛보다 고소한 향이 먼저 올라오면 초보자용 간으로 맞습니다.", commonMistake: "간장을 1큰술 넣으면 죽 전체가 짜집니다.", rescueTip: "짜면 물 1/2컵이나 밥 2큰술을 더 넣고 2분 더 끓이세요." },
    ];
  }

  if (title === "치즈계란밥") {
    return [
      { order: 1, title: "밥과 치즈 준비", action: "뜨거운 밥 1공기를 그릇에 담고 슬라이스치즈 1장을 밥 위에 올립니다.", heat: "불 없음", minutes: 1, visualCue: "치즈 가장자리가 밥 열기로 살짝 휘기 시작하면 됩니다.", commonMistake: "찬밥을 쓰면 치즈가 녹지 않고 따로 놉니다.", rescueTip: "찬밥이면 치즈를 올린 채 전자레인지에 30초만 데우세요." },
      { order: 2, title: "계란 프라이", action: "팬에 식용유를 얇게 두르고 중불에서 계란 2개를 원하는 익힘으로 프라이합니다.", heat: "중불", minutes: 3, visualCue: "흰자가 투명하지 않고 완전히 하얗게 굳으면 밥에 올려도 됩니다.", commonMistake: "센불에서 하면 바닥만 타고 윗면은 덜 익습니다.", rescueTip: "가장자리가 빨리 타면 불을 끄고 뚜껑을 30초 덮어 익히세요." },
      { order: 3, title: "간장 넣기", action: "밥과 치즈 위에 계란을 올리고 간장 1큰술, 참기름 1작은술을 둘러줍니다.", heat: "불 없음", minutes: 1, visualCue: "간장이 밥 가장자리로 조금 스며들고 치즈가 계란 아래에 보이면 됩니다.", commonMistake: "치즈가 짜다는 걸 잊고 간장을 많이 넣기 쉽습니다.", rescueTip: "짜면 밥을 반 공기 더 넣고 김가루는 생략하세요." },
      { order: 4, title: "비비기", action: "숟가락으로 계란과 치즈를 작게 자르며 밥 전체가 고르게 노랗게 섞일 때까지 비빕니다.", heat: "불 없음", minutes: 1, visualCue: "치즈가 실처럼 늘거나 밥 사이에 작게 녹아 있으면 완성입니다.", commonMistake: "한쪽만 비비면 치즈 덩어리가 남습니다.", rescueTip: "덩어리가 남으면 전자레인지에 15초만 더 돌린 뒤 다시 비비세요." },
    ];
  }

  if (title === "버터간장계란밥") {
    return [
      { order: 1, title: "밥에 버터 녹이기", action: "뜨거운 밥 1공기에 버터 1작은술을 올리고 30초 두어 녹입니다.", heat: "불 없음", minutes: 1, visualCue: "버터가 밥 위에서 반쯤 녹아 윤기가 돌면 됩니다.", commonMistake: "버터를 많이 넣으면 느끼하고 밥이 질척해집니다.", rescueTip: "느끼하면 김가루나 밥을 조금 더 넣어 잡으세요." },
      { order: 2, title: "계란 프라이", action: "팬에 식용유를 얇게 두르고 계란 2개를 중불에서 프라이합니다.", heat: "중불", minutes: 3, visualCue: "흰자가 하얗게 익고 노른자가 흔들리면 비비기 좋은 익힘입니다.", commonMistake: "팬이 충분히 달궈지기 전에 넣으면 계란이 붙습니다.", rescueTip: "붙으면 불을 약하게 줄이고 20초 기다렸다가 뒤집개를 넣으세요." },
      { order: 3, title: "간장 둘러주기", action: "버터밥 위에 계란을 올리고 간장 1큰술을 밥 가장자리로 둘러줍니다.", heat: "불 없음", minutes: 1, visualCue: "간장이 한곳에 고이지 않고 밥 가장자리에 퍼져 있으면 됩니다.", commonMistake: "간장을 눈대중으로 많이 넣으면 바로 짜집니다.", rescueTip: "짜면 밥 반 공기를 더 넣고 참기름은 생략하세요." },
      { order: 4, title: "비벼 마무리", action: "계란을 숟가락으로 잘라 버터, 간장, 밥이 고르게 섞이도록 비빈 뒤 참깨를 뿌립니다.", heat: "불 없음", minutes: 1, visualCue: "밥알이 윤기 있게 코팅되고 계란 조각이 골고루 보이면 완성입니다.", commonMistake: "버터를 안 녹이고 비비면 한입만 느끼해집니다.", rescueTip: "버터 덩어리가 보이면 밥의 뜨거운 부분으로 덮고 20초 기다리세요." },
    ];
  }

  if (title === "양파계란덮밥") {
    return [
      { order: 1, title: "양파 볶기", action: "팬에 식용유 1작은술을 두르고 얇게 썬 양파 1/2개를 중약불에서 3분 볶습니다.", heat: "중약불", minutes: 3, visualCue: "양파가 하얀색에서 반투명하게 바뀌면 됩니다.", commonMistake: "센불에서 시작하면 양파 가장자리만 탑니다.", rescueTip: "갈색이 빨리 나면 물 1큰술을 넣고 불을 낮추세요." },
      { order: 2, title: "덮밥 소스 만들기", action: "물 4큰술, 간장 1큰술, 설탕 1작은술을 넣고 1분 끓입니다.", heat: "중약불", minutes: 1, visualCue: "팬 바닥에 짭짤한 소스가 자작하게 깔리면 됩니다.", commonMistake: "물이 너무 적으면 간장이 바로 졸아 짜집니다.", rescueTip: "소스가 거의 없으면 물 2큰술을 추가하세요." },
      { order: 3, title: "계란 붓기", action: "풀어 둔 계란 2개를 양파 위에 둥글게 붓고 약불에서 2분 익힙니다.", heat: "약불", minutes: 2, visualCue: "가장자리는 굳고 가운데는 살짝 촉촉하면 밥에 올리기 좋습니다.", commonMistake: "젓가락으로 계속 저으면 덮밥 모양이 흐트러집니다.", rescueTip: "이미 많이 저었다면 스크램블 덮밥처럼 밥 위에 올리면 됩니다." },
      { order: 4, title: "밥 위에 올리기", action: "따뜻한 밥 1공기 위에 양파계란을 소스째 올립니다.", heat: "불 없음", minutes: 1, visualCue: "밥 가장자리에 소스가 조금 스며들고 계란이 가운데 덮이면 완성입니다.", commonMistake: "소스만 먼저 붓고 건더기를 나중에 올리면 한쪽만 짜집니다.", rescueTip: "짜면 밥을 더 넣고, 싱거우면 간장 1작은술만 추가하세요." },
    ];
  }

  if (title === "김치볶음밥") {
    return [
      { order: 1, title: "김치 자르기", action: "김치 1컵을 그릇에 담고 주방가위로 숟가락에 올라갈 크기로 잘게 자릅니다.", heat: "불 없음", minutes: 2, visualCue: "김치 조각이 1cm 정도로 작아지면 밥과 잘 섞입니다.", commonMistake: "김치가 크면 볶음밥에서 따로 씹히고 비비기 어렵습니다.", rescueTip: "팬에 넣은 뒤에도 가위로 한 번 더 잘라도 됩니다." },
      { order: 2, title: "김치 먼저 볶기", action: "팬에 식용유 1큰술과 대파를 넣고 30초 볶은 뒤 김치를 넣어 중불에서 3분 볶습니다.", heat: "중불", minutes: 3, visualCue: "김치 색이 진해지고 신 냄새가 부드러워지면 됩니다.", commonMistake: "밥을 너무 빨리 넣으면 김치 수분 때문에 질척해집니다.", rescueTip: "물이 많으면 밥 넣기 전에 1분 더 볶아 수분을 날리세요." },
      { order: 3, title: "밥 넣기", action: "밥 1공기를 넣고 뒤집개로 누르듯 풀며 2분 볶습니다.", heat: "중불", minutes: 2, visualCue: "밥알 전체가 붉게 물들고 큰 덩어리가 없어지면 됩니다.", commonMistake: "밥 덩어리를 그대로 두면 간이 한쪽에만 몰립니다.", rescueTip: "덩어리는 뒤집개 등으로 눌러 펴고 30초 더 볶으세요." },
      { order: 4, title: "마무리", action: "간을 보고 싱거우면 간장 1작은술만 팬 가장자리로 둘러 섞고, 불을 끈 뒤 참기름을 넣습니다.", heat: "불 없음", minutes: 1, visualCue: "밥알이 기름지지 않게 윤기만 돌면 완성입니다.", commonMistake: "김치가 짠데 간장을 또 넣으면 전체가 짜집니다.", rescueTip: "짜면 밥을 반 공기 더 넣거나 계란프라이를 올리세요." },
    ];
  }

  if (title === "참치김치볶음밥") {
    return [
      { order: 1, title: "참치와 김치 준비", action: "참치캔 1/2캔은 기름 1큰술만 남기고 덜어내고, 김치는 잘게 자릅니다.", heat: "불 없음", minutes: 2, visualCue: "참치가 촉촉하지만 캔 바닥에 기름이 흥건하지 않으면 됩니다.", commonMistake: "참치 기름을 모두 넣으면 볶음밥이 질척하고 느끼합니다.", rescueTip: "기름이 많아졌다면 키친타월로 팬 가장자리를 살짝 닦으세요." },
      { order: 2, title: "김치 볶기", action: "팬에 식용유 1작은술과 김치를 넣고 중불에서 3분 볶습니다.", heat: "중불", minutes: 3, visualCue: "김치가 부드러워지고 팬 바닥의 물기가 줄면 됩니다.", commonMistake: "김치를 덜 볶으면 신맛과 물기가 그대로 남습니다.", rescueTip: "신맛이 강하면 설탕 1/2작은술을 넣고 30초 더 볶으세요." },
      { order: 3, title: "참치와 밥 넣기", action: "참치와 밥 1공기를 넣고 밥덩어리를 풀며 2분 볶습니다.", heat: "중불", minutes: 2, visualCue: "참치가 밥 사이에 작게 퍼지고 밥알이 붉게 보이면 됩니다.", commonMistake: "참치를 오래 볶으면 퍽퍽해집니다.", rescueTip: "퍽퍽하면 물 1큰술이나 김치국물 1큰술을 넣어 섞으세요." },
      { order: 4, title: "간 보고 담기", action: "한입 맛보고 싱거울 때만 간장 1작은술을 넣고 김가루나 참깨를 뿌립니다.", heat: "불 없음", minutes: 1, visualCue: "팬 바닥에 물기가 거의 없고 밥알이 따로 움직이면 완성입니다.", commonMistake: "참치와 김치가 이미 짠데 간장을 많이 넣기 쉽습니다.", rescueTip: "짜면 밥이나 계란프라이를 추가하세요." },
    ];
  }

  if (title === "참치마요덮밥") {
    return [
      { order: 1, title: "참치 기름 빼기", action: "참치캔 1/2캔은 숟가락으로 눌러 기름을 대부분 빼고 그릇에 담습니다.", heat: "불 없음", minutes: 2, visualCue: "참치가 촉촉하지만 그릇 바닥에 기름이 고이지 않으면 됩니다.", commonMistake: "기름을 그대로 넣으면 밥이 느끼하고 질척해집니다.", rescueTip: "이미 넣었다면 김가루를 조금 더 넣어 수분을 잡으세요." },
      { order: 2, title: "참치마요 만들기", action: "참치에 마요네즈 1큰술을 넣고 숟가락으로 고르게 섞습니다.", heat: "불 없음", minutes: 1, visualCue: "참치가 부드럽게 뭉쳐 숟가락에 올라오면 됩니다.", commonMistake: "마요네즈를 많이 넣으면 느끼합니다.", rescueTip: "느끼하면 참치나 밥을 조금 더 넣으세요." },
      { order: 3, title: "밥 간하기", action: "따뜻한 밥 1공기에 간장 1작은술을 둘러 가볍게 섞습니다.", heat: "불 없음", minutes: 1, visualCue: "밥알에 아주 옅은 간장색이 돌면 됩니다.", commonMistake: "간장을 많이 넣으면 참치마요까지 더해져 짜집니다.", rescueTip: "짜면 밥을 2~3숟가락 더 넣으세요." },
      { order: 4, title: "덮밥 완성", action: "밥 위에 참치마요를 올리고 김을 잘게 부숴 뿌린 뒤 참깨로 마무리합니다.", heat: "불 없음", minutes: 1, visualCue: "참치가 밥 가운데 올라가고 김가루가 골고루 보이면 완성입니다.", commonMistake: "처음부터 다 비벼두면 밥이 쉽게 질척해집니다.", rescueTip: "먹기 직전에 비비고, 질척하면 김가루를 더하세요." },
    ];
  }

  if (title === "햄야채볶음밥") {
    return [
      { order: 1, title: "재료 작게 썰기", action: "햄과 양파를 밥알보다 조금 큰 크기로 작게 썹니다.", heat: "불 없음", minutes: 3, visualCue: "숟가락에 밥과 같이 올라갈 크기면 됩니다.", commonMistake: "재료가 크면 볶음밥 한입마다 맛이 달라집니다.", rescueTip: "크게 썰었다면 팬에 넣기 전에 가위로 한 번 더 자르세요." },
      { order: 2, title: "햄과 양파 볶기", action: "팬에 식용유 1큰술을 두르고 햄과 양파를 중불에서 3분 볶습니다.", heat: "중불", minutes: 3, visualCue: "양파가 반투명하고 햄 가장자리가 살짝 노릇하면 됩니다.", commonMistake: "센불에서 시작하면 햄만 먼저 탑니다.", rescueTip: "타기 시작하면 물 1큰술을 넣고 불을 낮추세요." },
      { order: 3, title: "밥 넣기", action: "밥 1공기를 넣고 뒤집개로 눌러 풀며 2분 볶습니다.", heat: "중불", minutes: 2, visualCue: "밥알이 흩어지고 햄, 양파가 고르게 섞이면 됩니다.", commonMistake: "밥덩어리를 그대로 두면 간이 고르게 배지 않습니다.", rescueTip: "딱딱한 밥은 물 1큰술을 넣고 30초 더 볶으세요." },
      { order: 4, title: "계란과 간장 마무리", action: "팬 한쪽에 계란 1개를 익혀 밥과 섞고, 간장 1작은술을 가장자리로 둘러 마무리합니다.", heat: "중불", minutes: 2, visualCue: "계란이 노랗게 익고 밥알이 따로 움직이면 완성입니다.", commonMistake: "간장을 많이 넣으면 햄 짠맛과 겹쳐집니다.", rescueTip: "짜면 밥을 조금 더 넣거나 오이를 곁들이세요." },
    ];
  }

  if (title === "스팸무스비") {
    return [
      { order: 1, title: "밥 간하기", action: "따뜻한 밥 1.5공기에 참기름 1큰술, 참깨 1작은술을 넣고 숟가락으로 섞습니다.", heat: "불 없음", minutes: 2, visualCue: "밥알 표면에 윤기가 돌면 됩니다.", commonMistake: "간장을 먼저 많이 넣으면 햄과 합쳐져 짤 수 있습니다.", rescueTip: "싱거우면 완성 후 간장 1작은술을 곁들여 찍어 드세요." },
      { order: 2, title: "스팸 굽기", action: "스팸을 손가락 두께로 썰어 마른 팬에서 중불로 앞뒤 2분씩 굽습니다.", heat: "중불", minutes: 4, visualCue: "스팸 겉면에 연한 갈색 선이 생기면 됩니다.", commonMistake: "센불에서 굽면 겉만 타고 짠맛이 강하게 느껴집니다.", rescueTip: "탔다면 탄 부분만 잘라내고 밥을 조금 더 넣어 간을 맞추세요." },
      { order: 3, title: "밥 모양 잡기", action: "랩 위에 밥을 올리고 스팸 크기에 맞춰 납작한 네모 모양으로 눌러줍니다.", heat: "불 없음", minutes: 3, visualCue: "스팸보다 조금 큰 밥 블록이 되면 감싸기 쉽습니다.", commonMistake: "밥을 너무 헐겁게 잡으면 김으로 감쌀 때 흩어집니다.", rescueTip: "흩어지면 랩으로 다시 감싸 10초 눌러 모양을 잡으세요." },
      { order: 4, title: "김으로 감싸기", action: "밥 위에 스팸을 올리고 김밥김으로 가운데를 감싼 뒤 접합면이 아래로 가게 둡니다.", heat: "불 없음", minutes: 3, visualCue: "김이 밥의 수분을 살짝 먹어 붙으면 완성입니다.", commonMistake: "김을 너무 좁게 자르면 풀릴 수 있습니다.", rescueTip: "풀리면 김 한 조각을 더 감싸고 접합면을 아래로 두세요." },
    ];
  }

  if (title === "가지토마토볶음") {
    return [
      { order: 1, title: "재료 썰기", action: "가지는 반달 모양으로 썰고 토마토는 숟가락에 올라갈 크기로 큼직하게 자릅니다.", heat: "불 없음", minutes: 3, visualCue: "가지와 토마토가 비슷한 크기면 골고루 먹기 좋습니다.", commonMistake: "토마토를 너무 잘게 자르면 팬에서 물이 많이 나옵니다.", rescueTip: "물이 많이 나오면 마지막에 1분만 더 볶아 날리세요." },
      { order: 2, title: "가지 먼저 볶기", action: "팬에 식용유 1큰술과 가지를 넣고 중불에서 4분 볶습니다.", heat: "중불", minutes: 4, visualCue: "가지 속이 촉촉해지고 겉면이 살짝 투명해지면 됩니다.", commonMistake: "기름을 계속 추가하면 느끼해질 수 있습니다.", rescueTip: "팬이 마르면 물 1큰술을 넣어 익히세요." },
      { order: 3, title: "토마토와 양념 넣기", action: "토마토, 간장 1큰술, 다진마늘을 넣고 약불에서 2분 섞습니다.", heat: "약불", minutes: 2, visualCue: "토마토 가장자리가 부드러워지고 간장색이 돌면 됩니다.", commonMistake: "센불에서 오래 볶으면 토마토가 다 풀어집니다.", rescueTip: "너무 풀어졌다면 밥 위에 올려 덮밥처럼 먹어도 됩니다." },
      { order: 4, title: "맛 맞추기", action: "맛을 보고 시면 설탕 1/2작은술을 넣고 대파를 뿌려 마무리합니다.", heat: "불 없음", minutes: 1, visualCue: "가지가 부드럽고 토마토가 형태를 조금 유지하면 완성입니다.", commonMistake: "간장을 더 넣으면 토마토 수분 때문에 짠 국물이 됩니다.", rescueTip: "짜면 밥이나 두부를 곁들여 같이 드세요." },
    ];
  }

  if (title === "김치어묵볶음") {
    return [
      { order: 1, title: "김치와 어묵 자르기", action: "김치는 한입 크기로 자르고 어묵은 가위로 길게 썹니다.", heat: "불 없음", minutes: 2, visualCue: "어묵이 젓가락으로 집히는 폭이면 됩니다.", commonMistake: "어묵을 너무 크게 두면 양념이 겉에만 묻습니다.", rescueTip: "큰 조각은 팬 안에서 가위로 한 번 더 자르세요." },
      { order: 2, title: "김치 먼저 볶기", action: "팬에 식용유 1큰술, 김치, 설탕 1작은술을 넣고 중불에서 3분 볶습니다.", heat: "중불", minutes: 3, visualCue: "김치 색이 진해지고 신맛 냄새가 줄면 됩니다.", commonMistake: "김치 국물을 많이 넣으면 볶음보다 찌개처럼 됩니다.", rescueTip: "국물이 많으면 1분 더 볶아 수분을 날리세요." },
      { order: 3, title: "어묵 넣기", action: "어묵과 간장 1작은술을 넣고 약불에서 3분 섞어가며 볶습니다.", heat: "약불", minutes: 3, visualCue: "어묵 끝이 살짝 부드러워지고 김치 양념이 묻으면 됩니다.", commonMistake: "어묵은 이미 익은 재료라 오래 볶으면 질겨집니다.", rescueTip: "질겨졌다면 물 1큰술을 넣고 30초만 데우세요." },
      { order: 4, title: "참기름으로 마무리", action: "불을 끄고 참기름 1작은술과 대파를 넣어 섞습니다.", heat: "불 없음", minutes: 2, visualCue: "팬 바닥에 기름 윤기가 돌고 고소한 향이 나면 완성입니다.", commonMistake: "참기름을 넣고 계속 볶으면 향이 약해집니다.", rescueTip: "향이 부족하면 접시에 담은 뒤 참깨를 조금 뿌리세요." },
    ];
  }

  if (title === "양파달걀볶음") {
    return [
      { order: 1, title: "양파 썰기", action: "양파 1/2개를 얇게 채 썰고 대파가 있으면 송송 썹니다.", heat: "불 없음", minutes: 2, visualCue: "양파 조각이 젓가락으로 한 번에 집히는 길이면 됩니다.", commonMistake: "양파가 두꺼우면 달걀이 먼저 익어버립니다.", rescueTip: "두껍게 썰었다면 팬에 물 1큰술을 넣고 1분 더 익히세요." },
      { order: 2, title: "달걀 풀기", action: "달걀 2개를 그릇에 깨고 간장 1작은술을 넣어 젓가락으로 20번 섞습니다.", heat: "불 없음", minutes: 1, visualCue: "노른자와 흰자가 고르게 섞이면 됩니다.", commonMistake: "팬 위에서 바로 깨면 껍질이 들어갈 수 있습니다.", rescueTip: "껍질이 들어가면 숟가락으로 건져내세요." },
      { order: 3, title: "양파 볶기", action: "팬에 식용유 1큰술과 양파를 넣고 중불에서 3분 볶습니다.", heat: "중불", minutes: 3, visualCue: "양파 가장자리가 투명하고 달큰한 냄새가 나면 됩니다.", commonMistake: "센불에서 볶으면 양파 끝만 탈 수 있습니다.", rescueTip: "색이 빨리 진해지면 불을 약하게 낮추세요." },
      { order: 4, title: "달걀 넣고 마무리", action: "불을 약불로 낮추고 달걀물을 부어 크게 저으며 2분 익힌 뒤 후추를 뿌립니다.", heat: "약불", minutes: 2, visualCue: "달걀이 촉촉한 덩어리로 굳고 양파와 섞이면 완성입니다.", commonMistake: "계속 잘게 저으면 달걀이 부스러져 퍽퍽합니다.", rescueTip: "퍽퍽해졌다면 밥 위에 올리고 참기름 1작은술을 더하세요." },
    ];
  }

  // 오이두부무침_STEPS_BATCH13
  if (title === "양배추계란국") {
    return [
      { order: 1, title: "양배추 넣고 끓이기", action: "냄비에 물 2컵과 양배추 1줌을 넣고 중불에서 5분 끓입니다.", heat: "중불", minutes: 5, visualCue: "양배추가 반투명하게 부드러워지면 됩니다.", commonMistake: "양배추를 크게 썰면 익는 시간이 길어집니다.", rescueTip: "아직 딱딱하면 물 1/4컵을 더 넣고 2분 더 끓이세요." },
      { order: 2, title: "계란 풀기", action: "계란 2개를 그릇에 풀어 젓가락으로 20번 정도 섞습니다.", heat: "불 없음", minutes: 1, visualCue: "노른자와 흰자가 고르게 섞이면 됩니다.", commonMistake: "냄비 위에서 바로 깨면 껍질이 들어갈 수 있습니다.", rescueTip: "껍질이 들어가면 숟가락으로 건져내세요." },
      { order: 3, title: "계란 넣기", action: "불을 약불로 낮추고 계란물을 냄비 가장자리로 천천히 부은 뒤 20초 둡니다.", heat: "약불", minutes: 2, visualCue: "계란이 노란 리본처럼 떠오르면 잘 익고 있습니다.", commonMistake: "바로 휘저으면 국물이 탁해집니다.", rescueTip: "탁해져도 맛은 괜찮으니 30초만 더 끓이세요." },
      { order: 4, title: "간 맞추기", action: "국간장 1큰술과 대파를 넣고 맛을 본 뒤 싱거우면 소금 1꼬집으로 마무리합니다.", heat: "불 없음", minutes: 2, visualCue: "양배추가 부드럽고 계란이 흐르지 않으면 완성입니다.", commonMistake: "간장을 많이 넣으면 국물이 금방 짜집니다.", rescueTip: "짜면 물 1/2컵을 더 넣고 한 번만 끓이세요." },
    ];
  }

  if (title === "닭가슴살양배추덮밥") {
    return [
      { order: 1, title: "재료 준비", action: "익힌 닭가슴살은 결대로 찢고 양배추는 얇게 썹니다.", heat: "불 없음", minutes: 3, visualCue: "닭가슴살과 양배추가 숟가락에 올라갈 크기면 됩니다.", commonMistake: "양배추가 두꺼우면 팬에서 오래 걸립니다.", rescueTip: "두껍게 썰었다면 가위로 한 번 더 자르세요." },
      { order: 2, title: "양배추 숨 죽이기", action: "팬에 양배추와 물 2큰술을 넣고 중불에서 3분 볶듯이 익힙니다.", heat: "중불", minutes: 3, visualCue: "양배추 숨이 죽고 가장자리가 살짝 투명하면 됩니다.", commonMistake: "기름부터 많이 넣으면 느끼해질 수 있습니다.", rescueTip: "타는 냄새가 나면 물 1큰술을 더 넣고 불을 낮추세요." },
      { order: 3, title: "닭가슴살 넣기", action: "닭가슴살과 간장 1큰술을 넣고 약불에서 3분 섞어 따뜻하게 데웁니다.", heat: "약불", minutes: 3, visualCue: "닭가슴살 표면에 간장색이 살짝 돌면 됩니다.", commonMistake: "이미 익은 닭가슴살을 오래 볶으면 퍽퍽해집니다.", rescueTip: "퍽퍽하면 물 1큰술을 넣고 30초만 더 섞으세요." },
      { order: 4, title: "밥 위에 올리기", action: "따뜻한 밥 위에 볶은 재료를 올리고 참기름과 참깨를 뿌립니다.", heat: "불 없음", minutes: 3, visualCue: "밥 위에 양배추와 닭가슴살이 고르게 덮이면 완성입니다.", commonMistake: "양념을 팬에 남기면 밥이 싱겁습니다.", rescueTip: "싱거우면 간장 1작은술을 밥 가장자리에 둘러 비비세요." },
    ];
  }

  if (title === "두부참치전") {
    return [
      { order: 1, title: "물기 빼기", action: "두부는 키친타월로 눌러 물기를 빼고 참치캔은 기름을 빼 둡니다.", heat: "불 없음", minutes: 3, visualCue: "그릇 바닥에 물이나 기름이 고이지 않으면 됩니다.", commonMistake: "물기가 많으면 전이 팬에서 퍼집니다.", rescueTip: "질척하면 부침가루 1큰술을 더 넣으세요." },
      { order: 2, title: "반죽 만들기", action: "두부, 참치, 계란 1개, 부침가루 2큰술, 대파를 넣고 숟가락으로 으깨며 섞습니다.", heat: "불 없음", minutes: 3, visualCue: "숟가락으로 떠도 흘러내리지 않는 되직한 반죽이면 됩니다.", commonMistake: "너무 곱게 으깨면 식감이 밋밋합니다.", rescueTip: "반죽이 묽으면 부침가루를 조금씩 추가하세요." },
      { order: 3, title: "작게 부치기", action: "팬에 식용유 1큰술을 두르고 반죽을 한 숟가락씩 올려 중약불에서 앞면 3분, 뒷면 2분 부칩니다.", heat: "중약불", minutes: 5, visualCue: "가장자리가 연한 갈색으로 굳으면 뒤집을 때입니다.", commonMistake: "크게 부치면 뒤집다가 잘 부서집니다.", rescueTip: "부서진 것은 밥 위에 올려 두부참치덮밥처럼 먹어도 됩니다." },
      { order: 4, title: "식혀서 담기", action: "전이 단단해지도록 1분 식힌 뒤 접시에 담고 간장이 필요하면 조금만 곁들입니다.", heat: "불 없음", minutes: 1, visualCue: "젓가락으로 들어도 모양이 유지되면 완성입니다.", commonMistake: "바로 겹쳐 담으면 눅눅해질 수 있습니다.", rescueTip: "눅눅하면 팬에 30초만 다시 데우세요." },
    ];
  }

  if (title === "오이두부무침") {
    return [
      { order: 1, title: "두부 준비", action: "두부 1/2모는 키친타월로 물기를 닦고 한입 크기로 자릅니다.", heat: "불 없음", minutes: 2, visualCue: "두부 표면에 물방울이 많이 남지 않으면 됩니다.", commonMistake: "물기가 많으면 양념이 싱거워집니다.", rescueTip: "그릇 바닥에 물이 생기면 따라내고 다시 무치세요." },
      { order: 2, title: "오이 썰기", action: "오이 1/2개는 얇게 반달 모양으로 썹니다.", heat: "불 없음", minutes: 2, visualCue: "두부와 같이 숟가락에 올라갈 두께면 됩니다.", commonMistake: "두껍게 썰면 두부와 따로 먹게 됩니다.", rescueTip: "두꺼운 조각은 그릇 안에서 가위로 한 번 더 자르세요." },
      { order: 3, title: "양념 넣기", action: "간장 1큰술, 식초 1작은술, 참기름 1작은술을 그릇에 넣습니다.", heat: "불 없음", minutes: 1, visualCue: "양념이 두부 옆으로 살짝 고이면 충분합니다.", commonMistake: "처음부터 간장을 많이 넣으면 두부가 짜집니다.", rescueTip: "짜면 두부나 오이를 조금 더 넣어 같이 먹으세요." },
      { order: 4, title: "살살 무치기", action: "숟가락 두 개로 두부가 크게 부서지지 않게 들어 올리며 섞고 참깨를 뿌립니다.", heat: "불 없음", minutes: 2, visualCue: "오이와 두부 표면에 양념 윤기가 돌면 완성입니다.", commonMistake: "세게 비비면 두부가 으깨집니다.", rescueTip: "으깨졌다면 밥 위에 올려 비빔밥처럼 먹어도 됩니다." },
    ];
  }

  // 어묵김밥_STEPS_BATCH12
  if (title === "두부면샐러드") {
    return [
      { order: 1, title: "두부면 물기 빼기", action: "두부면 1팩의 포장 물을 버리고 찬물에 한 번 헹군 뒤 체에 밭쳐 물기를 뺍니다.", heat: "불 없음", minutes: 2, visualCue: "면에서 물방울이 거의 떨어지지 않으면 됩니다.", commonMistake: "물기가 많으면 드레싱이 싱거워집니다.", rescueTip: "이미 질척하면 키친타월로 그릇 바닥만 살짝 닦으세요." },
      { order: 2, title: "채소 준비", action: "샐러드채소는 한입 크기로 찢고 오이와 방울토마토는 먹기 좋게 썹니다.", heat: "불 없음", minutes: 2, visualCue: "채소가 젓가락으로 집히는 크기면 충분합니다.", commonMistake: "오이를 너무 두껍게 썰면 면과 따로 놉니다.", rescueTip: "큰 조각은 그릇 안에서 가위로 한 번 더 자르세요." },
      { order: 3, title: "드레싱 섞기", action: "간장 1큰술, 식초 1큰술, 참기름 1작은술을 작은 그릇에 섞습니다.", heat: "불 없음", minutes: 1, visualCue: "간장색 소스 위에 기름이 얇게 떠 있으면 됩니다.", commonMistake: "간장을 많이 넣으면 샐러드가 바로 짜집니다.", rescueTip: "짰다면 채소나 두부면을 조금 더 넣어 희석하세요." },
      { order: 4, title: "가볍게 비비기", action: "두부면과 채소에 드레싱을 붓고 젓가락으로 살살 들어 올리듯 섞은 뒤 참깨를 뿌립니다.", heat: "불 없음", minutes: 2, visualCue: "면과 채소 표면이 촉촉하게 코팅되면 완성입니다.", commonMistake: "세게 비비면 채소 숨이 빨리 죽습니다.", rescueTip: "숨이 죽었다면 그릇 가장자리에 새 채소를 조금 더 얹어 내세요." },
    ];
  }

  if (title === "브로콜리계란볶음") {
    return [
      { order: 1, title: "계란 풀기", action: "계란 2개를 그릇에 깨고 젓가락으로 20번 정도 풀어 둡니다.", heat: "불 없음", minutes: 1, visualCue: "노른자와 흰자가 노란색으로 고르게 섞이면 됩니다.", commonMistake: "팬 위에서 바로 깨면 껍질이 들어갈 수 있습니다.", rescueTip: "껍질이 들어가면 숟가락으로 건져낸 뒤 진행하세요." },
      { order: 2, title: "브로콜리 익히기", action: "팬에 식용유 1큰술, 브로콜리, 물 2큰술을 넣고 중불에서 4분 볶듯이 익힙니다.", heat: "중불", minutes: 4, visualCue: "브로콜리 색이 선명한 초록색이 되고 줄기가 살짝 부드러우면 됩니다.", commonMistake: "물 없이 볶으면 겉만 타고 속이 딱딱할 수 있습니다.", rescueTip: "타는 냄새가 나면 물 1큰술을 더 넣고 불을 약하게 줄이세요." },
      { order: 3, title: "계란 넣기", action: "불을 약불로 낮추고 계란물을 부어 크게 저어가며 2~3분 익힙니다.", heat: "약불", minutes: 3, visualCue: "계란이 촉촉한 덩어리로 굳으면 됩니다.", commonMistake: "센불에서 익히면 계란이 뻣뻣해집니다.", rescueTip: "계란이 너무 익었으면 밥 위에 올려 덮밥처럼 드세요." },
      { order: 4, title: "간하고 마무리", action: "간장 1작은술과 후추를 넣고 30초만 더 섞어 접시에 담습니다.", heat: "약불", minutes: 2, visualCue: "브로콜리와 계란에 간장색이 살짝 돌면 완성입니다.", commonMistake: "간장을 팬 한가운데 많이 붓면 한쪽만 짜집니다.", rescueTip: "짜면 브로콜리나 계란을 추가하거나 밥과 같이 먹으세요." },
    ];
  }

  if (title === "참치계란죽") {
    return [
      { order: 1, title: "밥과 참치 끓이기", action: "냄비에 밥 1공기, 물 2컵, 기름을 반쯤 뺀 참치 1/2캔을 넣고 중불로 끓입니다.", heat: "중불", minutes: 5, visualCue: "밥알이 물에 풀리고 가장자리가 보글거리면 됩니다.", commonMistake: "처음부터 물을 적게 넣으면 금방 눌어붙습니다.", rescueTip: "바닥이 눌기 시작하면 물 1/2컵을 추가하고 긁지 말고 살살 저으세요." },
      { order: 2, title: "죽처럼 풀기", action: "불을 약불로 낮추고 국자로 밥알을 눌러가며 3분 더 끓입니다.", heat: "약불", minutes: 3, visualCue: "국물이 걸쭉해지고 밥알이 퍼지면 됩니다.", commonMistake: "계속 세게 저으면 죽이 떡처럼 뭉칠 수 있습니다.", rescueTip: "너무 되직하면 물을 1/4컵씩 추가하세요." },
      { order: 3, title: "계란 넣기", action: "계란 1개를 풀어 냄비 가장자리로 천천히 붓고 30초 뒤 한 번만 저어줍니다.", heat: "약불", minutes: 2, visualCue: "계란이 노란 리본처럼 퍼지면 잘 들어간 것입니다.", commonMistake: "붓자마자 세게 저으면 계란이 잘게 흩어집니다.", rescueTip: "흩어져도 맛은 같으니 그대로 1분 더 익히세요." },
      { order: 4, title: "간 맞추기", action: "국간장 1큰술로 간하고 불을 끈 뒤 참기름과 대파를 올립니다.", heat: "불 없음", minutes: 2, visualCue: "죽이 숟가락에 부드럽게 올라오고 참기름 향이 나면 완성입니다.", commonMistake: "죽이 졸아든 뒤 간장을 많이 넣으면 짭니다.", rescueTip: "짜면 뜨거운 물 1/4컵을 넣고 다시 섞으세요." },
    ];
  }

  if (title === "어묵김밥") {
    return [
      { order: 1, title: "밥 간하기", action: "따뜻한 밥 1.5공기에 참기름 1/2큰술과 참깨를 넣고 섞은 뒤 2분 식힙니다.", heat: "불 없음", minutes: 2, visualCue: "밥알에 윤기가 돌고 김이 많이 나지 않으면 됩니다.", commonMistake: "뜨거운 밥을 바로 김에 올리면 김이 찢어집니다.", rescueTip: "밥이 너무 뜨거우면 넓은 접시에 펴서 식히세요." },
      { order: 2, title: "어묵 볶기", action: "어묵을 길게 썰어 팬에 넣고 간장 1큰술, 물 1큰술과 함께 중불에서 4분 볶습니다.", heat: "중불", minutes: 4, visualCue: "어묵 가장자리가 살짝 갈색이고 윤기가 나면 됩니다.", commonMistake: "간장만 넣으면 빨리 탈 수 있습니다.", rescueTip: "색이 빨리 진해지면 물 1큰술을 더 넣고 불을 낮추세요." },
      { order: 3, title: "김 위에 올리기", action: "김 위에 밥을 얇게 펴고 어묵, 오이, 단무지를 가운데에 길게 올립니다.", heat: "불 없음", minutes: 4, visualCue: "김 끝 2cm 정도는 밥 없이 비워두면 잘 붙습니다.", commonMistake: "밥을 두껍게 펴면 말 때 터집니다.", rescueTip: "재료가 많으면 한 줄에 다 넣지 말고 두 줄로 나누세요." },
      { order: 4, title: "말고 썰기", action: "김발이나 손으로 단단히 말고 참기름을 겉에 살짝 바른 뒤 한입 크기로 썹니다.", heat: "불 없음", minutes: 5, visualCue: "썰었을 때 속재료가 가운데에 모여 있으면 완성입니다.", commonMistake: "칼에 밥이 붙으면 단면이 지저분해집니다.", rescueTip: "칼날에 물을 살짝 묻혀 한 조각씩 썰어보세요." },
    ];
  }

  // 닭가슴살오이냉채_STEPS_BATCH11
  if (title === "콩나물냉국") {
    return [
      { order: 1, title: "콩나물 삶기", action: "냄비에 물 2컵과 콩나물 1줌을 넣고 중불에서 5분 끓입니다.", heat: "중불", minutes: 5, visualCue: "콩나물 숨이 죽고 줄기가 반투명해지면 됩니다.", commonMistake: "뚜껑을 열었다 닫았다 하면 비린내가 날 수 있습니다.", rescueTip: "처음부터 뚜껑을 열고 끓이면 실패가 적습니다." },
      { order: 2, title: "식히기", action: "콩나물은 체에 건지고 국물은 그릇에 담아 3분 식힙니다.", heat: "불 없음", minutes: 3, visualCue: "김이 많이 줄어 손 가까이에 두어도 뜨겁지 않으면 됩니다.", commonMistake: "뜨거울 때 바로 식초를 넣으면 새콤한 향이 약해집니다.", rescueTip: "급하면 얼음 2개를 먼저 넣어 식히세요." },
      { order: 3, title: "국물 간하기", action: "식힌 국물에 국간장 1큰술, 식초 1큰술, 설탕 1작은술을 넣고 섞습니다.", heat: "불 없음", minutes: 2, visualCue: "설탕 알갱이가 보이지 않으면 됩니다.", commonMistake: "간장을 많이 넣으면 국물이 어두워지고 짭니다.", rescueTip: "짜면 차가운 물 1/2컵을 더 넣으세요." },
      { order: 4, title: "마무리", action: "콩나물, 얇게 썬 오이, 얼음을 넣고 참깨를 뿌립니다.", heat: "불 없음", minutes: 2, visualCue: "국물이 차갑고 오이가 위에 떠 있으면 완성입니다.", commonMistake: "얼음을 너무 많이 넣으면 싱거워집니다.", rescueTip: "싱거워지면 간장 1/2작은술만 추가하세요." },
    ];
  }

  if (title === "계란카레덮밥") {
    return [
      { order: 1, title: "카레 데우기", action: "냄비에 물을 끓이고 즉석카레 봉지를 넣어 중불에서 3분 데웁니다.", heat: "중불", minutes: 3, visualCue: "봉지가 전체적으로 따뜻해지고 카레가 부드럽게 움직이면 됩니다.", commonMistake: "봉지를 뜯은 채 물에 넣으면 카레가 물에 섞입니다.", rescueTip: "봉지가 새면 새 냄비에 카레만 붓고 약불로 데우세요." },
      { order: 2, title: "계란 익히기", action: "팬에 식용유 1작은술을 두르고 계란 2개를 약불에서 크게 저어 익힙니다.", heat: "약불", minutes: 3, visualCue: "계란이 촉촉한 덩어리로 익으면 됩니다.", commonMistake: "센불이면 계란이 빨리 마르고 딱딱해집니다.", rescueTip: "퍽퍽하면 불을 끄고 물 1큰술을 넣어 섞으세요." },
      { order: 3, title: "밥 위에 담기", action: "그릇에 밥 1공기를 담고 데운 카레와 계란을 올립니다.", heat: "불 없음", minutes: 2, visualCue: "밥 한쪽은 카레, 한쪽은 계란이 보이면 먹기 좋습니다.", commonMistake: "카레를 한 번에 다 부으면 밥이 너무 질어질 수 있습니다.", rescueTip: "카레는 2/3만 먼저 붓고 모자라면 더 넣으세요." },
      { order: 4, title: "섞어 먹기", action: "먹기 직전에 숟가락으로 카레와 계란을 밥에 가볍게 섞습니다.", heat: "불 없음", minutes: 2, visualCue: "노란 카레와 계란이 밥에 고르게 묻으면 완성입니다.", commonMistake: "너무 오래 비비면 밥알이 뭉개집니다.", rescueTip: "되직하면 따뜻한 물 1큰술을 카레 쪽에 섞으세요." },
    ];
  }

  if (title === "김치치즈주먹밥") {
    return [
      { order: 1, title: "김치 준비", action: "김치 1/3컵은 국물을 꼭 짜고 가위로 잘게 자릅니다.", heat: "불 없음", minutes: 2, visualCue: "김치 조각이 밥알보다 조금 큰 정도면 됩니다.", commonMistake: "김치국물이 많으면 밥이 질어집니다.", rescueTip: "이미 질어졌다면 김가루를 더 넣어 수분을 잡으세요." },
      { order: 2, title: "밥 섞기", action: "밥 1공기에 김치, 김가루, 참기름, 참깨를 넣고 섞습니다.", heat: "불 없음", minutes: 2, visualCue: "밥알 전체에 김치 색이 연하게 묻으면 됩니다.", commonMistake: "밥을 너무 세게 누르면 떡처럼 뭉칩니다.", rescueTip: "숟가락 두 개로 가볍게 풀어가며 섞으세요." },
      { order: 3, title: "치즈 넣고 뭉치기", action: "슬라이스치즈를 작게 접어 밥 안에 넣고 한입 크기로 단단히 뭉칩니다.", heat: "불 없음", minutes: 3, visualCue: "치즈가 밖으로 많이 보이지 않으면 됩니다.", commonMistake: "밥을 너무 크게 만들면 속까지 따뜻해지기 어렵습니다.", rescueTip: "큰 주먹밥은 반으로 나눠 다시 뭉치세요." },
      { order: 4, title: "겉면 굽기", action: "팬을 약불로 두고 주먹밥을 앞뒤로 1분씩 굽습니다.", heat: "약불", minutes: 3, visualCue: "겉면이 살짝 노릇하고 치즈가 부드러워지면 완성입니다.", commonMistake: "자주 뒤집으면 주먹밥이 부서집니다.", rescueTip: "부서지면 그릇에 담아 김치치즈밥처럼 숟가락으로 먹어도 됩니다." },
    ];
  }

  if (title === "닭가슴살오이냉채") {
    return [
      { order: 1, title: "재료 찢고 썰기", action: "익힌 닭가슴살은 손으로 찢고 오이 1/2개는 얇게 채 썹니다.", heat: "불 없음", minutes: 3, visualCue: "닭가슴살과 오이가 비슷한 길이면 젓가락으로 집기 쉽습니다.", commonMistake: "오이를 너무 두껍게 썰면 소스가 겉돕니다.", rescueTip: "두꺼운 오이는 그릇 안에서 가위로 한 번 더 자르세요." },
      { order: 2, title: "소스 만들기", action: "그릇에 식초 1큰술, 간장 1큰술, 설탕 1작은술, 연겨자 1/2작은술을 섞습니다.", heat: "불 없음", minutes: 2, visualCue: "겨자가 덩어리 없이 풀리면 됩니다.", commonMistake: "겨자를 많이 넣으면 코가 매울 수 있습니다.", rescueTip: "매우면 설탕 1/2작은술과 물 1큰술을 더하세요." },
      { order: 3, title: "버무리기", action: "닭가슴살과 오이에 소스를 넣고 젓가락으로 가볍게 버무립니다.", heat: "불 없음", minutes: 2, visualCue: "오이와 닭가슴살 표면이 촉촉하게 코팅되면 됩니다.", commonMistake: "세게 비비면 닭가슴살이 으깨져 퍽퍽해 보입니다.", rescueTip: "으깨졌다면 접시에 넓게 펴고 참깨를 뿌려 내세요." },
      { order: 4, title: "차게 내기", action: "가능하면 냉장고에 3분 두었다가 참깨를 뿌려 먹습니다.", heat: "불 없음", minutes: 1, visualCue: "그릇이 차갑고 소스 향이 올라오면 완성입니다.", commonMistake: "오래 두면 오이에서 물이 나와 싱거워집니다.", rescueTip: "물이 생기면 간장 1/2작은술만 더 넣으세요." },
    ];
  }

  // 김치콩나물국_STEPS_BATCH10
  if (title === "오이참치비빔밥") {
    return [
      { order: 1, title: "참치 물기 빼기", action: "참치캔 1/2캔은 뚜껑으로 눌러 기름이나 물을 먼저 뺍니다.", heat: "불 없음", minutes: 1, visualCue: "참치가 촉촉하지만 국물이 줄줄 흐르지 않으면 됩니다.", commonMistake: "기름을 그대로 넣으면 밥이 질척해집니다.", rescueTip: "이미 넣었다면 김가루를 조금 더 넣어 수분을 잡으세요." },
      { order: 2, title: "오이 썰기", action: "오이 1/3개를 작게 깍둑썰기하거나 얇게 채 썹니다.", heat: "불 없음", minutes: 2, visualCue: "숟가락에 밥과 같이 올라갈 정도의 크기면 됩니다.", commonMistake: "너무 크게 썰면 비빌 때 따로 놀 수 있습니다.", rescueTip: "큰 조각은 가위로 그릇 안에서 한 번 더 잘라도 됩니다." },
      { order: 3, title: "밥 위에 올리기", action: "그릇에 밥 1공기, 참치, 오이, 고추장 1큰술, 간장 1작은술을 올립니다.", heat: "불 없음", minutes: 2, visualCue: "양념이 밥 한가운데 모여 있으면 비비기 쉽습니다.", commonMistake: "고추장을 처음부터 많이 넣으면 맵고 짤 수 있습니다.", rescueTip: "매우면 밥을 2~3숟가락 더 넣으세요." },
      { order: 4, title: "비비기", action: "참기름 1작은술과 김가루를 넣고 숟가락으로 골고루 비빕니다.", heat: "불 없음", minutes: 2, visualCue: "밥알 전체가 붉게 코팅되고 오이가 고르게 보이면 완성입니다.", commonMistake: "세게 누르듯 비비면 밥이 뭉개집니다.", rescueTip: "뭉친 밥은 숟가락 두 개로 가볍게 풀어주세요." },
    ];
  }

  if (title === "참치마요주먹밥") {
    return [
      { order: 1, title: "참치 물기 빼기", action: "참치캔 1/2캔은 뚜껑이나 숟가락으로 눌러 기름을 빼고 그릇에 담습니다.", heat: "불 없음", minutes: 2, visualCue: "그릇 바닥에 기름이 많이 고이지 않으면 됩니다.", commonMistake: "기름을 그대로 넣으면 주먹밥이 질어져 잘 안 뭉칩니다.", rescueTip: "이미 질어졌다면 김가루 1큰술을 더 넣어 수분을 잡으세요." },
      { order: 2, title: "참치마요 섞기", action: "참치에 마요네즈 1큰술과 간장 1작은술을 넣고 숟가락으로 10번 섞습니다.", heat: "불 없음", minutes: 1, visualCue: "참치가 촉촉하게 뭉쳐 숟가락에 올라오면 됩니다.", commonMistake: "마요네즈를 많이 넣으면 밥까지 미끄러워집니다.", rescueTip: "질척하면 참치나 밥을 1큰술씩 더 넣으세요." },
      { order: 3, title: "밥과 김가루 섞기", action: "따뜻한 밥 1공기에 참치마요, 김가루 1줌, 참깨를 넣고 숟가락 두 개로 가볍게 섞습니다.", heat: "불 없음", minutes: 2, visualCue: "김가루가 밥 전체에 고르게 보이면 됩니다.", commonMistake: "뜨거운 밥을 바로 손으로 만지면 손이 뜨겁습니다.", rescueTip: "밥을 넓게 펴서 2분 식힌 뒤 뭉치세요." },
      { order: 4, title: "한입 크기로 뭉치기", action: "위생장갑이나 랩을 끼고 밥을 4~5등분해 한입 크기로 꾹 눌러 동그랗게 만듭니다.", heat: "불 없음", minutes: 3, visualCue: "손에서 놓아도 모양이 유지되면 완성입니다.", commonMistake: "너무 크게 만들면 먹을 때 부서집니다.", rescueTip: "부서지면 작은 크기로 다시 나눠 꼭 눌러주세요." },
    ];
  }

  if (title === "계란양배추토스트") {
    return [
      { order: 1, title: "양배추 계란물 만들기", action: "그릇에 계란 1개를 풀고 채 썬 양배추 1줌, 소금 한 꼬집을 섞습니다.", heat: "불 없음", minutes: 2, visualCue: "양배추가 계란물에 골고루 묻어 있으면 됩니다.", commonMistake: "양배추가 너무 두꺼우면 속까지 익기 어렵습니다.", rescueTip: "두껍게 썰었다면 가위로 그릇 안에서 한 번 더 자르세요." },
      { order: 2, title: "속재료 부치기", action: "팬에 식용유 1작은술을 두르고 양배추 계란물을 약불에서 앞뒤로 2분씩 굽습니다.", heat: "약불", minutes: 4, visualCue: "계란이 흐르지 않고 한 덩어리로 뒤집히면 됩니다.", commonMistake: "센불로 굽면 겉만 타고 양배추가 덜 익습니다.", rescueTip: "색이 빨리 나면 불을 끄고 잔열로 1분 더 익히세요." },
      { order: 3, title: "식빵 굽기", action: "같은 팬에 식빵 2장을 앞뒤로 30초씩 살짝 굽습니다.", heat: "약불", minutes: 2, visualCue: "식빵 표면이 살짝 노릇하면 됩니다.", commonMistake: "식빵을 오래 두면 금방 탑니다.", rescueTip: "탔다면 탄 면을 안쪽으로 두고 소스를 조금 더 바르세요." },
      { order: 4, title: "샌드하기", action: "식빵에 케첩과 마요네즈를 바르고 양배추 계란을 끼워 반으로 자릅니다.", heat: "불 없음", minutes: 2, visualCue: "속재료가 식빵 밖으로 많이 밀리지 않으면 완성입니다.", commonMistake: "소스를 많이 바르면 빵이 눅눅해집니다.", rescueTip: "눅눅하면 바로 먹거나 종이호일로 감싸 모양을 잡으세요." },
    ];
  }

  if (title === "김치콩나물국") {
    return [
      { order: 1, title: "재료 넣기", action: "냄비에 물 2컵, 김치 1/2컵, 콩나물 1줌을 넣습니다.", heat: "불 없음", minutes: 2, visualCue: "콩나물이 물에 반쯤 잠기면 됩니다.", commonMistake: "콩나물을 너무 많이 넣으면 물이 부족해집니다.", rescueTip: "냄비가 빡빡하면 물 1/2컵을 더 넣으세요." },
      { order: 2, title: "끓이기", action: "뚜껑을 열고 중불에서 7분 끓입니다.", heat: "중불", minutes: 7, visualCue: "콩나물 숨이 죽고 국물이 붉게 우러나면 됩니다.", commonMistake: "중간에 뚜껑을 열고 닫으면 콩나물 비린내가 날 수 있습니다.", rescueTip: "처음부터 뚜껑을 열고 끓이면 초보자도 실패가 적습니다." },
      { order: 3, title: "간 맞추기", action: "국간장 1큰술과 다진 마늘 1/2작은술을 넣고 2분 더 끓입니다.", heat: "약불", minutes: 2, visualCue: "국물이 시원하고 콩나물이 투명하게 익으면 완성입니다.", commonMistake: "간장을 많이 넣으면 국물이 탁하고 짭니다.", rescueTip: "짜면 물 1/2컵을 더 넣고 1분 더 끓이세요." },
      { order: 4, title: "마무리", action: "대파를 넣고 불을 끈 뒤 30초만 두었다가 그릇에 담습니다.", heat: "불 없음", minutes: 1, visualCue: "대파 향이 올라오면 됩니다.", commonMistake: "대파를 오래 끓이면 향이 약해집니다.", rescueTip: "대파가 없다면 생략해도 됩니다." },
    ];
  }

  // 토마토계란국_STEPS_BATCH9
  if (title === "토마토카프레제") {
    return [
      { order: 1, title: "재료 자르기", action: "토마토는 0.7cm 두께로 썰고 모짜렐라치즈는 한입 크기로 자릅니다.", heat: "불 없음", minutes: 3, visualCue: "토마토와 치즈가 비슷한 크기면 담았을 때 보기 좋습니다.", commonMistake: "토마토를 너무 얇게 썰면 물이 많이 나옵니다.", rescueTip: "물이 많아졌다면 키친타월로 접시 가장자리를 살짝 닦으세요." },
      { order: 2, title: "물기 닦기", action: "접시에 담기 전 토마토 단면의 물기를 키친타월로 한 번만 살짝 눌러 닦습니다.", heat: "불 없음", minutes: 1, visualCue: "접시 바닥에 토마토 물이 많이 고이지 않으면 됩니다.", commonMistake: "물기가 많으면 올리브유와 소금이 흘러내립니다.", rescueTip: "이미 물이 고이면 접시 가장자리만 키친타월로 닦으세요." },
      { order: 3, title: "접시에 번갈아 담기", action: "접시에 토마토와 치즈를 번갈아 놓고 숟가락으로 모양을 살짝 정리합니다.", heat: "불 없음", minutes: 2, visualCue: "빨간색과 흰색이 번갈아 보이면 됩니다.", commonMistake: "치즈를 한곳에 몰아두면 한입마다 맛이 달라집니다.", rescueTip: "젓가락으로 치즈를 토마토 사이사이에 다시 끼우세요." },
      { order: 4, title: "간하고 바로 먹기", action: "올리브유 1큰술, 소금 한 꼬집, 후추를 뿌리고 발사믹식초는 있으면 1작은술만 더합니다.", heat: "불 없음", minutes: 1, visualCue: "표면에 윤기가 돌고 소금이 뭉치지 않으면 완성입니다.", commonMistake: "처음부터 소금을 많이 뿌리면 짜집니다.", rescueTip: "짜면 토마토를 몇 조각 더 넣어 같이 먹으세요." },
    ];
  }

  if (title === "두부면비빔국수") {
    return [
      { order: 1, title: "두부면 헹구기", action: "두부면 1팩의 물을 버리고 찬물에 한 번 헹군 뒤 체에 밭쳐 물기를 뺍니다.", heat: "불 없음", minutes: 2, visualCue: "면이 서로 너무 붙지 않고 물방울이 거의 떨어지지 않으면 됩니다.", commonMistake: "물기를 많이 남기면 양념이 싱거워집니다.", rescueTip: "키친타월로 그릇 바닥의 물만 한 번 닦아내세요." },
      { order: 2, title: "오이 준비", action: "오이 1/4개는 얇게 채 썰고 물기가 많으면 키친타월로 살짝 눌러 둡니다.", heat: "불 없음", minutes: 2, visualCue: "오이가 두부면과 비슷한 길이로 보이면 됩니다.", commonMistake: "오이가 너무 두꺼우면 면과 따로 씹힙니다.", rescueTip: "두꺼운 오이는 그릇 안에서 가위로 한 번 더 자르세요." },
      { order: 3, title: "양념장 만들기", action: "그릇에 고추장 1큰술, 식초 1큰술, 설탕 1작은술, 참기름 1작은술을 섞습니다.", heat: "불 없음", minutes: 2, visualCue: "고추장 덩어리가 풀려 붉은 소스처럼 보이면 됩니다.", commonMistake: "고추장을 많이 넣으면 너무 맵고 뻑뻑합니다.", rescueTip: "맵다면 설탕 1/2작은술과 물 1작은술을 더하세요." },
      { order: 4, title: "면 비비기", action: "두부면과 오이를 양념장에 넣고 젓가락으로 아래에서 위로 들어 올리며 15번 비빕니다.", heat: "불 없음", minutes: 2, visualCue: "면 전체가 붉게 코팅되면 완성입니다.", commonMistake: "세게 비비면 두부면이 끊어질 수 있습니다.", rescueTip: "끊어져도 맛은 괜찮으니 숟가락으로 떠먹는 비빔면처럼 내세요." },
    ];
  }

  if (title === "크래미유부초밥") {
    return [
      { order: 1, title: "밥 양념하기", action: "따뜻한 밥 1공기에 유부초밥키트의 초밥초를 넣고 섞습니다.", heat: "불 없음", minutes: 3, visualCue: "밥알에 윤기가 돌고 초밥초가 한쪽에 고이지 않으면 됩니다.", commonMistake: "찬밥에 섞으면 뭉치기 쉽습니다.", rescueTip: "찬밥이면 전자레인지에 40초 데운 뒤 다시 섞으세요." },
      { order: 2, title: "크래미 찢기", action: "크래미 2개를 손으로 길게 찢고 오이 1/4개는 잘게 썰어 그릇에 담습니다.", heat: "불 없음", minutes: 2, visualCue: "크래미가 밥 위에 올리기 좋은 가는 결로 풀리면 됩니다.", commonMistake: "크래미 덩어리가 크면 유부 위에서 떨어집니다.", rescueTip: "큰 덩어리는 손으로 한 번 더 찢어 주세요." },
      { order: 3, title: "토핑 섞기", action: "크래미와 오이에 마요네즈 1큰술을 넣고 숟가락으로 10번만 섞습니다.", heat: "불 없음", minutes: 1, visualCue: "크래미가 촉촉하게 뭉쳐 숟가락에 올라오면 됩니다.", commonMistake: "마요네즈를 너무 많이 넣으면 질척해집니다.", rescueTip: "질척하면 크래미를 조금 더 찢어 넣거나 밥 위에 적게 올리세요." },
      { order: 4, title: "유부 채우기", action: "조미유부를 살짝 벌려 밥을 80%만 채우고 위에 크래미 토핑을 올립니다.", heat: "불 없음", minutes: 4, visualCue: "유부가 찢어지지 않고 윗면에 토핑이 보이면 완성입니다.", commonMistake: "밥을 끝까지 채우면 토핑이 올라가지 않습니다.", rescueTip: "너무 꽉 찼다면 밥을 조금 덜어내고 다시 올리세요." },
    ];
  }

  if (title === "토마토계란국") {
    return [
      { order: 1, title: "재료 준비", action: "토마토는 큼직하게 썰고 계란 1개는 그릇에 풀어 둡니다.", heat: "불 없음", minutes: 2, visualCue: "계란 노른자와 흰자가 섞여 노란색이 고르게 보이면 됩니다.", commonMistake: "계란을 냄비 위에서 바로 깨면 껍질이 들어갈 수 있습니다.", rescueTip: "껍질이 들어가면 숟가락으로 건져낸 뒤 진행하세요." },
      { order: 2, title: "토마토 끓이기", action: "냄비에 물 2컵과 토마토를 넣고 중불에서 5분 끓입니다.", heat: "중불", minutes: 5, visualCue: "토마토 가장자리가 살짝 풀어지고 국물이 연한 붉은색이면 됩니다.", commonMistake: "센불로 오래 끓이면 물이 빨리 줄어듭니다.", rescueTip: "국물이 줄었다면 물 1/3컵을 추가하고 다시 끓이세요." },
      { order: 3, title: "계란 천천히 붓기", action: "불을 약불로 낮추고 풀어 둔 계란을 냄비 가장자리로 천천히 부은 뒤 20초 기다립니다.", heat: "약불", minutes: 1, visualCue: "계란이 얇은 리본처럼 떠오르면 잘 익고 있습니다.", commonMistake: "붓자마자 세게 저으면 국물이 탁해집니다.", rescueTip: "이미 탁해졌다면 그대로 30초만 더 끓이세요." },
      { order: 4, title: "간하고 담기", action: "국간장 1큰술을 넣고 한 번만 저은 뒤 대파가 있으면 올려 그릇에 담습니다.", heat: "불 없음", minutes: 2, visualCue: "토마토는 부드럽고 계란은 흐르지 않으면 완성입니다.", commonMistake: "간장을 더 넣기 전에 맛보지 않으면 금방 짜집니다.", rescueTip: "짜면 뜨거운 물 1/2컵을 더 넣고 30초만 데우세요." },
    ];
  }

  if (title === "양배추달걀전") {
    return [
      {
        order: 1,
        title: "양배추와 계란 준비",
        action: "양배추 1줌을 가늘게 채 썰고 계란 2개는 소금 1꼬집을 넣어 풀어 둡니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "양배추가 젓가락으로 한 번에 집히는 얇은 두께면 됩니다.",
        commonMistake: "양배추가 두꺼우면 팬에서 오래 익고 전이 찢어집니다.",
        rescueTip: "두껍게 썰었다면 그릇 안에서 가위로 한 번 더 잘라 주세요.",
      },
      {
        order: 2,
        title: "계란물에 섞기",
        action: "계란물에 양배추를 넣고 젓가락으로 들어 올리듯 섞습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "양배추 표면에 계란물이 고르게 묻으면 됩니다.",
        commonMistake: "양배추가 너무 많으면 계란이 부족해 서로 붙지 않습니다.",
        rescueTip: "흩어지면 계란 1개를 더 풀어 넣으세요.",
      },
      {
        order: 3,
        title: "얇게 부치기",
        action: "팬에 식용유 1큰술을 두르고 중약불에서 양배추 계란물을 얇게 펼쳐 3분 익힙니다.",
        heat: "중약불",
        minutes: 3,
        visualCue: "가장자리가 굳고 윗면의 계란물이 거의 흐르지 않으면 뒤집을 때입니다.",
        commonMistake: "두껍게 올리면 겉은 타고 속은 덜 익습니다.",
        rescueTip: "너무 두꺼우면 뒤집기 전에 반으로 나눠 작은 전처럼 익히세요.",
      },
      {
        order: 4,
        title: "뒤집어 마무리",
        action: "뒤집개를 깊게 넣어 한 번에 뒤집고 약불에서 2분 더 익힌 뒤 접시에 담습니다.",
        heat: "약불",
        minutes: 2,
        visualCue: "양면이 연한 갈색이고 가운데가 질척하지 않으면 완성입니다.",
        commonMistake: "덜 굳었을 때 뒤집으면 찢어집니다.",
        rescueTip: "찢어졌다면 조각전처럼 나눠 1분 더 익히면 됩니다.",
      },
    ];
  }

  if (title === "참치계란말이") {
    return [
      {
        order: 1,
        title: "참치 물기 빼기",
        action: "참치캔 1/2캔은 숟가락으로 눌러 기름을 빼고 대파는 잘게 썹니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "그릇 바닥에 기름이 고이지 않으면 말기 쉽습니다.",
        commonMistake: "참치 기름이 많으면 계란물이 묽어져 찢어집니다.",
        rescueTip: "이미 질척하면 키친타월로 참치를 한 번 눌러 주세요.",
      },
      {
        order: 2,
        title: "계란물 만들기",
        action: "계란 4개, 참치, 대파, 소금 1꼬집을 넣고 젓가락으로 30번 정도 섞습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "참치가 큰 덩어리 없이 계란물에 퍼지면 됩니다.",
        commonMistake: "참치 덩어리가 크면 말 때 표면이 터집니다.",
        rescueTip: "큰 덩어리는 숟가락으로 으깨고 다시 섞으세요.",
      },
      {
        order: 3,
        title: "첫 계란물 말기",
        action: "팬에 식용유를 얇게 두르고 약불에서 계란물 절반을 부어 가장자리가 굳으면 앞으로 천천히 말아줍니다.",
        heat: "약불",
        minutes: 4,
        visualCue: "윗면이 살짝 촉촉하지만 바닥이 굳었을 때 말면 됩니다.",
        commonMistake: "센불에서 익히면 바닥만 타고 안쪽은 덜 익습니다.",
        rescueTip: "찢어지면 다음 계란물을 부어 찢어진 부분을 덮어 주세요.",
      },
      {
        order: 4,
        title: "두 번째 계란물로 완성",
        action: "말아 둔 계란을 팬 끝으로 밀고 남은 계란물을 부어 이어 붙인 뒤 3분 더 말아 익힙니다.",
        heat: "약불",
        minutes: 3,
        visualCue: "겉면이 연한 노란색이고 손으로 눌렀을 때 물컹하지 않으면 완성입니다.",
        commonMistake: "바로 썰면 속이 흐트러질 수 있습니다.",
        rescueTip: "접시에 옮겨 2분 식힌 뒤 썰면 모양이 잘 잡힙니다.",
      },
    ];
  }

  const method = inferMethod(title);
  const mainName = title.replace(/^전자레인지\s*/, "");

  if (title === "간장계란밥") {
    return [
      {
        order: 1,
        title: "계란 튀기듯 굽기",
        action: "팬에 식용유 1큰술을 두르고 중불에서 계란 2~3개를 가장자리가 살짝 바삭해질 때까지 프라이합니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "흰자는 완전히 하얗고 가장자리는 연한 갈색, 노른자는 취향대로 익으면 됩니다.",
        commonMistake: "기름이 너무 적으면 계란이 팬에 붙고 가장자리가 바삭해지지 않습니다.",
        rescueTip: "계란이 찢어져도 밥에 비빌 메뉴라 그대로 써도 됩니다.",
      },
      {
        order: 2,
        title: "밥 위에 올리기",
        action: "따뜻한 밥 1.5공기를 그릇에 담고 프라이한 계란을 밥 위에 올립니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "계란이 밥을 덮고 노른자가 가운데 오면 비비기 쉽습니다.",
        commonMistake: "찬밥을 그대로 쓰면 양념이 잘 섞이지 않습니다.",
        rescueTip: "밥이 차가우면 전자레인지에 1분 데운 뒤 사용하세요.",
      },
      {
        order: 3,
        title: "양념 넣기",
        action: "간장 2큰술, 참기름 1큰술, 참깨 1작은술을 넣습니다. 고소한 맛을 더 원하면 참기름은 1.5큰술까지 넣습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "간장이 밥 가장자리로 살짝 흐르고 참깨가 계란 위에 보이면 충분합니다.",
        commonMistake: "간장을 처음부터 더 넣으면 짜서 되돌리기 어렵습니다.",
        rescueTip: "짜면 밥을 반 공기 더 넣고, 싱거우면 간장 1작은술만 추가하세요.",
      },
      {
        order: 4,
        title: "비벼서 완성",
        action: "숟가락으로 계란을 잘라 밥과 양념이 고르게 섞이도록 비빕니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "밥알이 연한 갈색으로 고르게 코팅되고 계란 조각이 골고루 보이면 완성입니다.",
        commonMistake: "노른자만 먼저 터뜨리고 대충 섞으면 한쪽은 짜고 한쪽은 싱거워집니다.",
        rescueTip: "질척하면 김가루나 참깨를 조금 더 넣어 고소하게 잡으세요.",
      },
    ];
  }

  if (title === "두부계란덮밥") {
    return [
      {
        order: 1,
        title: "두부 물기 빼기",
        action: "두부 1모는 키친타월로 겉물기를 누르고 숟가락으로 한입 크기보다 조금 작게 으깹니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "두부가 큰 덩어리 없이 숟가락으로 떠지는 크기면 됩니다.",
        commonMistake: "물기를 그대로 두면 밥 위에 올렸을 때 질척합니다.",
        rescueTip: "물이 많이 나오면 팬에 넣기 전 한 번 더 키친타월로 눌러 주세요.",
      },
      {
        order: 2,
        title: "두부 볶기",
        action: "팬에 식용유 1큰술을 두르고 중불에서 두부를 2분 볶아 수분을 날립니다.",
        heat: "중불",
        minutes: 2,
        visualCue: "팬 바닥에 물이 고이지 않고 두부 표면이 보송해지면 됩니다.",
        commonMistake: "처음부터 세게 볶으면 두부가 튀고 팬에 붙습니다.",
        rescueTip: "붙기 시작하면 불을 약하게 줄이고 식용유를 반 큰술만 더 넣으세요.",
      },
      {
        order: 3,
        title: "계란 넣기",
        action: "계란 2개를 풀어 두부 위에 붓고 젓가락으로 크게 저어 반숙 스크램블처럼 익힙니다.",
        heat: "약불",
        minutes: 2,
        visualCue: "계란이 촉촉하게 뭉치고 투명한 부분이 거의 없어지면 됩니다.",
        commonMistake: "너무 오래 익히면 퍽퍽해집니다.",
        rescueTip: "퍽퍽하면 물 1큰술을 넣고 20초만 더 섞어 주세요.",
      },
      {
        order: 4,
        title: "밥에 올리고 간 맞추기",
        action: "따뜻한 밥 1공기 위에 두부계란을 올리고 간장 1큰술, 참기름 1작은술을 둘러 비빕니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "밥알에 연한 간장색이 돌고 두부와 계란이 고르게 섞이면 완성입니다.",
        commonMistake: "간장을 처음부터 많이 넣으면 짭니다.",
        rescueTip: "짜면 밥을 반 공기 더 넣고, 싱거우면 간장 1작은술만 추가하세요.",
      },
    ];
  }

  if (title === "양파참치덮밥") {
    return [
      {
        order: 1,
        title: "참치와 양파 준비",
        action: "참치캔은 기름을 절반만 빼고, 양파 1/4개는 얇게 썹니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "양파가 너무 두껍지 않아야 빨리 익고 단맛이 납니다.",
        commonMistake: "참치 기름을 전부 넣으면 덮밥이 느끼하고 질척합니다.",
        rescueTip: "기름이 많이 들어갔으면 키친타월로 팬 가장자리를 한 번 닦으세요.",
      },
      {
        order: 2,
        title: "양파 먼저 볶기",
        action: "팬에 식용유 1큰술을 두르고 중불에서 양파를 2분 볶습니다.",
        heat: "중불",
        minutes: 2,
        visualCue: "양파 가장자리가 투명해지면 참치를 넣을 타이밍입니다.",
        commonMistake: "양파가 두꺼우면 겉만 익고 매운맛이 남습니다.",
        rescueTip: "매운 냄새가 강하면 물 1큰술을 넣고 30초 더 볶으세요.",
      },
      {
        order: 3,
        title: "참치 넣고 간하기",
        action: "참치와 간장 1큰술을 넣고 1분만 섞어 짭짤한 덮밥 토핑을 만듭니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "참치가 양파 사이에 고르게 섞이고 팬 바닥이 너무 마르지 않으면 됩니다.",
        commonMistake: "참치를 오래 볶으면 퍽퍽합니다.",
        rescueTip: "마르면 물 1큰술을 넣고 바로 불을 끄세요.",
      },
      {
        order: 4,
        title: "밥 위에 올리기",
        action: "따뜻한 밥 위에 양파참치를 올리고 참기름 1작은술을 둘러 마무리합니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "밥 위에 토핑이 촉촉하게 덮이면 완성입니다.",
        commonMistake: "밥이 차가우면 참치 기름이 굳어 느끼합니다.",
        rescueTip: "찬밥이면 전자레인지에 1분 데운 뒤 올리세요.",
      },
    ];
  }

  if (title === "감자계란국") {
    return [
      {
        order: 1,
        title: "감자 얇게 썰기",
        action: "감자 1개는 껍질을 벗기고 0.5cm 두께로 얇게 썹니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "감자 조각이 두껍지 않아야 10분 안에 부드럽게 익습니다.",
        commonMistake: "감자가 두꺼우면 계란은 익었는데 감자만 딱딱합니다.",
        rescueTip: "두껍게 썰었다면 끓이는 시간을 3분 더 늘리세요.",
      },
      {
        order: 2,
        title: "감자 먼저 끓이기",
        action: "냄비에 물 2컵과 감자를 넣고 중불에서 7분 끓입니다.",
        heat: "중불",
        minutes: 7,
        visualCue: "감자를 젓가락으로 찔렀을 때 힘을 많이 주지 않아도 들어가면 됩니다.",
        commonMistake: "물을 너무 적게 넣으면 감자가 익기 전에 짜집니다.",
        rescueTip: "국물이 줄었으면 물 반 컵을 더 넣으세요.",
      },
      {
        order: 3,
        title: "간 맞추기",
        action: "국간장 1큰술을 넣고 한입 맛봅니다. 싱거우면 소금 한 꼬집만 더합니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "국물 색이 아주 옅은 갈색이면 충분합니다.",
        commonMistake: "간장을 많이 넣으면 국물 색이 진하고 짜집니다.",
        rescueTip: "짜면 물 반 컵과 감자 몇 조각을 더 넣어 희석하세요.",
      },
      {
        order: 4,
        title: "계란 풀어 넣기",
        action: "계란 1개를 풀어 국물에 천천히 붓고 20초 뒤 한두 번만 저어 익힙니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "계란이 노란 리본처럼 떠오르면 불을 끄면 됩니다.",
        commonMistake: "붓자마자 계속 저으면 국물이 탁해집니다.",
        rescueTip: "탁해져도 맛은 괜찮으니 대파나 후추를 조금 넣어 마무리하세요.",
      },
    ];
  }

  if (title === "알배추간장무침") {
    return [
      {
        order: 1,
        title: "알배추 씻기",
        action: "알배추 4장은 한 장씩 떼어 흐르는 물에 씻고 물기를 털어 냅니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "잎 사이 흙이 없고 물방울이 많이 떨어지지 않으면 됩니다.",
        commonMistake: "물기가 많으면 양념이 묽어집니다.",
        rescueTip: "물기가 많으면 키친타월로 잎 끝을 눌러 주세요.",
      },
      {
        order: 2,
        title: "먹기 좋게 자르기",
        action: "배추를 손가락 두 마디 크기로 자르거나 손으로 찢습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "한입에 들어가는 크기면 젓가락으로 집기 쉽습니다.",
        commonMistake: "너무 크게 두면 양념이 고르게 묻지 않습니다.",
        rescueTip: "큰 조각은 그릇 안에서 가위로 한 번 더 자르세요.",
      },
      {
        order: 3,
        title: "양념 넣기",
        action: "간장 1큰술, 참기름 1작은술, 참깨가 있으면 1작은술을 넣습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "그릇 바닥에 양념이 조금 남고 배추 표면에 윤기가 돌면 됩니다.",
        commonMistake: "간장을 많이 넣으면 배추에서 물이 나와 금방 짜집니다.",
        rescueTip: "짜면 배추를 한두 장 더 찢어 넣고 다시 섞으세요.",
      },
      {
        order: 4,
        title: "가볍게 무치기",
        action: "손이나 숟가락으로 아래에서 위로 10번 정도만 뒤집어 바로 먹습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "배추 숨이 너무 죽지 않고 아삭한 모양이 남으면 완성입니다.",
        commonMistake: "세게 오래 주무르면 물이 많이 나옵니다.",
        rescueTip: "물이 많이 나오면 김가루나 참깨를 조금 넣어 고소하게 잡으세요.",
      },
    ];
  }

  if (title === "팽이버섯전") {
    return [
      {
        order: 1,
        title: "팽이버섯 찢기",
        action: "팽이버섯은 밑동을 잘라내고 손으로 5~6가닥씩 가볍게 찢습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "한 덩어리로 뭉치지 않고 젓가락으로 집을 수 있으면 됩니다.",
        commonMistake: "밑동을 너무 적게 자르면 질긴 부분이 남습니다.",
        rescueTip: "질긴 밑동이 보이면 팬에 넣기 전 가위로 한 번 더 잘라 주세요.",
      },
      {
        order: 2,
        title: "계란물 만들기",
        action: "그릇에 계란 2개, 소금 한 꼬집, 부침가루 2큰술을 넣고 팽이버섯을 가볍게 섞습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "버섯 표면에 계란물이 얇게 묻고 그릇 바닥에 조금 남으면 됩니다.",
        commonMistake: "세게 섞으면 버섯이 부서지고 물이 나옵니다.",
        rescueTip: "너무 묽으면 부침가루 1큰술을 추가하세요.",
      },
      {
        order: 3,
        title: "작게 부치기",
        action: "팬에 식용유 1큰술을 두르고 중약불에서 한 숟가락씩 올려 2분 부칩니다.",
        heat: "중약불",
        minutes: 2,
        visualCue: "가장자리가 노릇하고 윗면 계란물이 반쯤 굳으면 뒤집을 수 있습니다.",
        commonMistake: "크게 한 장으로 부치면 초보자는 뒤집기 어렵습니다.",
        rescueTip: "찢어지면 그대로 작은 조각전처럼 더 익히면 됩니다.",
      },
      {
        order: 4,
        title: "뒤집어 마무리",
        action: "뒤집개로 조심히 뒤집고 1~2분 더 익혀 접시에 옮깁니다.",
        heat: "약불",
        minutes: 2,
        visualCue: "양면이 연한 갈색이고 버섯에서 물이 많이 나오지 않으면 완성입니다.",
        commonMistake: "센 불에서 오래 두면 겉만 타고 속은 축축합니다.",
        rescueTip: "축축하면 약불에서 1분 더 두어 수분을 날리세요.",
      },
    ];
  }

  if (title === "계란토스트") {
    return [
      {
        order: 1,
        title: "계란 풀기",
        action: "그릇에 계란 1개와 소금 한 꼬집을 넣고 흰자 덩어리가 보이지 않을 때까지 풉니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "노른자와 흰자가 한 가지 노란색으로 섞이면 됩니다.",
        commonMistake: "덜 풀면 팬에서 흰자만 따로 익습니다.",
        rescueTip: "젓가락으로 20번 정도만 더 저으면 충분합니다.",
      },
      {
        order: 2,
        title: "팬에 계란 펼치기",
        action: "약불 팬에 버터를 녹이고 계란물을 얇게 부은 뒤 식빵 2장을 바로 올립니다.",
        heat: "약불",
        minutes: 2,
        visualCue: "계란 가장자리가 굳고 빵이 계란에 붙으면 뒤집을 준비가 된 상태입니다.",
        commonMistake: "불이 세면 계란이 먼저 타고 빵은 차갑습니다.",
        rescueTip: "갈색이 빨리 나면 불을 끄고 잔열로 30초 기다리세요.",
      },
      {
        order: 3,
        title: "뒤집고 접기",
        action: "계란이 붙은 식빵을 통째로 뒤집고 치즈를 올린 뒤 반으로 접습니다.",
        heat: "약불",
        minutes: 2,
        visualCue: "빵 겉면이 연한 갈색이고 치즈 가장자리가 녹기 시작하면 됩니다.",
        commonMistake: "빵을 빨리 움직이면 계란이 찢어집니다.",
        rescueTip: "찢어져도 치즈를 가운데 넣고 접으면 모양이 잡힙니다.",
      },
      {
        order: 4,
        title: "겉면 굽기",
        action: "양쪽을 30초씩 더 구워 겉은 바삭하고 속은 따뜻하게 마무리합니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "손으로 눌렀을 때 겉은 살짝 단단하고 속은 부드러우면 완성입니다.",
        commonMistake: "오래 누르면 속이 납작하고 퍽퍽해집니다.",
        rescueTip: "식었다면 전자레인지보다 팬 약불에서 30초 데우는 편이 덜 눅눅합니다.",
      },
    ];
  }

  if (title === "오이냉국") {
    return [
      {
        order: 1,
        title: "오이 얇게 썰기",
        action: "오이 1/2개를 씻어 얇게 채 썰거나 반달 모양으로 썹니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "오이가 두껍지 않아야 국물과 바로 어울립니다.",
        commonMistake: "두껍게 썰면 간이 겉에만 묻고 먹기 불편합니다.",
        rescueTip: "두껍게 썰었다면 소금 한 꼬집을 뿌려 3분 두었다가 국물에 넣으세요.",
      },
      {
        order: 2,
        title: "냉국 국물 만들기",
        action: "그릇에 차가운 물 1.5컵, 식초 2큰술, 설탕 1큰술, 간장 1큰술을 넣고 설탕이 녹을 때까지 섞습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "그릇 바닥에 설탕 알갱이가 보이지 않으면 됩니다.",
        commonMistake: "식초를 먼저 더 넣으면 너무 시어집니다.",
        rescueTip: "시면 물 1/2컵과 설탕 1작은술을 더 넣어 균형을 맞추세요.",
      },
      {
        order: 3,
        title: "오이 넣기",
        action: "썬 오이를 국물에 넣고 숟가락으로 10번 정도만 섞습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "오이가 국물에 잠기고 위에 몇 조각 떠 있으면 충분합니다.",
        commonMistake: "오이를 세게 주무르면 물이 많이 나와 밍밍해집니다.",
        rescueTip: "밍밍하면 간장 1작은술 또는 식초 1작은술만 추가하세요.",
      },
      {
        order: 4,
        title: "차갑게 마무리",
        action: "바로 먹을 때 얼음 4~5개와 참깨를 넣어 마무리합니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "국물이 차갑고 새콤달콤한 맛이 먼저 나면 완성입니다.",
        commonMistake: "얼음을 미리 많이 넣으면 금방 싱거워집니다.",
        rescueTip: "싱거워졌다면 간장과 식초를 1작은술씩 더 넣으세요.",
      },
    ];
  }

  if (title === "계란볶음라면") {
    return [
      {
        order: 1,
        title: "면 덜 익혀 삶기",
        action: "냄비에 물을 끓이고 라면 면을 2분만 삶아 체에 건집니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "면이 풀렸지만 가운데가 살짝 단단하면 볶기 좋은 상태입니다.",
        commonMistake: "면을 다 익히면 볶을 때 퍼집니다.",
        rescueTip: "너무 익었다면 찬물에 5초 헹궈 열을 빼세요.",
      },
      {
        order: 2,
        title: "계란 먼저 익히기",
        action: "팬에 식용유 1큰술을 두르고 계란 1개를 넣어 크게 저으며 반쯤 익힙니다.",
        heat: "중약불",
        minutes: 1,
        visualCue: "계란이 촉촉한 덩어리로 뭉치면 면을 넣을 타이밍입니다.",
        commonMistake: "계란을 완전히 익히면 면과 따로 놉니다.",
        rescueTip: "계란이 너무 익었으면 물 1큰술을 넣고 바로 면을 넣으세요.",
      },
      {
        order: 3,
        title: "면과 스프 볶기",
        action: "삶은 면, 라면스프 1/2봉, 물 2큰술을 넣고 1분 정도 빠르게 볶습니다.",
        heat: "중불",
        minutes: 1,
        visualCue: "면 전체에 양념색이 고르게 묻고 팬 바닥에 물이 거의 없으면 됩니다.",
        commonMistake: "스프를 전부 넣으면 짜고 매울 수 있습니다.",
        rescueTip: "짜면 삶은 면이나 밥을 조금 더 넣어 간을 낮추세요.",
      },
      {
        order: 4,
        title: "대파 넣고 끝내기",
        action: "대파가 있으면 넣고 20초만 더 섞은 뒤 바로 접시에 담습니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "면이 윤기 있고 계란 조각이 골고루 보이면 완성입니다.",
        commonMistake: "마지막에 오래 볶으면 면이 팬에 붙습니다.",
        rescueTip: "붙기 시작하면 불을 끄고 젓가락으로 떼어내세요.",
      },
    ];
  }

  if (title === "애호박전") {
    return [
      {
        order: 1,
        title: "애호박 썰기",
        action: "애호박 1/2개를 0.5cm 두께로 동그랗게 썰고 키친타월로 겉물기를 살짝 닦습니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "두께가 비슷해야 한쪽만 덜 익지 않습니다.",
        commonMistake: "너무 두껍게 썰면 겉은 타고 속은 물컹합니다.",
        rescueTip: "두껍게 썰었다면 약불에서 뚜껑을 덮고 1분 더 익히세요.",
      },
      {
        order: 2,
        title: "가루와 계란 입히기",
        action: "애호박에 부침가루를 얇게 묻히고, 소금 한 꼬집을 푼 계란물에 한 번 담급니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "가루가 두껍게 뭉치지 않고 계란물이 얇게 붙으면 됩니다.",
        commonMistake: "가루를 많이 묻히면 팬에서 가루 맛이 납니다.",
        rescueTip: "가루가 뭉쳤으면 손으로 톡톡 털어내세요.",
      },
      {
        order: 3,
        title: "중약불에 부치기",
        action: "팬에 식용유 1큰술을 두르고 중약불에서 애호박을 올려 2분 부칩니다.",
        heat: "중약불",
        minutes: 2,
        visualCue: "가장자리가 노랗게 굳고 바닥이 연한 갈색이면 뒤집을 수 있습니다.",
        commonMistake: "센 불로 익히면 계란만 빨리 탑니다.",
        rescueTip: "색이 빨리 진해지면 바로 약불로 낮추세요.",
      },
      {
        order: 4,
        title: "뒤집어 마무리",
        action: "뒤집어서 1~2분 더 익히고 접시에 겹치지 않게 담습니다.",
        heat: "약불",
        minutes: 2,
        visualCue: "젓가락으로 눌렀을 때 애호박이 살짝 부드러우면 완성입니다.",
        commonMistake: "접시에 바로 겹쳐 쌓으면 눅눅해집니다.",
        rescueTip: "눅눅하면 팬에 다시 올려 30초씩 앞뒤로 데우세요.",
      },
    ];
  }

  if (title === "무생채") {
    return [
      {
        order: 1,
        title: "무 채썰기",
        action: "무 1/5개를 손가락 길이로 얇게 채 썹니다. 칼이 어렵다면 채칼을 써도 됩니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "두께가 비슷해야 양념이 고르게 배어듭니다.",
        commonMistake: "굵게 썰면 겉만 양념되고 속은 싱겁습니다.",
        rescueTip: "굵게 썰었다면 소금 한 꼬집을 뿌려 5분 두었다가 무치세요.",
      },
      {
        order: 2,
        title: "고춧가루 먼저 묻히기",
        action: "무에 고춧가루 1큰술을 넣고 젓가락으로 먼저 섞어 색을 입힙니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "무 표면이 연한 빨간색으로 고르게 바뀌면 됩니다.",
        commonMistake: "액체 양념을 먼저 넣으면 고춧가루가 뭉칩니다.",
        rescueTip: "뭉친 부분은 손가락이나 젓가락으로 풀어 주세요.",
      },
      {
        order: 3,
        title: "새콤달콤 양념",
        action: "식초 1큰술, 설탕 1큰술, 소금 1/2작은술을 넣고 아래에서 위로 가볍게 섞습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "무에서 물이 조금 나오고 양념이 윤기 있게 묻으면 됩니다.",
        commonMistake: "세게 오래 주무르면 물이 너무 많이 나옵니다.",
        rescueTip: "물이 많으면 무만 건져 접시에 담고 국물은 조금만 끼얹으세요.",
      },
      {
        order: 4,
        title: "간 보고 완성",
        action: "한입 맛보고 싱거우면 소금 한 꼬집, 덜 새콤하면 식초 1작은술만 추가합니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "아삭하고 새콤달콤한 맛이 나면 완성입니다.",
        commonMistake: "처음부터 소금을 많이 넣으면 금방 짜집니다.",
        rescueTip: "짜면 채 썬 무를 조금 더 넣고 다시 섞으세요.",
      },
    ];
  }

  if (title === "고추참치비빔밥") {
    return [
      {
        order: 1,
        title: "밥 데우기",
        action: "밥 1공기를 따뜻하게 데워 그릇에 담습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "밥에서 김이 살짝 올라오면 양념이 잘 섞입니다.",
        commonMistake: "찬밥에 바로 비비면 고추참치 기름이 굳고 뻑뻑합니다.",
        rescueTip: "찬밥이면 물 1큰술을 뿌려 전자레인지에 1분 데우세요.",
      },
      {
        order: 2,
        title: "고추참치 올리기",
        action: "고추참치캔 1/2캔을 밥 위에 올립니다. 양념 국물도 1큰술 정도 같이 넣습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "밥 가운데에 고추참치가 모여 있으면 비비기 쉽습니다.",
        commonMistake: "한 캔을 다 넣으면 짜거나 매울 수 있습니다.",
        rescueTip: "많이 넣었다면 밥을 반 공기 더 넣으세요.",
      },
      {
        order: 3,
        title: "김과 참기름 넣기",
        action: "김을 잘라 넣고 참기름 1작은술, 참깨가 있으면 1작은술을 넣습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "김이 밥 위에 고르게 흩어져 있으면 됩니다.",
        commonMistake: "참기름을 많이 넣으면 느끼합니다.",
        rescueTip: "느끼하면 김을 더 넣거나 오이, 상추 같은 생채소를 곁들이세요.",
      },
      {
        order: 4,
        title: "비벼서 완성",
        action: "숟가락으로 아래 밥을 위로 올리듯 20번 정도 비벼 한입 맛봅니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "밥알이 붉은 양념색으로 고르게 바뀌면 완성입니다.",
        commonMistake: "한쪽만 비비면 어떤 숟가락은 짜고 어떤 숟가락은 싱겁습니다.",
        rescueTip: "짜면 밥이나 김을 더 넣고, 싱거우면 고추참치 양념만 1작은술 추가하세요.",
      },
    ];
  }

  if (title === "새송이버섯볶음") {
    return [
      {
        order: 1,
        title: "버섯 썰기",
        action: "새송이버섯 2개를 길게 반으로 자른 뒤 0.5cm 두께로 썹니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "너무 두껍지 않아야 팬에서 빨리 익고 쫄깃합니다.",
        commonMistake: "두껍게 썰면 겉은 마르고 속은 덜 익습니다.",
        rescueTip: "두꺼운 조각은 팬에 넣기 전 한 번 더 잘라 주세요.",
      },
      {
        order: 2,
        title: "버섯 먼저 볶기",
        action: "팬에 식용유 1큰술을 두르고 중불에서 버섯을 2분 볶습니다.",
        heat: "중불",
        minutes: 2,
        visualCue: "버섯 표면이 윤기 나고 가장자리가 살짝 말리면 됩니다.",
        commonMistake: "처음부터 간장을 넣으면 버섯에서 물이 많이 나옵니다.",
        rescueTip: "물이 많으면 불을 중불로 유지하고 1분 더 볶아 날리세요.",
      },
      {
        order: 3,
        title: "간장 넣기",
        action: "팬 가장자리에 간장 1큰술을 넣고 버섯과 빠르게 섞습니다.",
        heat: "중약불",
        minutes: 1,
        visualCue: "버섯에 연한 갈색이 고르게 묻으면 간이 배고 있습니다.",
        commonMistake: "간장을 가운데에 붓고 오래 두면 한쪽만 짭니다.",
        rescueTip: "짠 조각이 있으면 양파나 버섯을 조금 더 넣어 같이 볶으세요.",
      },
      {
        order: 4,
        title: "불 끄고 향 내기",
        action: "불을 끄고 참기름 1작은술을 넣어 섞은 뒤 바로 접시에 담습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "버섯이 쫄깃하고 팬 바닥에 양념이 거의 남지 않으면 완성입니다.",
        commonMistake: "참기름을 넣고 계속 볶으면 향이 날아갑니다.",
        rescueTip: "싱거우면 접시에 담은 뒤 간장 몇 방울만 더하세요.",
      },
    ];
  }

  if (title === "김치참치볶음밥") {
    return [
      {
        order: 1,
        title: "재료 작게 준비",
        action: "김치 1/2컵은 가위로 잘게 자르고 참치캔 1/2캔은 기름을 절반만 빼 둡니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "김치가 숟가락에 올라갈 크기면 밥과 잘 섞입니다.",
        commonMistake: "김치가 크면 볶을 때 밥과 따로 놉니다.",
        rescueTip: "팬에 올린 뒤에도 가위로 몇 번 더 잘라 줄 수 있습니다.",
      },
      {
        order: 2,
        title: "김치 먼저 볶기",
        action: "팬에 식용유 1큰술을 두르고 중불에서 김치를 2분 볶습니다.",
        heat: "중불",
        minutes: 2,
        visualCue: "김치 색이 조금 진해지고 물기가 줄면 밥을 넣을 준비입니다.",
        commonMistake: "김치국물을 많이 넣으면 볶음밥이 질어집니다.",
        rescueTip: "물이 많으면 밥 넣기 전에 1분 더 볶아 날리세요.",
      },
      {
        order: 3,
        title: "밥과 참치 넣기",
        action: "밥 1공기와 참치를 넣고 주걱으로 밥알을 누르지 말고 펼치듯 섞습니다.",
        heat: "중약불",
        minutes: 3,
        visualCue: "밥알 전체가 옅은 붉은색이 되면 거의 완성입니다.",
        commonMistake: "밥을 세게 누르면 떡처럼 뭉칩니다.",
        rescueTip: "뭉치면 불을 약하게 낮추고 주걱 두 개로 벌리듯 풀어 주세요.",
      },
      {
        order: 4,
        title: "간장 향 내기",
        action: "팬 가장자리에 간장 1작은술을 넣고 20초만 더 섞은 뒤 접시에 담습니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "팬 바닥에 물기가 거의 없고 고소한 향이 나면 완성입니다.",
        commonMistake: "간장을 많이 넣으면 김치와 참치 때문에 금방 짜집니다.",
        rescueTip: "짜면 밥을 반 공기 더 넣고 다시 섞으세요.",
      },
    ];
  }

  if (title === "가지무침") {
    return [
      {
        order: 1,
        title: "가지 자르기",
        action: "가지 1개를 길게 반으로 가른 뒤 5cm 길이로 자릅니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "크기가 비슷해야 전자레인지에서 고르게 익습니다.",
        commonMistake: "너무 두껍게 자르면 속이 덜 익습니다.",
        rescueTip: "두꺼운 조각은 한 번 더 길게 갈라 주세요.",
      },
      {
        order: 2,
        title: "전자레인지로 익히기",
        action: "전자레인지용 그릇에 가지를 담고 랩을 살짝 덮어 3분 돌립니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "가지가 살짝 숨이 죽고 젓가락이 쉽게 들어가면 됩니다.",
        commonMistake: "완전히 밀폐하면 뜨거운 김이 빠지지 않습니다.",
        rescueTip: "덜 익었으면 30초씩 추가로 돌리세요.",
      },
      {
        order: 3,
        title: "물기 빼기",
        action: "뜨거운 김을 1분 식힌 뒤 나온 물은 따라 버립니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "그릇 바닥에 물이 조금 남아 있을 수 있습니다.",
        commonMistake: "물기를 그대로 두면 양념이 싱거워집니다.",
        rescueTip: "이미 무쳤는데 물이 많으면 국물만 조금 따라내세요.",
      },
      {
        order: 4,
        title: "양념해 무치기",
        action: "간장 1큰술, 참기름 1작은술, 고춧가루와 참깨를 넣고 젓가락으로 가볍게 섞습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "가지 표면에 양념이 얇게 묻고 부드러우면 완성입니다.",
        commonMistake: "세게 주무르면 가지가 으깨집니다.",
        rescueTip: "으깨졌다면 밥 위에 올려 가지덮밥처럼 먹어도 됩니다.",
      },
    ];
  }

  if (title === "진미채무침") {
    return [
      {
        order: 1,
        title: "진미채 부드럽게 하기",
        action: "진미채 1줌이 딱딱하면 물에 30초만 헹군 뒤 손으로 꼭 짭니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "손으로 구부렸을 때 부러지지 않고 휘면 됩니다.",
        commonMistake: "물에 오래 담그면 맛이 빠지고 질척합니다.",
        rescueTip: "너무 젖었으면 키친타월로 눌러 물기를 빼세요.",
      },
      {
        order: 2,
        title: "마요네즈 먼저",
        action: "진미채에 마요네즈 1큰술을 넣고 먼저 가볍게 버무립니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "진미채 표면이 살짝 윤기 나면 양념이 잘 붙습니다.",
        commonMistake: "양념부터 넣으면 뻑뻑하게 뭉칩니다.",
        rescueTip: "이미 뭉쳤다면 마요네즈 1작은술을 더 넣고 풀어 주세요.",
      },
      {
        order: 3,
        title: "고추장 양념 넣기",
        action: "고추장 1큰술, 올리고당 1큰술을 넣고 젓가락으로 골고루 섞습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "빨간 양념이 진미채 전체에 얇게 묻으면 됩니다.",
        commonMistake: "고추장을 많이 넣으면 짜고 매워집니다.",
        rescueTip: "짜거나 매우면 진미채를 조금 더 넣고 다시 섞으세요.",
      },
      {
        order: 4,
        title: "참기름으로 마무리",
        action: "참기름 1작은술과 참깨를 넣고 한 번 더 섞어 접시에 담습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "윤기가 돌고 양념이 바닥에 많이 남지 않으면 완성입니다.",
        commonMistake: "오래 비비면 진미채가 뭉쳐 한 덩어리가 됩니다.",
        rescueTip: "뭉친 부분은 젓가락 두 개로 벌리듯 풀어 주세요.",
      },
    ];
  }

  if (title === "팽이버섯덮밥") {
    return [
      {
        order: 1,
        title: "밥과 버섯 준비",
        action: "밥 1공기는 따뜻하게 데우고 팽이버섯 1봉은 밑동을 자른 뒤 손으로 찢습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "팽이버섯이 한입 크기로 풀어져 있으면 볶기 쉽습니다.",
        commonMistake: "밑동을 덜 자르면 버섯이 뭉쳐서 익습니다.",
        rescueTip: "뭉친 부분은 손으로 한 번 더 찢어 주세요.",
      },
      {
        order: 2,
        title: "팽이버섯 볶기",
        action: "팬에 식용유 1큰술을 두르고 중불에서 팽이버섯을 2분 볶습니다.",
        heat: "중불",
        minutes: 2,
        visualCue: "버섯 숨이 죽고 양이 절반 정도로 줄면 양념할 준비입니다.",
        commonMistake: "처음부터 물을 넣으면 버섯이 질척합니다.",
        rescueTip: "물이 많으면 중불에서 1분 더 볶아 날리세요.",
      },
      {
        order: 3,
        title: "간장 양념",
        action: "간장 1큰술, 설탕 1/2작은술, 물 3큰술을 넣고 1분만 끓입니다.",
        heat: "중약불",
        minutes: 1,
        visualCue: "버섯 사이에 간장 국물이 촉촉하게 남아 있으면 됩니다.",
        commonMistake: "물을 많이 넣으면 덮밥이 국밥처럼 됩니다.",
        rescueTip: "국물이 많으면 불을 조금 올려 30초 더 졸이세요.",
      },
      {
        order: 4,
        title: "계란 넣고 밥에 올리기",
        action: "계란 1개를 풀어 둘러 넣고 30초만 익힌 뒤 밥 위에 올립니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "계란이 완전히 딱딱해지기 전 부드럽게 굳으면 완성입니다.",
        commonMistake: "계란을 오래 익히면 덮밥이 퍽퍽합니다.",
        rescueTip: "퍽퍽하면 물 1큰술을 넣고 20초만 더 데워 밥에 올리세요.",
      },
    ];
  }

  if (title === "김치비빔국수") {
    return [
      {
        order: 1,
        title: "양념 먼저 섞기",
        action: "그릇에 고추장 1큰술, 식초 1큰술, 설탕 1큰술, 참기름 1작은술을 넣고 먼저 섞습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "고추장 덩어리가 풀려 숟가락으로 떠질 정도면 됩니다.",
        commonMistake: "면을 삶은 뒤 양념을 만들면 면이 불기 쉽습니다.",
        rescueTip: "양념이 너무 되직하면 물 1큰술만 넣어 풀어 주세요.",
      },
      {
        order: 2,
        title: "소면 삶기",
        action: "끓는 물에 소면 1인분을 넣고 3분 정도 삶은 뒤 찬물에 헹굽니다.",
        heat: "중불",
        minutes: 4,
        visualCue: "면을 한 가닥 먹어 봤을 때 딱딱한 심이 없으면 됩니다.",
        commonMistake: "삶은 면을 찬물에 헹구지 않으면 금방 불고 끈적합니다.",
        rescueTip: "면이 붙었으면 찬물에 다시 풀어 헹군 뒤 물기를 빼세요.",
      },
      {
        order: 3,
        title: "김치 작게 자르기",
        action: "김치 1/2컵은 가위로 잘게 자르고 양념 그릇에 넣습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "김치가 국수와 비슷한 길이로 잘리면 비비기 쉽습니다.",
        commonMistake: "김치국물을 많이 넣으면 양념이 묽어집니다.",
        rescueTip: "묽어졌다면 고추장 1작은술을 더 넣어 농도를 맞추세요.",
      },
      {
        order: 4,
        title: "비벼서 완성",
        action: "물기 뺀 소면을 넣고 젓가락으로 아래에서 위로 들어 올리듯 비빕니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "면 전체가 붉은 양념색으로 고르게 바뀌면 완성입니다.",
        commonMistake: "세게 누르며 비비면 면이 끊어지고 떡집니다.",
        rescueTip: "뻑뻑하면 김치국물이나 물을 1작은술씩만 추가하세요.",
      },
    ];
  }

  if (title === "두부김치") {
    return [
      {
        order: 1,
        title: "두부 데우기",
        action: "두부 1/2모를 먹기 좋게 썰어 전자레인지에 1분 데우거나 뜨거운 물에 살짝 데웁니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "두부가 따뜻하고 가장자리가 부드러우면 됩니다.",
        commonMistake: "차가운 두부를 쓰면 김치볶음과 온도가 안 맞습니다.",
        rescueTip: "차갑게 식었으면 먹기 직전 30초만 더 데우세요.",
      },
      {
        order: 2,
        title: "김치 작게 자르기",
        action: "김치 1컵은 가위로 2~3번 잘라 한입 크기로 만듭니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "젓가락으로 집었을 때 길게 늘어지지 않으면 좋습니다.",
        commonMistake: "김치가 길면 두부 위에 올려 먹기 불편합니다.",
        rescueTip: "팬에 넣은 뒤에도 가위로 한 번 더 잘라 주세요.",
      },
      {
        order: 3,
        title: "김치 볶기",
        action: "팬에 식용유 1큰술을 두르고 중불에서 김치를 3분 볶습니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "김치 색이 진해지고 신 냄새가 부드러워지면 됩니다.",
        commonMistake: "센 불에서 볶으면 김치 끝만 탑니다.",
        rescueTip: "타는 냄새가 나면 물 1큰술을 넣고 불을 낮추세요.",
      },
      {
        order: 4,
        title: "간 맞춰 담기",
        action: "김치가 많이 시면 설탕 1/2작은술을 넣고, 불을 끈 뒤 참기름 1작은술을 섞어 두부 옆에 담습니다.",
        heat: "약불",
        minutes: 2,
        visualCue: "김치가 윤기 있고 팬 바닥에 물기가 거의 없으면 완성입니다.",
        commonMistake: "참기름을 넣고 오래 볶으면 향이 날아갑니다.",
        rescueTip: "짜면 두부 양을 늘려 같이 먹으면 간이 맞습니다.",
      },
    ];
  }

  if (title === "오이크래미무침") {
    return [
      {
        order: 1,
        title: "오이 썰기",
        action: "오이 1/2개를 얇게 어슷썰고 물기가 많으면 키친타월로 살짝 닦습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "오이가 얇을수록 양념이 빨리 묻습니다.",
        commonMistake: "두껍게 썰면 오이 맛만 강하고 양념이 겉돕니다.",
        rescueTip: "두껍게 썰었다면 소금 한 꼬집을 뿌려 3분 두었다가 물기를 빼세요.",
      },
      {
        order: 2,
        title: "크래미 찢기",
        action: "크래미 2개는 손으로 길게 찢어 오이와 같은 그릇에 넣습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "오이와 비슷한 굵기로 찢으면 한입에 같이 집힙니다.",
        commonMistake: "크게 넣으면 양념이 사이사이에 묻지 않습니다.",
        rescueTip: "큰 조각은 손으로 한 번 더 찢어 주세요.",
      },
      {
        order: 3,
        title: "새콤 양념",
        action: "식초 1큰술, 설탕 1큰술, 연겨자 1/2작은술을 섞어 넣습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "설탕이 보이지 않게 녹으면 무칠 준비가 된 상태입니다.",
        commonMistake: "겨자를 많이 넣으면 코끝이 강하게 맵습니다.",
        rescueTip: "맵게 느껴지면 오이나 크래미를 조금 더 넣어 희석하세요.",
      },
      {
        order: 4,
        title: "가볍게 무치기",
        action: "젓가락으로 아래에서 위로 10번 정도만 섞고 참깨를 뿌립니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "오이와 크래미 표면에 양념이 얇게 묻으면 완성입니다.",
        commonMistake: "오래 세게 무치면 오이에서 물이 많이 나옵니다.",
        rescueTip: "물이 생기면 건더기만 접시에 담고 국물은 조금만 끼얹으세요.",
      },
    ];
  }

  if (title === "참치쌈장") {
    return [
      {
        order: 1,
        title: "참치 기름 빼기",
        action: "참치캔 1/2캔은 뚜껑으로 눌러 기름을 거의 빼고 그릇에 담습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "그릇 바닥에 기름이 고이지 않으면 됩니다.",
        commonMistake: "기름을 그대로 넣으면 쌈장이 묽고 느끼합니다.",
        rescueTip: "묽으면 된장 1/2작은술을 더 넣어 농도를 맞추세요.",
      },
      {
        order: 2,
        title: "된장과 고추장 넣기",
        action: "된장 1큰술, 고추장 1작은술을 넣고 참치와 으깨듯 섞습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "참치 큰 덩어리가 풀리고 된장이 고르게 섞이면 됩니다.",
        commonMistake: "된장을 많이 넣으면 짜서 쌈채소가 있어도 부담스럽습니다.",
        rescueTip: "짜면 참치나 다진 오이를 조금 더 넣어 희석하세요.",
      },
      {
        order: 3,
        title: "향 더하기",
        action: "다진마늘 1/2작은술과 참기름 1작은술을 넣고 한 번 더 섞습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "쌈장이 뻑뻑하지만 숟가락으로 떠지는 정도면 좋습니다.",
        commonMistake: "마늘을 많이 넣으면 매운 생마늘 맛이 강합니다.",
        rescueTip: "마늘맛이 강하면 참기름 1/2작은술을 더 넣거나 밥과 같이 먹으세요.",
      },
      {
        order: 4,
        title: "쌈에 올리기",
        action: "상추나 양배추쌈, 밥 위에 참치쌈장을 작은 숟가락으로 올려 먹습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "쌈장만 먹었을 때 짭짤하고 밥과 먹으면 간이 맞으면 완성입니다.",
        commonMistake: "한 숟가락 크게 올리면 한입이 너무 짭니다.",
        rescueTip: "처음에는 반 숟가락만 올리고 부족하면 더하세요.",
      },
    ];
  }

  if (title === "감자옥수수샐러드") {
    return [
      {
        order: 1,
        title: "감자 작게 자르기",
        action: "감자 1개는 껍질을 벗기고 2cm 정도로 작게 잘라 전자레인지용 그릇에 담습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "조각 크기가 비슷해야 익는 시간이 맞습니다.",
        commonMistake: "크게 자르면 겉은 익고 속은 딱딱합니다.",
        rescueTip: "큰 조각이 보이면 한 번 더 잘라 주세요.",
      },
      {
        order: 2,
        title: "전자레인지로 익히기",
        action: "물 1큰술을 넣고 랩을 살짝 덮어 전자레인지에 4분 돌립니다.",
        heat: "불 없음",
        minutes: 4,
        visualCue: "젓가락이 감자에 쉽게 들어가면 익은 상태입니다.",
        commonMistake: "랩을 완전히 밀폐하면 김이 빠지지 않아 위험합니다.",
        rescueTip: "덜 익었으면 30초씩 추가로 돌리세요.",
      },
      {
        order: 3,
        title: "감자 으깨기",
        action: "뜨거운 김을 1분 뺀 뒤 숟가락으로 감자를 대충 으깹니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "작은 덩어리가 조금 남아도 먹기 좋습니다.",
        commonMistake: "완전히 곱게 으깨려다 질척해질 수 있습니다.",
        rescueTip: "질척하면 옥수수나 식빵 조각을 조금 넣어 농도를 맞추세요.",
      },
      {
        order: 4,
        title: "옥수수와 마요 섞기",
        action: "물기 뺀 옥수수 3큰술, 마요네즈 1큰술, 소금 한 꼬집을 넣고 섞습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "감자가 한 덩어리로 부드럽게 뭉치면 완성입니다.",
        commonMistake: "마요네즈를 많이 넣으면 느끼하고 묽어집니다.",
        rescueTip: "묽으면 감자를 조금 더 으깨 넣거나 냉장고에 10분 두세요.",
      },
    ];
  }

  if (title === "가지덮밥") {
    return [
      {
        order: 1,
        title: "밥과 가지 준비",
        action: "밥 1공기를 따뜻하게 데우고 가지 1개는 얇은 반달 모양으로 썹니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "가지가 얇아야 팬에서 빨리 숨이 죽습니다.",
        commonMistake: "두껍게 썰면 겉만 익고 속이 질깁니다.",
        rescueTip: "두꺼운 조각은 팬에 넣기 전 한 번 더 잘라 주세요.",
      },
      {
        order: 2,
        title: "가지 먼저 볶기",
        action: "팬에 식용유 1큰술을 두르고 중불에서 가지를 3분 볶습니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "가지가 반투명해지고 부드럽게 휘면 양념할 준비입니다.",
        commonMistake: "처음부터 양념을 넣으면 가지에서 물이 많이 나옵니다.",
        rescueTip: "물이 많으면 불을 중불로 유지하고 1분 더 볶으세요.",
      },
      {
        order: 3,
        title: "간장 양념 넣기",
        action: "간장 1큰술, 설탕 1/2작은술, 물 2큰술을 넣고 1분만 섞어 볶습니다.",
        heat: "중약불",
        minutes: 2,
        visualCue: "가지에 갈색 양념이 고르게 묻으면 됩니다.",
        commonMistake: "간장을 많이 넣으면 밥에 올렸을 때 짭니다.",
        rescueTip: "짜면 물 1큰술과 가지를 조금 더 넣어 희석하세요.",
      },
      {
        order: 4,
        title: "밥 위에 올리기",
        action: "불을 끄고 참기름 1작은술을 섞은 뒤 밥 위에 가지를 올립니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "밥 위에 촉촉한 양념이 조금 내려가면 덮밥처럼 먹기 좋습니다.",
        commonMistake: "국물을 완전히 졸이면 밥과 비비기 뻑뻑합니다.",
        rescueTip: "뻑뻑하면 따뜻한 물 1큰술을 팬에 넣어 양념을 긁어 밥에 올리세요.",
      },
    ];
  }

  if (title === "두부샐러드") {
    return [
      {
        order: 1,
        title: "두부 물기 빼기",
        action: "두부 1/2모는 키친타월로 눌러 물기를 빼고 한입 크기로 자릅니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "접시에 물이 흥건하지 않으면 됩니다.",
        commonMistake: "물기를 그대로 두면 드레싱이 싱거워집니다.",
        rescueTip: "이미 물이 생겼다면 접시를 살짝 기울여 물만 따라내세요.",
      },
      {
        order: 2,
        title: "채소와 계란 준비",
        action: "상추는 손으로 찢고 삶은계란 1개는 먹기 좋게 자릅니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "상추, 두부, 계란이 한입 크기면 먹기 편합니다.",
        commonMistake: "채소가 너무 크면 두부와 같이 집기 어렵습니다.",
        rescueTip: "큰 잎은 손으로 한 번 더 찢으세요.",
      },
      {
        order: 3,
        title: "간장 드레싱",
        action: "간장 1큰술, 참기름 1작은술, 참깨 1작은술을 섞어 드레싱을 만듭니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "참기름이 간장 위에 살짝 떠 있어도 괜찮습니다.",
        commonMistake: "간장을 많이 넣으면 두부가 짜집니다.",
        rescueTip: "짜면 두부나 상추를 더 넣어 같이 먹으세요.",
      },
      {
        order: 4,
        title: "가볍게 올려 완성",
        action: "그릇에 상추, 두부, 계란을 담고 드레싱을 먹기 직전에 끼얹습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "두부가 으깨지지 않고 드레싱이 표면에 묻으면 완성입니다.",
        commonMistake: "처음부터 세게 비비면 두부가 부서집니다.",
        rescueTip: "부서졌다면 숟가락으로 떠먹는 샐러드처럼 먹으면 됩니다.",
      },
    ];
  }

  if (title === "간장계란장") {
    return [
      {
        order: 1,
        title: "계란 삶기",
        action: "냄비에 계란 4개와 잠길 만큼 물을 넣고 끓기 시작하면 8~9분 삶습니다.",
        heat: "중불",
        minutes: 10,
        visualCue: "흰자가 완전히 굳고 노른자는 살짝 촉촉한 정도가 먹기 좋습니다.",
        commonMistake: "냉장고에서 꺼낸 계란을 바로 센 불에 넣으면 깨질 수 있습니다.",
        rescueTip: "금이 갔다면 식초 1작은술을 물에 넣고 계속 삶으세요.",
      },
      {
        order: 2,
        title: "찬물에 식혀 까기",
        action: "삶은 계란을 찬물에 3분 담갔다가 껍질을 깝니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "계란이 손으로 잡을 수 있을 정도로 식으면 까기 쉽습니다.",
        commonMistake: "뜨거울 때 바로 까면 흰자가 찢어집니다.",
        rescueTip: "껍질이 붙으면 물속에서 살살 까 보세요.",
      },
      {
        order: 3,
        title: "간장물 만들기",
        action: "그릇에 간장 4큰술, 물 4큰술, 설탕 1큰술을 넣고 설탕이 녹을 때까지 섞습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "숟가락 바닥에 설탕 알갱이가 보이지 않으면 됩니다.",
        commonMistake: "간장을 물 없이 넣으면 계란 겉만 너무 짭니다.",
        rescueTip: "이미 짜게 만들었다면 물 2큰술을 더 넣어 희석하세요.",
      },
      {
        order: 4,
        title: "계란 담가두기",
        action: "껍질 깐 계란을 간장물에 넣고 30분 이상 두었다가 밥에 올려 먹습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "계란 겉이 연한 갈색으로 물들면 먹을 수 있습니다.",
        commonMistake: "바로 먹으면 속까지 간이 들지 않습니다.",
        rescueTip: "급하면 계란을 반으로 잘라 간장물을 끼얹어 먹으세요.",
      },
    ];
  }

  if (title === "양배추라페") {
    return [
      {
        order: 1,
        title: "양배추 얇게 썰기",
        action: "양배추 2줌은 최대한 얇게 채 썰고 물기가 있으면 키친타월로 살짝 누릅니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "젓가락으로 집었을 때 길게 흩어지고 물방울이 많이 떨어지지 않으면 됩니다.",
        commonMistake: "두껍게 썰면 소스가 겉에만 묻고 딱딱하게 느껴집니다.",
        rescueTip: "두껍게 썰렸다면 손으로 10번 정도 가볍게 주물러 숨을 조금 죽이세요.",
      },
      {
        order: 2,
        title: "당근 더하기",
        action: "당근이 있으면 1/4개를 얇게 채 썰어 양배추와 섞습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "양배추 사이에 주황색 당근이 조금씩 보이면 충분합니다.",
        commonMistake: "당근을 많이 넣으면 단단한 식감이 강해집니다.",
        rescueTip: "당근이 두껍다면 가위로 짧게 잘라 먹기 쉽게 만드세요.",
      },
      {
        order: 3,
        title: "새콤달콤 소스",
        action: "식초 1큰술, 설탕 1큰술, 소금 한 꼬집, 올리브유 1큰술을 그릇에서 섞습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "설탕 알갱이가 거의 보이지 않고 소스가 반짝이면 됩니다.",
        commonMistake: "식초를 먼저 더 넣으면 너무 시어집니다.",
        rescueTip: "시다면 설탕 1작은술, 짜다면 양배추 한 줌을 더 넣으세요.",
      },
      {
        order: 4,
        title: "가볍게 버무리기",
        action: "채소에 소스를 붓고 아래에서 위로 15번 정도만 뒤집어 바로 먹습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "채소 표면에 윤기가 돌고 그릇 바닥에 소스가 조금 남으면 완성입니다.",
        commonMistake: "오래 주무르면 물이 많이 나와 싱거워집니다.",
        rescueTip: "물이 많이 생기면 참깨나 김가루를 조금 넣어 고소하게 잡으세요.",
      },
    ];
  }

  if (title === "토마토마리네이드") {
    return [
      {
        order: 1,
        title: "토마토 자르기",
        action: "방울토마토 10개는 씻어 꼭지를 떼고 반으로 자릅니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "토마토 단면이 보이면 소스가 빨리 배어듭니다.",
        commonMistake: "통째로 넣으면 겉만 양념되고 맛이 늦게 듭니다.",
        rescueTip: "칼이 무섭다면 큰 토마토 1개를 숟가락 크기로만 잘라도 됩니다.",
      },
      {
        order: 2,
        title: "양파 조금 준비",
        action: "양파가 있으면 2큰술만 아주 얇게 썰어 찬물에 1분 담갔다가 건집니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "양파 매운 냄새가 줄고 투명해 보이면 됩니다.",
        commonMistake: "양파를 많이 넣으면 토마토보다 양파 맛이 강해집니다.",
        rescueTip: "맵다면 물에 2분 더 담가 두세요.",
      },
      {
        order: 3,
        title: "마리네이드 섞기",
        action: "올리브유 1큰술, 식초 1큰술, 설탕 1작은술, 소금 한 꼬집을 섞습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "소스가 살짝 뿌옇게 섞이고 설탕이 녹으면 됩니다.",
        commonMistake: "소금을 많이 넣으면 토마토에서 물이 빨리 나옵니다.",
        rescueTip: "짜면 토마토를 2~3개 더 넣어 희석하세요.",
      },
      {
        order: 4,
        title: "버무려 식히기",
        action: "토마토와 소스를 가볍게 섞고 가능하면 냉장고에 10분 두었다가 먹습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "토마토 표면이 반짝이고 그릇 바닥에 소스가 조금 고이면 완성입니다.",
        commonMistake: "세게 섞으면 토마토가 뭉개집니다.",
        rescueTip: "뭉개졌다면 빵이나 밥 위에 올려 소스처럼 먹어도 됩니다.",
      },
    ];
  }

  if (title === "상추겉절이") {
    return [
      {
        order: 1,
        title: "상추 씻고 찢기",
        action: "상추 8장은 한 장씩 씻어 물기를 털고 손으로 한입 크기로 찢습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "잎 사이 흙이 없고 그릇에 물이 고이지 않으면 됩니다.",
        commonMistake: "물기가 많으면 양념이 묽어지고 상추가 빨리 숨이 죽습니다.",
        rescueTip: "물기가 많으면 키친타월로 잎 끝만 가볍게 눌러 주세요.",
      },
      {
        order: 2,
        title: "겉절이 양념",
        action: "간장 1큰술, 식초 1큰술, 설탕 1작은술, 고춧가루 1작은술을 먼저 섞습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "설탕 알갱이가 줄고 붉은 양념이 한 가지 색이면 됩니다.",
        commonMistake: "고춧가루를 많이 넣으면 텁텁하고 맵습니다.",
        rescueTip: "맵다면 식초와 설탕을 1작은술씩 더 넣어 둥글게 만드세요.",
      },
      {
        order: 3,
        title: "상추에 살살 묻히기",
        action: "상추에 양념을 붓고 숟가락 2개로 아래에서 위로 10번만 뒤집습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "상추 가장자리에 붉은 양념이 얇게 묻으면 충분합니다.",
        commonMistake: "손으로 세게 주무르면 금방 물러집니다.",
        rescueTip: "숨이 죽었다면 김가루를 조금 올려 비빔반찬처럼 먹으세요.",
      },
      {
        order: 4,
        title: "참기름으로 마무리",
        action: "먹기 직전에 참기름 1작은술과 참깨를 넣고 한 번만 더 섞습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "상추가 아직 초록색으로 살아 있고 고소한 향이 나면 완성입니다.",
        commonMistake: "미리 만들어 오래 두면 물이 많이 생깁니다.",
        rescueTip: "물이 생기면 밥 위에 올려 상추비빔밥처럼 먹으면 됩니다.",
      },
    ];
  }

  if (title === "김치말이국수") {
    return [
      {
        order: 1,
        title: "소면 삶기",
        action: "끓는 물에 소면 1인분을 넣고 3분 삶은 뒤 찬물에 20초 헹굽니다.",
        heat: "중불",
        minutes: 4,
        visualCue: "면 한 가닥을 먹어 봤을 때 딱딱한 심이 없으면 됩니다.",
        commonMistake: "면을 오래 삶으면 차갑게 헹군 뒤에도 금방 붑니다.",
        rescueTip: "너무 익었다면 찬물에 충분히 헹궈 전분을 빼고 바로 먹으세요.",
      },
      {
        order: 2,
        title: "김치 작게 자르기",
        action: "김치 1/2컵은 가위로 잘게 자르고, 오이가 있으면 얇게 채 썹니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "김치가 숟가락에 올라가는 크기면 면과 같이 먹기 좋습니다.",
        commonMistake: "김치가 크면 면과 따로 놀고 국물이 튑니다.",
        rescueTip: "큰 조각은 그릇 안에서 가위로 한 번 더 잘라 주세요.",
      },
      {
        order: 3,
        title: "찬 육수 맞추기",
        action: "그릇에 시판 냉면육수 1봉을 붓고 김치, 식초 1작은술, 설탕 1작은술을 넣습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "국물이 연한 붉은색이고 김치가 고르게 떠 있으면 됩니다.",
        commonMistake: "김치국물을 많이 넣으면 짜고 시어질 수 있습니다.",
        rescueTip: "짜면 찬물 1/4컵을 넣고, 싱거우면 김치국물 1큰술만 추가하세요.",
      },
      {
        order: 4,
        title: "면 말아 완성",
        action: "물기 뺀 소면을 그릇에 담고 찬 육수와 김치를 부은 뒤 참깨를 뿌립니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "면이 국물에 잠기고 김치와 오이가 위에 보이면 완성입니다.",
        commonMistake: "면 물기를 안 빼면 국물이 금방 밍밍해집니다.",
        rescueTip: "밍밍하면 식초와 김치국물을 1작은술씩만 더 넣으세요.",
      },
    ];
  }

  if (title === "오이계란샌드위치") {
    return [
      {
        order: 1,
        title: "계란 으깨기",
        action: "삶은계란 2개를 그릇에 넣고 숟가락으로 노른자와 흰자가 작아질 때까지 으깹니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "큰 흰자 조각이 손톱 크기보다 작아지면 빵 사이에 잘 들어갑니다.",
        commonMistake: "너무 대충 으깨면 한쪽은 퍽퍽하고 한쪽은 소스만 많아집니다.",
        rescueTip: "큰 조각이 보이면 숟가락 등으로 10번만 더 눌러 주세요.",
      },
      {
        order: 2,
        title: "소스 섞기",
        action: "마요네즈 1큰술, 소금 한 꼬집, 후추 약간을 넣고 계란과 섞습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "계란이 촉촉하게 뭉치고 그릇 바닥에 소스가 고이지 않으면 됩니다.",
        commonMistake: "마요네즈를 많이 넣으면 빵이 금방 눅눅해집니다.",
        rescueTip: "질척하면 으깬 계란이나 식빵 조각을 조금 더 넣어 잡으세요.",
      },
      {
        order: 3,
        title: "오이 올리기",
        action: "식빵 한 장에 계란소스를 펴고 얇게 썬 오이를 겹치지 않게 올립니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "오이가 한 층으로 깔리면 자를 때 속이 덜 밀립니다.",
        commonMistake: "오이를 두껍게 넣으면 빵이 잘 안 닫힙니다.",
        rescueTip: "오이가 두껍다면 반으로 잘라 빵 밖으로 튀어나오지 않게 하세요.",
      },
      {
        order: 4,
        title: "덮고 자르기",
        action: "남은 식빵으로 덮고 손바닥으로 살짝 눌러 반으로 자릅니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "속이 옆으로 많이 밀리지 않고 단면에 계란과 오이가 보이면 완성입니다.",
        commonMistake: "세게 누르면 속이 밖으로 밀려나옵니다.",
        rescueTip: "속이 나왔다면 숟가락으로 다시 넣고 랩으로 감싸 1분 두세요.",
      },
    ];
  }

  if (title === "양배추참치샐러드") {
    return [
      {
        order: 1,
        title: "양배추 얇게 준비",
        action: "양배추 2줌을 얇게 채 썰고 물기가 있으면 키친타월로 눌러 닦습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "그릇 바닥에 물이 고이지 않아야 드레싱이 묽어지지 않습니다.",
        commonMistake: "물기가 많으면 참치와 섞었을 때 금방 밍밍해집니다.",
        rescueTip: "물이 생기면 양배추를 한 줌 더 넣거나 키친타월로 한 번 눌러 주세요.",
      },
      {
        order: 2,
        title: "참치 기름 빼기",
        action: "참치캔 1/2캔은 뚜껑으로 살짝 눌러 기름을 거의 빼고 양배추 위에 올립니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "참치 주변에 기름이 고이지 않으면 됩니다.",
        commonMistake: "기름을 많이 넣으면 샐러드가 느끼하고 질척합니다.",
        rescueTip: "기름이 많다면 키친타월 끝으로 그릇 가장자리를 닦아 주세요.",
      },
      {
        order: 3,
        title: "가볍게 간하기",
        action: "마요네즈 1큰술, 간장 1작은술, 후추 약간을 넣고 숟가락으로 섞습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "양배추 표면에 소스가 얇게 묻고 참치가 골고루 보이면 됩니다.",
        commonMistake: "마요네즈를 많이 넣으면 반찬보다 소스 맛이 강해집니다.",
        rescueTip: "느끼하면 식초 1작은술이나 양배추 한 줌을 더 넣으세요.",
      },
      {
        order: 4,
        title: "참깨로 마무리",
        action: "먹기 직전에 참깨를 뿌리고 한 번만 더 섞어 바로 먹습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "양배추가 아삭하게 살아 있고 참치가 뭉치지 않으면 완성입니다.",
        commonMistake: "미리 오래 섞어 두면 양배추에서 물이 나옵니다.",
        rescueTip: "물이 생겼다면 밥 위에 올려 샐러드덮밥처럼 먹으면 됩니다.",
      },
    ];
  }

  if (title === "오이김밥") {
    return [
      {
        order: 1,
        title: "밥 양념하기",
        action: "따뜻한 밥 1공기에 참기름 1작은술, 소금 한 꼬집, 참깨를 넣고 섞습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "밥알이 윤기 나고 소금이 한쪽에 뭉치지 않으면 됩니다.",
        commonMistake: "밥이 차가우면 김 위에 펴기 어렵습니다.",
        rescueTip: "찬밥이면 전자레인지에 40초 데운 뒤 다시 섞으세요.",
      },
      {
        order: 2,
        title: "오이 길게 자르기",
        action: "오이 1/2개는 세로로 길게 잘라 씨가 많으면 숟가락으로 살짝 긁어냅니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "오이가 김 길이보다 조금 짧으면 말기 쉽습니다.",
        commonMistake: "오이가 너무 두꺼우면 김밥이 터집니다.",
        rescueTip: "두껍다면 세로로 한 번 더 잘라 얇게 만드세요.",
      },
      {
        order: 3,
        title: "김 위에 펴기",
        action: "김 위에 밥을 얇게 펴고 가운데에 오이를 길게 올립니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "김 끝 2cm 정도는 밥을 비워 두면 붙이기 쉽습니다.",
        commonMistake: "밥을 두껍게 깔면 말 때 속이 밀립니다.",
        rescueTip: "밥이 많으면 조금 덜어내고 손에 물을 묻혀 얇게 펴세요.",
      },
      {
        order: 4,
        title: "말고 자르기",
        action: "김발이나 손으로 단단히 말고 칼에 물을 묻혀 한입 크기로 자릅니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "자른 단면에 오이가 가운데 보이고 김이 벌어지지 않으면 완성입니다.",
        commonMistake: "느슨하게 말면 자를 때 풀립니다.",
        rescueTip: "풀리면 김 끝에 물을 살짝 묻히고 30초 눌러 붙이세요.",
      },
    ];
  }

  if (title === "콩나물비빔라면") {
    return [
      {
        order: 1,
        title: "면과 콩나물 삶기",
        action: "끓는 물에 면과 콩나물 1줌을 넣고 3분 삶습니다.",
        heat: "중불",
        minutes: 4,
        visualCue: "면은 풀리고 콩나물은 숨이 죽었지만 아삭해 보이면 됩니다.",
        commonMistake: "콩나물을 너무 오래 삶으면 질기고 냄새가 납니다.",
        rescueTip: "너무 익었다면 찬물에 빨리 헹궈 열을 빼세요.",
      },
      {
        order: 2,
        title: "찬물에 헹구기",
        action: "면과 콩나물을 체에 건져 찬물에 20초 헹군 뒤 물기를 뺍니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "손으로 만졌을 때 미끈함이 줄고 물이 뚝뚝 떨어지지 않으면 됩니다.",
        commonMistake: "물기를 안 빼면 양념이 묽어집니다.",
        rescueTip: "물이 많으면 체를 10번 흔들어 더 빼 주세요.",
      },
      {
        order: 3,
        title: "비빔양념 만들기",
        action: "라면스프 1/2봉, 식초 1큰술, 설탕 1작은술, 고추장 1작은술을 그릇에서 섞습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "가루가 뭉치지 않고 붉은 양념이 되면 됩니다.",
        commonMistake: "스프를 전부 넣으면 짜고 매울 수 있습니다.",
        rescueTip: "짜면 면이나 콩나물을 더 넣고, 매우면 설탕 1작은술을 추가하세요.",
      },
      {
        order: 4,
        title: "비벼서 완성",
        action: "면과 콩나물을 양념에 넣고 젓가락으로 아래에서 위로 들어 올리며 비빕니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "면 전체가 붉게 코팅되고 콩나물이 골고루 보이면 완성입니다.",
        commonMistake: "한 방향으로 누르듯 섞으면 면이 끊어집니다.",
        rescueTip: "뻑뻑하면 찬물 1큰술이나 참기름 1작은술을 넣어 풀어 주세요.",
      },
    ];
  }

  if (title === "브로콜리버터볶음") {
    return [
      {
        order: 1,
        title: "브로콜리 작게 나누기",
        action: "브로콜리 1컵을 한입 크기로 자르고 흐르는 물에 씻은 뒤 물기를 살짝 뺍니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "큰 송이가 엄지손톱 2개 정도 크기면 팬에서 빨리 익습니다.",
        commonMistake: "너무 큰 송이는 겉만 익고 줄기 쪽이 딱딱합니다.",
        rescueTip: "큰 조각은 팬에 넣기 전 가위로 한 번 더 잘라 주세요.",
      },
      {
        order: 2,
        title: "물로 먼저 익히기",
        action: "프라이팬에 브로콜리와 물 2큰술을 넣고 뚜껑을 덮어 중불에서 2분 익힙니다.",
        heat: "중불",
        minutes: 2,
        visualCue: "브로콜리 색이 진한 초록색으로 바뀌면 익기 시작한 상태입니다.",
        commonMistake: "물 없이 바로 볶으면 겉이 마르고 줄기는 딱딱할 수 있습니다.",
        rescueTip: "팬이 마르면 물 1큰술을 더 넣고 30초만 더 익히세요.",
      },
      {
        order: 3,
        title: "버터 넣기",
        action: "물이 거의 없어지면 식용유 1작은술, 버터 1작은술, 소금 한 꼬집을 넣고 약불에서 1분 섞습니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "버터가 녹아 브로콜리 겉면에 얇게 묻으면 됩니다.",
        commonMistake: "센 불에서 버터를 넣으면 갈색으로 타고 쓴맛이 납니다.",
        rescueTip: "버터가 갈색으로 변하면 불을 끄고 새 버터를 아주 조금만 넣으세요.",
      },
      {
        order: 4,
        title: "맛 보고 완성",
        action: "브로콜리 줄기 한 조각을 먹어보고 딱딱하지 않으면 접시에 옮깁니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "줄기가 부드럽게 씹히고 버터 향이 나면 완성입니다.",
        commonMistake: "오래 볶으면 브로콜리 색이 어두워지고 물러집니다.",
        rescueTip: "싱거우면 소금 한 꼬집만 더 뿌리고, 짜면 밥과 같이 먹으세요.",
      },
    ];
  }

  if (title === "냉두부") {
    return [
      {
        order: 1,
        title: "두부 물기 빼기",
        action: "두부 1/2모를 접시에 올리고 포장 물을 따라낸 뒤 키친타월로 겉물기를 살짝 닦습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "접시 바닥에 물이 흥건하지 않으면 양념을 올릴 준비가 된 상태입니다.",
        commonMistake: "물기를 그대로 두면 간장이 묽어져 싱겁게 느껴집니다.",
        rescueTip: "물이 계속 나오면 접시를 기울여 한 번 더 따라내세요.",
      },
      {
        order: 2,
        title: "두부 자르기",
        action: "숟가락으로 떠먹기 좋게 두부를 4~6조각으로 자르거나 칼집만 넣습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "조각 사이로 간장이 살짝 들어갈 틈이 보이면 됩니다.",
        commonMistake: "너무 작게 자르면 두부가 부서져 물이 많이 나옵니다.",
        rescueTip: "부서졌다면 그대로 밥 위에 올려 비벼 먹어도 됩니다.",
      },
      {
        order: 3,
        title: "양념 올리기",
        action: "간장 1큰술 중 절반을 먼저 두부 위에 뿌리고 참기름은 있으면 1작은술만 올립니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "간장이 접시 바닥에 조금 고이고 두부 위에 얇게 묻으면 충분합니다.",
        commonMistake: "간장을 한 번에 다 부으면 첫입부터 짤 수 있습니다.",
        rescueTip: "짜면 간장 국물을 조금 따라내고 두부나 밥을 더 곁들이세요.",
      },
      {
        order: 4,
        title: "고명 올려 먹기",
        action: "대파나 참깨가 있으면 조금 올리고 한입 맛본 뒤 남은 간장을 찍어 먹습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "두부가 차갑고 부드럽고 양념 향이 나면 완성입니다.",
        commonMistake: "고명을 많이 올리면 두부 맛보다 양념 맛이 강해집니다.",
        rescueTip: "싱거우면 간장을 1작은술씩만 더 찍어 먹으세요.",
      },
    ];
  }

  if (title === "오이무침") {
    return [
      {
        order: 1,
        title: "오이 썰기",
        action: "오이 1개를 씻고 양끝을 자른 뒤 0.5cm 두께의 반달 모양으로 썹니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "오이 조각이 너무 얇아 접히지 않고 숟가락에 2~3개 올라가면 좋습니다.",
        commonMistake: "너무 두껍게 썰면 양념이 겉에만 묻습니다.",
        rescueTip: "두꺼운 조각은 그릇 안에서 가위로 한 번 더 자르세요.",
      },
      {
        order: 2,
        title: "양념 만들기",
        action: "그릇에 간장 1큰술, 식초 1큰술, 설탕 1작은술을 넣고 설탕이 보이지 않을 때까지 섞습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "숟가락 바닥에 설탕 알갱이가 거의 보이지 않으면 됩니다.",
        commonMistake: "설탕이 덜 녹으면 한입은 달고 한입은 짭니다.",
        rescueTip: "잘 안 녹으면 물 1작은술을 넣고 다시 섞으세요.",
      },
      {
        order: 3,
        title: "오이 무치기",
        action: "오이를 양념에 넣고 숟가락으로 아래에서 위로 들어 올리듯 10번만 섞습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "오이 겉면이 반짝이고 양념이 얇게 묻으면 충분합니다.",
        commonMistake: "세게 누르며 섞으면 오이에서 물이 많이 나옵니다.",
        rescueTip: "물이 많아지면 양념 국물을 조금 덜어내세요.",
      },
      {
        order: 4,
        title: "마지막 간 보기",
        action: "고춧가루나 참기름은 있으면 마지막에 조금만 넣고 한입 맛본 뒤 바로 먹습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "오이가 아직 아삭하고 짠맛보다 새콤한 맛이 먼저 나면 완성입니다.",
        commonMistake: "미리 오래 무쳐 두면 물이 생기고 싱거워집니다.",
        rescueTip: "싱거우면 간장 1작은술만 더 넣고, 짜면 오이를 더 썰어 넣으세요.",
      },
    ];
  }

  if (title === "깻잎무침") {
    return [
      {
        order: 1,
        title: "깻잎 씻고 물기 빼기",
        action: "깻잎 10장을 한 장씩 씻고 키친타월로 눌러 물기를 닦습니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "깻잎 표면에 큰 물방울이 보이지 않으면 양념할 준비가 된 상태입니다.",
        commonMistake: "물기가 많으면 양념이 잎에 붙지 않고 바닥에 고입니다.",
        rescueTip: "물방울이 보이면 키친타월로 한 번 더 눌러 주세요.",
      },
      {
        order: 2,
        title: "먹기 좋게 자르기",
        action: "깻잎을 2~3장씩 겹쳐 반으로 자르거나 손으로 크게 찢습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "한입에 들어가는 크기면 밥과 같이 먹기 쉽습니다.",
        commonMistake: "너무 잘게 자르면 젓가락으로 집기 어렵습니다.",
        rescueTip: "잘게 잘렸다면 밥 위에 올려 비빔밥처럼 먹으세요.",
      },
      {
        order: 3,
        title: "양념 섞기",
        action: "간장 1큰술과 참기름 1작은술을 먼저 섞고, 고춧가루는 있으면 1/2작은술만 넣습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "양념이 한 가지 색으로 섞이고 참기름 향이 나면 됩니다.",
        commonMistake: "고춧가루를 많이 넣으면 잎이 뻑뻑하고 매워집니다.",
        rescueTip: "맵다면 깻잎을 더 넣거나 밥과 같이 먹으세요.",
      },
      {
        order: 4,
        title: "살살 무치기",
        action: "깻잎을 양념에 넣고 손이나 젓가락으로 가볍게 뒤집어 양념을 묻힙니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "깻잎 표면에 양념이 얇게 묻고 잎이 아직 초록색이면 완성입니다.",
        commonMistake: "세게 비비면 깻잎이 검게 뭉개집니다.",
        rescueTip: "양념이 몰렸다면 깨끗한 깻잎 몇 장을 더 넣어 나눠 묻히세요.",
      },
    ];
  }

  if (title === "깻잎두부무침") {
    return [
      {
        order: 1,
        title: "두부 물기 빼기",
        action: "두부 1/2모를 키친타월로 감싸 1분 눌러 물기를 빼고 손가락 한 마디 크기로 자릅니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "두부 겉이 축축하지만 물이 흐르지 않으면 됩니다.",
        commonMistake: "물기를 안 빼면 무친 뒤 그릇 바닥에 물이 많이 생깁니다.",
        rescueTip: "물이 많으면 두부를 체에 1분 더 받쳐 두세요.",
      },
      {
        order: 2,
        title: "깻잎 준비",
        action: "깻잎 8장은 씻어 물기를 닦고 손으로 한입 크기로 찢습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "깻잎이 두부보다 조금 작은 크기면 같이 집기 좋습니다.",
        commonMistake: "물기가 남으면 간장이 흐르고 깻잎에 양념이 덜 묻습니다.",
        rescueTip: "물방울이 보이면 키친타월로 다시 눌러 주세요.",
      },
      {
        order: 3,
        title: "양념 넣기",
        action: "간장 1큰술과 참기름 1작은술을 그릇 가장자리로 넣고 두부가 으깨지지 않게 섞습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "두부 표면에 간장색이 살짝 돌고 깻잎이 골고루 보이면 됩니다.",
        commonMistake: "두부 위에 간장을 바로 붓고 세게 누르면 두부가 다 으깨집니다.",
        rescueTip: "으깨졌다면 밥 위에 올려 두부비빔밥처럼 먹으면 됩니다.",
      },
      {
        order: 4,
        title: "간 보고 완성",
        action: "한입 맛보고 싱거우면 간장 1작은술만 더 넣고 참깨가 있으면 뿌립니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "두부는 부드럽고 깻잎 향이 나며 그릇 바닥에 물이 많지 않으면 완성입니다.",
        commonMistake: "간을 보기 전 양념을 더 넣으면 쉽게 짜집니다.",
        rescueTip: "짜면 두부나 밥을 더 넣어 맛을 낮추세요.",
      },
    ];
  }

  if (hasAny(title, ["계란밥", "달걀밥"]) && !isMicrowaveRecipe(title)) {
    const mainIngredient = getMainIngredientPhrase(title);
    return [
      {
        order: 1,
        title: "밥 데우기",
        action: "밥은 따뜻하게 데워 그릇에 담고, 같이 넣을 김치나 김가루는 먹기 좋은 크기로 준비합니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "밥에서 김이 살짝 올라오면 양념이 잘 섞입니다.",
        commonMistake: "찬밥을 쓰면 계란과 양념이 따로 놀 수 있습니다.",
        rescueTip: "밥이 딱딱하면 물 1큰술을 뿌려 전자레인지에 40초 더 데우세요.",
      },
      {
        order: 2,
        title: "계란 프라이",
        action: "팬에 식용유를 두르고 중불에서 계란 2개를 프라이합니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "흰자가 투명하지 않고 하얗게 굳으면 밥에 올릴 수 있습니다.",
        commonMistake: "너무 센 불에서 시작하면 바닥만 타고 위는 덜 익습니다.",
        rescueTip: "바닥이 빨리 갈색이 되면 불을 약하게 낮추고 30초 더 익히세요.",
      },
      {
        order: 3,
        title: "밥에 올리기",
        action: `밥 위에 계란과 ${mainIngredient}을 올리고 간장이나 참기름을 정량만 넣습니다.`,
        heat: "불 없음",
        minutes: 1,
        visualCue: "밥, 계란, 주재료가 한 그릇 안에 나뉘어 보이면 비빌 준비가 된 상태입니다.",
        commonMistake: "양념을 눈대중으로 많이 넣으면 쉽게 짜집니다.",
        rescueTip: "처음에는 간장을 1큰술만 넣고 비빈 뒤 부족하면 1작은술씩 추가하세요.",
      },
      {
        order: 4,
        title: "비벼서 간 맞추기",
        action: "계란을 숟가락으로 잘라 밥과 고르게 비빈 뒤 한입 맛보고 간을 맞춥니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "밥알 전체에 양념색이 옅게 돌면 완성입니다.",
        commonMistake: "한쪽만 비비면 먹을 때 간이 들쭉날쭉합니다.",
        rescueTip: "짜면 밥이나 김가루를 더 넣고, 싱거우면 간장 1작은술을 추가하세요.",
      },
    ];
  }

  if (title === "간장버터밥") {
    return [
      {
        order: 1,
        title: "밥 뜨겁게 준비",
        action: "따뜻한 밥 1공기를 그릇에 담고 버터가 녹을 수 있을 만큼 뜨겁게 준비합니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "밥에서 김이 올라오면 버터가 잘 녹습니다.",
        commonMistake: "찬밥에 버터를 넣으면 덩어리로 남습니다.",
        rescueTip: "버터가 안 녹으면 전자레인지에 20초만 더 데우세요.",
      },
      {
        order: 2,
        title: "버터 녹이기",
        action: "버터 1작은술을 밥 가운데 넣고 밥으로 덮어 30초 둡니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "버터가 밥 사이로 녹아 윤기가 보이면 됩니다.",
        commonMistake: "버터를 많이 넣으면 느끼하고 질척해집니다.",
        rescueTip: "느끼하면 김가루나 참깨를 넣어 잡으세요.",
      },
      {
        order: 3,
        title: "간장 넣기",
        action: "간장 1큰술을 넣고 숟가락으로 아래에서 위로 섞습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "밥알이 연한 갈색으로 고르게 바뀌면 간이 퍼진 상태입니다.",
        commonMistake: "간장을 한 번에 더 넣으면 짜집니다.",
        rescueTip: "짜면 밥을 조금 더 넣고 다시 섞으세요.",
      },
      {
        order: 4,
        title: "마무리",
        action: "참기름이나 참깨가 있으면 조금 넣고 한입 맛본 뒤 바로 먹습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "버터 향이 나고 밥알이 뭉치지 않으면 완성입니다.",
        commonMistake: "식은 뒤 먹으면 버터 향이 줄고 밥이 뭉칩니다.",
        rescueTip: "식었다면 전자레인지에 20초만 데워 다시 섞으세요.",
      },
    ];
  }

  if (title === "감자달걀샐러드") {
    return [
      {
        order: 1,
        title: "감자와 계란 삶기",
        action: "냄비에 감자 1개와 계란 2개를 넣고 물을 잠길 만큼 부어 중불에서 10분 삶습니다.",
        heat: "중불",
        minutes: 10,
        visualCue: "감자는 젓가락이 부드럽게 들어가고 계란 흰자는 단단하면 됩니다.",
        commonMistake: "감자가 덜 익으면 숟가락으로 으깨지지 않습니다.",
        rescueTip: "감자가 단단하면 작게 잘라 전자레인지에 1분 더 데우세요.",
      },
      {
        order: 2,
        title: "식히고 으깨기",
        action: "감자와 계란을 찬물에 1분 식힌 뒤 껍질을 벗기고 숟가락으로 굵게 으깹니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "큰 덩어리가 손톱 크기 정도로 남아 있으면 먹기 좋습니다.",
        commonMistake: "뜨거운 상태에서 바로 마요네즈를 넣으면 기름져 보일 수 있습니다.",
        rescueTip: "너무 뜨거우면 2분 더 식힌 뒤 섞으세요.",
      },
      {
        order: 3,
        title: "마요네즈 섞기",
        action: "마요네즈 1큰술과 소금 한 꼬집을 넣고 아래에서 위로 가볍게 섞습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "감자와 계란 표면에 마요네즈가 얇게 묻으면 충분합니다.",
        commonMistake: "마요네즈를 많이 넣으면 질척하고 느끼해집니다.",
        rescueTip: "질척하면 으깬 감자나 오이를 조금 더 넣으세요.",
      },
      {
        order: 4,
        title: "맛 보고 완성",
        action: "한입 맛보고 싱거우면 소금 한 꼬집만 더 넣고 후추나 오이는 있으면 조금 넣습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "숟가락으로 떴을 때 살짝 뭉치고 물이 고이지 않으면 완성입니다.",
        commonMistake: "간을 보기 전 소금을 더 넣으면 쉽게 짜집니다.",
        rescueTip: "짜면 삶은 감자나 오이를 더 넣어 맛을 낮추세요.",
      },
    ];
  }

  if (title.includes("샐러드") && isNoFireRecipe(title)) {
    const mainIngredient = getMainIngredientPhrase(title);
    return [
      {
        order: 1,
        title: "물기 빼기",
        action: `${mainIngredient}은 체나 키친타월로 물기와 캔 액체를 먼저 뺍니다.`,
        heat: "불 없음",
        minutes: 2,
        visualCue: "그릇 바닥에 물이나 기름이 고이지 않으면 됩니다.",
        commonMistake: "물기가 많으면 마요네즈가 묽어지고 밥에 올렸을 때 질척합니다.",
        rescueTip: "물기가 남았으면 키친타월로 한 번 더 눌러 주세요.",
      },
      {
        order: 2,
        title: "작게 나누기",
        action: `${mainIngredient}을 숟가락에 올라가는 크기로 찢거나 자릅니다.`,
        heat: "불 없음",
        minutes: 2,
        visualCue: "한 숟가락에 재료가 2~3조각 올라오면 먹기 편합니다.",
        commonMistake: "재료가 크면 마요네즈가 겉만 묻고 속은 따로 놉니다.",
        rescueTip: "크게 남은 조각은 그릇 안에서 가위로 잘라 주세요.",
      },
      {
        order: 3,
        title: "마요네즈 섞기",
        action: "마요네즈 1큰술과 소금 한 꼬집을 넣고 아래에서 위로 가볍게 섞습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "재료 표면에 얇게 윤기가 돌면 충분합니다.",
        commonMistake: "마요네즈를 많이 넣으면 느끼하고 무겁습니다.",
        rescueTip: "느끼하면 오이, 양배추, 김가루 중 하나를 더 넣어 잡으세요.",
      },
      {
        order: 4,
        title: "간 확인",
        action: "한입 맛보고 싱거우면 소금 한 꼬집만 더 넣어 완성합니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "숟가락으로 떴을 때 재료가 살짝 뭉치면 완성입니다.",
        commonMistake: "맛을 보기 전 소금을 더 넣으면 쉽게 짜집니다.",
        rescueTip: "짜면 오이나 밥을 곁들여 먹으면 됩니다.",
      },
    ];
  }

  if (title === "참치김치찌개") {
    return [
      {
        order: 1,
        title: "김치 작게 자르기",
        action: "김치 1컵은 가위로 숟가락에 올라가는 크기로 자르고, 참치캔은 기름을 1큰술만 남기고 덜어냅니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "김치 조각이 한입 크기이고 참치캔에 기름이 조금만 남아 있으면 됩니다.",
        commonMistake: "김치를 크게 넣으면 먹을 때 숟가락에 잘 안 올라옵니다.",
        rescueTip: "이미 냄비에 넣었다면 주방가위로 냄비 안에서 조금 더 자르세요.",
      },
      {
        order: 2,
        title: "김치 먼저 끓이기",
        action: "냄비에 김치와 물 2컵을 넣고 중불에서 7분 끓입니다.",
        heat: "중불",
        minutes: 7,
        visualCue: "김치 줄기가 휘어지고 국물 색이 붉어지면 다음 재료를 넣을 때입니다.",
        commonMistake: "처음부터 참치를 넣으면 참치가 너무 부서집니다.",
        rescueTip: "물이 줄어 바닥이 보이면 물 1/2컵을 더 넣으세요.",
      },
      {
        order: 3,
        title: "참치와 두부 넣기",
        action: "참치 1/2캔을 넣고 두부가 있으면 1/2모를 숟가락 크기로 잘라 넣은 뒤 3분 더 끓입니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "국물이 다시 보글거리고 두부가 뜨거워 보이면 됩니다.",
        commonMistake: "세게 저으면 참치와 두부가 모두 부서집니다.",
        rescueTip: "부서졌다면 젓지 말고 그대로 밥 위에 올려 먹으면 됩니다.",
      },
      {
        order: 4,
        title: "간 보고 마무리",
        action: "국간장 1큰술을 넣고 한 숟가락 맛본 뒤 싱거우면 국간장 1작은술만 더 넣습니다.",
        heat: "약불",
        minutes: 2,
        visualCue: "김치가 부드럽고 국물이 밥과 먹기 좋은 짠맛이면 완성입니다.",
        commonMistake: "맛보기 전에 간장을 더 넣으면 쉽게 짜집니다.",
        rescueTip: "짜면 물 1/2컵을 넣고 1분 더 끓이세요.",
      },
    ];
  }

  if (title === "참치두부조림") {
    return [
      {
        order: 1,
        title: "두부와 참치 준비",
        action: "두부 1/2모는 손가락 두께로 자르고 키친타월로 물기를 닦습니다. 참치 1/2캔은 기름을 거의 뺍니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "두부 표면에 물방울이 거의 없고 참치가 기름에 잠겨 있지 않으면 됩니다.",
        commonMistake: "두부 물기가 많으면 양념이 묽어지고 팬에서 튈 수 있습니다.",
        rescueTip: "물기가 보이면 키친타월로 한 번 더 눌러 주세요.",
      },
      {
        order: 2,
        title: "양념 섞기",
        action: "그릇에 간장 2큰술, 물 1/2컵, 설탕은 있으면 1작은술을 넣고 섞습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "간장색 물이 한 가지 색으로 섞이면 됩니다.",
        commonMistake: "간장만 넣으면 금방 타고 너무 짜집니다.",
        rescueTip: "양념이 짜 보이면 물 2큰술을 더 섞으세요.",
      },
      {
        order: 3,
        title: "두부 먼저 조리기",
        action: "팬에 두부와 양념을 넣고 중약불에서 4분 끓이며 양념을 두부 위에 끼얹습니다.",
        heat: "중약불",
        minutes: 4,
        visualCue: "양념이 두부 옆에서 작게 끓고 팬 바닥에 아직 양념이 남아 있으면 됩니다.",
        commonMistake: "두부를 계속 뒤집으면 부서집니다.",
        rescueTip: "부서진 두부는 그대로 숟가락으로 떠먹으면 됩니다.",
      },
      {
        order: 4,
        title: "참치 넣고 완성",
        action: "참치를 넣고 1분만 더 끓인 뒤 대파가 있으면 올리고 불을 끕니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "참치가 따뜻하고 팬 바닥에 양념이 2~3큰술 남으면 완성입니다.",
        commonMistake: "참치를 오래 끓이면 퍽퍽하고 짜집니다.",
        rescueTip: "짜면 밥 위에 올려 두부참치덮밥처럼 먹으세요.",
      },
    ];
  }

  if (title === "스팸김치볶음") {
    return [
      {
        order: 1,
        title: "스팸과 김치 자르기",
        action: "스팸 1/3캔은 작은 주사위 모양으로 자르고 김치 1컵은 국물을 살짝 짜서 가위로 자릅니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "스팸과 김치가 숟가락에 같이 올라가는 크기면 됩니다.",
        commonMistake: "스팸이 크면 한입이 너무 짜집니다.",
        rescueTip: "크게 잘랐다면 팬에 넣기 전 가위로 한 번 더 자르세요.",
      },
      {
        order: 2,
        title: "스팸 먼저 볶기",
        action: "팬에 스팸을 넣고 중불에서 2분 볶습니다. 팬이 마르면 식용유 1작은술만 넣습니다.",
        heat: "중불",
        minutes: 2,
        visualCue: "스팸 가장자리가 연한 갈색이 되고 기름이 조금 나오면 됩니다.",
        commonMistake: "기름을 많이 넣으면 김치까지 느끼해집니다.",
        rescueTip: "기름이 많으면 키친타월로 팬 가장자리를 살짝 닦으세요.",
      },
      {
        order: 3,
        title: "김치 볶기",
        action: "김치와 양파가 있으면 넣고 4분 볶습니다. 김치가 많이 시면 설탕 1/2작은술만 넣습니다.",
        heat: "중불",
        minutes: 4,
        visualCue: "김치 색이 진해지고 줄기가 부드럽게 휘면 됩니다.",
        commonMistake: "물이 없어 탈 때 계속 볶으면 쓴맛이 납니다.",
        rescueTip: "타기 시작하면 물 2큰술을 넣고 불을 약하게 낮추세요.",
      },
      {
        order: 4,
        title: "불 끄고 마무리",
        action: "불을 끄고 참기름이 있으면 1작은술만 넣어 섞은 뒤 바로 접시에 옮깁니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "스팸과 김치가 따뜻하고 김치국물이 팬 바닥에 조금만 남으면 완성입니다.",
        commonMistake: "불 위에서 참기름을 오래 볶으면 향이 날아갑니다.",
        rescueTip: "짜면 밥 위에 올려 덮밥처럼 먹으세요.",
      },
    ];
  }

  if (title === "햄감자볶음") {
    return [
      {
        order: 1,
        title: "감자 얇게 썰기",
        action: "감자 1개는 0.5cm 두께 반달 모양으로 썰고 햄은 감자보다 작게 자릅니다.",
        heat: "불 없음",
        minutes: 4,
        visualCue: "감자 조각이 두껍지 않고 햄이 한입 크기면 됩니다.",
        commonMistake: "감자가 두꺼우면 겉은 타고 속은 딱딱합니다.",
        rescueTip: "두껍게 잘랐다면 전자레인지에 1분 데운 뒤 볶으세요.",
      },
      {
        order: 2,
        title: "감자 먼저 익히기",
        action: "팬에 식용유 1큰술, 감자, 물 2큰술을 넣고 중불에서 4분 볶듯이 익힙니다.",
        heat: "중불",
        minutes: 4,
        visualCue: "감자 가장자리가 투명해지고 젓가락이 반쯤 들어가면 됩니다.",
        commonMistake: "처음부터 햄을 넣으면 햄만 먼저 탑니다.",
        rescueTip: "감자가 딱딱하면 물 1큰술을 더 넣고 1분 더 익히세요.",
      },
      {
        order: 3,
        title: "햄 넣고 볶기",
        action: "햄을 넣고 2분 더 볶습니다. 햄이 짜면 간장은 넣지 않습니다.",
        heat: "중불",
        minutes: 2,
        visualCue: "햄 가장자리가 따뜻하게 익고 감자가 부드러우면 됩니다.",
        commonMistake: "간장을 먼저 넣으면 감자가 익기 전에 팬 바닥이 탑니다.",
        rescueTip: "팬 바닥이 갈색이면 물 1큰술을 넣고 긁어 섞으세요.",
      },
      {
        order: 4,
        title: "간 보고 완성",
        action: "감자 한 조각을 먹어보고 싱거울 때만 간장 1작은술이나 소금 한 꼬집을 넣습니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "감자가 부드럽고 햄 짠맛이 감자와 같이 느껴지면 완성입니다.",
        commonMistake: "간을 보기 전에 간장을 넣으면 햄 때문에 전체가 짜집니다.",
        rescueTip: "짜면 감자나 밥을 더 곁들여 먹으세요.",
      },
    ];
  }

  if (title === "어묵볶음") {
    return [
      {
        order: 1,
        title: "어묵 자르기",
        action: "어묵 3장은 손가락 두 마디 크기로 자르고 양파가 있으면 얇게 썹니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "어묵 조각이 숟가락에 2~3개 올라가는 크기면 됩니다.",
        commonMistake: "너무 작게 자르면 볶는 동안 마르고 짜집니다.",
        rescueTip: "크기가 들쭉날쭉하면 큰 조각만 가위로 한 번 더 자르세요.",
      },
      {
        order: 2,
        title: "먼저 볶기",
        action: "팬에 식용유 1큰술을 두르고 어묵과 양파를 중불에서 3분 볶습니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "어묵 가장자리가 살짝 말리고 양파가 투명해지면 됩니다.",
        commonMistake: "처음부터 간장을 넣으면 간장이 먼저 탑니다.",
        rescueTip: "팬이 마르면 물 1큰술을 넣어 붙은 부분을 떼세요.",
      },
      {
        order: 3,
        title: "양념 넣기",
        action: "간장 1큰술, 물 2큰술, 설탕은 있으면 1작은술을 넣고 약불로 낮춥니다.",
        heat: "약불",
        minutes: 2,
        visualCue: "양념이 팬 바닥에서 작게 끓고 어묵에 윤기가 생기면 됩니다.",
        commonMistake: "강불에서 양념을 넣으면 순식간에 짜고 마릅니다.",
        rescueTip: "짜면 물 2큰술과 양파를 조금 더 넣어 1분 볶으세요.",
      },
      {
        order: 4,
        title: "촉촉할 때 끄기",
        action: "팬 바닥에 양념이 조금 남았을 때 불을 끄고 접시에 옮깁니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "어묵 표면에 윤기가 남고 팬 바닥이 타지 않았으면 완성입니다.",
        commonMistake: "오래 볶으면 어묵이 질겨집니다.",
        rescueTip: "마르면 물 1큰술을 넣고 20초만 다시 볶으세요.",
      },
    ];
  }

  if (title === "어묵탕") {
    return [
      {
        order: 1,
        title: "어묵과 무 준비",
        action: "어묵 3장은 한입 크기로 자르고 무가 있으면 얇게 나박썰기합니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "어묵은 숟가락에 올라가고 무는 얇아 빨리 익을 크기면 됩니다.",
        commonMistake: "무를 두껍게 자르면 국물이 끓어도 속이 딱딱합니다.",
        rescueTip: "무가 두꺼우면 반으로 한 번 더 자르세요.",
      },
      {
        order: 2,
        title: "국물 끓이기",
        action: "냄비에 물 2컵과 무를 넣고 중불에서 6분 끓입니다. 무가 없으면 3분만 끓입니다.",
        heat: "중불",
        minutes: 6,
        visualCue: "무 가장자리가 투명해지거나 물 가장자리에 기포가 올라오면 됩니다.",
        commonMistake: "물을 적게 넣으면 금방 짜지고 어묵이 붑니다.",
        rescueTip: "물이 줄었으면 물 1/2컵을 더 넣으세요.",
      },
      {
        order: 3,
        title: "어묵 넣기",
        action: "어묵과 국간장 1큰술을 넣고 중불에서 4분 더 끓입니다.",
        heat: "중불",
        minutes: 4,
        visualCue: "어묵이 살짝 부풀고 국물이 다시 보글거리면 됩니다.",
        commonMistake: "어묵을 너무 오래 끓이면 흐물거립니다.",
        rescueTip: "어묵이 많이 불었으면 바로 불을 끄고 먹습니다.",
      },
      {
        order: 4,
        title: "간 보고 마무리",
        action: "한 숟가락 맛보고 싱거우면 국간장 1작은술만 더 넣고 대파가 있으면 올립니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "국물이 따뜻하고 어묵이 부드러우며 짜지 않으면 완성입니다.",
        commonMistake: "국간장을 한 번 더 크게 넣으면 국물이 쉽게 짜집니다.",
        rescueTip: "짜면 물 1/2컵을 넣고 1분 더 끓이세요.",
      },
    ];
  }

  if (title === "어묵우동") {
    return [
      {
        order: 1,
        title: "어묵 자르기",
        action: "어묵 2장은 한입 크기로 자르고 우동면 포장지를 열어 조리 시간을 확인합니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "어묵 조각이 숟가락에 올라가고 우동면이 바로 넣을 수 있게 준비되면 됩니다.",
        commonMistake: "어묵을 너무 크게 넣으면 면과 같이 먹기 어렵습니다.",
        rescueTip: "크게 잘랐다면 냄비에 넣기 전 가위로 한 번 더 자르세요.",
      },
      {
        order: 2,
        title: "국물 끓이기",
        action: "냄비에 물 2.5컵과 국간장 1큰술을 넣고 중불에서 끓입니다.",
        heat: "중불",
        minutes: 4,
        visualCue: "냄비 가장자리에 기포가 올라오고 김이 나면 면을 넣을 때입니다.",
        commonMistake: "물을 적게 넣으면 우동면을 넣은 뒤 국물이 짜집니다.",
        rescueTip: "국물이 적어 보이면 물 1/2컵을 더 넣으세요.",
      },
      {
        order: 3,
        title: "면과 어묵 넣기",
        action: "우동면과 어묵을 넣고 젓가락으로 면을 풀며 3분 끓입니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "면이 서로 풀리고 어묵이 살짝 부풀면 됩니다.",
        commonMistake: "면을 세게 누르면 끊어지고 국물이 탁해집니다.",
        rescueTip: "면이 뭉쳤다면 젓가락으로 천천히 흔들어 풀어 주세요.",
      },
      {
        order: 4,
        title: "간 보고 담기",
        action: "국물을 한 숟가락 맛보고 싱거우면 국간장 1작은술만 더 넣고 대파가 있으면 올립니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "면이 부드럽고 국물이 짜지 않으면 완성입니다.",
        commonMistake: "간장을 많이 추가하면 면이 국물을 먹으며 더 짜집니다.",
        rescueTip: "짜면 물 1/2컵을 넣고 30초 더 끓이세요.",
      },
    ];
  }

  if (title === "소시지야채볶음") {
    return [
      {
        order: 1,
        title: "소시지와 야채 준비",
        action: "소시지 2개는 어슷하게 자르거나 칼집을 넣고, 양파가 있으면 한입 크기로 자릅니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "소시지 조각이 한입 크기이고 야채가 너무 두껍지 않으면 됩니다.",
        commonMistake: "통소시지를 그대로 볶으면 속이 늦게 따뜻해집니다.",
        rescueTip: "통째로 넣었다면 팬 안에서 가위로 잘라 주세요.",
      },
      {
        order: 2,
        title: "소시지 먼저 볶기",
        action: "팬에 식용유 1작은술을 두르고 소시지를 중불에서 2분 볶습니다.",
        heat: "중불",
        minutes: 2,
        visualCue: "소시지 칼집이 벌어지고 가장자리가 살짝 진해지면 됩니다.",
        commonMistake: "센불에서 시작하면 겉만 빨리 탑니다.",
        rescueTip: "갈색이 빨리 나면 불을 약하게 줄이고 야채를 넣으세요.",
      },
      {
        order: 3,
        title: "야채 넣기",
        action: "양파나 파프리카가 있으면 넣고 2분 더 볶습니다.",
        heat: "중불",
        minutes: 2,
        visualCue: "양파가 살짝 투명해지고 소시지가 따뜻해지면 됩니다.",
        commonMistake: "야채를 너무 오래 볶으면 물이 나와 질척해집니다.",
        rescueTip: "물이 나오면 불을 조금 올려 30초만 더 볶으세요.",
      },
      {
        order: 4,
        title: "양념하고 완성",
        action: "케첩 1큰술이나 간장 1작은술 중 하나만 넣고 30초 섞은 뒤 불을 끕니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "소시지 겉에 양념이 얇게 묻으면 완성입니다.",
        commonMistake: "케첩과 간장을 둘 다 많이 넣으면 짜고 달아집니다.",
        rescueTip: "맛이 강하면 밥 위에 올려 덮밥처럼 먹으세요.",
      },
    ];
  }

  if (title === "참치양배추덮밥") {
    return [
      {
        order: 1,
        title: "밥과 참치 준비",
        action: "따뜻한 밥 1공기를 그릇에 담고 참치 1/2캔은 기름이나 물을 거의 뺍니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "밥은 김이 살짝 나고 참치 그릇 바닥에 기름이 흥건하지 않으면 됩니다.",
        commonMistake: "참치 기름을 그대로 넣으면 밥이 느끼하고 질척합니다.",
        rescueTip: "이미 질척하면 밥을 2숟가락 더 넣어 섞으세요.",
      },
      {
        order: 2,
        title: "양배추 볶기",
        action: "팬에 식용유 1작은술을 두르고 양배추 1컵을 중불에서 2분 볶습니다.",
        heat: "중불",
        minutes: 2,
        visualCue: "양배추 숨이 살짝 죽고 가장자리가 반투명해지면 됩니다.",
        commonMistake: "두껍게 썬 양배추는 겉만 익고 속이 뻣뻣합니다.",
        rescueTip: "두껍게 썰었다면 물 1큰술을 넣고 1분 더 익히세요.",
      },
      {
        order: 3,
        title: "참치와 간장 넣기",
        action: "참치와 간장 1큰술을 넣고 약불로 낮춘 뒤 1분만 섞습니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "참치와 양배추에 간장 색이 고르게 묻으면 됩니다.",
        commonMistake: "센불에서 간장을 넣으면 팬 바닥에서 빨리 탑니다.",
        rescueTip: "탄 냄새가 나면 바로 불을 끄고 타지 않은 부분만 밥에 올리세요.",
      },
      {
        order: 4,
        title: "밥 위에 올리기",
        action: "볶은 참치양배추를 밥 위에 올리고 한입 맛본 뒤 싱거우면 간장 1작은술만 더합니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "밥 위에 토핑이 촉촉하게 올라가고 국물이 흥건하지 않으면 완성입니다.",
        commonMistake: "맛보기 전에 간장을 더 넣으면 참치 간 때문에 짤 수 있습니다.",
        rescueTip: "짜면 밥을 조금 더 넣거나 김가루를 곁들여 먹으세요.",
      },
    ];
  }

  if (title === "햄계란전") {
    return [
      {
        order: 1,
        title: "햄 작게 자르기",
        action: "햄 1/3컵은 콩알보다 조금 큰 크기로 작게 자릅니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "햄 조각이 계란물에 골고루 섞일 만큼 작으면 됩니다.",
        commonMistake: "햄이 크면 전을 뒤집을 때 찢어집니다.",
        rescueTip: "크게 잘랐다면 가위로 팬에 넣기 전 한 번 더 잘라 주세요.",
      },
      {
        order: 2,
        title: "계란물 만들기",
        action: "계란 2개를 그릇에 깨고 햄을 넣어 젓가락으로 20번 정도 섞습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "노른자와 흰자가 섞이고 햄이 골고루 보이면 됩니다.",
        commonMistake: "덜 섞으면 흰자만 익는 부분이 생깁니다.",
        rescueTip: "흰 줄이 많이 보이면 10번 더 저으세요.",
      },
      {
        order: 3,
        title: "작게 부치기",
        action: "팬에 식용유 1큰술을 두르고 중불에서 계란물을 숟가락으로 3~4개 나누어 올립니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "가장자리가 굳고 윗면이 반쯤 익으면 뒤집을 때입니다.",
        commonMistake: "크게 한 장으로 부치면 초보자는 뒤집기 어렵습니다.",
        rescueTip: "찢어져도 작게 모아 한 번 더 눌러 익히면 됩니다.",
      },
      {
        order: 4,
        title: "뒤집어 마무리",
        action: "뒤집개를 깊게 넣어 뒤집고 약불에서 2분 더 익힌 뒤 접시에 옮깁니다.",
        heat: "약불",
        minutes: 2,
        visualCue: "속 계란물이 흐르지 않고 양면이 연한 노란색이면 완성입니다.",
        commonMistake: "센불로 오래 익히면 겉은 타고 속은 덜 익습니다.",
        rescueTip: "속이 덜 익었으면 약불에서 1분 더 익히세요.",
      },
    ];
  }

  if (title === "깻잎어묵볶음") {
    return [
      {
        order: 1,
        title: "어묵과 깻잎 자르기",
        action: "어묵 3장은 손가락 두 마디 크기로 자르고 깻잎 6장은 길게 접어 굵게 채 썹니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "어묵은 한입 크기이고 깻잎은 젓가락으로 집기 좋은 굵기면 됩니다.",
        commonMistake: "깻잎을 너무 잘게 자르면 볶을 때 뭉칩니다.",
        rescueTip: "뭉친 깻잎은 손으로 살살 풀어 두세요.",
      },
      {
        order: 2,
        title: "어묵 먼저 볶기",
        action: "팬에 식용유 1큰술을 두르고 어묵을 중불에서 3분 볶습니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "어묵 가장자리가 살짝 부풀고 표면이 따뜻해지면 됩니다.",
        commonMistake: "깻잎을 처음부터 넣으면 향이 날아가고 까맣게 변합니다.",
        rescueTip: "깻잎을 먼저 넣었다면 바로 꺼내 마지막에 다시 섞으세요.",
      },
      {
        order: 3,
        title: "간장 양념 넣기",
        action: "약불로 낮추고 간장 1큰술, 물 2큰술, 설탕은 있으면 1작은술을 넣어 1분 섞습니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "어묵에 간장색이 묻고 팬 바닥에 양념이 조금 남아 있으면 됩니다.",
        commonMistake: "물을 안 넣으면 간장이 바로 타서 씁니다.",
        rescueTip: "양념이 마르면 물 1큰술을 더 넣고 20초만 섞으세요.",
      },
      {
        order: 4,
        title: "깻잎 넣고 끄기",
        action: "깻잎을 넣고 20초만 섞은 뒤 바로 불을 끕니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "깻잎 숨이 살짝 죽고 초록색이 남아 있으면 완성입니다.",
        commonMistake: "깻잎을 오래 볶으면 향이 약해지고 질겨집니다.",
        rescueTip: "깻잎 향이 약하면 새 깻잎 1장을 잘라 위에 올리세요.",
      },
    ];
  }

  if (title === "참치오이무침") {
    return [
      {
        order: 1,
        title: "참치 물기 빼기",
        action: "참치 1/2캔은 뚜껑이나 숟가락으로 눌러 기름이나 물을 거의 뺍니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "참치를 그릇에 담았을 때 바닥에 물이 많이 고이지 않으면 됩니다.",
        commonMistake: "참치 물기를 안 빼면 양념이 묽어집니다.",
        rescueTip: "이미 묽으면 키친타월로 참치를 살짝 눌러 주세요.",
      },
      {
        order: 2,
        title: "오이 얇게 자르기",
        action: "오이 1/2개는 반달 모양으로 얇게 자릅니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "오이가 젓가락으로 집히고 참치와 같이 먹기 좋은 두께면 됩니다.",
        commonMistake: "오이를 두껍게 자르면 양념이 겉에만 묻습니다.",
        rescueTip: "두꺼운 조각은 반으로 한 번 더 자르세요.",
      },
      {
        order: 3,
        title: "양념 넣기",
        action: "참치와 오이에 간장 1작은술을 넣고 참기름이 있으면 1작은술만 더합니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "오이와 참치 표면에 양념이 얇게 묻으면 됩니다.",
        commonMistake: "간장을 큰술로 넣으면 바로 짭니다.",
        rescueTip: "짜면 오이 몇 조각이나 밥을 곁들여 먹으세요.",
      },
      {
        order: 4,
        title: "살살 섞기",
        action: "숟가락 두 개로 아래에서 위로 들어 올리듯 10번만 섞고 참깨가 있으면 뿌립니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "오이가 부서지지 않고 참치가 큰 덩어리 없이 섞이면 완성입니다.",
        commonMistake: "세게 비비면 참치가 으깨져 질척합니다.",
        rescueTip: "질척하면 오이를 조금 더 넣어 주세요.",
      },
    ];
  }

  if (title === "된장두부국") {
    return [
      {
        order: 1,
        title: "된장 풀기",
        action: "냄비에 물 2컵과 된장 1큰술을 넣고 숟가락으로 풀어 중불에 올립니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "된장 덩어리가 거의 풀리고 국물이 갈색으로 고르면 됩니다.",
        commonMistake: "된장을 덩어리째 끓이면 한입이 너무 짤 수 있습니다.",
        rescueTip: "덩어리가 보이면 숟가락으로 눌러 더 풀어 주세요.",
      },
      {
        order: 2,
        title: "채소 먼저 넣기",
        action: "애호박이 있으면 얇게 썰어 넣고 중불에서 3분 끓입니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "애호박 가장자리가 살짝 투명해지면 두부를 넣을 때입니다.",
        commonMistake: "채소를 두껍게 넣으면 두부가 익어도 채소가 딱딱합니다.",
        rescueTip: "두꺼우면 2분 더 끓인 뒤 두부를 넣으세요.",
      },
      {
        order: 3,
        title: "두부 넣기",
        action: "두부 1/2모를 숟가락에 올라가는 크기로 넣고 3분 더 끓입니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "두부가 따뜻해지고 국물이 다시 보글거리면 됩니다.",
        commonMistake: "두부를 세게 저으면 부서져 국물이 탁해집니다.",
        rescueTip: "부서져도 먹을 수 있으니 더 젓지 말고 그대로 끓이세요.",
      },
      {
        order: 4,
        title: "간 보고 완성",
        action: "국물을 맛보고 싱거우면 된장 1작은술만 더 풀고 대파가 있으면 올립니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "국물이 따뜻하고 두부가 부드러우며 너무 짜지 않으면 완성입니다.",
        commonMistake: "된장을 큰술로 또 넣으면 금방 짜집니다.",
        rescueTip: "짜면 물 1/2컵을 넣고 1분 더 끓이세요.",
      },
    ];
  }

  if (title === "미역국") {
    return [
      {
        order: 1,
        title: "미역 준비",
        action: "불린 미역 1컵을 물에 한 번 헹구고 길면 가위로 두세 번 자릅니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "미역이 숟가락으로 떠먹기 좋은 길이면 됩니다.",
        commonMistake: "마른 미역을 많이 불리면 양이 너무 많아집니다.",
        rescueTip: "미역이 많으면 절반만 쓰고 나머지는 냉장 보관하세요.",
      },
      {
        order: 2,
        title: "미역 데우기",
        action: "냄비에 미역과 참기름이 있으면 1작은술을 넣고 약불에서 1분 볶습니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "미역에 윤기가 나고 고소한 향이 살짝 나면 됩니다.",
        commonMistake: "센불에서 볶으면 미역이 냄비에 붙습니다.",
        rescueTip: "참기름이 없으면 볶지 말고 바로 물을 넣어도 됩니다.",
      },
      {
        order: 3,
        title: "물 넣고 끓이기",
        action: "물 2.5컵을 넣고 중불에서 8분 끓입니다.",
        heat: "중불",
        minutes: 8,
        visualCue: "국물이 초록빛을 띠고 미역이 부드럽게 퍼지면 됩니다.",
        commonMistake: "물을 적게 넣으면 미역국이 짜고 걸쭉해집니다.",
        rescueTip: "국물이 적으면 물 1/2컵을 더 넣으세요.",
      },
      {
        order: 4,
        title: "간 맞추기",
        action: "국간장 1큰술을 넣고 1분 더 끓인 뒤 맛보고 싱거울 때만 1작은술 더 넣습니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "국물이 따뜻하고 미역이 부드러우며 짜지 않으면 완성입니다.",
        commonMistake: "처음부터 간장을 많이 넣으면 되돌리기 어렵습니다.",
        rescueTip: "짜면 물 1/2컵을 넣고 1분 더 끓이세요.",
      },
    ];
  }

  if (title === "참치샐러드") {
    return [
      {
        order: 1,
        title: "참치 기름 빼기",
        action: "참치 1/2캔은 뚜껑이나 숟가락으로 눌러 기름이나 물을 거의 뺍니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "그릇 바닥에 기름이 흥건하지 않으면 됩니다.",
        commonMistake: "기름을 안 빼면 마요네즈를 넣었을 때 질척합니다.",
        rescueTip: "이미 질척하면 키친타월로 한 번 눌러 주세요.",
      },
      {
        order: 2,
        title: "참치 풀기",
        action: "참치를 그릇에 담고 숟가락으로 큰 덩어리를 작게 풀어 줍니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "참치가 숟가락으로 떠먹기 좋은 작은 조각이면 됩니다.",
        commonMistake: "큰 덩어리 그대로 섞으면 마요네즈가 겉에만 묻습니다.",
        rescueTip: "큰 덩어리는 숟가락 등으로 눌러 부수세요.",
      },
      {
        order: 3,
        title: "마요네즈 섞기",
        action: "마요네즈 1큰술을 넣고 아래에서 위로 가볍게 섞습니다. 오이가 있으면 작게 넣습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "참치 표면에 마요네즈가 얇게 묻고 덩어리가 살짝 뭉치면 됩니다.",
        commonMistake: "마요네즈를 많이 넣으면 느끼하고 묽어집니다.",
        rescueTip: "질척하면 참치나 오이를 조금 더 넣으세요.",
      },
      {
        order: 4,
        title: "간 보고 완성",
        action: "한입 맛보고 싱거울 때만 소금 한 꼬집이나 간장 1/2작은술을 넣습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "숟가락으로 떴을 때 살짝 뭉치고 짜지 않으면 완성입니다.",
        commonMistake: "맛보기 전에 간장을 넣으면 참치 자체 간 때문에 짤 수 있습니다.",
        rescueTip: "짜면 밥이나 오이를 곁들여 먹으세요.",
      },
    ];
  }

  if (title === "통조림옥수수햄볶음") {
    return [
      {
        order: 1,
        title: "옥수수 물기 빼기",
        action: "통조림 옥수수 1/2컵은 체에 받쳐 물기를 빼고 햄은 옥수수보다 조금 크게 자릅니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "그릇 바닥에 옥수수 물이 고이지 않으면 됩니다.",
        commonMistake: "물기 많은 옥수수를 바로 볶으면 팬에서 튀고 질척합니다.",
        rescueTip: "물기가 보이면 키친타월로 한 번 눌러 주세요.",
      },
      {
        order: 2,
        title: "햄 먼저 볶기",
        action: "팬에 식용유 1작은술을 두르고 햄을 중불에서 2분 볶습니다.",
        heat: "중불",
        minutes: 2,
        visualCue: "햄 가장자리가 따뜻하게 익고 향이 올라오면 됩니다.",
        commonMistake: "햄을 크게 썰면 한입이 너무 짭니다.",
        rescueTip: "큰 조각은 팬 안에서 가위로 잘라 주세요.",
      },
      {
        order: 3,
        title: "옥수수 넣기",
        action: "옥수수를 넣고 2분 더 볶습니다. 팬이 마르면 물 1큰술만 넣습니다.",
        heat: "중불",
        minutes: 2,
        visualCue: "옥수수가 따뜻해지고 팬 바닥에 물이 거의 없으면 됩니다.",
        commonMistake: "옥수수를 오래 볶으면 튀거나 마를 수 있습니다.",
        rescueTip: "마르면 물 1큰술을 넣고 바로 섞으세요.",
      },
      {
        order: 4,
        title: "간 보고 마무리",
        action: "맛을 보고 싱거울 때만 간장 1작은술을 넣고, 버터가 있으면 불 끄고 1작은술 섞습니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "햄과 옥수수가 윤기 있고 짜지 않으면 완성입니다.",
        commonMistake: "햄이 짠데 간장을 먼저 넣으면 전체가 짜집니다.",
        rescueTip: "짜면 밥과 같이 먹거나 옥수수를 더 넣으세요.",
      },
    ];
  }

  if (title === "어묵달걀국") {
    return [
      {
        order: 1,
        title: "어묵과 계란 준비",
        action: "어묵 2장은 한입 크기로 자르고 계란 1개는 그릇에 깨서 젓가락으로 풀어 둡니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "어묵은 숟가락에 올라가고 계란은 노른자와 흰자가 대충 섞이면 됩니다.",
        commonMistake: "계란을 바로 냄비에 깨면 큰 덩어리로 익습니다.",
        rescueTip: "큰 덩어리가 생겨도 숟가락으로 잘라 먹으면 됩니다.",
      },
      {
        order: 2,
        title: "국물 끓이기",
        action: "냄비에 물 2컵과 국간장 1큰술을 넣고 중불에서 끓입니다.",
        heat: "중불",
        minutes: 4,
        visualCue: "냄비 가장자리에 기포가 올라오고 김이 나면 됩니다.",
        commonMistake: "간장을 많이 넣고 시작하면 계란을 넣은 뒤 더 짜집니다.",
        rescueTip: "짤 것 같으면 물 1/2컵을 더 넣으세요.",
      },
      {
        order: 3,
        title: "어묵 넣기",
        action: "어묵을 넣고 중불에서 3분 끓입니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "어묵이 살짝 부풀고 국물이 다시 보글거리면 됩니다.",
        commonMistake: "어묵을 너무 오래 끓이면 흐물거립니다.",
        rescueTip: "어묵이 많이 불었으면 바로 계란을 넣고 마무리하세요.",
      },
      {
        order: 4,
        title: "계란 붓고 완성",
        action: "풀어 둔 계란을 냄비 가장자리로 천천히 붓고 30초 기다린 뒤 한 번만 저어 불을 끕니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "계란이 노란 리본처럼 떠오르면 완성입니다.",
        commonMistake: "계란을 넣자마자 많이 저으면 국물이 탁해집니다.",
        rescueTip: "탁해져도 맛은 괜찮으니 대파를 올려 마무리하세요.",
      },
    ];
  }

  if (title === "어묵간장볶음") {
    return [
      {
        order: 1,
        title: "어묵 자르기",
        action: "어묵 3장은 손가락 두 마디 크기로 자르고 대파가 있으면 작게 썹니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "어묵 조각이 숟가락에 2~3개 올라가는 크기면 됩니다.",
        commonMistake: "너무 작게 자르면 볶는 동안 마르고 짜집니다.",
        rescueTip: "큰 조각만 가위로 한 번 더 자르세요.",
      },
      {
        order: 2,
        title: "어묵 먼저 볶기",
        action: "팬에 식용유 1큰술을 두르고 어묵을 중불에서 3분 볶습니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "어묵 가장자리가 살짝 말리고 따뜻해지면 됩니다.",
        commonMistake: "처음부터 간장을 넣으면 간장이 먼저 탑니다.",
        rescueTip: "팬이 마르면 물 1큰술을 넣어 붙은 부분을 떼세요.",
      },
      {
        order: 3,
        title: "간장 양념 넣기",
        action: "간장 1큰술, 물 2큰술, 설탕은 있으면 1작은술을 넣고 약불로 낮춥니다.",
        heat: "약불",
        minutes: 2,
        visualCue: "양념이 팬 바닥에서 작게 끓고 어묵에 윤기가 생기면 됩니다.",
        commonMistake: "강불에서 양념을 넣으면 순식간에 짜고 마릅니다.",
        rescueTip: "짜면 물 2큰술을 넣고 30초만 더 섞으세요.",
      },
      {
        order: 4,
        title: "촉촉할 때 끄기",
        action: "대파가 있으면 넣고 30초 섞은 뒤 팬 바닥에 양념이 조금 남았을 때 불을 끕니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "어묵 표면에 윤기가 남고 팬 바닥이 타지 않았으면 완성입니다.",
        commonMistake: "오래 볶으면 어묵이 질겨집니다.",
        rescueTip: "마르면 물 1큰술을 넣고 20초만 다시 볶으세요.",
      },
    ];
  }

  if (title === "북엇국") {
    return [
      {
        order: 1,
        title: "북어채 준비",
        action: "북어채 1줌은 물에 30초만 적신 뒤 물기를 짜고 긴 조각은 가위로 자릅니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "북어채가 딱딱하지 않고 숟가락에 올라가는 길이면 됩니다.",
        commonMistake: "오래 담가두면 북어 맛이 빠지고 물러집니다.",
        rescueTip: "너무 물러졌으면 물기를 꼭 짜고 바로 끓이세요.",
      },
      {
        order: 2,
        title: "국물 끓이기",
        action: "냄비에 물 2.5컵과 북어채를 넣고 중불에서 6분 끓입니다.",
        heat: "중불",
        minutes: 6,
        visualCue: "국물이 연하게 뽀얘지고 북어채가 부드러워지면 됩니다.",
        commonMistake: "물을 적게 넣으면 북어채가 짜고 뻣뻣합니다.",
        rescueTip: "국물이 줄었으면 물 1/2컵을 더 넣으세요.",
      },
      {
        order: 3,
        title: "간 맞추기",
        action: "국간장 1큰술을 넣고 1분 더 끓입니다.",
        heat: "중불",
        minutes: 1,
        visualCue: "국물 색이 살짝 진해지고 짜지 않으면 됩니다.",
        commonMistake: "간장을 더 넣기 전에 맛을 보지 않으면 짜집니다.",
        rescueTip: "짜면 물 1/2컵을 넣고 1분 더 끓이세요.",
      },
      {
        order: 4,
        title: "계란 선택 마무리",
        action: "계란이 있으면 풀어서 냄비 가장자리로 천천히 붓고 30초 뒤 한 번만 저어 불을 끕니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "계란이 부드럽게 떠 있고 북어채가 따뜻하면 완성입니다.",
        commonMistake: "계란을 붓자마자 세게 저으면 국물이 탁해집니다.",
        rescueTip: "계란이 뭉쳐도 익었으면 그대로 먹어도 됩니다.",
      },
    ];
  }

  if (title === "김치국") {
    return [
      {
        order: 1,
        title: "김치 자르기",
        action: "김치 1컵은 가위로 숟가락에 올라가는 크기로 자르고 국물이 많으면 2큰술만 남깁니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "김치가 한입 크기이고 국물이 너무 흥건하지 않으면 됩니다.",
        commonMistake: "김치국물을 많이 넣으면 처음부터 짜고 시어집니다.",
        rescueTip: "국물이 많아졌다면 물을 1/2컵 더 넣으세요.",
      },
      {
        order: 2,
        title: "김치 끓이기",
        action: "냄비에 물 2.5컵과 김치를 넣고 중불에서 8분 끓입니다.",
        heat: "중불",
        minutes: 8,
        visualCue: "김치 줄기가 부드러워지고 국물이 붉게 우러나면 됩니다.",
        commonMistake: "김치를 조금만 끓이면 줄기가 뻣뻣하고 맛이 따로 놉니다.",
        rescueTip: "김치가 뻣뻣하면 3분 더 끓이세요.",
      },
      {
        order: 3,
        title: "간 보기",
        action: "국물을 맛보고 싱거울 때만 국간장 1큰술을 넣습니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "김치맛이 나고 국물이 짜지 않으면 됩니다.",
        commonMistake: "김치가 이미 짠데 국간장을 넣으면 너무 짜집니다.",
        rescueTip: "짜면 물 1/2컵과 두부가 있으면 조금 넣고 2분 끓이세요.",
      },
      {
        order: 4,
        title: "대파 선택 마무리",
        action: "대파가 있으면 넣고 30초 더 끓인 뒤 불을 끕니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "김치가 부드럽고 국물이 따뜻하면 완성입니다.",
        commonMistake: "마지막에 오래 끓이면 국물이 너무 졸아 짜집니다.",
        rescueTip: "졸았으면 물을 조금 넣어 다시 데우세요.",
      },
    ];
  }

  if (title === "된장찌개") {
    return [
      {
        order: 1,
        title: "된장 풀기",
        action: "냄비에 물 2컵과 된장 1큰술을 넣고 숟가락으로 풀어 중불에 올립니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "된장 덩어리가 거의 풀리고 국물이 고르게 베이지색이면 됩니다.",
        commonMistake: "된장을 덩어리째 끓이면 한입이 너무 짤 수 있습니다.",
        rescueTip: "덩어리가 보이면 숟가락으로 눌러 더 풀어 주세요.",
      },
      {
        order: 2,
        title: "채소 먼저 넣기",
        action: "애호박이나 양파가 있으면 얇게 썰어 넣고 중불에서 3분 끓입니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "채소 가장자리가 살짝 투명해지면 두부를 넣을 때입니다.",
        commonMistake: "채소를 두껍게 넣으면 두부가 익어도 채소가 딱딱합니다.",
        rescueTip: "두꺼우면 2분 더 끓인 뒤 두부를 넣으세요.",
      },
      {
        order: 3,
        title: "두부 넣기",
        action: "두부 1/2모를 숟가락에 올라가는 크기로 넣고 3분 더 끓입니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "두부가 따뜻해지고 국물이 다시 보글거리면 됩니다.",
        commonMistake: "두부를 세게 저으면 부서져 국물이 탁해집니다.",
        rescueTip: "부서져도 먹을 수 있으니 더 젓지 말고 그대로 끓이세요.",
      },
      {
        order: 4,
        title: "간 보고 완성",
        action: "국물을 맛보고 싱거우면 된장 1작은술만 더 풀고 대파가 있으면 올립니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "국물이 따뜻하고 두부가 부드러우며 너무 짜지 않으면 완성입니다.",
        commonMistake: "된장을 큰술로 또 넣으면 금방 짜집니다.",
        rescueTip: "짜면 물 1/2컵을 넣고 1분 더 끓이세요.",
      },
    ];
  }

  if (title === "김치찌개") {
    return [
      {
        order: 1,
        title: "김치 준비",
        action: "김치 1컵은 가위로 작게 자르고 두부가 있으면 숟가락에 올라가는 크기로 자릅니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "김치와 두부가 한입 크기면 됩니다.",
        commonMistake: "김치가 너무 크면 끓어도 숟가락으로 먹기 어렵습니다.",
        rescueTip: "냄비에 넣은 뒤에도 가위로 한 번 더 자를 수 있습니다.",
      },
      {
        order: 2,
        title: "김치 끓이기",
        action: "냄비에 김치와 물 2컵을 넣고 중불에서 8분 끓입니다.",
        heat: "중불",
        minutes: 8,
        visualCue: "김치 줄기가 부드러워지고 국물이 붉게 우러나면 됩니다.",
        commonMistake: "물을 적게 넣으면 금방 짜고 타기 쉽습니다.",
        rescueTip: "국물이 적으면 물 1/2컵을 더 넣으세요.",
      },
      {
        order: 3,
        title: "두부 선택 넣기",
        action: "두부가 있으면 넣고 3분 더 끓입니다. 두부가 없으면 이 단계는 1분만 더 끓입니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "두부가 따뜻해지고 국물이 다시 보글거리면 됩니다.",
        commonMistake: "두부를 넣고 세게 저으면 쉽게 부서집니다.",
        rescueTip: "부서져도 맛은 같으니 더 젓지 말고 그대로 끓이세요.",
      },
      {
        order: 4,
        title: "간 맞추기",
        action: "맛보고 싱거우면 국간장 1큰술을 넣고, 짜면 물 1/2컵을 더 넣습니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "김치가 부드럽고 밥과 먹기 좋은 간이면 완성입니다.",
        commonMistake: "김치 간을 보지 않고 간장을 넣으면 너무 짜집니다.",
        rescueTip: "짜면 물과 두부를 조금 더 넣어 2분 끓이세요.",
      },
    ];
  }

  if (title === "두부버섯국") {
    return [
      {
        order: 1,
        title: "두부와 버섯 준비",
        action: "두부 1/2모는 숟가락에 올라가는 크기로 자르고 버섯 1줌은 손으로 찢습니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "두부와 버섯이 숟가락으로 떠먹기 좋은 크기면 됩니다.",
        commonMistake: "버섯을 크게 넣으면 국물에서 뭉쳐 먹기 어렵습니다.",
        rescueTip: "큰 버섯은 손으로 한 번 더 찢으세요.",
      },
      {
        order: 2,
        title: "국물 끓이기",
        action: "냄비에 물 2컵과 국간장 1큰술을 넣고 중불에서 끓입니다.",
        heat: "중불",
        minutes: 4,
        visualCue: "냄비 가장자리에 기포가 올라오면 재료를 넣을 때입니다.",
        commonMistake: "처음부터 재료를 다 넣고 세게 저으면 두부가 부서집니다.",
        rescueTip: "두부는 국물이 끓은 뒤 넣으세요.",
      },
      {
        order: 3,
        title: "버섯 먼저 넣기",
        action: "버섯을 넣고 중불에서 3분 끓입니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "버섯 숨이 죽고 국물이 다시 끓으면 됩니다.",
        commonMistake: "버섯을 너무 오래 끓이면 질겨질 수 있습니다.",
        rescueTip: "질겨 보이면 바로 두부를 넣고 마무리하세요.",
      },
      {
        order: 4,
        title: "두부 넣고 완성",
        action: "두부를 넣고 2분 더 끓인 뒤 대파가 있으면 올리고 불을 끕니다.",
        heat: "약불",
        minutes: 2,
        visualCue: "두부가 따뜻하고 국물이 짜지 않으면 완성입니다.",
        commonMistake: "두부를 넣은 뒤 오래 끓이면 부서집니다.",
        rescueTip: "부서져도 먹을 수 있으니 국자로 조심히 떠 주세요.",
      },
    ];
  }

  if (title === "떡국떡달걀국") {
    return [
      {
        order: 1,
        title: "떡과 계란 준비",
        action: "떡국떡 1컵은 딱딱하면 물에 5분 담그고 계란 1개는 그릇에 풀어 둡니다.",
        heat: "불 없음",
        minutes: 5,
        visualCue: "떡이 살짝 말랑하고 계란 노른자와 흰자가 섞이면 됩니다.",
        commonMistake: "딱딱한 떡을 바로 넣으면 겉만 익고 속이 딱딱할 수 있습니다.",
        rescueTip: "딱딱하면 끓이는 시간을 2분 더 늘리세요.",
      },
      {
        order: 2,
        title: "떡 끓이기",
        action: "냄비에 물 2.5컵과 국간장 1큰술을 넣고 끓으면 떡을 넣어 5분 끓입니다.",
        heat: "중불",
        minutes: 5,
        visualCue: "떡이 떠오르고 젓가락으로 눌렀을 때 말랑하면 됩니다.",
        commonMistake: "떡을 넣고 젓지 않으면 바닥에 붙을 수 있습니다.",
        rescueTip: "처음 1분 동안만 젓가락으로 바닥을 살살 저어 주세요.",
      },
      {
        order: 3,
        title: "계란 붓기",
        action: "약불로 낮추고 풀어 둔 계란을 냄비 가장자리로 천천히 붓습니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "계란이 노란 실처럼 떠오르면 거의 익은 상태입니다.",
        commonMistake: "붓자마자 세게 저으면 국물이 탁해집니다.",
        rescueTip: "계란이 뭉쳤다면 그대로 30초 더 익히세요.",
      },
      {
        order: 4,
        title: "간 보고 완성",
        action: "한입 맛보고 싱거우면 국간장 1작은술만 더 넣고 대파가 있으면 올립니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "떡이 말랑하고 국물이 짜지 않으면 완성입니다.",
        commonMistake: "떡이 국물을 먹어 시간이 지나면 더 짜질 수 있습니다.",
        rescueTip: "짜면 물 1/2컵을 넣고 30초 더 끓이세요.",
      },
    ];
  }

  if (title === "감자된장국") {
    return [
      {
        order: 1,
        title: "감자 얇게 썰기",
        action: "감자 1개는 껍질을 벗기고 반달 모양으로 얇게 썹니다.",
        heat: "불 없음",
        minutes: 4,
        visualCue: "감자가 숟가락에 올라가고 두께가 비슷하면 됩니다.",
        commonMistake: "감자를 두껍게 썰면 국물이 끓어도 속이 덜 익습니다.",
        rescueTip: "두껍게 썰었다면 3분 더 끓이세요.",
      },
      {
        order: 2,
        title: "된장 풀기",
        action: "냄비에 물 2.5컵과 된장 1큰술을 넣고 숟가락으로 풀어 중불에 올립니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "된장 덩어리가 거의 풀리면 감자를 넣을 때입니다.",
        commonMistake: "된장을 덩어리째 끓이면 한입이 짤 수 있습니다.",
        rescueTip: "덩어리가 보이면 숟가락으로 눌러 더 풀어 주세요.",
      },
      {
        order: 3,
        title: "감자 익히기",
        action: "감자를 넣고 중불에서 8분 끓입니다.",
        heat: "중불",
        minutes: 8,
        visualCue: "감자 가장자리가 부드러워지고 숟가락으로 눌렀을 때 갈라지면 됩니다.",
        commonMistake: "감자가 익기 전에 불을 끄면 씹을 때 딱딱합니다.",
        rescueTip: "딱딱하면 물 1/2컵을 넣고 3분 더 끓이세요.",
      },
      {
        order: 4,
        title: "간 보고 마무리",
        action: "맛보고 싱거우면 된장 1작은술만 더 풀고 대파가 있으면 올립니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "감자가 부드럽고 국물이 짜지 않으면 완성입니다.",
        commonMistake: "된장을 크게 한 번 더 넣으면 바로 짜집니다.",
        rescueTip: "짜면 물 1/2컵을 넣고 1분 더 끓이세요.",
      },
    ];
  }

  if (title === "콩나물김치국") {
    return [
      {
        order: 1,
        title: "콩나물과 김치 준비",
        action: "콩나물 1줌은 헹구고 김치 1/2컵은 가위로 작게 자릅니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "콩나물은 물기가 빠지고 김치는 숟가락에 올라가는 크기면 됩니다.",
        commonMistake: "김치를 크게 넣으면 국에서 숟가락으로 먹기 어렵습니다.",
        rescueTip: "큰 김치는 냄비에 넣은 뒤에도 가위로 자를 수 있습니다.",
      },
      {
        order: 2,
        title: "김치 먼저 끓이기",
        action: "냄비에 물 2.5컵과 김치를 넣고 중불에서 5분 끓입니다.",
        heat: "중불",
        minutes: 5,
        visualCue: "국물이 붉게 우러나고 김치가 살짝 부드러워지면 됩니다.",
        commonMistake: "김치국물을 많이 넣으면 처음부터 짜집니다.",
        rescueTip: "짜 보이면 물 1/2컵을 먼저 더하세요.",
      },
      {
        order: 3,
        title: "콩나물 넣기",
        action: "콩나물을 넣고 뚜껑을 덮지 않은 채 중불에서 4분 끓입니다.",
        heat: "중불",
        minutes: 4,
        visualCue: "콩나물 숨이 죽고 비린 냄새가 줄면 됩니다.",
        commonMistake: "중간에 뚜껑을 여닫으면 콩나물 비린내가 날 수 있습니다.",
        rescueTip: "뚜껑 없이 끝까지 끓이면 냄새가 덜합니다.",
      },
      {
        order: 4,
        title: "간 보고 완성",
        action: "국물을 맛보고 싱거울 때만 국간장 1큰술을 넣고 대파가 있으면 올립니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "콩나물이 아삭하고 국물이 짜지 않으면 완성입니다.",
        commonMistake: "김치가 짠데 국간장을 넣으면 너무 짭니다.",
        rescueTip: "짜면 물 1/2컵을 넣고 1분 더 끓이세요.",
      },
    ];
  }

  if (title === "순두부국") {
    return [
      {
        order: 1,
        title: "순두부 준비",
        action: "순두부 1팩은 포장을 열고 물을 살짝 따라낸 뒤 숟가락으로 크게 떠 둘 준비를 합니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "순두부가 너무 잘게 부서지지 않은 상태면 됩니다.",
        commonMistake: "처음부터 잘게 으깨면 국물이 탁해집니다.",
        rescueTip: "부서져도 먹을 수 있으니 더 젓지 마세요.",
      },
      {
        order: 2,
        title: "국물 끓이기",
        action: "냄비에 물 2컵과 국간장 1큰술을 넣고 중불에서 끓입니다.",
        heat: "중불",
        minutes: 4,
        visualCue: "냄비 가장자리에 기포가 올라오면 순두부를 넣을 때입니다.",
        commonMistake: "물을 적게 넣으면 순두부가 쉽게 짜집니다.",
        rescueTip: "국물이 적어 보이면 물 1/2컵을 더 넣으세요.",
      },
      {
        order: 3,
        title: "순두부 넣기",
        action: "순두부를 숟가락으로 크게 떠 넣고 중불에서 3분 끓입니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "순두부가 따뜻해지고 국물이 다시 보글거리면 됩니다.",
        commonMistake: "순두부를 넣고 세게 저으면 다 부서집니다.",
        rescueTip: "숟가락으로 냄비 가장자리만 살살 밀어 주세요.",
      },
      {
        order: 4,
        title: "계란 선택 마무리",
        action: "계란이 있으면 풀어 가장자리로 붓고 30초 기다린 뒤 한 번만 저어 불을 끕니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "계란이 부드럽게 익고 순두부가 따뜻하면 완성입니다.",
        commonMistake: "계란을 넣고 바로 세게 저으면 국물이 탁해집니다.",
        rescueTip: "계란이 뭉쳐도 익었으면 그대로 먹어도 됩니다.",
      },
    ];
  }

  if (title === "애호박된장국") {
    return [
      {
        order: 1,
        title: "애호박 썰기",
        action: "애호박 1/3개는 얇은 반달 모양으로 썹니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "애호박이 숟가락에 올라가고 두께가 비슷하면 됩니다.",
        commonMistake: "두껍게 썰면 국물이 끓어도 속이 딱딱합니다.",
        rescueTip: "두꺼우면 2분 더 끓이면 됩니다.",
      },
      {
        order: 2,
        title: "된장 풀기",
        action: "냄비에 물 2컵과 된장 1큰술을 넣고 숟가락으로 풀어 중불에 올립니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "된장 덩어리가 거의 풀리면 애호박을 넣을 때입니다.",
        commonMistake: "된장을 많이 넣으면 호박 단맛이 묻힙니다.",
        rescueTip: "짜면 물 1/2컵을 넣고 다시 끓이세요.",
      },
      {
        order: 3,
        title: "애호박 익히기",
        action: "애호박을 넣고 중불에서 5분 끓입니다.",
        heat: "중불",
        minutes: 5,
        visualCue: "애호박 가장자리가 반투명해지면 됩니다.",
        commonMistake: "너무 오래 끓이면 애호박이 흐물거립니다.",
        rescueTip: "부드러워졌으면 바로 다음 단계로 넘어가세요.",
      },
      {
        order: 4,
        title: "간 보고 완성",
        action: "국물을 맛보고 싱거우면 된장 1작은술만 더 풀고 대파가 있으면 올립니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "애호박이 부드럽고 국물이 짜지 않으면 완성입니다.",
        commonMistake: "마지막에 된장을 많이 넣으면 금방 짜집니다.",
        rescueTip: "짜면 물을 조금 넣어 조절하세요.",
      },
    ];
  }

  if (title === "양파국") {
    return [
      {
        order: 1,
        title: "양파 얇게 썰기",
        action: "양파 1/2개는 얇게 채 썹니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "양파가 길지만 너무 두껍지 않으면 됩니다.",
        commonMistake: "양파가 두꺼우면 단맛이 늦게 나옵니다.",
        rescueTip: "두껍게 썰었다면 끓이는 시간을 2분 늘리세요.",
      },
      {
        order: 2,
        title: "양파 끓이기",
        action: "냄비에 물 2컵과 양파를 넣고 중불에서 8분 끓입니다.",
        heat: "중불",
        minutes: 8,
        visualCue: "양파가 투명해지고 국물이 살짝 달큰한 향이 나면 됩니다.",
        commonMistake: "짧게 끓이면 양파 매운맛이 남습니다.",
        rescueTip: "매운맛이 나면 3분 더 끓이세요.",
      },
      {
        order: 3,
        title: "간 맞추기",
        action: "국간장 1큰술을 넣고 1분 더 끓입니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "국물이 살짝 갈색을 띠고 짜지 않으면 됩니다.",
        commonMistake: "양파가 달다고 간장을 많이 넣으면 국물이 짜집니다.",
        rescueTip: "짜면 물 1/2컵을 넣고 다시 데우세요.",
      },
      {
        order: 4,
        title: "계란 선택 마무리",
        action: "계란이 있으면 풀어 넣고 30초 기다린 뒤 한 번만 저어 불을 끕니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "계란이 부드럽게 익고 양파가 투명하면 완성입니다.",
        commonMistake: "계란을 세게 저으면 국물이 탁해집니다.",
        rescueTip: "계란 없이도 양파국으로 먹을 수 있습니다.",
      },
    ];
  }

  if (title === "배추된장국") {
    return [
      {
        order: 1,
        title: "배추 자르기",
        action: "배추 2장은 잎과 줄기를 한입 크기로 자릅니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "배추 줄기가 너무 크지 않고 숟가락에 올라가면 됩니다.",
        commonMistake: "줄기를 크게 자르면 잎은 익어도 줄기가 딱딱합니다.",
        rescueTip: "큰 줄기는 반으로 더 자르세요.",
      },
      {
        order: 2,
        title: "된장 풀기",
        action: "냄비에 물 2.5컵과 된장 1큰술을 넣고 숟가락으로 풀어 중불에 올립니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "된장 덩어리가 거의 풀리면 배추를 넣을 때입니다.",
        commonMistake: "된장을 덩어리째 끓이면 한입이 짤 수 있습니다.",
        rescueTip: "덩어리가 보이면 숟가락으로 눌러 풀어 주세요.",
      },
      {
        order: 3,
        title: "배추 끓이기",
        action: "배추를 넣고 중불에서 8분 끓입니다.",
        heat: "중불",
        minutes: 8,
        visualCue: "배추 줄기가 반투명해지고 잎이 부드러워지면 됩니다.",
        commonMistake: "배추를 짧게 끓이면 풋내가 날 수 있습니다.",
        rescueTip: "줄기가 딱딱하면 3분 더 끓이세요.",
      },
      {
        order: 4,
        title: "간 보고 완성",
        action: "국물을 맛보고 싱거우면 된장 1작은술만 더 풀고 대파가 있으면 올립니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "배추가 부드럽고 국물이 짜지 않으면 완성입니다.",
        commonMistake: "마지막에 된장을 많이 넣으면 배추 단맛이 사라집니다.",
        rescueTip: "짜면 물 1/2컵을 넣고 1분 더 끓이세요.",
      },
    ];
  }

  if (title === "만두국") {
    return [
      {
        order: 1,
        title: "국물 끓이기",
        action: "냄비에 물 2.5컵과 국간장 1큰술을 넣고 중불로 끓입니다.",
        heat: "중불",
        minutes: 4,
        visualCue: "냄비 가장자리에 작은 거품이 올라오면 만두를 넣을 때입니다.",
        commonMistake: "처음부터 간장을 많이 넣으면 만두가 익은 뒤 짤 수 있습니다.",
        rescueTip: "싱거우면 마지막에 국간장 1작은술만 더 넣으세요.",
      },
      {
        order: 2,
        title: "만두 넣기",
        action: "냉동만두 4개를 넣고 서로 붙지 않게 숟가락으로 한 번만 살살 밀어 줍니다.",
        heat: "중불",
        minutes: 7,
        visualCue: "만두가 떠오르고 만두피가 투명해지면 거의 익은 상태입니다.",
        commonMistake: "만두를 세게 저으면 터질 수 있습니다.",
        rescueTip: "터진 만두는 그대로 두고 국물을 너무 세게 끓이지 마세요.",
      },
      {
        order: 3,
        title: "계란 선택 넣기",
        action: "계란이 있으면 작은 그릇에 풀어 국물 위에 천천히 붓고 30초 기다립니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "계란이 노란 구름처럼 익으면 젓가락으로 한 번만 저어도 됩니다.",
        commonMistake: "계란을 넣자마자 많이 저으면 국물이 탁해집니다.",
        rescueTip: "계란이 없어도 만두가 익었으면 완성할 수 있습니다.",
      },
      {
        order: 4,
        title: "간 보고 완성",
        action: "만두 하나를 반으로 갈라 속이 뜨거운지 확인하고 대파가 있으면 올립니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "만두 속이 차갑지 않고 김이 나면 완성입니다.",
        commonMistake: "만두 겉만 보고 불을 끄면 속이 차가울 수 있습니다.",
        rescueTip: "속이 차가우면 2분 더 끓이세요.",
      },
    ];
  }

  if (title === "부추달걀국") {
    return [
      {
        order: 1,
        title: "부추와 계란 준비",
        action: "부추는 가위로 4cm 길이로 자르고 계란 1개는 작은 그릇에 풀어 둡니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "부추가 숟가락에 올라갈 길이이고 계란 흰자와 노른자가 섞이면 됩니다.",
        commonMistake: "부추를 너무 길게 두면 먹기 불편합니다.",
        rescueTip: "길면 그릇 안에서 가위로 한 번 더 자르세요.",
      },
      {
        order: 2,
        title: "국물 간 맞추기",
        action: "냄비에 물 2컵과 국간장 1큰술을 넣고 중불로 끓입니다.",
        heat: "중불",
        minutes: 4,
        visualCue: "국물이 끓기 시작하면 계란을 넣을 때입니다.",
        commonMistake: "물이 끓기 전 계란을 넣으면 계란이 가라앉습니다.",
        rescueTip: "이미 넣었다면 젓지 말고 끓을 때까지 기다리세요.",
      },
      {
        order: 3,
        title: "계란 붓기",
        action: "불을 약하게 줄이고 푼 계란을 둥글게 부은 뒤 30초 기다립니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "계란이 부드러운 덩어리로 떠오르면 됩니다.",
        commonMistake: "계란을 세게 저으면 국물이 탁해집니다.",
        rescueTip: "한 번만 살짝 저어 모양을 살리세요.",
      },
      {
        order: 4,
        title: "부추 넣고 끄기",
        action: "부추를 넣고 30초만 더 끓인 뒤 불을 끄고 참기름이 있으면 1작은술 넣습니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "부추가 선명한 초록색으로 살짝 숨이 죽으면 완성입니다.",
        commonMistake: "부추를 오래 끓이면 색이 어두워지고 질겨집니다.",
        rescueTip: "부추를 늦게 넣는 것이 가장 쉽습니다.",
      },
    ];
  }

  if (title === "간장비빔국수") {
    return [
      {
        order: 1,
        title: "소면 삶기",
        action: "끓는 물에 소면 1인분을 넣고 포장 시간보다 30초 짧게 삶습니다.",
        heat: "중불",
        minutes: 4,
        visualCue: "면이 하얗게 풀리고 한 가닥 먹어 봤을 때 딱딱하지 않으면 됩니다.",
        commonMistake: "면을 너무 오래 삶으면 비빌 때 뭉칩니다.",
        rescueTip: "너무 익었으면 찬물에 충분히 헹궈 전분을 빼세요.",
      },
      {
        order: 2,
        title: "찬물에 헹구기",
        action: "삶은 면을 체에 붓고 찬물로 비벼 헹군 뒤 물기를 털어 냅니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "면이 미끈거리지 않고 손에 차갑게 느껴지면 됩니다.",
        commonMistake: "물기가 많으면 양념이 싱거워집니다.",
        rescueTip: "체를 두세 번 흔들어 물기를 더 빼세요.",
      },
      {
        order: 3,
        title: "간장 양념 섞기",
        action: "그릇에 간장 1.5큰술, 참기름 1큰술, 설탕 1/2작은술을 먼저 섞습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "설탕 알갱이가 거의 보이지 않으면 됩니다.",
        commonMistake: "간장을 한 번에 많이 넣으면 짭니다.",
        rescueTip: "처음에는 양념의 절반만 면에 넣고 맛을 보세요.",
      },
      {
        order: 4,
        title: "면 비비기",
        action: "면을 양념에 넣고 젓가락으로 들어 올리듯 비빈 뒤 김가루나 오이를 올립니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "면 전체가 연한 갈색으로 고르게 코팅되면 완성입니다.",
        commonMistake: "세게 누르며 비비면 면이 끊어집니다.",
        rescueTip: "짜면 면을 조금 더 넣거나 물 1큰술을 섞으세요.",
      },
    ];
  }

  if (title === "비빔국수") {
    return [
      {
        order: 1,
        title: "소면 삶기",
        action: "끓는 물에 소면 1인분을 넣고 포장 시간보다 30초 짧게 삶습니다.",
        heat: "중불",
        minutes: 4,
        visualCue: "면이 부드럽지만 힘없이 끊어지지 않으면 됩니다.",
        commonMistake: "면이 너무 익으면 양념을 넣을 때 떡집니다.",
        rescueTip: "찬물에 오래 헹궈 면을 식히면 덜 떡집니다.",
      },
      {
        order: 2,
        title: "면 헹구기",
        action: "삶은 면을 찬물에 비벼 헹구고 체에서 물기를 털어 둡니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "면이 차갑고 미끈거림이 줄면 됩니다.",
        commonMistake: "물기가 많으면 고추장 양념이 묽어집니다.",
        rescueTip: "체에 둔 채 30초 더 기다렸다가 비비세요.",
      },
      {
        order: 3,
        title: "비빔양념 만들기",
        action: "그릇에 고추장 1큰술, 간장 1작은술, 설탕 1작은술, 참기름 1큰술을 섞습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "양념이 한 가지 붉은색으로 고르게 섞이면 됩니다.",
        commonMistake: "매운맛을 모르고 고추장을 많이 넣으면 먹기 어렵습니다.",
        rescueTip: "매운 것이 걱정되면 고추장은 1/2큰술만 먼저 쓰세요.",
      },
      {
        order: 4,
        title: "면과 양념 비비기",
        action: "면을 넣고 젓가락으로 가볍게 비빈 뒤 김치가 있으면 작게 잘라 올립니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "면에 붉은 양념이 고르게 묻으면 완성입니다.",
        commonMistake: "양념을 한 번에 다 넣으면 짜거나 매울 수 있습니다.",
        rescueTip: "짜거나 매우면 면이나 오이를 더 넣으세요.",
      },
    ];
  }

  if (title === "잔치국수") {
    return [
      {
        order: 1,
        title: "소면 삶기",
        action: "끓는 물에 소면 1인분을 넣고 포장 시간대로 삶은 뒤 찬물에 헹굽니다.",
        heat: "중불",
        minutes: 5,
        visualCue: "면이 부드럽고 찬물에 헹궈 탱탱해지면 됩니다.",
        commonMistake: "면을 헹구지 않으면 국물에 넣었을 때 끈적합니다.",
        rescueTip: "이미 국물에 넣었어도 너무 끈적하면 물을 조금 더 넣으세요.",
      },
      {
        order: 2,
        title: "국물 끓이기",
        action: "냄비에 물 2.5컵과 국간장 1큰술을 넣고 중불에서 4분 끓입니다.",
        heat: "중불",
        minutes: 4,
        visualCue: "국물이 끓고 간장 향이 부드러워지면 됩니다.",
        commonMistake: "국간장을 많이 넣으면 면을 넣었을 때 짭니다.",
        rescueTip: "짜면 물 1/2컵을 넣고 다시 끓이세요.",
      },
      {
        order: 3,
        title: "면 담기",
        action: "그릇에 헹군 소면을 담고 뜨거운 국물을 천천히 부어 줍니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "면이 국물에 잠기면 됩니다.",
        commonMistake: "국물을 한 번에 붓다가 튈 수 있습니다.",
        rescueTip: "국자는 몸에서 먼 쪽으로 기울여 천천히 부으세요.",
      },
      {
        order: 4,
        title: "고명 올리고 맛보기",
        action: "대파나 김가루가 있으면 올리고 국물을 맛본 뒤 싱거우면 간장 1작은술만 더합니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "면이 따뜻하고 국물이 짜지 않으면 완성입니다.",
        commonMistake: "마지막 간을 많이 하면 금방 짜집니다.",
        rescueTip: "싱거울 때만 1작은술씩 추가하세요.",
      },
    ];
  }

  if (title === "김치라면") {
    return [
      {
        order: 1,
        title: "김치 자르기",
        action: "김치 1/2컵은 가위로 한입 크기로 자릅니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "라면과 같이 집어 먹기 좋은 크기면 됩니다.",
        commonMistake: "김치가 크면 면과 따로 놀고 먹기 불편합니다.",
        rescueTip: "냄비에 넣기 전 그릇 안에서 한 번 더 자르세요.",
      },
      {
        order: 2,
        title: "김치 국물 끓이기",
        action: "냄비에 물 2.5컵, 김치, 라면스프를 넣고 중불로 끓입니다.",
        heat: "중불",
        minutes: 4,
        visualCue: "국물이 붉어지고 끓기 시작하면 면을 넣을 때입니다.",
        commonMistake: "스프를 전부 넣으면 짤 수 있습니다.",
        rescueTip: "싱겁게 먹고 싶으면 스프는 2/3봉만 먼저 넣으세요.",
      },
      {
        order: 3,
        title: "면 넣고 끓이기",
        action: "라면 면을 넣고 젓가락으로 한 번 풀어 주며 포장 시간대로 끓입니다.",
        heat: "중불",
        minutes: 4,
        visualCue: "면이 풀리고 가운데 딱딱한 심이 없어지면 됩니다.",
        commonMistake: "면을 계속 누르면 잘게 부서집니다.",
        rescueTip: "처음 1분은 그대로 두고 살짝 풀어 주세요.",
      },
      {
        order: 4,
        title: "계란 선택 마무리",
        action: "계란이 있으면 가운데에 깨 넣고 1분 더 끓인 뒤 대파가 있으면 올립니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "면이 익고 계란 흰자가 하얗게 변하면 완성입니다.",
        commonMistake: "계란을 넣고 세게 저으면 국물이 탁해집니다.",
        rescueTip: "계란 없이도 면이 익었으면 완성입니다.",
      },
    ];
  }

  if (title === "라면계란죽") {
    return [
      {
        order: 1,
        title: "라면 부수기",
        action: "라면 1/2봉은 봉지 안에서 손으로 작게 부수고 밥 1/2공기는 숟가락으로 풀어 둡니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "라면 조각이 숟가락에 올라갈 크기면 됩니다.",
        commonMistake: "면을 크게 넣으면 죽처럼 떠먹기 어렵습니다.",
        rescueTip: "큰 조각은 끓이기 전에 한 번 더 부수세요.",
      },
      {
        order: 2,
        title: "국물 끓이기",
        action: "냄비에 물 2.5컵과 라면스프 1/2봉을 넣고 중불로 끓입니다.",
        heat: "중불",
        minutes: 4,
        visualCue: "국물이 끓고 스프 덩어리가 보이지 않으면 됩니다.",
        commonMistake: "스프를 전부 넣으면 죽이 짜집니다.",
        rescueTip: "싱거우면 마지막에 스프를 조금만 더 넣으세요.",
      },
      {
        order: 3,
        title: "면과 밥 끓이기",
        action: "부순 라면과 밥을 넣고 약불에서 5분 저어 가며 끓입니다.",
        heat: "약불",
        minutes: 5,
        visualCue: "밥알이 풀리고 국물이 걸쭉해지면 계란을 넣을 때입니다.",
        commonMistake: "센 불로 끓이면 바닥이 눌어붙습니다.",
        rescueTip: "눌어붙기 시작하면 물 1/2컵을 넣고 약불로 줄이세요.",
      },
      {
        order: 4,
        title: "계란 넣고 완성",
        action: "계란 1개를 풀어 넣고 30초 기다린 뒤 한 번만 저어 대파가 있으면 올립니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "계란이 부드럽게 익고 죽이 숟가락에 걸쭉하게 올라오면 완성입니다.",
        commonMistake: "계란을 오래 끓이면 뻣뻣해집니다.",
        rescueTip: "너무 되직하면 물을 조금 넣고 30초만 더 데우세요.",
      },
    ];
  }

  if (title === "볶음우동") {
    return [
      {
        order: 1,
        title: "우동면 풀기",
        action: "우동면은 뜨거운 물에 30초 담갔다가 젓가락으로 살살 풀어 물기를 뺍니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "면 가닥이 서로 떨어지면 됩니다.",
        commonMistake: "딱딱한 면을 바로 볶으면 끊어집니다.",
        rescueTip: "면이 안 풀리면 뜨거운 물에 30초 더 담그세요.",
      },
      {
        order: 2,
        title: "양념 섞기",
        action: "작은 그릇에 간장 1큰술, 굴소스 1큰술, 설탕 1/2작은술을 섞습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "설탕 알갱이가 거의 보이지 않으면 됩니다.",
        commonMistake: "양념을 팬에서 바로 넣으면 한쪽만 짤 수 있습니다.",
        rescueTip: "미리 섞어 두면 초보자도 고르게 볶기 쉽습니다.",
      },
      {
        order: 3,
        title: "면 볶기",
        action: "팬에 식용유 1큰술을 두르고 우동면과 양념을 넣어 중불에서 3분 볶습니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "면이 갈색 양념으로 고르게 코팅되면 됩니다.",
        commonMistake: "센 불에서 오래 볶으면 양념이 탑니다.",
        rescueTip: "팬이 마르면 물 1큰술을 넣고 풀어 주세요.",
      },
      {
        order: 4,
        title: "채소 선택 마무리",
        action: "양배추나 양파가 있으면 넣고 1분 더 볶은 뒤 불을 끕니다.",
        heat: "중불",
        minutes: 1,
        visualCue: "면이 윤기 있고 채소가 살짝 숨이 죽으면 완성입니다.",
        commonMistake: "채소를 많이 넣으면 물이 나와 싱거워집니다.",
        rescueTip: "싱거우면 간장 1작은술만 추가하세요.",
      },
    ];
  }

  if (title === "어묵우동볶음") {
    return [
      {
        order: 1,
        title: "어묵과 면 준비",
        action: "어묵 2장은 가위로 한입 크기로 자르고 우동면은 뜨거운 물에 30초 담가 풀어 둡니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "어묵은 숟가락에 올라가고 면은 가닥이 풀리면 됩니다.",
        commonMistake: "어묵을 크게 자르면 볶을 때 면과 따로 놉니다.",
        rescueTip: "큰 조각은 팬에 넣기 전 한 번 더 자르세요.",
      },
      {
        order: 2,
        title: "어묵 먼저 볶기",
        action: "팬에 식용유 1큰술을 두르고 어묵을 중불에서 2분 볶습니다.",
        heat: "중불",
        minutes: 2,
        visualCue: "어묵 가장자리가 살짝 노릇해지면 면을 넣을 때입니다.",
        commonMistake: "어묵을 오래 볶으면 질겨집니다.",
        rescueTip: "마르면 물 1큰술을 넣고 부드럽게 하세요.",
      },
      {
        order: 3,
        title: "면과 양념 넣기",
        action: "우동면, 간장 1큰술, 설탕 1/2작은술을 넣고 젓가락으로 풀며 3분 볶습니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "면과 어묵에 간장색이 고르게 묻으면 됩니다.",
        commonMistake: "면을 세게 누르면 끊어집니다.",
        rescueTip: "면이 붙으면 물 1큰술을 넣고 살살 풀어 주세요.",
      },
      {
        order: 4,
        title: "간 보고 완성",
        action: "한입 맛보고 싱거우면 간장 1작은술만 더 넣고 대파가 있으면 올립니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "면이 윤기 있고 어묵이 따뜻하면 완성입니다.",
        commonMistake: "마지막에 간장을 많이 넣으면 금방 짜집니다.",
        rescueTip: "짜면 우동면이나 양배추를 조금 더 넣어 조절하세요.",
      },
    ];
  }

  if (title === "토마토파스타") {
    return [
      {
        order: 1,
        title: "파스타면 삶기",
        action: "끓는 물에 소금 1작은술과 파스타면 1인분을 넣고 포장 시간대로 삶습니다.",
        heat: "중불",
        minutes: 9,
        visualCue: "면 가운데 딱딱한 심이 거의 없어지면 됩니다.",
        commonMistake: "면을 너무 오래 삶으면 소스에 볶을 때 퍼집니다.",
        rescueTip: "조금 덜 익었으면 소스와 1분 더 볶으면 됩니다.",
      },
      {
        order: 2,
        title: "면 건지기",
        action: "삶은 면은 체에 건지고 면 삶은 물 3큰술은 따로 남겨 둡니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "면이 물에 잠겨 있지 않고 김만 살짝 나면 됩니다.",
        commonMistake: "면수를 모두 버리면 소스가 뻑뻑할 수 있습니다.",
        rescueTip: "면수를 버렸다면 물 2큰술로 대신하세요.",
      },
      {
        order: 3,
        title: "토마토소스 데우기",
        action: "팬에 토마토소스 1/2컵과 면수 2큰술을 넣고 약불에서 2분 데웁니다.",
        heat: "약불",
        minutes: 2,
        visualCue: "소스가 보글보글하고 너무 되직하지 않으면 됩니다.",
        commonMistake: "센 불로 끓이면 소스가 튑니다.",
        rescueTip: "소스가 튀면 불을 줄이고 뚜껑을 반만 덮으세요.",
      },
      {
        order: 4,
        title: "면 섞고 완성",
        action: "삶은 면을 넣고 1분 섞은 뒤 치즈가 있으면 올립니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "면 전체에 빨간 소스가 고르게 묻으면 완성입니다.",
        commonMistake: "면을 오래 볶으면 소스가 말라붙습니다.",
        rescueTip: "뻑뻑하면 면수나 물 1큰술을 더 넣으세요.",
      },
    ];
  }

  if (title === "참치파스타") {
    return [
      {
        order: 1,
        title: "파스타면 삶기",
        action: "끓는 물에 파스타면 1인분을 넣고 포장 시간대로 삶습니다.",
        heat: "중불",
        minutes: 9,
        visualCue: "면이 부드럽지만 쉽게 끊어지지 않으면 됩니다.",
        commonMistake: "면을 너무 오래 삶으면 볶을 때 퍼집니다.",
        rescueTip: "조금 단단하면 팬에서 1분 더 볶아 익히세요.",
      },
      {
        order: 2,
        title: "참치 준비",
        action: "참치캔 1/2캔은 기름을 절반만 빼고 포크로 가볍게 풀어 둡니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "참치가 큰 덩어리 없이 풀리면 됩니다.",
        commonMistake: "기름을 전부 빼면 파스타가 퍽퍽합니다.",
        rescueTip: "퍽퍽하면 올리브유 1작은술을 더 넣으세요.",
      },
      {
        order: 3,
        title: "참치 볶기",
        action: "팬에 올리브유 1큰술과 참치를 넣고 약불에서 1분 데웁니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "참치가 따뜻해지고 고소한 향이 나면 됩니다.",
        commonMistake: "센 불로 볶으면 참치가 튑니다.",
        rescueTip: "튀면 불을 끄고 30초 기다린 뒤 다시 약불로 켜세요.",
      },
      {
        order: 4,
        title: "면과 간장 섞기",
        action: "삶은 면과 간장 1큰술을 넣고 1분 섞은 뒤 후추가 있으면 뿌립니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "면에 참치가 고르게 붙고 짜지 않으면 완성입니다.",
        commonMistake: "간장을 많이 넣으면 참치 짠맛과 겹칩니다.",
        rescueTip: "짜면 면이나 물 1큰술을 더 넣어 조절하세요.",
      },
    ];
  }

  if (title === "우동") {
    return [
      {
        order: 1,
        title: "국물 끓이기",
        action: "냄비에 물 2.5컵과 쯔유 2큰술을 넣고 중불에서 끓입니다.",
        heat: "중불",
        minutes: 4,
        visualCue: "국물이 끓고 색이 연한 갈색이면 됩니다.",
        commonMistake: "쯔유를 많이 넣으면 면을 넣은 뒤 짭니다.",
        rescueTip: "짜면 물 1/2컵을 넣고 다시 끓이세요.",
      },
      {
        order: 2,
        title: "우동면 넣기",
        action: "우동면 1봉을 넣고 젓가락으로 살살 풀며 2분 끓입니다.",
        heat: "중불",
        minutes: 2,
        visualCue: "면 가닥이 풀리고 통통해지면 됩니다.",
        commonMistake: "면을 세게 누르면 끊어집니다.",
        rescueTip: "잘 안 풀리면 1분 더 기다린 뒤 살살 풀어 주세요.",
      },
      {
        order: 3,
        title: "어묵 선택 넣기",
        action: "어묵이 있으면 한입 크기로 잘라 넣고 2분 더 끓입니다.",
        heat: "중불",
        minutes: 2,
        visualCue: "어묵이 따뜻해지고 국물 위로 살짝 떠오르면 됩니다.",
        commonMistake: "어묵을 너무 오래 끓이면 국물이 짜질 수 있습니다.",
        rescueTip: "어묵이 없으면 이 단계는 건너뛰세요.",
      },
      {
        order: 4,
        title: "대파 올리고 완성",
        action: "국물을 맛보고 싱거우면 쯔유 1작은술만 더 넣고 대파가 있으면 올립니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "면이 통통하고 국물이 짜지 않으면 완성입니다.",
        commonMistake: "마지막 간을 크게 하면 금방 짭니다.",
        rescueTip: "짜면 물 1/2컵을 넣고 1분 더 데우세요.",
      },
    ];
  }

  if (title === "참치라면") {
    return [
      {
        order: 1,
        title: "참치 준비",
        action: "참치캔 1/2캔은 기름을 절반만 빼고 포크로 큰 덩어리를 풀어 둡니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "참치가 숟가락으로 떠먹기 좋은 크기로 풀리면 됩니다.",
        commonMistake: "기름을 전부 넣으면 국물이 느끼할 수 있습니다.",
        rescueTip: "기름을 많이 넣었다면 마지막에 후추나 대파를 조금 올리세요.",
      },
      {
        order: 2,
        title: "국물 끓이기",
        action: "냄비에 물 2.5컵과 라면스프를 넣고 중불에서 끓입니다.",
        heat: "중불",
        minutes: 4,
        visualCue: "국물이 끓고 스프 덩어리가 보이지 않으면 됩니다.",
        commonMistake: "스프를 전부 넣으면 짤 수 있습니다.",
        rescueTip: "짠맛이 걱정되면 스프는 2/3봉만 먼저 넣으세요.",
      },
      {
        order: 3,
        title: "면 끓이기",
        action: "라면 면을 넣고 젓가락으로 한 번 풀어 포장 시간대로 끓입니다.",
        heat: "중불",
        minutes: 4,
        visualCue: "면이 풀리고 가운데 딱딱한 심이 없어지면 됩니다.",
        commonMistake: "면을 계속 누르면 잘게 부서집니다.",
        rescueTip: "처음 1분은 그대로 두고 부드러워진 뒤 살살 풀어 주세요.",
      },
      {
        order: 4,
        title: "참치 올려 완성",
        action: "불을 약하게 줄이고 참치를 넣어 30초만 데운 뒤 대파가 있으면 올립니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "참치가 따뜻하고 면이 부드러우면 완성입니다.",
        commonMistake: "참치를 오래 끓이면 국물이 탁하고 비릴 수 있습니다.",
        rescueTip: "비린 향이 나면 대파나 후추를 조금 올리세요.",
      },
    ];
  }

  if (title === "냉국수") {
    return [
      {
        order: 1,
        title: "소면 삶기",
        action: "냄비에 물을 넉넉히 끓이고 소면 1인분을 포장 시간대로 삶습니다.",
        heat: "중불",
        minutes: 4,
        visualCue: "면 가운데 하얀 심이 없어지면 됩니다.",
        commonMistake: "면을 오래 삶으면 찬물에 헹군 뒤 쉽게 끊어집니다.",
        rescueTip: "조금 단단하면 30초만 더 삶으세요.",
      },
      {
        order: 2,
        title: "찬물에 헹구기",
        action: "삶은 면을 체에 밭쳐 찬물로 2번 헹구고 손으로 가볍게 비벼 전분기를 빼세요.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "면이 차갑고 손에 끈적임이 적으면 됩니다.",
        commonMistake: "헹구지 않으면 면이 서로 달라붙습니다.",
        rescueTip: "붙은 면은 찬물에 한 번 더 흔들어 풀어 주세요.",
      },
      {
        order: 3,
        title: "육수 붓기",
        action: "그릇에 면을 담고 차가운 냉면육수 1봉을 붓습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "면이 육수에 반쯤 잠기면 됩니다.",
        commonMistake: "육수를 따뜻한 상태로 부으면 냉국수 맛이 밍밍합니다.",
        rescueTip: "육수가 덜 차가우면 얼음 3~4개를 넣으세요.",
      },
      {
        order: 4,
        title: "고명 올리기",
        action: "오이나 참깨가 있으면 올리고 한입 맛본 뒤 싱거우면 간장 1작은술만 더합니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "면이 차갑고 육수가 짜지 않으면 완성입니다.",
        commonMistake: "마지막 간장을 많이 넣으면 바로 짜집니다.",
        rescueTip: "짜면 차가운 물이나 얼음을 조금 더 넣으세요.",
      },
    ];
  }

  if (title === "비빔우동") {
    return [
      {
        order: 1,
        title: "우동면 풀기",
        action: "우동면은 뜨거운 물에 1분 담갔다가 젓가락으로 살살 풀고 찬물에 헹굽니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "면 가닥이 서로 떨어지고 차가워지면 됩니다.",
        commonMistake: "딱딱한 면을 바로 비비면 끊어집니다.",
        rescueTip: "면이 안 풀리면 뜨거운 물에 30초 더 담그세요.",
      },
      {
        order: 2,
        title: "비빔양념 섞기",
        action: "그릇에 고추장 1큰술, 간장 1작은술, 설탕 1작은술, 참기름 1큰술을 섞습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "양념 색이 고르게 섞이고 설탕 알갱이가 거의 안 보이면 됩니다.",
        commonMistake: "양념을 면 위에 따로 넣으면 한쪽만 맵습니다.",
        rescueTip: "매운맛이 걱정되면 고추장은 1/2큰술만 먼저 넣으세요.",
      },
      {
        order: 3,
        title: "면 물기 빼기",
        action: "헹군 우동면은 체에 30초 두어 물기를 빼고 양념 그릇에 넣습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "그릇 바닥에 물이 많이 고이지 않으면 됩니다.",
        commonMistake: "물기가 많으면 양념이 묽어집니다.",
        rescueTip: "물이 많으면 키친타월이나 체에 잠깐 더 두세요.",
      },
      {
        order: 4,
        title: "비비고 완성",
        action: "젓가락으로 아래에서 위로 들어 올리듯 비비고 김가루가 있으면 올립니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "면 전체에 빨간 양념이 고르게 묻으면 완성입니다.",
        commonMistake: "세게 누르며 비비면 면이 끊어집니다.",
        rescueTip: "짜거나 매우면 우동면이나 오이를 조금 더 넣으세요.",
      },
    ];
  }

  if (title === "간장라면") {
    return [
      {
        order: 1,
        title: "면 삶기",
        action: "끓는 물에 라면 면만 넣고 포장 시간보다 30초 짧게 삶습니다.",
        heat: "중불",
        minutes: 4,
        visualCue: "면이 풀리고 가운데 딱딱한 심이 거의 없으면 됩니다.",
        commonMistake: "스프를 넣으면 간장라면이 너무 짜집니다.",
        rescueTip: "스프는 넣지 말고 따로 보관하세요.",
      },
      {
        order: 2,
        title: "물기 빼기",
        action: "면을 체에 건지고 면수 2큰술만 남겨 둡니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "면이 물에 잠겨 있지 않고 촉촉한 정도면 됩니다.",
        commonMistake: "면수를 전부 버리면 양념이 뻑뻑합니다.",
        rescueTip: "면수를 버렸다면 물 1큰술로 대신하세요.",
      },
      {
        order: 3,
        title: "간장양념 섞기",
        action: "그릇에 간장 1큰술, 설탕 1/2작은술, 참기름 1작은술, 면수 1큰술을 섞습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "설탕 알갱이가 거의 보이지 않으면 됩니다.",
        commonMistake: "간장을 많이 넣으면 금방 짜집니다.",
        rescueTip: "싱거우면 마지막에 간장 1작은술만 추가하세요.",
      },
      {
        order: 4,
        title: "면 비비기",
        action: "삶은 면을 양념에 넣고 젓가락으로 비빈 뒤 계란이 있으면 올립니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "면에 갈색 양념이 고르게 묻고 윤기가 나면 완성입니다.",
        commonMistake: "뜨거운 냄비에서 계속 비비면 면이 붇습니다.",
        rescueTip: "뻑뻑하면 면수나 물 1큰술을 더 넣으세요.",
      },
    ];
  }

  if (title === "전자레인지 감자버터") {
    return [
      {
        order: 1,
        title: "감자 씻고 자르기",
        action: "감자 1개를 깨끗이 씻고 큰 감자는 반으로 잘라 전자레인지용 그릇에 담습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "감자 겉에 흙이 없고 큰 조각이 한입 크기에 가까우면 됩니다.",
        commonMistake: "큰 감자를 통째로 돌리면 가운데가 늦게 익습니다.",
        rescueTip: "너무 크면 숟가락 크기로 한 번 더 자르세요.",
      },
      {
        order: 2,
        title: "물 넣고 덮기",
        action: "물 1큰술을 넣고 랩이나 뚜껑은 한쪽을 조금 열어 덮습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "김이 빠질 틈이 한쪽에 보이면 됩니다.",
        commonMistake: "완전히 밀봉하면 김 때문에 위험할 수 있습니다.",
        rescueTip: "랩을 쓴다면 이쑤시개로 구멍 2개를 내세요.",
      },
      {
        order: 3,
        title: "전자레인지 돌리기",
        action: "전자레인지에 3분 돌리고 젓가락으로 찔러 단단하면 1분 더 돌립니다.",
        heat: "불 없음",
        minutes: 4,
        visualCue: "젓가락이 감자 가운데까지 쉽게 들어가면 됩니다.",
        commonMistake: "한 번에 오래 돌리면 가장자리가 마릅니다.",
        rescueTip: "단단하면 1분씩만 추가하세요.",
      },
      {
        order: 4,
        title: "버터 섞기",
        action: "뜨거울 때 버터 1작은술과 소금 한 꼬집을 넣고 숟가락으로 섞습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "버터가 녹아 감자 표면에 윤기가 나면 완성입니다.",
        commonMistake: "뜨거운 그릇을 맨손으로 잡으면 위험합니다.",
        rescueTip: "마른 행주나 장갑으로 꺼내고 1분 식힌 뒤 섞으세요.",
      },
    ];
  }

  if (title === "전자레인지 햄계란밥") {
    return [
      {
        order: 1,
        title: "계란 풀기",
        action: "전자레인지용 그릇에 계란 2개를 깨고 노른자와 흰자가 섞이도록 완전히 풀어 줍니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "노른자 덩어리가 보이지 않고 노란색이 고르면 됩니다.",
        commonMistake: "계란을 풀지 않고 돌리면 터질 수 있습니다.",
        rescueTip: "노른자는 반드시 젓가락으로 터뜨리고 섞으세요.",
      },
      {
        order: 2,
        title: "밥과 햄 섞기",
        action: "밥 1공기와 잘게 자른 햄을 넣고 계란물과 골고루 섞습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "밥알 사이에 계란물이 고르게 묻으면 됩니다.",
        commonMistake: "차가운 밥 덩어리를 그대로 넣으면 가운데가 덜 데워집니다.",
        rescueTip: "뭉친 밥은 숟가락으로 먼저 풀어 주세요.",
      },
      {
        order: 3,
        title: "덮고 돌리기",
        action: "뚜껑이나 랩을 한쪽 열어 덮고 전자레인지에 1분 30초 돌린 뒤 한 번 섞습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "가장자리 계란이 익기 시작하면 한 번 섞을 때입니다.",
        commonMistake: "중간에 섞지 않으면 가장자리만 딱딱해집니다.",
        rescueTip: "아직 묽으면 30초씩 추가로 돌리세요.",
      },
      {
        order: 4,
        title: "간장참기름 마무리",
        action: "계란이 익으면 간장 1큰술과 참기름 1작은술을 넣고 비벼 1분 식힙니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "계란물이 흐르지 않고 밥이 촉촉하면 완성입니다.",
        commonMistake: "뜨거운 상태에서 바로 먹으면 입을 데일 수 있습니다.",
        rescueTip: "싱거우면 간장은 1작은술씩만 추가하세요.",
      },
    ];
  }

  if (title === "전자레인지 두부찜") {
    return [
      {
        order: 1,
        title: "두부 물 빼기",
        action: "두부 1/2모를 전자레인지용 그릇에 담고 포장 물은 따라낸 뒤 숟가락으로 먹기 좋게 4등분합니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "그릇 바닥에 물이 조금만 남고 두부가 숟가락으로 떠지는 크기면 됩니다.",
        commonMistake: "포장 물을 그대로 두면 간장 양념이 묽고 싱거워집니다.",
        rescueTip: "물이 많으면 숟가락으로 눌러 따라내고 간장은 1작은술만 추가하세요.",
      },
      {
        order: 2,
        title: "물 넣고 덮기",
        action: "물 1큰술을 그릇 가장자리에 넣고 랩이나 뚜껑은 한쪽을 조금 열어 덮습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "김이 빠질 틈이 한쪽에 보이면 안전하게 돌릴 수 있습니다.",
        commonMistake: "랩을 완전히 밀봉하면 김 때문에 위험할 수 있습니다.",
        rescueTip: "랩을 쓴다면 젓가락으로 구멍 2개를 내세요.",
      },
      {
        order: 3,
        title: "전자레인지 돌리기",
        action: "전자레인지에 1분 30초 돌리고 가운데가 차가우면 30초씩만 추가합니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "두부 가운데에서 김이 올라오고 숟가락으로 눌렀을 때 따뜻하면 됩니다.",
        commonMistake: "처음부터 오래 돌리면 두부 가장자리가 마르고 뜨거운 물이 생깁니다.",
        rescueTip: "가운데가 차가우면 한 번 섞지 말고 30초만 더 돌리세요.",
      },
      {
        order: 4,
        title: "간장참기름 올리기",
        action: "뜨거운 그릇을 장갑으로 꺼내 1분 식힌 뒤 간장 1큰술, 참기름 1작은술, 대파나 참깨를 올립니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "두부 위에 양념이 얇게 고이고 고소한 향이 나면 완성입니다.",
        commonMistake: "뜨거운 그릇을 맨손으로 잡으면 데일 수 있습니다.",
        rescueTip: "짜면 양념을 덜어내고 밥 위에 올려 두부덮밥처럼 먹으세요.",
      },
    ];
  }

  if (title === "전자레인지 콘치즈") {
    return [
      {
        order: 1,
        title: "옥수수 물기 빼기",
        action: "통조림 옥수수 1/2컵을 체에 받치거나 숟가락으로 눌러 물기를 빼고 전자레인지용 그릇에 담습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "그릇 바닥에 옥수수 물이 고이지 않으면 됩니다.",
        commonMistake: "물기를 빼지 않으면 치즈가 녹아도 아래가 흥건합니다.",
        rescueTip: "이미 물이 많으면 키친타월로 가장자리 물만 살짝 찍어내세요.",
      },
      {
        order: 2,
        title: "마요네즈 섞기",
        action: "옥수수에 마요네즈 1큰술과 설탕 1/2작은술을 넣고 숟가락으로 골고루 섞습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "옥수수 알에 하얀 마요네즈가 얇게 묻으면 됩니다.",
        commonMistake: "마요네즈를 많이 넣으면 느끼하고 질척합니다.",
        rescueTip: "느끼하면 옥수수를 조금 더 넣거나 설탕은 빼세요.",
      },
      {
        order: 3,
        title: "치즈 덮고 돌리기",
        action: "피자치즈 1/2컵을 위에 고르게 덮고 랩 없이 전자레인지에 1분 돌립니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "치즈 가장자리가 녹고 가운데만 조금 덜 녹은 정도면 확인할 때입니다.",
        commonMistake: "랩을 덮으면 물방울이 떨어져 치즈가 질척해집니다.",
        rescueTip: "치즈가 덜 녹았으면 20초씩만 추가로 돌리세요.",
      },
      {
        order: 4,
        title: "뜨거움 식히기",
        action: "그릇을 장갑으로 꺼내 1분 식힌 뒤 치즈가 고르게 녹았는지 보고 후추를 조금 뿌립니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "치즈가 늘어나고 옥수수 위를 덮으면 완성입니다.",
        commonMistake: "꺼내자마자 먹으면 치즈가 매우 뜨거워 입을 데일 수 있습니다.",
        rescueTip: "아래가 묽으면 숟가락으로 가장자리부터 섞고 1분 더 식히세요.",
      },
    ];
  }

  if (title === "오이참치무침") {
    return [
      {
        order: 1,
        title: "오이 썰기",
        action: "오이 1개를 씻고 양끝을 자른 뒤 얇은 반달 모양으로 썹니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "오이 조각이 숟가락에 3~4개 올라가는 두께면 먹기 쉽습니다.",
        commonMistake: "너무 두껍게 썰면 양념이 겉에만 묻습니다.",
        rescueTip: "두꺼운 조각은 그릇 안에서 가위로 한 번 더 자르세요.",
      },
      {
        order: 2,
        title: "참치 기름 빼기",
        action: "참치캔 1/2캔은 뚜껑이나 숟가락으로 눌러 기름을 대부분 빼고 오이 위에 올립니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "그릇 바닥에 참치 기름이 많이 고이지 않으면 됩니다.",
        commonMistake: "기름을 그대로 넣으면 무침이 미끄럽고 느끼합니다.",
        rescueTip: "기름이 많으면 키친타월로 가장자리만 살짝 찍어내세요.",
      },
      {
        order: 3,
        title: "양념 넣기",
        action: "간장 1큰술, 참기름 1작은술, 식초 1작은술을 넣고 숟가락 두 개로 가볍게 섞습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "오이에 간장색이 옅게 묻고 참치가 너무 부서지지 않으면 됩니다.",
        commonMistake: "세게 누르면 참치가 으깨져 물기가 많아집니다.",
        rescueTip: "짜면 오이를 조금 더 넣거나 밥 위에 올려 덮밥처럼 먹으세요.",
      },
      {
        order: 4,
        title: "맛 보고 마무리",
        action: "한입 맛본 뒤 싱거울 때만 간장 1작은술을 더하고 참깨를 뿌립니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "오이는 아삭하고 참치가 골고루 보이면 완성입니다.",
        commonMistake: "처음부터 간장을 많이 넣으면 되돌리기 어렵습니다.",
        rescueTip: "싱겁게 느껴져도 밥과 먹을 메뉴라 간장은 조금씩만 더하세요.",
      },
    ];
  }

  if (title === "양배추볶음") {
    return [
      {
        order: 1,
        title: "양배추 자르기",
        action: "양배추 2줌을 손가락 두 마디 크기로 썰고 두꺼운 줄기는 얇게 한 번 더 자릅니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "큰 줄기와 얇은 잎이 비슷한 크기로 보이면 고르게 익습니다.",
        commonMistake: "두꺼운 줄기를 크게 두면 잎은 익고 줄기는 딱딱합니다.",
        rescueTip: "큰 조각은 팬에 넣기 전 가위로 더 작게 자르세요.",
      },
      {
        order: 2,
        title: "기름 두르고 시작",
        action: "팬에 식용유 1큰술을 두르고 중불에서 30초 데운 뒤 양배추와 물 1큰술을 넣습니다.",
        heat: "중불",
        minutes: 1,
        visualCue: "팬에서 약한 치익 소리가 나고 양배추가 바로 타지 않으면 됩니다.",
        commonMistake: "팬을 오래 비워 두면 양배추 가장자리가 빨리 탑니다.",
        rescueTip: "타는 냄새가 나면 바로 물 1큰술을 더 넣고 불을 낮추세요.",
      },
      {
        order: 3,
        title: "숨 죽이기",
        action: "양배추를 중불에서 3분 볶아 부피가 절반 정도로 줄면 간장 1큰술을 팬 가장자리로 넣습니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "양배추 가장자리가 투명해지고 처음보다 부드럽게 휘면 됩니다.",
        commonMistake: "간장을 처음부터 넣으면 양념이 타고 짜집니다.",
        rescueTip: "간장이 탔으면 물 1큰술을 넣고 탄 부분을 피해 섞으세요.",
      },
      {
        order: 4,
        title: "간 보고 담기",
        action: "불을 끄고 한입 맛본 뒤 싱거우면 간장 1작은술만 더 넣고 참깨를 뿌립니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "양배추가 부드럽지만 물컹하지 않고 윤기가 있으면 완성입니다.",
        commonMistake: "오래 볶으면 물이 많이 나와 흐물거립니다.",
        rescueTip: "물이 많으면 센불이 아니라 중불에서 30초만 더 볶아 날리세요.",
      },
    ];
  }

  if (title === "양배추참치덮밥") {
    return [
      {
        order: 1,
        title: "밥 담고 재료 준비",
        action: "밥 1공기를 그릇에 담고 양배추 2줌은 얇게 썰며 참치캔 1/2캔은 기름을 1큰술만 남깁니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "밥은 그릇에 준비되고 양배추는 젓가락으로 집기 쉬운 크기면 됩니다.",
        commonMistake: "밥을 나중에 준비하면 볶은 토핑이 식습니다.",
        rescueTip: "밥이 차가우면 전자레인지에 1분 데워 두세요.",
      },
      {
        order: 2,
        title: "양배추 볶기",
        action: "팬에 식용유 1작은술을 두르고 양배추를 중불에서 2분 볶아 숨을 죽입니다.",
        heat: "중불",
        minutes: 2,
        visualCue: "양배추 부피가 줄고 가장자리가 투명해지면 참치를 넣을 때입니다.",
        commonMistake: "센불에서 시작하면 양배추 끝만 타고 속은 딱딱합니다.",
        rescueTip: "갈색으로 타면 물 1큰술을 넣고 불을 낮추세요.",
      },
      {
        order: 3,
        title: "참치와 간장 넣기",
        action: "참치와 간장 1큰술을 넣고 약불에서 1분만 섞어 참치가 따뜻해지게 합니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "참치가 양배추 사이에 골고루 보이고 팬 바닥이 마르지 않으면 됩니다.",
        commonMistake: "참치를 오래 볶으면 퍽퍽하고 짠맛이 강해집니다.",
        rescueTip: "뻑뻑하면 물 1큰술을 넣고 바로 불을 끄세요.",
      },
      {
        order: 4,
        title: "밥 위에 올리기",
        action: "볶은 토핑을 밥 위에 올리고 참기름은 선택으로 1작은술만 둘러 비벼 먹습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "밥과 토핑이 반반 보이고 참치 향이 나면 완성입니다.",
        commonMistake: "팬에서 밥까지 넣고 오래 볶으면 덮밥이 아니라 질척한 볶음밥이 됩니다.",
        rescueTip: "짜면 밥을 조금 더 넣고 토핑은 가장자리부터 섞어 먹으세요.",
      },
    ];
  }

  if (title === "전자레인지 참치치즈밥") {
    return [
      {
        order: 1,
        title: "밥과 참치 섞기",
        action: "전자레인지용 그릇에 밥 1공기와 기름 뺀 참치 1/2캔, 간장 1작은술을 넣고 밥 덩어리를 풉니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "밥알 사이에 참치가 고르게 보이고 큰 덩어리가 없으면 됩니다.",
        commonMistake: "밥 덩어리를 그대로 돌리면 가운데가 차갑습니다.",
        rescueTip: "찬밥이면 먼저 30초 데운 뒤 섞으세요.",
      },
      {
        order: 2,
        title: "치즈 올리기",
        action: "피자치즈 1/2컵을 밥 위에 고르게 덮고 가장자리 1cm는 비워 둡니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "치즈가 밥 위에 얇게 깔리고 한쪽에만 뭉치지 않으면 됩니다.",
        commonMistake: "치즈를 한쪽에 몰아 올리면 그 부분만 짜고 늦게 식습니다.",
        rescueTip: "숟가락으로 치즈를 얇게 펴 주세요.",
      },
      {
        order: 3,
        title: "한쪽 열어 돌리기",
        action: "뚜껑이나 랩을 한쪽 열어 덮고 전자레인지에 1분 돌린 뒤 치즈가 덜 녹으면 20초씩 추가합니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "치즈가 녹아 밥 위를 덮고 그릇 가장자리에 김이 보이면 됩니다.",
        commonMistake: "완전히 밀봉하면 김이 빠지지 않아 위험할 수 있습니다.",
        rescueTip: "랩을 쓴다면 구멍 2개를 내고 20초 단위로만 추가하세요.",
      },
      {
        order: 4,
        title: "식히고 비비기",
        action: "장갑으로 꺼내 1분 식힌 뒤 참기름 1작은술을 선택으로 넣고 한입 맛봅니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "치즈가 녹았고 밥 가운데까지 따뜻하면 완성입니다.",
        commonMistake: "꺼내자마자 먹으면 치즈와 그릇이 매우 뜨겁습니다.",
        rescueTip: "짜면 밥을 조금 더 넣고 마요네즈는 추가하지 마세요.",
      },
    ];
  }

  if (title === "게맛살계란볶음") {
    return [
      {
        order: 1,
        title: "계란 풀기",
        action: "그릇에 계란 2개와 소금 한 꼬집을 넣고 노른자와 흰자가 섞일 때까지 풉니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "노른자 덩어리가 거의 보이지 않고 노란색이 고르면 됩니다.",
        commonMistake: "계란을 대충 풀면 팬에서 흰자 덩어리가 따로 익습니다.",
        rescueTip: "덩어리가 보이면 젓가락으로 20초만 더 저어 주세요.",
      },
      {
        order: 2,
        title: "게맛살 찢기",
        action: "게맛살 2줄을 손으로 길게 찢거나 가위로 한입 크기로 자릅니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "계란과 섞었을 때 숟가락에 같이 올라갈 크기면 됩니다.",
        commonMistake: "너무 크게 넣으면 계란과 따로 놀고 한입이 짭니다.",
        rescueTip: "큰 조각은 팬에 넣기 전 가위로 한 번 더 자르세요.",
      },
      {
        order: 3,
        title: "계란 먼저 익히기",
        action: "팬에 식용유 1큰술을 두르고 약불에서 계란물을 넣어 크게 저어 70%만 익힙니다.",
        heat: "약불",
        minutes: 2,
        visualCue: "계란이 촉촉한 노란 덩어리로 잡히고 흐르는 부분이 조금 남으면 됩니다.",
        commonMistake: "센불에서 익히면 계란이 딱딱하고 갈색이 됩니다.",
        rescueTip: "계란이 빨리 마르면 불을 끄고 남은 열로 섞으세요.",
      },
      {
        order: 4,
        title: "게맛살 섞기",
        action: "게맛살을 넣고 1분만 섞은 뒤 간이 약하면 간장 1작은술을 팬 가장자리로 둘러 마무리합니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "게맛살이 따뜻해지고 계란이 촉촉하면 완성입니다.",
        commonMistake: "오래 볶으면 게맛살이 마르고 계란이 퍽퍽해집니다.",
        rescueTip: "마르면 물 1큰술을 넣고 바로 불을 끄세요.",
      },
    ];
  }

  if (title === "두부계란부침") {
    return [
      {
        order: 1,
        title: "두부 물기 닦기",
        action: "두부 1/2모를 손가락 두께로 자르고 키친타월로 앞뒤 물기를 눌러 닦습니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "두부 표면에 물방울이 거의 없으면 팬에서 덜 튑니다.",
        commonMistake: "물기 많은 두부는 기름이 튀고 계란물이 잘 붙지 않습니다.",
        rescueTip: "키친타월이 없으면 체에 2분 받쳐 물을 빼세요.",
      },
      {
        order: 2,
        title: "계란물 입히기",
        action: "계란 1개와 소금 한 꼬집을 풀고 두부를 하나씩 넣어 앞뒤에 계란물을 묻힙니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "두부 표면이 노란 계란물로 얇게 덮이면 됩니다.",
        commonMistake: "계란물에 오래 담가두면 두부가 부서질 수 있습니다.",
        rescueTip: "부서진 두부는 작은 조각전처럼 같이 부치면 됩니다.",
      },
      {
        order: 3,
        title: "앞면 부치기",
        action: "팬에 식용유 1큰술을 두르고 중약불에서 두부를 올려 앞면을 3분 부칩니다.",
        heat: "중약불",
        minutes: 3,
        visualCue: "아랫면 가장자리가 노릇하고 뒤집개가 잘 들어가면 뒤집을 때입니다.",
        commonMistake: "너무 빨리 뒤집으면 계란옷이 벗겨집니다.",
        rescueTip: "붙으면 30초 더 기다렸다가 뒤집개를 깊게 넣으세요.",
      },
      {
        order: 4,
        title: "뒤집어 마무리",
        action: "두부를 조심히 뒤집고 약불에서 2분 더 익힌 뒤 접시에 옮기고 간장은 따로 찍어 먹습니다.",
        heat: "약불",
        minutes: 2,
        visualCue: "양면이 연한 노란색이고 가운데가 따뜻하면 완성입니다.",
        commonMistake: "간장을 팬에 많이 넣으면 계란옷이 짜고 탈 수 있습니다.",
        rescueTip: "싱거우면 접시에 담은 뒤 간장을 조금 찍어 먹으세요.",
      },
    ];
  }

  if (title === "스팸계란볶음밥") {
    return [
      {
        order: 1,
        title: "밥 풀고 스팸 자르기",
        action: "밥 1공기는 숟가락으로 풀고 스팸 1/4캔은 작은 주사위 모양으로 자릅니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "밥 덩어리가 줄고 스팸이 밥알보다 조금 큰 크기면 됩니다.",
        commonMistake: "스팸을 크게 자르면 한입이 너무 짭니다.",
        rescueTip: "크게 잘랐다면 팬에 넣기 전 가위로 더 작게 자르세요.",
      },
      {
        order: 2,
        title: "스팸과 계란 익히기",
        action: "팬에 식용유 1큰술을 두르고 중불에서 스팸을 1분 볶은 뒤 계란 1개를 넣어 크게 저어 익힙니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "스팸 가장자리가 연한 갈색이고 계란이 노란 덩어리로 잡히면 됩니다.",
        commonMistake: "계란을 오래 익히면 밥을 넣기 전부터 퍽퍽해집니다.",
        rescueTip: "계란이 빨리 익으면 바로 밥을 넣고 불을 약하게 낮추세요.",
      },
      {
        order: 3,
        title: "밥 넣고 풀기",
        action: "밥을 넣고 뒤집개로 누르지 말고 가르듯 풀어 2분 볶습니다.",
        heat: "중불",
        minutes: 2,
        visualCue: "밥알 사이에 스팸과 계란이 고르게 보이면 됩니다.",
        commonMistake: "밥을 세게 누르면 떡처럼 뭉칩니다.",
        rescueTip: "뭉치면 불을 약하게 하고 숟가락 두 개로 갈라 주세요.",
      },
      {
        order: 4,
        title: "간장 향만 내기",
        action: "간장 1작은술을 팬 가장자리로 넣고 20초만 섞은 뒤 김가루가 있으면 올립니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "밥에 윤기가 나고 간장 향이 살짝 올라오면 완성입니다.",
        commonMistake: "스팸이 짠데 간장을 많이 넣으면 전체가 짭니다.",
        rescueTip: "짜면 밥을 조금 더 넣고 김가루는 생략하세요.",
      },
    ];
  }

  if (title === "누룽지 두부 계란죽") {
    return [
      {
        order: 1,
        title: "누룽지 끓이기",
        action: "냄비에 누룽지 1컵과 물 3컵을 넣고 중불에서 5분 끓입니다.",
        heat: "중불",
        minutes: 5,
        visualCue: "누룽지가 물을 머금어 부드러워지고 국물이 살짝 걸쭉해지면 됩니다.",
        commonMistake: "물 없이 센불로 끓이면 냄비 바닥에 눌어붙습니다.",
        rescueTip: "바닥이 붙기 시작하면 물 1/2컵을 넣고 불을 낮추세요.",
      },
      {
        order: 2,
        title: "두부 넣기",
        action: "두부 1/2모를 숟가락 크기로 잘라 넣고 중약불에서 2분 더 끓입니다.",
        heat: "중약불",
        minutes: 2,
        visualCue: "두부가 국물에 잠기고 가운데까지 따뜻해지면 됩니다.",
        commonMistake: "두부를 세게 저으면 잘게 부서집니다.",
        rescueTip: "부서져도 죽에는 어울리니 더 젓지 말고 그대로 끓이세요.",
      },
      {
        order: 3,
        title: "계란 풀어 넣기",
        action: "계란 1개를 그릇에 풀고 냄비 가장자리로 천천히 부은 뒤 20초 기다렸다가 한 번만 젓습니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "계란이 노란 실처럼 익고 국물이 너무 탁하지 않으면 됩니다.",
        commonMistake: "계란을 넣자마자 계속 저으면 죽이 지저분하게 뭉칩니다.",
        rescueTip: "덩어리가 생겨도 1분 더 끓이면 부드러워집니다.",
      },
      {
        order: 4,
        title: "소금으로 간 맞추기",
        action: "불을 끄고 소금 두 꼬집을 넣은 뒤 한입 맛보고 싱거우면 한 꼬집만 더 넣습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "숟가락으로 떴을 때 누룽지, 두부, 계란이 함께 올라오면 완성입니다.",
        commonMistake: "진한 간장을 많이 넣으면 죽 색이 탁하고 짜집니다.",
        rescueTip: "짜면 물 1/2컵을 넣고 1분 더 끓여 희석하세요.",
      },
    ];
  }

  if (title === "고구마죽") {
    return [
      {
        order: 1,
        title: "고구마 익히기",
        action: "고구마 1개를 씻어 작게 자르고 전자레인지용 그릇에 물 2큰술과 함께 넣어 4분 돌립니다.",
        heat: "불 없음",
        minutes: 5,
        visualCue: "젓가락이 고구마 가운데까지 쉽게 들어가면 됩니다.",
        commonMistake: "큰 고구마를 통째로 돌리면 가운데가 딱딱합니다.",
        rescueTip: "단단하면 1분씩만 추가로 돌리세요.",
      },
      {
        order: 2,
        title: "고구마 으깨기",
        action: "뜨거운 그릇을 장갑으로 꺼내 1분 식힌 뒤 고구마를 숟가락으로 으깹니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "큰 덩어리가 줄고 숟가락으로 펴지는 상태면 됩니다.",
        commonMistake: "뜨거운 그릇을 맨손으로 잡으면 위험합니다.",
        rescueTip: "덩어리가 남아도 죽을 끓이면서 더 풀 수 있습니다.",
      },
      {
        order: 3,
        title: "밥과 물 끓이기",
        action: "냄비에 으깬 고구마, 밥 1/2공기, 물 2컵을 넣고 중약불에서 5분 저어가며 끓입니다.",
        heat: "중약불",
        minutes: 5,
        visualCue: "밥알이 퍼지고 주황빛 죽처럼 걸쭉해지면 됩니다.",
        commonMistake: "불이 세면 바닥이 쉽게 눌어붙습니다.",
        rescueTip: "바닥이 붙으면 물 1/2컵을 넣고 긁지 말고 윗부분만 저으세요.",
      },
      {
        order: 4,
        title: "소금 한 꼬집",
        action: "불을 끄고 소금 한 꼬집을 넣어 섞은 뒤 덜 달면 설탕 1작은술만 넣습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "숟가락으로 떠도 너무 묽게 흐르지 않고 부드러우면 완성입니다.",
        commonMistake: "진한 간장을 넣으면 고구마 단맛과 색이 어색해집니다.",
        rescueTip: "너무 되직하면 물이나 우유를 2큰술씩 넣어 풀어 주세요.",
      },
    ];
  }

  if (title === "참치김치국") {
    return [
      {
        order: 1,
        title: "김치 작게 자르기",
        action: "김치 3/4컵을 가위로 숟가락에 올라가는 크기로 자르고 국물이 많으면 2큰술만 남깁니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "김치 조각이 밥알보다 조금 큰 정도면 먹기 쉽습니다.",
        commonMistake: "김치를 크게 넣으면 숟가락으로 먹기 불편합니다.",
        rescueTip: "이미 냄비에 넣었다면 가위로 냄비 안에서 조심히 자르세요.",
      },
      {
        order: 2,
        title: "김치 먼저 끓이기",
        action: "냄비에 김치와 물 2.5컵을 넣고 중불에서 5분 끓입니다.",
        heat: "중불",
        minutes: 5,
        visualCue: "김치 줄기가 조금 투명해지고 국물이 붉게 우러나면 됩니다.",
        commonMistake: "김치국물을 많이 넣으면 처음부터 너무 짤 수 있습니다.",
        rescueTip: "짜면 물 1/2컵을 더 넣고 1분 더 끓이세요.",
      },
      {
        order: 3,
        title: "참치 넣기",
        action: "참치캔 1/2캔은 기름을 1큰술만 남기고 넣어 약불에서 2분 데웁니다.",
        heat: "약불",
        minutes: 2,
        visualCue: "참치가 국물에 풀리고 가운데까지 따뜻해지면 됩니다.",
        commonMistake: "참치를 오래 끓이면 퍽퍽하고 국물이 느끼해집니다.",
        rescueTip: "느끼하면 대파를 넣거나 참치 기름을 더 넣지 마세요.",
      },
      {
        order: 4,
        title: "간 보고 마무리",
        action: "국물을 맛보고 싱거울 때만 김치국물 1큰술을 더 넣고 대파가 있으면 올립니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "김치가 부드럽고 국물이 짜지 않으면 완성입니다.",
        commonMistake: "간장을 더 넣으면 김치와 참치 간 때문에 쉽게 짜집니다.",
        rescueTip: "짜면 물을 더 넣고 밥과 함께 국밥처럼 먹으세요.",
      },
    ];
  }

  // beginner-107-112 batch-specific steps
  if (title === "숙주볶음") {
    return [
      { order: 1, title: "숙주 헹구기", action: "숙주 2줌을 체에 담아 흐르는 물에 한 번 헹구고 물기를 털어 둡니다.", heat: "불 없음", minutes: 2, visualCue: "숙주에 껍질이나 이물질이 보이지 않고 물이 뚝뚝 떨어지지 않으면 됩니다.", commonMistake: "물기를 너무 많이 남기면 볶음이 국처럼 됩니다.", rescueTip: "팬에 물이 많아지면 센불로 30초만 더 볶아 날리세요." },
      { order: 2, title: "팬 예열", action: "팬에 식용유 1큰술을 두르고 중불에서 30초 데웁니다. 마늘이 있으면 1/2작은술을 먼저 넣습니다.", heat: "중불", minutes: 1, visualCue: "기름이 팬 바닥에 얇게 퍼지고 마늘 향이 살짝 올라오면 됩니다.", commonMistake: "마늘을 센불에 오래 두면 탑니다.", rescueTip: "갈색으로 타기 시작하면 숙주를 바로 넣고 불을 낮추세요." },
      { order: 3, title: "숙주 볶기", action: "숙주를 넣고 젓가락이나 집게로 2분만 뒤적입니다. 숨이 죽기 시작하면 간장 1큰술을 팬 가장자리로 둘러 넣습니다.", heat: "중불", minutes: 2, visualCue: "숙주가 반투명해지고 아직 아삭하게 휘어지면 좋습니다.", commonMistake: "오래 볶으면 숙주가 물러지고 물이 많이 나옵니다.", rescueTip: "너무 익었으면 밥 위에 올려 덮밥처럼 먹으면 됩니다." },
      { order: 4, title: "향 내기", action: "불을 끄고 참기름 1작은술과 깨를 넣어 한 번만 섞습니다.", heat: "불 없음", minutes: 1, visualCue: "숙주에 윤기가 돌고 그릇에 담아도 물이 많이 고이지 않으면 완성입니다.", commonMistake: "참기름을 넣고 계속 가열하면 향이 날아갑니다.", rescueTip: "싱거우면 간장 1/2작은술만 더 넣고 섞으세요." },
    ];
  }

  if (title === "숙주계란볶음") {
    return [
      { order: 1, title: "계란 풀기", action: "계란 2개를 그릇에 깨고 젓가락으로 노른자와 흰자가 섞일 때까지 풀어 둡니다.", heat: "불 없음", minutes: 1, visualCue: "노란색이 고르게 보이면 됩니다.", commonMistake: "팬 앞에서 바로 깨면 껍데기가 들어가기 쉽습니다.", rescueTip: "껍데기가 들어가면 큰 조각으로 건져내세요." },
      { order: 2, title: "계란 먼저 익히기", action: "팬에 식용유 1큰술을 두르고 중약불에서 계란을 넣어 70% 정도만 익힙니다.", heat: "중약불", minutes: 2, visualCue: "계란 가장자리가 익고 가운데가 아직 촉촉하면 됩니다.", commonMistake: "완전히 익힌 뒤 숙주를 넣으면 계란이 딱딱해집니다.", rescueTip: "너무 익었으면 잘게 부숴 볶음밥처럼 섞으세요." },
      { order: 3, title: "숙주 넣기", action: "헹군 숙주 2줌을 넣고 중불에서 2분 볶다가 간장 1큰술을 팬 가장자리로 넣습니다.", heat: "중불", minutes: 2, visualCue: "숙주가 살짝 숨이 죽고 계란과 섞이면 됩니다.", commonMistake: "숙주를 오래 볶으면 물이 많이 나옵니다.", rescueTip: "물이 많으면 30초만 더 볶고 바로 불을 끄세요." },
      { order: 4, title: "마무리", action: "불을 끄고 참기름이 있으면 1작은술 넣어 한 번 섞습니다.", heat: "불 없음", minutes: 1, visualCue: "계란은 부드럽고 숙주는 아삭한 식감이 남아 있으면 완성입니다.", commonMistake: "불을 켠 채로 계속 섞으면 숙주가 흐물거립니다.", rescueTip: "짜면 밥 1/2공기와 비벼 덮밥처럼 먹으세요." },
    ];
  }

  if (title === "김가루계란밥") {
    return [
      { order: 1, title: "밥 데우기", action: "밥 1공기를 그릇에 담아 전자레인지에 1분 데우고 숟가락으로 덩어리를 풉니다.", heat: "불 없음", minutes: 1, visualCue: "밥에서 김이 살짝 나고 큰 덩어리가 없어지면 됩니다.", commonMistake: "찬밥 그대로 비비면 간장과 참기름이 고르게 섞이지 않습니다.", rescueTip: "이미 비볐어도 차가우면 30초만 더 데우세요." },
      { order: 2, title: "계란 익히기", action: "팬에 식용유를 아주 조금 두르고 약불에서 계란 1개를 프라이하거나 부드러운 스크램블로 익힙니다.", heat: "약불", minutes: 2, visualCue: "흰자가 투명하지 않고 노른자나 스크램블이 촉촉하면 됩니다.", commonMistake: "센불에서 오래 익히면 밑면이 갈색으로 딱딱해집니다.", rescueTip: "가장자리가 빨리 갈색이 되면 불을 끄고 남은 열로 익히세요." },
      { order: 3, title: "김가루 양념", action: "밥에 김가루 1줌, 간장 1큰술, 참기름 1작은술을 넣고 아래에서 위로 섞습니다.", heat: "불 없음", minutes: 1, visualCue: "밥알 사이에 김가루가 고르게 보이고 간장 색이 한쪽에 몰리지 않으면 됩니다.", commonMistake: "간장을 가운데에 붓고 그대로 두면 한입만 짭니다.", rescueTip: "짠 부분이 있으면 흰 밥 쪽과 크게 섞어주세요." },
      { order: 4, title: "계란 올리기", action: "양념한 밥 위에 익힌 계란을 올리고 깨가 있으면 조금 뿌립니다.", heat: "불 없음", minutes: 1, visualCue: "밥, 김가루, 계란이 한 숟가락에 같이 올라오면 완성입니다.", commonMistake: "김가루를 너무 많이 넣으면 밥이 퍽퍽할 수 있습니다.", rescueTip: "퍽퍽하면 참기름 1/2작은술이나 물 1작은술을 넣어 섞으세요." },
    ];
  }

  if (title === "들기름계란국수") {
    return [
      { order: 1, title: "면 삶기", action: "끓는 물에 소면 1인분을 넣고 봉지 시간대로 삶은 뒤 찬물에 헹궈 전분기를 뺍니다.", heat: "강불", minutes: 4, visualCue: "면이 하얗게 익고 손으로 만졌을 때 미끌거림이 줄면 됩니다.", commonMistake: "헹구지 않으면 면이 서로 달라붙습니다.", rescueTip: "붙었으면 찬물에 한 번 더 풀어 주세요." },
      { order: 2, title: "물기 빼기", action: "체에 면을 담고 손으로 가볍게 눌러 물기를 뺍니다.", heat: "불 없음", minutes: 1, visualCue: "그릇에 옮겼을 때 물이 흥건하게 고이지 않으면 됩니다.", commonMistake: "물기가 많으면 양념이 싱거워집니다.", rescueTip: "싱거우면 간장 1/2작은술만 더 넣으세요." },
      { order: 3, title: "계란 익히기", action: "계란 1개를 팬에서 스크램블로 익히거나 전자레인지에서 40초씩 나눠 익힙니다.", heat: "중약불", minutes: 2, visualCue: "날계란 물이 없고 노란 덩어리가 부드럽게 익으면 됩니다.", commonMistake: "전자레인지에 한 번에 오래 돌리면 터질 수 있습니다.", rescueTip: "20초씩 끊어서 더 익히면 안전합니다." },
      { order: 4, title: "비비기", action: "면에 들기름 1큰술과 간장 1큰술을 넣고 비빈 뒤 계란, 김가루, 깨를 올립니다.", heat: "불 없음", minutes: 1, visualCue: "면에 윤기가 돌고 젓가락으로 들어도 한 덩어리로 뭉치지 않으면 완성입니다.", commonMistake: "간장을 많이 넣으면 회복하기 어렵습니다.", rescueTip: "짜면 삶은 면이나 오이를 조금 더 넣어 섞으세요." },
    ];
  }

  if (title === "두부참치비빔밥") {
    return [
      { order: 1, title: "밥 데우기", action: "밥 1공기를 따뜻하게 데워 넓은 그릇에 담습니다.", heat: "불 없음", minutes: 1, visualCue: "밥에서 김이 살짝 나고 숟가락으로 잘 풀리면 됩니다.", commonMistake: "찬밥 그대로 비비면 두부와 참치가 잘 섞이지 않습니다.", rescueTip: "이미 비볐어도 전자레인지에 30초 데우면 부드러워집니다." },
      { order: 2, title: "두부 준비", action: "두부 1/2모를 키친타월로 눌러 물기를 닦고 숟가락으로 크게 으깹니다.", heat: "불 없음", minutes: 2, visualCue: "두부가 물을 줄줄 흘리지 않고 밥 위에 올릴 수 있으면 됩니다.", commonMistake: "물기를 그대로 넣으면 밥이 질척해집니다.", rescueTip: "질척하면 김가루나 밥을 조금 더 넣으세요." },
      { order: 3, title: "참치 올리기", action: "참치캔 1/2캔의 기름이나 물을 숟가락으로 덜고 밥 위에 두부와 함께 올립니다.", heat: "불 없음", minutes: 1, visualCue: "참치가 큰 덩어리 없이 밥 위에 퍼지면 됩니다.", commonMistake: "캔 국물을 다 넣으면 짜고 묽어집니다.", rescueTip: "묽으면 국물을 조금 따라내고 밥을 더 넣으세요." },
      { order: 4, title: "비비기", action: "간장 1큰술, 참기름 1작은술, 김가루를 넣고 숟가락으로 아래에서 위로 섞습니다.", heat: "불 없음", minutes: 1, visualCue: "밥, 두부, 참치가 숟가락에 같이 올라오면 완성입니다.", commonMistake: "세게 누르며 비비면 두부가 물처럼 풀립니다.", rescueTip: "너무 부드러우면 김가루를 더 넣어 식감을 살리세요." },
    ];
  }

  if (title === "양배추계란덮밥") {
    return [
      { order: 1, title: "재료 준비", action: "밥 1공기를 그릇에 담고 양배추 2줌은 얇게 썰거나 채 썬 제품을 준비합니다. 계란 2개는 그릇에 풀어 둡니다.", heat: "불 없음", minutes: 3, visualCue: "양배추가 한입 크기이고 계란이 노랗게 풀리면 됩니다.", commonMistake: "양배추가 너무 두꺼우면 익는 시간이 길어집니다.", rescueTip: "두꺼우면 가위로 한 번 더 잘라 주세요." },
      { order: 2, title: "양배추 볶기", action: "팬에 식용유 1큰술을 두르고 중불에서 양배추를 3분 볶습니다.", heat: "중불", minutes: 3, visualCue: "양배추 숨이 죽고 가장자리가 투명해지면 됩니다.", commonMistake: "센불에서 오래 두면 가장자리만 탑니다.", rescueTip: "타는 냄새가 나면 물 1큰술을 넣고 불을 낮추세요." },
      { order: 3, title: "계란 넣기", action: "풀어 둔 계란을 양배추 위에 붓고 젓가락으로 크게 저어 부드럽게 익힙니다.", heat: "중약불", minutes: 2, visualCue: "계란이 반쯤 굳고 아직 촉촉할 때 불을 줄이면 됩니다.", commonMistake: "계속 저으면 계란이 잘게 부서지고 퍽퍽해집니다.", rescueTip: "퍽퍽하면 물 1큰술을 넣고 20초만 더 섞으세요." },
      { order: 4, title: "밥 위에 올리기", action: "간장 1큰술을 팬 가장자리에 넣어 섞고 밥 위에 올립니다. 참기름이 있으면 불을 끄고 1작은술 넣습니다.", heat: "불 없음", minutes: 1, visualCue: "밥 위에 양배추와 계란이 촉촉하게 덮이면 완성입니다.", commonMistake: "간장을 계란 위에 직접 많이 부으면 짠 부분이 생깁니다.", rescueTip: "짜면 밥을 더 넣거나 양배추를 조금 더 볶아 섞으세요." },
    ];
  }

  if (title.includes("샐러드")) {
    return [
      {
        order: 1,
        title: "익힐 재료 준비",
        action: "감자나 계란처럼 익혀야 하는 재료는 냄비에 넣고 물을 잠길 만큼 부어 삶습니다. 참치샐러드는 참치 기름만 먼저 뺍니다.",
        heat: title.includes("참치") && !title.includes("감자") && !title.includes("달걀") ? "불 없음" : "중불",
        minutes: title.includes("참치") && !title.includes("감자") && !title.includes("달걀") ? 2 : 8,
        visualCue: "감자는 젓가락이 들어가고 계란 흰자는 단단하게 익으면 됩니다.",
        commonMistake: "감자나 계란을 덜 익히면 으깨지지 않고 식감이 어색합니다.",
        rescueTip: "덜 익었으면 작게 자른 뒤 전자레인지에 1분 더 데우세요.",
      },
      {
        order: 2,
        title: "물기 빼기",
        action: "익힌 재료는 물기를 빼고 2분 식힌 뒤 한입 크기로 자르거나 으깹니다.",
        heat: "불 없음",
        minutes: 3,
        visualCue: "그릇 바닥에 물이 고이지 않아야 마요네즈가 묽어지지 않습니다.",
        commonMistake: "뜨거운 상태에서 바로 마요네즈를 넣으면 기름져 보일 수 있습니다.",
        rescueTip: "물기가 많으면 키친타월로 한 번 눌러 주세요.",
      },
      {
        order: 3,
        title: "양념 섞기",
        action: "마요네즈 1큰술을 넣고 소금은 한 꼬집만 넣어 아래에서 위로 섞습니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "재료 표면에 마요네즈가 얇게 코팅되면 충분합니다.",
        commonMistake: "마요네즈를 많이 넣으면 질척하고 느끼해집니다.",
        rescueTip: "질척하면 감자, 오이, 양배추처럼 담백한 재료를 더 넣으세요.",
      },
      {
        order: 4,
        title: "맛 보고 완성",
        action: "한입 맛보고 싱거우면 소금 한 꼬집만 더 넣고 바로 먹습니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "숟가락으로 떴을 때 재료가 살짝 뭉치면 완성입니다.",
        commonMistake: "간을 보기 전 소금을 더 넣으면 쉽게 짜집니다.",
        rescueTip: "짜면 삶은 감자나 오이를 더 넣어 맛을 낮추세요.",
      },
    ];
  }

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

  if (title.includes("볶음밥")) {
    const mainIngredient = getMainIngredientPhrase(title);
    return [
      {
        order: 1,
        title: "밥 풀어두기",
        action: "밥 1공기는 숟가락으로 덩어리를 먼저 풀고, 찬밥이면 전자레인지에 30초만 데웁니다.",
        heat: "불 없음",
        minutes: 2,
        visualCue: "밥알이 큰 덩어리 없이 흩어지면 팬에서 고르게 볶입니다.",
        commonMistake: "밥덩어리를 그대로 넣으면 양념이 한쪽에만 묻습니다.",
        rescueTip: "딱딱한 밥은 물 1큰술을 뿌려 30초 더 데우세요.",
      },
      {
        order: 2,
        title: "재료 먼저 볶기",
        action: `팬에 식용유 1큰술을 두르고 ${mainIngredient}을 중불에서 2~3분 먼저 볶습니다.`,
        heat: "중불",
        minutes: 3,
        visualCue: "재료 가장자리가 살짝 익고 향이 올라오면 밥을 넣을 때입니다.",
        commonMistake: "밥을 너무 빨리 넣으면 재료 수분 때문에 볶음밥이 질척합니다.",
        rescueTip: "물이 나오면 1분 더 볶아 수분을 날린 뒤 밥을 넣으세요.",
      },
      {
        order: 3,
        title: "밥 넣고 볶기",
        action: "밥을 넣고 뒤집개로 누르듯 풀며 2분 볶은 뒤 팬 가장자리에 간장 1큰술을 둘러 섞습니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "밥알이 따로 움직이고 간장색이 옅게 돌면 됩니다.",
        commonMistake: "간장을 밥 위에 바로 붓고 오래 두면 한 부분만 짜집니다.",
        rescueTip: "짜면 밥을 조금 더 넣고, 질척하면 약불에서 1분 더 볶으세요.",
      },
      {
        order: 4,
        title: "마무리",
        action: "불을 끄고 참기름이나 김가루가 있으면 조금 넣어 바로 그릇에 옮깁니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "팬 바닥에 물기가 없고 밥알이 뭉치지 않으면 완성입니다.",
        commonMistake: "불 위에 오래 두면 밥알이 마르고 딱딱해집니다.",
        rescueTip: "마른 느낌이면 계란프라이나 김가루를 올려 덮밥처럼 먹어도 됩니다.",
      },
    ];
  }

  if (title.includes("덮밥")) {
    const mainIngredient = getMainIngredientPhrase(title);
    return [
      {
        order: 1,
        title: "밥 담기",
        action: "따뜻한 밥 1공기를 그릇에 담고 가운데를 살짝 낮게 눌러 토핑 자리를 만듭니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "밥에서 김이 살짝 올라오면 토핑과 잘 섞입니다.",
        commonMistake: "찬밥을 쓰면 토핑 양념이 따로 놀 수 있습니다.",
        rescueTip: "찬밥이면 물 1큰술을 뿌려 전자레인지에 1분 데우세요.",
      },
      {
        order: 2,
        title: "토핑 익히기",
        action: `팬에 식용유 1큰술을 두르고 ${mainIngredient}을 중불에서 익힙니다.`,
        heat: "중불",
        minutes: 4,
        visualCue: "재료가 따뜻해지고 가장자리가 부드러워지면 밥 위에 올릴 수 있습니다.",
        commonMistake: "센 불에서 바로 익히면 겉만 타고 속은 차가울 수 있습니다.",
        rescueTip: "타기 시작하면 물 2큰술을 넣고 불을 약하게 낮추세요.",
      },
      {
        order: 3,
        title: "간 맞추기",
        action: "간장 1큰술이나 마요네즈 1큰술처럼 제목에 맞는 양념을 넣고 30초만 섞습니다.",
        heat: "약불",
        minutes: 1,
        visualCue: "양념이 재료 겉면에 얇게 묻으면 충분합니다.",
        commonMistake: "양념을 많이 넣고 오래 졸이면 밥 위에 올렸을 때 짭니다.",
        rescueTip: "짜면 물 1큰술을 넣거나 밥을 조금 더 준비하세요.",
      },
      {
        order: 4,
        title: "밥 위에 올리기",
        action: "완성한 토핑을 밥 가운데에 올리고 한입 맛본 뒤 부족한 간만 조금 보충합니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "밥과 토핑이 반반 정도 보이면 섞어 먹기 좋습니다.",
        commonMistake: "처음부터 비벼 버리면 짠맛을 조절하기 어렵습니다.",
        rescueTip: "짜면 밥 가장자리부터 조금씩 섞어 먹으세요.",
      },
    ];
  }

  if (hasAny(title, ["국수", "우동", "라면", "파스타"])) {
    const noodle = getNoodleName(title);
    const mainIngredient = getMainIngredientPhrase(title);
    return [
      {
        order: 1,
        title: "면 삶기",
        action: `냄비에 물을 넉넉히 끓이고 ${noodle}을 포장 시간보다 30초 짧게 삶습니다.`,
        heat: "중불",
        minutes: 5,
        visualCue: "면이 서로 풀리고 가운데 딱딱한 심이 거의 없어지면 됩니다.",
        commonMistake: "면을 오래 삶으면 마지막에 섞을 때 쉽게 퍼집니다.",
        rescueTip: "퍼졌다면 찬물에 헹군 뒤 양념을 적게 넣어 비빔면처럼 먹으세요.",
      },
      {
        order: 2,
        title: "부재료 준비",
        action: `${mainIngredient}은 한입 크기로 준비하고, 국물 메뉴는 냄비에 같이 넣을 수 있게 옆에 둡니다.`,
        heat: "불 없음",
        minutes: 2,
        visualCue: "재료가 숟가락이나 젓가락으로 집히는 크기면 됩니다.",
        commonMistake: "재료가 크면 면과 같이 먹을 때 따로 놉니다.",
        rescueTip: "큰 재료는 가위로 바로 잘라 넣어도 됩니다.",
      },
      {
        order: 3,
        title: "양념 또는 국물 맞추기",
        action: title.includes("비빔") || title.includes("간장")
          ? "삶은 면의 물기를 빼고 간장이나 비빔 양념은 절반만 먼저 넣어 섞습니다."
          : `냄비에 ${getSoupSeasoning(title)}을 넣고 1분 끓여 국물 간을 맞춥니다.`,
        heat: title.includes("비빔") || title.includes("간장") ? "불 없음" : "중불",
        minutes: 2,
        visualCue: "면에 양념색이 옅게 돌거나 국물이 한 번 보글거리면 됩니다.",
        commonMistake: "양념을 처음부터 다 넣으면 쉽게 짜집니다.",
        rescueTip: "짜면 면수나 물을 2큰술씩 넣어 조절하세요.",
      },
      {
        order: 4,
        title: "마무리",
        action: "면과 재료를 섞고 한입 맛본 뒤 싱거우면 양념을 1작은술씩만 추가합니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "면이 뭉치지 않고 재료가 골고루 보이면 완성입니다.",
        commonMistake: "완성 후 오래 두면 면이 불고 양념이 바닥에 고입니다.",
        rescueTip: "면이 뭉치면 참기름이나 물 1작은술을 넣고 풀어 주세요.",
      },
    ];
  }

  if (method === "끓이기") {
    const mainIngredient = getMainIngredientPhrase(title);
    const seasoning = getSoupSeasoning(title);
    return [
      {
        order: 1,
        title: "국물 시작",
        action: `냄비에 물 2컵과 ${seasoning}을 넣고 중불로 올립니다.`,
        heat: "중불",
        minutes: 3,
        visualCue: "냄비 가장자리에 작은 기포가 올라오면 다음 재료를 넣을 때입니다.",
        commonMistake: "처음부터 강불로 끓이면 넘치거나 바닥이 눌 수 있습니다.",
        rescueTip: "넘치려 하면 바로 약불로 낮추고 국자로 거품을 걷어내세요.",
      },
      {
        order: 2,
        title: "주재료 넣기",
        action: `${mainIngredient}을 숟가락에 올라가는 크기로 넣고 중불에서 익힙니다.`,
        heat: "중불",
        minutes: 5,
        visualCue: "재료 가장자리가 부드럽게 휘거나 색이 진해지면 익고 있습니다.",
        commonMistake: "재료를 너무 크게 넣으면 겉만 뜨겁고 속은 차가울 수 있습니다.",
        rescueTip: "크게 넣었다면 국자나 가위로 냄비 안에서 작게 나눠 주세요.",
      },
      {
        order: 3,
        title: "간 보기",
        action: `국물을 한 숟가락 떠서 맛보고 싱거우면 ${title.includes("된장") ? "된장" : "국간장"} 1작은술만 추가합니다.`,
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

  const mainIngredient = getMainIngredientPhrase(title);

  if (method === "부치기") {
    return [
      {
        order: 1,
        title: "반죽 또는 계란물 만들기",
        action: `${mainIngredient}을 작게 준비하고 계란이나 부침가루와 섞어 숟가락으로 뜰 수 있게 만듭니다.`,
        heat: "불 없음",
        minutes: 4,
        visualCue: "숟가락으로 떴을 때 재료가 흩어지지 않으면 됩니다.",
        commonMistake: "재료가 너무 크면 뒤집을 때 찢어집니다.",
        rescueTip: "묽으면 부침가루나 계란을 조금 더 넣고, 되직하면 물 1큰술을 넣으세요.",
      },
      {
        order: 2,
        title: "팬 예열",
        action: "팬에 식용유 1큰술을 두르고 중불에서 30초 데운 뒤 반죽을 얇게 올립니다.",
        heat: "중불",
        minutes: 1,
        visualCue: "반죽 가장자리에 작은 기포가 생기면 잘 데워진 상태입니다.",
        commonMistake: "두껍게 올리면 겉은 타고 속은 덜 익습니다.",
        rescueTip: "두꺼워졌다면 작은 크기로 나눠 다시 펴 주세요.",
      },
      {
        order: 3,
        title: "앞면 익히기",
        action: "중불에서 3분 익히고 가장자리가 마르면 뒤집개를 깊게 넣어 뒤집습니다.",
        heat: "중불",
        minutes: 3,
        visualCue: "가장자리가 갈색으로 변하고 윗면이 덜 흔들리면 뒤집을 수 있습니다.",
        commonMistake: "너무 빨리 뒤집으면 찢어집니다.",
        rescueTip: "찢어져도 조각전처럼 더 익혀 먹으면 됩니다.",
      },
      {
        order: 4,
        title: "뒷면 익히기",
        action: "뒤집은 뒤 약불로 낮춰 2분 더 익히고 접시에 옮깁니다.",
        heat: "약불",
        minutes: 2,
        visualCue: "양면이 노릇하고 가운데가 질척하지 않으면 완성입니다.",
        commonMistake: "마지막까지 강불이면 겉만 딱딱해집니다.",
        rescueTip: "속이 덜 익었으면 전자레인지에 30초만 더 데우세요.",
      },
    ];
  }

  if (method === "조리기") {
    return [
      {
        order: 1,
        title: "주재료 준비",
        action: `${mainIngredient}은 한입 크기로 자르고 물기는 키친타월로 가볍게 닦습니다.`,
        heat: "불 없음",
        minutes: 3,
        visualCue: "표면에 물방울이 많지 않아야 양념이 잘 묻습니다.",
        commonMistake: "물기가 많으면 조림 양념이 싱겁고 묽어집니다.",
        rescueTip: "물기가 남으면 팬에 넣기 전 한 번 더 눌러 닦으세요.",
      },
      {
        order: 2,
        title: "겉면 잡기",
        action: "팬에 식용유 1큰술을 두르고 중불에서 주재료 겉면을 2분 정도 익힙니다.",
        heat: "중불",
        minutes: 2,
        visualCue: "겉면 색이 살짝 진해지면 양념을 넣을 수 있습니다.",
        commonMistake: "처음부터 양념을 넣으면 간장이 먼저 탑니다.",
        rescueTip: "팬이 마르면 물 1큰술을 넣어 붙은 부분을 떼세요.",
      },
      {
        order: 3,
        title: "조림 양념 넣기",
        action: "간장 2큰술과 물 1/2컵을 넣고 중약불로 낮춰 보글보글 끓입니다.",
        heat: "중약불",
        minutes: 4,
        visualCue: "양념이 재료 옆에서 작게 끓고 팬 바닥에 남아 있으면 됩니다.",
        commonMistake: "국물이 없어질 때까지 졸이면 짜집니다.",
        rescueTip: "짜거나 마르면 물 2큰술을 넣고 바로 불을 줄이세요.",
      },
      {
        order: 4,
        title: "끼얹어 완성",
        action: "양념을 재료 위로 3~4번 끼얹고 팬 바닥에 양념이 조금 남았을 때 불을 끕니다.",
        heat: "약불",
        minutes: 2,
        visualCue: "재료 표면에 윤기가 돌고 양념이 2~3큰술 남으면 완성입니다.",
        commonMistake: "재료를 계속 뒤적이면 부서질 수 있습니다.",
        rescueTip: "부서진 조림은 밥 위에 올려 덮밥처럼 먹으면 됩니다.",
      },
    ];
  }

  if (method === "굽기") {
    return [
      {
        order: 1,
        title: "물기 닦기",
        action: `${mainIngredient} 표면의 물기를 닦고 굽기 좋은 두께로 준비합니다.`,
        heat: "불 없음",
        minutes: 3,
        visualCue: "팬에 올렸을 때 물이 튀지 않을 정도로 표면이 마르면 됩니다.",
        commonMistake: "물기가 많으면 기름이 튀고 겉면이 늦게 익습니다.",
        rescueTip: "키친타월이 없으면 체에 2분만 받쳐 두세요.",
      },
      {
        order: 2,
        title: "팬에 올리기",
        action: "팬에 식용유 1큰술을 얇게 펴고 중불에서 재료를 겹치지 않게 올립니다.",
        heat: "중불",
        minutes: 2,
        visualCue: "재료 아래쪽 가장자리가 연한 갈색이면 뒤집을 때입니다.",
        commonMistake: "팬에 많이 올리면 굽기보다 찌듯이 익습니다.",
        rescueTip: "양이 많으면 두 번에 나눠 구우세요.",
      },
      {
        order: 3,
        title: "뒤집기",
        action: "뒤집개로 한 번만 크게 뒤집고 약불에서 2분 더 익힙니다.",
        heat: "약불",
        minutes: 2,
        visualCue: "양면에 노릇한 색이 나면 충분합니다.",
        commonMistake: "자주 뒤집으면 모양이 부서집니다.",
        rescueTip: "부서졌다면 밥 위에 올려 구이덮밥처럼 먹어도 됩니다.",
      },
      {
        order: 4,
        title: "간장 향 입히기",
        action: "불을 끄고 간장 1작은술이나 들기름을 가장자리에 둘러 향만 입힙니다.",
        heat: "불 없음",
        minutes: 1,
        visualCue: "재료 겉면에 윤기가 돌고 팬 바닥이 타지 않았으면 완성입니다.",
        commonMistake: "간장을 불 위에서 오래 끓이면 타고 짜집니다.",
        rescueTip: "짰다면 양념 없는 밥이나 두부와 같이 먹으세요.",
      },
    ];
  }

  return [
    {
      order: 1,
      title: "재료 맞추기",
      action: `${mainIngredient}을 한입 크기로 준비하고 양념은 정량만 먼저 꺼냅니다.`,
      heat: "불 없음",
      minutes: 3,
      visualCue: "두부 표면이 축축하지만 물이 흐르지 않고 소금이 아주 조금 보이면 됩니다.",
      commonMistake: "물기가 많으면 들기름이 튀고 겉면이 덜 노릇합니다.",
      rescueTip: "키친타월로 한 번 더 눌러 물기를 빼세요.",
    },
    {
      order: 2,
      title: "먼저 익히기",
      action: `팬에 식용유 1큰술을 두르고 ${mainIngredient}을 중불에서 3분 익힙니다.`,
      heat: "중불",
      minutes: 3,
      visualCue: "재료 가장자리 색이 진해지고 향이 올라오면 됩니다.",
      commonMistake: "팬을 오래 비워 두면 재료를 넣자마자 탈 수 있습니다.",
      rescueTip: "연기가 나면 불을 끄고 1분 식힌 뒤 다시 시작하세요.",
    },
    {
      order: 3,
      title: "양념 넣기",
      action: "불을 약하게 줄이고 간장이나 소금은 표시된 양만 넣어 30초 섞습니다.",
      heat: "약불",
      minutes: 1,
      visualCue: "양념이 재료 겉면에 얇게 묻고 팬 바닥이 타지 않으면 됩니다.",
      commonMistake: "강불에서 양념을 넣으면 순식간에 타고 짜집니다.",
      rescueTip: "짜면 밥, 계란, 두부 중 하나를 더해 덮밥처럼 바꾸세요.",
    },
    {
      order: 4,
      title: "완성 확인",
      action: "가장 두꺼운 조각을 한입 맛보고 속까지 따뜻하면 접시에 옮깁니다.",
      heat: "불 없음",
      minutes: 1,
      visualCue: "재료가 따뜻하고 양념 향이 고르게 나면 완성입니다.",
      commonMistake: "불 위에 오래 두면 수분이 빠져 질겨집니다.",
      rescueTip: "마르면 물 1큰술을 넣고 20초만 다시 데우세요.",
    },
  ];
}

function buildBeforeStart(title: string): string[] {
  const noFireStart = isNoFireRecipe(title) || title === "냉두부" || title === "오이무침" || title === "깻잎무침" || title === "깻잎두부무침";

  return [
    `${title} 재료를 모두 꺼내고 필수 재료가 빠졌는지 먼저 확인합니다.`,
    "간장, 소금, 기름은 손에 닿는 곳에 두고 처음에는 적은 양으로 시작합니다.",
    isMicrowaveRecipe(title)
      ? "전자레인지용 그릇인지 확인하고 금속 도구는 넣지 않습니다."
      : noFireStart
        ? "불을 쓰지 않는 메뉴라 물기 제거와 양념 양 조절이 가장 중요합니다."
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
  const externalReference = EXTERNAL_REFERENCE_SOURCES.get(title);
  if (externalReference) return externalReference;

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
  if (EXTERNAL_REFERENCE_SOURCES.has(title)) {
    return {
      safetyLevel: "B",
      copyrightRisk: "medium",
      privacyRisk: "low",
      commercialUseRisk: "medium",
      notes: "외부 링크는 참고 출처로만 표시하고 원문, 이미지, 자막은 복사하지 않은 집밥노트 자체 재작성 콘텐츠",
    };
  }

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

const DEFAULT_SUCCESS_CHECKS = [
  "가장 두꺼운 재료가 차갑지 않고 젓가락이나 숟가락으로 쉽게 나뉩니다.",
  "한입 맛봤을 때 짠맛이 강하면 밥이나 물로 바로 조절할 수 있습니다.",
];

const BEGINNER_RECIPE_SUCCESS_CHECKS_113_TO_120 = new Map<string, string[]>([
  ["감자참치조림", ["감자가 숟가락으로 눌렀을 때 부드럽게 갈라집니다.", "참치가 간장 양념에 촉촉하게 섞여 퍽퍽하지 않습니다.", "팬 바닥에 양념이 2~3큰술 정도 남아 짜거나 마르지 않았습니다."]],
  ["햄두부구이", ["햄 가장자리가 연한 갈색이고 두부 가운데까지 따뜻합니다.", "두부 표면 물기가 줄어 팬에 물이 흥건하게 남지 않습니다.", "한입 먹었을 때 햄의 짠맛이 두부와 같이 먹기 좋은 정도입니다."]],
  ["김치콩나물밥", ["밥알 전체에 김치색이 연하게 묻고 큰 밥 덩어리가 없습니다.", "콩나물이 숨은 죽었지만 아삭하게 씹히고 비린 냄새가 나지 않습니다.", "그릇 바닥에 물이 흥건하지 않아 밥이 죽처럼 질어지지 않았습니다."]],
  ["전자레인지 달걀밥", ["계란 흰자가 투명하지 않고 밥 가운데까지 따뜻합니다.", "밥알이 너무 마르지 않고 간장과 계란이 고르게 섞였습니다.", "한입 맛봤을 때 간장맛이 강하면 밥을 더 넣어 조절할 수 있는 정도입니다."]],
  ["전자레인지 두부계란찜", ["계란물이 흐르지 않고 숟가락으로 떠지는 부드러운 덩어리입니다.", "두부 가운데가 차갑지 않고 계란과 같이 따뜻합니다.", "그릇 바닥에 물이 많이 고이지 않아 찜이 묽게 풀리지 않습니다."]],
  ["오이간장비빔국수", ["면이 찬물에 헹궈져 서로 크게 뭉치지 않습니다.", "오이채가 아삭하고 간장 양념이 면 전체에 고르게 묻었습니다.", "한입 맛봤을 때 짠맛이 강하지 않아 오이와 면을 같이 먹기 좋습니다."]],
  ["만두계란국", ["만두가 가운데까지 뜨겁고 젓가락으로 눌렀을 때 속이 차갑지 않습니다.", "계란이 국물 속에서 부드러운 조각으로 익어 흘러다니지 않습니다.", "국물을 맛봤을 때 짜지 않고 만두와 같이 먹기 좋은 간입니다."]],
  ["어묵김치국", ["어묵이 부드럽게 휘어지고 가운데까지 따뜻합니다.", "김치가 부드러워지고 국물이 연한 붉은색으로 우러났습니다.", "국물이 너무 짜거나 기름지지 않아 밥과 같이 먹기 좋습니다."]],
]);

const BEGINNER_RECIPE_SUCCESS_CHECKS_121_TO_176 = new Map<string, string[]>([
  ["두부계란덮밥", ["두부에서 물이 흥건하게 나오지 않고 밥 위에 촉촉하게 올라갑니다.", "계란이 큰 덩어리로 부드럽게 익어 두부와 같이 숟가락에 올라옵니다.", "간장 1큰술 간이 밥과 섞였을 때 짜지 않고 고소한 향이 납니다."]],
  ["양파참치덮밥", ["양파가 투명하고 부드러워 매운맛이 남지 않습니다.", "참치가 따뜻하지만 퍽퍽하지 않고 양파와 고르게 섞였습니다.", "밥 위에 올렸을 때 기름이나 국물이 흥건하게 고이지 않습니다."]],
  ["감자계란국", ["감자 조각을 숟가락으로 눌렀을 때 부드럽게 갈라집니다.", "계란이 얇은 리본처럼 익고 국물이 심하게 탁하지 않습니다.", "국물을 한 숟가락 맛봤을 때 짜지 않고 따뜻하게 넘어갑니다."]],
  ["알배추간장무침", ["알배추 잎과 줄기에 간장 양념이 얇게 묻었습니다.", "배추가 숨이 죽지 않고 아삭하게 씹힙니다.", "그릇 바닥에 간장물이 많이 고이지 않아 짜지 않습니다."]],
  ["팽이버섯전", ["팽이버섯전 가장자리가 연한 갈색으로 굳어 뒤집어도 흩어지지 않습니다.", "가운데 계란물이 흐르지 않고 버섯이 따뜻하게 익었습니다.", "한입 먹었을 때 소금 간이 세지 않아 밥 없이도 먹기 좋습니다."]],
  ["계란토스트", ["식빵 겉면이 바삭하고 가운데 치즈가 따뜻하게 부드러워졌습니다.", "계란이 식빵에 붙어 있어 들어 올려도 속이 흘러내리지 않습니다.", "소금 간이 약하게 느껴지고 버터 향이 탔다는 냄새 없이 납니다."]],
  ["오이냉국", ["오이가 얇게 떠 있고 국물이 차갑게 느껴집니다.", "식초와 설탕이 녹아 새콤달콤하지만 목이 따갑지 않습니다.", "얼음이 녹아도 간장이 너무 진하거나 짜지 않습니다."]],
  ["계란볶음라면", ["면이 풀어져 있지만 불지 않고 젓가락으로 쉽게 집힙니다.", "계란이 큰 조각으로 익어 면 사이에 고르게 보입니다.", "스프를 절반만 써서 짜지 않고 팬 바닥에 양념이 타지 않았습니다."]],
  ["애호박전", ["애호박 양면에 계란옷이 붙고 가장자리가 연한 갈색입니다.", "애호박 가운데가 따뜻하고 젓가락으로 쉽게 잘립니다.", "부침가루가 뭉친 흰 부분 없이 얇게 익었습니다."]],
  ["무생채", ["무채 전체에 고춧가루 색이 고르게 묻었습니다.", "무가 아삭하고 물이 너무 많이 생기지 않았습니다.", "새콤달콤한 맛이 나지만 소금 맛이 먼저 튀지 않습니다."]],
  ["고추참치비빔밥", ["밥알 전체에 고추참치 양념이 고르게 묻었습니다.", "김가루와 참치가 한 숟가락에 같이 올라옵니다.", "양념 국물이 많지 않아 밥이 죽처럼 질어지지 않았습니다."]],
  ["새송이버섯볶음", ["새송이버섯이 숨이 죽고 가장자리가 살짝 투명합니다.", "간장색이 버섯 표면에 고르게 묻고 팬 바닥이 타지 않았습니다.", "버섯이 질기지 않고 한입 크기로 쉽게 씹힙니다."]],
  ["김치참치볶음밥", ["밥알 전체가 김치색으로 고르게 섞이고 큰 밥 덩어리가 없습니다.", "참치가 밥 사이에 퍼져 있지만 퍽퍽하게 마르지 않았습니다.", "팬 바닥에 물기가 거의 없고 한입 맛봤을 때 짜지 않습니다."]],
  ["가지무침", ["가지가 숟가락으로 눌렀을 때 부드럽게 눌립니다.", "간장과 참기름이 가지 표면에 고르게 묻었습니다.", "그릇 바닥에 물이 많지 않아 양념 맛이 싱겁게 빠지지 않았습니다."]],
  ["진미채무침", ["진미채가 딱딱하지 않고 젓가락으로 쉽게 집힙니다.", "고추장 양념이 진미채에 고르게 묻어 흰 부분이 적습니다.", "마요네즈와 올리고당 때문에 윤기가 있지만 그릇 바닥에 양념이 흥건하지 않습니다."]],
  ["팽이버섯덮밥", ["팽이버섯 숨이 죽고 질기지 않게 부드럽습니다.", "계란이 덮밥 위에서 촉촉하게 익어 밥과 같이 떠집니다.", "간장 소스가 밥을 적시지만 그릇 바닥에 많이 고이지 않습니다."]],
  ["김치비빔국수", ["소면이 차갑게 헹궈져 서로 크게 뭉치지 않습니다.", "김치와 붉은 양념이 면 전체에 고르게 묻었습니다.", "한입 맛봤을 때 매운맛이나 짠맛이 강하면 면을 더 넣어 조절할 수 있는 정도입니다."]],
  ["두부김치", ["두부가 가운데까지 따뜻하고 모양이 크게 부서지지 않았습니다.", "김치가 부드럽게 볶여 신 냄새가 줄었습니다.", "두부와 김치를 같이 먹었을 때 김치 간이 너무 세지 않습니다."]],
  ["오이크래미무침", ["오이와 크래미가 비슷한 길이로 섞여 젓가락에 같이 집힙니다.", "겨자 소스가 뭉치지 않고 전체에 얇게 묻었습니다.", "그릇 바닥에 물이 많이 생기지 않아 소스가 싱거워지지 않았습니다."]],
  ["참치쌈장", ["참치가 된장 양념과 섞여 큰 덩어리 없이 숟가락에 올라옵니다.", "양념이 짜지 않아 오이나 밥에 조금씩 올려 먹기 좋습니다.", "참기름 향이 나고 그릇 바닥에 기름이 따로 많이 고이지 않습니다."]],
  ["감자옥수수샐러드", ["감자가 숟가락으로 쉽게 으깨지고 차가운 덩어리가 없습니다.", "옥수수와 마요네즈가 감자에 고르게 섞였습니다.", "샐러드가 너무 묽지 않아 숟가락으로 떠도 모양이 유지됩니다."]],
  ["가지덮밥", ["가지가 부드럽고 간장 소스가 표면에 고르게 묻었습니다.", "밥 위에 올렸을 때 소스가 흥건하지 않고 촉촉합니다.", "한 숟가락에 밥과 가지가 같이 올라와 먹기 좋습니다."]],
  ["두부샐러드", ["두부가 한입 크기로 남아 있고 크게 으깨지지 않았습니다.", "채소와 드레싱이 고르게 섞였지만 물이 많이 생기지 않았습니다.", "간장드레싱 맛이 짜지 않고 두부와 같이 먹기 좋습니다."]],
  ["간장계란장", ["계란 흰자가 단단하고 노른자가 흘러나오지 않을 만큼 익었습니다.", "간장물이 계란 겉면에 고르게 묻어 색이 연하게 났습니다.", "밥과 먹었을 때 간장이 너무 짜지 않아 조금씩 조절할 수 있습니다."]],
  ["양배추라페", ["양배추가 얇게 썰려 젓가락으로 쉽게 집힙니다.", "식초와 설탕 양념이 고르게 묻고 설탕 알갱이가 보이지 않습니다.", "양배추에서 나온 물이 많지 않아 아삭한 식감이 남아 있습니다."]],
  ["토마토마리네이드", ["토마토 조각이 무너지지 않고 한입 크기를 유지합니다.", "올리브유와 식초가 토마토 표면에 윤기 있게 묻었습니다.", "소금 간이 세지 않고 토마토 단맛과 새콤한 맛이 같이 납니다."]],
  ["상추겉절이", ["상추 잎이 크게 찢어져 숨이 너무 죽지 않았습니다.", "간장 양념이 잎 전체에 얇게 묻고 한쪽에 몰리지 않았습니다.", "그릇 바닥에 양념물이 적어 마지막 잎까지 짜지 않습니다."]],
  ["김치말이국수", ["소면이 차갑고 육수 안에서 크게 뭉치지 않습니다.", "김치가 면과 같이 집힐 만큼 작게 잘렸습니다.", "국물이 차갑고 너무 짜거나 시지 않아 바로 떠먹기 좋습니다."]],
  ["오이계란샌드위치", ["삶은 계란이 마요네즈와 섞여 빵 밖으로 많이 흐르지 않습니다.", "오이가 얇아 씹을 때 샌드위치가 밀리지 않습니다.", "식빵이 젖지 않고 반으로 잘랐을 때 속이 고르게 보입니다."]],
  ["양배추참치샐러드", ["참치 기름이 빠져 샐러드가 질척하지 않습니다.", "양배추와 참치가 한 젓가락에 같이 집힙니다.", "마요네즈나 드레싱 맛이 강하지 않아 양배추 아삭함이 남아 있습니다."]],
  ["오이김밥", ["밥이 김 위에 얇게 펴져 김밥이 너무 두껍지 않습니다.", "오이가 가운데 길게 들어가 잘랐을 때 초록색이 보입니다.", "김밥을 집어도 밥과 오이가 쉽게 빠지지 않습니다."]],
  ["콩나물비빔라면", ["라면 면이 풀어져 있고 콩나물이 아삭하게 같이 씹힙니다.", "비빔양념이 면 전체에 고르게 묻었습니다.", "콩나물 물기가 많지 않아 양념이 싱거워지지 않았습니다."]],
  ["토마토카프레제", ["토마토와 치즈가 번갈아 보이고 접시 바닥에 물이 많이 고이지 않습니다.", "올리브유가 표면에 윤기를 주지만 소금이 한곳에 뭉치지 않았습니다.", "토마토와 치즈를 같이 집었을 때 한입 크기로 먹기 좋습니다."]],
  ["두부면비빔국수", ["두부면 물기가 빠져 양념이 묽어지지 않았습니다.", "고추장 양념이 면 전체에 붉게 고르게 묻었습니다.", "오이와 두부면이 같이 집히고 면이 많이 끊어지지 않았습니다."]],
  ["크래미유부초밥", ["유부가 찢어지지 않고 밥이 80% 정도만 채워져 있습니다.", "크래미 토핑이 위에 올라가도 흘러내리지 않습니다.", "하나를 집었을 때 밥과 유부가 분리되지 않습니다."]],
  ["토마토계란국", ["토마토가 부드럽고 국물이 연한 붉은색으로 우러났습니다.", "계란이 리본처럼 익고 냄비 바닥에 눌어붙지 않았습니다.", "국물을 맛봤을 때 간장이 세지 않고 따뜻하게 먹기 좋습니다."]],
  ["오이참치비빔밥", ["오이와 참치가 밥 전체에 고르게 섞였습니다.", "고추장 양념이 한쪽에 뭉치지 않고 밥알에 얇게 묻었습니다.", "참치 국물이 많지 않아 밥이 질척하지 않습니다."]],
  ["참치마요주먹밥", ["주먹밥을 내려놓아도 동그란 모양이 유지됩니다.", "참치마요와 김가루가 밥 안에 고르게 섞였습니다.", "한입 크기라 먹을 때 크게 부서지지 않습니다."]],
  ["계란양배추토스트", ["양배추 계란 속이 흐르지 않고 한 덩어리로 익었습니다.", "식빵 겉면이 살짝 바삭하고 소스가 밖으로 많이 흐르지 않습니다.", "반으로 잘랐을 때 양배추와 계란이 가운데에 고르게 들어 있습니다."]],
  ["김치콩나물국", ["콩나물이 투명하게 익고 비린 냄새가 강하지 않습니다.", "김치가 부드러워지고 국물이 붉게 우러났습니다.", "국물이 짜지 않아 밥과 같이 먹기 좋은 간입니다."]],
  ["콩나물냉국", ["콩나물이 익었지만 흐물거리지 않고 아삭합니다.", "국물이 차갑고 식초와 설탕이 고르게 섞였습니다.", "얼음이 들어가도 국간장 맛이 너무 싱겁거나 짜지 않습니다."]],
  ["계란카레덮밥", ["즉석카레가 따뜻하고 밥 위에 부드럽게 퍼집니다.", "계란이 촉촉한 큰 덩어리로 익어 카레와 같이 떠집니다.", "밥, 카레, 계란을 섞었을 때 너무 되직하거나 짜지 않습니다."]],
  ["김치치즈주먹밥", ["주먹밥 속 치즈가 밖으로 많이 새지 않고 안에 들어 있습니다.", "겉면이 약불에서 살짝 단단해져 들어도 모양이 유지됩니다.", "김치 국물이 빠져 밥이 질척하지 않습니다."]],
  ["닭가슴살오이냉채", ["닭가슴살과 오이가 비슷한 길이로 섞여 젓가락에 같이 집힙니다.", "겨자 소스가 덩어리 없이 풀려 표면에 고르게 묻었습니다.", "오이에서 물이 많이 나오지 않아 소스가 싱거워지지 않았습니다."]],
  ["두부면샐러드", ["두부면 물기가 빠져 드레싱이 묽어지지 않았습니다.", "채소와 두부면이 한 젓가락에 같이 집힙니다.", "간장드레싱이 짜지 않고 참기름 향이 가볍게 납니다."]],
  ["브로콜리계란볶음", ["브로콜리가 선명한 초록색이고 한입 크기로 부드럽게 씹힙니다.", "계란이 촉촉한 덩어리로 익어 브로콜리와 섞였습니다.", "간장 1작은술 간이 세지 않고 팬 바닥이 타지 않았습니다."]],
  ["참치계란죽", ["밥알이 부드럽게 풀려 숟가락으로 뜨기 좋습니다.", "참치와 계란이 죽 안에 고르게 퍼져 있습니다.", "국간장 간이 세지 않고 바닥에 눌어붙은 냄새가 나지 않습니다."]],
  ["어묵김밥", ["밥이 김 위에 얇게 펴져 말았을 때 옆구리가 터지지 않습니다.", "어묵이 간장색으로 코팅되어 가운데에 길게 들어 있습니다.", "한입 크기로 썰어도 어묵과 오이가 빠지지 않습니다."]],
  ["양배추계란국", ["양배추가 반투명하고 숟가락으로 쉽게 떠집니다.", "계란이 흐르지 않고 부드러운 조각으로 익었습니다.", "국간장 간이 세지 않아 국물을 바로 떠먹기 좋습니다."]],
  ["닭가슴살양배추덮밥", ["양배추가 부드럽지만 물이 많이 나오지 않았습니다.", "닭가슴살이 따뜻하고 간장색이 살짝 묻었습니다.", "밥 위에 올렸을 때 토핑과 밥이 한 숟가락에 같이 올라옵니다."]],
  ["두부참치전", ["전 가장자리가 연한 갈색으로 굳어 뒤집어도 크게 부서지지 않습니다.", "가운데 두부와 계란 반죽이 흐르지 않고 따뜻합니다.", "간장을 찍지 않아도 심심하게 먹기 좋은 간입니다."]],
  ["오이두부무침", ["두부가 한입 크기로 남아 있고 많이 으깨지지 않았습니다.", "오이에 간장과 식초 양념이 얇게 묻었습니다.", "그릇 바닥에 물이 많지 않아 마지막까지 싱겁지 않습니다."]],
  ["스팸무스비", ["밥이 스팸 크기에 맞게 네모로 눌려 들어도 흩어지지 않습니다.", "스팸 겉면이 연한 갈색이고 가운데까지 따뜻합니다.", "김이 밥에 붙어 접합면이 쉽게 풀리지 않습니다."]],
  ["가지토마토볶음", ["가지가 부드럽고 토마토가 완전히 풀어지지 않았습니다.", "간장 양념이 재료 표면에 고르게 묻고 팬 바닥이 타지 않았습니다.", "밥과 먹었을 때 신맛이 강하지 않고 촉촉합니다."]],
  ["김치어묵볶음", ["어묵이 따뜻하고 김치 양념이 표면에 고르게 묻었습니다.", "김치 신맛이 줄고 줄기가 부드럽게 씹힙니다.", "참기름 향이 나지만 팬 바닥에 기름이 많이 고이지 않습니다."]],
  ["양파달걀볶음", ["양파가 투명하게 익어 매운맛이 줄었습니다.", "달걀이 촉촉한 큰 덩어리로 익고 양파와 섞였습니다.", "간장 1작은술 간이 세지 않고 후추 향이 가볍게 납니다."]],
]);

function buildSuccessCheck(title: string): string[] {
  const specificSuccessCheck =
    BEGINNER_RECIPE_SUCCESS_CHECKS_113_TO_120.get(title) ?? BEGINNER_RECIPE_SUCCESS_CHECKS_121_TO_176.get(title);
  if (specificSuccessCheck) return specificSuccessCheck;

  if (title === "북엇국") {
    return [
      "북어채가 부드럽고 국물이 연하게 뽀얗게 우러났습니다.",
      "국물을 한 숟가락 맛봤을 때 짜지 않고 계란을 넣었다면 덩어리 없이 익었습니다.",
    ];
  }

  if (title === "김치국") {
    return [
      "김치 줄기가 부드럽고 국물이 붉게 우러났습니다.",
      "국물을 맛봤을 때 너무 시거나 짜지 않고 밥과 먹기 좋은 간입니다.",
    ];
  }

  if (title === "된장찌개") {
    return [
      "된장이 덩어리 없이 풀렸고 두부가 따뜻하게 데워졌습니다.",
      "국물을 맛봤을 때 짜지 않고 된장 향이 부드럽게 납니다.",
    ];
  }

  if (title === "김치찌개") {
    return [
      "김치가 부드럽게 익고 국물이 붉게 우러났습니다.",
      "맛봤을 때 짜면 물을 더 넣어 조절할 수 있는 정도입니다.",
    ];
  }

  if (title === "두부버섯국") {
    return [
      "버섯 숨이 죽고 두부가 따뜻하게 데워졌습니다.",
      "국물이 맑고 짜지 않아 숟가락으로 바로 떠먹기 좋습니다.",
    ];
  }

  if (title === "떡국떡달걀국") {
    return [
      "떡국떡이 말랑하고 계란이 부드럽게 익었습니다.",
      "국물이 탁하지 않고 짜지 않으면 완성입니다.",
    ];
  }

  if (title === "감자된장국") {
    return [
      "감자가 숟가락으로 눌렀을 때 부드럽게 갈라집니다.",
      "된장 국물이 짜지 않고 감자 맛이 부드럽게 납니다.",
    ];
  }

  if (title === "콩나물김치국") {
    return [
      "콩나물 숨이 죽고 김치가 부드럽게 익었습니다.",
      "국물이 붉게 우러났지만 너무 짜거나 시지 않습니다.",
    ];
  }

  if (title === "순두부국") {
    return [
      "순두부가 따뜻하고 너무 잘게 부서지지 않았습니다.",
      "국물이 맑고 짜지 않으며 계란을 넣었다면 부드럽게 익었습니다.",
    ];
  }

  if (title === "애호박된장국") {
    return [
      "애호박 가장자리가 반투명하고 부드럽게 익었습니다.",
      "된장 국물이 짜지 않고 애호박 단맛이 남아 있습니다.",
    ];
  }

  if (title === "양파국") {
    return [
      "양파가 투명하고 매운맛 없이 부드럽게 익었습니다.",
      "국물이 달큰하고 짜지 않아 바로 떠먹기 좋습니다.",
    ];
  }

  if (title === "배추된장국") {
    return [
      "배추 줄기가 반투명하고 잎이 부드럽게 익었습니다.",
      "된장 국물이 짜지 않고 배추 단맛이 납니다.",
    ];
  }

  if (title === "만두국") {
    return [
      "만두가 떠오르고 만두 속까지 뜨겁게 익었습니다.",
      "국물이 짜지 않고 만두피가 터져도 숟가락으로 먹기 좋습니다.",
    ];
  }

  if (title === "부추달걀국") {
    return [
      "계란이 부드럽게 익고 부추가 선명한 초록색으로 숨이 죽었습니다.",
      "국물이 맑고 짜지 않아 바로 떠먹기 좋습니다.",
    ];
  }

  if (title === "간장비빔국수") {
    return [
      "면이 차갑게 헹궈져 뭉치지 않고 간장 양념이 고르게 묻었습니다.",
      "한입 맛봤을 때 짜지 않으며 참기름 향이 부드럽게 납니다.",
    ];
  }

  if (title === "비빔국수") {
    return [
      "면이 차갑고 탱탱하며 붉은 양념이 고르게 묻었습니다.",
      "매운맛과 짠맛이 강하면 면이나 오이를 더 넣어 조절할 수 있습니다.",
    ];
  }

  if (title === "잔치국수") {
    return [
      "소면이 따뜻한 국물에 잠겨 있고 끈적하게 뭉치지 않습니다.",
      "국물이 짜지 않고 면과 함께 먹기 좋은 간입니다.",
    ];
  }

  if (title === "김치라면") {
    return [
      "라면 면이 풀어져 딱딱한 심이 없고 김치가 따뜻하게 익었습니다.",
      "국물이 너무 짜지 않으며 계란을 넣었다면 흰자가 하얗게 익었습니다.",
    ];
  }

  if (title === "라면계란죽") {
    return [
      "밥알과 부순 라면이 걸쭉하게 풀어져 숟가락으로 떠먹기 좋습니다.",
      "계란이 부드럽게 익고 라면스프 맛이 너무 짜지 않습니다.",
    ];
  }

  if (title === "볶음우동") {
    return [
      "우동면이 끊어지지 않고 간장 양념이 고르게 코팅됐습니다.",
      "팬 바닥에 양념이 타지 않고 면에 윤기가 남아 있습니다.",
    ];
  }

  if (title === "어묵우동볶음") {
    return [
      "어묵이 따뜻하고 우동면에 간장 양념이 고르게 묻었습니다.",
      "면이 너무 짜거나 마르지 않고 젓가락으로 쉽게 집힙니다.",
    ];
  }

  if (title === "토마토파스타") {
    return [
      "파스타면에 토마토소스가 고르게 묻고 면 가운데 딱딱한 심이 없습니다.",
      "소스가 너무 묽거나 말라붙지 않아 포크로 돌돌 말기 좋습니다.",
    ];
  }

  if (title === "참치파스타") {
    return [
      "참치가 면에 고르게 붙고 파스타가 뻑뻑하지 않습니다.",
      "간장 맛이 너무 짜지 않고 참치 향이 부드럽게 납니다.",
    ];
  }

  if (title === "우동") {
    return [
      "우동면이 통통하게 풀리고 국물이 짜지 않습니다.",
      "어묵을 넣었다면 따뜻하게 데워졌고 대파 향이 가볍게 납니다.",
    ];
  }

  if (title === "참치라면") {
    return [
      "라면 면에 딱딱한 심이 없고 참치가 따뜻하게 데워졌습니다.",
      "국물이 너무 느끼하거나 짜지 않고 대파나 후추로 향을 조절할 수 있습니다.",
    ];
  }

  if (title === "냉국수") {
    return [
      "소면이 차갑고 서로 뭉치지 않으며 육수에 반쯤 잠겨 있습니다.",
      "육수가 짜지 않고 싱거우면 간장 1작은술 단위로만 조절할 수 있습니다.",
    ];
  }

  if (title === "비빔우동") {
    return [
      "우동면 전체에 비빔양념이 고르게 묻고 면이 끊어지지 않습니다.",
      "매운맛이나 짠맛이 강하면 우동면이나 오이를 더 넣어 바로 조절할 수 있습니다.",
    ];
  }

  if (title === "간장라면") {
    return [
      "라면 면에 간장 양념이 고르게 묻고 면이 너무 붇지 않았습니다.",
      "스프를 넣지 않아 짠맛이 강하지 않고 참기름 향이 가볍게 납니다.",
    ];
  }

  if (title === "전자레인지 감자버터") {
    return [
      "젓가락이 감자 가운데까지 쉽게 들어가고 버터가 표면에 녹아 있습니다.",
      "그릇을 1분 식혀도 감자가 따뜻하고 소금 간이 세지 않습니다.",
    ];
  }

  if (title === "전자레인지 햄계란밥") {
    return [
      "계란물이 흐르지 않고 밥알 사이에 계란과 햄이 고르게 섞였습니다.",
      "그릇을 1분 식힌 뒤 비볐을 때 간장과 참기름 향이 고르게 납니다.",
    ];
  }

  if (title === "전자레인지 두부찜") {
    return [
      "두부 가운데까지 따뜻하고 숟가락으로 눌렀을 때 차가운 부분이 없습니다.",
      "간장과 참기름이 두부 위에 얇게 묻고 그릇을 1분 식혀 안전하게 먹을 수 있습니다.",
    ];
  }

  if (title === "전자레인지 콘치즈") {
    return [
      "치즈가 옥수수 위에 고르게 녹고 숟가락으로 뜰 때 살짝 늘어납니다.",
      "그릇 바닥에 물이 흥건하지 않고 1분 식힌 뒤 먹기 좋은 온도입니다.",
    ];
  }

  if (title === "오이참치무침") {
    return [
      "오이에 간장 양념이 옅게 묻고 참치가 너무 으깨지지 않았습니다.",
      "한입 맛봤을 때 짜지 않으며 오이가 아삭하고 참기름 향이 납니다.",
    ];
  }

  if (title === "양배추볶음") {
    return [
      "양배추 줄기가 부드럽게 휘고 잎은 숨이 죽었지만 물컹하지 않습니다.",
      "간장이 타지 않고 팬 바닥에 물이 흥건하지 않으며 한입 맛봤을 때 짜지 않습니다.",
    ];
  }

  if (title === "양배추참치덮밥") {
    return [
      "양배추가 부드럽고 참치가 따뜻하게 데워져 밥 위에 고르게 올라갔습니다.",
      "밥과 비볐을 때 짜지 않고 토핑이 너무 질척하지 않습니다.",
    ];
  }

  if (title === "전자레인지 참치치즈밥") {
    return [
      "치즈가 녹아 밥 위를 덮고 밥 가운데까지 따뜻합니다.",
      "그릇을 1분 식힌 뒤 비볐을 때 참치와 치즈가 한쪽에 몰리지 않습니다.",
    ];
  }

  if (title === "게맛살계란볶음") {
    return [
      "계란이 촉촉하게 익고 게맛살이 따뜻하며 한쪽에 몰리지 않았습니다.",
      "한입 맛봤을 때 짜지 않고 계란과 게맛살이 같이 숟가락에 올라옵니다.",
    ];
  }

  if (title === "두부계란부침") {
    return [
      "두부 양면에 계란옷이 붙어 있고 가운데까지 따뜻합니다.",
      "팬 바닥이 타지 않았고 간장은 찍어 먹을 수 있게 따로 조절됩니다.",
    ];
  }

  if (title === "스팸계란볶음밥") {
    return [
      "밥알 사이에 스팸과 계란이 고르게 섞이고 큰 밥 덩어리가 없습니다.",
      "간장을 1작은술만 써서 짜지 않고 스팸 향이 과하게 강하지 않습니다.",
    ];
  }

  if (title === "누룽지 두부 계란죽") {
    return [
      "누룽지가 부드럽게 풀리고 두부와 계란이 숟가락에 함께 올라옵니다.",
      "소금 간이 세지 않고 죽이 너무 묽거나 바닥에 눌어붙지 않았습니다.",
    ];
  }

  if (title === "고구마죽") {
    return [
      "고구마가 부드럽게 으깨지고 밥알이 퍼져 숟가락으로 뜨기 좋습니다.",
      "소금 한 꼬집으로 간을 맞춰 단맛과 색이 어색하지 않습니다.",
    ];
  }

  if (title === "참치김치국") {
    return [
      "김치가 숟가락으로 먹기 좋은 크기이고 국물이 붉게 우러났습니다.",
      "참치가 따뜻하지만 퍽퍽하지 않고 국물이 너무 짜지 않습니다.",
    ];
  }

  // beginner-107-112 batch-specific success checks
  if (title === "숙주볶음") {
    return [
      "숙주가 반투명하지만 아직 아삭하게 씹힙니다.",
      "그릇 바닥에 물이 흥건하게 고이지 않습니다.",
      "간장은 짜게 튀지 않고 숙주 전체에 가볍게 묻어 있습니다.",
    ];
  }

  if (title === "숙주계란볶음") {
    return [
      "계란은 부드럽고 숙주는 흐물거리지 않습니다.",
      "간장 향은 나지만 짠맛이 한쪽에 몰리지 않습니다.",
      "숟가락이나 젓가락으로 계란과 숙주가 같이 집힙니다.",
    ];
  }

  if (title === "김가루계란밥") {
    return [
      "김가루가 밥 전체에 고르게 보이고 한쪽에 뭉치지 않습니다.",
      "밥, 김가루, 계란이 한 숟가락에 같이 올라옵니다.",
      "간장과 참기름이 밥 전체에 고르게 섞여 짜지 않습니다.",
    ];
  }

  if (title === "들기름계란국수") {
    return [
      "면에 윤기가 돌고 한 덩어리로 뭉치지 않습니다.",
      "간장은 짜지 않고 들기름 향이 먼저 납니다.",
      "계란, 김가루, 면이 젓가락에 같이 올라옵니다.",
    ];
  }

  if (title === "두부참치비빔밥") {
    return [
      "밥이 질척하지 않고 두부와 참치가 고르게 섞입니다.",
      "참치캔 국물이 과하게 남아 짜거나 묽지 않습니다.",
      "한 숟가락에 밥, 두부, 참치가 같이 올라옵니다.",
    ];
  }

  if (title === "양배추계란덮밥") {
    return [
      "양배추가 부드럽지만 완전히 흐물거리지는 않습니다.",
      "계란이 촉촉하게 익어 밥 위에 덮입니다.",
      "간장 맛이 한쪽에 몰리지 않고 밥과 같이 먹기 좋습니다.",
    ];
  }

  return DEFAULT_SUCCESS_CHECKS;
}

function buildFallbackSuccessChecks(title: string): string[] {
  const mainIngredient = getMainIngredientPhrase(title);
  const method = inferMethod(title);

  if (hasAny(title, ["국수", "우동", "라면", "파스타"])) {
    const noodle = getNoodleName(title);
    return [
      `${noodle}이 딱딱한 심 없이 풀어지고 서로 크게 뭉치지 않습니다.`,
      `${mainIngredient}이 면 사이에 고르게 섞여 한 젓가락에 같이 올라옵니다.`,
      "양념이나 국물이 너무 짜지 않아 면을 더 넣지 않아도 바로 먹기 좋습니다.",
    ];
  }

  if (method === "끓이기") {
    return [
      `${mainIngredient}이 가운데까지 따뜻하고 숟가락이나 젓가락으로 쉽게 나뉩니다.`,
      "국물이나 죽을 한 숟가락 맛봤을 때 짠맛이 먼저 튀지 않습니다.",
      "냄비 바닥에 눌어붙은 냄새가 없고 표면이 조용히 보글거립니다.",
    ];
  }

  if (method === "전자레인지") {
    return [
      `${mainIngredient}이 그릇 가운데까지 따뜻하고 차가운 부분이 남지 않습니다.`,
      "계란이나 치즈가 들어간 경우 겉면이 흐르지 않고 부드럽게 굳었습니다.",
      "그릇을 1분 식힌 뒤에도 밥이나 재료가 마르지 않고 촉촉합니다.",
    ];
  }

  if (method === "볶기") {
    return [
      `${mainIngredient}이 팬 바닥에 타지 않고 따뜻하게 익었습니다.`,
      "양념이 재료 겉면에 얇게 묻고 한쪽에 짠 부분이 몰리지 않습니다.",
      "팬 바닥에 물이나 기름이 흥건하지 않아 밥 위에 올려도 질척하지 않습니다.",
    ];
  }

  if (method === "부치기") {
    return [
      `${mainIngredient} 가장자리가 연한 갈색으로 굳어 뒤집어도 크게 부서지지 않습니다.`,
      "가운데 계란물이나 반죽이 흐르지 않고 속까지 따뜻합니다.",
      "겉면은 노릇하지만 탄 냄새가 없고 소금 간이 세지 않습니다.",
    ];
  }

  if (method === "조리기") {
    return [
      `${mainIngredient}에 양념 윤기가 돌고 가운데까지 따뜻하게 익었습니다.`,
      "팬 바닥에 양념이 2~3큰술 남아 짜거나 마르지 않았습니다.",
      "재료가 크게 부서지지 않아 밥과 같이 떠먹기 좋습니다.",
    ];
  }

  if (method === "굽기") {
    return [
      `${mainIngredient} 양면에 연한 갈색이 나고 가운데까지 따뜻합니다.`,
      "팬 바닥에 물이 흥건하지 않고 겉면에 윤기가 남아 있습니다.",
      "간장이나 들기름 향이 나지만 탄 냄새나 강한 짠맛이 없습니다.",
    ];
  }

  return [
    `${mainIngredient}이 한입 크기로 남아 있고 밥이나 면과 고르게 섞였습니다.`,
    "양념이 재료 표면에 얇게 묻고 그릇 바닥에 물이 많이 고이지 않습니다.",
    "한입 맛봤을 때 짠맛이 강하지 않아 바로 먹기 좋습니다.",
  ];
}

function buildAdditionalSuccessCheck(title: string): string {
  const mainIngredient = getMainIngredientPhrase(title);
  const method = inferMethod(title);

  if (method === "끓이기") return `${mainIngredient}이 속까지 따뜻하고 국물 간이 밥과 먹기 좋은 정도입니다.`;
  if (method === "전자레인지") return `${mainIngredient} 가운데가 차갑지 않고 1분 식힌 뒤에도 촉촉합니다.`;
  if (method === "볶기") return `팬 바닥이 타지 않고 ${mainIngredient}에 양념이 고르게 묻었습니다.`;
  if (method === "부치기") return `${mainIngredient} 가장자리가 굳어 집어도 크게 부서지지 않습니다.`;
  if (method === "조리기") return `양념이 ${mainIngredient}에 배었지만 팬 바닥이 마르지 않았습니다.`;
  if (method === "굽기") return `${mainIngredient} 겉면에 윤기가 있고 탄 냄새 없이 따뜻합니다.`;
  return `${mainIngredient}과 양념이 한쪽에 몰리지 않고 한입에 같이 올라옵니다.`;
}

function normalizeSuccessCheck(title: string, successCheck: string[]): string[] {
  const checks =
    successCheck.length === DEFAULT_SUCCESS_CHECKS.length &&
    successCheck.every((check, index) => check === DEFAULT_SUCCESS_CHECKS[index])
      ? buildFallbackSuccessChecks(title)
      : [...successCheck];

  while (checks.length < 3) {
    checks.push(buildAdditionalSuccessCheck(title));
  }

  return checks.slice(0, 3);
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
    oneLineDescription: `${title} 레시피는 ${totalMinutes}분 안에 만들 수 있는 초보자용 집밥 메뉴입니다.`,
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
    successCheck: normalizeSuccessCheck(title, buildSuccessCheck(title)),
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

export function getBeginnerRecipeByTitle(title: string): BeginnerRecipe | undefined {
  const canonicalTitle = resolveBeginnerRecipeTitle(title);
  return BEGINNER_RECIPE_LIBRARY.find((recipe) => recipe.title === canonicalTitle);
}

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
