// 이 파일은 장보기 리스트 화면을 담당하며 참고 이미지의 체크리스트 UI를 구현합니다.
'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Check, ExternalLink, Plus, Refrigerator, Share2, Trash2 } from 'lucide-react'

import { APPSTORE_DEMO_SHOPPING_ITEMS } from '@/lib/demo-state'
import { useDemoMode } from '@/hooks/useDemoMode'
import { useIngredients } from '@/hooks/useIngredients'
import { usePartnerLinks } from '@/hooks/usePartnerLinks'
import { useShopping } from '@/hooks/useShopping'
import { getCoupangPurchaseLink } from '@/lib/external-links'
import { normalizeIngredientInput, suggestIngredientCategory } from '@/lib/ingredient-category'
import {
  buildIngredientPayloadFromShoppingItem,
  buildMergedIngredientPayloadFromShoppingItem,
  getStorageTypeForShoppingCategory,
  normalizeShoppingIngredientName,
} from '@/lib/shopping-to-fridge'
import { STARTER_INGREDIENT_TEMPLATES } from '@/lib/starter-ingredients'
import { INGREDIENT_CATEGORIES, type IngredientCategory } from '@/types'
import type { ShoppingItem } from '@/types'
import type { PartnerLinkConfig } from '@/lib/partner-links'

const DEFAULT_CATEGORY: IngredientCategory = '채소'
const PARTNERS_DISCLOSURE = '일부 구매 링크는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.'

function externalLinkRel() {
  return 'sponsored noopener noreferrer'
}

function buildFridgePrefillHref(item: Pick<ShoppingItem, 'name' | 'quantity' | 'category' | 'sourceRecipeName'>): string {
  const params = new URLSearchParams({
    add: '1',
    name: item.name,
    storage: getStorageTypeForShoppingCategory(item.category),
  })
  if (item.quantity) {
    params.set('quantity', item.quantity)
  }
  if (item.category) {
    params.set('category', item.category)
  }
  if (item.sourceRecipeName) {
    params.set('source', `${item.sourceRecipeName} 부족 재료`)
  }
  return `/fridge?${params.toString()}`
}

