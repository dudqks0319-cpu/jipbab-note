// 이 파일은 외부 레시피 링크를 저장하는 간단한 가져오기 화면을 담당합니다.
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronLeft, LinkIcon, Plus, Trash2 } from 'lucide-react'

const STORAGE_KEY = 'jipbab-note-imported-recipes'

type ImportedRecipe = {
  id: string
  title: string
  url: string
  createdAt: string
}

function readImportedRecipes(): ImportedRecipe[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]') as unknown
    return Array.isArray(parsed)
      ? parsed.filter((item): item is ImportedRecipe => {
          return typeof item === 'object' && item !== null && 'id' in item && 'title' in item && 'url' in item
        })
      : []
  } catch {
    return []
  }
}

function writeImportedRecipes(items: ImportedRecipe[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export default function RecipeImportPage() {
  const [items, setItems] = useState<ImportedRecipe[]>([])
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setItems(readImportedRecipes())
  }, [])

  const addRecipe = () => {
    setError('')
    const trimmedUrl = url.trim()
    const trimmedTitle = title.trim()

    try {
      const parsed = new URL(trimmedUrl)
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new Error('지원하지 않는 URL입니다.')
      }
    } catch {
      setError('올바른 레시피 URL을 입력해 주세요.')
      return
    }

    const next = [
      {
        id: crypto.randomUUID(),
        title: trimmedTitle || '저장한 레시피',
        url: trimmedUrl,
        createdAt: new Date().toISOString(),
      },
      ...items,
    ].slice(0, 30)

    setItems(next)
    writeImportedRecipes(next)
    setTitle('')
    setUrl('')
  }

  const removeRecipe = (id: string) => {
    const next = items.filter((item) => item.id !== id)
    setItems(next)
    writeImportedRecipes(next)
  }

  return (
    <div className="min-h-full bg-[#fbf6ee] pb-6">
      <section className="mobile-safe-top px-5">
        <div className="grid grid-cols-[40px_1fr_40px] items-center">
          <Link href="/recipe" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#eadcc9] bg-[#fffaf3] text-[#2f2117]" aria-label="레시피로 돌아가기">
            <ChevronLeft size={18} />
          </Link>
          <h1 className="text-center text-[16px] font-black text-[#2f2117]">레시피 가져오기</h1>
          <span />
        </div>
      </section>

      <section className="px-5 pt-4">
        <div className="jipbab-panel space-y-3 rounded-[16px] px-4 py-4">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="레시피 이름"
            className="w-full rounded-[12px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-3 text-sm font-semibold outline-none focus:border-[#ea5a1f]"
          />
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://..."
            className="w-full rounded-[12px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-3 text-sm font-semibold outline-none focus:border-[#ea5a1f]"
          />
          {error ? <p className="text-[12px] font-bold text-[#d94d19]">{error}</p> : null}
          <button type="button" onClick={addRecipe} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[13px] bg-[#ea5a1f] text-sm font-black text-white">
            <Plus size={16} />
            저장하기
          </button>
        </div>
      </section>

      <section className="px-5 pt-4">
        <h2 className="mb-2 text-[13px] font-black text-[#4b3929]">저장한 외부 레시피</h2>
        {items.length === 0 ? (
          <div className="jipbab-panel rounded-[16px] px-4 py-8 text-center text-sm font-semibold text-[#8f7f70]">
            아직 저장한 링크가 없습니다.
          </div>
        ) : (
          <div className="jipbab-panel divide-y divide-[#eadcc9] overflow-hidden rounded-[16px]">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <LinkIcon size={16} className="shrink-0 text-[#8a5a2a]" />
                <a href={item.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-[#2f2117]">{item.title}</p>
                  <p className="truncate text-[11px] font-semibold text-[#8f7f70]">{item.url}</p>
                </a>
                <button type="button" onClick={() => removeRecipe(item.id)} className="rounded-full p-2 text-[#b5a493]" aria-label={`${item.title} 삭제`}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
