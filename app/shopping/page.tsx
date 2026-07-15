// 이 파일은 장보기 리스트 화면을 담당하며 참고 이미지의 체크리스트 UI를 구현합니다.
'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { CalendarDays, Check, CheckCircle2, ExternalLink, Plus, RefreshCw, Refrigerator, Share2, Trash2 } from 'lucide-react'

import { APPSTORE_DEMO_SHOPPING_ITEMS } from '@/lib/demo-state'
import { useDemoMode } from '@/hooks/useDemoMode'
import { useFamilyShare } from '@/hooks/useFamilyShare'
import { useIngredients } from '@/hooks/useIngredients'
import { usePartnerLinks } from '@/hooks/usePartnerLinks'
import { useShopping } from '@/hooks/useShopping'
import { getCoupangPurchaseLink } from '@/lib/external-links'
import { getIngredientCatalog } from '@/lib/ingredient-catalog'
import { normalizeIngredientInput, suggestIngredientCategory } from '@/lib/ingredient-category'
import {
  buildIngredientPayloadFromShoppingItem,
  buildMergedIngredientPayloadFromShoppingItem,
  normalizeShoppingIngredientName,
} from '@/lib/shopping-to-fridge'
import { getIngredientPhotoUrl } from '@/lib/utils'
import { INGREDIENT_CATEGORIES, INGREDIENT_STORAGE_TYPES, type IngredientCatalogItem, type IngredientCategory, type IngredientStorageType } from '@/types'
import type { ShoppingItem } from '@/types'
import type { PartnerLinkConfig } from '@/lib/partner-links'

const DEFAULT_CATEGORY: IngredientCategory = '채소'
const PARTNERS_DISCLOSURE = '일부 구매 링크는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.'
type AddShoppingDraftOptions = {
  duplicateMode?: 'ask' | 'merge' | 'skip'
}
type ShoppingCatalogScope = {
  categories?: readonly IngredientCategory[]
  keywords?: readonly string[]
  excludeKeywords?: readonly string[]
}
type ShoppingCatalogSubcategory = ShoppingCatalogScope & {
  id: string
  label: string
  imageName: string
  imageCategory: IngredientCategory
}
type ShoppingCatalogGroup = ShoppingCatalogScope & {
  id: string
  label: string
  subcategories: ShoppingCatalogSubcategory[]
}

