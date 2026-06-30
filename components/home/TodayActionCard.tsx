import Link from 'next/link'
import { Clock3, ShoppingBasket, Utensils } from 'lucide-react'

import { buildHomeHref, getTodayActionPrimaryCta, getTodayActionSecondaryCta } from '@/lib/home-actions'
import { getEssentialMissingIngredients } from '@/lib/matching'
import { isBeginnerRecipeGeneratedImage } from '@/lib/recipe-images'

const FALLBACK_RECIPE_IMAGE = '/images/recipes/kimchi-fried-rice.png'

export type TodayActionRecipe = {
  id: string
  name: string
  thumbnailUrl: string | null
  matchedIngredients: string[]
  missingIngredients: string[]
  recommendationReason: string
  expiringIngredients?: string[]
  totalMinutes?: number | null
  requiredTools?: string[] | null
  noFire?: boolean | null
  microwave?: boolean | null
}

type TodayActionCardProps = {
  demoMode?: boolean
  isLoading: boolean
  recipe: TodayActionRecipe | null
}

export default function TodayActionCard({
  demoMode = false,
  isLoading,
  recipe,
}: TodayActionCardProps) {
  if (isLoading && !recipe) {
    return (
      <section className="rounded-[22px] border border-[#eadcc9] bg-[#fffaf3] p-4 shadow-[0_14px_32px_rgba(76,51,28,0.08)]" aria-label="오늘 추천 불러오는 중">
        <div className="h-4 w-28 animate-pulse rounded-full bg-[#eadcc9]" />
        <div className="mt-3 h-7 w-48 animate-pulse rounded-full bg-[#f2dfc8]" />
        <div className="mt-4 h-36 animate-pulse rounded-[18px] bg-[#ecd5bd]" />
        <div className="mt-4 h-12 animate-pulse rounded-[15px] bg-[#ea5a1f]/30" />
      </section>
    )
  }

  if (!recipe) {
    return null
  }

  const essentialMissingIngredients = getEssentialMissingIngredients(recipe.missingIngredients)
  const missingCount = essentialMissingIngredients.length
  const expiringMatchedIngredients = Array.from(new Set(recipe.expiringIngredients ?? []))
  const visibleIngredientNames = (expiringMatchedIngredients.length > 0
    ? expiringMatchedIngredients
    : recipe.matchedIngredients
  ).slice(0, 3)
  const recipeHref = buildHomeHref(`/recipe/${recipe.id}`, { demoMode })
  const primaryCta = getTodayActionPrimaryCta({
    demoMode,
    missingCount,
    recipeId: recipe.id,
  })
  const secondaryCta = getTodayActionSecondaryCta({
    demoMode,
    missingCount,
    recipeId: recipe.id,
  })
  const thumbnailUrl = recipe.thumbnailUrl || FALLBACK_RECIPE_IMAGE
  const isGeneratedRecipeImage = isBeginnerRecipeGeneratedImage(thumbnailUrl)
  const toolLabel = getPrimaryToolLabel(recipe)
  const reason = getTodayRecommendationReason({
    expiringMatchedIngredients,
    matchedIngredients: recipe.matchedIngredients,
    recommendationReason: recipe.recommendationReason,
  })

  return (
    <section className="overflow-hidden rounded-3xl bg-[#2f2117] text-white shadow-[0_18px_36px_rgba(47,33,23,0.18)]">
      <div className="grid gap-3 p-4" style={{ gridTemplateColumns: 'minmax(0, 1fr) 108px' }}>
        <div className="min-w-0">
          <p className="text-[12px] font-black text-[#ffd8a8]">오늘 바로 가능한 메뉴</p>
          <h2 className="mt-1 break-keep text-[25px] font-black leading-[1.1] tracking-[0] text-white">
            {recipe.name}
          </h2>
          <p className="mt-2 line-clamp-2 break-keep text-[13px] font-semibold leading-5 text-[#f4dfc8]">
            {reason}
          </p>
        </div>
        <Link
          href={recipeHref}
          aria-label={`${recipe.name} 레시피 보기`}
          className="relative block h-28 overflow-hidden rounded-[18px] bg-[#fff7ed]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnailUrl}
            alt={recipe.name}
            onError={(event) => {
              event.currentTarget.src = FALLBACK_RECIPE_IMAGE
            }}
            className={`h-full w-full ${isGeneratedRecipeImage ? 'object-contain p-1' : 'object-cover'}`}
          />
        </Link>
      </div>

      <div className="border-t border-white/10 px-4 pb-4">
        <div className="pt-3">
          <p className="text-[11px] font-black text-[#ffd8a8]">
            {expiringMatchedIngredients.length > 0 ? '오늘 먼저 쓸 재료' : '냉장고에 있는 재료'}
          </p>
          <div className="mt-2 flex min-h-8 flex-wrap gap-1.5">
            {visibleIngredientNames.length > 0 ? (
              visibleIngredientNames.map((ingredient) => (
                <span key={ingredient} className="rounded-full bg-white/12 px-2.5 py-1.5 text-[11px] font-black text-[#ffe7c9]">
                  {ingredient}
                </span>
              ))
            ) : (
              <span className="rounded-full bg-white/12 px-2.5 py-1.5 text-[11px] font-black text-[#ffe7c9]">
                재료 확인 필요
              </span>
            )}
          </div>
        </div>

        <dl className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-[14px] bg-white/10 px-2 py-2">
            <dt className="text-[10px] font-bold text-[#ffd8a8]">부족</dt>
            <dd className="mt-0.5 text-[13px] font-black text-white">{missingCount}개</dd>
          </div>
          <div className="rounded-[14px] bg-white/10 px-2 py-2">
            <dt className="flex items-center justify-center gap-1 text-[10px] font-bold text-[#ffd8a8]">
              <Clock3 size={11} />
              시간
            </dt>
            <dd className="mt-0.5 text-[13px] font-black text-white">{recipe.totalMinutes ?? 10}분</dd>
          </div>
          <div className="rounded-[14px] bg-white/10 px-2 py-2">
            <dt className="flex items-center justify-center gap-1 text-[10px] font-bold text-[#ffd8a8]">
              <Utensils size={11} />
              도구
            </dt>
            <dd className="mt-0.5 truncate text-[13px] font-black text-white">{toolLabel}</dd>
          </div>
        </dl>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href={primaryCta.href}
            className="flex min-h-12 min-w-0 items-center justify-center rounded-[15px] bg-[#ea5a1f] px-2 text-center text-[14px] font-black leading-4 text-white shadow-[0_10px_20px_rgba(234,90,31,0.22)]"
          >
            {primaryCta.label}
          </Link>
          <Link
            href={secondaryCta.href}
            className="flex min-h-12 min-w-0 items-center justify-center gap-1 rounded-[15px] border border-white/15 bg-white/10 px-2 text-center text-[12px] font-black leading-4 text-[#ffe7c9]"
          >
            {missingCount === 1 ? (
              <>
                <ShoppingBasket size={14} />
                {secondaryCta.label}
              </>
            ) : (
              secondaryCta.label
            )}
          </Link>
        </div>
      </div>
    </section>
  )
}

