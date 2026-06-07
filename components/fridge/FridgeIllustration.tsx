// 이 파일은 냉장/냉동/실온 3존 냉장고 요약 화면을 그립니다.
import { ChevronRight } from "lucide-react";

import type { IngredientRecord, IngredientStorageType } from "@/types";
import { getDday } from "@/lib/utils";

type FridgeIllustrationProps = {
  ingredients: IngredientRecord[];
  loading?: boolean;
  highlightedIngredientId?: string | null;
  maxPerZone?: number;
  onViewAll?: () => void;
};

const zoneConfig: Array<{
  type: IngredientStorageType;
  title: string;
  helper: string;
  className: string;
  emptyLabel: string;
}> = [
  {
    type: "냉장",
    title: "냉장실",
    helper: "오늘~이번 주 재료",
    className: "border-[#bfe3f0] bg-[#f3fbff]",
    emptyLabel: "계란, 두부, 대파를 담아보세요",
  },
  {
    type: "냉동",
    title: "냉동실",
    helper: "오래 보관할 재료",
    className: "border-[#cfd8ff] bg-[#f5f6ff]",
    emptyLabel: "만두, 냉동새우를 담아보세요",
  },
  {
    type: "실온",
    title: "실온칸",
    helper: "양념·곡물·상온 재료",
    className: "border-[#f3d7af] bg-[#fff8ec]",
    emptyLabel: "간장, 감자, 양파를 담아보세요",
  },
];

function compareUrgentFirst(left: IngredientRecord, right: IngredientRecord): number {
  const leftDday = getDday(left.expiryDate);
  const rightDday = getDday(right.expiryDate);

  if (leftDday !== rightDday) {
    return leftDday - rightDday;
  }

  return left.name.localeCompare(right.name, "ko");
}

export default function FridgeIllustration({
  ingredients,
  loading = false,
  highlightedIngredientId = null,
  maxPerZone = 8,
  onViewAll,
}: FridgeIllustrationProps) {
  return (
    <div className="rounded-[18px] border border-[#e5d7c4] bg-[#fffaf3] p-3 shadow-[0_8px_22px_rgba(76,51,28,0.08)]">
      <div className="grid gap-3">
        {zoneConfig.map((zone) => {
          const zoneItems = ingredients
            .filter((item) => item.storageType === zone.type)
            .sort(compareUrgentFirst);
          const visibleItems = zoneItems.slice(0, maxPerZone);
          const hiddenCount = Math.max(zoneItems.length - visibleItems.length, 0);

          return (
            <section
              key={zone.type}
              className={`min-h-[104px] rounded-[16px] border px-3 py-3 ${zone.className}`}
              aria-label={`${zone.title} 재료 ${zoneItems.length}개`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-[13px] font-black text-[#2f2117]">{zone.title}</h3>
                  <p className="mt-0.5 text-[11px] font-semibold text-[#7d6d5f]">{zone.helper}</p>
                </div>
                <span className="shrink-0 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-black text-[#6e431d]">
                  {loading ? "동기화" : `${zoneItems.length}개`}
                </span>
              </div>

              {visibleItems.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {visibleItems.map((item) => {
                    const isHighlighted = item.id === highlightedIngredientId;

                    return (
                      <span
                        key={item.id}
                        className={`max-w-full truncate rounded-full px-2.5 py-1.5 text-[11px] font-black transition-colors ${
                          isHighlighted
                            ? "bg-[#ea5a1f] text-white shadow-[0_4px_12px_rgba(234,90,31,0.24)]"
                            : "bg-white/90 text-[#4b3929]"
                        }`}
                      >
                        {item.name}
                      </span>
                    );
                  })}
                  {hiddenCount > 0 ? (
                    <button
                      type="button"
                      onClick={onViewAll}
                      className="inline-flex items-center gap-0.5 rounded-full bg-[#2f2117] px-2.5 py-1.5 text-[11px] font-black text-white"
                    >
                      +{hiddenCount}개
                      <ChevronRight size={12} />
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 rounded-[12px] bg-white/72 px-3 py-2 text-[11px] font-bold leading-5 text-[#8f7f70]">
                  {loading ? "칸을 준비하는 중입니다." : zone.emptyLabel}
                </p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
