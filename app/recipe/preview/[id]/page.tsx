import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookOpenText,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Eye,
  FileCheck2,
  ListChecks,
  ShieldAlert,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";

import RecipeImage from "@/components/recipe/RecipeImage";
import RecipeInstructionView from "@/components/recipe/RecipeInstructionView";
import RecipeShareButton from "@/components/recipe/RecipeShareButton";
import { findRecipePreview } from "@/lib/recipe-preview";

type RecipePreviewPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RecipePreviewPage({ params }: RecipePreviewPageProps) {
  const { id } = await params;
  const recipe = findRecipePreview(id);
  if (!recipe) notFound();

  const ingredients = recipe.ingredientDetails ?? [];
  const requiredIngredientCount = ingredients.filter((ingredient) => ingredient.required !== false).length;
  const toolCount = recipe.requiredTools?.length ?? 0;

  return (
    <div className="min-h-full bg-white pb-10 text-[#2b2b2b]">
      <section className="relative overflow-hidden bg-white">
        <div className="mobile-safe-top absolute left-4 top-0 z-20">
          <Link
            href="/recipe"
            aria-label="레시피 목록으로 돌아가기"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-[#242424] shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
          >
            <ChevronLeft size={19} />
          </Link>
        </div>
        <div className="mobile-safe-top absolute right-4 top-0 z-20">
          <RecipeShareButton recipeName={recipe.name} recipeId={recipe.id} route="preview" />
        </div>

        <RecipeImage
          src={recipe.thumbnailUrl ?? ""}
          alt={`${recipe.name} 완성 사진`}
          className="h-[300px] w-full overflow-hidden bg-[#eee7dd] min-[390px]:h-[350px]"
          imageClassName="h-full w-full object-cover"
        />

        <div className="px-5 py-6">
          <div className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-[#fff0e4] px-3 text-[12px] font-black text-[#c94a18]">
            <Eye size={14} />
            검수 중 미리보기
          </div>
          <h1 className="mt-3 break-keep text-[32px] font-black leading-tight text-[#2d2d2d]">
            {recipe.name}
          </h1>
          <p className="mt-3 break-keep text-[15px] font-semibold leading-6 text-[#61584f]">
            {recipe.beginnerSummary ?? recipe.featuredReason}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#faf5ef] text-sm font-black text-[#4b3929]">
              <Clock3 size={17} /> {recipe.totalMinutes}분
            </div>
            <div className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#faf5ef] text-sm font-black text-[#4b3929]">
              <Users size={17} /> {recipe.servings}인분
            </div>
            <div className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#faf5ef] text-sm font-black text-[#4b3929]">
              <ListChecks size={17} /> {recipe.steps.length}단계
            </div>
            <div className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#faf5ef] text-sm font-black text-[#4b3929]">
              <Wrench size={17} /> 도구 {toolCount}개
            </div>
          </div>
        </div>
      </section>

      <section className="px-5">
        <nav aria-label="레시피 바로가기" className="mb-4 grid grid-cols-3 gap-2">
          <a
            href="#ingredients"
            className="flex min-h-11 items-center justify-center rounded-full border border-[#eadcc9] bg-white px-2 text-[12px] font-black text-[#4b3929]"
          >
            필수 {requiredIngredientCount}개
          </a>
          <a
            href="#instructions"
            className="flex min-h-11 items-center justify-center rounded-full border border-[#eadcc9] bg-white px-2 text-[12px] font-black text-[#4b3929]"
          >
            조리 {recipe.steps.length}단계
          </a>
          <a
            href="#recipe-review-status"
            className="flex min-h-11 items-center justify-center rounded-full border border-[#eadcc9] bg-white px-2 text-[12px] font-black text-[#4b3929]"
          >
            검수 상태
          </a>
        </nav>
        <div role="note" className="rounded-2xl border border-[#ffd1bd] bg-[#fff5ed] px-4 py-4">
          <div className="flex items-start gap-2 text-[#9a431c]">
            <ShieldAlert size={19} className="mt-0.5 shrink-0" />
            <div>
              <h2 className="text-[15px] font-black">아직 조리 승인 전이에요</h2>
              <p className="mt-1 break-keep text-[13px] font-semibold leading-5">
                자체 작성한 레시피 내용을 먼저 볼 수 있도록 공개한 미리보기입니다. 실제 조리·안전 검수가 끝날 때까지 조리 모드와 장보기 연결은 열지 않습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {recipe.beforeStart?.length || recipe.measurementTips?.length ? (
        <section className="px-5 pt-6">
          <div className="rounded-2xl border border-[#eadcc9] bg-[#fffaf3] px-4 py-4">
            <div className="flex items-center gap-2 text-[#4b3929]">
              <CheckCircle2 size={19} />
              <h2 className="text-[17px] font-black">요리 전에 준비해요</h2>
            </div>
            {recipe.beforeStart?.length ? (
              <ul className="mt-3 space-y-2">
                {recipe.beforeStart.map((item) => (
                  <li key={item} className="flex items-start gap-2 break-keep text-[13px] font-semibold leading-5 text-[#6a625a]">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#6b9d53]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {recipe.measurementTips?.length ? (
              <details className="mt-4 border-t border-[#eadcc9] pt-3">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-[13px] font-black text-[#9a431c]">
                  <BookOpenText size={16} /> 계량법 보기
                </summary>
                <ul className="space-y-2 pb-1 pt-2">
                  {recipe.measurementTips.map((tip) => (
                    <li key={tip} className="break-keep text-[13px] font-semibold leading-5 text-[#6a625a]">
                      · {tip}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        </section>
      ) : null}

      {recipe.requiredTools?.length ? (
        <section id="tools" className="scroll-mt-24 px-5 pt-6">
          <div className="rounded-2xl border border-[#dcebd2] bg-[#f4fbef] px-4 py-4">
            <div className="flex items-center gap-2 text-[#4f8740]">
              <Wrench size={18} />
              <h2 className="text-[17px] font-black">필요한 조리도구</h2>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {recipe.requiredTools.map((tool) => (
                <span key={tool} className="rounded-full bg-white px-3 py-2 text-[13px] font-bold text-[#426e35]">
                  {tool}
                </span>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section id="ingredients" className="scroll-mt-24 px-5 py-8">
        <h2 className="border-b-2 border-[#2d2d2d] pb-3 text-[25px] font-black">재료</h2>
        <ul className="divide-y divide-[#ededed]">
          {ingredients.map((ingredient) => (
            <li key={`${ingredient.name}-${ingredient.display}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[17px] font-bold">{ingredient.name}</p>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-black ${
                      ingredient.required === false
                        ? "bg-[#f1eee9] text-[#74695f]"
                        : "bg-[#eef6df] text-[#4f8740]"
                    }`}
                  >
                    {ingredient.required === false ? "선택 재료" : "필수 재료"}
                  </span>
                </div>
                {ingredient.prepNote ? (
                  <p className="mt-1 text-[13px] font-semibold leading-5 text-[#7a7168]">손질: {ingredient.prepNote}</p>
                ) : null}
                {ingredient.beginnerNote && ingredient.beginnerNote !== ingredient.prepNote ? (
                  <p className="mt-1 break-keep text-[13px] font-semibold leading-5 text-[#6a625a]">준비 팁: {ingredient.beginnerNote}</p>
                ) : null}
                {ingredient.substitute ? (
                  <p className="mt-1 break-keep text-[13px] font-semibold leading-5 text-[#4f8740]">대체: {ingredient.substitute}</p>
                ) : null}
              </div>
              <span className="break-keep text-right text-[16px] font-bold">{ingredient.display}</span>
            </li>
          ))}
        </ul>
      </section>

      <RecipeInstructionView recipeName={recipe.name} steps={recipe.steps} />

      {recipe.storageTip || recipe.reheatTip ? (
        <section className="px-5 pt-6">
          <div className="rounded-2xl border border-[#dcebd2] bg-[#f4fbef] px-4 py-4">
            <div className="flex items-center gap-2 text-[#426e35]">
              <FileCheck2 size={18} />
              <h2 className="text-[17px] font-black">먹고 남았을 때</h2>
            </div>
            <div className="mt-3 space-y-2 text-[13px] font-semibold leading-5 text-[#5d6958]">
              {recipe.storageTip ? <p><span className="font-black">보관:</span> {recipe.storageTip}</p> : null}
              {recipe.reheatTip ? <p><span className="font-black">다시 데우기:</span> {recipe.reheatTip}</p> : null}
            </div>
          </div>
        </section>
      ) : null}

      <section id="recipe-review-status" className="scroll-mt-24 px-5 pt-6">
        <div className="rounded-2xl border border-[#d8e2ee] bg-[#f5f8fc] px-4 py-4">
          <div className="flex items-center gap-2 text-[#355b7a]">
            <ShieldCheck size={19} />
            <h2 className="text-[17px] font-black">레시피 작성 및 검수 상태</h2>
          </div>
          <dl className="mt-3 grid gap-2 text-[13px] font-semibold leading-5 text-[#526475]">
            <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-2">
              <dt className="font-black">콘텐츠</dt>
              <dd>{recipe.source?.sourceName ?? "집밥노트 자체 작성"}</dd>
            </div>
            <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-2">
              <dt className="font-black">이미지</dt>
              <dd>{recipe.source?.imageUsageAllowed ? "앱 사용 가능 여부 확인" : "권리 확인 중"}</dd>
            </div>
            <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-2">
              <dt className="font-black">실제 조리 검수</dt>
              <dd>진행 중</dd>
            </div>
            <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-2">
              <dt className="font-black">식품 안전 검수</dt>
              <dd>진행 중</dd>
            </div>
          </dl>
          {recipe.source?.licenseOrUsageNote ? (
            <p className="mt-3 break-keep border-t border-[#d8e2ee] pt-3 text-[12px] font-semibold leading-5 text-[#647789]">
              {recipe.source.licenseOrUsageNote}
            </p>
          ) : null}
        </div>
      </section>

      <section className="px-5 pt-6">
        <Link
          href="/recipe"
          className="flex min-h-12 w-full items-center justify-center rounded-[14px] bg-[#2f2117] px-4 text-sm font-black text-white"
        >
          다른 레시피 미리보기
        </Link>
      </section>
    </div>
  );
}
