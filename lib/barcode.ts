export const FOOD_BARCODE_PATTERN = /^\d{8,14}$/
const NON_DIGIT_PATTERN = /[^\d]/g

export const DEFAULT_BARCODE_FORMATS = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
] as const

export type DetectedBarcode = {
  rawValue?: string
  format?: string
}

export type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement | HTMLCanvasElement) => Promise<DetectedBarcode[]>
}

type BarcodeDetectorCtor = new (options?: {
  formats?: string[]
}) => BarcodeDetectorLike

type GlobalWithBarcodeDetector = typeof globalThis & {
  BarcodeDetector?: BarcodeDetectorCtor
}

export function normalizeBarcode(value: string | null | undefined): string | null {
  if (!value) return null
  const normalized = value.replace(NON_DIGIT_PATTERN, '').trim()
  return normalized.length > 0 ? normalized : null
}

export function isValidFoodBarcode(value: string | null | undefined): value is string {
  if (!value) return false
  return FOOD_BARCODE_PATTERN.test(value)
}

export function isWebBarcodeDetectorSupported(): boolean {
  const globalScope = globalThis as GlobalWithBarcodeDetector
  return typeof globalScope.BarcodeDetector === 'function'
}

export function createWebBarcodeDetector(
  formats: readonly string[] = DEFAULT_BARCODE_FORMATS,
): BarcodeDetectorLike | null {
  const globalScope = globalThis as GlobalWithBarcodeDetector
  if (typeof globalScope.BarcodeDetector !== 'function') {
    return null
  }

  try {
    return new globalScope.BarcodeDetector({ formats: [...formats] })
  } catch {
    return null
  }
}

export function pickFirstValidBarcode(detections: DetectedBarcode[]): string | null {
  for (const item of detections) {
    const normalized = normalizeBarcode(item.rawValue)
    if (normalized && isValidFoodBarcode(normalized)) {
      return normalized
    }
  }

  return null
}
