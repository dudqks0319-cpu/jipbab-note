// 이 파일은 공개 레시피 외 재료·가이드 랜딩의 검색엔진 경로를 제공합니다.
import type { MetadataRoute } from "next";

import { getCookingGuides } from "@/lib/cooking-guides";
import { getIngredientCatalog } from "@/lib/ingredient-catalog";

const BASE_URL = "https://jipbab-note-app.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const updatedAt = new Date("2026-07-17T00:00:00.000Z");
  return [
    { url: BASE_URL, lastModified: updatedAt, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/recipe`, lastModified: updatedAt, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/ingredients`, lastModified: updatedAt, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/guides`, lastModified: updatedAt, changeFrequency: "monthly", priority: 0.7 },
    ...getIngredientCatalog().map((item) => ({
      url: `${BASE_URL}/ingredients/${item.id}`,
      lastModified: updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...getCookingGuides().map((guide) => ({
      url: `${BASE_URL}/guides/${guide.slug}`,
      lastModified: updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
