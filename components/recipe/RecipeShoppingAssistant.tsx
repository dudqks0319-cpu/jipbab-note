// 이 파일은 레시피 재료와 내 냉장고/장보기 상태를 연결하는 보조 UI입니다.
"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, RefreshCw, ShoppingCart } from "lucide-react";

import { useFamilyShare } from "@/hooks/useFamilyShare";
import { useIngredients } from "@/hooks/useIngredients";
import { usePartnerLinks } from "@/hooks/usePartnerLinks";
import { useShopping } from "@/hooks/useShopping";
import CoupangAffiliateCard from "@/components/affiliate/CoupangAffiliateCard";
import { getCoupangPurchaseLink } from "@/lib/external-links";
import { suggestIngredientCategory } from "@/lib/ingredient-category";
import { calculateRecipeIngredientMatch } from "@/lib/matching";
import { getIngredientPhotoUrl } from "@/lib/utils";
import type { IngredientCategory, RecipeIngredientDetail } from "@/types";

type RecipeShoppingAssistantProps = {
  recipeId: string;
  recipeName: string;
  ingredientList: string[];
  ingredientDetails?: RecipeIngredientDetail[];
};

type AssistantScope = "personal" | "family";

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
  ingredientDetails = [],
}: RecipeShoppingAssistantProps) {
  const { group } = useFamilyShare();
  const [selectedScope, setSelectedScope] = useState<AssistantScope>(() => {
    if (typeof window === "undefined") {
      return "personal";
    }
    return new URLSearchParams(window.location.search).get("scope") === "family" ? "family" : "personal";
  });
  const activeScope: AssistantScope = selectedScope === "family" && group ? "family" : "personal";
  const familyGroupId = activeScope === "family" ? group?.id ?? null : null;
  const {
    ingredients,
    loading,
    error: ingredientError,
    updateIngredient,
    listIngredients,
  } = useIngredients({ scope: activeScope, familyGroupId });
  const {
    items,
    addItems,
    loading: shoppingLoading,
    error: shoppingError,
    listItems,
  } = useShopping({ scope: activeScope, familyGroupId });
  const [selectedMissingNames, setSelectedMissingNames] = useState<Set<string>>(new Set());
  const [statusMessage, setStatusMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const partnerLinks = usePartnerLinks();
  const activeIngredients = useMemo(
    () => ingredients.filter((item) => !item.consumedAt && !item.discardedAt),
    [ingredients],
  );
  const detailByName = useMemo(
    () => new Map(ingredientDetails.map((item) => [item.name.trim().toLowerCase(), item])),
    [ingredientDetails],
  );

  const ownedCategories = useMemo(
    () => new Map(activeIngredients.map((item) => [item.name.trim().toLowerCase(), item.category])),
    [activeIngredients],
  );
  const shoppingNames = useMemo(
    () => new Set(items.map((item) => item.name.trim().toLowerCase())),
    [items],
  );
  const requiredIngredientNames = useMemo(() => {
    const requiredNames = ingredientDetails
      .filter((item) => item.required !== false)
      .map((item) => item.name.trim())
      .filter(Boolean);
    return requiredNames.length > 0 ? requiredNames : ingredientList;
  }, [ingredientDetails, ingredientList]);

  const match = useMemo(
    () =>
      calculateRecipeIngredientMatch(
        activeIngredients.map((item) => item.name),
        requiredIngredientNames.join(", "),
      ),
    [activeIngredients, requiredIngredientNames],
  );

  const missingDrafts = useMemo(
    () =>
      match.missingIngredients
        .filter((ingredient) => !shoppingNames.has(ingredient.trim().toLowerCase()))
        .filter((ingredient) => selectedMissingNames.has(ingredient))
        .map((ingredient) => ({
          name: ingredient,
          quantity: detailByName.get(ingredient.trim().toLowerCase())?.display ?? null,
          category: inferCategory(ingredient, ownedCategories),
          familyGroupId,
          sourceRecipeId: recipeId,
          sourceRecipeName: recipeName,
        })),
    [detailByName, familyGroupId, match.missingIngredients, ownedCategories, recipeId, recipeName, selectedMissingNames, shoppingNames],
  );

  const selectableMissingIngredients = useMemo(
    () => match.missingIngredients.filter((ingredient) => !shoppingNames.has(ingredient.trim().toLowerCase())),
    [match.missingIngredients, shoppingNames],
  );
  const selectableMissingIngredientKey = useMemo(
    () => selectableMissingIngredients.join("\u001f"),
    [selectableMissingIngredients],
  );
  const affiliateSuggestions = useMemo(
    () =>
      match.missingIngredients
        .map((ingredient) => {
          const detail = detailByName.get(ingredient.trim().toLowerCase());
          const category = inferCategory(ingredient, ownedCategories);
          const purchaseLink = getCoupangPurchaseLink({ name: ingredient, category }, partnerLinks);
          if (!purchaseLink.isPartnerLink) {
            return null;
          }

          return {
            name: ingredient,
            href: purchaseLink.href,
            imageUrl: getIngredientPhotoUrl(ingredient, category),
            reason: detail?.display
              ? `${recipeName}에 필요한 ${detail.display} 기준으로 확인해 보세요.`
              : `${recipeName}에 부족한 재료예요.`,
          };
        })
        .filter((item): item is { name: string; href: string; imageUrl: string; reason: string } => Boolean(item))
        .slice(0, 3),
    [detailByName, match.missingIngredients, ownedCategories, partnerLinks, recipeName],
  );

  const matchedInventoryItems = useMemo(
    () =>
      activeIngredients.filter((item) =>
        match.matchedIngredients.some(
          (ingredient) => ingredient.trim().toLowerCase() === item.name.trim().toLowerCase(),
        ),
      ),
    [activeIngredients, match.matchedIngredients],
  );

  const removeCookedIngredients = async () => {
    if (matchedInventoryItems.length === 0) return;
    const shouldRemove = window.confirm(
      `${recipeName}에 사용한 재료 ${matchedInventoryItems.length}개를 소진 처리할까요? 삭제하지 않고 소진 기록으로 남깁니다.`,
    );
    if (!shouldRemove) return;
    await Promise.all(matchedInventoryItems.map((item) => updateIngredient(item.id, {
      name: item.name,
      category: item.category,
      storageType: item.storageType,
      quantity: item.quantity,
      expiryDate: item.expiryDate,
      purchaseDate: item.purchaseDate,
      openedAt: item.openedAt,
      storageLocation: item.storageLocation,
      unitPrice: item.unitPrice,
      purchasePlace: item.purchasePlace,
      consumedAt: new Date().toISOString(),
      discardedAt: null,
      repeatPurchase: item.repeatPurchase,
      barcode: item.barcode,
      imageUrl: item.imageUrl,
      memo: [item.memo, `${recipeName} 조리 후 소진`].filter(Boolean).join(" · ") || null,
    })));
  };

  useEffect(() => {
    const nextNames = selectableMissingIngredientKey
      ? selectableMissingIngredientKey.split("\u001f")
      : [];
    setSelectedMissingNames((prev) => {
      if (
        prev.size === nextNames.length
        && nextNames.every((ingredient) => prev.has(ingredient))
      ) {
        return prev;
      }
      return new Set(nextNames);
    });
    setStatusMessage("");
    setActionError("");
  }, [activeScope, selectableMissingIngredientKey]);

  const toggleMissingIngredient = (ingredient: string) => {
    setSelectedMissingNames((prev) => {
      const next = new Set(prev);
      if (next.has(ingredient)) {
        next.delete(ingredient);
      } else {
        next.add(ingredient);
      }
      return next;
    });
  };

  const addSelectedMissingIngredients = async () => {
    setStatusMessage("");
    setActionError("");
    if (activeScope === "family" && !group) {
      setActionError("가족 냉장고에 참여한 뒤 가족 장보기에 추가할 수 있어요.");
      return;
    }
    if (missingDrafts.length === 0) {
      setStatusMessage("추가할 새 부족 재료가 없습니다.");
      return;
    }

    try {
      const result = await addItems(missingDrafts);
      const targetLabel = activeScope === "family" ? "가족 장보기" : "내 장보기";
      if (result.addedCount > 0) {
        setStatusMessage(`${targetLabel}에 ${result.addedCount}개를 추가했어요.`);
      } else if (result.skippedDuplicates.length > 0) {
        setStatusMessage("이미 장보기에 있는 재료는 다시 추가하지 않았어요.");
      } else {
        setStatusMessage("추가할 새 부족 재료가 없습니다.");
      }
    } catch {
      setActionError("장보기에 추가하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  const retrySync = () => {
    void listIngredients();
    void listItems();
  };

  if (ingredientList.length === 0) {
    return null;
  }

  return (
    <section id="shopping-assistant" className="scroll-mt-24 px-5 pt-5">
      <div className="jipbab-panel rounded-[16px] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-black text-[#2f2117]">
              {activeScope === "family" ? "가족 재료 체크" : "내 재료 체크"}
            </h2>
            <p className="mt-1 text-sm text-[#7d6d5f]">
              냉장고에 있는 재료와 부족한 재료를 한 번에 확인하세요.
            </p>
          </div>
          <span className="rounded-full bg-[#fff0e4] px-3 py-1 text-xs font-black text-[#d94d19]">
            {loading ? "확인 중..." : `${match.matchRate}% 일치`}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 rounded-[14px] bg-[#fff7ed] p-1">
          <button
            type="button"
            onClick={() => setSelectedScope("personal")}
            className={`min-h-10 rounded-[11px] text-xs font-black ${
              activeScope === "personal"
                ? "bg-[#2f2117] text-white"
                : "text-[#7d6d5f]"
            }`}
          >
            내 냉장고
          </button>
          <button
            type="button"
            onClick={() => setSelectedScope("family")}
            disabled={!group}
            className={`min-h-10 rounded-[11px] text-xs font-black ${
              activeScope === "family"
                ? "bg-[#2f2117] text-white"
                : "text-[#7d6d5f] disabled:text-[#c5b4a1]"
            }`}
          >
            가족 냉장고
          </button>
        </div>

        {!group ? (
          <p className="mt-2 rounded-[12px] bg-[#fff7ed] px-3 py-2 text-[11px] font-bold leading-5 text-[#8f7f70]">
            가족 장보기는 가족 냉장고를 만들거나 초대코드로 참여한 뒤 사용할 수 있어요.
          </p>
        ) : null}

        {ingredientError || shoppingError || actionError ? (
          <div className="mt-3 rounded-[14px] border border-[#ffd1bd] bg-[#fff0e4] px-3 py-3">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-[#d94d19]" />
              <p className="text-[12px] font-bold leading-5 text-[#7d3f18]">
                {actionError || ingredientError?.message || shoppingError?.message}
              </p>
            </div>
            {!actionError ? (
              <button
                type="button"
                onClick={retrySync}
                className="mt-2 inline-flex min-h-9 items-center gap-1 rounded-full bg-[#2f2117] px-3 text-[11px] font-black text-white"
              >
                <RefreshCw size={13} />
                재시도
              </button>
            ) : null}
          </div>
        ) : null}

        {statusMessage ? (
          <p className="mt-3 rounded-[14px] border border-[#dce8c8] bg-[#f2f7e7] px-3 py-2 text-[12px] font-bold text-[#3d7b38]">
            {statusMessage}
          </p>
        ) : null}

        {match.missingIngredients.length > 0 ? (
          <div className="mt-4 rounded-[14px] border border-[#eadcc9] bg-[#fffaf3] px-4 py-3">
            <p className="text-sm font-black text-[#2f2117]">
              필수 부족 재료 {match.missingIngredients.length}개를 {activeScope === "family" ? "가족 장보기" : "내 장보기"}에 추가할 수 있어요.
            </p>
            <p className="mt-1 text-xs text-[#8f7f70]">
              선택 재료는 제외하고, 이미 담긴 항목은 다시 추가하지 않습니다.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {match.missingIngredients.map((ingredient) => {
                const alreadyInShopping = shoppingNames.has(ingredient.trim().toLowerCase());
                const detail = detailByName.get(ingredient.trim().toLowerCase());
                const checked = selectedMissingNames.has(ingredient) && !alreadyInShopping;
                return (
                  <button
                    key={ingredient}
                    type="button"
                    onClick={() => toggleMissingIngredient(ingredient)}
                    disabled={alreadyInShopping}
                    className={`min-h-10 max-w-full rounded-[14px] border px-3 py-2 text-left text-[12px] font-black ${
                      checked
                        ? "border-[#ea5a1f] bg-[#fff0e4] text-[#d94d19]"
                        : "border-[#eadcc9] bg-white text-[#7d6d5f] disabled:bg-[#f4ece3] disabled:text-[#b5a493]"
                    }`}
                  >
                    <span className="block break-keep leading-4">
                      {ingredient}
                      {detail?.display ? ` ${detail.display}` : ""}
                      {alreadyInShopping ? " · 담김" : ""}
                    </span>
                    {detail?.substitute ? (
                      <span className="mt-0.5 block break-keep text-[10px] font-bold opacity-80">
                        대체: {detail.substitute}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                void addSelectedMissingIngredients();
              }}
              disabled={missingDrafts.length === 0 || shoppingLoading}
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#ea5a1f] px-4 py-3 text-sm font-black text-white shadow-[0_8px_18px_rgba(234,90,31,0.18)] disabled:cursor-not-allowed disabled:bg-[#e6b49a]"
            >
              <ShoppingCart size={16} />
              {missingDrafts.length === 0 ? "선택할 새 재료 없음" : `${missingDrafts.length}개 장보기에 추가`}
            </button>
            {affiliateSuggestions.length > 0 ? (
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-[13px] font-black text-[#2f2117]">쿠팡에서 부족 재료 보기</p>
                  <p className="mt-1 break-keep text-[11px] font-semibold leading-5 text-[#8f7f70]">
                    검증된 쿠팡 파트너스 링크가 있는 재료만 보여줍니다.
                  </p>
                </div>
                {affiliateSuggestions.map((item) => (
                  <CoupangAffiliateCard
                    key={`${item.name}-${item.href}`}
                    productName={item.name}
                    affiliateUrl={item.href}
                    imageUrl={item.imageUrl}
                    reason={item.reason}
                  />
                ))}
              </div>
            ) : null}
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
            <p className="text-xs font-black text-[#d94d19]">필수 부족 재료</p>
            {match.missingIngredients.length === 0 ? (
              <p className="mt-2 text-sm text-[#7d6d5f]">지금 바로 요리할 수 있어요.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {match.missingIngredients.map((ingredient) => {
                  const detail = detailByName.get(ingredient.trim().toLowerCase());
                  return (
                    <li key={ingredient} className="text-sm font-semibold text-[#4b3929]">
                      <span>{ingredient}</span>
                      {detail?.substitute ? (
                        <p className="mt-0.5 text-[11px] font-bold text-[#8f7f70]">
                          대체 가능: {detail.substitute}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
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
              수량 단위가 제각각이어도 삭제하지 않고 소진 상태로 기록합니다.
            </p>
            <button
              type="button"
              onClick={() => {
                void removeCookedIngredients();
              }}
              className="mt-3 rounded-full bg-[#3d7b38] px-4 py-2 text-sm font-bold text-white"
            >
              사용한 재료 소진 처리
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
