'use client'

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Camera, CameraOff, Check, Loader2, Plus, Search } from 'lucide-react'
import {
  createWebBarcodeDetector,
  isValidFoodBarcode,
  isWebBarcodeDetectorSupported,
  normalizeBarcode,
  pickFirstValidBarcode,
  type BarcodeDetectorLike,
} from '@/lib/barcode'
import { getDeviceId } from '@/lib/device-id'
import { useIngredients } from '@/hooks/useIngredients'
import { findCatalogIngredient, getIngredientImageUrl } from '@/lib/ingredient-catalog'
import { mergeQuantityText, normalizeIngredientKey } from '@/lib/ingredient-quantity'
import type { IngredientCategory, IngredientStorageType } from '@/types'

const SCAN_INTERVAL_MS = 700

type CameraStatus = 'idle' | 'starting' | 'scanning' | 'unsupported' | 'error'

type ProductLookupResult = {
  barcode: string
  name: string
  brand: string | null
  quantity: string | null
  category: string | null
  imageUrl: string | null
  source: 'openfoodfacts' | 'stub'
}

type ProductLookupResponse = {
  barcode: string
  product: ProductLookupResult | null
  source: ProductLookupResult['source']
  message: string
}

type ErrorResponse = {
  message?: string
}

const inferCategoryFromText = (name: string, categoryText: string | null): IngredientCategory => {
  const catalogItem = findCatalogIngredient(name)
  if (catalogItem) return catalogItem.category

  const source = `${name} ${categoryText ?? ''}`.toLowerCase()
  if (/(milk|dairy|cheese|yogurt|우유|치즈|요거트|요구르트|두부|계란|달걀)/.test(source)) return '유제품'
  if (/(meat|pork|beef|chicken|ham|sausage|고기|돼지|소고기|닭|햄|소시지)/.test(source)) return '육류'
  if (/(fish|seafood|tuna|shrimp|참치|생선|고등어|새우|오징어|김|미역)/.test(source)) return '수산물'
  if (/(fruit|apple|banana|과일|사과|바나나|딸기|포도)/.test(source)) return '과일'
  if (/(vegetable|채소|양파|대파|감자|당근|오이|버섯)/.test(source)) return '채소'
  if (/(sauce|seasoning|oil|간장|고추장|소스|기름|참기름|설탕|소금)/.test(source)) return '양념'
  return '기타'
}

const inferCategoryFromProduct = (product: ProductLookupResult): IngredientCategory => {
  return inferCategoryFromText(product.name, product.category)
}

const inferStorageType = (category: IngredientCategory): IngredientStorageType => {
  if (category === '육류' || category === '수산물') return '냉동'
  if (category === '양념' || category === '기타') return '실온'
  return '냉장'
}

