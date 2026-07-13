// 이 파일은 외부 검색 링크와 쿠팡 파트너스/검색 추천 링크를 관리합니다.
import { getIngredientPhotoUrl } from "@/lib/utils";
import {
  parsePartnerItemLinksJson,
  type PartnerLinkConfig,
  resolvePartnerLink,
} from "@/lib/partner-links";
import type { IngredientCategory, ShoppingItem } from "@/types";

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ?? "";
const COUPANG_PARTNERS_POTATO_URL =
  process.env.NEXT_PUBLIC_COUPANG_PARTNERS_POTATO_URL?.trim() ?? "";
const COUPANG_PARTNERS_VEGETABLE_URL =
  process.env.NEXT_PUBLIC_COUPANG_PARTNERS_VEGETABLE_URL?.trim() ?? "";
const COUPANG_PARTNERS_EGG_URL =
  process.env.NEXT_PUBLIC_COUPANG_PARTNERS_EGG_URL?.trim() ?? "";
const COUPANG_PARTNERS_DAIRY_URL =
  process.env.NEXT_PUBLIC_COUPANG_PARTNERS_DAIRY_URL?.trim() ?? "";
const COUPANG_PARTNERS_FROZEN_URL =
  process.env.NEXT_PUBLIC_COUPANG_PARTNERS_FROZEN_URL?.trim() ?? "";
const COUPANG_PARTNERS_SEASONING_URL =
  process.env.NEXT_PUBLIC_COUPANG_PARTNERS_SEASONING_URL?.trim() ?? "";
const COUPANG_PARTNERS_ITEM_LINKS_JSON =
  process.env.NEXT_PUBLIC_COUPANG_PARTNERS_ITEM_LINKS_JSON?.trim() ?? "";

type ProductSuggestionSeed = {
  key: string;
  title: string;
  description: string;
  matchKeywords: string[];
  matchCategories?: IngredientCategory[];
  fallbackKeyword: string;
  imageUrl: string;
};

export type RecipeExploreLink = {
  key: string;
  label: string;
  href: string;
  description: string;
};

export type ShoppingPartnerSuggestion = {
  key: string;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  imageUrl: string;
  matchedItemName: string;
  isPartnerLink: boolean;
};

const PRODUCT_SUGGESTIONS: ProductSuggestionSeed[] = [
  {
    key: "potato",
    title: "감자 바로 구매",
    description: "국/볶음/조림에 자주 쓰는 감자를 빠르게 장보기로 연결합니다.",
    matchKeywords: ["감자"],
    fallbackKeyword: "감자",
    imageUrl: getIngredientPhotoUrl("감자", "채소"),
  },
  {
    key: "egg",
    title: "계란 바로 구매",
    description: "밑반찬, 아침, 간단한 한 끼에 자주 쓰는 계란 추천 링크입니다.",
    matchKeywords: ["계란", "달걀", "에그"],
    fallbackKeyword: "계란",
    imageUrl: getIngredientPhotoUrl("계란", "계란·난류"),
  },
  {
    key: "milk",
    title: "유제품 기본 재료 구매",
    description: "우유, 버터, 치즈처럼 자주 쓰는 기본 유제품을 빠르게 채웁니다.",
    matchKeywords: ["우유", "버터", "치즈", "모짜렐라치즈"],
    matchCategories: ["유제품"],
    fallbackKeyword: "유제품",
    imageUrl: getIngredientPhotoUrl("우유", "유제품"),
  },
  {
    key: "vegetable-box",
    title: "채소 묶음 구매",
    description: "양파, 대파, 당근 같은 기본 채소를 한 번에 보충할 때 쓰기 좋습니다.",
    matchKeywords: ["양파", "대파", "파", "마늘", "당근", "오이", "시금치", "브로콜리", "애호박", "채소"],
    matchCategories: ["채소"],
    fallbackKeyword: "채소",
    imageUrl: getIngredientPhotoUrl("채소", "채소"),
  },
  {
    key: "frozen-staples",
    title: "냉동식품 채우기",
    description: "만두, 새우, 볶음밥 같은 냉동 기본 재료를 보충할 때 좋습니다.",
    matchKeywords: ["냉동만두", "냉동새우", "냉동볶음밥", "냉동우동면"],
    matchCategories: ["냉동식품"],
    fallbackKeyword: "냉동식품",
    imageUrl: getIngredientPhotoUrl("냉동식품", "냉동식품"),
  },
  {
    key: "seasoning-set",
    title: "기본 조미료 세트",
    description: "간장, 고추장, 된장처럼 가장 자주 쓰는 조미료를 한 번에 정리합니다.",
    matchKeywords: ["간장", "고추장", "된장", "굴소스", "고춧가루"],
    matchCategories: ["조미료"],
    fallbackKeyword: "조미료",
    imageUrl: getIngredientPhotoUrl("조미료", "조미료"),
  },
];

