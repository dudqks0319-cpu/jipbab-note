// 이 파일은 레시피 탐색 페이지를 담당합니다 - /api/recipes 연동 + 재료 매칭/즐겨찾기 기능
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Heart, RefreshCw, Search } from "lucide-react";

import { useFavorites } from "@/hooks/useFavorites";
import { useRecipes } from "@/hooks/useRecipes";
import { RECIPE_CATEGORIES } from "@/types";

const FALLBACK_RECIPE_IMAGE =
  "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=900&q=80";

export default function RecipePage() {
  const {
    recipes,
    loading,
    error,
    page,
    totalCount,
    totalPages,
    searchQuery,
    selectedCategory,
    ingredientsLoading,
    setSearchQuery,
    setSelectedCategory,
    nextPage,
    prevPage,
    refresh,
  } = useRecipes();

  const { favorites, isFavorite, toggleFavorite } = useFavorites();
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const filteredRecipes = useMemo(() => {
    if (!favoritesOnly) {
      return recipes;
    }
    return recipes.filter((recipe) => isFavorite(recipe.id));
  }, [favoritesOnly, isFavorite, recipes]);

  return (
    <div className="flex flex-col pb-6">
      {/* 헤더 */}
      <section className="px-5 pt-4">
        <h2 className="text-2xl font-bold text-gray-800">📖 레시피</h2>
        <p className="mt-1 text-sm text-gray-400">보유 재료 기준으로 매칭률을 계산해 추천해드려요.</p>
      </section>

      {/* 검색 + 보조 액션 */}
      <section className="mt-3 px-5">
        <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-3 py-2.5 shadow-soft">
          <Search size={16} className="text-gray-400" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="레시피 이름을 검색하세요"
            className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
          />
          <button onClick={refresh} aria-label="레시피 새로고침" className="text-gray-400">
            <RefreshCw size={15} />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {ingredientsLoading ? "내 재료를 불러오는 중..." : `총 ${totalCount.toLocaleString()}개 레시피`}
          </p>
          <button
            onClick={() => setFavoritesOnly((prev) => !prev)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              favoritesOnly ? "bg-rose-100 text-rose-500" : "bg-gray-100 text-gray-500"
            }`}
          >
            ❤️ 즐겨찾기 {favorites.length}개
          </button>
        </div>
      </section>

      {/* 카테고리 필터 */}
      <section className="scrollbar-hide mt-4 flex gap-2 overflow-x-auto px-5">
        {RECIPE_CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-all ${
              selectedCategory === category
                ? "bg-mint-200 text-mint-500 shadow-sm"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {category}
          </button>
        ))}
      </section>

      {/* 목록 본문 */}
      <section className="mt-4 px-5">
        {loading ? (
          <div className="flex flex-col items-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-mint-300 border-t-transparent" />
            <p className="mt-3 text-sm text-gray-400">레시피를 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="rounded-3xl bg-rose-50 px-4 py-5 text-sm text-rose-500">{error}</div>
        ) : filteredRecipes.length === 0 ? (
          <div className="rounded-3xl bg-gray-50 px-4 py-8 text-center">
            <p className="text-sm font-semibold text-gray-500">조건에 맞는 레시피가 없습니다.</p>
            <p className="mt-1 text-xs text-gray-400">검색어를 바꾸거나 카테고리를 다시 선택해 보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredRecipes.map((recipe) => {
              const favorite = isFavorite(recipe.id);
              const coverImage = recipe.thumbnailUrl || FALLBACK_RECIPE_IMAGE;
              return (
                <article
                  key={recipe.id}
                  className="relative overflow-hidden rounded-3xl bg-white shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-card"
                >
                  <button
                    onClick={() =>
                      toggleFavorite({
                        id: recipe.id,
                        name: recipe.name,
                        category: recipe.category,
                        thumbnailUrl: recipe.thumbnailUrl,
                      })
                    }
                    aria-label={`${recipe.name} 즐겨찾기 토글`}
                    className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow-sm"
                  >
                    <Heart size={16} className={favorite ? "fill-rose-400 text-rose-400" : "text-gray-400"} />
                  </button>

                  <Link href={`/recipe/${recipe.id}`} className="block">
                    <div className="relative h-36 w-full overflow-hidden">
                      {/* Next Image 도메인 설정 전까지는 원본 URL 이미지를 그대로 사용합니다. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={coverImage} alt={recipe.name} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
                      <span className="absolute left-3 top-3 rounded-full bg-white/85 px-2 py-1 text-[10px] font-bold text-gray-600">
                        {recipe.category}
                      </span>
                      <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-mint-500">
                        {recipe.matchRate}% 일치
                      </span>
                    </div>

                    <div className="p-3">
                      <h4 className="line-clamp-1 font-bold text-gray-800">{recipe.name}</h4>
                      <p className="mt-1 text-xs text-gray-400">{recipe.method}</p>
                      <p className="mt-1.5 text-xs text-peach-400">부족 재료 {recipe.missingIngredients.length}개</p>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 페이지네이션 */}
      <section className="mt-5 flex items-center justify-center gap-2 px-5">
        <button
          onClick={prevPage}
          disabled={page <= 1 || loading}
          className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-500 disabled:opacity-40"
        >
          이전
        </button>
        <span className="text-xs font-semibold text-gray-500">
          {page} / {totalPages}
        </span>
        <button
          onClick={nextPage}
          disabled={page >= totalPages || loading}
          className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-500 disabled:opacity-40"
        >
          다음
        </button>
      </section>
    </div>
  );
}
