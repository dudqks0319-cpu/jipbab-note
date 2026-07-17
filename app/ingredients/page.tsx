// 이 화면은 검색 가능한 재료 보관·레시피 탐색 랜딩 목록을 제공합니다.
import type { Metadata } from "next";
import Link from "next/link";

import { getIngredientCatalog } from "@/lib/ingredient-catalog";
import { INGREDIENT_CATEGORIES } from "@/types";

export const metadata: Metadata = {
  title: "재료별 보관법과 레시피",
  description: "냉장고 재료의 기본 보관 위치와 해당 재료로 찾을 수 있는 집밥 레시피를 확인하세요.",
  alternates: { canonical: "/ingredients" },
};

export default function IngredientsLandingPage() {
  const catalog = getIngredientCatalog();
  return (
    <div className="min-h-full bg-[#fbf6ee] px-5 pb-24 pt-8">
      <p className="text-xs font-black tracking-[0.16em] text-[#78a95f]">INGREDIENT GUIDE</p>
      <h1 className="mt-2 text-3xl font-black text-[#2f2117]">재료별 보관법과 레시피</h1>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#7d6d5f]">기본 보관 위치를 확인하고, 지금 가진 재료로 만들 수 있는 검수 레시피를 찾아보세요.</p>
      <div className="mt-7 space-y-6">
        {INGREDIENT_CATEGORIES.map((category) => {
          const items = catalog.filter((item) => item.category === category);
          if (items.length === 0) return null;
          return (
            <section key={category}>
              <h2 className="text-lg font-black text-[#2f2117]">{category}</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {items.map((item) => (
                  <Link key={item.id} href={`/ingredients/${item.id}`} className="rounded-2xl bg-white px-4 py-4 shadow-soft">
                    <strong className="block text-base text-[#2f2117]">{item.name}</strong>
                    <span className="mt-1 block text-xs font-semibold text-[#8f7f70]">기본 {item.defaultStorageType} 보관</span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
