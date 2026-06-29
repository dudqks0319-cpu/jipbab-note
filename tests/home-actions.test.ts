import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildHomeHref,
  getTodayActionPrimaryCta,
  getTodayActionSecondaryCta,
} from '../lib/home-actions.ts'

test('home links preserve app store demo query before hash fragments', () => {
  assert.equal(
    buildHomeHref('/recipe/curated-dubu-jorim#shopping-assistant', { demoMode: true }),
    '/recipe/curated-dubu-jorim?demo=appstore#shopping-assistant',
  )
  assert.equal(
    buildHomeHref('/fridge?add=1', { demoMode: true }),
    '/fridge?add=1&demo=appstore',
  )
  assert.equal(
    buildHomeHref('/recipe/curated-dubu-jorim', {
      demoMode: true,
      hash: 'shopping-assistant',
      params: { scope: 'family' },
    }),
    '/recipe/curated-dubu-jorim?demo=appstore&scope=family#shopping-assistant',
  )
})

test('today action primary CTA follows essential missing ingredient count', () => {
  assert.deepEqual(
    getTodayActionPrimaryCta({ demoMode: true, missingCount: 0, recipeId: 'r1' }),
    { href: '/recipe/r1?demo=appstore', label: '지금 만들기' },
  )
  assert.deepEqual(
    getTodayActionPrimaryCta({ demoMode: true, missingCount: 1, recipeId: 'r1' }),
    { href: '/recipe/r1?demo=appstore#ingredients', label: '재료 확인하고 만들기' },
  )
  assert.deepEqual(
    getTodayActionPrimaryCta({ demoMode: true, missingCount: 2, recipeId: 'r1' }),
    { href: '/recipe/r1?demo=appstore#shopping-assistant', label: '부족 재료 보기' },
  )
})

test('today action secondary CTA keeps a non-conflicting fallback action', () => {
  assert.deepEqual(
    getTodayActionSecondaryCta({ missingCount: 0, recipeId: 'r1' }),
    { href: '/recipe/r1#ingredients', label: '재료 확인' },
  )
  assert.deepEqual(
    getTodayActionSecondaryCta({ missingCount: 1, recipeId: 'r1' }),
    { href: '/recipe/r1#shopping-assistant', label: '부족 재료' },
  )
  assert.deepEqual(
    getTodayActionSecondaryCta({ missingCount: 2, recipeId: 'r1' }),
    { href: '/recipe/r1', label: '레시피 보기' },
  )
})
