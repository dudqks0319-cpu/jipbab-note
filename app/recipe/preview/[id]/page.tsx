// 이 파일은 조리 승인 전 자체 작성 레시피를 읽기 전용 미리보기로 보여줍니다.
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  Clock3,
  Eye,
  ShieldAlert,
  Users,
  Wrench,
} from "lucide-react";

import RecipeImage from "@/components/recipe/RecipeImage";
import RecipeInstructionView from "@/components/recipe/RecipeInstructionView";
import { findRecipePreview } from "@/lib/recipe-preview";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

type RecipePreviewPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RecipePreviewPage({ params }: RecipePreviewPageProps) {
  const { id } = await params;
  const recipe = findRecipePreview(id);
  if (!recipe) notFound();

  const ingredients = recipe.ingredientDetails ?? [];

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

        <RecipeImage
          src={recipe.thumbnailUrl ?? ""}
          alt={`${recipe.name} 완성 예시 이미지`}
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
          <p className="mt-2 text-[12px] font-bold text-[#8f7f70]">
            집밥노트 자체 작성 · 자체 제작 이미지
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#faf5ef] text-sm font-black text-[#4b3929]">
              <Clock3 size={17} /> {recipe.totalMinutes}분
            </div>
            <div className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#faf5ef] text-sm font-black text-[#4b3929]">
              <Users size={17} /> {recipe.servings}인분
            </div>
          </div>
        </div>
      </section>

      <section className="px-5">
        <div role="note" className="rounded-2xl border border-[#ffd1bd] bg-[#fff5ed] px-4 py-4">
          <div className="flex items-start gap-2 text-[#9a431c]">
            <ShieldAlert size={19} className="mt-0.5 shrink-0" />
            <div>
              <h2 className="text-[15px] font-black">아직 조리 승인 전이에요</h2>
              <p className="mt-1 break-keep text-[13px] font-semibold leading-5">
                자체 작성한 레시피를 먼저 둘러보는 읽기 전용 화면입니다. 실제 조리·안전 검수가 끝날 때까지 추천, 조리 모드, 장보기 연결은 열지 않습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {recipe.requiredTools?.length ? (
        <section className="px-5 pt-6">
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

      <section className="px-5 py-8">
        <h2 className="border-b-2 border-[#2d2d2d] pb-3 text-[25px] font-black">재료</h2>
        <ul className="divide-y divide-[#ededed]">
          {ingredients.map((ingredient) => (
            <li key={`${ingredient.name}-${ingredient.display}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-4">
              <div>
                <p className="text-[17px] font-bold">{ingredient.name}</p>
                {ingredient.prepNote ? (
                  <p className="mt-1 text-[13px] font-semibold leading-5 text-[#7a7168]">손질: {ingredient.prepNote}</p>
                ) : null}
              </div>
              <span className="text-right text-[16px] font-bold">{ingredient.display}</span>
            </li>
          ))}
        </ul>
      </section>

      <RecipeInstructionView recipeName={recipe.name} steps={recipe.steps} />

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
