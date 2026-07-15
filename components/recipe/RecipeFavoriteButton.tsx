// 이 파일은 레시피 상세 화면의 찜 버튼을 담당합니다.
'use client'

import { Heart } from 'lucide-react'

import { useFavorites } from '@/hooks/useFavorites'
import type { RecipePublicationEvidence } from '@/types'

type RecipeFavoriteButtonProps = {
  id: string
  name: string
  category: string
  thumbnailUrl: string | null
  publicationEvidence: RecipePublicationEvidence
}

export default function RecipeFavoriteButton({
  id,
  name,
  category,
  thumbnailUrl,
  publicationEvidence,
}: RecipeFavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const favorite = isFavorite(id)

  return (
    <button
      type="button"
      onClick={() =>
        toggleFavorite({
          id,
          name,
          category,
          thumbnailUrl,
          publicationEvidence,
        })
      }
      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#fffaf3]/92 text-[#2f2117] shadow-soft"
      aria-label={favorite ? `${name} 찜 해제` : `${name} 찜하기`}
      aria-pressed={favorite}
    >
      <Heart size={17} className={favorite ? 'fill-[#ea5a1f] text-[#a63b13]' : ''} />
    </button>
  )
}
