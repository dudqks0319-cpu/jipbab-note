// 이 파일은 냉장고 페이지를 담당합니다 - 참고 이미지의 재고 관리 스타일
'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, ClipboardPaste, MoreVertical, Plus, RefreshCw, Refrigerator, Search, X } from 'lucide-react'
import { useIngredients } from '@/hooks/useIngredients'
import { useAppSettings } from '@/hooks/useAppSettings'
import { useDemoMode } from '@/hooks/useDemoMode'
import {
  INGREDIENT_CATEGORIES,
  type IngredientCategory,
  type IngredientRecord,
  type IngredientStorageType,
  type IngredientUnit,
} from '@/types'
import { APPSTORE_DEMO_INGREDIENTS } from '@/lib/demo-state'
import { parseBulkIngredientInput } from '@/lib/bulk-ingredient-input'
import { getIngredientCatalog, searchIngredientCatalog } from '@/lib/ingredient-catalog'
import { normalizeIngredientInput, suggestIngredientCategory } from '@/lib/ingredient-category'
import {
  STARTER_INGREDIENT_TEMPLATES,
  buildStarterIngredientPayloads,
} from '@/lib/starter-ingredients'
import {
  buildQuantityDisplay,
  getUnitOptionsForSystem,
  parseQuantityDisplay,
} from '@/lib/measurements'
import { getCategoryBg, getCategoryEmoji, getDday, getIngredientPhotoUrl, getStatusLabel, getStatusBg } from '@/lib/utils'

const storageTabs = ['전체', '냉장', '냉동', '실온'] as const
const suggestionFetchLimit = 24

type IngredientFormState = {
  name: string
  category: IngredientCategory
  storage_type: IngredientStorageType
  amount_value: string
  amount_unit: IngredientUnit
  expiry_date: string
  memo: string
}

const initialFormState: IngredientFormState = {
  name: '',
  category: '채소',
  storage_type: '냉장',
  amount_value: '',
  amount_unit: 'g',
  expiry_date: '',
  memo: '',
}

const normalizeIngredientName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, '')

const expiryQuickOptions = [
  { label: '3일', days: 3 },
  { label: '1주', days: 7 },
  { label: '2주', days: 14 },
  { label: '1달', days: 30 },
] as const

const frequentIngredientPresets = ['계란', '두부', '대파', '양파', '김치', '돼지고기', '우유'] as const

const findCatalogItemByName = (name: string) => {
  const target = normalizeIngredientName(name)
  if (!target) {
    return null
  }

  return getIngredientCatalog().find((item) => {
    if (normalizeIngredientName(item.name) === target) {
      return true
    }
    return item.aliases?.some((alias) => normalizeIngredientName(alias) === target) ?? false
  }) ?? null
}

function shouldOpenAddFromUrl(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return new URLSearchParams(window.location.search).get('add') === '1'
}

function buildFutureDate(days: number): string {
  const target = new Date()
  target.setHours(0, 0, 0, 0)
  target.setDate(target.getDate() + days)
  return target.toISOString().slice(0, 10)
}

