import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { cache, type ReactNode } from "react";
import type { Metadata } from "next";
import {
  BookOpenText,
  ChevronLeft,
  Clock3,
  ShieldCheck,
  ShoppingBag,
  ShoppingBasket,
  Star,
  Users,
  Wrench,
} from "lucide-react";

import RecipeComments from "@/components/recipe/RecipeComments";
import RecipeCookMode from "@/components/recipe/RecipeCookMode";
import RecipeFavoriteButton from "@/components/recipe/RecipeFavoriteButton";
import RecipeImage from "@/components/recipe/RecipeImage";
import RecipeInstructionView from "@/components/recipe/RecipeInstructionView";
import RecipeIngredientList from "@/components/recipe/RecipeIngredientList";
import RecipeIssueReport from "@/components/recipe/RecipeIssueReport";
import RecipeShareButton from "@/components/recipe/RecipeShareButton";
import RecipeShoppingAssistant from "@/components/recipe/RecipeShoppingAssistant";
import { recipeApiV1DetailToRecord } from "@/lib/recipe-api-v1-client";
import { getPublicRecipeDetailV1 } from "@/lib/recipe-api-v1-repository";
import { isBeginnerRecipeGeneratedImage } from "@/lib/recipe-images";
import { isRecipeDetailPublicationApproved } from "@/lib/recipe-publication";
import type { RecipeDetailRecord } from "@/types";
import {
  getPhase6E2EFixtureDetail,
  shouldUsePhase6E2EFixture,
} from "@/lib/phase-6-e2e-fixture";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const fetchRecipeDetail = cache(async (recipeId: string): Promise<RecipeDetailRecord | null> => {
  if (!UUID_PATTERN.test(recipeId)) return null;
  try {
    const detail = await getPublicRecipeDetailV1(recipeId);
    return detail ? recipeApiV1DetailToRecord(detail) : null;
  } catch {
    return null;
  }
});

function formatDifficulty(difficulty: RecipeDetailRecord["difficulty"]): string {
  if (typeof difficulty === "number") {
    if (difficulty <= 1) return "쉬움";
    if (difficulty === 2) return "보통";
    return "어려움";
  }
  return difficulty?.toString().trim() || "미표시";
}

function DetailMetric({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="rounded-xl border border-[#ece8e2] bg-[#faf8f5] px-1.5 py-3">
      <span className="mx-auto flex h-5 w-5 items-center justify-center text-[#78a95f]">{icon}</span>
      <p className="mt-1 break-keep text-[12px] font-black leading-4 text-[#39342f]">{label}</p>
    </div>
  );
}

type RecipeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: RecipeDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const recipe = await fetchRecipeDetail(id);
  if (!recipe || !isRecipeDetailPublicationApproved(recipe)) {
    return {
      title: "검수 중인 레시피",
      description: "출처와 조리 안전 정보가 확인된 레시피만 공개합니다.",
      robots: { index: false, follow: false },
    };
  }
  const description = recipe.beginnerSummary || recipe.summary || `${recipe.name} 재료, 계량, 조리 순서와 실패 복구법을 확인하세요.`;
  const canonical = `/recipe/${recipe.id}`;
  return {
    title: `${recipe.name} 레시피`,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: `${recipe.name} | 집밥노트`,
      description,
      images: recipe.thumbnailUrl ? [{ url: recipe.thumbnailUrl, alt: recipe.imageAlt || `${recipe.name} 완성 사진` }] : [],
    },
  };
}

function recipeStructuredData(recipe: RecipeDetailRecord) {
  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.name,
    description: recipe.beginnerSummary || recipe.summary || undefined,
    image: recipe.thumbnailUrl ? [recipe.thumbnailUrl] : undefined,
    recipeYield: recipe.servings ? `${recipe.servings}인분` : undefined,
    totalTime: recipe.totalMinutes ? `PT${recipe.totalMinutes}M` : undefined,
    recipeCategory: recipe.category,
    recipeIngredient: (recipe.ingredientDetails ?? []).map((ingredient) => ingredient.display || ingredient.name),
    recipeInstructions: recipe.steps.map((step) => ({
      "@type": "HowToStep",
      name: step.title || `${step.index}단계`,
      text: step.action || step.description,
      image: step.imageUrl || undefined,
    })),
    author: { "@type": "Organization", name: recipe.sourceAttribution || "집밥노트" },
  };
}

