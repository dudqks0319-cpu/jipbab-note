import type { IngredientCategory } from "../types/index.ts";

type PartnerLinkKind = "item" | "category" | "search";

type PartnerLinkInput = {
  name: string;
  category: IngredientCategory | null;
};

type PartnerLinkConfig = {
  itemLinks: Record<string, string>;
  categoryLinks: Partial<Record<IngredientCategory, string>>;
};

type PartnerLinkResult = {
  href: string;
  kind: PartnerLinkKind;
};

const coupangSearchBase = "https://www.coupang.com/np/search?component=&q=";

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

export function resolvePartnerLink(
  input: PartnerLinkInput,
  config: PartnerLinkConfig,
): PartnerLinkResult {
  const normalizedName = input.name.trim();

  for (const [key, keywords] of itemKeyByName) {
    if (keywords.some((keyword) => normalizedName.includes(keyword))) {
      const href = config.itemLinks[key];
      if (href) {
        return {
          href,
          kind: "item",
        };
      }
    }
  }

  if (input.category) {
    const categoryHref = config.categoryLinks[input.category];
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
