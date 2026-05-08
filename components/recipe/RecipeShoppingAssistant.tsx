// 이 파일은 레시피 재료와 내 냉장고/장보기 상태를 연결하는 보조 UI입니다.
"use client";

import { useMemo } from "react";
import { CheckCircle2, ShoppingCart } from "lucide-react";

import { useIngredients } from "@/hooks/useIngredients";
import { useShopping } from "@/hooks/useShopping";
import { suggestIngredientCategory } from "@/lib/ingredient-category";
import { calculateRecipeIngredientMatch } from "@/lib/matching";
import type { IngredientCategory } from "@/types";

type RecipeShoppingAssistantProps = {
  recipeId: string;
  recipeName: string;
  ingredientList: string[];
};

function inferCategory(
  ingredientName: string,
  categories: Map<string, IngredientCategory | null>,
): IngredientCategory | null {
  return categories.get(ingredientName.trim().toLowerCase())
    ?? suggestIngredientCategory(ingredientName, "채소");
}

export default function RecipeShoppingAssistant({
  recipeId,
  recipeName,
  ingredientList,
}: RecipeShoppingAssistantProps) {
  const { ingredients, loading, deleteIngredient } = useIngredients();
  const { items, addItems } = useShopping();

  const ownedCategories = useMemo(
    () => new Map(ingredients.map((item) => [item.name.trim().toLowerCase(), item.category])),
    [ingredients],
  );
  const shoppingNames = useMemo(
    () => new Set(items.map((item) => item.name.trim().toLowerCase())),
    [items],
  );

  const match = useMemo(
    () =>
      calculateRecipeIngredientMatch(
        ingredients.map((item) => item.name),
        ingredientList.join(", "),
      ),
    [ingredientList, ingredients],
  );

  const missingDrafts = useMemo(
    () =>
      match.missingIngredients
        .filter((ingredient) => !shoppingNames.has(ingredient.trim().toLowerCase()))
        .map((ingredient) => ({
          name: ingredient,
          category: inferCategory(ingredient, ownedCategories),
          sourceRecipeId: recipeId,
          sourceRecipeName: recipeName,
        })),
    [match.missingIngredients, ownedCategories, recipeId, recipeName, shoppingNames],
  );

  const matchedInventoryItems = useMemo(
    () =>
      ingredients.filter((item) =>
        match.matchedIngredients.some(
          (ingredient) => ingredient.trim().toLowerCase() === item.name.trim().toLowerCase(),
        ),
      ),
    [ingredients, match.matchedIngredients],
  );

  const removeCookedIngredients = async () => {
    if (matchedInventoryItems.length === 0) return;
    const shouldRemove = window.confirm(
      `${recipeName}에 사용한 재료 ${matchedInventoryItems.length}개를 냉장고에서 뺄까요? 현재는 수량 차감 대신 재료 항목 제거로 처리됩니다.`,
    );
    if (!shouldRemove) return;
    await Promise.all(matchedInventoryItems.map((item) => deleteIngredient(item.id)));
  };

  if (ingredientList.length === 0) {
    return null;
  }

  return (
    <section className="px-5 pt-5">
      <div className="jipbab-panel rounded-[16px] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-black text-[#2f2117]">내 재료 체크</h2>
            <p className="mt-1 text-sm text-[#7d6d5f]">
              냉장고에 있는 재료와 부족한 재료를 한 번에 확인하세요.
            </p>
          </div>
          <span className="rounded-full bg-[#fff0e4] px-3 py-1 text-xs font-black text-[#d94d19]">
            {loading ? "확인 중..." : `${match.matchRate}% 일치`}
          </span>
        </div>

        {match.missingIngredients.length > 0 ? (
          <div className="mt-4 rounded-[14px] border border-[#eadcc9] bg-[#fffaf3] px-4 py-3">
            <p className="text-sm font-black text-[#2f2117]">
              부족 재료 {match.missingIngredients.length}개를 장보기에 추가할 수 있어요.
            </p>
            <p className="mt-1 text-xs text-[#8f7f70]">
              이미 담긴 항목은 제외하고 추가합니다.
            </p>
            <button
              type="button"
              onClick={() => addItems(missingDrafts)}
              disabled={missingDrafts.length === 0}
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#ea5a1f] px-4 py-3 text-sm font-black text-white shadow-[0_8px_18px_rgba(234,90,31,0.18)] disabled:cursor-not-allowed disabled:bg-[#e6b49a]"
            >
              <ShoppingCart size={16} />
              {missingDrafts.length === 0 ? "이미 장보기에 있음" : "장보기에 추가"}
            </button>
          </div>
        ) : null}

        <div className="mt-4 grid gap-3">
          <div className="rounded-[14px] border border-[#dce8c8] bg-[#f2f7e7] px-4 py-3">
            <p className="text-xs font-black text-[#3d7b38]">보유 재료</p>
            {match.matchedIngredients.length === 0 ? (
              <p className="mt-2 text-sm text-[#7d6d5f]">현재 냉장고와 일치하는 재료가 없습니다.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {match.matchedIngredients.map((ingredient) => (
                  <li key={ingredient} className="flex items-center gap-2 text-sm font-semibold text-[#4b3929]">
                    <CheckCircle2 size={14} className="text-[#3d7b38]" />
                    <span>{ingredient}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-[14px] border border-[#eadcc9] bg-[#fff7ed] px-4 py-3">
            <p className="text-xs font-black text-[#d94d19]">부족 재료</p>
            {match.missingIngredients.length === 0 ? (
              <p className="mt-2 text-sm text-[#7d6d5f]">지금 바로 요리할 수 있어요.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {match.missingIngredients.map((ingredient) => (
                  <li key={ingredient} className="text-sm font-semibold text-[#4b3929]">
                    {ingredient}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {matchedInventoryItems.length > 0 ? (
          <div className="mt-3 rounded-[14px] border border-[#dce8c8] bg-[#f2f7e7] px-4 py-3">
            <p className="text-sm font-black text-[#2f2117]">
              조리 후 사용한 재료를 바로 뺄 수 있어요.
            </p>
            <p className="mt-1 text-xs text-[#7d6d5f]">
              수량 단위가 아직 제각각이라 이번 버전은 항목 제거로 먼저 처리합니다.
            </p>
            <button
              type="button"
              onClick={() => {
                void removeCookedIngredients();
              }}
              className="mt-3 rounded-full bg-[#3d7b38] px-4 py-2 text-sm font-bold text-white"
            >
              사용한 재료 냉장고에서 빼기
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
