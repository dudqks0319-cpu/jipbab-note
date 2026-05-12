// 이 파일은 장보기에서 부족 재료를 확인하고 냉장고 추가/구매로 이어지는 화면을 담당합니다.
"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ExternalLink, Plus, Search, ShoppingCart } from "lucide-react";

import { useIngredients } from "@/hooks/useIngredients";
import { normalizeIngredientKey } from "@/lib/ingredient-quantity";
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

const parseShoppingItems = (rawItems: string | null): string[] => {
  if (!rawItems) return [];

  const uniqueItems = new Map<string, string>();
  for (const item of rawItems.split(",")) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    uniqueItems.set(normalizeIngredientKey(trimmed), trimmed);
  }
  return Array.from(uniqueItems.values()).slice(0, 12);
};

export default function ShoppingPage() {
  const { ingredients, addIngredient } = useIngredients();
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [requestedItems, setRequestedItems] = useState<string[]>([]);

  useEffect(() => {
    setRequestedItems(parseShoppingItems(new URLSearchParams(window.location.search).get("items")));
  }, []);

  const filteredQuickIngredients = useMemo(() => {
    const normalizedKeyword = normalizeIngredientKey(keyword);
    if (!normalizedKeyword) {
      return quickIngredients;
    }

    return quickIngredients.filter((item) => normalizeIngredientKey(item.name).includes(normalizedKeyword));
  }, [keyword]);

  const findOwnedIngredient = (name: string) => {
    return ingredients.find((ingredient) => normalizeIngredientKey(ingredient.name) === normalizeIngredientKey(name));
  };

  const addToFridge = async (name: string, category = inferCategory(name), storageType = inferStorageType(category)) => {
    const duplicate = findOwnedIngredient(name);

    if (duplicate) {
      setStatus(`${duplicate.name}은(는) 이미 냉장고에 있습니다.`);
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

      {requestedItems.length > 0 ? (
        <section className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-gray-800">부족 재료 장보기</h3>
              <p className="mt-1 text-xs text-gray-400">레시피에서 넘어온 재료입니다. 이미 있는 재료는 표시해드려요.</p>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {requestedItems.map((name) => {
              const ownedIngredient = findOwnedIngredient(name);
              const category = ownedIngredient?.category ?? inferCategory(name);
              const storageType = ownedIngredient?.storageType ?? inferStorageType(category);

              return (
                <article
                  key={name}
                  className="flex items-center justify-between gap-3 rounded-3xl bg-white p-3 shadow-soft"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-base font-bold text-gray-800">{name}</p>
                      {ownedIngredient ? (
                        <span className="shrink-0 rounded-full bg-mint-50 px-2 py-0.5 text-[10px] font-bold text-mint-500">
                          보유 중
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {category} · {storageType}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void addToFridge(name, category, storageType);
                      }}
                      className={`inline-flex h-9 items-center gap-1 rounded-xl px-3 text-xs font-bold ${
                        ownedIngredient ? "bg-gray-100 text-gray-500" : "bg-mint-100 text-mint-500"
                      }`}
                    >
                      {ownedIngredient ? <Check size={13} /> : <Plus size={13} />}
                      {ownedIngredient ? "보유" : "추가"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openCoupang(name)}
                      className="inline-flex h-9 items-center gap-1 rounded-xl bg-peach-100 px-3 text-xs font-bold text-peach-500"
                    >
                      <ExternalLink size={13} />
                      구매
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="mt-5">
        <h3 className="text-lg font-bold text-gray-800">바로 살 재료</h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {filteredQuickIngredients.map((item) => {
            const ownedIngredient = findOwnedIngredient(item.name);

            return (
              <article key={item.name} className="rounded-3xl bg-white p-4 shadow-soft">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-base font-bold text-gray-800">{item.name}</p>
                  {ownedIngredient ? (
                    <span className="shrink-0 rounded-full bg-mint-50 px-2 py-0.5 text-[10px] font-bold text-mint-500">
                      보유 중
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {item.category} · {item.storageType}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void addToFridge(item.name, item.category, item.storageType);
                    }}
                    className={`inline-flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-bold ${
                      ownedIngredient ? "bg-gray-100 text-gray-500" : "bg-mint-100 text-mint-500"
                    }`}
                  >
                    {ownedIngredient ? <Check size={13} /> : <Plus size={13} />}
                    {ownedIngredient ? "보유" : "내 재료"}
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
            );
          })}
        </div>
      </section>
    </div>
  );
}
