// 이 파일은 브라우저 기본 confirm 대신 키보드와 보조기기를 지원하는 앱 공용 확인 대화상자를 제공합니다.
'use client'

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

export type ConfirmationOptions = {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

type PendingConfirmation = ConfirmationOptions & {
  resolve: (confirmed: boolean) => void
}

function ConfirmDialog({
  options,
  onConfirm,
  onCancel,
}: {
  options: ConfirmationOptions
  onConfirm: () => void
  onCancel: () => void
}) {
  const titleId = useId()
  const descriptionId = useId()
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    cancelButtonRef.current?.focus()
    return () => previouslyFocused?.focus()
  }, [])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
      return
    }
    if (event.key !== 'Tab') return

    const first = cancelButtonRef.current
    const last = confirmButtonRef.current
    if (!first || !last) return
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-sm rounded-[20px] border border-[#eadcc9] bg-white p-5 shadow-2xl"
      >
        <h2 id={titleId} className="text-[18px] font-black text-[#2f2117]">
          {options.title ?? '확인해주세요'}
        </h2>
        <p id={descriptionId} className="mt-2 whitespace-pre-line text-sm font-semibold leading-6 text-[#6f6257]">
          {options.message}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            data-testid="confirmation-cancel"
            onClick={onCancel}
            className="min-h-12 rounded-[14px] border border-[#d9c9b8] bg-white px-4 text-sm font-black text-[#6f6257] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea5a1f]"
          >
            {options.cancelLabel ?? '취소'}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            data-testid="confirmation-confirm"
            onClick={onConfirm}
            className={`min-h-12 rounded-[14px] px-4 text-sm font-black text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea5a1f] ${
              options.destructive ? 'bg-[#c93c32]' : 'bg-[#ea5a1f]'
            }`}
          >
            {options.confirmLabel ?? '확인'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function useConfirmDialog(): {
  requestConfirmation: (options: ConfirmationOptions) => Promise<boolean>
  confirmationDialog: ReactNode
} {
  const [pending, setPending] = useState<PendingConfirmation | null>(null)
  const pendingRef = useRef<PendingConfirmation | null>(null)

  const settle = useCallback((confirmed: boolean) => {
    const current = pendingRef.current
    pendingRef.current = null
    setPending(null)
    current?.resolve(confirmed)
  }, [])

  const requestConfirmation = useCallback((options: ConfirmationOptions) => {
    pendingRef.current?.resolve(false)
    return new Promise<boolean>((resolve) => {
      const next = { ...options, resolve }
      pendingRef.current = next
      setPending(next)
    })
  }, [])

  useEffect(() => () => pendingRef.current?.resolve(false), [])

  return {
    requestConfirmation,
    confirmationDialog: pending ? (
      <ConfirmDialog
        options={pending}
        onConfirm={() => settle(true)}
        onCancel={() => settle(false)}
      />
    ) : null,
  }
}
