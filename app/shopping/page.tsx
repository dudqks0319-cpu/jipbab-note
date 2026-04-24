// 이 파일은 장보기 리스트 화면을 담당하며 참고 이미지의 체크리스트 UI를 구현합니다.
'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Check, ExternalLink, Plus, Share2, Trash2 } from 'lucide-react'

import { APPSTORE_DEMO_SHOPPING_ITEMS } from '@/lib/demo-state'
import { useDemoMode } from '@/hooks/useDemoMode'
import { useIngredients } from '@/hooks/useIngredients'
import { useShopping } from '@/hooks/useShopping'
import { getCoupangSearchUrl } from '@/lib/external-links'
import { STARTER_INGREDIENT_TEMPLATES } from '@/lib/starter-ingredients'
import { INGREDIENT_CATEGORIES, type IngredientCategory } from '@/types'
import type { ShoppingItem } from '@/types'

const DEFAULT_CATEGORY: IngredientCategory = '채소'

export default function ShoppingPage() {
  const isAppStoreDemo = useDemoMode()
  const { items, addItem, toggleItem, removeItem, clearCheckedItems } = useShopping()
  const { ingredients, addIngredient, updateIngredient } = useIngredients()
  const [showAddForm, setShowAddForm] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [category, setCategory] = useState<IngredientCategory>(DEFAULT_CATEGORY)

  const displayItems = isAppStoreDemo ? APPSTORE_DEMO_SHOPPING_ITEMS : items
  const uncheckedItems = useMemo(() => displayItems.filter((item) => !item.checked), [displayItems])
  const checkedItems = useMemo(() => displayItems.filter((item) => item.checked), [displayItems])
  const groupedUncheckedItems = useMemo(() => {
    const groups = new Map<string, typeof uncheckedItems>()
    for (const item of uncheckedItems) {
      const key = item.category ?? '기타'
      groups.set(key, [...(groups.get(key) ?? []), item])
    }
    return Array.from(groups.entries())
  }, [uncheckedItems])

  const handleAdd = () => {
    if (!name.trim()) {
      return
    }

    void addItem({ name, quantity, category })
    setName('')
    setQuantity('')
    setCategory(DEFAULT_CATEGORY)
    setStatusMessage('장보기 항목을 추가했어요. 계속 추가할 수 있습니다.')
  }

  const getStorageTypeForCategory = (itemCategory: IngredientCategory | null) => {
    if (itemCategory === '냉동식품') return '냉동' as const
    if (itemCategory === '조미료' || itemCategory === '곡물/면/빵' || itemCategory === '통조림/가공식품') return '실온' as const
    return '냉장' as const
  }

  const addShoppingItemToFridge = async (item: ShoppingItem) => {
    const duplicate = ingredients.find(
      (ingredient) => ingredient.name.trim().toLowerCase() === item.name.trim().toLowerCase(),
    )
    if (duplicate) {
      const shouldMerge = window.confirm(`${item.name}이 이미 냉장고에 있어요. 기존 재료와 합칠까요?`)
      if (!shouldMerge) return

      await updateIngredient(duplicate.id, {
        name: duplicate.name,
        category: duplicate.category ?? item.category,
        storageType: duplicate.storageType,
        quantity: duplicate.quantity || item.quantity,
        expiryDate: duplicate.expiryDate,
        purchaseDate: duplicate.purchaseDate,
        openedAt: duplicate.openedAt,
        storageLocation: duplicate.storageLocation,
        unitPrice: duplicate.unitPrice,
        purchasePlace: duplicate.purchasePlace,
        consumedAt: duplicate.consumedAt,
        discardedAt: duplicate.discardedAt,
        repeatPurchase: duplicate.repeatPurchase,
        barcode: duplicate.barcode,
        imageUrl: duplicate.imageUrl,
        memo: [duplicate.memo, item.sourceRecipeName ? `${item.sourceRecipeName} 장보기에서 합침` : '장보기에서 합침']
          .filter(Boolean)
          .join(' · '),
      })
      if (!item.checked) {
        await toggleItem(item.id)
      }
      setStatusMessage(`${item.name}을 기존 냉장고 재료와 합쳤어요.`)
      return
    }

    await addIngredient({
      name: item.name,
      category: item.category,
      storageType: getStorageTypeForCategory(item.category),
      quantity: item.quantity,
      expiryDate: null,
      memo: item.sourceRecipeName ? `${item.sourceRecipeName} 장보기에서 추가` : '장보기에서 추가',
    })
    if (!item.checked) {
      await toggleItem(item.id)
    }
    setStatusMessage(`${item.name}을 냉장고에 추가했어요. 유통기한은 나중에 입력할 수 있습니다.`)
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
      </section>

      <section className="px-5 pt-4">
        {showAddForm ? (
          <div className="jipbab-panel rounded-[16px] p-4">
            <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-[minmax(0,1fr)_92px]">
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
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
                onChange={(event) => setCategory(event.target.value as IngredientCategory)}
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
                disabled={!name.trim()}
                className="inline-flex min-w-0 items-center justify-center gap-1 rounded-[12px] bg-[#ea5a1f] px-3 py-3 text-sm font-black text-white disabled:bg-[#e6b49a]"
              >
                <Plus size={15} />
                추가
              </button>
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
              {STARTER_INGREDIENT_TEMPLATES.slice(0, 4).map((item) => (
                <a
                  key={item.name}
                  href={getCoupangSearchUrl(item.name)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-[#fff0e4] px-3 py-2 text-[12px] font-black text-[#d94d19]"
                >
                  {item.name} 바로 사기
                </a>
              ))}
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
                      quantity={item.quantity || '수량 미정'}
                      checked={false}
                      onToggle={() => toggleItem(item.id)}
                      onRemove={() => removeItem(item.id)}
                      onAddToFridge={() => addShoppingItemToFridge(item)}
                    />
                  ))}
                </div>
              ))}
            </ShoppingGroup>

            {checkedItems.length > 0 ? (
              <ShoppingGroup title={`구매완료 (${checkedItems.length})`}>
                {checkedItems.map((item) => (
                  <ShoppingRow
                    key={item.id}
                    name={item.name}
                    quantity={item.quantity || '수량 미정'}
                    checked
                    onToggle={() => toggleItem(item.id)}
                    onRemove={() => removeItem(item.id)}
                    onAddToFridge={() => addShoppingItemToFridge(item)}
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
  quantity,
  checked,
  onToggle,
  onRemove,
  onAddToFridge,
}: {
  name: string
  quantity: string
  checked: boolean
  onToggle: () => void
  onRemove: () => void
  onAddToFridge: () => void
}) {
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
      </div>
      {!checked ? (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onAddToFridge}
            className="inline-flex h-8 items-center rounded-full bg-[#2f2117] px-2.5 text-[11px] font-black text-white"
          >
            재료 추가
          </button>
          <a
            href={getCoupangSearchUrl(name)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1 rounded-full bg-[#fff0e4] px-2.5 text-[11px] font-black text-[#d94d19]"
          >
            <ExternalLink size={12} />
            구매
          </a>
        </div>
      ) : null}
      <button type="button" onClick={onRemove} className="rounded-full p-2 text-[#b5a493] hover:bg-[#fff0e4] hover:text-[#d94d19]" aria-label={`${name} 삭제`}>
        <Trash2 size={14} />
      </button>
    </div>
  )
}
