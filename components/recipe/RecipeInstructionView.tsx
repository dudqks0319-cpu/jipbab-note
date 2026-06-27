// 이 파일은 레시피 상세의 조리순서 보기 전환 UI를 담당합니다.
"use client";

import { useState } from "react";
import { Grid2X2, List, Rows3 } from "lucide-react";

import type { RecipeDetailStep } from "@/types";
import RecipeImage from "@/components/recipe/RecipeImage";

type RecipeInstructionViewProps = {
  recipeName: string;
  steps: RecipeDetailStep[];
};

type InstructionMode = "compact" | "list" | "text";

const modeOptions: Array<{ id: InstructionMode; label: string; icon: typeof Grid2X2 }> = [
  { id: "compact", label: "요약", icon: Grid2X2 },
  { id: "list", label: "상세", icon: Rows3 },
  { id: "text", label: "전체", icon: List },
];

function getStepTools(step: RecipeDetailStep): string[] {
  const source = [step.beginnerTip, step.description].filter(Boolean).join(" ");
  const tools = ["프라이팬", "냄비", "전자레인지", "도마", "칼", "볼", "주걱", "채망"].filter((tool) =>
    source.includes(tool),
  );
  return tools.length > 0 ? tools.slice(0, 3) : ["조리도구 확인"];
}

function getHeatLabel(step: RecipeDetailStep): string | null {
  if (step.heat) {
    return String(step.heat);
  }
  const text = step.description;
  if (text.includes("강불")) return "강불";
  if (text.includes("중불")) return "중불";
  if (text.includes("약불")) return "약불";
  if (text.includes("불을 끄") || text.includes("불 끄")) return "불 끄기";
  return null;
}

export default function RecipeInstructionView({ recipeName, steps }: RecipeInstructionViewProps) {
  const [mode, setMode] = useState<InstructionMode>("list");
  const hasAnyStepImage = steps.some((step) => Boolean(step.imageUrl));

  if (steps.length === 0) {
    return null;
  }

  return (
    <section id="instructions" className="scroll-mt-24 bg-white px-5 py-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[27px] font-black tracking-normal text-[#242424]">조리순서</h2>
        <div className="flex shrink-0 rounded-[8px] border border-[#dedbd6] bg-white">
          {modeOptions.map((option) => {
            const Icon = option.icon;
            const active = option.id === mode;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setMode(option.id)}
                aria-label={`조리순서 ${option.label} 보기`}
                aria-pressed={active}
                className={`flex h-11 w-12 items-center justify-center border-l border-[#dedbd6] first:border-l-0 ${
                  active ? "bg-[#242424] text-white" : "text-[#bdb8b1]"
                }`}
              >
                <Icon size={20} />
              </button>
            );
          })}
        </div>
      </div>

      <ol className={mode === "compact" ? "mt-6 grid gap-3" : hasAnyStepImage ? "mt-7 space-y-12" : "mt-6 space-y-8"}>
        {steps.map((step) => {
          const tools = getStepTools(step);
          const heatLabel = getHeatLabel(step);
          const showMediaColumn = mode !== "text" && Boolean(step.imageUrl);
          const gridClassName = showMediaColumn
            ? "grid grid-cols-[38px_minmax(0,1fr)_112px] gap-4 min-[390px]:grid-cols-[42px_minmax(0,1fr)_128px]"
            : "grid grid-cols-[34px_minmax(0,1fr)] gap-3 min-[390px]:grid-cols-[38px_minmax(0,1fr)]";
          const textClassName = showMediaColumn
            ? "break-keep text-[21px] font-medium leading-[1.58] tracking-normal text-[#2d2d2d] min-[390px]:text-[23px] [overflow-wrap:anywhere]"
            : "break-keep text-[18px] font-semibold leading-[1.62] tracking-normal text-[#2d2d2d] min-[390px]:text-[19px] [overflow-wrap:anywhere]";
          const metaClassName = showMediaColumn
            ? "mt-5 space-y-1.5 text-[16px] font-semibold leading-6 text-[#79a967]"
            : "mt-4 flex flex-wrap gap-1.5 text-[11px] font-black leading-4 text-[#5f8f4f]";
          const noteClassName = showMediaColumn
            ? "ml-[54px] mt-4 space-y-2 rounded-[8px] bg-[#f8f5f0] px-3 py-3 text-[13px] font-semibold leading-5 text-[#6f655b] min-[390px]:ml-[58px]"
            : "mt-3 space-y-2 rounded-[8px] bg-[#f8f5f0] px-3 py-3 text-[12px] font-semibold leading-5 text-[#6f655b] min-[390px]:text-[13px]";

          return (
            <li key={step.index} className={mode === "compact" ? "rounded-[8px] border border-[#ece8e2] p-4" : ""}>
              <div className={gridClassName}>
                <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#f3eadf] text-[18px] font-black leading-none text-[#2b2b2b] min-[390px]:h-9 min-[390px]:w-9">
                  {step.index}
                </span>
                <div className="min-w-0">
                  {step.title ? (
                    <p className="mb-1 text-[13px] font-black text-[#6b9d53]">{step.title}</p>
                  ) : null}
                  <p className={textClassName}>
                    {mode === "compact" ? step.action || step.description.split(".")[0] : step.action || step.description}
                  </p>
                  <div className={metaClassName}>
                    {tools.length > 0 ? (
                      <p className={showMediaColumn ? "break-keep" : "rounded-full bg-[#eef6df] px-2 py-1"}>
                        {showMediaColumn ? `• ${tools.join(" · ")}` : tools.join(" · ")}
                      </p>
                    ) : null}
                    {heatLabel ? (
                      <p className={showMediaColumn ? "break-keep" : "rounded-full bg-[#eef6df] px-2 py-1"}>
                        {showMediaColumn ? `• ${heatLabel}` : heatLabel}
                      </p>
                    ) : null}
                    {step.minutes ? (
                      <p className={showMediaColumn ? "break-keep" : "rounded-full bg-[#eef6df] px-2 py-1"}>
                        {showMediaColumn ? `• ${step.minutes}분` : `${step.minutes}분`}
                      </p>
                    ) : null}
                  </div>
                </div>
                {showMediaColumn && step.imageUrl ? (
                  <RecipeImage
                    src={step.imageUrl}
                    alt={step.imageAlt || `${recipeName} 조리 순서 ${step.index}`}
                    className="relative mt-1 h-[74px] w-full overflow-hidden rounded-[8px] bg-[#f2eee8] min-[390px]:h-[82px]"
                    imageClassName="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              {mode !== "compact" && (step.visualCue || step.beginnerTip) ? (
                <div className={noteClassName}>
                  {step.visualCue ? <p>눈으로 확인: {step.visualCue}</p> : null}
                  {step.beginnerTip ? <p>초보 팁: {step.beginnerTip}</p> : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
