// 이 파일은 집밥러가 냉장고 재료와 레시피를 공유하는 커뮤니티 MVP 화면입니다.
'use client'

import { useMemo, useState } from 'react'
import { Heart, MessageCircle, RefreshCw, Send, ShieldCheck, Trash2 } from 'lucide-react'

import { useCommunity } from '@/hooks/useCommunity'
import { useIngredients } from '@/hooks/useIngredients'
import { isCommunityEnabled } from '@/lib/release-flags'
import { getSupabaseClient } from '@/lib/supabase'
import { isPermanentSupabaseUser } from '@/lib/supabase-session'

const MAX_COMMUNITY_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_COMMUNITY_IMAGE_TYPES: Record<string, 'png' | 'jpg' | 'webp'> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

function extractFirstUrl(value: string): string | null {
  const match = value.match(/https?:\/\/[^\s]+/i)
  return match?.[0] ?? null
}

function isImageUrl(value: string | null): value is string {
  return Boolean(value?.match(/\.(png|jpe?g|webp|gif)(\?.*)?$/i))
}

function getCommunityImageExtension(file: File): 'png' | 'jpg' | 'webp' | null {
  const typeExtension = ALLOWED_COMMUNITY_IMAGE_TYPES[file.type]
  if (typeExtension) {
    return typeExtension
  }

  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension === 'jpeg') {
    return 'jpg'
  }
  return extension === 'png' || extension === 'jpg' || extension === 'webp' ? extension : null
}

export default function CommunityPage() {
  if (!isCommunityEnabled()) {
    return <CommunityLockedNotice />
  }

  return <CommunityEnabledPage />
}

function CommunityLockedNotice() {
  return (
    <div className="min-h-full bg-[#fbf6ee] px-5 pb-6">
      <section className="mobile-safe-top">
        <div className="jipbab-panel rounded-[22px] px-5 py-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fff0e4] text-[#d94d19]">
            <ShieldCheck size={24} />
          </span>
          <h1 className="mt-4 text-[22px] font-black text-[#2f2117]">커뮤니티는 베타 준비 중</h1>
          <p className="mt-2 text-[13px] font-semibold leading-6 text-[#7d6d5f]">
            신고, 차단, 관리자 삭제, 스팸 방지 운영 기준이 준비된 뒤 열립니다. 정식 출시 후보에서는 냉장고와 레시피, 장보기 흐름에 집중합니다.
          </p>
        </div>
      </section>
    </div>
  )
}

