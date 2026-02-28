import { NextResponse } from 'next/server'
import { isValidFoodBarcode, normalizeBarcode } from '@/lib/barcode'

const OPEN_FOOD_FACTS_URL = 'https://world.openfoodfacts.org/api/v2/product'
const OPEN_FOOD_FACTS_FIELDS = [
  'code',
  'product_name',
  'product_name_ko',
  'brands',
  'quantity',
  'categories',
  'image_url',
] as const
const REQUEST_WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 30
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const RATE_LIMIT_MAX_REQUESTS = IS_PRODUCTION ? MAX_REQUESTS_PER_WINDOW : 5000
const requestStore = new Map<string, { count: number; startedAt: number }>()

type ProductLookupResult = {
  barcode: string
  name: string
  brand: string | null
  quantity: string | null
  category: string | null
  imageUrl: string | null
  source: 'openfoodfacts' | 'stub'
}

type OpenFoodFactsPayload = {
  status?: number
  status_verbose?: string
  product?: {
    product_name?: string
    product_name_ko?: string
    brands?: string
    quantity?: string
    categories?: string
    image_url?: string
  }
}

const toTrimmedOrNull = (value: string | undefined): string | null => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

const getClientKey = (request: Request): string => {
  const deviceId = request.headers.get('x-device-id')?.trim()
  if (deviceId) return `device:${deviceId}`

  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const ip = forwardedFor.split(',')[0]?.trim()
    if (ip) return `ip:${ip}`
  }

  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return `ip:${realIp}`

  const userAgent = request.headers.get('user-agent')?.trim() ?? 'unknown-ua'
  return `ua:${userAgent.slice(0, 120)}`
}

const isRateLimited = (key: string): boolean => {
  if (!IS_PRODUCTION) {
    return false
  }

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

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true
  }

  requestStore.set(key, { ...current, count: current.count + 1 })
  return false
}

const parseOpenFoodFactsProduct = (
  barcode: string,
  payload: OpenFoodFactsPayload,
): ProductLookupResult | null => {
  if (payload.status !== 1 || !payload.product) {
    return null
  }

  const name = toTrimmedOrNull(payload.product.product_name_ko)
    ?? toTrimmedOrNull(payload.product.product_name)
  if (!name) {
    return null
  }

  return {
    barcode,
    name,
    brand: toTrimmedOrNull(payload.product.brands),
    quantity: toTrimmedOrNull(payload.product.quantity),
    category: toTrimmedOrNull(payload.product.categories),
    imageUrl: toTrimmedOrNull(payload.product.image_url),
    source: 'openfoodfacts',
  }
}

async function fetchFromOpenFoodFacts(
  barcode: string,
): Promise<ProductLookupResult | null> {
  const endpoint = `${OPEN_FOOD_FACTS_URL}/${encodeURIComponent(barcode)}.json?fields=${OPEN_FOOD_FACTS_FIELDS.join(',')}`
  const response = await fetch(endpoint, {
    cache: 'no-store',
  })

  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as OpenFoodFactsPayload
  return parseOpenFoodFactsProduct(barcode, payload)
}

export async function GET(request: Request) {
  const clientKey = getClientKey(request)
  if (isRateLimited(clientKey)) {
    return NextResponse.json(
      { message: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
        },
      },
    )
  }

  const { searchParams } = new URL(request.url)
  const normalizedBarcode = normalizeBarcode(searchParams.get('barcode'))

  if (!normalizedBarcode || !isValidFoodBarcode(normalizedBarcode)) {
    return NextResponse.json(
      {
        message: '유효한 바코드(숫자 8~14자리)를 전달해 주세요.',
      },
      { status: 400 },
    )
  }

  try {
    const product = await fetchFromOpenFoodFacts(normalizedBarcode)
    if (product) {
      return NextResponse.json({
        barcode: normalizedBarcode,
        product,
        source: product.source,
        message: '상품 정보를 조회했습니다.',
      })
    }
  } catch (error) {
    console.error('상품 정보 조회 실패', error)
  }

  return NextResponse.json({
    barcode: normalizedBarcode,
    product: null,
    source: 'stub',
    message:
      '외부 상품 정보를 찾지 못했습니다. 스캔 코드를 유지한 채 수동 입력으로 진행해 주세요.',
  })
}
