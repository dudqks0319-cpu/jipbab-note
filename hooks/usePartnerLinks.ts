// 이 파일은 Supabase에 저장된 쿠팡 파트너스 링크를 앱에서 읽어오는 훅입니다.
'use client'

import { useEffect, useState } from 'react'

import { getSupabaseClient } from '@/lib/supabase'
import {
  isCoupangPartnerUrl,
  normalizeLinkKey,
  parsePartnerItemLinksJson,
  type PartnerLinkConfig,
} from '@/lib/partner-links'
import type { IngredientCategory } from '@/types'

type PartnerLinkRow = {
  kind: 'item' | 'category'
  name: string | null
  category: IngredientCategory | null
  url: string | null
}

const COUPANG_PARTNERS_POTATO_URL =
  process.env.NEXT_PUBLIC_COUPANG_PARTNERS_POTATO_URL?.trim() ?? ''
const COUPANG_PARTNERS_VEGETABLE_URL =
  process.env.NEXT_PUBLIC_COUPANG_PARTNERS_VEGETABLE_URL?.trim() ?? ''
const COUPANG_PARTNERS_EGG_URL =
  process.env.NEXT_PUBLIC_COUPANG_PARTNERS_EGG_URL?.trim() ?? ''
const COUPANG_PARTNERS_DAIRY_URL =
  process.env.NEXT_PUBLIC_COUPANG_PARTNERS_DAIRY_URL?.trim() ?? ''
const COUPANG_PARTNERS_FROZEN_URL =
  process.env.NEXT_PUBLIC_COUPANG_PARTNERS_FROZEN_URL?.trim() ?? ''
const COUPANG_PARTNERS_SEASONING_URL =
  process.env.NEXT_PUBLIC_COUPANG_PARTNERS_SEASONING_URL?.trim() ?? ''
const COUPANG_PARTNERS_ITEM_LINKS_JSON =
  process.env.NEXT_PUBLIC_COUPANG_PARTNERS_ITEM_LINKS_JSON?.trim() ?? ''

const STATIC_PARTNER_LINKS: PartnerLinkConfig = {
  itemLinks: {
    [normalizeLinkKey('계란')]: 'https://link.coupang.com/a/eEzpQo',
    [normalizeLinkKey('두부')]: 'https://link.coupang.com/a/eEzG5O',
    [normalizeLinkKey('대파')]: 'https://link.coupang.com/a/eEzKyg',
    [normalizeLinkKey('김치')]: 'https://link.coupang.com/a/eEAbrW',
    [normalizeLinkKey('양파')]: 'https://link.coupang.com/a/eEAj6u',
    [normalizeLinkKey('감자')]: 'https://link.coupang.com/a/eEAmko',
    [normalizeLinkKey('당근')]: 'https://link.coupang.com/a/eEAsMV',
    [normalizeLinkKey('애호박')]: 'https://link.coupang.com/a/eEAxFO',
    [normalizeLinkKey('오이')]: 'https://link.coupang.com/a/eEBm2L',
    [normalizeLinkKey('콩나물')]: 'https://link.coupang.com/a/eEBwvx',
    [normalizeLinkKey('시금치')]: 'https://link.coupang.com/a/eEBHWc',
    [normalizeLinkKey('양배추')]: 'https://link.coupang.com/a/eEBQ5h',
    [normalizeLinkKey('돼지고기')]: 'https://link.coupang.com/a/eEB0hw',
    [normalizeLinkKey('소고기')]: 'https://link.coupang.com/a/eEB7av',
    [normalizeLinkKey('닭고기')]: 'https://link.coupang.com/a/eECtUS',
    [normalizeLinkKey('참치캔')]: 'https://link.coupang.com/a/eECxYR',
    [normalizeLinkKey('냉동만두')]: 'https://link.coupang.com/a/eECBGn',
    [normalizeLinkKey('냉동새우')]: 'https://link.coupang.com/a/eECFNR',
    [normalizeLinkKey('간장')]: 'https://link.coupang.com/a/eECLFB',
    [normalizeLinkKey('고추장')]: 'https://link.coupang.com/a/eEC0rn',
    [normalizeLinkKey('된장')]: 'https://link.coupang.com/a/eEC4B7',
    [normalizeLinkKey('쌈장')]: 'https://link.coupang.com/a/eEC8R4',
    [normalizeLinkKey('참기름')]: 'https://link.coupang.com/a/eEEWDc',
    [normalizeLinkKey('들기름')]: 'https://link.coupang.com/a/eEE3h0',
    [normalizeLinkKey('고춧가루')]: 'https://link.coupang.com/a/eEFaZX',
    [normalizeLinkKey('카레가루')]: 'https://link.coupang.com/a/eEFdhI',
    [normalizeLinkKey('국수')]: 'https://link.coupang.com/a/eEFgnJ',
    [normalizeLinkKey('라면')]: 'https://link.coupang.com/a/eEFjGY',
    [normalizeLinkKey('떡국떡')]: 'https://link.coupang.com/a/eEFua6',
    [normalizeLinkKey('어묵')]: 'https://link.coupang.com/a/eEFU05',
    [normalizeLinkKey('사과')]: 'https://link.coupang.com/a/eEGU0F',
    [normalizeLinkKey('생수')]: 'https://link.coupang.com/a/eEGYWK',
  },
  categoryLinks: {
    유제품: 'https://link.coupang.com/a/eEzpQo',
    채소: 'https://link.coupang.com/a/eEzKyg',
    육류: 'https://link.coupang.com/a/eEB0hw',
    냉동식품: 'https://link.coupang.com/a/eECBGn',
    수산물: 'https://link.coupang.com/a/eECFNR',
    조미료: 'https://link.coupang.com/a/eECLFB',
    '곡물/면/빵': 'https://link.coupang.com/a/eEFgnJ',
    '통조림/가공식품': 'https://link.coupang.com/a/eECxYR',
    과일: 'https://link.coupang.com/a/eEGU0F',
    '음료/기타': 'https://link.coupang.com/a/eEGYWK',
  },
}