const QUICK_SHOPPING_CHIPS: Array<{ name: string; quantity: string; category: IngredientCategory }> = [
  { name: '두부', quantity: '1모', category: '통조림/가공식품' },
  { name: '계란', quantity: '10개', category: '육류' },
  { name: '우유', quantity: '1L', category: '유제품' },
  { name: '대파', quantity: '1단', category: '채소' },
  { name: '양파', quantity: '3개', category: '채소' },
  { name: '김치', quantity: '1팩', category: '통조림/가공식품' },
  { name: '돼지고기', quantity: '600g', category: '육류' },
]
const SHOPPING_CATALOG_ITEMS = getIngredientCatalog()
const SHOPPING_CATALOG_QUANTITY_BY_NAME: Partial<Record<string, string>> = {
  계란: '10개',
  두부: '1모',
  우유: '1L',
  대파: '1단',
  양파: '3개',
  감자: '3개',
  고구마: '3개',
  당근: '2개',
  오이: '2개',
  애호박: '1개',
  양배추: '1통',
  콩나물: '1봉',
  숙주: '1봉',
  김치: '1팩',
  돼지고기: '600g',
  소고기: '600g',
  닭고기: '1팩',
  참치캔: '1캔',
  스팸: '1캔',
  어묵: '1봉',
  국수: '1봉',
  라면: '5개',
  냉동만두: '1봉',
  냉동새우: '1봉',
  생수: '2L',
}
const SHOPPING_CATALOG_GROUPS: ShoppingCatalogGroup[] = [
  {
    id: 'all',
    label: '전체',
    subcategories: [
      { id: 'all', label: '전체', imageName: '양파', imageCategory: '채소' },
      { id: 'fresh', label: '채소/과일', categories: ['채소', '과일'], imageName: '상추', imageCategory: '채소' },
      { id: 'meat-egg', label: '정육/계란', categories: ['육류'], keywords: ['계란', '달걀', '두부'], imageName: '계란', imageCategory: '육류' },
      { id: 'seafood', label: '수산/건어물', categories: ['수산물'], imageName: '고등어', imageCategory: '수산물' },
      { id: 'dairy', label: '우유/유제품', categories: ['유제품'], imageName: '우유', imageCategory: '유제품' },
      { id: 'rice-noodle', label: '쌀/면/빵', categories: ['곡물/면/빵'], imageName: '쌀', imageCategory: '곡물/면/빵' },
      { id: 'kimchi-processed', label: '김치/가공', categories: ['통조림/가공식품'], keywords: ['어묵'], imageName: '김치', imageCategory: '통조림/가공식품' },
      { id: 'frozen', label: '냉동/간편', categories: ['냉동식품'], imageName: '냉동만두', imageCategory: '냉동식품' },
      { id: 'seasoning', label: '장/양념', categories: ['조미료'], imageName: '간장', imageCategory: '조미료' },
      { id: 'drink-etc', label: '커피/음료', categories: ['음료/기타'], imageName: '커피', imageCategory: '음료/기타' },
    ],
  },
  {
    id: 'fresh',
    label: '채소/과일',
    categories: ['채소', '과일'],
    subcategories: [
      { id: 'all', label: '전체', imageName: '애호박', imageCategory: '채소' },
      { id: 'leaf', label: '상추/쌈채소', keywords: ['상추', '깻잎', '양상추'], imageName: '상추', imageCategory: '채소' },
      { id: 'namul', label: '시금치/나물', keywords: ['시금치', '콩나물', '숙주', '고사리', '미나리', '도라지', '부추'], imageName: '시금치', imageCategory: '채소' },
      { id: 'pumpkin', label: '호박/가지', keywords: ['애호박', '가지', '단호박', '오이'], imageName: '애호박', imageCategory: '채소' },
      { id: 'root', label: '감자/고구마', keywords: ['감자', '고구마', '당근', '무', '연근', '우엉'], imageName: '감자', imageCategory: '채소' },
      { id: 'fruit', label: '과일', categories: ['과일'], imageName: '사과', imageCategory: '과일' },
    ],
  },
  {
    id: 'meat-egg',
    label: '정육/계란',
    categories: ['육류'],
    keywords: ['계란', '달걀', '두부'],
    subcategories: [
      { id: 'all', label: '전체', imageName: '계란', imageCategory: '육류' },
      { id: 'pork', label: '돼지고기', keywords: ['돼지고기', '삼겹살', '목살', '돼지갈비'], imageName: '돼지고기', imageCategory: '육류' },
      { id: 'beef', label: '소고기', keywords: ['소고기', '불고기', '국거리'], imageName: '소고기', imageCategory: '육류' },
      { id: 'chicken', label: '닭/오리', keywords: ['닭고기', '닭가슴살', '닭다리', '닭안심', '오리고기'], imageName: '닭고기', imageCategory: '육류' },
      { id: 'egg-tofu', label: '계란/두부', keywords: ['계란', '달걀', '두부'], imageName: '두부', imageCategory: '통조림/가공식품' },
      { id: 'ham', label: '햄/소시지', keywords: ['햄', '소시지', '베이컨'], imageName: '소시지', imageCategory: '육류' },
    ],
  },
  {
    id: 'seafood',
    label: '수산/건어물',
    categories: ['수산물'],
    subcategories: [
      { id: 'all', label: '전체', imageName: '연어', imageCategory: '수산물' },
      { id: 'fish', label: '생선', keywords: ['고등어', '연어', '갈치', '대구', '동태'], imageName: '고등어', imageCategory: '수산물' },
      { id: 'seafood', label: '새우/오징어', keywords: ['새우', '오징어', '문어', '바지락'], imageName: '새우', imageCategory: '수산물' },
      { id: 'dried', label: '건어물/해조', keywords: ['멸치', '다시마', '미역', '김', '황태채'], imageName: '멸치', imageCategory: '수산물' },
      { id: 'fishcake', label: '어묵/명란', keywords: ['어묵', '명란'], imageName: '어묵', imageCategory: '수산물' },
    ],
  },
  {
    id: 'dairy',
    label: '우유/유제품',
    categories: ['유제품'],
    subcategories: [
      { id: 'all', label: '전체', imageName: '우유', imageCategory: '유제품' },
      { id: 'milk', label: '우유/두유', keywords: ['우유', '두유'], imageName: '우유', imageCategory: '유제품' },
      { id: 'cheese', label: '치즈/버터', keywords: ['치즈', '모짜렐라', '파마산', '버터'], imageName: '치즈', imageCategory: '유제품' },
      { id: 'yogurt', label: '요거트/크림', keywords: ['요거트', '생크림', '크림치즈'], imageName: '요거트', imageCategory: '유제품' },
      { id: 'sauce', label: '마요네즈', keywords: ['마요네즈'], imageName: '마요네즈', imageCategory: '유제품' },
    ],
  },
  {
    id: 'rice-noodle',
    label: '쌀/면/빵',
    categories: ['곡물/면/빵'],
    subcategories: [
      { id: 'all', label: '전체', imageName: '쌀', imageCategory: '곡물/면/빵' },
      { id: 'rice', label: '쌀/잡곡', keywords: ['쌀', '현미'], imageName: '쌀', imageCategory: '곡물/면/빵' },
      { id: 'noodle', label: '면/라면', keywords: ['국수', '소면', '라면', '우동', '파스타', '당면'], imageName: '국수', imageCategory: '곡물/면/빵' },
      { id: 'bread', label: '빵/또띠아', keywords: ['식빵', '바게트', '빵가루', '또띠아', '라이스페이퍼'], imageName: '식빵', imageCategory: '곡물/면/빵' },
      { id: 'rice-cake', label: '떡', keywords: ['떡', '떡국떡', '떡볶이떡'], imageName: '떡', imageCategory: '곡물/면/빵' },
      { id: 'powder', label: '밀가루/전분', keywords: ['밀가루', '전분', '오트밀'], imageName: '밀가루', imageCategory: '곡물/면/빵' },
    ],
  },
  {
    id: 'kimchi-processed',
    label: '김치/가공',
    categories: ['통조림/가공식품'],
    keywords: ['어묵'],
    subcategories: [
      { id: 'all', label: '전체', imageName: '김치', imageCategory: '통조림/가공식품' },
      { id: 'kimchi', label: '김치/절임', keywords: ['김치', '피클', '올리브'], imageName: '김치', imageCategory: '통조림/가공식품' },
      { id: 'can', label: '통조림', keywords: ['참치캔', '옥수수캔', '콩통조림', '토마토캔', '골뱅이캔', '꽁치캔', '고등어캔'], imageName: '참치캔', imageCategory: '통조림/가공식품' },
      { id: 'ham', label: '햄/어묵', keywords: ['스팸', '햄통조림', '어묵', '닭가슴살캔'], imageName: '스팸', imageCategory: '통조림/가공식품' },
      { id: 'sauce', label: '소스/잼', keywords: ['토마토소스', '파스타소스', '잼'], imageName: '토마토소스', imageCategory: '통조림/가공식품' },
      { id: 'stock', label: '육수팩', keywords: ['육수팩'], imageName: '육수팩', imageCategory: '통조림/가공식품' },
    ],
  },
  {
    id: 'frozen',
    label: '냉동/간편',
    categories: ['냉동식품'],
    subcategories: [
      { id: 'all', label: '전체', imageName: '냉동만두', imageCategory: '냉동식품' },
      { id: 'meal', label: '볶음밥/면', keywords: ['냉동볶음밥', '냉동우동면'], imageName: '냉동볶음밥', imageCategory: '냉동식품' },
      { id: 'snack', label: '만두/간식', keywords: ['냉동만두', '냉동피자', '냉동돈까스', '냉동감자튀김', '냉동떡볶이', '냉동핫도그'], imageName: '냉동피자', imageCategory: '냉동식품' },
      { id: 'protein', label: '새우/닭가슴살', keywords: ['냉동새우', '냉동오징어', '냉동닭가슴살', '냉동어묵'], imageName: '냉동새우', imageCategory: '냉동식품' },
      { id: 'vegetable', label: '냉동채소/과일', keywords: ['냉동야채믹스', '냉동옥수수', '냉동시금치', '냉동블루베리'], imageName: '냉동야채믹스', imageCategory: '냉동식품' },
    ],
  },
  {
    id: 'seasoning',
    label: '장/양념',
    categories: ['조미료'],
    subcategories: [
      { id: 'all', label: '전체', imageName: '간장', imageCategory: '조미료' },
      { id: 'jang', label: '간장/장류', keywords: ['간장', '고추장', '된장', '쌈장'], imageName: '간장', imageCategory: '조미료' },
      { id: 'oil', label: '오일/식초', keywords: ['참기름', '들기름', '식용유', '올리브오일', '식초'], imageName: '참기름', imageCategory: '조미료' },
      { id: 'powder', label: '가루/향신료', keywords: ['소금', '설탕', '후추', '고춧가루', '카레가루', '깨', '들깨가루'], imageName: '고춧가루', imageCategory: '조미료' },
      { id: 'sauce', label: '소스/육수', keywords: ['굴소스', '케첩', '맛술', '치킨스톡', '멸치액젓', '까나리액젓', '고추기름', '겨자', '매실청'], imageName: '굴소스', imageCategory: '조미료' },
    ],
  },
  {
    id: 'drink-etc',
    label: '커피/음료',
    categories: ['음료/기타'],
    subcategories: [
      { id: 'all', label: '전체', imageName: '커피', imageCategory: '음료/기타' },
      { id: 'water', label: '물/탄산수', keywords: ['생수', '탄산수'], imageName: '생수', imageCategory: '음료/기타' },
      { id: 'drink', label: '주스/커피/차', keywords: ['주스', '커피', '티백', '홍차', '녹차'], imageName: '커피', imageCategory: '음료/기타' },
      { id: 'snack', label: '견과/꿀', keywords: ['견과류', '아몬드', '호두', '꿀'], imageName: '견과류', imageCategory: '음료/기타' },
      { id: 'baking', label: '시럽/코코아', keywords: ['올리고당', '코코아가루'], imageName: '코코아가루', imageCategory: '음료/기타' },
    ],
  },
]
const EXPIRY_PRESETS = [
  { label: '3일', days: 3 },
  { label: '1주', days: 7 },
  { label: '2주', days: 14 },
  { label: '1달', days: 30 },
] as const