export default async function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const { id } = await params;
  if (!id) notFound();

  const requestHeaders = await headers();
  const fixtureDetail = shouldUsePhase6E2EFixture(requestHeaders)
    ? getPhase6E2EFixtureDetail(id)
    : null;
  const recipe = fixtureDetail
    ? recipeApiV1DetailToRecord(fixtureDetail)
    : await fetchRecipeDetail(id);
  if (!recipe || !isRecipeDetailPublicationApproved(recipe)) {
    return (
      <div className="min-h-full bg-[#fbf6ee] px-5 py-10">
        <p className="rounded-2xl bg-amber-50 px-4 py-5 text-sm font-semibold leading-6 text-amber-800">
          이 레시피는 현재 검수 중이거나 잠시 불러올 수 없어요. 출처, 안전 안내와 실제 조리를 확인한 레시피만 공개합니다.
        </p>
        <Link
          href="/recipe"
          className="mt-4 inline-flex min-h-11 items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-700"
        >
          <ChevronLeft size={16} />
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const generatedImage = recipe.thumbnailUrl
    ? isBeginnerRecipeGeneratedImage(recipe.thumbnailUrl)
    : false;
  const ingredientDetails = recipe.ingredientDetails ?? [];
  const difficultyLabel = formatDifficulty(recipe.difficulty);
  const sourceLabel = recipe.sourceAttribution || recipe.sourceProvider || "출처 표시 없음";
  const sourceLicense = recipe.sourceLicense || "라이선스 표시 없음";
  const structuredData = JSON.stringify(recipeStructuredData(recipe)).replace(/</g, "\\u003c");

  return (
    <div className="min-h-full bg-white pb-8 text-[#2b2b2b]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
      <section className="relative overflow-hidden bg-white">
        <div className="mobile-safe-top absolute left-4 top-0 z-20">
          <Link
            href="/recipe"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-[#242424] shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
            aria-label="레시피 목록으로 돌아가기"
          >
            <ChevronLeft size={19} />
          </Link>
        </div>
        <div className="mobile-safe-top absolute right-4 top-0 z-20 flex gap-2">
          <RecipeShareButton recipeName={recipe.name} recipeId={recipe.id} />
          <RecipeFavoriteButton
            id={recipe.id}
            name={recipe.name}
            category={recipe.category}
            thumbnailUrl={recipe.thumbnailUrl}
            publicationEvidence={recipe.publicationEvidence}
          />
        </div>

        {recipe.thumbnailUrl ? (
          <RecipeImage
            src={recipe.thumbnailUrl}
            alt={recipe.imageAlt || `${recipe.name} 완성 사진`}
            className="h-[320px] w-full overflow-hidden bg-[#eee7dd] min-[390px]:h-[360px]"
            imageClassName={`h-full w-full ${generatedImage ? "object-contain p-2" : "object-cover"}`}
          />
        ) : (
          <div className="flex h-[250px] w-full items-center justify-center bg-[#f3eee7] text-sm font-bold text-[#81766d]">
            등록된 완성 사진이 없어요
          </div>
        )}

        <div className="px-5 py-7 min-[390px]:px-6">
          <p className="text-[12px] font-black text-[#78a95f]">{recipe.category}</p>
          <h1 className="mt-2 break-keep text-[32px] font-black leading-[1.24] text-[#2d2d2d] min-[390px]:text-[36px]">
            {recipe.name}
          </h1>
          {recipe.beginnerSummary ? (
            <p className="mt-4 break-keep text-[17px] font-medium leading-[1.65] text-[#4b4540]">
              {recipe.beginnerSummary}
            </p>
          ) : null}
          <div className="mt-6 grid grid-cols-4 gap-2 text-center">
            <DetailMetric icon={<Clock3 size={16} />} label={`${recipe.totalMinutes}분`} />
            <DetailMetric icon={<Users size={16} />} label={`${recipe.servings}인분`} />
            <DetailMetric icon={<Star size={16} />} label={difficultyLabel} />
            <DetailMetric icon={<ShoppingBasket size={16} />} label={`${ingredientDetails.length}개`} />
          </div>
        </div>
      </section>

      <section className="px-5 pb-2">
        <div className="grid grid-cols-3 gap-2">
          <a href="#ingredients" className="flex min-h-12 items-center justify-center gap-1 rounded-xl bg-[#fff5e9] px-2 text-sm font-black text-[#d94d19]">
            <ShoppingBasket size={18} /> 재료 확인
          </a>
          <a href="#instructions" className="flex min-h-12 items-center justify-center gap-1 rounded-xl bg-[#eef6df] px-2 text-sm font-black text-[#4f8740]">
            <BookOpenText size={18} /> 조리 순서
          </a>
          <a href="#shopping-assistant" className="flex min-h-12 items-center justify-center gap-1 rounded-xl bg-[#f2edfb] px-2 text-sm font-black text-[#7652b7]">
            <ShoppingBag size={18} /> 장보기
          </a>
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

      <RecipeIngredientList
        recipeId={recipe.id}
        baseServings={recipe.servings}
        ingredients={ingredientDetails}
        isTestFixture={recipe.isTestFixture}
      />

      <RecipeShoppingAssistant
        recipeId={recipe.id}
        recipeName={recipe.name}
        ingredientList={recipe.ingredientList}
        ingredientDetails={ingredientDetails}
      />

      <RecipeInstructionView recipeName={recipe.name} steps={recipe.steps} />
      <RecipeCookMode recipeId={recipe.id} recipeName={recipe.name} steps={recipe.steps} />

      {recipe.safetyNotes?.length ? (
        <section className="px-5 pt-6">
          <div className="rounded-2xl border border-[#f0dfcb] bg-[#fff9f0] px-4 py-4">
            <div className="flex items-center gap-2 text-[#b55c24]">
              <ShieldCheck size={18} />
              <h2 className="text-[18px] font-black">안전하게 만들기</h2>
            </div>
            <ul className="mt-3 space-y-2">
              {recipe.safetyNotes.map((note) => (
                <li key={note} className="break-keep rounded-xl bg-white px-3 py-3 text-[13px] font-semibold leading-6 text-[#6e431d]">
                  {note}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="px-5 pt-6">
        <div className="grid gap-2 rounded-2xl border border-[#ece8e2] bg-[#faf8f5] px-4 py-4">
          <h2 className="text-[19px] font-black text-[#242424]">남았을 때</h2>
          <p className="rounded-xl bg-white px-3 py-3 text-[13px] font-bold leading-6 text-[#5d554d]">보관: {recipe.storageTip}</p>
          <p className="rounded-xl bg-white px-3 py-3 text-[13px] font-bold leading-6 text-[#5d554d]">다시 데우기: {recipe.reheatTip}</p>
        </div>
      </section>

      {!recipe.isTestFixture ? (
        <div id="recipe-qna" className="scroll-mt-24">
          <RecipeComments recipeId={recipe.id} recipeName={recipe.name} />
        </div>
      ) : null}

      {!recipe.isTestFixture ? (
        <RecipeIssueReport recipeId={recipe.id} recipeName={recipe.name} />
      ) : null}

      <section className="px-5 pb-24 pt-6">
        <div className="rounded-2xl border border-[#ece8e2] bg-[#faf8f5] px-4 py-4">
          <h2 className="text-[15px] font-black text-[#242424]">레시피 출처</h2>
          <p className="mt-2 break-keep text-[13px] font-semibold leading-6 text-[#6f655b]">{sourceLabel} · {sourceLicense}</p>
          <p className="mt-1 break-keep text-[12px] font-semibold leading-5 text-[#7a7168]">
            제공자: {recipe.sourceProvider}{recipe.sourceExternalId ? ` · 원천 ID: ${recipe.sourceExternalId}` : ""}
          </p>
          {recipe.sourceUrl ? (
            <Link
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex min-h-11 items-center text-[13px] font-black text-[#d94d19] underline underline-offset-2"
            >
              원천 페이지 확인
            </Link>
          ) : null}
        </div>
      </section>

      <nav className="px-5 pb-4">
        <div className="grid grid-cols-2 gap-2">
          <a href="#instructions" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#242424] px-3 text-[13px] font-black text-white">
            <BookOpenText size={16} /> 순서 보기
          </a>
          <a href="#shopping-assistant" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#78a95f] px-3 text-[13px] font-black text-white">
            <ShoppingBasket size={16} /> 부족 재료 장보기
          </a>
        </div>
      </nav>
    </div>
  );
}