function mergePartnerLinks(base: PartnerLinkConfig, overrides: PartnerLinkConfig): PartnerLinkConfig {
  return {
    itemLinks: {
      ...base.itemLinks,
      ...overrides.itemLinks,
    },
    categoryLinks: {
      ...base.categoryLinks,
      ...overrides.categoryLinks,
    },
  }
}

function filterPartnerLinks(config: PartnerLinkConfig): PartnerLinkConfig {
  const itemLinks: Record<string, string> = {}
  const categoryLinks: Partial<Record<IngredientCategory, string>> = {}

  for (const [key, url] of Object.entries(config.itemLinks)) {
    if (isCoupangPartnerUrl(url)) {
      itemLinks[normalizeLinkKey(key)] = url.trim()
    }
  }

  for (const [category, url] of Object.entries(config.categoryLinks)) {
    if (isCoupangPartnerUrl(url)) {
      categoryLinks[category as IngredientCategory] = url.trim()
    }
  }

  return { itemLinks, categoryLinks }
}

function getFallbackPartnerLinks(): PartnerLinkConfig {
  const envLinks: PartnerLinkConfig = {
    itemLinks: {
      ...parsePartnerItemLinksJson(COUPANG_PARTNERS_ITEM_LINKS_JSON),
      potato: COUPANG_PARTNERS_POTATO_URL,
      egg: COUPANG_PARTNERS_EGG_URL,
    },
    categoryLinks: {
      채소: COUPANG_PARTNERS_VEGETABLE_URL,
      유제품: COUPANG_PARTNERS_DAIRY_URL,
      냉동식품: COUPANG_PARTNERS_FROZEN_URL,
      조미료: COUPANG_PARTNERS_SEASONING_URL,
    },
  }

  return mergePartnerLinks(STATIC_PARTNER_LINKS, filterPartnerLinks(envLinks))
}

const FALLBACK_PARTNER_LINKS = getFallbackPartnerLinks()

export function usePartnerLinks(): PartnerLinkConfig {
  const [links, setLinks] = useState<PartnerLinkConfig>(FALLBACK_PARTNER_LINKS)

  useEffect(() => {
    let cancelled = false

    async function loadPartnerLinks() {
      try {
        const client = getSupabaseClient()
        const { data, error } = await client
          .from('partner_links')
          .select('kind,name,category,url')
          .eq('active', true)
          .order('display_order', { ascending: true })

        if (error) {
          console.warn('partner_links 조회 실패: 검증된 fallback 링크를 유지합니다.', error.message)
          if (!cancelled) {
            setLinks(FALLBACK_PARTNER_LINKS)
          }
          return
        }

        const itemLinks: Record<string, string> = {}
        const categoryLinks: Partial<Record<IngredientCategory, string>> = {}
        let rejectedRows = 0

        for (const row of (data ?? []) as PartnerLinkRow[]) {
          const url = row.url?.trim()
          if (!isCoupangPartnerUrl(url)) {
            rejectedRows += 1
            continue
          }

          if (row.kind === 'item' && row.name) {
            itemLinks[normalizeLinkKey(row.name)] = url
          }

          if (row.kind === 'category' && row.category) {
            categoryLinks[row.category] = url
          }
        }

        if (rejectedRows > 0) {
          console.warn(`partner_links에서 allowlist 검증 실패 행 ${rejectedRows}개를 제외했습니다.`)
        }

        if (!cancelled) {
          setLinks(mergePartnerLinks(FALLBACK_PARTNER_LINKS, { itemLinks, categoryLinks }))
        }
      } catch (caught) {
        console.warn('partner_links 로드 중 예외 발생: 검증된 fallback 링크를 유지합니다.', caught)
        if (!cancelled) {
          setLinks(FALLBACK_PARTNER_LINKS)
        }
      }
    }

    void loadPartnerLinks()

    return () => {
      cancelled = true
    }
  }, [])

  return links
}
