// 이 파일은 냉장고와 장보기/즐겨찾기 상태를 숫자로 정리해 보여줍니다.
"use client";

import { useMemo } from "react";
import { BarChart3, ChevronRight, ShoppingCart } from "lucide-react";

import { useFavorites } from "@/hooks/useFavorites";
import { useIngredients } from "@/hooks/useIngredients";
import { useShopping } from "@/hooks/useShopping";
import { getDday } from "@/lib/utils";

export default function StatsPage() {
  const { ingredients, loading } = useIngredients();
  const { uncheckedCount, checkedCount } = useShopping();
  const { favorites } = useFavorites();

  const stats = useMemo(() => {
    const expiringSoonCount = ingredients.filter((item) => getDday(item.expiryDate) <= 3).length;
    const frozenCount = ingredients.filter((item) => item.storageType === "냉동").length;
    const roomTempCount = ingredients.filter((item) => item.storageType === "실온").length;
    const categoryEntries = Object.entries(
      ingredients.reduce<Record<string, number>>((acc, item) => {
        const key = item.category ?? "기타";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
    ).sort((left, right) => right[1] - left[1]);

    return {
      expiringSoonCount,
      frozenCount,
      roomTempCount,
      categoryEntries,
    };
  }, [ingredients]);

  return (
    <div className="flex flex-col pb-6">
      <section className="px-5 pt-4">
        <p className="text-xs font-semibold tracking-[0.16em] text-gray-400">FRIDGE STATS</p>
        <h2 className="text-2xl font-bold text-gray-800">📊 냉장고 통계</h2>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 px-5">
        <StatCard label="총 재료" value={`${ingredients.length}개`} tone="bg-white text-gray-700" />
        <StatCard label="임박 재료" value={`${stats.expiringSoonCount}개`} tone="bg-rose-100 text-rose-500" />
        <StatCard label="장보기 남음" value={`${uncheckedCount}개`} tone="bg-peach-100 text-peach-500" />
        <StatCard label="즐겨찾기" value={`${favorites.length}개`} tone="bg-lavender-100 text-violet-500" />
      </section>

      <section className="mt-4 px-5">
        <div className="rounded-3xl bg-white p-4 shadow-soft">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-mint-500" />
            <h3 className="text-lg font-bold text-gray-800">보관 상태</h3>
          </div>
          <div className="mt-4 grid gap-3">
            <StorageRow label="냉동 보관" value={`${stats.frozenCount}개`} />
            <StorageRow label="실온 보관" value={`${stats.roomTempCount}개`} />
            <StorageRow label="장보기 완료" value={`${checkedCount}개`} />
          </div>
        </div>
      </section>

      <section className="mt-4 px-5">
        <div className="rounded-3xl bg-white p-4 shadow-soft">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-peach-500" />
            <h3 className="text-lg font-bold text-gray-800">카테고리 분포</h3>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-gray-400">재료 통계를 계산하는 중...</p>
          ) : stats.categoryEntries.length === 0 ? (
            <p className="mt-4 text-sm text-gray-400">아직 등록된 재료가 없습니다.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {stats.categoryEntries.map(([label, count]) => (
                <li key={label} className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                  <span className="text-sm font-semibold text-gray-700">{label}</span>
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-gray-500">
                    {count}개 <ChevronRight size={14} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className={`rounded-3xl px-4 py-4 shadow-soft ${tone}`}>
      <p className="text-sm font-bold">{value}</p>
      <p className="mt-1 text-[11px] font-medium opacity-80">{label}</p>
    </div>
  );
}

function StorageRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
      <span className="text-sm font-medium text-gray-600">{label}</span>
      <span className="text-sm font-bold text-gray-800">{value}</span>
    </div>
  );
}