export default function ShoppingPage() {
  const isAppStoreDemo = useDemoMode()
  const { items, addItem, toggleItem, removeItem, clearCheckedItems, source: shoppingSource } = useShopping()
  const { ingredients, addIngredient, updateIngredient, source: ingredientSource } = useIngredients()
  const partnerLinks = usePartnerLinks()
  const [showAddForm, setShowAddForm] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [category, setCategory] = useState<IngredientCategory>(DEFAULT_CATEGORY)
  const [categoryTouched, setCategoryTouched] = useState(false)

  const displayItems = isAppStoreDemo ? APPSTORE_DEMO_SHOPPING_ITEMS : items
  const uncheckedItems = useMemo(() => displayItems.filter((item) => !item.checked), [displayItems])
  const checkedItems = useMemo(() => displayItems.filter((item) => item.checked), [displayItems])
  const isLocalMode = !isAppStoreDemo && (shoppingSource === 'local' || ingredientSource === 'local')
  const groupedUncheckedItems = useMemo(() => {
    const groups = new Map<string, typeof uncheckedItems>()
    for (const item of uncheckedItems) {
      const key = item.category ?? '기타'
      groups.set(key, [...(groups.get(key) ?? []), item])
    }
    return Array.from(groups.entries())
  }, [uncheckedItems])

  const handleAdd = () => {
    const normalizedName = normalizeIngredientInput(name)
    const normalizedQuantity = quantity.trim()
    const safeCategory = categoryTouched ? category : suggestIngredientCategory(normalizedName, category)

    if (!normalizedName) {
      return
    }

    void addItem({ name: normalizedName, quantity: normalizedQuantity, category: safeCategory })
    setName('')
    setQuantity('')
    setCategory(DEFAULT_CATEGORY)
    setCategoryTouched(false)
    setStatusMessage('장보기 항목을 추가했어요. 계속 추가할 수 있습니다.')
  }

  const handleNameChange = (value: string) => {
    setName(value)
    if (!categoryTouched) {
      setCategory(suggestIngredientCategory(value, DEFAULT_CATEGORY))
    }
  }

  const addShoppingItemToFridge = async (item: ShoppingItem) => {
    const duplicate = ingredients.find(
      (ingredient) => normalizeShoppingIngredientName(ingredient.name) === normalizeShoppingIngredientName(item.name),
    )
    if (duplicate) {
      const shouldMerge = window.confirm(`${item.name}이 이미 냉장고에 있어요. 기존 재료와 합칠까요?`)
      if (!shouldMerge) return

      await updateIngredient(duplicate.id, buildMergedIngredientPayloadFromShoppingItem(duplicate, item))
      if (!item.checked) {
        await toggleItem(item.id)
      }
      setStatusMessage(`${item.name}을 기존 냉장고 재료와 합쳤어요.`)
      return
    }

    await addIngredient(buildIngredientPayloadFromShoppingItem(item))
    if (!item.checked) {
      await toggleItem(item.id)
    }
    setStatusMessage(`${item.name}을 냉장고에 추가했어요. 유통기한은 나중에 입력할 수 있습니다.`)
  }

  const addCheckedItemsToFridge = async () => {
    if (checkedItems.length === 0) return

    for (const item of checkedItems) {
      await addShoppingItemToFridge(item)
    }
    setStatusMessage(`구매완료 ${checkedItems.length}개를 냉장고에 반영했어요. 확인 후 완료 항목을 정리하세요.`)
  }

  const shareList = async () => {
    const text = uncheckedItems.length === 0
      ? '집밥노트 장보기 목록이 비어 있어요.'
      : uncheckedItems.map((item) => `- ${item.name}${item.quantity ? ` ${item.quantity}` : ''}`).join('\n')

    if (navigator.share) {
      await navigator.share({ title: '집밥노트 장보기 리스트', text })
      return
    }

    await navigator.clipboard?.writeText(text)
  }

  return (
    <div className="min-h-full bg-[#fbf6ee] pb-6">
      <section className="mobile-safe-top px-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-black text-[#2f2117]">장보기 리스트</h1>
            <p className="mt-1 text-[12px] font-semibold text-[#8f7f70]">필요한 재료를 구매 상태별로 확인하고 외부 쇼핑 링크는 Safari에서 여세요.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={shareList} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#eadcc9] text-[#7d6d5f]" aria-label="장보기 공유">
              <Share2 size={15} />
            </button>
            <button type="button" onClick={() => setShowAddForm((prev) => !prev)} className="rounded-full border border-[#ea5a1f] px-3 py-1.5 text-[12px] font-black text-[#d94d19]">
              편집
            </button>
          </div>
        </div>

        <div className="jipbab-panel mt-4 grid grid-cols-3 overflow-hidden rounded-[16px] text-center">
          <ShoppingStat label="전체" value={`${displayItems.length}개`} />
          <ShoppingStat label="구매완료" value={`${checkedItems.length}개`} good />
          <ShoppingStat label="미구매" value={`${uncheckedItems.length}개`} warning />
        </div>
        {statusMessage ? (
          <p className="mt-3 rounded-[14px] border border-[#dce8c8] bg-[#f2f7e7] px-3 py-2 text-[12px] font-bold text-[#3d7b38]">
            {statusMessage}
          </p>
        ) : null}
        {isLocalMode ? (
          <p className="mt-3 rounded-[14px] border border-[#f6d7b8] bg-[#fff7ed] px-3 py-2 text-[11px] font-bold leading-relaxed text-[#9a4f14]">
            현재 일부 데이터가 이 기기에만 저장되는 로컬 모드입니다. 로그인/네트워크 복구 후 새로고침해 클라우드 동기화 상태를 확인하세요.
          </p>
        ) : null}
        <p className="mt-3 rounded-[14px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-2 text-[11px] font-bold leading-relaxed text-[#7d6d5f]">
          {PARTNERS_DISCLOSURE}
        </p>
      </section>

      <section className="px-5 pt-4">
        {showAddForm ? (
          <div className="jipbab-panel rounded-[16px] p-4">
            <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-[minmax(0,1fr)_92px]">
              <input
                type="text"
                value={name}
                onChange={(event) => handleNameChange(event.target.value)}
                onBlur={(event) => handleNameChange(normalizeIngredientInput(event.target.value))}
                placeholder="재료명"
                className="min-w-0 rounded-[12px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-3 text-sm font-semibold text-[#4b3929] outline-none focus:border-[#ea5a1f]"
              />
              <input
                type="text"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="수량"
                className="min-w-0 rounded-[12px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-3 text-sm font-semibold text-[#4b3929] outline-none focus:border-[#ea5a1f]"
              />
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 min-[360px]:grid-cols-[minmax(0,1fr)_96px]">
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value as IngredientCategory)
                  setCategoryTouched(true)
                }}
                className="min-w-0 rounded-[12px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-3 text-sm font-semibold text-[#4b3929] outline-none focus:border-[#ea5a1f]"
              >
                {INGREDIENT_CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!normalizeIngredientInput(name)}
                className="inline-flex min-w-0 items-center justify-center gap-1 rounded-[12px] bg-[#ea5a1f] px-3 py-3 text-sm font-black text-white disabled:bg-[#e6b49a]"
              >
                <Plus size={15} />
                추가
              </button>
              <p className="rounded-[12px] bg-[#fff7ed] px-3 py-2 text-[11px] font-bold leading-5 text-[#8a5a2a] min-[360px]:col-span-2">
                재료명을 입력하면 카테고리를 자동 추천합니다. 직접 바꾸면 선택한 값으로 저장돼요.
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="px-5 pt-4">
        {displayItems.length === 0 ? (
          <div className="jipbab-panel rounded-[18px] px-4 py-12 text-center">
            <p className="text-sm font-black text-[#4b3929]">장보기 목록이 비어 있어요.</p>
            <p className="mt-1 text-xs text-[#8f7f70]">레시피 부족 재료를 담거나 직접 추가하세요.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {STARTER_INGREDIENT_TEMPLATES.slice(0, 4).map((item) => {
                const purchaseLink = getCoupangPurchaseLink({
                  name: item.name,
                  category: item.category ?? null,
                }, partnerLinks)

                return (
                  <a
                    key={item.name}
                    href={purchaseLink.href}
                    target="_blank"
                    rel={externalLinkRel()}
                    className="rounded-full bg-[#fff0e4] px-3 py-2 text-[12px] font-black text-[#d94d19]"
                  >
                    {item.name} 바로 사기
                  </a>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <ShoppingGroup title={`미구매 (${uncheckedItems.length})`}>
              {groupedUncheckedItems.map(([categoryName, group]) => (
                <div key={categoryName} className="border-b border-[#eadcc9] last:border-b-0">
                  <p className="bg-[#fff7ed] px-3 py-2 text-[11px] font-black text-[#8a5a2a]">{categoryName}</p>
                  {group.map((item) => (
                    <ShoppingRow
                      key={item.id}
                      name={item.name}
                      category={item.category}
                      quantity={item.quantity || '수량 미정'}
                      sourceRecipeName={item.sourceRecipeName}
                      checked={false}
                      onToggle={() => toggleItem(item.id)}
                      onRemove={() => removeItem(item.id)}
                      fridgePrefillHref={buildFridgePrefillHref(item)}
                      partnerLinks={partnerLinks}
                    />
                  ))}
                </div>
              ))}
            </ShoppingGroup>

            {checkedItems.length > 0 ? (
              <ShoppingGroup title={`구매완료 (${checkedItems.length})`}>
                <div className="bg-[#f2f7e7] px-3 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      void addCheckedItemsToFridge()
                    }}
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[12px] bg-[#2f2117] px-3 text-[12px] font-black text-white"
                  >
                    <Refrigerator size={15} />
                    구매완료 {checkedItems.length}개 냉장고에 반영
                  </button>
                </div>
                {checkedItems.map((item) => (
                  <ShoppingRow
                    key={item.id}
                    name={item.name}
                    category={item.category}
                    quantity={item.quantity || '수량 미정'}
                    sourceRecipeName={item.sourceRecipeName}
                    checked
                    onToggle={() => toggleItem(item.id)}
                    onRemove={() => removeItem(item.id)}
                    fridgePrefillHref={buildFridgePrefillHref(item)}
                    partnerLinks={partnerLinks}
                    addToFridgeLabel="냉장고 반영"
                  />
                ))}
              </ShoppingGroup>
            ) : null}

            {checkedItems.length > 0 ? (
              <button
                type="button"
                onClick={clearCheckedItems}
                className="w-full rounded-[14px] border border-[#eadcc9] bg-[#fffaf3] py-3 text-sm font-black text-[#d94d19]"
              >
                완료 항목 정리
              </button>
            ) : null}
          </div>
        )}
      </section>
    </div>
  )
}

function ShoppingStat({ label, value, good = false, warning = false }: { label: string; value: string; good?: boolean; warning?: boolean }) {
  const color = warning ? 'text-[#d94d19]' : good ? 'text-[#3d7b38]' : 'text-[#2f2117]'

  return (
    <div className="border-r border-[#eadcc9] px-3 py-3 last:border-r-0">
      <p className={`text-[14px] font-black ${color}`}>{value}</p>
      <p className="mt-1 text-[11px] font-bold text-[#8f7f70]">{label}</p>
    </div>
  )
}

function ShoppingGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-[13px] font-black text-[#4b3929]">{title}</h2>
      <div className="jipbab-panel divide-y divide-[#eadcc9] overflow-hidden rounded-[16px]">{children}</div>
    </div>
  )
}

function ShoppingRow({
  name,
  category,
  quantity,
  sourceRecipeName,
  checked,
  onToggle,
  onRemove,
  fridgePrefillHref,
  partnerLinks,
  addToFridgeLabel = '냉장고 반영',
}: {
  name: string
  category: IngredientCategory | null
  quantity: string
  sourceRecipeName: string | null
  checked: boolean
  onToggle: () => void
  onRemove: () => void
  fridgePrefillHref: string
  partnerLinks: PartnerLinkConfig
  addToFridgeLabel?: string
}) {
  const purchaseLink = getCoupangPurchaseLink({ name, category }, partnerLinks)

  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <button
        type="button"
        onClick={onToggle}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border ${
          checked ? 'border-[#5e9560] bg-[#5e9560] text-white' : 'border-[#c9b7a4] bg-[#fffaf3]'
        }`}
        aria-label={`${name} 구매 상태 변경`}
      >
        {checked ? <Check size={13} /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[14px] font-bold ${checked ? 'text-[#9f9388] line-through' : 'text-[#2f2117]'}`}>{name}</p>
        <p className="mt-0.5 text-[11px] font-semibold text-[#8f7f70]">{quantity}</p>
        {sourceRecipeName ? (
          <p className="mt-0.5 text-[10px] font-black leading-4 text-[#8a5a2a]">
            {sourceRecipeName} 부족 재료
          </p>
        ) : null}
        {!checked && purchaseLink.isPartnerLink ? (
          <p className="mt-0.5 text-[10px] font-bold leading-4 text-[#b45309]">
            제휴 링크이며 구매 시 수수료를 받을 수 있어요.
          </p>
        ) : null}
      </div>
      {!checked ? (
        <div className="flex shrink-0 flex-col gap-1">
          <a
            href={purchaseLink.href}
            target="_blank"
            rel={externalLinkRel()}
            className="inline-flex h-8 items-center justify-center gap-1 rounded-full bg-[#fff0e4] px-2.5 text-[11px] font-black text-[#d94d19]"
            aria-label={`${name} ${purchaseLink.isPartnerLink ? '파트너스 링크' : '쿠팡 검색'} 열기`}
          >
            <ExternalLink size={12} />
            구매
          </a>
          <Link
            href={fridgePrefillHref}
            className="inline-flex h-8 items-center justify-center gap-1 rounded-full bg-[#2f2117] px-2.5 text-[11px] font-black text-white"
          >
            <Refrigerator size={12} />
            추가
          </Link>
        </div>
      ) : (
        <Link
          href={fridgePrefillHref}
          className="inline-flex h-8 shrink-0 items-center rounded-full bg-[#2f2117] px-2.5 text-[11px] font-black text-white"
        >
          {addToFridgeLabel}
        </Link>
      )}
      <button type="button" onClick={onRemove} className="rounded-full p-2 text-[#b5a493] hover:bg-[#fff0e4] hover:text-[#d94d19]" aria-label={`${name} 삭제`}>
        <Trash2 size={14} />
      </button>
    </div>
  )
}
