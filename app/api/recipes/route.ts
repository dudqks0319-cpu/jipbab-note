import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { CURATED_JIPBAB_RECIPES } from '@/lib/curated-recipes'
import { isBeginnerVerifiedRecipe } from '@/lib/recipe-list-labels'
import {
  isDatabaseRecipePublicationApproved,
  isRecipePublicationApproved,
  toRecipePublicationEvidence,
} from '@/lib/recipe-publication'
import { getRateLimitKey, normalizeHttpUrl } from '@/lib/request-security'
import type { RecipeCategoryCounts, RecipePublicationEvidence } from '@/types'

const DEFAULT_PAGE = 1
const DEFAULT_SIZE = 24
const MAX_SIZE = 100
const MAX_QUERY_LENGTH = 40
const REQUEST_WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 45
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const RATE_LIMIT_MAX_REQUESTS = IS_PRODUCTION ? MAX_REQUESTS_PER_WINDOW : 5000
const INGREDIENT_SPLIT_PLACEHOLDER = '__JIPBAB_FRACTION_SLASH__'
const INGREDIENT_SECTION_LABEL_PATTERN =
  /^(?:주재료|부재료|양념|양념장|소스|고명|육수|반죽|반죽재료|속재료|초코필링|토핑)$/
const INGREDIENT_QUANTITY_FRAGMENT_PATTERN =
  /^[0-9]+(?:\.[0-9]+)?\s*(?:kg|g|mg|ml|l|cm|mm|컵|큰술|작은술|술|스푼|ts|tbsp|tsp|개|장|줄기|봉|봉지|마리|모|쪽|알|팩|톨|줌|한줌|통|단|포기)$/i
const INGREDIENT_FRACTION_DENOMINATOR_PATTERN =
  /^([2-9][0-9]*)\s*(개|장|줄기|봉|봉지|마리|모|쪽|알|팩|톨|줌|한줌|컵|큰술|작은술|술|스푼|통|단|포기)$/i
const INGREDIENT_MEASUREMENT_PATTERN =
  /\d+(?:\.\d+)?\s*(?:kg|g|mg|ml|l|컵|큰술|작은술|술|스푼|ts|tbsp|tsp|개|장|줄기|봉|봉지|마리|모|쪽|알|팩|톨|줌|한줌|통|단|포기)/i

const CATEGORY_ALLOWLIST = new Set([
  '계란요리',
  '김치/밥 요리',
  '두부/저렴 재료',
  '참치캔/스팸/햄/어묵',
  '국/찌개',
  '면요리',
  '전자레인지/노불',
  '도시락/반찬',
  '한식',
  '중식',
  '양식',
  '일식',
  '분식',
  '디저트',
  '후식',
  '국·찌개',
  '국&찌개',
  '반찬',
  '밥',
  '일품',
  '기타',
])
const QUERY_PATTERN = /^[0-9A-Za-z가-힣\s\-_/(),.&]+$/
const requestStore = new Map<string, { count: number; startedAt: number }>()

type RecipeDto = {
  id: string
  name: string
  category: string
  method: string
  calories: string
  thumbnailUrl: string | null
  ingredients: string
  hashTag: string
  difficultyLevel?: number | null
  totalMinutes?: number | null
  publicationEvidence?: RecipePublicationEvidence | null
}

type SupabaseRecipeRow = {
  id: string
  title: string
  description: string | null
  category: string | null
  thumbnail_url: string | null
  ingredients: unknown
  steps: unknown
  tools: unknown
  source: string | null
  source_id: string | null
  review_status: string
  reviewed_for_beginner: boolean
  beginner_reviewed_at: string | null
  actual_cooking_tested: boolean
  actual_cooking_tested_at: string | null
  food_safety_reviewed: boolean
  food_safety_reviewed_at: string | null
  image_rights_status: string
  image_rights_reviewed_at: string | null
  source_reviewed_at: string | null
  reviewer: string | null
  published_at: string | null
  difficulty: number | null
  servings_base: number | null
  prep_time_minutes: number | null
  cook_time_minutes: number | null
  total_time_minutes: number | null
  storage_guide: string | null
  reheating_guide: string | null
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
  const normalized = value === '국·찌개' ? '국&찌개' : value === '디저트' ? '후식' : value.trim()
  return CATEGORY_ALLOWLIST.has(normalized) ? normalized : null
}

const normalizeDisplayCategory = (value: string | null | undefined): string => {
  const normalized = value?.trim() || '기타'
  if (normalized === '국&찌개') return '국·찌개'
  if (normalized === '후식') return '디저트'
  return normalized
}

const incrementCategoryCount = (counts: RecipeCategoryCounts, value: string | null | undefined) => {
  const category = normalizeDisplayCategory(value) as keyof RecipeCategoryCounts
  counts.전체 = (counts.전체 ?? 0) + 1
  counts[category] = (counts[category] ?? 0) + 1
}

const countRecipeCategories = (recipes: Array<{ category: string | null | undefined }>): RecipeCategoryCounts => {
  const counts: RecipeCategoryCounts = { 전체: 0 }
  for (const recipe of recipes) {
    incrementCategoryCount(counts, recipe.category)
  }
  return counts
}