function normalizeKeyword(value: string): string {
  return value.trim().toLowerCase();
}

export function getSupportEmail(): string | null {
  return SUPPORT_EMAIL || null;
}

export function getSupportMailtoUrl(subject?: string): string | null {
  const email = getSupportEmail();
  if (!email) {
    return null;
  }

  const query = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  return `mailto:${email}${query}`;
}

export function getCoupangSearchUrl(keyword: string): string {
  return `https://www.coupang.com/np/search?component=&q=${encodeURIComponent(keyword)}`;
}

function getEnvPartnerLinkConfig(): PartnerLinkConfig {
  return {
    itemLinks: {
      ...parsePartnerItemLinksJson(COUPANG_PARTNERS_ITEM_LINKS_JSON),
      potato: COUPANG_PARTNERS_POTATO_URL,
      egg: COUPANG_PARTNERS_EGG_URL,
    },
    categoryLinks: {
      "채소": COUPANG_PARTNERS_VEGETABLE_URL,
      "계란·난류": COUPANG_PARTNERS_EGG_URL,
      "유제품": COUPANG_PARTNERS_DAIRY_URL,
      "냉동식품": COUPANG_PARTNERS_FROZEN_URL,
      "조미료": COUPANG_PARTNERS_SEASONING_URL,
    },
  };
}

export function getCoupangPurchaseLink(input: {
  name: string;
  category: IngredientCategory | null;
}, partnerLinks?: PartnerLinkConfig): { href: string; isPartnerLink: boolean } {
  const envConfig = getEnvPartnerLinkConfig();
  const mergedConfig: PartnerLinkConfig = {
    itemLinks: {
      ...envConfig.itemLinks,
      ...(partnerLinks?.itemLinks ?? {}),
    },
    categoryLinks: {
      ...envConfig.categoryLinks,
      ...(partnerLinks?.categoryLinks ?? {}),
    },
  };

  const result = resolvePartnerLink(input, mergedConfig);

  return {
    href: result.href,
    isPartnerLink: result.kind !== "search",
  };
}

export function getRecipeExploreLinks(recipeName: string): RecipeExploreLink[] {
  const query = `${recipeName} 레시피`;

  return [
    {
      key: "youtube",
      label: "유튜브 영상",
      href: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      description: "조리 영상을 바로 찾아볼 수 있습니다.",
    },
    {
      key: "blog",
      label: "블로그 레시피",
      href: `https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(query)}`,
      description: "블로그 후기를 함께 보며 응용 레시피를 찾습니다.",
    },
  ];
}

export function getShoppingPartnerSuggestions(
  items: ShoppingItem[],
  partnerLinks?: PartnerLinkConfig,
): ShoppingPartnerSuggestion[] {
  const uncheckedItems = items.filter((item) => !item.checked);
  const pickedSuggestions: ShoppingPartnerSuggestion[] = [];
  const usedKeys = new Set<string>();

  for (const item of uncheckedItems) {
    const normalizedName = normalizeKeyword(item.name);

    const matchedSeed =
      PRODUCT_SUGGESTIONS.find((seed) =>
        seed.matchKeywords.some((keyword) => normalizedName.includes(normalizeKeyword(keyword))),
      ) ??
      PRODUCT_SUGGESTIONS.find((seed) => seed.matchCategories?.includes(item.category ?? "음료/기타"));

    if (!matchedSeed || usedKeys.has(matchedSeed.key)) {
      continue;
    }

    usedKeys.add(matchedSeed.key);
    const purchaseLink = getCoupangPurchaseLink({
      name: item.name || matchedSeed.fallbackKeyword,
      category: item.category,
    }, partnerLinks);
    pickedSuggestions.push({
      key: matchedSeed.key,
      title: matchedSeed.title,
      description: matchedSeed.description,
      href: purchaseLink.href,
      imageUrl: matchedSeed.imageUrl,
      matchedItemName: item.name,
      isPartnerLink: purchaseLink.isPartnerLink,
      ctaLabel: purchaseLink.isPartnerLink ? "파트너스 링크 열기" : "쿠팡에서 보기",
    });
  }

  if (pickedSuggestions.length > 0) {
    return pickedSuggestions.slice(0, 3);
  }

  return uncheckedItems.slice(0, 3).map((item) => {
    const purchaseLink = getCoupangPurchaseLink(item, partnerLinks);

    return {
      key: `fallback:${item.id}`,
      title: `${item.name} 구매 검색`,
      description: "쿠팡 검색으로 바로 이동해 필요한 재료를 장바구니에 담을 수 있습니다.",
      href: purchaseLink.href,
      imageUrl: getIngredientPhotoUrl(item.name, item.category),
      matchedItemName: item.name,
      isPartnerLink: purchaseLink.isPartnerLink,
      ctaLabel: purchaseLink.isPartnerLink ? "파트너스 링크 열기" : "쿠팡 검색 열기",
    };
  });
}
