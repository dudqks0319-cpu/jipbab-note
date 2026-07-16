import type { IngredientCategory } from "../types/index.ts";

type PartnerLinkKind = "item" | "category" | "search";

type PartnerLinkInput = {
  name: string;
  category: IngredientCategory | null;
  allowCategoryFallback?: boolean;
};

export type PartnerLinkConfig = {
  itemLinks: Record<string, string>;
  categoryLinks: Partial<Record<IngredientCategory, string>>;
};

type PartnerLinkResult = {
  href: string;
  kind: PartnerLinkKind;
};

const coupangSearchBase = "https://www.coupang.com/np/search?component=&q=";
const coupangPartnerUrlPattern = /^https:\/\/link\.coupang\.com\/a\/[A-Za-z0-9_-]+(?:[/?#].*)?$/;

const itemKeyByName: Array<[string, string[]]> = [
  ["egg", ["계란", "달걀"]],
  ["milk", ["우유"]],
  ["butter", ["버터"]],
  ["cheese", ["치즈", "모짜렐라치즈"]],
  ["potato", ["감자"]],
  ["vegetable-box", ["양파", "대파", "당근", "브로콜리", "양배추"]],
  ["frozen-dumpling", ["냉동만두"]],
  ["seasoning-set", ["진간장", "국간장", "고추장", "된장"]],
];

function searchHref(keyword: string): string {
  return `${coupangSearchBase}${encodeURIComponent(keyword)}`;
}

export function normalizeLinkKey(value: string): string {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

export function isCoupangPartnerUrl(value: string | null | undefined): value is string {
  return typeof value === "string" && coupangPartnerUrlPattern.test(value.trim());
}

function validPartnerHref(value: string | null | undefined): string | null {
  if (!isCoupangPartnerUrl(value)) {
    return null;
  }

  return value.trim();
}

export function parsePartnerItemLinksJson(value: string | null | undefined): Record<string, string> {
  if (!value?.trim()) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed)
        .filter((entry): entry is [string, string] => isCoupangPartnerUrl(entry[1]))
        .map(([key, href]) => [normalizeLinkKey(key), href.trim()]),
    );
  } catch {
    return {};
  }
}

export function resolvePartnerLink(
  input: PartnerLinkInput,
  config: PartnerLinkConfig,
): PartnerLinkResult {
  const normalizedName = input.name.trim();
  const directItemHref = validPartnerHref(config.itemLinks[normalizeLinkKey(normalizedName)]);
  if (directItemHref) {
    return {
      href: directItemHref,
      kind: "item",
    };
  }

  for (const [key, keywords] of itemKeyByName) {
    if (keywords.some((keyword) => normalizedName.includes(keyword))) {
      const href = config.itemLinks[key];
      const validHref = validPartnerHref(href);
      if (validHref) {
        return {
          href: validHref,
          kind: "item",
        };
      }
    }
  }

  if (input.allowCategoryFallback && input.category) {
    const categoryHref = validPartnerHref(config.categoryLinks[input.category]);
    if (categoryHref) {
      return {
        href: categoryHref,
        kind: "category",
      };
    }
  }

  return {
    href: searchHref(normalizedName),
    kind: "search",
  };
}