const getCuratedCategoryCounts = (query: string | null): RecipeCategoryCounts => {
  const normalizedQuery = query?.trim().toLowerCase() ?? ''
  const counts: RecipeCategoryCounts = { 전체: 0 }
  for (const recipe of CURATED_JIPBAB_RECIPES) {
    if (!isRecipePublicationApproved(recipe)) {
      continue
    }
    const matchesQuery = !normalizedQuery ||
      recipe.name.toLowerCase().includes(normalizedQuery) ||
      recipe.ingredients.toLowerCase().includes(normalizedQuery)
    if (!matchesQuery) {
      continue
    }

    incrementCategoryCount(counts, recipe.category)
    if (isBeginnerVerifiedRecipe(recipe)) {
      counts.초보가능 = (counts.초보가능 ?? 0) + 1
    }
    if (typeof recipe.cookingTime === 'number' && recipe.cookingTime <= 10) {
      counts['10분요리'] = (counts['10분요리'] ?? 0) + 1
    }
  }
  return counts
}

const mergeCategoryCounts = (...countSets: Array<RecipeCategoryCounts | null | undefined>): RecipeCategoryCounts => {
  const merged: RecipeCategoryCounts = { 전체: 0 }
  for (const countSet of countSets) {
    for (const [category, count] of Object.entries(countSet ?? {})) {
      const normalizedCategory = normalizeDisplayCategory(category) as keyof RecipeCategoryCounts
      merged[normalizedCategory] = (merged[normalizedCategory] ?? 0) + Number(count ?? 0)
    }
  }
  return merged
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

const normalizeRecipeImageUrl = (value: string | null | undefined): string | null => {
  return normalizeHttpUrl(value)
}

const cleanIngredientDisplayText = (value: string): string => {
  const colonIndex = value.lastIndexOf(':')
  const withoutLabel = colonIndex === -1 ? value : value.slice(colonIndex + 1)

  return withoutLabel
    .replace(/^[-•·*]\s*/, '')
    .replace(/[，、]/g, ',')
    .replace(/\s+/g, ' ')
    .replace(/\b([0-2])\s+([0-9])(?=\s*(?:g|kg|mg|ml|l)\b)/gi, '$1.$2')
    .trim()
}

const dedupeIngredientDisplayList = (items: string[]): string[] => {
  const seen = new Set<string>()
  const deduped: string[] = []

  for (const item of items) {
    const key = item.toLowerCase().replace(/\s+/g, ' ')
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    deduped.push(item)
  }

  return deduped
}

const normalizeIngredientDisplayItems = (items: string[]): string[] => {
  const cleaned = items
    .map(cleanIngredientDisplayText)
    .filter((item) => item.length > 0)
    .filter((item) => !INGREDIENT_SECTION_LABEL_PATTERN.test(item))
  const normalized: string[] = []

  for (let index = 0; index < cleaned.length; index += 1) {
    const current = cleaned[index]
    const next = cleaned[index + 1]
    const fractionNumerator = current.match(/^(.*\S)\s+([1-9])$/)
    const fractionDenominator = next?.match(INGREDIENT_FRACTION_DENOMINATOR_PATTERN)

    if (fractionNumerator && fractionDenominator) {
      normalized.push(`${fractionNumerator[1]} ${fractionNumerator[2]}/${fractionDenominator[1]}${fractionDenominator[2]}`)
      index += 1
      continue
    }

    if (INGREDIENT_QUANTITY_FRAGMENT_PATTERN.test(current)) {
      continue
    }

    normalized.push(
      INGREDIENT_MEASUREMENT_PATTERN.test(current) ? current.replace(/\s+[1-9]$/, '') : current,
    )
  }

  return dedupeIngredientDisplayList(normalized)
}

const splitIngredientDisplayText = (rawIngredients: string): string[] => {
  return rawIngredients
    .replace(/(\d)\s*\/\s*(\d)/g, `$1${INGREDIENT_SPLIT_PLACEHOLDER}$2`)
    .split(/[\n,;|/]+/g)
    .map((item) => item.replaceAll(INGREDIENT_SPLIT_PLACEHOLDER, '/'))
}

const formatIngredientDisplayText = (rawIngredients: string): string => {
  if (!rawIngredients) {
    return ''
  }

  return normalizeIngredientDisplayItems(splitIngredientDisplayText(rawIngredients)).join(', ')
}

const parseMethodAndCalories = (description: string | null): Pick<RecipeDto, 'method' | 'calories'> => {
  if (!description) {
    return { method: '정보 없음', calories: '-' }
  }

  const methodMatch = description.match(/조리법:\s*([^|]+)/)
  const caloriesMatch = description.match(/열량:\s*([^|]+)/)

  return {
    method: methodMatch?.[1]?.trim() || description,
    calories: caloriesMatch?.[1]?.trim() || '-',
  }
}

const stringifyIngredients = (value: unknown): string => {
  if (Array.isArray(value)) {
    const names = value
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }
        if (typeof item === 'object' && item !== null) {
          const record = item as Record<string, unknown>
          return typeof record.name === 'string' ? record.name : ''
        }
        return ''
      })
    return normalizeIngredientDisplayItems(names).join(', ')
  }
  if (typeof value === 'string') {
    return formatIngredientDisplayText(value.trim())
  }
  return ''
}

