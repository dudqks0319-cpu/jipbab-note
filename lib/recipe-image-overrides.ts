// 이 파일은 외부 레시피 썸네일이 음식 사진답지 않을 때 집밥노트 로컬 이미지를 우선 적용합니다.
const RECIPE_IMAGE_OVERRIDES = [
  {
    keywords: ["비빔우동"],
    imageUrl: "/images/recipes/jipbab-curated/bibim-udon.png",
  },
  {
    keywords: ["볶음우동"],
    imageUrl: "/images/recipes/jipbab-curated/bokkeum-udon.png",
  },
] as const;

const normalizeRecipeName = (value: string): string => value.replace(/\s+/g, "");

export function resolveRecipeThumbnailUrl(
  recipeName: string,
  thumbnailUrl: string | null,
): string | null {
  const normalizedName = normalizeRecipeName(recipeName);

  for (const override of RECIPE_IMAGE_OVERRIDES) {
    if (override.keywords.some((keyword) => normalizedName.includes(normalizeRecipeName(keyword)))) {
      return override.imageUrl;
    }
  }

  return thumbnailUrl;
}