function getPrimaryToolLabel(recipe: Pick<TodayActionRecipe, 'requiredTools' | 'noFire' | 'microwave'>): string {
  if (recipe.noFire) {
    return '불 없이'
  }
  if (recipe.microwave) {
    return '전자레인지'
  }

  const primaryTool = recipe.requiredTools?.[0]?.trim()
  if (!primaryTool) {
    return '간단'
  }

  if (primaryTool.includes('프라이팬')) {
    return '팬 1개'
  }
  if (primaryTool.includes('냄비')) {
    return '냄비 1개'
  }
  if (primaryTool.includes('칼')) {
    return '칼'
  }

  return primaryTool.replace(/\s+/g, ' ')
}

function getTodayRecommendationReason({
  expiringMatchedIngredients,
  matchedIngredients,
  recommendationReason,
}: {
  expiringMatchedIngredients: string[]
  matchedIngredients: string[]
  recommendationReason: string
}) {
  const visibleExpiringIngredients = expiringMatchedIngredients.slice(0, 2)
  if (visibleExpiringIngredients.length > 0) {
    return `${visibleExpiringIngredients.join(', ')} 먼저 쓰기 좋아요.`
  }

  const visibleMatchedIngredients = matchedIngredients.slice(0, 2)
  if (visibleMatchedIngredients.length >= 2) {
    return `${visibleMatchedIngredients.join(', ')} 같이 있어서 바로 만들 수 있어요.`
  }
  if (visibleMatchedIngredients.length === 1) {
    return `${visibleMatchedIngredients[0]}부터 시작해볼게요.`
  }

  return recommendationReason
}