const supabaseRowToRecipe = (row: SupabaseRecipeRow): RecipeDto | null => {
  const publicationEvidence = toRecipePublicationEvidence(row)
  if (!publicationEvidence) return null
  const parsed = parseMethodAndCalories(row.description)
  return {
    id: row.id,
    name: row.title.trim(),
    category: normalizeDisplayCategory(row.category),
    method: parsed.method,
    calories: parsed.calories,
    thumbnailUrl: normalizeRecipeImageUrl(row.thumbnail_url || null),
    ingredients: stringifyIngredients(row.ingredients),
    hashTag: '',
    difficultyLevel: row.difficulty,
    totalMinutes: row.total_time_minutes,
    publicationEvidence,
  }
}

const fetchRecipesFromSupabase = async (
  page: number,
  size: number,
  query: string | null,
  category: string | null,
): Promise<{ recipes: RecipeDto[]; totalCount: number } | null> => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  try {
    const client = createClient(supabaseUrl, supabaseAnonKey)
    const from = (page - 1) * size
    const to = from + size - 1

    let request = client
      .from('recipes')
      .select('id,title,description,category,thumbnail_url,ingredients,steps,tools,source,source_id,review_status,reviewed_for_beginner,beginner_reviewed_at,actual_cooking_tested,actual_cooking_tested_at,food_safety_reviewed,food_safety_reviewed_at,image_rights_status,image_rights_reviewed_at,source_reviewed_at,reviewer,published_at,difficulty,servings_base,prep_time_minutes,cook_time_minutes,total_time_minutes,storage_guide,reheating_guide', { count: 'exact' })
      .eq('review_status', 'approved')
      .eq('reviewed_for_beginner', true)
      .eq('actual_cooking_tested', true)
      .eq('food_safety_reviewed', true)
      .in('image_rights_status', ['approved', 'no_image_approved'])
      .not('source_id', 'is', null)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .range(from, to)

    if (query) {
      request = request.ilike('title', `%${query}%`)
    }

    if (category) {
      request = request.eq('category', category)
    }

    const { data, error, count } = await request
    if (error) {
      return null
    }

    const rows = Array.isArray(data) ? (data as SupabaseRecipeRow[]) : []
    const recipes = rows
      .filter(isDatabaseRecipePublicationApproved)
      .map(supabaseRowToRecipe)
      .filter((recipe): recipe is RecipeDto => recipe !== null)
    return {
      recipes,
      totalCount: recipes.length === rows.length && Number.isFinite(count ?? 0) ? (count ?? 0) : recipes.length,
    }
  } catch (error) {
    console.error('Supabase recipes 조회 실패', error)
    return null
  }
}

const fetchRecipeCategoryCountsFromSupabase = async (
  query: string | null,
): Promise<RecipeCategoryCounts | null> => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  try {
    const client = createClient(supabaseUrl, supabaseAnonKey)
    let request = client
      .from('recipes')
      .select('title,category')
      .eq('review_status', 'approved')
      .eq('reviewed_for_beginner', true)
      .eq('actual_cooking_tested', true)
      .eq('food_safety_reviewed', true)
      .in('image_rights_status', ['approved', 'no_image_approved'])
      .not('source_id', 'is', null)
      .not('published_at', 'is', null)
      .limit(1000)

    if (query) {
      request = request.ilike('title', `%${query}%`)
    }

    const { data, error } = await request
    if (error) {
      return null
    }

    return countRecipeCategories((data ?? []) as Array<{ category: string | null }>)
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const clientKey = getRateLimitKey(request)
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
  const page = toPositiveInt(searchParams.get('page'), DEFAULT_PAGE)
  const size = Math.min(toPositiveInt(searchParams.get('size'), DEFAULT_SIZE), MAX_SIZE)
  const includeCounts = searchParams.get('includeCounts') === '1'
  let query: string | null
  try {
    query = sanitizeQuery(searchParams.get('q'))
  } catch {
    return NextResponse.json(
      { message: '잘못된 검색어입니다.' },
      { status: 400 },
    )
  }

  const category = normalizeCategory(searchParams.get('category'))
  const categoryCounts = includeCounts
    ? mergeCategoryCounts(await fetchRecipeCategoryCountsFromSupabase(query), getCuratedCategoryCounts(query))
    : undefined

  const dbResult = await fetchRecipesFromSupabase(page, size, query, category)
  if (dbResult && dbResult.totalCount > 0) {
    return NextResponse.json({
      recipes: dbResult.recipes,
      totalCount: dbResult.totalCount,
      page,
      size,
      categoryCounts,
      code: 'DB-000',
      message: '저장된 레시피 데이터를 조회했습니다.',
    })
  }

  return NextResponse.json({
    recipes: [],
    totalCount: 0,
    page,
    size,
    categoryCounts,
    code: 'NO-PUBLISHED-RECIPES',
    message: '현재 공개 가능한 레시피를 준비 중이에요.',
  })
}
