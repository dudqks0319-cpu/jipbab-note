// 이 파일은 식약처 조리식품 레시피 OpenAPI를 서버에서 호출해 앱용 데이터로 정규화합니다.
import { NextResponse } from 'next/server'

const SERVICE_ID = 'COOKRCP01'
const BASE_URL = 'https://openapi.foodsafetykorea.go.kr/api'
const DEFAULT_PAGE = 1
const DEFAULT_SIZE = 24
const MAX_SIZE = 100
const MAX_QUERY_LENGTH = 40
const REQUEST_WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 45

const CATEGORY_ALLOWLIST = new Set(['한식', '중식', '양식', '일식', '분식', '디저트', '국·찌개', '국&찌개', '반찬', '기타'])
const QUERY_PATTERN = /^[0-9A-Za-z가-힣\s\-_/(),.&]+$/
const requestStore = new Map<string, { count: number; startedAt: number }>()

type MfdsResult = {
  CODE?: string
  MSG?: string
}

type MfdsRecipeRow = {
  RCP_SEQ?: string
  RCP_NM?: string
  RCP_WAY2?: string
  RCP_PAT2?: string
  INFO_ENG?: string
  ATT_FILE_NO_MAIN?: string
  ATT_FILE_NO_MK?: string
  RCP_PARTS_DTLS?: string
  HASH_TAG?: string
  [key: string]: string | undefined
}

type MfdsServiceData = {
  RESULT?: MfdsResult
  total_count?: string
  row?: MfdsRecipeRow[]
}

type MfdsResponse = {
  COOKRCP01?: MfdsServiceData
  RESULT?: MfdsResult
}

type RecipeDto = {
  id: string
  name: string
  category: string
  method: string
  calories: string
  thumbnailUrl: string | null
  ingredients: string
  hashTag: string
}

const toPositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.floor(parsed)
}

const sanitizeQuery = (value: string | null): string | null => {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length > MAX_QUERY_LENGTH) {
    throw new Error('검색어는 40자 이하로 입력해 주세요.')
  }
  if (!QUERY_PATTERN.test(trimmed)) {
    throw new Error('검색어에 사용할 수 없는 문자가 포함되어 있습니다.')
  }
  return trimmed
}

const normalizeCategory = (value: string | null): string | null => {
  if (!value || value === '전체') return null
  const normalized = value === '국·찌개' ? '국&찌개' : value.trim()
  return CATEGORY_ALLOWLIST.has(normalized) ? normalized : null
}

const getClientIp = (request: Request): string => {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}

const isRateLimited = (key: string): boolean => {
  const now = Date.now()

  for (const [bucketKey, value] of requestStore.entries()) {
    if (now - value.startedAt > REQUEST_WINDOW_MS) {
      requestStore.delete(bucketKey)
    }
  }

  const current = requestStore.get(key)
  if (!current || now - current.startedAt > REQUEST_WINDOW_MS) {
    requestStore.set(key, { count: 1, startedAt: now })
    return false
  }

  if (current.count >= MAX_REQUESTS_PER_WINDOW) {
    return true
  }

  requestStore.set(key, { ...current, count: current.count + 1 })
  return false
}

const buildFilterSegment = (query: string | null, category: string | null) => {
  const filters: string[] = []
  const trimmedQuery = query?.trim()
  const normalizedCategory = normalizeCategory(category)

  if (trimmedQuery) {
    filters.push(`RCP_NM=${encodeURIComponent(trimmedQuery)}`)
  }
  if (normalizedCategory) {
    filters.push(`RCP_PAT2=${encodeURIComponent(normalizedCategory)}`)
  }

  if (filters.length === 0) return ''
  return `/${filters.join('&')}`
}

const rowToRecipe = (row: MfdsRecipeRow): RecipeDto => {
  return {
    id: row.RCP_SEQ ?? '',
    name: row.RCP_NM?.trim() ?? '이름 없음',
    category: row.RCP_PAT2?.trim() ?? '기타',
    method: row.RCP_WAY2?.trim() ?? '정보 없음',
    calories: row.INFO_ENG?.trim() ?? '-',
    thumbnailUrl: row.ATT_FILE_NO_MK || row.ATT_FILE_NO_MAIN || null,
    ingredients: row.RCP_PARTS_DTLS?.trim() ?? '',
    hashTag: row.HASH_TAG?.trim() ?? '',
  }
}

export async function GET(request: Request) {
  const clientIp = getClientIp(request)
  if (isRateLimited(clientIp)) {
    return NextResponse.json(
      { message: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 429 },
    )
  }

  const apiKey = process.env.MFDS_API_KEY || process.env.FOODSAFETY_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      {
        message:
          '레시피 API 키가 없습니다. MFDS_API_KEY(권장) 또는 FOODSAFETY_API_KEY를 설정해 주세요.',
      },
      { status: 500 },
    )
  }

  const { searchParams } = new URL(request.url)
  const page = toPositiveInt(searchParams.get('page'), DEFAULT_PAGE)
  const size = Math.min(toPositiveInt(searchParams.get('size'), DEFAULT_SIZE), MAX_SIZE)
  const start = (page - 1) * size + 1
  const end = start + size - 1
  let query: string | null
  try {
    query = sanitizeQuery(searchParams.get('q'))
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '잘못된 검색어입니다.' },
      { status: 400 },
    )
  }

  const category = normalizeCategory(searchParams.get('category'))
  const filterSegment = buildFilterSegment(query, category)

  const endpoint = `${BASE_URL}/${apiKey}/${SERVICE_ID}/json/${start}/${end}${filterSegment}`

  try {
    const response = await fetch(endpoint, {
      cache: 'no-store',
    })

    if (!response.ok) {
      return NextResponse.json(
        { message: `식약처 API 호출 실패 (${response.status})` },
        { status: 502 },
      )
    }

    const payload = (await response.json()) as MfdsResponse
    const serviceData = payload.COOKRCP01
    const result = serviceData?.RESULT ?? payload.RESULT
    const rows = serviceData?.row ?? []
    const totalCount = Number(serviceData?.total_count ?? rows.length ?? 0)
    const recipes = rows.map(rowToRecipe)

    if (!serviceData) {
      return NextResponse.json(
        {
          recipes: [],
          totalCount: 0,
          page,
          size,
          code: result?.CODE ?? 'NO_DATA',
          message: result?.MSG ?? '응답에 COOKRCP01 데이터가 없습니다.',
        },
        { status: 200 },
      )
    }

    return NextResponse.json({
      recipes,
      totalCount,
      page,
      size,
      code: result?.CODE ?? 'INFO-000',
      message: result?.MSG ?? '정상 처리되었습니다.',
    })
  } catch (error) {
    console.error('MFDS API 요청 실패', error)
    return NextResponse.json(
      {
        message: '레시피 정보를 가져오는 중 오류가 발생했습니다.',
      },
      { status: 500 },
    )
  }
}
