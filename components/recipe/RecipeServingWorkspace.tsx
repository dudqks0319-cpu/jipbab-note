"use client";

import { useMemo, useState } from "react";
import { Clock3, Users, Wrench } from "lucide-react";

import RecipeCookMode from "@/components/recipe/RecipeCookMode";
import RecipeInstructionView from "@/components/recipe/RecipeInstructionView";
import RecipeShoppingAssistant from "@/components/recipe/RecipeShoppingAssistant";
import { applyRecipeServingOption } from "@/lib/recipe-servings";
import type {
  RecipeDetailStep,
  RecipeIngredientDetail,
  RecipePublicationEvidence,
  RecipeServingOption,
} from "@/types";

type RecipeServingWorkspaceProps = {
  recipeId: string;
  recipeVersion: number;
  cookModeEnabled: boolean;
  recipeName: string;
  category: string;
  thumbnailUrl: string | null;
  publicationEvidence: RecipePublicationEvidence;
  ingredientList: string[];
  ingredientDetails: RecipeIngredientDetail[];
  baseServings: number;
  servingOptions: RecipeServingOption[];
  requiredTools: string[];
  storageTip: string | null;
  reheatTip: string | null;
  steps: RecipeDetailStep[];
};

export default function RecipeServingWorkspace({
  recipeId,
  recipeVersion,
  cookModeEnabled,
  recipeName,
  category,
  thumbnailUrl,
  publicationEvidence,
  ingredientList,
  ingredientDetails,
  baseServings,
  servingOptions,
  requiredTools,
  storageTip,
  reheatTip,
  steps,
}: RecipeServingWorkspaceProps) {
  const [selectedServings, setSelectedServings] = useState(baseServings);
  const selectedOption = useMemo(
    () => servingOptions.find((option) => option.servings === selectedServings) ?? null,
    [selectedServings, servingOptions],
  );
  const selectedIngredients = useMemo(
    () => selectedOption ? applyRecipeServingOption(ingredientDetails, selectedOption) : null,
    [ingredientDetails, selectedOption],
  );

  if (!selectedOption || !selectedIngredients) {
    return (
      <section className="px-5 py-8" role="status">
        <p className="rounded-2xl bg-amber-50 px-4 py-5 text-sm font-semibold leading-6 text-amber-800">
          이 인분의 검수된 수량과 조리 안내를 확인하지 못했어요. 다른 레시피를 선택해 주세요.
        </p>
      </section>
    );
  }

  return (
    <>
      <section id="servings" className="scroll-mt-24 px-5 pt-6">
        <div className="rounded-2xl border border-[#eadcc9] bg-[#fffaf3] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[#6f4b2e]">
              <Users size={18} />
              <h2 className="text-[18px] font-black">인분 선택</h2>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-[12px] font-black text-[#a63b13]">
              {selectedServings}인분
            </span>
          </div>
          <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(servingOptions.length, 4)}, minmax(0, 1fr))` }}>
            {servingOptions.map((option) => (
              <button
                key={option.servings}
                type="button"
                onClick={() => setSelectedServings(option.servings)}
                aria-pressed={selectedServings === option.servings}
                className={`min-h-11 rounded-xl border px-2 text-[13px] font-black ${
                  selectedServings === option.servings
                    ? "border-[#d94d19] bg-[#d94d19] text-white"
                    : "border-[#eadcc9] bg-white text-[#6f4b2e]"
                }`}
              >
                {option.servings}인분{option.servings === baseServings ? " · 기준" : ""}
              </button>
            ))}
          </div>
          <p className="mt-3 break-keep text-[12px] font-semibold leading-5 text-[#7a7168]">
            실제 검수된 인분만 선택할 수 있어요. 수량·도구·시간 안내를 임의로 배수하지 않습니다.
          </p>
          <div className="mt-3 grid gap-2" aria-live="polite">
            <p className="flex items-start gap-2 rounded-xl bg-white px-3 py-3 text-[13px] font-bold leading-6 text-[#5d554d]">
              <Wrench size={16} className="mt-1 shrink-0 text-[#6b8f58]" />
              <span><strong>도구:</strong> {selectedOption.toolGuidance}</span>
            </p>
            <p className="flex items-start gap-2 rounded-xl bg-white px-3 py-3 text-[13px] font-bold leading-6 text-[#5d554d]">
              <Clock3 size={16} className="mt-1 shrink-0 text-[#6b8f58]" />
              <span><strong>시간:</strong> {selectedOption.timeGuidance}</span>
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 pt-6">
        <div className="rounded-2xl border border-[#dcebd2] bg-[#f4fbef] px-4 py-4">
          <div className="flex items-center gap-2 text-[#4f8740]">
            <Wrench size={18} />
            <h2 className="text-[17px] font-black">필요한 조리도구</h2>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {requiredTools.map((tool) => (
              <span key={tool} className="rounded-full bg-white px-3 py-2 text-[13px] font-bold text-[#426e35]">
                {tool}
              </span>
            ))}
          </div>
          <p className="mt-3 rounded-xl bg-white px-3 py-3 text-[13px] font-bold leading-6 text-[#426e35]">
            {selectedServings}인분 도구 안내: {selectedOption.toolGuidance}
          </p>
        </div>
      </section>

      <section id="ingredients" className="scroll-mt-24 px-5 py-8">
        <div className="border-b-2 border-[#2d2d2d] pb-3">
          <h2 className="text-[26px] font-black text-[#242424]">재료</h2>
          <p className="mt-1 text-sm font-semibold text-[#7a7168]">{selectedServings}인분 기준</p>
        </div>
        <ul className="divide-y divide-[#ededed]">
          {selectedIngredients.map((ingredient) => (
            <li key={ingredient.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-4">
              <div className="min-w-0">
                <p className="break-keep text-[18px] font-bold leading-7 text-[#303030]">
                  {ingredient.name}
                  {ingredient.required === false ? <span className="ml-2 text-xs text-[#8d8177]">선택</span> : null}
                </p>
                {ingredient.prepNote ? <p className="mt-1 text-[13px] font-semibold leading-5 text-[#7a7168]">손질: {ingredient.prepNote}</p> : null}
                {ingredient.substitute ? <p className="mt-1 text-[13px] font-semibold leading-5 text-[#6b8f58]">검수된 대체: {ingredient.substitute}</p> : null}
              </div>
              <span className="break-keep text-right text-[17px] font-bold leading-7 text-[#303030]">{ingredient.display}</span>
            </li>
          ))}
        </ul>
      </section>

      <RecipeShoppingAssistant
        recipeId={recipeId}
        recipeName={recipeName}
        ingredientList={ingredientList}
        ingredientDetails={selectedIngredients}
      />

      <RecipeInstructionView recipeName={recipeName} steps={steps} />
      {cookModeEnabled ? (
        <RecipeCookMode
          key={`${recipeId}-${selectedServings}`}
          recipeId={recipeId}
          recipeVersion={recipeVersion}
          recipeName={recipeName}
          category={category}
          thumbnailUrl={thumbnailUrl}
          publicationEvidence={publicationEvidence}
          ingredientList={ingredientList}
          ingredientDetails={selectedIngredients}
          requiredTools={requiredTools}
          servings={selectedServings}
          baseServings={baseServings}
          storageTip={storageTip}
          reheatTip={reheatTip}
          steps={steps}
        />
      ) : (
        <section id="cook-mode" className="scroll-mt-24 px-5 pb-8 pt-5" aria-labelledby="cook-mode-rollout-title">
          <div className="border-t border-[#ece8e2] pt-6">
            <h2 id="cook-mode-rollout-title" className="text-[19px] font-black text-[#2f2117]">
              한 단계 조리 모드 준비 중
            </h2>
            <p className="mt-2 break-keep text-[14px] font-semibold leading-6 text-[#6f655b]">
              조리 모드는 순차적으로 열고 있어요. 위의 조리순서는 그대로 확인할 수 있어요.
            </p>
          </div>
        </section>
      )}
    </>
  );
}
