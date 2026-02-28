// 이 파일은 냉장고 페이지를 담당합니다 - 참고 이미지의 재고 관리 스타일
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, MoreVertical, X, RefreshCw, Loader2, Search, AlertCircle } from 'lucide-react'
import { useIngredients } from '@/hooks/useIngredients'
import type { IngredientCategory, IngredientRecord, IngredientStorageType } from '@/types'
import { getCategoryEmoji, getCategoryBg, getDday, getStatusLabel, getStatusBg } from '@/lib/utils'

const storageTabs = ['전체', '냉장', '냉동', '실온'] as const
const categories: IngredientCategory[] = ['채소', '과일', '육류', '수산물', '유제품', '양념', '기타']
const suggestionFetchLimit = 24
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? ''

const resolveApiUrl = (path: string): string => {
  if (!API_BASE_URL) return path
  const normalizedBase = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL
  return `${normalizedBase}${path}`
}

type IngredientSuggestionResponse = {
  items: string[]
  total: number
  nextCursor: number | null
  message?: string
}

type IngredientFormState = {
  name: string
  category: IngredientCategory
  storage_type: IngredientStorageType
  quantity: string
  expiry_date: string
  memo: string
}

const initialFormState: IngredientFormState = {
  name: '',
  category: '채소',
  storage_type: '냉장',
  quantity: '',
  expiry_date: '',
  memo: '',
}

