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
import { normalizeKoreanIngredient } from "@/lib/matching";
import { matchRecipeIngredientsToInventory } from "@/lib/recipe-ingredient-match-status";
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
  return categories.get(normalizeKoreanIngredient(ingredientName))
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
    () => new Map(ingredientDetails.map((item) => [normalizeKoreanIngredient(item.name), item])),
    [ingredientDetails],
  );

  const ownedCategories = useMemo(
    () => new Map(activeIngredients.map((item) => [normalizeKoreanIngredient(item.name), item.category])),
    [activeIngredients],
  );
  const shoppingNames = useMemo(
    () => new Set(items.map((item) => normalizeKoreanIngredient(item.name))),
    [items],
  );
  const requiredIngredientDetails = useMemo(() => {
    const requiredDetails = ingredientDetails.filter(
      (item) => item.required !== false && item.name.trim(),
    );
    if (requiredDetails.length > 0) return requiredDetails;

    return ingredientList.map((name, index) => ({
      id: `unresolved-${index}`,
      ingredientId: null,
      name,
      display: "",
      required: true,
      substitutions: [],
    }));
  }, [ingredientDetails, ingredientList]);
  const matches = useMemo(
    () => matchRecipeIngredientsToInventory(requiredIngredientDetails, activeIngredients),
    [activeIngredients, requiredIngredientDetails],
  );
  const directMatches = matches.filter((item) => item.status === "exact" || item.status === "alias");
  const substituteMatches = matches.filter((item) => item.status === "substitute");
  const missingMatches = matches.filter((item) => item.status === "missing");
  const unknownMatches = matches.filter((item) => item.status === "unknown");
  const missingIngredientNames = missingMatches.map((item) => item.recipeIngredient.name);

  const missingDrafts = useMemo(
    () =>
      missingIngredientNames
        .filter((ingredient) => !shoppingNames.has(normalizeKoreanIngredient(ingredient)))
        .filter((ingredient) => selectedMissingNames.has(ingredient))
        .map((ingredient) => ({
          name: ingredient,
          quantity: detailByName.get(normalizeKoreanIngredient(ingredient))?.display ?? null,
          category: inferCategory(ingredient, ownedCategories),
          familyGroupId,
          sourceRecipeId: recipeId,
          sourceRecipeName: recipeName,
        })),
    [detailByName, familyGroupId, missingIngredientNames, ownedCategories, recipeId, recipeName, selectedMissingNames, shoppingNames],
  );

  const selectableMissingIngredients = useMemo(
    () => missingIngredientNames.filter((ingredient) => !shoppingNames.has(normalizeKoreanIngredient(ingredient))),
    [missingIngredientNames, shoppingNames],
  );
  const selectableMissingIngredientKey = useMemo(
    () => selectableMissingIngredients.join("\u001f"),
    [selectableMissingIngredients],
  );
  const affiliateSuggestions = useMemo(
    () =>
      missingIngredientNames
        .map((ingredient) => {
          const detail = detailByName.get(normalizeKoreanIngredient(ingredient));
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
    [detailByName, missingIngredientNames, ownedCategories, partnerLinks, recipeName],
  );

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

  if (ingredientList.length === 0 && ingredientDetails.length === 0) {
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
              같은 재료와 검수된 대체 재료를 구분해서 확인하세요.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[#fff0e4] px-3 py-1 text-xs font-black text-[#d94d19]">
            {loading ? "확인 중..." : `같은 재료 ${directMatches.length}/${requiredIngredientDetails.length}`}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 rounded-[14px] bg-[#fff7ed] p-1">
          <button
            type="button"
            onClick={() => setSelectedScope("personal")}
            className={`min-h-11 rounded-[11px] text-xs font-black ${
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
            className={`min-h-11 rounded-[11px] text-xs font-black ${
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
                className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-full bg-[#2f2117] px-3 text-[11px] font-black text-white"
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

        <div className="mt-4 grid grid-cols-2 gap-2" aria-live="polite">
          <div className="rounded-[12px] bg-[#f2f7e7] px-3 py-3">
            <p className="text-[11px] font-bold text-[#66805c]">같은 재료</p>
            <p className="mt-1 text-lg font-black text-[#3d7b38]">{directMatches.length}개</p>
          </div>
          <div className="rounded-[12px] bg-[#f1efff] px-3 py-3">
            <p className="text-[11px] font-bold text-[#7467a9]">검수된 대체</p>
            <p className="mt-1 text-lg font-black text-[#62539b]">{substituteMatches.length}개</p>
          </div>
          <div className="rounded-[12px] bg-[#fff0e4] px-3 py-3">
            <p className="text-[11px] font-bold text-[#a45f37]">부족</p>
            <p className="mt-1 text-lg font-black text-[#d94d19]">{missingMatches.length}개</p>
          </div>
          <div className="rounded-[12px] bg-[#f3f1ee] px-3 py-3">
            <p className="text-[11px] font-bold text-[#81766c]">확인 필요</p>
            <p className="mt-1 text-lg font-black text-[#5f554c]">{unknownMatches.length}개</p>
          </div>
        </div>

        <div className="mt-4 rounded-[14px] border border-[#dce8c8] bg-[#f2f7e7] px-4 py-3">
          <p className="text-xs font-black text-[#3d7b38]">같은 재료</p>
          {directMatches.length === 0 ? (
            <p className="mt-2 text-sm text-[#7d6d5f]">정확히 확인된 보유 재료가 없습니다.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {directMatches.map((item, index) => (
                <li
                  key={item.recipeIngredient.id ?? `${item.recipeIngredient.name}-${index}`}
                  className="rounded-[12px] bg-white px-3 py-3"
                >
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#3d7b38]" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[#4b3929]">{item.recipeIngredient.name}</p>
                      <p className="mt-1 text-[11px] font-bold text-[#66805c]">
                        {item.status === "exact" ? "정확히 일치" : "같은 재료 · 별칭"}
                        {item.inventoryName ? ` · 냉장고: ${item.inventoryName}` : ""}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {substituteMatches.length > 0 ? (
          <div className="mt-3 rounded-[14px] border border-[#dcd6f4] bg-[#f6f4ff] px-4 py-3">
            <p className="text-xs font-black text-[#62539b]">검수된 대체 재료</p>
            <p className="mt-1 text-[11px] font-semibold leading-5 text-[#7467a9]">
              편집자가 등록한 대체 관계만 보여줍니다.
            </p>
            <ul className="mt-2 space-y-2">
              {substituteMatches.map((item, index) => (
                <li
                  key={item.recipeIngredient.id ?? `${item.recipeIngredient.name}-${index}`}
                  className="rounded-[12px] bg-white px-3 py-3"
                >
                  <p className="text-sm font-black text-[#4b3929]">
                    {item.recipeIngredient.name} 대신 {item.inventoryName}
                  </p>
                  {item.substitution?.ratio ? (
                    <p className="mt-1 text-[11px] font-bold text-[#62539b]">사용량: {item.substitution.ratio}</p>
                  ) : null}
                  {item.substitution?.caution ? (
                    <p className="mt-1 text-[11px] font-semibold leading-5 text-[#7467a9]">주의: {item.substitution.caution}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {unknownMatches.length > 0 ? (
          <div className="mt-3 rounded-[14px] border border-[#ded8d0] bg-[#f7f5f2] px-4 py-3">
            <p className="text-xs font-black text-[#5f554c]">판정 보류</p>
            <p className="mt-1 text-[11px] font-semibold leading-5 text-[#81766c]">
              재료 기준 정보가 없어 자동 판정과 장보기 추가에서 제외했습니다.
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {unknownMatches.map((item, index) => (
                <li
                  key={item.recipeIngredient.id ?? `${item.recipeIngredient.name}-${index}`}
                  className="rounded-full bg-white px-3 py-2 text-[12px] font-bold text-[#5f554c]"
                >
                  {item.recipeIngredient.name}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {missingMatches.length > 0 ? (
          <div className="mt-4 rounded-[14px] border border-[#eadcc9] bg-[#fffaf3] px-4 py-3">
            <p className="text-sm font-black text-[#2f2117]">
              필수 부족 재료 {missingMatches.length}개를 {activeScope === "family" ? "가족 장보기" : "내 장보기"}에 추가할 수 있어요.
            </p>
            <p className="mt-1 text-xs text-[#8f7f70]">
              선택 재료는 제외하고, 이미 담긴 항목은 다시 추가하지 않습니다.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {missingIngredientNames.map((ingredient) => {
                const alreadyInShopping = shoppingNames.has(normalizeKoreanIngredient(ingredient));
                const detail = detailByName.get(normalizeKoreanIngredient(ingredient));
                const checked = selectedMissingNames.has(ingredient) && !alreadyInShopping;
                return (
                  <button
                    key={ingredient}
                    type="button"
                    onClick={() => toggleMissingIngredient(ingredient)}
                    disabled={alreadyInShopping}
                    className={`min-h-11 max-w-full rounded-[14px] border px-3 py-2 text-left text-[12px] font-black ${
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
                        검수 정보: {detail.substitute}
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
      </div>
    </section>
  );
}