function CommunityEnabledPage() {
  const {
    source,
    posts,
    commentsByPostId,
    loading,
    writing,
    error,
    refreshCommunity,
    createPost,
    deletePost,
    createComment,
    toggleLike,
  } = useCommunity()
  const { ingredients } = useIngredients()

  const [title, setTitle] = useState('')
  const [recipeText, setRecipeText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [consented, setConsented] = useState(false)
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [statusMessage, setStatusMessage] = useState('')

  const fridgeSummary = useMemo(
    () => ingredients.slice(0, 8).map((item) => item.name).join(', '),
    [ingredients],
  )

  const uploadImageFile = async (): Promise<string> => {
    if (!imageFile) return imageUrl.trim()
    if (imageFile.size > MAX_COMMUNITY_IMAGE_SIZE_BYTES) {
      setStatusMessage('사진은 5MB 이하 PNG, JPG, WebP만 올릴 수 있어요.')
      return imageUrl.trim()
    }

    const extension = getCommunityImageExtension(imageFile)
    if (!extension) {
      setStatusMessage('사진은 PNG, JPG, WebP 형식만 올릴 수 있어요.')
      return imageUrl.trim()
    }

    if (source === 'local') {
      return imagePreviewUrl
    }

    try {
      const client = getSupabaseClient()
      const { data: authData } = await client.auth.getUser()
      if (!isPermanentSupabaseUser(authData.user)) {
        throw new Error('permanent_session_required')
      }
      const ownerPrefix = authData.user.id
      const filePath = `${ownerPrefix}/${Date.now()}-${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await client.storage
        .from('community-images')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false,
        })
      if (uploadError) throw uploadError
      const { data } = client.storage.from('community-images').getPublicUrl(filePath)
      return data.publicUrl
    } catch {
      setStatusMessage('사진 업로드 버킷이 아직 없어 이미지 URL/로컬 미리보기로만 처리했어요.')
      return imageUrl.trim()
    }
  }

  const handleCreatePost = async () => {
    if (!title.trim() || !recipeText.trim()) {
      setStatusMessage('제목과 만드는 방식을 입력해 주세요.')
      return
    }
    if (!consented) {
      setStatusMessage('앱 안에서 레시피를 사용할 수 있다는 동의가 필요합니다.')
      return
    }

    const uploadedImageUrl = await uploadImageFile()
    const content = [
      recipeText.trim(),
      fridgeSummary ? `\n[우리집 냉장고] ${fridgeSummary}` : '',
      linkUrl.trim() ? `\n[참고 링크] ${linkUrl.trim()}` : '',
      uploadedImageUrl ? `\n[사진] ${uploadedImageUrl}` : '',
      '\n[동의] 집밥노트 앱 내 레시피 추천과 커뮤니티 노출에 사용할 수 있음',
    ].join('')

    const created = await createPost({ title, content })
    if (!created) return
    setTitle('')
    setRecipeText('')
    setLinkUrl('')
    setImageUrl('')
    setImageFile(null)
    setImagePreviewUrl('')
    setConsented(false)
    setStatusMessage('커뮤니티에 공유했어요.')
  }

  const handleComment = async (postId: string) => {
    const content = commentDrafts[postId]?.trim()
    if (!content) return
    await createComment(postId, { content })
    setCommentDrafts((prev) => ({ ...prev, [postId]: '' }))
  }

  return (
    <div className="min-h-full bg-[#fbf6ee] px-5 pb-6">
      <section className="mobile-safe-top">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black tracking-[0.16em] text-[#d94d19]">JIPBAB COMMUNITY</p>
            <h1 className="mt-1 text-[24px] font-black text-[#2f2117]">우리집 레시피 공유</h1>
            <p className="mt-1 text-[12px] font-semibold leading-5 text-[#8f7f70]">
              같은 김치찌개도 집마다 다릅니다. 좋아요가 쌓인 레시피는 집밥노트 추천 후보로 채택합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void refreshCommunity()
            }}
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#eadcc9] bg-[#fffaf3] text-[#7d6d5f]"
            aria-label="커뮤니티 새로고침"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </section>

      <section className="pt-4">
        <div className="jipbab-panel rounded-[20px] p-4">
          <div className="flex items-start gap-2">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#3d7b38]" />
            <div>
              <h2 className="text-[15px] font-black text-[#2f2117]">레시피 사용 동의 후 공유</h2>
              <p className="mt-1 text-[12px] leading-5 text-[#7d6d5f]">
                직접 올린 레시피만 공유해 주세요. 링크와 사진 URL은 자유롭게 첨부할 수 있습니다.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="예: 우리집 김치찌개 방식"
              className="w-full rounded-[14px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-3 text-[14px] font-bold text-[#4b3929] outline-none focus:border-[#ea5a1f]"
            />
            <textarea
              value={recipeText}
              onChange={(event) => setRecipeText(event.target.value)}
              placeholder="재료, 만드는 방식, 팁을 적어주세요."
              rows={5}
              className="w-full resize-none rounded-[14px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-3 text-[14px] font-semibold leading-6 text-[#4b3929] outline-none focus:border-[#ea5a1f]"
            />
            <input
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="참고 링크 URL"
              className="w-full rounded-[14px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-3 text-[14px] font-semibold text-[#4b3929] outline-none focus:border-[#ea5a1f]"
            />
            <input
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="사진 이미지 URL"
              className="w-full rounded-[14px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-3 text-[14px] font-semibold text-[#4b3929] outline-none focus:border-[#ea5a1f]"
            />
            <label className="block rounded-[14px] border border-dashed border-[#eadcc9] bg-[#fffaf3] px-3 py-3 text-[12px] font-black text-[#7d6d5f]">
              사진 파일 선택
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null
                  setImageFile(file)
                  setImagePreviewUrl(file ? URL.createObjectURL(file) : '')
                }}
              />
            </label>
            {imagePreviewUrl ? (
              <div className="overflow-hidden rounded-[14px] border border-[#eadcc9]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreviewUrl} alt="선택한 커뮤니티 사진 미리보기" className="h-40 w-full object-cover" />
              </div>
            ) : null}
            <label className="flex items-start gap-2 rounded-[14px] bg-[#fff7ed] px-3 py-3 text-[12px] font-bold leading-5 text-[#7d6d5f]">
              <input
                type="checkbox"
                checked={consented}
                onChange={(event) => setConsented(event.target.checked)}
                className="mt-1"
              />
              내가 작성한 레시피를 집밥노트 앱 내 추천/커뮤니티 노출에 사용할 수 있음에 동의합니다.
            </label>
            <button
              type="button"
              onClick={() => {
                void handleCreatePost()
              }}
              disabled={writing}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#ea5a1f] text-[14px] font-black text-white disabled:opacity-60"
            >
              <Send size={16} />
              공유하기
            </button>
          </div>
        </div>
        {statusMessage || error ? (
          <p className="mt-3 rounded-[14px] bg-[#fff0e4] px-3 py-2 text-[12px] font-bold text-[#d94d19]">
            {statusMessage || error?.message}
          </p>
        ) : null}
      </section>

      <section className="pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[17px] font-black text-[#2f2117]">공유된 레시피</h2>
          <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-[11px] font-black text-[#8a5a2a]">
            {source === 'local' ? '로컬 모드' : '동기화'}
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm font-bold text-[#8f7f70]">커뮤니티를 불러오는 중...</div>
        ) : posts.length === 0 ? (
          <div className="jipbab-panel rounded-[18px] px-4 py-10 text-center">
            <MessageCircle className="mx-auto text-[#d94d19]" size={28} />
            <p className="mt-3 text-sm font-black text-[#4b3929]">아직 공유된 레시피가 없어요.</p>
            <p className="mt-1 text-xs text-[#8f7f70]">첫 집밥 레시피를 올려보세요.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => {
              const url = extractFirstUrl(post.content)
              const image = isImageUrl(url) ? url : extractFirstUrl(post.content.match(/\[사진]\s*(.+)/)?.[1] ?? '')
              const comments = commentsByPostId[post.id] ?? []
              return (
                <article key={post.id} className="jipbab-panel rounded-[18px] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[16px] font-black text-[#2f2117]">{post.title}</h3>
                      <p className="mt-1 text-[11px] font-bold text-[#8f7f70]">
                        {post.authorName} · {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void deletePost(post.id)
                      }}
                      className="rounded-full p-2 text-[#b5a493]"
                      aria-label={`${post.title} 삭제`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt={`${post.title} 사진`} className="mt-3 h-40 w-full rounded-[14px] object-cover" />
                  ) : null}
                  <p className="mt-3 whitespace-pre-line text-[13px] font-semibold leading-6 text-[#4b3929]">{post.content}</p>
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-full bg-[#fff0e4] px-3 py-2 text-[12px] font-black text-[#d94d19]">
                      링크 열기
                    </a>
                  ) : null}

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void toggleLike(post.id)
                      }}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-[12px] font-black ${
                        post.likedByMe ? 'bg-[#fff0e4] text-[#d94d19]' : 'bg-[#fff7ed] text-[#7d6d5f]'
                      }`}
                    >
                      <Heart size={14} className={post.likedByMe ? 'fill-[#ea5a1f]' : ''} />
                      {post.likeCount}
                    </button>
                    <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[#8f7f70]">
                      <MessageCircle size={14} />
                      댓글 {post.commentCount}
                    </span>
                    {post.likeCount >= 10 ? (
                      <span className="rounded-full bg-[#f2f7e7] px-3 py-1 text-[11px] font-black text-[#3d7b38]">
                        추천 후보
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 space-y-2">
                    {comments.slice(0, 3).map((comment) => (
                      <p key={comment.id} className="rounded-[12px] bg-[#fffaf3] px-3 py-2 text-[12px] font-semibold text-[#4b3929]">
                        <span className="font-black">{comment.authorName}</span> {comment.content}
                      </p>
                    ))}
                    <div className="flex gap-2">
                      <input
                        value={commentDrafts[post.id] ?? ''}
                        onChange={(event) => setCommentDrafts((prev) => ({ ...prev, [post.id]: event.target.value }))}
                        placeholder="댓글 달기"
                        className="min-w-0 flex-1 rounded-full border border-[#eadcc9] bg-[#fffaf3] px-3 py-2 text-[13px] font-semibold text-[#4b3929] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          void handleComment(post.id)
                        }}
                        className="rounded-full bg-[#2f2117] px-3 py-2 text-[12px] font-black text-white"
                      >
                        등록
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
