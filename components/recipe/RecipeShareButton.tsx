// 이 파일은 레시피 상세 화면에서 iOS/웹 공유와 카카오톡 공유 진입점을 제공합니다.
"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";

import { buildRecipeShareUrl, type RecipeShareRoute } from "@/lib/recipe-share";

type RecipeShareButtonProps = {
  recipeName: string;
  recipeId: string;
  route?: RecipeShareRoute;
};

function getRecipeShareUrl(recipeId: string, route: RecipeShareRoute): string {
  if (typeof window === "undefined") {
    return "";
  }

  return buildRecipeShareUrl(window.location.origin, recipeId, route);
}

export default function RecipeShareButton({
  recipeName,
  recipeId,
  route = "detail",
}: RecipeShareButtonProps) {
  const [status, setStatus] = useState("");

  const shareRecipe = async () => {
    const url = getRecipeShareUrl(recipeId, route);
    const text = `집밥노트 레시피: ${recipeName}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: recipeName,
          text,
          url,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setStatus("공유 링크를 복사했어요");
        window.setTimeout(() => setStatus(""), 2200);
        return;
      } catch {
        setStatus("이 브라우저에서는 주소창의 링크를 복사해 주세요");
        return;
      }
    }

    setStatus("이 브라우저에서는 주소창의 링크를 복사해 주세요");
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          void shareRecipe();
        }}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#fffaf3]/92 text-[#2f2117] shadow-soft"
        aria-label="시스템 공유 또는 링크 복사로 레시피 공유"
      >
        <Share2 size={17} />
      </button>
      <span
        role="status"
        aria-live="polite"
        className={`pointer-events-none absolute right-0 top-12 z-30 w-max max-w-[220px] rounded-lg bg-[#2f2117] px-3 py-2 text-[12px] font-bold text-white shadow-lg transition-opacity ${
          status ? "opacity-100" : "opacity-0"
        }`}
      >
        {status}
      </span>
    </div>
  );
}
