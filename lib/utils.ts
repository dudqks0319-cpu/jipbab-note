// 이 파일은 여러 곳에서 공통으로 쓰는 도우미 함수들을 담당합니다

export type ExpiryStatus = {
  daysLeft: number | null
  isExpired: boolean
  isExpiringSoon: boolean
  label: string
  tone: 'danger' | 'warning' | 'safe' | 'neutral'
}

const INGREDIENT_PHOTO_BY_KEYWORD: Record<string, string> = {
  계란:
    'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=900&q=80',
  우유:
    'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=900&q=80',
  사과:
    'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=900&q=80',
  바나나:
    'https://images.unsplash.com/photo-1603833665858-e61d17a86224?auto=format&fit=crop&w=900&q=80',
  당근:
    'https://images.unsplash.com/photo-1447175008436-054170c2e979?auto=format&fit=crop&w=900&q=80',
  양파:
    'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=900&q=80',
  감자:
    'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=900&q=80',
  토마토:
    'https://images.unsplash.com/photo-1546470427-e5ac89cd0b7f?auto=format&fit=crop&w=900&q=80',
  두부:
    'https://images.unsplash.com/photo-1604908176997-4318f16e7f00?auto=format&fit=crop&w=900&q=80',
  돼지고기:
    'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=900&q=80',
  소고기:
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
  닭고기:
    'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=900&q=80',
  고등어:
    'https://images.unsplash.com/photo-1579631542720-3a87824fff86?auto=format&fit=crop&w=900&q=80',
  새우:
    'https://images.unsplash.com/photo-1625943555419-56a2cb596640?auto=format&fit=crop&w=900&q=80',
}

const INGREDIENT_PHOTO_BY_CATEGORY: Record<string, string> = {
  채소:
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80',
  과일:
    'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=900&q=80',
  육류:
    'https://images.unsplash.com/photo-1603048297172-c92544798d5a?auto=format&fit=crop&w=900&q=80',
  수산물:
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80',
  유제품:
    'https://images.unsplash.com/photo-1559598467-f8b76c8155d0?auto=format&fit=crop&w=900&q=80',
  양념:
    'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=80',
  기타:
    'https://images.unsplash.com/photo-1543168256-418811576931?auto=format&fit=crop&w=900&q=80',
}

export function getIngredientPhotoUrl(
  name: string | null | undefined,
  category: string | null | undefined,
): string {
  const normalizedName = (name ?? '').trim()
  if (normalizedName) {
    const keywordHit = Object.keys(INGREDIENT_PHOTO_BY_KEYWORD).find((keyword) =>
      normalizedName.includes(keyword),
    )
    if (keywordHit) {
      return INGREDIENT_PHOTO_BY_KEYWORD[keywordHit]
    }
  }

  return INGREDIENT_PHOTO_BY_CATEGORY[category ?? ''] || INGREDIENT_PHOTO_BY_CATEGORY['기타']
}

export function getCoupangSearchUrl(keyword: string): string {
  return `https://www.coupang.com/np/search?component=&q=${encodeURIComponent(keyword)}`
}

// 카테고리별 이모지
export function getCategoryEmoji(category: string | null | undefined): string {
  const map: Record<string, string> = {
    채소: '🥬',
    과일: '🍎',
    육류: '🥩',
    수산물: '🐟',
    유제품: '🥛',
    양념: '🧂',
    기타: '📦',
  }
  return map[category || ''] || '📦'
}

// 카테고리별 배경색 (파스텔 톤)
export function getCategoryBg(category: string | null | undefined): string {
  const map: Record<string, string> = {
    채소: 'bg-green-50',
    과일: 'bg-rose-50',
    육류: 'bg-pink-50',
    수산물: 'bg-blue-50',
    유제품: 'bg-yellow-50',
    양념: 'bg-orange-50',
    기타: 'bg-gray-50',
  }
  return map[category || ''] || 'bg-gray-50'
}

// 날짜 입력값을 YYYY-MM-DD로 정규화
export function toDateOnlyString(dateInput: string | null | undefined): string | null {
  if (!dateInput) return null
  const parsed = new Date(dateInput)
  if (Number.isNaN(parsed.getTime())) return null

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// D-day 계산
export function getDday(expiryDate: string | null | undefined): number {
  if (!expiryDate) return 999
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// 유통기한 상태 라벨 (참고 이미지처럼 "신선", "임박", "만료")
export function getStatusLabel(dday: number): string {
  if (dday < 0) return '만료'
  if (dday <= 3) return '임박'
  if (dday <= 7) return '주의'
  return '신선'
}

// 유통기한 상태별 배지 색상 (파스텔)
export function getStatusBg(dday: number): string {
  if (dday < 0) return 'bg-rose-100 text-rose-500'
  if (dday <= 3) return 'bg-orange-100 text-orange-500'
  if (dday <= 7) return 'bg-yellow-100 text-yellow-600'
  return 'bg-green-100 text-green-600'
}

// 유통기한 색상
export function getExpiryColor(expiryDate: string | null | undefined): 'red' | 'yellow' | 'green' {
  const dday = getDday(expiryDate)
  if (dday <= 3) return 'red'
  if (dday <= 7) return 'yellow'
  return 'green'
}

// IngredientCard 호환용 유통기한 상태 객체
export function getExpiryStatus(expiryDate: string | null | undefined): ExpiryStatus {
  if (!expiryDate) {
    return {
      daysLeft: null,
      isExpired: false,
      isExpiringSoon: false,
      label: '기한 없음',
      tone: 'neutral',
    }
  }

  const daysLeft = getDday(expiryDate)
  const isExpired = daysLeft < 0
  const isExpiringSoon = !isExpired && daysLeft <= 3

  let label = `D-${daysLeft}`
  if (isExpired) label = `${Math.abs(daysLeft)}일 지남`
  if (daysLeft === 0) label = '오늘 만료'

  const tone: ExpiryStatus['tone'] = isExpired ? 'danger' : isExpiringSoon ? 'warning' : 'safe'

  return {
    daysLeft,
    isExpired,
    isExpiringSoon,
    label,
    tone,
  }
}

// 날짜 포맷
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}
