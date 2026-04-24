// 이 파일은 레시피 상세 화면에서 iOS/웹 공유와 카카오톡 공유 진입점을 제공합니다.
"use client";

import { Share2 } from "lucide-react";

type RecipeShareButtonProps = {
  recipeName: string;
  recipeId: string;
};

function getRecipeShareUrl(recipeId: string): string {
  if (typeof window === "undefined") {
    return "";
  }

  return `${window.location.origin}/recipe/${recipeId}`;
}

export default function RecipeShareButton({ recipeName, recipeId }: RecipeShareButtonProps) {
  const shareRecipe = async () => {
    const url = getRecipeShareUrl(recipeId);
    const text = `집밥노트 레시피: ${recipeName}`;

    if (navigator.share) {
      await navigator.share({
        title: recipeName,
        text,
        url,
      });
      return;
    }

    const kakaoUrl = `kakaotalk://sendurl?msg=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.location.href = kakaoUrl;
  };

  return (
    <button
      type="button"
      onClick={() => {
        void shareRecipe();
      }}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#fffaf3]/92 text-[#2f2117] shadow-soft"
      aria-label="카카오톡 또는 시스템 공유로 레시피 공유"
    >
      <Share2 size={17} />
    </button>
  );
}
