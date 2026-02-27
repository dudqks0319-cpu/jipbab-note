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