export default function BarcodePage() {
  const { ingredients, addIngredient, updateIngredient } = useIngredients()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<BarcodeDetectorLike | null>(null)
  const scanIntervalRef = useRef<number | null>(null)
  const isDetectingRef = useRef(false)

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle')
  const [statusMessage, setStatusMessage] = useState(
    '카메라 스캔 또는 수동 입력으로 바코드를 조회할 수 있습니다.',
  )
  const [manualBarcode, setManualBarcode] = useState('')
  const [activeBarcode, setActiveBarcode] = useState<string | null>(null)
  const [isLookupLoading, setIsLookupLoading] = useState(false)
  const [isAddingToFridge, setIsAddingToFridge] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [lookupResult, setLookupResult] = useState<ProductLookupResult | null>(null)
  const [addMessage, setAddMessage] = useState<string | null>(null)
  const [manualProductName, setManualProductName] = useState('')

  const detectorSupported = useMemo(() => isWebBarcodeDetectorSupported(), [])

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current !== null) {
      window.clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop()
      }
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    detectorRef.current = null
    setCameraStatus((prev) =>
      prev === 'unsupported' || prev === 'error' ? prev : 'idle',
    )
  }, [])

  const lookupProduct = useCallback(async (barcode: string) => {
    setIsLookupLoading(true)
    setLookupError(null)
    setLookupResult(null)
    setManualProductName('')

    try {
      const response = await fetch(
        `/api/products?barcode=${encodeURIComponent(barcode)}`,
        {
          cache: 'no-store',
          headers: {
            'x-device-id': getDeviceId(),
          },
        },
      )
      const payload = (await response.json()) as ProductLookupResponse | ErrorResponse

      if (!response.ok) {
        setLookupError(payload.message ?? '상품 정보 조회에 실패했습니다.')
        return
      }

      const typed = payload as ProductLookupResponse
      setLookupResult(typed.product)
      setAddMessage(null)
      setStatusMessage(typed.message)
    } catch (error) {
      console.error('상품 조회 요청 실패', error)
      setLookupError('네트워크 오류로 조회에 실패했습니다.')
    } finally {
      setIsLookupLoading(false)
    }
  }, [])

  const detectOnce = useCallback(async () => {
    if (isDetectingRef.current) {
      return
    }
    const detector = detectorRef.current
    const video = videoRef.current

    if (!detector || !video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return
    }

    isDetectingRef.current = true
    try {
      const detections = await detector.detect(video)
      const normalizedBarcode = pickFirstValidBarcode(detections)
      if (!normalizedBarcode) {
        return
      }

      setManualBarcode(normalizedBarcode)
      setActiveBarcode(normalizedBarcode)
      setStatusMessage(`바코드 ${normalizedBarcode}를 인식했습니다.`)
      stopCamera()
      await lookupProduct(normalizedBarcode)
    } catch {
      // 일부 브라우저는 detect 호출 중 예외를 반복적으로 던질 수 있어 조용히 무시합니다.
    } finally {
      isDetectingRef.current = false
    }
  }, [lookupProduct, stopCamera])

  const startCamera = useCallback(async () => {
    if (!detectorSupported) {
      setCameraStatus('unsupported')
      setStatusMessage('이 브라우저는 실시간 바코드 감지를 지원하지 않습니다.')
      return
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('unsupported')
      setStatusMessage('현재 환경에서는 카메라 접근이 지원되지 않습니다.')
      return
    }

    setCameraStatus('starting')
    setLookupError(null)
    setStatusMessage('카메라를 준비 중입니다.')

    try {
      const detector = createWebBarcodeDetector()
      if (!detector) {
        setCameraStatus('unsupported')
        setStatusMessage('브라우저 바코드 감지기를 초기화할 수 없습니다.')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })

      const video = videoRef.current
      if (!video) {
        stream.getTracks().forEach((track) => track.stop())
        throw new Error('카메라 미리보기 요소를 찾을 수 없습니다.')
      }

      detectorRef.current = detector
      streamRef.current = stream
      video.srcObject = stream
      await video.play()

      setCameraStatus('scanning')
      setStatusMessage('바코드를 화면 중앙에 맞춰주세요.')
      scanIntervalRef.current = window.setInterval(() => {
        void detectOnce()
      }, SCAN_INTERVAL_MS)
    } catch (error) {
      console.error('카메라 시작 실패', error)
      stopCamera()
      setCameraStatus('error')
      setStatusMessage('카메라를 시작하지 못했습니다. 권한을 확인해 주세요.')
      setLookupError('카메라 권한 또는 기기 환경 문제로 스캔을 시작할 수 없습니다.')
    }
  }, [detectOnce, detectorSupported, stopCamera])

  const submitManualBarcode = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const normalizedBarcode = normalizeBarcode(manualBarcode)
      if (!normalizedBarcode || !isValidFoodBarcode(normalizedBarcode)) {
        setLookupError('유효한 바코드(숫자 8~14자리)를 입력해 주세요.')
        return
      }

      setActiveBarcode(normalizedBarcode)
      void lookupProduct(normalizedBarcode)
    },
    [lookupProduct, manualBarcode],
  )

  const addProductToFridge = async (product: ProductLookupResult) => {
    if (isAddingToFridge) return

    const category = inferCategoryFromProduct(product)
    const storageType = inferStorageType(category)
    const duplicate = ingredients.find((ingredient) => {
      return normalizeIngredientKey(ingredient.name) === normalizeIngredientKey(product.name)
    })

    setIsAddingToFridge(true)
    setAddMessage(null)

    try {
      if (duplicate) {
        await updateIngredient(duplicate.id, {
          name: duplicate.name,
          category: duplicate.category ?? category,
          storageType: duplicate.storageType,
          quantity: mergeQuantityText(duplicate.quantity, product.quantity),
          expiryDate: duplicate.expiryDate,
          barcode: product.barcode,
          imageUrl: duplicate.imageUrl ?? product.imageUrl ?? getIngredientImageUrl(product.name, category),
          memo: duplicate.memo,
          familyFridgeId: duplicate.familyFridgeId ?? null,
        })
        setAddMessage(`${duplicate.name} 정보에 바코드와 수량을 반영했습니다.`)
        return
      }

      await addIngredient({
        name: product.name,
        category,
        storageType,
        quantity: product.quantity,
        expiryDate: null,
        barcode: product.barcode,
        imageUrl: product.imageUrl ?? getIngredientImageUrl(product.name, category),
        memo: '바코드 조회로 추가',
      })
      setAddMessage(`${product.name}을(를) 냉장고에 추가했습니다.`)
    } finally {
      setIsAddingToFridge(false)
    }
  }

  const addLookupResultToFridge = async () => {
    if (!lookupResult) return
    await addProductToFridge(lookupResult)
  }

  const addManualBarcodeToFridge = async () => {
    const name = manualProductName.trim()
    if (!activeBarcode || !name) return

    await addProductToFridge({
      barcode: activeBarcode,
      name,
      brand: null,
      quantity: null,
      category: null,
      imageUrl: null,
      source: 'stub',
    })
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  return (
    <div className="flex flex-col">
      <div className="rounded-b-[2rem] bg-gradient-to-br from-mint-100 via-white to-lavender-100 px-5 pb-6 pt-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📷</span>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">바코드 스캔</h2>
            <p className="text-sm text-gray-500">카메라가 어려우면 수동 입력으로 진행해 주세요.</p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-3xl border border-white/80 bg-black/90 shadow-soft">
          <video ref={videoRef} className="aspect-video w-full object-cover" playsInline muted />
        </div>

        <div className="mt-3 flex gap-2">
          {cameraStatus === 'scanning' ? (
            <button
              type="button"
              onClick={stopCamera}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-rose-500 px-4 py-3 font-bold text-white"
            >
              <CameraOff size={18} />
              스캔 중지
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                void startCamera()
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-mint-400 px-4 py-3 font-bold text-white"
            >
              {cameraStatus === 'starting' ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
              카메라 스캔 시작
            </button>
          )}
        </div>

        {!detectorSupported && (
          <p className="mt-3 rounded-2xl bg-amber-100 px-4 py-3 text-sm text-amber-700">
            현재 브라우저는 실시간 바코드 감지를 지원하지 않습니다. 아래 입력창으로 조회해 주세요.
          </p>
        )}
      </div>

      <div className="space-y-4 px-5 pb-6 pt-4">
        <p className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-600 shadow-soft">{statusMessage}</p>

        <form onSubmit={submitManualBarcode} className="rounded-3xl bg-white p-4 shadow-soft">
          <label htmlFor="barcode-input" className="mb-2 block text-sm font-semibold text-gray-700">
            바코드 번호 입력
          </label>
          <div className="flex gap-2">
            <input
              id="barcode-input"
              type="text"
              inputMode="numeric"
              value={manualBarcode}
              onChange={(event) => {
                setManualBarcode(event.target.value)
                if (lookupError) {
                  setLookupError(null)
                }
              }}
              placeholder="예: 8801007071046"
              className="h-11 flex-1 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-mint-400"
            />
            <button
              type="submit"
              disabled={isLookupLoading}
              className="flex h-11 items-center gap-1 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isLookupLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              조회
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">숫자만 입력하며, 8~14자리 형식을 권장합니다.</p>
        </form>

        {lookupError && (
          <p className="rounded-2xl bg-rose-100 px-4 py-3 text-sm text-rose-600">{lookupError}</p>
        )}

        {activeBarcode && (
          <div className="rounded-3xl bg-white p-4 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">최근 조회 바코드</p>
            <p className="mt-1 font-mono text-sm text-gray-700">{activeBarcode}</p>

            {isLookupLoading ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                <Loader2 size={16} className="animate-spin" />
                상품 정보를 불러오는 중입니다.
              </div>
            ) : lookupResult ? (
              <div className="mt-4 space-y-2">
                <p className="text-lg font-bold text-gray-800">{lookupResult.name}</p>
                <p className="text-sm text-gray-600">브랜드: {lookupResult.brand ?? '정보 없음'}</p>
                <p className="text-sm text-gray-600">용량: {lookupResult.quantity ?? '정보 없음'}</p>
                <p className="text-sm text-gray-600">분류: {lookupResult.category ?? '정보 없음'}</p>
                <p className="text-xs text-gray-400">데이터 소스: {lookupResult.source}</p>
                <button
                  type="button"
                  disabled={isAddingToFridge}
                  onClick={() => {
                    void addLookupResultToFridge()
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-mint-300 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  {isAddingToFridge ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  냉장고에 추가하기
                </button>
                {addMessage ? (
                  <p className="flex items-center gap-2 rounded-2xl bg-mint-50 px-3 py-2 text-sm font-semibold text-mint-500">
                    <Check size={15} />
                    {addMessage}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-gray-500">
                  조회 결과가 없어도 바코드는 유지됩니다. 재료명만 입력해서 냉장고에 바로 추가할 수 있어요.
                </p>
                <div className="rounded-2xl bg-gray-50 p-3">
                  <label htmlFor="manual-product-name" className="mb-2 block text-xs font-bold text-gray-500">
                    재료명 직접 입력
                  </label>
                  <p className="mb-2 text-xs text-gray-400">
                    저장하면 이 바코드와 함께 냉장고에 남습니다.
                  </p>
                  <div className="flex gap-2">
                    <input
                      id="manual-product-name"
                      value={manualProductName}
                      onChange={(event) => setManualProductName(event.target.value)}
                      placeholder="예: 우유, 김치, 참치캔"
                      className="h-11 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-mint-400"
                    />
                    <button
                      type="button"
                      disabled={isAddingToFridge || !manualProductName.trim()}
                      onClick={() => {
                        void addManualBarcodeToFridge()
                      }}
                      className="flex h-11 shrink-0 items-center gap-1 rounded-xl bg-mint-300 px-3 text-xs font-bold text-white disabled:opacity-60"
                    >
                      {isAddingToFridge ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                      추가
                    </button>
                  </div>
                </div>
                {addMessage ? (
                  <p className="flex items-center gap-2 rounded-2xl bg-mint-50 px-3 py-2 text-sm font-semibold text-mint-500">
                    <Check size={15} />
                    {addMessage}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
