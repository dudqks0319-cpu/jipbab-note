// 이 파일은 장보기에서 재료를 바로 추가하고 쿠팡 검색으로 이동하는 화면을 담당합니다.
"use client";

import { useMemo, useState } from "react";
import { Check, ExternalLink, Plus, Search, ShoppingCart } from "lucide-react";

import { useIngredients } from "@/hooks/useIngredients";
import { mergeQuantityText, normalizeIngredientKey } from "@/lib/ingredient-quantity";
import { getCoupangSearchUrl } from "@/lib/utils";
import type { IngredientCategory, IngredientStorageType } from "@/types";

const quickIngredients: Array<{
  name: string;
  category: IngredientCategory;
  storageType: IngredientStorageType;
}> = [
  { name: "양파", category: "채소", storageType: "냉장" },
  { name: "대파", category: "채소", storageType: "냉장" },
  { name: "계란", category: "유제품", storageType: "냉장" },
  { name: "두부", category: "유제품", storageType: "냉장" },
  { name: "돼지고기", category: "육류", storageType: "냉동" },
  { name: "닭가슴살", category: "육류", storageType: "냉동" },
  { name: "고등어", category: "수산물", storageType: "냉동" },
  { name: "간장", category: "양념", storageType: "실온" },
  { name: "고추장", category: "양념", storageType: "실온" },
  { name: "참기름", category: "양념", storageType: "실온" },
  { name: "쌀", category: "기타", storageType: "실온" },
  { name: "김치", category: "기타", storageType: "냉장" },
];

const inferCategory = (name: string): IngredientCategory => {
  const hit = quickIngredients.find((item) => normalizeIngredientKey(name).includes(normalizeIngredientKey(item.name)));
  return hit?.category ?? "기타";
};

const inferStorageType = (category: IngredientCategory): IngredientStorageType => {
  if (category === "양념" || category === "기타") return "실온";
  if (category === "육류" || category === "수산물") return "냉동";
  return "냉장";
};

export default function ShoppingPage() {
  const { ingredients, addIngredient, updateIngredient } = useIngredients();
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const filteredQuickIngredients = useMemo(() => {
    const normalizedKeyword = normalizeIngredientKey(keyword);
    if (!normalizedKeyword) {
      return quickIngredients;
    }

    return quickIngredients.filter((item) => normalizeIngredientKey(item.name).includes(normalizedKeyword));
  }, [keyword]);

  const addToFridge = async (name: string, category = inferCategory(name), storageType = inferStorageType(category)) => {
    const duplicate = ingredients.find((ingredient) => normalizeIngredientKey(ingredient.name) === normalizeIngredientKey(name));

    if (duplicate) {
      const shouldMerge = window.confirm(`${duplicate.name}이(가) 이미 있습니다. 기존 재료와 합칠까요?`);
      if (!shouldMerge) {
        return;
      }

      await updateIngredient(duplicate.id, {
        name: duplicate.name,
        category: duplicate.category ?? category,
        storageType: duplicate.storageType,
        quantity: mergeQuantityText(duplicate.quantity, null),
        expiryDate: duplicate.expiryDate,
        barcode: duplicate.barcode,
        imageUrl: duplicate.imageUrl,
        memo: duplicate.memo,
        familyFridgeId: duplicate.familyFridgeId ?? null,
      });
      setStatus(`${duplicate.name}을(를) 기존 재료와 합쳤습니다.`);
      return;
    }

    await addIngredient({
      name,
      category,
      storageType,
      quantity: null,
      expiryDate: null,
      memo: "장보기에서 바로 추가",
    });
    setStatus(`${name}을(를) 내 재료에 바로 추가했습니다. 유통기한은 나중에 입력하시면 됩니다.`);
  };

  const openCoupang = (name: string) => {
    window.open(getCoupangSearchUrl(name), "_blank", "noopener,noreferrer");
  };

  const submitKeyword = async () => {
    const name = keyword.trim();
    if (!name) {
      return;
    }

    await addToFridge(name);
  };

  return (
    <div className="flex flex-col px-5 pb-6 pt-4">
      <section className="rounded-3xl bg-white p-4 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mint-100 text-mint-500">
            <ShoppingCart size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">장보기</h2>
            <p className="text-sm text-gray-500">사려는 재료를 바로 냉장고에 담고 쇼핑 링크로 이동하세요.</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2">
          <Search size={16} className="text-gray-400" />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="예: 양파, 간장, 닭가슴살"
            className="min-w-0 flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
          />
          <button
            type="button"
            onClick={() => {
              void submitKeyword();
            }}
            className="rounded-full bg-mint-300 px-3 py-1.5 text-xs font-bold text-white"
          >
            추가
          </button>
        </div>

        {status ? (
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-mint-50 px-3 py-2 text-sm font-semibold text-mint-500">
            <Check size={15} />
            {status}
          </div>
        ) : null}
      </section>

      <section className="mt-5">
        <h3 className="text-lg font-bold text-gray-800">바로 살 재료</h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {filteredQuickIngredients.map((item) => (
            <article key={item.name} className="rounded-3xl bg-white p-4 shadow-soft">
              <p className="text-base font-bold text-gray-800">{item.name}</p>
              <p className="mt-1 text-xs text-gray-400">
                {item.category} · {item.storageType}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void addToFridge(item.name, item.category, item.storageType);
                  }}
                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-mint-100 px-2 py-2 text-xs font-bold text-mint-500"
                >
                  <Plus size={13} />
                  내 재료
                </button>
                <button
                  type="button"
                  onClick={() => openCoupang(item.name)}
                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-peach-100 px-2 py-2 text-xs font-bold text-peach-500"
                >
                  <ExternalLink size={13} />
                  구매
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

