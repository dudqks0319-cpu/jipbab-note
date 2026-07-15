const CACHE_PREFIX = 'jipbab-recipe-offline-'
const SHELL_CACHE = `${CACHE_PREFIX}shell-v1`
const RECIPE_CACHE = `${CACHE_PREFIX}pages-v1`
const ASSET_CACHE = `${CACHE_PREFIX}assets-v1`
const OFFLINE_DOCUMENT = '/offline.html'
const MAX_RECIPE_ENTRIES = 20
const MAX_ASSET_ENTRIES = 100
const MAX_DISCOVERED_ASSETS = 100
const RECIPE_PATH_PATTERN = /^\/recipe\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/?$/i
const STATIC_ASSET_PATTERN = /^\/_next\/static\//
const RECIPE_IMAGE_PATTERN = /^\/images\/recipes\//
const APP_ASSET_PATHS = new Set(['/icon.png', '/apple-icon.png'])

function canonicalRecipeUrl(url) {
  return `${url.origin}${url.pathname}`
}

function isPublicRecipePath(url) {
  return url.origin === self.location.origin && RECIPE_PATH_PATTERN.test(url.pathname)
}

function isStaticAsset(url) {
  return url.origin === self.location.origin
    && (STATIC_ASSET_PATTERN.test(url.pathname)
      || RECIPE_IMAGE_PATTERN.test(url.pathname)
      || APP_ASSET_PATHS.has(url.pathname))
}

function isCacheableHtml(response) {
  return response.ok
    && response.type === 'basic'
    && (response.headers.get('content-type') || '').toLowerCase().startsWith('text/html')
}

function isCacheableAsset(response) {
  return response.ok && response.type === 'basic'
}

async function trimCache(cacheName, maximumEntries) {
  const cache = await caches.open(cacheName)
  const requests = await cache.keys()
  const overflow = requests.length - maximumEntries
  if (overflow <= 0) return
  await Promise.all(requests.slice(0, overflow).map((request) => cache.delete(request)))
}

async function cacheRecipeResponse(url, response) {
  if (!isCacheableHtml(response)) return
  const cache = await caches.open(RECIPE_CACHE)
  await cache.put(canonicalRecipeUrl(url), response.clone())
  await trimCache(RECIPE_CACHE, MAX_RECIPE_ENTRIES)
}

function findRecipeAssetUrls(html) {
  const urls = new Set()
  const attributePattern = /(?:src|href)=["']([^"']+)["']/gi
  let match

  while ((match = attributePattern.exec(html)) !== null && urls.size < MAX_DISCOVERED_ASSETS) {
    try {
      const url = new URL(match[1], self.location.origin)
      if (isStaticAsset(url)) urls.add(url.toString())
    } catch {
      continue
    }
  }

  return [...urls]
}

async function cacheRecipeAssets(response) {
  if (!isCacheableHtml(response)) return
  const assetUrls = findRecipeAssetUrls(await response.clone().text())
  const cache = await caches.open(ASSET_CACHE)

  await Promise.allSettled(assetUrls.map(async (assetUrl) => {
    const request = new Request(assetUrl, { credentials: 'omit' })
    const assetResponse = await fetch(request)
    if (isCacheableAsset(assetResponse)) await cache.put(request, assetResponse)
  }))
  await trimCache(ASSET_CACHE, MAX_ASSET_ENTRIES)
}

async function fetchAndCacheOpenedRecipe(url) {
  const response = await fetch(canonicalRecipeUrl(url), {
    credentials: 'omit',
    headers: { Accept: 'text/html' },
  })
  await Promise.all([
    cacheRecipeResponse(url, response),
    cacheRecipeAssets(response),
  ])
}

async function recipeNetworkFirst(request, url) {
  try {
    return await fetch(request)
  } catch {
    const cache = await caches.open(RECIPE_CACHE)
    return await cache.match(request)
      || await cache.match(canonicalRecipeUrl(url))
      || await caches.match(OFFLINE_DOCUMENT)
  }
}

async function assetCacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (isCacheableAsset(response)) {
    await cache.put(request, response.clone())
    await trimCache(ASSET_CACHE, MAX_ASSET_ENTRIES)
  }
  return response
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.add(OFFLINE_DOCUMENT))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX)
            && key !== SHELL_CACHE
            && key !== RECIPE_CACHE
            && key !== ASSET_CACHE)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || data.type !== 'CACHE_RECIPE' || typeof data.url !== 'string') return

  let url
  try {
    url = new URL(data.url)
  } catch {
    return
  }
  if (!isPublicRecipePath(url)) return
  event.waitUntil(fetchAndCacheOpenedRecipe(url).catch(() => undefined))
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || request.headers.has('Authorization')) return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate' && isPublicRecipePath(url)) {
    event.respondWith(recipeNetworkFirst(request, url))
    return
  }

  if (isStaticAsset(url)) event.respondWith(assetCacheFirst(request))
})