function externalLinkRel(isPartnerLink: boolean) {
  return isPartnerLink ? 'sponsored noopener noreferrer' : 'noopener noreferrer'
}

function parseQuickShoppingInput(value: string): { name: string; quantity: string } {
  const normalized = normalizeIngredientInput(value)
  const match = normalized.match(/^(.+?)\s+(\d+(?:\.\d+)?\s*\S+)$/)
  if (!match) {
    return { name: normalized, quantity: '' }
  }

  return {
    name: normalizeIngredientInput(match[1] ?? ''),
    quantity: match[2]?.trim() ?? '',
  }
}

function getDateAfterDays(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function getShoppingCatalogQuantity(item: IngredientCatalogItem): string {
  const preset = SHOPPING_CATALOG_QUANTITY_BY_NAME[item.name]
  if (preset) {
    return preset
  }

  switch (item.defaultUnit) {
    case 'kg':
      return '1kg'
    case 'g':
      return '300g'
    case 'ml':
    case 'l':
      return '1L'
    case 'pack':
      return '1팩'
    case 'bag':
      return '1봉'
    case 'can':
      return '1캔'
    case 'bottle':
      return '1병'
    case 'block':
      return '1모'
    case 'sheet':
      return '1장'
    case 'slice':
      return '1봉'
    case 'tbsp':
    case 'tsp':
      return '1개'
    case 'piece':
    default:
      return '1개'
  }
}

function normalizeCatalogKeyword(value: string): string {
  return value.trim().replace(/\s+/g, '').toLowerCase()
}

function getCatalogSearchText(item: IngredientCatalogItem): string {
  return [item.name, item.category, ...(item.aliases ?? [])].map(normalizeCatalogKeyword).join(' ')
}

function itemMatchesShoppingScope(item: IngredientCatalogItem, scope: ShoppingCatalogScope): boolean {
  const searchText = getCatalogSearchText(item)
  const hasCategoryScope = Boolean(scope.categories?.length)
  const hasKeywordScope = Boolean(scope.keywords?.length)
  const matchesCategory = hasCategoryScope && Boolean(scope.categories?.includes(item.category))
  const matchesKeyword = hasKeywordScope && Boolean(scope.keywords?.some((keyword) => searchText.includes(normalizeCatalogKeyword(keyword))))

  if ((hasCategoryScope || hasKeywordScope) && !matchesCategory && !matchesKeyword) {
    return false
  }

  return !scope.excludeKeywords?.some((keyword) => searchText.includes(normalizeCatalogKeyword(keyword)))
}

function getShoppingCatalogGroupItems(group: ShoppingCatalogGroup): IngredientCatalogItem[] {
  return SHOPPING_CATALOG_ITEMS.filter((item) => itemMatchesShoppingScope(item, group))
}

function getShoppingCatalogSubcategoryItems(
  group: ShoppingCatalogGroup,
  subcategory: ShoppingCatalogSubcategory,
): IngredientCatalogItem[] {
  const groupItems = getShoppingCatalogGroupItems(group)
  if (subcategory.id === 'all') {
    return groupItems
  }

  return groupItems.filter((item) => itemMatchesShoppingScope(item, subcategory))
}

export default function ShoppingPage() {
  const isAppStoreDemo = useDemoMode()
  const { group } = useFamilyShare()
  const [selectedScope, setSelectedScope] = useState<'personal' | 'family'>('personal')
  const activeScope = selectedScope === 'family' && group ? 'family' : 'personal'
  const familyGroupId = activeScope === 'family' ? group?.id ?? null : null
  const {
    items,
    loading: shoppingLoading,
    cloudSyncState: shoppingCloudSyncState,
    addItem,
    toggleItem,
    removeItem,
    clearCheckedItems,
    listItems,
  } = useShopping({
    scope: activeScope,
    familyGroupId,
  })
  const {
    ingredients,
    loading: ingredientLoading,
    cloudSyncState: ingredientCloudSyncState,
    addIngredient,
    updateIngredient,
    listIngredients,
  } = useIngredients({
    scope: activeScope,
    familyGroupId,
  })
  const partnerLinks = usePartnerLinks()
  const [showAddForm, setShowAddForm] = useState(false)
  const [showCatalog, setShowCatalog] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [quickInput, setQuickInput] = useState('')
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [category, setCategory] = useState<IngredientCategory>(DEFAULT_CATEGORY)
  const [categoryTouched, setCategoryTouched] = useState(false)
  const [fridgeStorageType, setFridgeStorageType] = useState<IngredientStorageType>('냉장')
  const [fridgeExpiryDays, setFridgeExpiryDays] = useState<number>(7)
  const [purchasePlace, setPurchasePlace] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [selectedCatalogGroupId, setSelectedCatalogGroupId] = useState(SHOPPING_CATALOG_GROUPS[0]?.id ?? 'all')
  const [selectedCatalogSubcategoryId, setSelectedCatalogSubcategoryId] = useState('all')

  const displayItems = isAppStoreDemo ? APPSTORE_DEMO_SHOPPING_ITEMS : items
  const uncheckedItems = useMemo(() => displayItems.filter((item) => !item.checked), [displayItems])
  const checkedItems = useMemo(() => displayItems.filter((item) => item.checked), [displayItems])
  const pendingSyncCount = useMemo(
    () => displayItems.filter((item) => item.syncStatus && item.syncStatus !== 'synced').length,
    [displayItems],
  )
  const cloudSyncState =
    shoppingCloudSyncState === 'error' || ingredientCloudSyncState === 'error'
      ? 'error'
      : shoppingCloudSyncState === 'checking' || ingredientCloudSyncState === 'checking'
        ? 'checking'
        : shoppingCloudSyncState === 'synced' && ingredientCloudSyncState === 'synced'
          ? 'synced'
          : 'local-only'
  const syncRetrying = shoppingLoading || ingredientLoading
  const groupedUncheckedItems = useMemo(() => {
    const groups = new Map<string, typeof uncheckedItems>()
    for (const item of uncheckedItems) {
      const key = item.category ?? '기타'
      groups.set(key, [...(groups.get(key) ?? []), item])
    }
    return Array.from(groups.entries())
  }, [uncheckedItems])
  const shoppingNameSet = useMemo(
    () => new Set(displayItems.map((item) => normalizeShoppingIngredientName(item.name))),
    [displayItems],
  )
  const selectedCatalogGroup = useMemo(
    () => SHOPPING_CATALOG_GROUPS.find((groupItem) => groupItem.id === selectedCatalogGroupId) ?? SHOPPING_CATALOG_GROUPS[0],
    [selectedCatalogGroupId],
  )
  const selectedCatalogSubcategory = useMemo(
    () =>
      selectedCatalogGroup?.subcategories.find((subcategory) => subcategory.id === selectedCatalogSubcategoryId) ??
      selectedCatalogGroup?.subcategories[0],
    [selectedCatalogGroup, selectedCatalogSubcategoryId],
  )
  const selectedCatalogItems = useMemo(() => {
    if (!selectedCatalogGroup || !selectedCatalogSubcategory) {
      return SHOPPING_CATALOG_ITEMS
    }

    return getShoppingCatalogSubcategoryItems(selectedCatalogGroup, selectedCatalogSubcategory)
  }, [selectedCatalogGroup, selectedCatalogSubcategory])

  const addShoppingDraft = async (
    draft: { name: string; quantity?: string; category?: IngredientCategory },
    options: AddShoppingDraftOptions = {},
  ) => {
    const normalizedName = normalizeIngredientInput(draft.name)
    const normalizedQuantity = draft.quantity?.trim() ?? ''
    const safeCategory = draft.category ?? suggestIngredientCategory(normalizedName, DEFAULT_CATEGORY)
    const duplicateMode = options.duplicateMode ?? 'ask'

    if (!normalizedName) {
      return
    }

    const duplicate = items.find((item) => normalizeShoppingIngredientName(item.name) === normalizeShoppingIngredientName(normalizedName))
    const shouldMerge = duplicate && duplicateMode === 'merge'
      ? true
      : duplicate && duplicateMode === 'ask'
        ? window.confirm(`이미 장보기 목록에 있어요. ${normalizedName}${normalizedQuantity ? ` ${normalizedQuantity}` : ''} 수량을 합칠까요?`)
        : false
    if (duplicate && !shouldMerge) {
      setStatusMessage(`${normalizedName}은 이미 장보기 목록에 있어요.`)
      return
    }

    const result = await addItem(
      { name: normalizedName, quantity: normalizedQuantity, category: safeCategory },
      { mergeDuplicates: shouldMerge },
    )
    if (result.mergedCount > 0) {
      setStatusMessage(`${normalizedName} 수량을 기존 장보기 항목과 합쳤어요.`)
    } else if (result.addedCount > 0) {
      setStatusMessage(result.source === 'local'
        ? `${normalizedName}을 이 기기에 저장했어요. 로그인되어 있고 인터넷이 연결되면 자동으로 동기화돼요.`
        : `${normalizedName}을 장보기 목록에 추가했어요.`)
    } else if (result.skippedDuplicates.length > 0) {
      setStatusMessage(`${normalizedName}은 이미 장보기 목록에 있어요.`)
    }
  }

  const handleCatalogAdd = (item: IngredientCatalogItem) => {
    void addShoppingDraft(
      {
        name: item.name,
        quantity: getShoppingCatalogQuantity(item),
        category: item.category,
      },
      { duplicateMode: 'merge' },
    )
  }

  const handleAdd = () => {
    const normalizedName = normalizeIngredientInput(name)
    const normalizedQuantity = quantity.trim()
    const safeCategory = categoryTouched ? category : suggestIngredientCategory(normalizedName, category)

    void addShoppingDraft({ name: normalizedName, quantity: normalizedQuantity, category: safeCategory })
    setName('')
    setQuantity('')
    setCategory(DEFAULT_CATEGORY)
    setCategoryTouched(false)
  }

  const handleQuickAdd = () => {
    const parsed = parseQuickShoppingInput(quickInput)
    void addShoppingDraft({
      name: parsed.name,
      quantity: parsed.quantity,
      category: suggestIngredientCategory(parsed.name, DEFAULT_CATEGORY),
    })
    setQuickInput('')
  }

  const handleNameChange = (value: string) => {
    setName(value)
    if (!categoryTouched) {
      setCategory(suggestIngredientCategory(value, DEFAULT_CATEGORY))
    }
  }

  const addShoppingItemToFridge = async (item: ShoppingItem) => {
    const expiryDate = getDateAfterDays(fridgeExpiryDays)
    const parsedUnitPrice = unitPrice.trim() ? Number(unitPrice.trim()) : null
    const fridgeOptions = {
      storageType: fridgeStorageType,
      expiryDate,
      purchasePlace: purchasePlace.trim() || null,
      unitPrice: Number.isFinite(parsedUnitPrice) && parsedUnitPrice !== null ? parsedUnitPrice : null,
    }
    const duplicate = ingredients.find(
      (ingredient) => normalizeShoppingIngredientName(ingredient.name) === normalizeShoppingIngredientName(item.name),
    )
    if (duplicate) {
      const shouldMerge = window.confirm(`${item.name}이 이미 냉장고에 있어요. 기존 재료와 합칠까요?`)
      if (!shouldMerge) return

      await updateIngredient(duplicate.id, buildMergedIngredientPayloadFromShoppingItem(duplicate, item, fridgeOptions))
      if (!item.checked) {
        await toggleItem(item.id)
      }
      setStatusMessage(`${item.name}을 기존 냉장고 재료와 합쳤어요.`)
      return
    }

    await addIngredient(buildIngredientPayloadFromShoppingItem(item, fridgeOptions))
    if (!item.checked) {
      await toggleItem(item.id)
    }
    setStatusMessage(`${item.name}을 냉장고에 추가했어요. 보관 ${fridgeStorageType}, 유통기한 ${expiryDate}로 저장했습니다.`)
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

  const shoppingListSection = (
    <section data-testid="shopping-list-section" className="px-5 pt-4">
      {displayItems.length === 0 ? (
        <div className="jipbab-panel rounded-[18px] px-4 py-12 text-center">
          <p className="text-sm font-black text-[#4b3929]">장보기 목록이 비어 있어요.</p>
          <p className="mt-1 text-xs text-[#8f7f70]">레시피 부족 재료를 담거나 직접 추가하세요.</p>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="mt-4 min-h-11 rounded-full bg-[#ea5a1f] px-5 text-[12px] font-black text-white"
          >
            재료 직접 추가하기
          </button>
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
                    checked={false}
                    onToggle={() => toggleItem(item.id)}
                    onRemove={() => removeItem(item.id)}
                    onAddToFridge={() => addShoppingItemToFridge(item)}
                    partnerLinks={partnerLinks}
                  />
                ))}
              </div>
            ))}
          </ShoppingGroup>

          {checkedItems.length > 0 ? (
            <ShoppingGroup title={`구매완료 (${checkedItems.length})`}>
              <div className="space-y-3 bg-[#f2f7e7] px-3 py-3">
                <div className="grid grid-cols-3 gap-2">
                  {INGREDIENT_STORAGE_TYPES.map((storageType) => (
                    <button
                      key={storageType}
                      type="button"
                      onClick={() => setFridgeStorageType(storageType)}
                      className={`min-h-11 rounded-[11px] border px-2 text-[11px] font-black ${
                        fridgeStorageType === storageType
                          ? 'border-[#3d7b38] bg-white text-[#2d6b32]'
                          : 'border-[#dce8c8] bg-[#f8fbf2] text-[#6c7a5b]'
                      }`}
                    >
                      {storageType}
                    </button>
                  ))}
                </div>
                <div>
                  <p className="mb-2 flex items-center gap-1 text-[11px] font-black text-[#3d7b38]">
                    <CalendarDays size={13} />
                    유통기한 빠른 선택
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {EXPIRY_PRESETS.map((preset) => (
                      <button
                        key={preset.days}
                        type="button"
                        onClick={() => setFridgeExpiryDays(preset.days)}
                        className={`min-h-11 rounded-[11px] border px-1 text-[11px] font-black ${
                          fridgeExpiryDays === preset.days
                            ? 'border-[#3d7b38] bg-white text-[#2d6b32]'
                            : 'border-[#dce8c8] bg-[#f8fbf2] text-[#6c7a5b]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={purchasePlace}
                    onChange={(event) => setPurchasePlace(event.target.value)}
                    placeholder="구매처 선택"
                    className="min-w-0 rounded-[11px] border border-[#dce8c8] bg-white px-3 py-2.5 text-[12px] font-semibold text-[#4b3929] outline-none"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={unitPrice}
                    onChange={(event) => setUnitPrice(event.target.value)}
                    placeholder="가격 선택"
                    className="min-w-0 rounded-[11px] border border-[#dce8c8] bg-white px-3 py-2.5 text-[12px] font-semibold text-[#4b3929] outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void addCheckedItemsToFridge()
                  }}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#2f2117] px-3 text-[12px] font-black text-white"
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
                  checked
                  onToggle={() => toggleItem(item.id)}
                  onRemove={() => removeItem(item.id)}
                  onAddToFridge={() => addShoppingItemToFridge(item)}
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
  )

  return (
    <div className="min-h-full bg-[#fbf6ee] pb-6">
      <section className="mobile-safe-top px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[24px] font-black text-[#2f2117]">장보기 리스트</h1>
            <p className="mt-1 text-[12px] font-semibold text-[#8f7f70]">
              {activeScope === 'family' ? '가족 장보기' : '내 장보기'} 재료를 구매 상태별로 확인하세요. 외부 구매 링크는 새 브라우저 화면에서 열려요.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={shareList} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#eadcc9] text-[#7d6d5f]" aria-label="장보기 공유">
              <Share2 size={15} />
            </button>
            <button type="button" onClick={() => setShowAddForm((prev) => !prev)} className="min-h-11 rounded-full border border-[#ea5a1f] px-3 py-1.5 text-[12px] font-black text-[#d94d19]">
              + 직접 추가
            </button>
          </div>
        </div>

        <div className="jipbab-panel mt-4 grid grid-cols-3 overflow-hidden rounded-[16px] text-center">
          <ShoppingStat label="전체" value={`${displayItems.length}개`} />
          <ShoppingStat label="구매완료" value={`${checkedItems.length}개`} good />
          <ShoppingStat label="미구매" value={`${uncheckedItems.length}개`} warning />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-[14px] bg-[#fff7ed] p-1">
          <button
            type="button"
            onClick={() => setSelectedScope('personal')}
            className={`min-h-11 rounded-[11px] text-xs font-black ${
              activeScope === 'personal' ? 'bg-[#2f2117] text-white' : 'text-[#7d6d5f]'
            }`}
          >
            내 장보기
          </button>
          <button
            type="button"
            onClick={() => setSelectedScope('family')}
            disabled={!group}
            className={`min-h-11 rounded-[11px] text-xs font-black ${
              activeScope === 'family'
                ? 'bg-[#2f2117] text-white'
                : 'text-[#7d6d5f] disabled:text-[#c5b4a1]'
            }`}
          >
            가족 장보기
          </button>
        </div>
        {!group ? (
          <p className="mt-2 rounded-[12px] bg-[#fff7ed] px-3 py-2 text-[11px] font-bold leading-5 text-[#8f7f70]">
            가족 장보기는 가족 냉장고를 만들거나 초대코드로 참여한 뒤 사용할 수 있어요.
          </p>
        ) : null}
        {statusMessage ? (
          <p className="mt-3 rounded-[14px] border border-[#dce8c8] bg-[#f2f7e7] px-3 py-2 text-[12px] font-bold text-[#3d7b38]">
            {statusMessage}
          </p>
        ) : null}
        {!isAppStoreDemo && cloudSyncState === 'local-only' ? (
          <div className="mt-3 rounded-[14px] border border-[#dce8c8] bg-[#f2f7e7] px-3 py-3 text-[#3d6f38]">
            <p className="text-[12px] font-black">지금 이 기기에 저장했어요</p>
            <p className="mt-1 text-[11px] font-bold leading-relaxed">
              데이터는 이 기기에 안전하게 저장되어 있어요. 로그인하면 다른 기기에서도 이어서 볼 수 있어요.
            </p>
            <Link
              href="/mypage"
              className="mt-2 inline-flex min-h-11 items-center rounded-full bg-[#2f2117] px-3 text-[11px] font-black text-white"
            >
              로그인하고 동기화
            </Link>
          </div>
        ) : null}
        {!isAppStoreDemo && cloudSyncState === 'synced' && pendingSyncCount === 0 ? (
          <div
            role="status"
            className="mt-3 flex items-start gap-2 rounded-[14px] border border-[#dce8c8] bg-[#f2f7e7] px-3 py-3 text-[#3d6f38]"
          >
            <CheckCircle2 size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
            <div>
              <p className="text-[13px] font-black">클라우드 동기화 완료</p>
              <p className="mt-1 text-[12px] font-bold leading-relaxed">
                장보기와 냉장고 변경사항을 안전하게 저장했어요.
              </p>
            </div>
          </div>
        ) : null}
        {!isAppStoreDemo && cloudSyncState === 'error' ? (
          <div
            role="alert"
            className="mt-3 rounded-[14px] border border-[#ffd1bd] bg-[#fff0e4] px-3 py-3 text-[#7d3f18]"
          >
            <p className="text-[12px] font-black">클라우드 동기화를 마치지 못했어요</p>
            <p className="mt-1 text-[11px] font-bold leading-relaxed">
              이 기기에 안전하게 저장되어 있어요{pendingSyncCount > 0 ? ` · ${pendingSyncCount}개 대기 중` : ''}.
              로그인되어 있고 인터넷이 연결되면 자동으로 다시 동기화해요.
            </p>
            <button
              type="button"
              disabled={syncRetrying}
              onClick={() => {
                void listItems()
                void listIngredients()
              }}
              className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-full bg-[#2f2117] px-3 text-[11px] font-black text-white disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw size={13} aria-hidden="true" className={syncRetrying ? 'animate-spin' : undefined} />
              {syncRetrying ? '다시 시도 중' : '다시 시도'}
            </button>
          </div>
        ) : null}
      </section>

      {shoppingListSection}

      <section data-testid="shopping-quick-add-section" className="px-5 pt-4">
        <div className="jipbab-panel rounded-[16px] p-3">
          <form
            className="grid grid-cols-[minmax(0,1fr)_72px] gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              handleQuickAdd()
            }}
          >
            <input
              type="text"
              value={quickInput}
              onChange={(event) => setQuickInput(event.target.value)}
              placeholder="두부 1모처럼 바로 추가"
              className="min-w-0 rounded-[12px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-3 text-sm font-semibold text-[#4b3929] outline-none focus:border-[#ea5a1f]"
            />
            <button
              type="submit"
              disabled={!normalizeIngredientInput(quickInput)}
              className="inline-flex min-h-11 items-center justify-center gap-1 rounded-[12px] bg-[#ea5a1f] px-2 text-[12px] font-black text-white disabled:bg-[#e6b49a]"
            >
              <Plus size={14} />
              추가
            </button>
          </form>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {QUICK_SHOPPING_CHIPS.map((chip) => (
              <button
                key={chip.name}
                type="button"
                onClick={() => {
                  void addShoppingDraft(chip)
                }}
                className="shrink-0 rounded-full border border-[#eadcc9] bg-[#fff7ed] px-3 py-1.5 text-[11px] font-black text-[#8a5a2a]"
              >
                {chip.name} {chip.quantity}
              </button>
            ))}
          </div>
        </div>

        {showAddForm ? (
          <div className="jipbab-panel mt-3 rounded-[16px] p-4">
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

        <div data-testid="shopping-catalog-section" className="jipbab-panel mt-3 rounded-[18px] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-black leading-tight text-[#2f2117]">재료 찾아 담기</h2>
              <p className="mt-1 text-[12px] font-semibold text-[#8f7f70]">필요할 때 카테고리별 재료를 펼쳐보세요.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCatalog((current) => !current)}
              aria-expanded={showCatalog}
              aria-controls="shopping-catalog-content"
              className="min-h-11 shrink-0 rounded-full border border-[#eadcc9] bg-[#fffaf3] px-4 text-[12px] font-black text-[#d94d19]"
            >
              {showCatalog ? '접기' : '펼치기'}
            </button>
          </div>

          {showCatalog ? (
            <div id="shopping-catalog-content">
              <p className="mt-3 rounded-[14px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-2 text-[11px] font-bold leading-relaxed text-[#7d6d5f]">
                {PARTNERS_DISCLOSURE}
              </p>

              <div className="mt-3 flex gap-4 overflow-x-auto border-b border-[#eadcc9] pb-0">
            {SHOPPING_CATALOG_GROUPS.map((groupItem) => {
              const selected = selectedCatalogGroup?.id === groupItem.id
              return (
                <button
                  key={groupItem.id}
                  type="button"
                  onClick={() => {
                    setSelectedCatalogGroupId(groupItem.id)
                    setSelectedCatalogSubcategoryId('all')
                  }}
                  className={`relative min-h-11 shrink-0 px-0 pb-3 text-[14px] font-black ${
                    selected ? 'text-[#d94d19]' : 'text-[#7d6d5f]'
                  }`}
                >
                  {groupItem.label}
                  {selected ? <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-[#ea5a1f]" /> : null}
                </button>
              )
            })}
              </div>

              <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
            {selectedCatalogGroup?.subcategories.map((subcategory) => {
              const selected = selectedCatalogSubcategory?.id === subcategory.id
              const count = selectedCatalogGroup ? getShoppingCatalogSubcategoryItems(selectedCatalogGroup, subcategory).length : 0
              const photoUrl = getIngredientPhotoUrl(subcategory.imageName, subcategory.imageCategory)

              return (
                <button
                  key={subcategory.id}
                  type="button"
                  onClick={() => setSelectedCatalogSubcategoryId(subcategory.id)}
                  className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 text-center"
                >
                  <span className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 bg-white ${
                    selected ? 'border-[#ea5a1f]' : 'border-[#eadcc9]'
                  }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoUrl} alt={subcategory.label} className="h-full w-full object-cover mix-blend-multiply" loading="lazy" />
                  </span>
                  <span className={`h-8 overflow-hidden text-[11px] font-black leading-4 ${
                    selected ? 'text-[#d94d19]' : 'text-[#7d6d5f]'
                  }`}
                  >
                    {subcategory.label}
                  </span>
                  <span className="text-[10px] font-bold text-[#b5a493]">{count}</span>
                </button>
              )
            })}
              </div>

              <div className="mt-2 flex items-center justify-between gap-3 rounded-[12px] bg-[#fff7ed] px-3 py-2">
                <p className="truncate text-[12px] font-black text-[#4b3929]">
                  {selectedCatalogGroup?.label ?? '전체'} · {selectedCatalogSubcategory?.label ?? '전체'}
                </p>
                <p className="shrink-0 text-[11px] font-black text-[#d94d19]">{selectedCatalogItems.length}개 재료</p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {selectedCatalogItems.map((item) => (
                  <ShoppingCatalogCard
                    key={item.id}
                    item={item}
                    quantity={getShoppingCatalogQuantity(item)}
                    isInShoppingList={shoppingNameSet.has(normalizeShoppingIngredientName(item.name))}
                    onAdd={() => handleCatalogAdd(item)}
                    partnerLinks={partnerLinks}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

      </section>

    </div>
  )
}

function ShoppingCatalogCard({
  item,
  quantity,
  isInShoppingList,
  onAdd,
  partnerLinks,
}: {
  item: IngredientCatalogItem
  quantity: string
  isInShoppingList: boolean
  onAdd: () => void
  partnerLinks: PartnerLinkConfig
}) {
  const purchaseLink = getCoupangPurchaseLink({ name: item.name, category: item.category }, partnerLinks)
  const photoUrl = getIngredientPhotoUrl(item.name, item.category)

  return (
    <div className="rounded-[14px] border border-[#eadcc9] bg-[#fffaf3] p-2">
      <button
        type="button"
        onClick={onAdd}
        className="flex min-h-[66px] w-full items-center gap-2 rounded-[11px] text-left"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt={item.name}
          className="h-10 w-10 shrink-0 rounded-[10px] object-contain mix-blend-multiply"
          loading="lazy"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-black text-[#2f2117]">{item.name}</span>
          <span className="mt-0.5 block truncate text-[11px] font-bold text-[#8f7f70]">{quantity}</span>
        </span>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${
          isInShoppingList ? 'bg-[#f2f7e7] text-[#3d7b38]' : 'bg-[#fff0e4] text-[#d94d19]'
        }`}
        >
          {isInShoppingList ? '담김' : '담기'}
        </span>
      </button>
      <a
        href={purchaseLink.href}
        target="_blank"
        rel={externalLinkRel(purchaseLink.isPartnerLink)}
        className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-[10px] bg-white px-2 text-[11px] font-black text-[#d94d19]"
        aria-label={`${item.name} ${purchaseLink.isPartnerLink ? '파트너스 링크' : '쿠팡 검색'} 열기`}
      >
        <ExternalLink size={12} />
        {purchaseLink.isPartnerLink ? '쿠팡 링크' : '쿠팡 검색'}
      </a>
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
  checked,
  onToggle,
  onRemove,
  onAddToFridge,
  partnerLinks,
  addToFridgeLabel = '냉장고 반영',
}: {
  name: string
  category: IngredientCategory | null
  quantity: string
  checked: boolean
  onToggle: () => void
  onRemove: () => void
  onAddToFridge: () => void
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
        {!checked && purchaseLink.isPartnerLink ? (
          <p className="mt-0.5 text-[10px] font-bold leading-4 text-[#b45309]">
            제휴 링크이며 구매 시 수수료를 받을 수 있어요.
          </p>
        ) : null}
      </div>
      {!checked ? (
        <div className="flex shrink-0 items-center gap-1">
          <a
            href={purchaseLink.href}
            target="_blank"
            rel={externalLinkRel(purchaseLink.isPartnerLink)}
            className="inline-flex h-11 items-center gap-1 rounded-full bg-[#fff0e4] px-2.5 text-[11px] font-black text-[#d94d19]"
            aria-label={`${name} ${purchaseLink.isPartnerLink ? '파트너스 링크' : '쿠팡 검색'} 열기`}
          >
            <ExternalLink size={12} />
            구매
          </a>
        </div>
      ) : (
        <button
          type="button"
          onClick={onAddToFridge}
          className="inline-flex h-11 shrink-0 items-center rounded-full bg-[#2f2117] px-2.5 text-[11px] font-black text-white"
        >
          {addToFridgeLabel}
        </button>
      )}
      <button type="button" onClick={onRemove} className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#b5a493] hover:bg-[#fff0e4] hover:text-[#d94d19]" aria-label={`${name} 삭제`}>
        <Trash2 size={14} />
      </button>
    </div>
  )
}
