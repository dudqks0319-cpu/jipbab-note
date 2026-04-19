// 이 파일은 장보기 페이지를 담당하며 수동 추가와 체크리스트 관리를 제공합니다.
"use client";

import { useMemo, useState } from "react";
import { Check, ExternalLink, Plus, ShoppingCart, Trash2 } from "lucide-react";

import { useShopping } from "@/hooks/useShopping";
import { getShoppingPartnerSuggestions } from "@/lib/external-links";
import { getCoupangSearchUrl } from "@/lib/utils";
import { INGREDIENT_CATEGORIES, type IngredientCategory } from "@/types";

const DEFAULT_CATEGORY: IngredientCategory = "채소";

export default function ShoppingPage() {
  const { items, uncheckedCount, checkedCount, addItem, toggleItem, removeItem, clearCheckedItems } =
    useShopping();
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState<IngredientCategory>(DEFAULT_CATEGORY);

  const uncheckedItems = useMemo(
    () => items.filter((item) => !item.checked),
    [items],
  );
  const checkedItems = useMemo(
    () => items.filter((item) => item.checked),
    [items],
  );
  const productSuggestions = useMemo(
    () => getShoppingPartnerSuggestions(items),
    [items],
  );

  const handleAdd = () => {
    if (!name.trim()) {
      return;
    }

    addItem({
      name,
      quantity,
      category,
    });
    setName("");
    setQuantity("");
    setCategory(DEFAULT_CATEGORY);
    setShowAddForm(false);
  };

  return (
    <div className="flex flex-col pb-6">
      <section className="px-5 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-gray-400">SHOPPING LIST</p>
            <h2 className="text-2xl font-bold text-gray-800">🛒 장보기</h2>
          </div>
          {checkedCount > 0 ? (
            <button
              type="button"
              onClick={clearCheckedItems}
              className="rounded-full bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-500"
            >
              완료 항목 정리
            </button>
          ) : null}
        </div>
      </section>

      <section className="mt-3 px-5">
        <div className="grid grid-cols-3 gap-2">
          <SummaryCard label="전체" value={`${items.length}개`} tone="bg-white text-gray-700" />
          <SummaryCard label="남은 항목" value={`${uncheckedCount}개`} tone="bg-mint-100 text-mint-600" />
          <SummaryCard label="완료" value={`${checkedCount}개`} tone="bg-rose-100 text-rose-500" />
        </div>
      </section>

      <section className="mt-4 px-5">
        <div className="rounded-3xl bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-800">빠른 추가</h3>
              <p className="mt-1 text-xs text-gray-500">
                필요한 재료를 직접 추가하고 바로 체크할 수 있어요.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-full bg-mint-100 px-3 py-2 text-xs font-bold text-mint-600"
            >
              <Plus size={14} />
              {showAddForm ? "닫기" : "항목 추가"}
            </button>
          </div>

          {showAddForm ? (
            <div className="mt-4 space-y-3">
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="예: 두부"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-mint-300"
              />
              <div className="grid grid-cols-[1fr_120px] gap-2">
                <input
                  type="text"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="예: 2모"
                  className="rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-mint-300"
                />
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as IngredientCategory)}
                  className="rounded-2xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-mint-300"
                >
                  {INGREDIENT_CATEGORIES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!name.trim()}
                className="w-full rounded-2xl bg-mint-400 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-mint-200"
              >
                장보기에 담기
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-4 px-5">
        {items.length === 0 ? (
          <div className="rounded-3xl bg-white px-4 py-12 text-center shadow-soft">
            <ShoppingCart size={42} className="mx-auto text-gray-300" />
            <p className="mt-4 text-sm font-semibold text-gray-600">장보기 목록이 비어 있어요.</p>
            <p className="mt-1 text-xs text-gray-400">레시피 부족 재료를 추가하거나 직접 등록해 보세요.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-gray-400">구매 예정</p>
              <div className="space-y-2">
                {uncheckedItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-soft">
                    <button
                      type="button"
                      onClick={() => toggleItem(item.id)}
                      className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-mint-400"
                      aria-label={`${item.name} 구매 완료`}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {item.quantity || "수량 미정"}
                        {item.category ? ` · ${item.category}` : ""}
                        {item.sourceRecipeName ? ` · ${item.sourceRecipeName}` : ""}
                      </p>
                    </div>
                    <a
                      href={getCoupangSearchUrl(item.name)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-peach-50 px-3 py-2 text-xs font-semibold text-peach-500"
                    >
                      <ExternalLink size={12} />
                      검색
                    </a>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="rounded-full p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-500"
                      aria-label={`${item.name} 삭제`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {checkedItems.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-gray-400">구매 완료</p>
                <div className="space-y-2">
                  {checkedItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-gray-100 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleItem(item.id)}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-mint-500 text-white"
                        aria-label={`${item.name} 미완료로 되돌리기`}
                      >
                        <Check size={12} />
                      </button>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-500 line-through">{item.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="rounded-full p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-500"
                        aria-label={`${item.name} 삭제`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {productSuggestions.length > 0 ? (
        <section className="mt-4 px-5">
          <div className="rounded-3xl bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.16em] text-gray-400">PARTNER PICKS</p>
                <h3 className="text-lg font-bold text-gray-800">구매 추천 링크</h3>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1.5 text-[11px] font-semibold text-gray-500">
                쿠팡 파트너스/검색
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {productSuggestions.map((suggestion) => (
                <article key={suggestion.key} className="overflow-hidden rounded-3xl border border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-3 px-4 py-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={suggestion.imageUrl}
                      alt={suggestion.title}
                      className="h-20 w-20 rounded-2xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold tracking-[0.16em] text-gray-400">
                        {suggestion.isPartnerLink ? "제휴 링크 연결됨" : "검색 링크 사용 중"}
                      </p>
                      <h4 className="mt-1 text-base font-bold text-gray-800">{suggestion.title}</h4>
                      <p className="mt-1 text-xs leading-5 text-gray-500">{suggestion.description}</p>
                      <p className="mt-2 text-xs font-semibold text-peach-500">관련 재료: {suggestion.matchedItemName}</p>
                    </div>
                  </div>
                  <div className="border-t border-white px-4 py-3">
                    <a
                      href={suggestion.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-peach-50 px-3 py-2 text-xs font-bold text-peach-500"
                    >
                      <ExternalLink size={12} />
                      {suggestion.ctaLabel}
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className={`rounded-2xl px-3 py-3 text-center shadow-soft ${tone}`}>
      <p className="text-sm font-bold">{value}</p>
      <p className="mt-1 text-[11px] font-medium opacity-80">{label}</p>
    </div>
  );
}
