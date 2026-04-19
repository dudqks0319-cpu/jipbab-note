// 이 파일은 저장한 즐겨찾기 레시피를 한 곳에서 보여줍니다.
"use client";

import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";

import { useFavorites } from "@/hooks/useFavorites";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=900&q=80";

export default function FavoritesPage() {
  const { favorites, removeFavorite, clearFavorites } = useFavorites();

  return (
    <div className="flex flex-col pb-6">
      <section className="px-5 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-gray-400">FAVORITES</p>
            <h2 className="text-2xl font-bold text-gray-800">❤️ 즐겨찾기 레시피</h2>
          </div>
          {favorites.length > 0 ? (
            <button
              type="button"
              onClick={clearFavorites}
              className="rounded-full bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-500"
            >
              전체 정리
            </button>
          ) : null}
        </div>
      </section>

      <section className="mt-4 px-5">
        {favorites.length === 0 ? (
          <div className="rounded-3xl bg-white px-5 py-12 text-center shadow-soft">
            <Heart size={40} className="mx-auto text-rose-200" />
            <p className="mt-4 text-sm font-semibold text-gray-700">아직 저장한 레시피가 없어요.</p>
            <p className="mt-1 text-xs text-gray-400">레시피 목록에서 하트를 눌러 나만의 메뉴를 모아보세요.</p>
            <Link
              href="/recipe"
              className="mt-4 inline-flex rounded-full bg-mint-100 px-4 py-2 text-sm font-bold text-mint-600"
            >
              레시피 보러 가기
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {favorites.map((recipe) => (
              <div key={recipe.id} className="overflow-hidden rounded-3xl bg-white shadow-soft">
                <Link href={`/recipe/${recipe.id}`} className="flex items-center gap-4 px-4 py-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={recipe.thumbnailUrl || FALLBACK_IMAGE}
                    alt={recipe.name}
                    className="h-20 w-20 rounded-2xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold tracking-[0.16em] text-gray-400">{recipe.category}</p>
                    <h3 className="mt-1 truncate text-base font-bold text-gray-800">{recipe.name}</h3>
                    <p className="mt-1 text-xs text-gray-400">
                      저장일 {new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(
                        new Date(recipe.savedAt),
                      )}
                    </p>
                  </div>
                </Link>
                <div className="border-t border-gray-50 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => removeFavorite(recipe.id)}
                    className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600"
                  >
                    <Trash2 size={12} />
                    목록에서 제거
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