export default function FridgePage() {
  const { ingredients, loading, error, source, addIngredient, updateIngredient, deleteIngredient, listIngredients } = useIngredients()
  const { settings } = useAppSettings()
  const isAppStoreDemo = useDemoMode()
  const [activeTab, setActiveTab] = useState<string>('전체')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState('')
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [form, setForm] = useState<IngredientFormState>(initialFormState)
  const [suggestionKeyword, setSuggestionKeyword] = useState('')
  const [categoryTouched, setCategoryTouched] = useState(false)
  const [bulkInput, setBulkInput] = useState('')

  const unitOptions = useMemo(
    () => getUnitOptionsForSystem(settings.unitSystem),
    [settings.unitSystem],
  )

  const suggestedIngredients = useMemo(
    () =>
      searchIngredientCatalog({
        category: form.category,
        query: suggestionKeyword,
        limit: suggestionFetchLimit,
      }),
    [form.category, suggestionKeyword],
  )

  useEffect(() => {
    if (shouldOpenAddFromUrl()) {
      const frame = window.requestAnimationFrame(() => {
        setShowAddModal(true)
      })
      return () => window.cancelAnimationFrame(frame)
    }
    return undefined
  }, [])

  const resetForm = useCallback(() => {
    setForm(initialFormState)
    setSuggestionKeyword('')
    setCategoryTouched(false)
    setEditingId(null)
    setSaveMessage('')
    setBulkInput('')
  }, [])

  const openAddModal = useCallback(() => {
    resetForm()
    setShowAddModal(true)
  }, [resetForm])

  const suggestionTotal = useMemo(
    () =>
      searchIngredientCatalog({
        category: form.category,
        query: suggestionKeyword,
        limit: 999,
      }).length,
    [form.category, suggestionKeyword],
  )

  const displayIngredients = isAppStoreDemo ? APPSTORE_DEMO_INGREDIENTS : ingredients
  const activeIngredients = displayIngredients.filter((item) => !item.consumedAt && !item.discardedAt)
  const consumedIngredients = displayIngredients.filter((item) => item.consumedAt || item.discardedAt)
  const pendingSyncCount = displayIngredients.filter((item) => item.syncStatus && item.syncStatus !== 'synced').length

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()

  const storageFiltered =
    activeTab === '전체'
      ? activeIngredients
      : activeIngredients.filter((i) => i.storageType === activeTab)

  const filtered = normalizedSearchQuery
    ? storageFiltered.filter((item) =>
        [
          item.name,
          item.category ?? '',
          item.storageType,
          item.quantity ?? '',
          item.memo ?? '',
        ].some((value) => value.toLowerCase().includes(normalizedSearchQuery)),
      )
    : storageFiltered

  const sortedIngredients = [...filtered].sort((a, b) => {
    if (!a.expiryDate && !b.expiryDate) return 0
    if (!a.expiryDate) return 1
    if (!b.expiryDate) return -1
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
  })

  const groupedIngredients = (() => {
    const groups: Array<{ key: string; title: string; description: string; items: IngredientRecord[] }> = [
      { key: 'today', title: '오늘까지', description: '가장 먼저 써야 하는 재료', items: [] },
      { key: 'three-days', title: '3일 이내', description: '이번 주 초반에 쓰기', items: [] },
      { key: 'seven-days', title: '7일 이내', description: '이번 주 안에 쓰기', items: [] },
      { key: 'later', title: '여유 있음', description: '기한이 아직 남은 재료', items: [] },
      { key: 'unknown', title: '나중에 확인', description: '유통기한을 아직 모르는 재료', items: [] },
    ]

    for (const item of sortedIngredients) {
      if (!item.expiryDate) {
        groups[4].items.push(item)
        continue
      }

      const dday = getDday(item.expiryDate)
      if (dday <= 0) {
        groups[0].items.push(item)
      } else if (dday <= 3) {
        groups[1].items.push(item)
      } else if (dday <= 7) {
        groups[2].items.push(item)
      } else {
        groups[3].items.push(item)
      }
    }

    return groups.filter((group) => group.items.length > 0)
  })()

  const mergeQuantityDisplay = (currentQuantity: string | null, nextQuantity: string | null) => {
    if (!nextQuantity) return currentQuantity
    if (!currentQuantity) return nextQuantity
    if (currentQuantity.includes(nextQuantity)) return currentQuantity
    return `${currentQuantity} + ${nextQuantity}`
  }

  const mergeMemoDisplay = (currentMemo: string | null, nextMemo: string | null) => {
    const parts = [currentMemo, nextMemo].filter((item): item is string => Boolean(item?.trim()))
    return Array.from(new Set(parts)).join(' · ') || null
  }

  const buildIngredientPayloadFromRecord = (
    ingredient: IngredientRecord,
    overrides: Partial<Parameters<typeof updateIngredient>[1]> = {},
  ) => ({
    name: ingredient.name,
    category: ingredient.category,
    storageType: ingredient.storageType,
    quantity: ingredient.quantity,
    expiryDate: ingredient.expiryDate,
    purchaseDate: ingredient.purchaseDate,
    openedAt: ingredient.openedAt,
    storageLocation: ingredient.storageLocation,
    unitPrice: ingredient.unitPrice,
    purchasePlace: ingredient.purchasePlace,
    consumedAt: ingredient.consumedAt,
    discardedAt: ingredient.discardedAt,
    repeatPurchase: ingredient.repeatPurchase,
    barcode: ingredient.barcode,
    imageUrl: ingredient.imageUrl,
    memo: ingredient.memo,
    ...overrides,
  })

  const appendExpiryReminderMemo = (memo: string | null, hasExpiryDate: boolean) => {
    if (hasExpiryDate) return memo
    return mergeMemoDisplay(memo, '유통기한 나중에 확인')
  }

  const handleSave = async () => {
    const normalizedName = normalizeIngredientInput(form.name)
    if (!normalizedName) return

    const amountValue = Number(form.amount_value)
    const normalizedAmountValue =
      form.amount_value.trim() && Number.isFinite(amountValue) && amountValue > 0
        ? amountValue
        : null
    const quantityDisplay = buildQuantityDisplay(
      normalizedAmountValue,
      normalizedAmountValue ? form.amount_unit : null,
      settings.unitSystem,
    )

    const payload = {
      name: normalizedName,
      category: categoryTouched ? form.category : suggestIngredientCategory(normalizedName, form.category),
      storageType: form.storage_type,
      quantity: quantityDisplay,
      expiryDate: form.expiry_date || null,
      memo: appendExpiryReminderMemo(form.memo.trim() || null, Boolean(form.expiry_date)),
    }

    if (editingId) {
      await updateIngredient(editingId, payload)
      setSaveMessage('수정했어요.')
      resetForm()
      setShowAddModal(false)
    } else {
      const duplicate = ingredients.find(
        (item) => normalizeIngredientName(item.name) === normalizeIngredientName(payload.name),
      )
      if (duplicate) {
        const shouldMerge = window.confirm(`${duplicate.name}이 이미 있어요. 기존 재료에 합칠까요?`)
        if (!shouldMerge) return

        await updateIngredient(duplicate.id, buildIngredientPayloadFromRecord(duplicate, {
          category: payload.category ?? duplicate.category,
          storageType: payload.storageType,
          quantity: mergeQuantityDisplay(duplicate.quantity, payload.quantity),
          expiryDate: payload.expiryDate ?? duplicate.expiryDate,
          memo: mergeMemoDisplay(duplicate.memo, payload.memo),
        }))
        setSaveMessage(`${duplicate.name}에 합쳤어요. 다음 재료를 바로 추가할 수 있어요.`)
      } else {
        await addIngredient(payload)
        setSaveMessage(`${payload.name} 저장 완료. 이어서 다음 재료를 추가하세요.`)
      }
      setForm((prev) => ({
        ...initialFormState,
        category: prev.category,
        storage_type: prev.storage_type,
        amount_unit: prev.amount_unit,
      }))
      setSuggestionKeyword('')
      setCategoryTouched(false)
    }
  }

  const handleAddStarterIngredients = async () => {
    const payloads = buildStarterIngredientPayloads(ingredients.map((item) => item.name))
    if (payloads.length === 0) {
      setSaveMessage('기본 재료가 이미 담겨 있어요.')
      return
    }

    await Promise.all(payloads.map((payload) => addIngredient(payload)))
    setSaveMessage(`국민 재료 ${payloads.length}개를 냉장고에 담았어요.`)
  }

  const handleBulkSave = async () => {
    const parsed = parseBulkIngredientInput(bulkInput, { fallbackCategory: form.category })
    if (parsed.payloads.length === 0) {
      setSaveMessage('붙여넣은 내용에서 저장할 재료를 찾지 못했어요.')
      return
    }

    const knownIngredients = new Map(
      ingredients.map((item) => [normalizeIngredientName(item.name), item]),
    )
    let addedCount = 0
    let mergedCount = 0

    for (const payload of parsed.payloads) {
      const key = normalizeIngredientName(payload.name)
      const duplicate = knownIngredients.get(key)
      if (duplicate) {
        const updated = await updateIngredient(duplicate.id, buildIngredientPayloadFromRecord(duplicate, {
          category: payload.category ?? duplicate.category,
          storageType: payload.storageType ?? duplicate.storageType,
          quantity: mergeQuantityDisplay(duplicate.quantity, payload.quantity ?? null),
          expiryDate: duplicate.expiryDate ?? payload.expiryDate ?? null,
          memo: mergeMemoDisplay(duplicate.memo, payload.memo ?? null),
          consumedAt: null,
          discardedAt: null,
        }))
        if (updated) {
          knownIngredients.set(key, updated)
        }
        mergedCount += 1
      } else {
        const created = await addIngredient(payload)
        knownIngredients.set(key, created)
        addedCount += 1
      }
    }

    setBulkInput('')
    setSaveMessage(
      `일괄 입력 완료: ${addedCount}개 추가, ${mergedCount}개 병합${
        parsed.skippedLines.length > 0 ? `, ${parsed.skippedLines.length}줄 건너뜀` : ''
      }.`,
    )
  }

  const handleMarkConsumed = async (item: IngredientRecord) => {
    await updateIngredient(item.id, buildIngredientPayloadFromRecord(item, {
      consumedAt: new Date().toISOString(),
      discardedAt: null,
      memo: mergeMemoDisplay(item.memo, '소진 기록'),
    }))
    setMenuOpenId(null)
    setSaveMessage(`${item.name}을 소진 처리했어요. 삭제하지 않고 기록에 남깁니다.`)
  }

  const handleRestoreConsumed = async (item: IngredientRecord) => {
    await updateIngredient(item.id, buildIngredientPayloadFromRecord(item, {
      consumedAt: null,
      discardedAt: null,
      memo: item.memo?.replace(/(?:^| · )소진 기록/g, '').trim() || null,
    }))
    setSaveMessage(`${item.name}을 다시 냉장고에 표시했어요.`)
  }

  const handleStorageChange = (type: IngredientStorageType) => {
    setForm((prev) => ({
      ...prev,
      storage_type: type,
      category:
        type === '실온'
          ? '조미료'
          : type === '냉동'
            ? '냉동식품'
            : prev.category === '조미료' || prev.category === '냉동식품'
              ? '채소'
              : prev.category,
      amount_value: type === '실온' ? '' : prev.amount_value,
      expiry_date: type === '실온' ? '' : prev.expiry_date,
    }))
  }

  const handleSwipeDelete = async (item: IngredientRecord, endX: number) => {
    if (swipeStartX === null) return
    const deltaX = endX - swipeStartX
    setSwipeStartX(null)
    if (deltaX > -72) return
    const shouldDelete = window.confirm(`${item.name}을 삭제할까요?`)
    if (!shouldDelete) return
    await handleDelete(item.id)
  }

  const handleEdit = (ingredient: IngredientRecord) => {
    const parsedQuantity = parseQuantityDisplay(ingredient.quantity)

    setForm({
      name: ingredient.name,
      category: ingredient.category || '채소',
      storage_type: ingredient.storageType,
      amount_value: parsedQuantity.amountValue,
      amount_unit: parsedQuantity.amountUnit ?? unitOptions[0]?.value ?? 'g',
      expiry_date: ingredient.expiryDate || '',
      memo: ingredient.memo || '',
    })
    setCategoryTouched(true)
    setEditingId(ingredient.id)
    setMenuOpenId(null)
    setShowAddModal(true)
  }

  const handleDelete = async (id: string) => {
    await deleteIngredient(id)
    setMenuOpenId(null)
  }

  const handleIngredientNameChange = (value: string) => {
    const catalogItem = findCatalogItemByName(value)
    setForm((prev) => ({
      ...prev,
      name: value,
      category: categoryTouched ? prev.category : catalogItem?.category ?? suggestIngredientCategory(value, prev.category),
      storage_type: catalogItem?.defaultStorageType ?? prev.storage_type,
      amount_unit: catalogItem?.defaultUnit ?? prev.amount_unit,
    }))
  }

  return (
    <div className="min-h-full bg-[#fbf6ee] pb-6">
      <section className="mobile-safe-top px-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[24px] font-black text-[#2f2117]">냉장고</h1>
              <button
                type="button"
                aria-label="냉장고 도움말"
                onClick={() => setSaveMessage('재료명, 카테고리, 보관 위치, 수량, 메모로 빠르게 찾을 수 있어요.')}
                className="text-[#b8a99a]"
              >
                <AlertCircle size={16} />
              </button>
            </div>
            <p className="mt-1 text-[12px] font-semibold text-[#8f7f70]">
              {normalizedSearchQuery
                ? `보관 중 ${activeIngredients.length}개 중 ${sortedIngredients.length}개`
                : `보관 중 ${activeIngredients.length}개 · 소진 ${consumedIngredients.length}개`}
            </p>
          </div>
          <button
            onClick={openAddModal}
            aria-label="재료 추가"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#ea5a1f] text-white shadow-[0_8px_18px_rgba(234,90,31,0.25)]"
          >
            <Plus size={22} />
          </button>
        </div>

        <div className="jipbab-panel mt-4 overflow-hidden rounded-[18px]">
          <div className="grid grid-cols-[1fr_82px]">
            <div className="grid grid-cols-3 divide-x divide-[#eadcc9] bg-[#f7f5e9]">
              <FridgeStat label="보관" value={`${activeIngredients.length}개`} />
              <FridgeStat label="일반" value={`${activeIngredients.filter((item) => getDday(item.expiryDate) > 3).length}개`} />
              <FridgeStat label="소진임박" value={`${activeIngredients.filter((item) => getDday(item.expiryDate) <= 3).length}개`} warning />
            </div>
            <div className="flex items-center justify-center bg-[#ece8da] text-[#8f7f70]">
              <Refrigerator size={46} strokeWidth={1.35} />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-[14px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-2.5">
          <Search size={16} className="text-[#b5a493]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="재료, 카테고리, 메모 검색"
            className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-[#4b3929] outline-none placeholder:text-[#a69585]"
          />
          {searchQuery ? (
            <button
              type="button"
              aria-label="재료 검색어 지우기"
              onClick={() => setSearchQuery('')}
              className="text-[#b5a493]"
            >
              <X size={15} />
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#ea5a1f] text-[13px] font-black text-white shadow-[0_8px_18px_rgba(234,90,31,0.18)]"
        >
          <Plus size={16} />
          재료 바로 추가
        </button>

        {saveMessage ? (
          <p className="mt-3 rounded-[14px] border border-[#dce8c8] bg-[#f2f7e7] px-3 py-2 text-[12px] font-bold text-[#3d7b38]">
            {saveMessage}
          </p>
        ) : null}
        {!isAppStoreDemo && (source === 'local' || pendingSyncCount > 0) ? (
          <p className="mt-3 rounded-[14px] border border-[#f6d7b8] bg-[#fff7ed] px-3 py-2 text-[11px] font-bold leading-relaxed text-[#9a4f14]">
            {pendingSyncCount > 0
              ? `동기화 대기 ${pendingSyncCount}개가 있어요. 네트워크가 복구되면 자동으로 다시 업로드합니다.`
              : '현재 냉장고 데이터가 이 기기에서 먼저 표시됩니다. 로그인/네트워크 복구 후 클라우드 동기화 상태를 확인하세요.'}
          </p>
        ) : null}

        <div className="mt-3 grid grid-cols-4 gap-2">
          {storageTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`min-h-10 rounded-full border px-2 py-2 text-[12px] font-black transition-all ${
                activeTab === tab
                  ? 'border-[#ea5a1f] bg-[#fff0e4] text-[#d94d19]'
                  : 'border-[#eadcc9] bg-[#fffaf3] text-[#7d6d5f]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      <section className="px-5 pb-6 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[12px] font-bold text-[#8f7f70]">
            {activeTab === '전체' ? '보관 중 재료' : `${activeTab} 재료`} {sortedIngredients.length}개
          </p>
          <button
            onClick={() => {
              void listIngredients()
            }}
            aria-label="재료 목록 새로고침"
            className="flex items-center gap-1 text-[12px] font-bold text-[#8f7f70]"
          >
            <RefreshCw size={14} />
            새로고침
          </button>
        </div>

        {!isAppStoreDemo && loading ? (
          <div className="flex flex-col items-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-mint-300 border-t-transparent" />
            <p className="mt-3 text-sm text-gray-400">불러오는 중...</p>
          </div>
        ) : error && !isAppStoreDemo ? (
          <div className="rounded-3xl bg-rose-50 p-4 text-center text-sm text-rose-500">{error.message}</div>
        ) : sortedIngredients.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            {activeIngredients.length === 0 ? (
              <>
                <span className="text-7xl">🧊</span>
                <p className="mt-4 text-lg font-bold text-gray-600">냉장고가 비어있어요</p>
                <p className="mt-1 text-center text-sm text-gray-400">
                  국민 재료를 먼저 담으면 바로 추천 레시피가 살아납니다.
                </p>
                <div className="mt-4 flex max-w-[320px] flex-wrap justify-center gap-2">
                  {STARTER_INGREDIENT_TEMPLATES.map((item) => (
                    <span key={item.name} className="rounded-full bg-[#fff7ed] px-3 py-1.5 text-[12px] font-black text-[#8a5a2a]">
                      {item.name}
                    </span>
                  ))}
                </div>
                <div className="mt-5 grid w-full max-w-[320px] grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void handleAddStarterIngredients()
                    }}
                    className="rounded-full bg-[#ea5a1f] px-8 py-3 font-black text-white shadow-[0_8px_18px_rgba(234,90,31,0.18)]"
                  >
                    국민 재료 5개 바로 담기
                  </button>
                  <button
                    onClick={openAddModal}
                    className="rounded-full bg-mint-300 px-8 py-3 font-bold text-white shadow-soft"
                  >
                    + 직접 재료 추가하기
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="text-6xl">🔎</span>
                <p className="mt-4 text-lg font-bold text-gray-600">조건에 맞는 재료가 없어요</p>
                <p className="mt-1 text-center text-sm text-gray-400">
                  검색어를 줄이거나 보관 탭을 전체로 바꿔보세요.
                </p>
                <div className="mt-5 flex w-full max-w-[320px] gap-2">
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="flex-1 rounded-full border border-[#eadcc9] bg-[#fffaf3] px-4 py-3 text-[13px] font-black text-[#4b3929]"
                  >
                    검색어 지우기
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('전체')}
                    className="flex-1 rounded-full bg-[#ea5a1f] px-4 py-3 text-[13px] font-black text-white"
                  >
                    전체 보기
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {groupedIngredients.map((group) => (
              <div key={group.key}>
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <h2 className="text-[13px] font-black text-[#4b3929]">{group.title}</h2>
                    <p className="mt-0.5 text-[11px] font-semibold text-[#8f7f70]">{group.description}</p>
                  </div>
                  <span className="rounded-full bg-[#fff7ed] px-2.5 py-1 text-[11px] font-black text-[#a66a17]">
                    {group.items.length}개
                  </span>
                </div>
                <div className="space-y-2.5">
                  {group.items.map((item) => {
                    const dday = getDday(item.expiryDate)
                    const statusLabel = item.expiryDate ? getStatusLabel(dday) : '나중에 확인'
                    const statusBg = item.expiryDate ? getStatusBg(dday) : 'bg-[#f1e4d7] text-[#7d6d5f]'

                    return (
                      <div
                        key={item.id}
                        className="jipbab-panel relative flex items-center gap-3 rounded-[16px] px-3 py-2.5"
                        onTouchStart={(event) => setSwipeStartX(event.changedTouches[0]?.clientX ?? null)}
                        onTouchEnd={(event) => {
                          void handleSwipeDelete(item, event.changedTouches[0]?.clientX ?? 0)
                        }}
                      >
                        <div className={`relative h-[62px] w-[62px] shrink-0 overflow-hidden rounded-[14px] ${getCategoryBg(item.category)}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getIngredientPhotoUrl(item.name, item.category)}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="truncate text-[15px] font-black text-[#2f2117]">{item.name}</h4>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${statusBg}`}>
                              {statusLabel}
                            </span>
                            {item.syncStatus === 'conflict' ? (
                              <span className="rounded-full bg-[#fff0e4] px-2 py-0.5 text-[10px] font-black text-[#d94d19]">
                                동기화 확인 필요
                              </span>
                            ) : item.syncStatus && item.syncStatus !== 'synced' ? (
                              <span className="rounded-full bg-[#fff7ed] px-2 py-0.5 text-[10px] font-black text-[#9a4f14]">
                                동기화 대기
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-[12px] font-semibold text-[#7d6d5f]">
                            {item.category ?? '기타'} · {item.expiryDate ? `${Math.max(dday, 0)}일 남음` : '유통기한 나중에 확인'}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#a69585]">보관위치 | {item.storageType}</p>
                          <Link
                            href={`/recipe?q=${encodeURIComponent(item.name)}`}
                            className="mt-2 inline-flex min-h-8 items-center justify-center rounded-full bg-[#fff0e4] px-3 text-[11px] font-black text-[#d94d19]"
                          >
                            이 재료로 요리
                          </Link>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="min-w-[44px] text-right text-[13px] font-bold text-[#4b3929]">
                            {item.quantity ?? '-'}
                          </span>
                          <button
                            onClick={() => setMenuOpenId(menuOpenId === item.id ? null : item.id)}
                            aria-label={`${item.name} 메뉴 열기`}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f7eee3] text-[#7d6d5f]"
                          >
                            <MoreVertical size={15} />
                          </button>
                        </div>

                        {menuOpenId === item.id && (
                          <div className="absolute right-3 top-12 z-10 overflow-hidden rounded-[14px] border border-[#eadcc9] bg-[#fffaf3] shadow-card">
                            <button
                              onClick={() => handleEdit(item)}
                              className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-[#4b3929] hover:bg-[#f7eee3]"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => {
                                void handleMarkConsumed(item)
                              }}
                              className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-[#3d7b38] hover:bg-[#f2f7e7]"
                            >
                              소진 처리
                            </button>
                            <button
                              onClick={() => {
                                void handleDelete(item.id)
                              }}
                              className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-[#d94d19] hover:bg-[#fff0e4]"
                            >
                              삭제
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {consumedIngredients.length > 0 ? (
        <section className="px-5 pb-6">
          <div className="mb-2 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#3d7b38]" />
            <h2 className="text-[13px] font-black text-[#4b3929]">소진 기록</h2>
          </div>
          <div className="jipbab-panel divide-y divide-[#eadcc9] overflow-hidden rounded-[16px]">
            {consumedIngredients.slice(0, 6).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-black text-[#4b3929]">{item.name}</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-[#8f7f70]">
                    {item.consumedAt ? new Date(item.consumedAt).toLocaleDateString('ko-KR') : '소진 처리됨'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void handleRestoreConsumed(item)
                  }}
                  className="shrink-0 rounded-full border border-[#dce8c8] bg-[#f2f7e7] px-3 py-1.5 text-[11px] font-black text-[#3d7b38]"
                >
                  되돌리기
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

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
            className="animate-slide-up relative max-h-[calc(100dvh_-_env(safe-area-inset-top)_-_0.75rem)] w-full max-w-[430px] overflow-y-auto overscroll-contain rounded-t-[2rem] bg-white px-5 pb-[calc(1rem_+_env(safe-area-inset-bottom))] pt-4"
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

            {!editingId ? (
              <div className="mb-5 rounded-[18px] border border-[#eadcc9] bg-[#fffaf3] p-3">
                <div className="flex items-center gap-2">
                  <ClipboardPaste size={17} className="text-[#ea5a1f]" />
                  <p className="text-sm font-black text-[#2f2117]">한 번에 붙여넣기</p>
                </div>
                <p className="mt-1 text-[12px] font-semibold leading-5 text-[#8f7f70]">
                  계란 10개, 두부 1모, 양파 2개처럼 줄바꿈이나 쉼표로 여러 재료를 넣을 수 있어요.
                </p>
                <textarea
                  value={bulkInput}
                  onChange={(event) => setBulkInput(event.target.value)}
                  placeholder={'계란 10개\n두부 1모\n양파 2개\n김치 반통\n돼지고기 300g'}
                  className="mt-3 min-h-[118px] w-full resize-none rounded-[14px] border border-[#eadcc9] bg-white px-3 py-3 text-[13px] font-semibold leading-5 text-[#4b3929] outline-none focus:border-[#ea5a1f]"
                />
                <button
                  type="button"
                  onClick={() => {
                    void handleBulkSave()
                  }}
                  disabled={!bulkInput.trim()}
                  className="mt-2 flex min-h-11 w-full items-center justify-center rounded-[13px] bg-[#2f2117] px-3 text-[13px] font-black text-white disabled:bg-[#d1c6bb]"
                >
                  붙여넣은 재료 일괄 등록
                </button>
              </div>
            ) : null}

            {/* 재료명 */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-bold text-gray-700">재료명 *</label>
              <input
                type="text"
                placeholder="예: 돼지고기 목살"
                value={form.name}
                onChange={(e) => handleIngredientNameChange(e.target.value)}
                onBlur={(e) => handleIngredientNameChange(normalizeIngredientInput(e.target.value))}
                className="w-full rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 py-3.5 text-sm outline-none transition-colors focus:border-mint-300 focus:bg-white"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {frequentIngredientPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleIngredientNameChange(preset)}
                    className="rounded-full bg-[#fff7ed] px-3 py-1.5 text-[12px] font-black text-[#8a5a2a] ring-1 ring-[#eadcc9]"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* 카테고리 */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-bold text-gray-700">카테고리</label>
              <div className="grid grid-cols-2 gap-2 min-[380px]:grid-cols-3">
                {INGREDIENT_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setForm({ ...form, category: cat })
                      setCategoryTouched(true)
                    }}
                    className={`min-h-11 rounded-2xl px-2.5 py-2 text-[13px] font-bold transition-all ${
                      form.category === cat ? 'bg-mint-200 text-mint-500 shadow-sm' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {getCategoryEmoji(cat)} {cat}
                  </button>
                ))}
              </div>
              <p className="mt-2 rounded-xl bg-gray-50 px-3 py-2 text-xs font-semibold leading-5 text-gray-500">
                재료명으로 자동 추천하고, 직접 누른 카테고리는 그대로 저장합니다.
              </p>
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
                {suggestedIngredients.length === 0 ? (
                  <div className="rounded-xl bg-white px-3 py-4 text-center">
                    <p className="text-xs font-semibold text-gray-500">검색 결과가 없습니다.</p>
                    <p className="mt-1 text-xs text-gray-400">아래 재료명 입력칸에 직접 적어도 저장할 수 있어요.</p>
                  </div>
                ) : (
                  <>
                    <div className="max-h-28 overflow-y-auto pr-1">
                      <div className="flex flex-wrap gap-2">
                        {suggestedIngredients.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                name: item.name,
                                storage_type: item.defaultStorageType ?? prev.storage_type,
                                amount_unit: item.defaultUnit ?? prev.amount_unit,
                              }))
                            }
                            aria-pressed={form.name === item.name}
                            className={`rounded-full px-3.5 py-2 text-sm font-medium transition-all ${
                              form.name === item.name
                                ? 'bg-mint-300 text-white shadow-soft'
                                : 'bg-white text-mint-500 hover:bg-mint-100'
                            }`}
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2">
                      <p className="text-xs text-gray-400">
                        총 {suggestionTotal}개 중 {suggestedIngredients.length}개 표시
                      </p>
                      <span className="text-[11px] font-semibold text-mint-500">목록에 없으면 직접 입력</span>
                    </div>
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
                    onClick={() => handleStorageChange(type)}
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
                <label className="mb-2 block text-sm font-bold text-gray-700">수량 숫자</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder={form.category === '조미료' ? '비워도 저장돼요' : '예: 2'}
                  value={form.amount_value}
                  onChange={(e) => setForm({ ...form, amount_value: e.target.value })}
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
                <div className="mt-2 flex flex-wrap gap-2">
                  {expiryQuickOptions.map((option) => {
                    const quickDate = buildFutureDate(option.days)
                    const isActive = form.expiry_date === quickDate
                    return (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => setForm({ ...form, expiry_date: quickDate })}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
                          isActive
                            ? 'bg-mint-300 text-white shadow-soft'
                            : 'bg-white text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        +{option.label}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, expiry_date: '', memo: mergeMemoDisplay(form.memo || null, '유통기한 나중에 확인') ?? '' })}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
                      !form.expiry_date
                        ? 'bg-[#f1e4d7] text-[#7d6d5f]'
                        : 'bg-white text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    나중에 알림
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label className="block text-sm font-bold text-gray-700">단위 선택</label>
                <span className="text-xs text-gray-400">
                  현재 기준: {settings.unitSystem === 'metric' ? 'ml / g' : settings.unitSystem === 'spoon' ? '큰술 / 작은술' : '개 / 봉 / 팩'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {unitOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setForm({ ...form, amount_unit: option.value })}
                    className={`rounded-full px-3.5 py-2 text-sm font-medium transition-all ${
                      form.amount_unit === option.value
                        ? 'bg-mint-300 text-white shadow-soft'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-400">
                저장 시 {form.amount_value.trim() ? buildQuantityDisplay(Number(form.amount_value), form.amount_unit, settings.unitSystem) ?? '수량 미정' : '수량 미정'} 형태로 보입니다.
              </p>
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
            <div className="sticky bottom-0 -mx-5 bg-white px-5 pb-[calc(1rem_+_env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_24px_rgba(255,255,255,0.95)]">
              <button
                onClick={() => {
                  void handleSave()
                }}
                className="h-14 w-full rounded-2xl bg-mint-300 text-base font-bold text-white shadow-soft transition-colors hover:bg-mint-400"
              >
                {editingId ? '수정 완료 ✨' : '저장하고 계속 추가 ✨'}
              </button>
              {saveMessage ? (
                <p className="mt-2 text-center text-xs font-semibold text-mint-500">{saveMessage}</p>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FridgeStat({
  label,
  value,
  warning = false,
}: {
  label: string
  value: string
  warning?: boolean
}) {
  return (
    <div className="px-3 py-3">
      <p className={`text-[11px] font-bold ${warning ? 'text-[#d94d19]' : 'text-[#7d6d5f]'}`}>{label}</p>
      <p className={`mt-1 text-[14px] font-black ${warning ? 'text-[#d94d19]' : 'text-[#2f2117]'}`}>{value}</p>
    </div>
  )
}
