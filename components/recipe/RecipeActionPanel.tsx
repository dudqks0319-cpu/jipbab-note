// 이 파일은 레시피 상세에서 재료 차감, 커뮤니티 공유, 카카오 공유 액션을 제공합니다.
"use client";

import { useState } from "react";
import { CheckCircle2, MessageCircle, Share2, Utensils } from "lucide-react";

import { useIngredients } from "@/hooks/useIngredients";
import { shareToKakaoOrNative } from "@/lib/kakao-share";
import { COMMUNITY_ENABLED } from "@/lib/release-flags";
import type { IngredientRecord } from "@/types";

const COMMUNITY_DRAFT_KEY = "jipbab-note-community-draft";

type RecipeActionPanelProps = {
  recipeId: string;
  recipeName: string;
  category: string;
  imageUrl: string | null;
  ingredientList: string[];
};

export function RecipeActionPanel({
  recipeId,
  recipeName,
  category,
  imageUrl,
  ingredientList,
}: RecipeActionPanelProps) {
  const { ingredients, consumeIngredients, restoreIngredientsSnapshot } = useIngredients();
  const [message, setMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [confirmingConsume, setConfirmingConsume] = useState(false);
  const [undoSnapshot, setUndoSnapshot] = useState<IngredientRecord[] | null>(null);

  const consumeRecipeIngredients = async () => {
    setWorking(true);
    setMessage(null);
    const snapshot = ingredients;
    try {
      const changedCount = await consumeIngredients(ingredientList);
      setConfirmingConsume(false);
      setUndoSnapshot(changedCount > 0 ? snapshot : null);
      setMessage(
        changedCount > 0
          ? `조리에 사용한 재료 ${changedCount}개를 냉장고에서 차감했습니다.`
          : "내 냉장고에서 일치하는 재료를 찾지 못했습니다.",
      );
    } finally {
      setWorking(false);
    }
  };

  const undoConsumeIngredients = async () => {
    if (!undoSnapshot) {
      return;
    }

    setWorking(true);
    try {
      const restored = await restoreIngredientsSnapshot(undoSnapshot);
      setUndoSnapshot(null);
      setMessage(restored ? "차감 전 냉장고 상태로 되돌렸습니다." : "차감 전 상태를 이 기기에 먼저 되돌렸습니다.");
    } finally {
      setWorking(false);
    }
  };

  const shareRecipe = async () => {
    setConfirmingConsume(false);
    setUndoSnapshot(null);
    const result = await shareToKakaoOrNative({
      title: recipeName,
      description: `${category} 레시피를 집밥노트에서 공유합니다.`,
      imageUrl,
      path: `/recipe/${recipeId}`,
    });

    setMessage(
      result === "kakao"
        ? "카카오톡 공유 창을 열었습니다."
        : result === "native"
          ? "기기 공유 창을 열었습니다."
          : "공유 링크를 복사했습니다.",
    );
  };

  const shareToCommunity = () => {
    if (typeof window === "undefined") {
      return;
    }

    setConfirmingConsume(false);
    setUndoSnapshot(null);
    window.localStorage.setItem(
      COMMUNITY_DRAFT_KEY,
      JSON.stringify({
        postType: "recipe",
        title: `${recipeName} 레시피 공유`,
        content: `${recipeName}을(를) 이렇게 만들어봤어요.\n\n재료: ${ingredientList.slice(0, 8).join(", ")}`,
        recipeId,
        imageUrl,
        linkUrl: `${window.location.origin}/recipe/${recipeId}`,
      }),
    );
    window.location.href = "/community";
  };

  return (
    <section className="mt-5 px-5">
      <div className="rounded-3xl bg-white p-4 shadow-soft">
        <div className={`grid gap-2 ${COMMUNITY_ENABLED ? "grid-cols-3" : "grid-cols-2"}`}>
          <button
            type="button"
            onClick={() => {
              setConfirmingConsume(true);
              setMessage(null);
            }}
            disabled={working}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-mint-100 px-2 py-3 text-xs font-bold text-mint-500 disabled:opacity-50"
          >
            <Utensils size={17} />
            조리 완료
          </button>
          {COMMUNITY_ENABLED ? (
            <button
              type="button"
              onClick={shareToCommunity}
              className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-lavender-100 px-2 py-3 text-xs font-bold text-gray-700"
            >
              <MessageCircle size={17} />
              커뮤니티
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              void shareRecipe();
            }}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-[#FEE500] px-2 py-3 text-xs font-bold text-[#191600]"
          >
            <Share2 size={17} />
            카카오톡
          </button>
        </div>

        {confirmingConsume ? (
          <div className="mt-3 rounded-2xl bg-amber-50 px-3 py-3">
            <p className="text-xs font-semibold leading-relaxed text-amber-800">
              조리 완료 처리 시 냉장고 재료 수량이 차감되거나 소진 재료가 삭제됩니다.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  void consumeRecipeIngredients();
                }}
                disabled={working}
                className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {working ? "차감 중..." : "차감하기"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingConsume(false)}
                disabled={working}
                className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-amber-700"
              >
                취소
              </button>
            </div>
          </div>
        ) : null}

        {message ? (
          <div className="mt-3 rounded-2xl bg-gray-50 px-3 py-2">
            <div className="flex items-start gap-2 text-xs font-semibold text-gray-600">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-mint-500" />
              <span>{message}</span>
            </div>
            {undoSnapshot ? (
              <button
                type="button"
                onClick={() => {
                  void undoConsumeIngredients();
                }}
                disabled={working}
                className="mt-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-gray-600 shadow-sm disabled:opacity-50"
              >
                되돌리기
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default RecipeActionPanel;