export default function FridgePage() {
  const { ingredients, loading, error, addIngredient, updateIngredient, deleteIngredient, listIngredients } = useIngredients()
  const [activeTab, setActiveTab] = useState<string>('전체')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  const [form, setForm] = useState<IngredientFormState>(initialFormState)
  const [suggestionKeyword, setSuggestionKeyword] = useState('')
  const [suggestedIngredients, setSuggestedIngredients] = useState<string[]>([])
  const [suggestionTotal, setSuggestionTotal] = useState(0)
  const [suggestionNextCursor, setSuggestionNextCursor] = useState<number | null>(0)
  const [suggestionLoading, setSuggestionLoading] = useState(false)
  const [suggestionError, setSuggestionError] = useState<string | null>(null)
  const [hasFetchedSuggestions, setHasFetchedSuggestions] = useState(false)
  const suggestionRequestIdRef = useRef(0)
  const suggestionAbortRef = useRef<AbortController | null>(null)

  const filtered =
    activeTab === '전체'
      ? ingredients
      : ingredients.filter((i) => i.storageType === activeTab)

  const sortedIngredients = [...filtered].sort((a, b) => {
    if (!a.expiryDate && !b.expiryDate) return 0
    if (!a.expiryDate) return 1
    if (!b.expiryDate) return -1
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
  })

  const resetForm = () => {
    suggestionAbortRef.current?.abort()
    setForm(initialFormState)
    setSuggestionKeyword('')
    setSuggestedIngredients([])
    setSuggestionTotal(0)
    setSuggestionNextCursor(0)
    setSuggestionLoading(false)
    setSuggestionError(null)
    setHasFetchedSuggestions(false)
    setEditingId(null)
  }

  const fetchSuggestions = useCallback(
    async (mode: 'reset' | 'append') => {
      if (!showAddModal) return

      const cursor = mode === 'reset' ? 0 : suggestionNextCursor
      if (mode === 'append' && cursor === null) return

      if (mode === 'reset') {
        suggestionAbortRef.current?.abort()
      }

      const requestId = suggestionRequestIdRef.current + 1
      suggestionRequestIdRef.current = requestId
      const controller = new AbortController()
      suggestionAbortRef.current = controller

      setSuggestionLoading(true)
      setSuggestionError(null)
      if (mode === 'reset') {
        setSuggestedIngredients([])
        setSuggestionTotal(0)
        setSuggestionNextCursor(0)
      }

      try {
        const params = new URLSearchParams({
          category: form.category,
          limit: String(suggestionFetchLimit),
          cursor: String(cursor ?? 0),
        })

        const trimmedKeyword = suggestionKeyword.trim()
        if (trimmedKeyword) {
          params.set('q', trimmedKeyword)
        }

        const response = await fetch(resolveApiUrl(`/api/ingredients?${params.toString()}`), {
          cache: 'no-store',
          signal: controller.signal,
        })

        const payload = (await response.json()) as IngredientSuggestionResponse
        if (!response.ok) {
          throw new Error(payload.message ?? '추천 재료를 불러오지 못했습니다.')
        }

        if (requestId !== suggestionRequestIdRef.current) return

        setSuggestionTotal(payload.total)
        setSuggestionNextCursor(payload.nextCursor)
        setSuggestedIngredients((prev) => {
          const next = mode === 'reset' ? payload.items : [...prev, ...payload.items]
          return Array.from(new Set(next))
        })
        setHasFetchedSuggestions(true)
      } catch (caught) {
        if (controller.signal.aborted) return
        if (requestId !== suggestionRequestIdRef.current) return
        setSuggestionError(caught instanceof Error ? caught.message : '추천 재료를 불러오지 못했습니다.')
        setHasFetchedSuggestions(true)
      } finally {
        if (requestId === suggestionRequestIdRef.current) {
          setSuggestionLoading(false)
        }
      }
    },
    [form.category, showAddModal, suggestionKeyword, suggestionNextCursor],
  )

  useEffect(() => {
    if (!showAddModal) return

    const timer = window.setTimeout(() => {
      void fetchSuggestions('reset')
    }, 250)

    return () => {
      window.clearTimeout(timer)
    }
  }, [fetchSuggestions, form.category, showAddModal, suggestionKeyword])

  useEffect(() => {
    return () => {
      suggestionAbortRef.current?.abort()
    }
  }, [])

  const handleSave = async () => {
    if (!form.name.trim()) return

    const payload = {
      name: form.name,
      category: form.category,
      storageType: form.storage_type,
      quantity: form.quantity || null,
      expiryDate: form.expiry_date || null,
      memo: form.memo || null,
    }

    if (editingId) {
      await updateIngredient(editingId, payload)
    } else {
      await addIngredient(payload)
    }
    resetForm()
    setShowAddModal(false)
  }

  const handleEdit = (ingredient: IngredientRecord) => {
    setForm({
      name: ingredient.name,
      category: ingredient.category || '채소',
      storage_type: ingredient.storageType,
      quantity: ingredient.quantity || '',
      expiry_date: ingredient.expiryDate || '',
      memo: ingredient.memo || '',
    })
    setEditingId(ingredient.id)
    setMenuOpenId(null)
    setShowAddModal(true)
  }

  const handleDelete = async (id: string) => {
    await deleteIngredient(id)
    setMenuOpenId(null)
  }

  return (
    <div className="flex flex-col">
      {/* 상단 헤더 영역 */}
      <div className="bg-gradient-to-br from-blue-100 via-lavender-50 to-mint-50 px-5 pb-6 pt-4 rounded-b-[2rem]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🧊</span>
            <h2 className="text-2xl font-bold text-gray-800">냉장고 재고</h2>
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowAddModal(true)
            }}
            aria-label="재료 추가"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-soft"
          >
            <Plus size={22} className="text-mint-500" />
          </button>
        </div>

        {/* 보관 타입 탭 */}
        <div className="mt-4 flex gap-2">
          {storageTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${
                activeTab === tab ? 'bg-white text-mint-500 shadow-soft' : 'bg-white/50 text-gray-500'
              }`}
            >
              {tab === '냉장' ? '❄️ ' : tab === '냉동' ? '🧊 ' : tab === '실온' ? '🌡️ ' : '📦 '}
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 재료 리스트 */}
      <div className="px-5 pt-4 pb-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">총 {sortedIngredients.length}개</span>
          <button
            onClick={() => {
              void listIngredients()
            }}
            aria-label="재료 목록 새로고침"
            className="text-gray-400"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-mint-300 border-t-transparent" />
            <p className="mt-3 text-sm text-gray-400">불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="rounded-3xl bg-rose-50 p-4 text-center text-sm text-rose-500">{error.message}</div>
        ) : sortedIngredients.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <span className="text-7xl">🧊</span>
            <p className="mt-4 text-lg font-bold text-gray-600">냉장고가 비어있어요</p>
            <p className="mt-1 text-sm text-gray-400">재료를 추가해서 관리를 시작하세요</p>
            <button
              onClick={() => {
                resetForm()
                setShowAddModal(true)
              }}
              className="mt-5 rounded-full bg-mint-300 px-8 py-3 font-bold text-white shadow-soft"
            >
              + 첫 재료 추가하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {sortedIngredients.map((item) => {
              const dday = getDday(item.expiryDate)
              const statusLabel = getStatusLabel(dday)
              const statusBg = getStatusBg(dday)

              return (
                <div
                  key={item.id}
                  className="relative overflow-hidden rounded-3xl bg-white shadow-soft transition-all hover:-translate-y-1 hover:shadow-card"
                >
                  {/* 재료 이미지 영역 */}
                  <div className={`flex h-28 items-center justify-center ${getCategoryBg(item.category)}`}>
                    <span className="text-5xl">{getCategoryEmoji(item.category)}</span>

                    {/* 더보기 메뉴 버튼 */}
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === item.id ? null : item.id)}
                      aria-label={`${item.name} 메뉴 열기`}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/80"
                    >
                      <MoreVertical size={14} className="text-gray-500" />
                    </button>

                    {/* 수정/삭제 팝업 */}
                    {menuOpenId === item.id && (
                      <div className="absolute right-2 top-10 z-10 overflow-hidden rounded-2xl bg-white shadow-card">
                        <button
                          onClick={() => handleEdit(item)}
                          className="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          ✏️ 수정
                        </button>
                        <button
                          onClick={() => {
                            void handleDelete(item.id)
                          }}
                          className="block w-full px-4 py-2.5 text-left text-sm text-rose-500 hover:bg-rose-50"
                        >
                          🗑️ 삭제
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 재료 정보 */}
                  <div className="p-3">
                    <h4 className="text-base font-bold text-gray-800">{item.name}</h4>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBg}`}>
                        {statusLabel}
                      </span>
                      {item.expiryDate && (
                        <span className="text-xs text-gray-400">{item.expiryDate.replace(/-/g, '.')}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 재료 추가/수정 바텀시트 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          <div
            className="animate-fade-in absolute inset-0 bg-black/40"
            onClick={() => {
              setShowAddModal(false)
              resetForm()
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editingId ? '재료 수정 모달' : '재료 추가 모달'}
            className="animate-slide-up relative w-full max-w-[430px] rounded-t-[2rem] bg-white px-5 pb-8 pt-4"
          >
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-gray-200" />

            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">{editingId ? '✏️ 재료 수정' : '➕ 재료 추가'}</h3>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
                aria-label="모달 닫기"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            {/* 재료명 */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-bold text-gray-700">재료명 *</label>
              <input
                type="text"
                placeholder="예: 돼지고기 목살"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 py-3.5 text-sm outline-none transition-colors focus:border-mint-300 focus:bg-white"
              />
            </div>

            {/* 카테고리 */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-bold text-gray-700">카테고리</label>
              <div className="scrollbar-hide flex gap-2 overflow-x-auto">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setForm({ ...form, category: cat })}
                    className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition-all ${
                      form.category === cat ? 'bg-mint-200 text-mint-500 shadow-sm' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {getCategoryEmoji(cat)} {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* 카테고리별 추천 재료 */}
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label className="block text-sm font-bold text-gray-700">{form.category} 추천 재료</label>
                <span className="text-[11px] font-medium text-gray-400">칩 선택 시 재료명 자동입력</span>
              </div>

              <div className="relative mb-2">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={suggestionKeyword}
                  onChange={(event) => setSuggestionKeyword(event.target.value)}
                  placeholder={`${form.category} 재료 검색 (예: 양파)`}
                  className="w-full rounded-2xl border-2 border-gray-100 bg-gray-50 py-2.5 pl-9 pr-9 text-sm outline-none transition-colors focus:border-mint-300 focus:bg-white"
                />
                {suggestionKeyword && (
                  <button
                    type="button"
                    aria-label="추천 검색어 지우기"
                    onClick={() => setSuggestionKeyword('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-2.5">
                {suggestionLoading && suggestedIngredients.length === 0 ? (
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs text-gray-500">
                      <Loader2 size={12} className="animate-spin" />
                      식약처 데이터 검색 중...
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <span
                          key={`suggestion-skeleton-${index}`}
                          className="h-8 w-20 animate-pulse rounded-full bg-white"
                        />
                      ))}
                    </div>
                  </div>
                ) : suggestionError && suggestedIngredients.length === 0 ? (
                  <div className="rounded-xl bg-rose-50 p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose-500" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-rose-600">추천 재료를 불러오지 못했습니다.</p>
                        <p className="mt-0.5 text-xs text-rose-500">{suggestionError}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          void fetchSuggestions('reset')
                        }}
                        className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-rose-500"
                      >
                        재시도
                      </button>
                    </div>
                  </div>
                ) : suggestedIngredients.length === 0 ? (
                  hasFetchedSuggestions ? (
                    <div className="rounded-xl bg-white px-3 py-4 text-center">
                      <p className="text-xs font-semibold text-gray-500">검색 결과가 없습니다.</p>
                      <p className="mt-1 text-xs text-gray-400">검색어를 바꾸거나 재료명을 직접 입력해 주세요.</p>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-white px-3 py-4 text-center text-xs text-gray-400">
                      추천 재료를 준비하고 있습니다...
                    </div>
                  )
                ) : (
                  <>
                    <div className="max-h-28 overflow-y-auto pr-1">
                      <div className="flex flex-wrap gap-2">
                        {suggestedIngredients.map((name) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, name }))}
                            aria-pressed={form.name === name}
                            className={`rounded-full px-3.5 py-2 text-sm font-medium transition-all ${
                              form.name === name
                                ? 'bg-mint-300 text-white shadow-soft'
                                : 'bg-white text-mint-500 hover:bg-mint-100'
                            }`}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-xs text-gray-400">
                        총 {suggestionTotal}개 중 {suggestedIngredients.length}개 표시
                      </p>
                      {suggestionNextCursor !== null && (
                        <button
                          type="button"
                          onClick={() => {
                            void fetchSuggestions('append')
                          }}
                          className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={suggestionLoading}
                        >
                          {suggestionLoading ? '불러오는 중...' : '더 보기'}
                        </button>
                      )}
                    </div>
                    {suggestionError && (
                      <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-rose-50 px-3 py-2">
                        <p className="truncate text-xs text-rose-500">{suggestionError}</p>
                        <button
                          type="button"
                          onClick={() => {
                            void fetchSuggestions('append')
                          }}
                          className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-500"
                        >
                          재시도
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* 보관 방식 */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-bold text-gray-700">보관 방식</label>
              <div className="grid grid-cols-3 gap-2">
                {(['냉장', '냉동', '실온'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setForm({ ...form, storage_type: type })}
                    className={`rounded-2xl py-3 text-sm font-bold transition-all ${
                      form.storage_type === type ? 'bg-mint-200 text-mint-500 shadow-sm' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {type === '냉장' ? '❄️' : type === '냉동' ? '🧊' : '🌡️'} {type}
                  </button>
                ))}
              </div>
            </div>

            {/* 수량 + 유통기한 */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">수량</label>
                <input
                  type="text"
                  placeholder="예: 500g"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="w-full rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 py-3.5 text-sm outline-none focus:border-mint-300 focus:bg-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">유통기한</label>
                <input
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                  className="w-full rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 py-3.5 text-sm outline-none focus:border-mint-300 focus:bg-white"
                />
              </div>
            </div>

            {/* 메모 */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-bold text-gray-700">메모</label>
              <input
                type="text"
                placeholder="예: 이마트에서 구매"
                value={form.memo}
                onChange={(e) => setForm({ ...form, memo: e.target.value })}
                className="w-full rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 py-3.5 text-sm outline-none focus:border-mint-300 focus:bg-white"
              />
            </div>

            {/* 저장 버튼 */}
            <button
              onClick={() => {
                void handleSave()
              }}
              className="h-14 w-full rounded-2xl bg-mint-300 text-base font-bold text-white shadow-soft transition-colors hover:bg-mint-400"
            >
              {editingId ? '수정 완료 ✨' : '저장하기 ✨'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
