// 이 파일은 홈 화면을 담당합니다 - 따뜻한 파스텔 스타일
'use client'

import Link from 'next/link'
import { Search, Clock3, ChevronRight, Sparkles, Plus, Flame, Heart } from 'lucide-react'

const highlightStats = [
  { label: '보유 재료', value: '24개', tone: 'bg-white text-gray-700' },
  { label: '임박 재료', value: '3개', tone: 'bg-rose-100 text-rose-500' },
  { label: '추천 메뉴', value: '12개', tone: 'bg-mint-100 text-mint-500' },
]

const expiringIngredients = [
  { id: 1, name: '우유', quantity: '900ml', dday: 1, emoji: '🥛' },
  { id: 2, name: '두부', quantity: '1모', dday: 2, emoji: '🧈' },
  { id: 3, name: '깻잎', quantity: '12장', dday: 3, emoji: '🌿' },
]

const recommendedRecipes = [
  { id: 1, name: '김치찌개', time: 20, missing: 1, match: 90, emoji: '🍲', tag: '한식', bgColor: 'from-orange-100 to-rose-50' },
  { id: 2, name: '된장찌개', time: 25, missing: 2, match: 84, emoji: '🥘', tag: '국찌개', bgColor: 'from-amber-100 to-yellow-50' },
  { id: 3, name: '계란말이', time: 10, missing: 0, match: 97, emoji: '🥚', tag: '간편', bgColor: 'from-yellow-100 to-cream-100' },
  { id: 4, name: '잡채', time: 35, missing: 2, match: 78, emoji: '🍜', tag: '명절', bgColor: 'from-lavender-100 to-rose-50' },
]

export default function HomePage() {
  return (
    <div className="flex flex-col pb-4">
      {/* 핵심 상태를 요약하는 히어로 카드 */}
      <section className="px-5 pt-2">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-mint-200 via-cream-100 to-lavender-100 p-5 shadow-card">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/35 blur-2xl" />
          <div className="absolute -left-8 bottom-2 h-24 w-24 rounded-full bg-white/35 blur-2xl" />

          <div className="relative flex items-center justify-between">
            <p className="text-xs font-semibold tracking-[0.16em] text-mint-500/75">TODAY&apos;S KITCHEN</p>
            <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold text-mint-500">2월 점검 주간</span>
          </div>

          <h2 className="relative mt-2 text-[1.55rem] font-bold leading-snug text-gray-800">
            냉장고 재료로
            <br />
            오늘의 집밥을 바로 찾으세요
          </h2>
          <p className="relative mt-2 text-sm text-gray-600">유통기한 임박 재료를 먼저 쓰고, 부족한 재료만 빠르게 장보세요.</p>

          <Link
            href="/recipe"
            className="relative mt-4 flex items-center gap-3 rounded-2xl border border-white/80 bg-white/75 px-4 py-3 shadow-soft"
          >
            <Search size={16} className="text-gray-400" />
            <span className="text-sm text-gray-500">레시피를 검색하거나 추천을 받아보세요</span>
          </Link>

          <div className="relative mt-4 grid grid-cols-3 gap-2">
            {highlightStats.map((item) => (
              <div key={item.label} className={`rounded-2xl px-3 py-2.5 shadow-soft ${item.tone}`}>
                <p className="text-[11px] font-medium text-gray-500">{item.label}</p>
                <p className="mt-0.5 text-sm font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 임박 재료 섹션 */}
      <section className="px-5 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-gray-400">EXPIRY ALERT</p>
            <h3 className="text-lg font-bold text-gray-800">오늘 먼저 써야 할 재료</h3>
          </div>
          <Link href="/fridge" className="flex items-center gap-1 text-xs font-semibold text-gray-500">
            냉장고 열기 <ChevronRight size={14} />
          </Link>
        </div>
        <div className="mt-3 space-y-2.5">
          {expiringIngredients.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-soft"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{item.emoji}</span>
                <div>
                  <p className="text-sm font-bold text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.quantity}</p>
                </div>
              </div>
              <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-500">
                D-{item.dday}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 빠른 액션 */}
      <section className="px-5 pt-5">
        <div className="rounded-3xl bg-white px-4 py-4 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-gray-400">QUICK ACTION</p>
              <h3 className="text-lg font-bold text-gray-800">지금 필요한 작업</h3>
            </div>
            <Link
              href="/fridge"
              className="inline-flex items-center gap-1 rounded-full bg-mint-100 px-3 py-1.5 text-xs font-bold text-mint-500"
            >
              <Plus size={12} />
              재료 추가
            </Link>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/fridge" className="rounded-2xl border border-mint-100 bg-mint-50 px-3 py-3">
              <p className="text-xs font-semibold text-mint-500">냉장고 정리</p>
              <p className="mt-1 text-sm font-bold text-gray-800">임박 재료 먼저 보기</p>
            </Link>
            <Link href="/recipe" className="rounded-2xl border border-peach-100 bg-peach-50 px-3 py-3">
              <p className="text-xs font-semibold text-peach-500">맞춤 추천</p>
              <p className="mt-1 text-sm font-bold text-gray-800">부족 재료 확인하기</p>
            </Link>
          </div>
        </div>
      </section>

      {/* 추천 레시피 */}
      <section className="px-5 pb-6 pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-mint-500" />
            <h3 className="text-lg font-bold text-gray-800">오늘의 추천 레시피</h3>
          </div>
          <Link href="/recipe" className="flex items-center gap-1 text-xs font-semibold text-gray-500">
            전체 보기 <ChevronRight size={14} />
          </Link>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          {recommendedRecipes.map((recipe) => (
            <div
              key={recipe.id}
              className="overflow-hidden rounded-3xl bg-white shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-card"
            >
              <div className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${recipe.bgColor}`}>
                <span className="text-6xl">{recipe.emoji}</span>

                <button
                  aria-label={`${recipe.name} 즐겨찾기`}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow-sm"
                >
                  <Heart size={16} className="text-rose-400" />
                </button>

                <span className="absolute left-3 top-3 rounded-full bg-mint-200 px-2.5 py-1 text-[10px] font-bold text-mint-500">
                  {recipe.tag}
                </span>

                <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 shadow-sm">
                  <span className="text-xs font-bold text-mint-500">{recipe.match}% 일치</span>
                </div>
              </div>

              <div className="p-3">
                <h4 className="font-bold text-gray-800">{recipe.name}</h4>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock3 size={12} />
                    <span>{recipe.time}분</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-peach-400">
                    <Flame size={11} />
                    부족 {recipe.missing}개
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
