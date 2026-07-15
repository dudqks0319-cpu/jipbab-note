'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

type WorkerStatus = 'idle' | 'ready' | 'unavailable'

const RECIPE_PATH_PATTERN = /^\/recipe\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/?$/i

function cacheOpenedRecipe(registration: ServiceWorkerRegistration, pathname: string) {
  if (!RECIPE_PATH_PATTERN.test(pathname) || !registration.active) return
  registration.active.postMessage({
    type: 'CACHE_RECIPE',
    url: new URL(pathname, window.location.origin).toString(),
  })
}

export default function RecipeOfflineSupport() {
  const pathname = usePathname()
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)
  const [online, setOnline] = useState(true)
  const [workerStatus, setWorkerStatus] = useState<WorkerStatus>('idle')

  useEffect(() => {
    const syncConnection = () => setOnline(navigator.onLine)
    syncConnection()
    window.addEventListener('online', syncConnection)
    window.addEventListener('offline', syncConnection)
    return () => {
      window.removeEventListener('online', syncConnection)
      window.removeEventListener('offline', syncConnection)
    }
  }, [])

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) {
      setWorkerStatus('unavailable')
      return
    }

    let cancelled = false
    navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    }).then(async (registration) => {
      const readyRegistration = await navigator.serviceWorker.ready
      if (cancelled) return
      registrationRef.current = readyRegistration.active ? readyRegistration : registration
      setWorkerStatus('ready')
    }).catch(() => {
      if (!cancelled) setWorkerStatus('unavailable')
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (workerStatus !== 'ready' || !registrationRef.current) return
    cacheOpenedRecipe(registrationRef.current, pathname)
  }, [pathname, workerStatus])

  if (online) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 top-[max(12px,env(safe-area-inset-top))] z-[70] mx-auto max-w-[390px] rounded-2xl border border-[#d9c49f] bg-[#fff8e8] px-4 py-3 text-center text-[12px] font-black leading-5 text-[#6f4b2e] shadow-[0_10px_30px_rgba(63,48,37,0.18)]"
    >
      {workerStatus === 'ready'
        ? '오프라인 모드 · 열어본 레시피와 저장된 조리 진행을 계속 볼 수 있어요.'
        : '오프라인 모드 · 저장된 조리 진행은 유지되지만 레시피 화면 캐시는 이 기기에서 사용할 수 없어요.'}
    </div>
  )
}
