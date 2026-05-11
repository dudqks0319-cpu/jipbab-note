// 이 파일은 여러 곳에서 공통으로 쓰는 도우미 함수들을 담당합니다

import { getIngredientImageUrl } from './ingredient-catalog'
import type { IngredientCategory } from '@/types'

export type ExpiryStatus = {
  daysLeft: number | null
  isExpired: boolean
  isExpiringSoon: boolean
  label: string
  tone: 'danger' | 'warning' | 'safe' | 'neutral'
}

export function getIngredientPhotoUrl(
  name: string | null | undefined,
  category: string | null | undefined,
): string {
  const normalizedName = (name ?? '').trim() || category || '재료'
  return getIngredientImageUrl(normalizedName, category as IngredientCategory | null | undefined)
}

export function getCoupangSearchUrl(keyword: string): string {
  return `https://www.coupang.com/np/search?component=&q=${encodeURIComponent(keyword)}`
}

// 외부 링크는 http/https만 허용해 앱 내 링크 렌더링을 안전하게 유지합니다.
export function normalizeSafeHttpUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null

  const candidate = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const url = new URL(candidate)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null
    }

    if (!url.hostname || (!url.hostname.includes('.') && url.hostname !== 'localhost')) {
      return null
    }

    return url.href
  } catch {
    return null
  }
}

// 긴 공유 링크 대신 도메인 중심으로 보여줍니다.
export function formatExternalUrlLabel(value: string | null | undefined): string {
  const safeUrl = normalizeSafeHttpUrl(value)
  if (!safeUrl) return ''

  try {
    const url = new URL(safeUrl)
    return url.pathname === '/' ? url.hostname : `${url.hostname}${url.pathname}`
  } catch {
    return safeUrl
  }
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
