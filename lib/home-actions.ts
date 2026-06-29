export type HomeHrefOptions = {
  demoMode?: boolean
  hash?: string
  params?: Record<string, string | number | boolean | null | undefined>
}

export type TodayActionCta = {
  href: string
  label: string
}

export function buildHomeHref(baseHref: string, options: HomeHrefOptions = {}): string {
  const [pathAndQuery, baseHash = ''] = baseHref.split('#')
  const [pathname, existingQuery = ''] = pathAndQuery.split('?')
  const searchParams = new URLSearchParams(existingQuery)

  if (options.demoMode) {
    searchParams.set('demo', 'appstore')
  }

  for (const [key, value] of Object.entries(options.params ?? {})) {
    if (value === null || typeof value === 'undefined' || value === false) {
      continue
    }
    searchParams.set(key, String(value))
  }

  const query = searchParams.toString()
  const hash = normalizeHash(options.hash ?? baseHash)

  return `${pathname}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`
}

export function getTodayActionPrimaryCta(params: {
  demoMode?: boolean
  missingCount: number
  recipeId: string
}): TodayActionCta {
  if (params.missingCount === 0) {
    return {
      href: buildHomeHref(`/recipe/${params.recipeId}`, { demoMode: params.demoMode }),
      label: '지금 만들기',
    }
  }

  if (params.missingCount === 1) {
    return {
      href: buildHomeHref(`/recipe/${params.recipeId}`, { demoMode: params.demoMode, hash: 'ingredients' }),
      label: '재료 확인하고 만들기',
    }
  }

  return {
    href: buildHomeHref(`/recipe/${params.recipeId}`, { demoMode: params.demoMode, hash: 'shopping-assistant' }),
    label: '부족 재료 보기',
  }
}

export function getTodayActionSecondaryCta(params: {
  demoMode?: boolean
  missingCount: number
  recipeId: string
}): TodayActionCta {
  if (params.missingCount >= 2) {
    return {
      href: buildHomeHref(`/recipe/${params.recipeId}`, { demoMode: params.demoMode }),
      label: '레시피 보기',
    }
  }

  if (params.missingCount === 1) {
    return {
      href: buildHomeHref(`/recipe/${params.recipeId}`, { demoMode: params.demoMode, hash: 'shopping-assistant' }),
      label: '부족 재료',
    }
  }

  return {
    href: buildHomeHref(`/recipe/${params.recipeId}`, { demoMode: params.demoMode, hash: 'ingredients' }),
    label: '재료 확인',
  }
}

function normalizeHash(value: string): string {
  return value.replace(/^#/, '').trim()
}
