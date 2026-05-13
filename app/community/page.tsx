// 이 파일은 커뮤니티 페이지를 담당하며 글/댓글/좋아요 CRUD UI를 제공합니다.
'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Heart, Image as ImageIcon, Link2, LoaderCircle, MessageCircle, Pencil, RefreshCw, Refrigerator, SendHorizontal, Trash2 } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { useCommunity } from '@/hooks/useCommunity'
import { useIngredients } from '@/hooks/useIngredients'
import { COMMUNITY_ENABLED } from '@/lib/release-flags'
import { formatExternalUrlLabel, normalizeSafeHttpUrl } from '@/lib/utils'
import type { CommunityCommentRecord, CommunityPostRecord, CommunityPostType } from '@/types'

const COMMUNITY_DRAFT_KEY = 'jipbab-note-community-draft'
const RECIPE_ADOPTION_LIKE_THRESHOLD = 10

const postTypeLabels: Record<CommunityPostType, string> = {
  story: '집밥 이야기',
  recipe: '레시피 공유',
  fridge: '냉장고 공유',
}

function formatDateLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '방금 전'
  }

  const diff = Date.now() - date.getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) {
    return '방금 전'
  }
  if (diff < hour) {
    return `${Math.floor(diff / minute)}분 전`
  }
  if (diff < day) {
    return `${Math.floor(diff / hour)}시간 전`
  }

  return date.toLocaleDateString('ko-KR')
}

function canManageRecord(
  record: Pick<CommunityPostRecord | CommunityCommentRecord, 'userId' | 'deviceId'>,
  viewerUserId: string | null,
  viewerDeviceId: string,
): boolean {
  if (viewerUserId) {
    return record.userId === viewerUserId
  }
  return record.deviceId === viewerDeviceId
}

function CommunityPaused() {
  return (
    <div className="flex flex-col px-5 pb-6 pt-4">
      <section className="rounded-3xl bg-gradient-to-br from-mint-100 via-cream-100 to-lavender-100 p-5 shadow-soft">
        <p className="text-xs font-semibold tracking-[0.16em] text-mint-500/80">COMMUNITY</p>
        <h2 className="mt-2 text-xl font-bold text-gray-800">커뮤니티는 준비 중입니다</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          첫 출시에서는 냉장고 재료 기반 집밥 추천과 장보기 흐름에 집중합니다.
          신고/차단/운영 정책을 갖춘 뒤 안전하게 열겠습니다.
        </p>
      </section>

      <div className="mt-4 rounded-3xl bg-white p-4 shadow-soft">
        <p className="text-sm font-bold text-gray-800">지금 바로 쓸 수 있는 기능</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link href="/fridge" className="rounded-2xl bg-mint-50 px-3 py-3 text-center text-sm font-bold text-mint-500">
            냉장고 채우기
          </Link>
          <Link href="/recipe" className="rounded-2xl bg-peach-50 px-3 py-3 text-center text-sm font-bold text-peach-500">
            메뉴 추천 보기
          </Link>
        </div>
      </div>
    </div>
  )
}

function CommunityExperience() {
  const auth = useAuth()
  const community = useCommunity()
  const { ingredients } = useIngredients()

  const [postTitle, setPostTitle] = useState('')
  const [postContent, setPostContent] = useState('')
  const [postType, setPostType] = useState<CommunityPostType>('story')
  const [postImageUrl, setPostImageUrl] = useState('')
  const [postLinkUrl, setPostLinkUrl] = useState('')
  const [recipeId, setRecipeId] = useState<string | null>(null)
  const [consentRecipeUse, setConsentRecipeUse] = useState(false)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [uploadingImage, setUploadingImage] = useState(false)

  const isSubmitting = community.loading || community.writing || uploadingImage

  const resetPostForm = () => {
    setEditingPostId(null)
    setPostTitle('')
    setPostContent('')
    setPostType('story')
    setPostImageUrl('')
    setPostLinkUrl('')
    setRecipeId(null)
    setConsentRecipeUse(false)
    setUploadingImage(false)
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    const raw = window.localStorage.getItem(COMMUNITY_DRAFT_KEY)
    if (!raw) return

    try {
      const draft = JSON.parse(raw) as Partial<{
        postType: CommunityPostType
        title: string
        content: string
        imageUrl: string | null
        linkUrl: string | null
        recipeId: string | null
      }>
      setPostType(draft.postType === 'recipe' || draft.postType === 'fridge' ? draft.postType : 'story')
      setPostTitle(draft.title ?? '')
      setPostContent(draft.content ?? '')
      setPostImageUrl(draft.imageUrl ?? '')
      setPostLinkUrl(draft.linkUrl ?? '')
      setRecipeId(draft.recipeId ?? null)
    } catch {
      // 잘못된 임시 글은 조용히 버립니다.
    } finally {
      window.localStorage.removeItem(COMMUNITY_DRAFT_KEY)
    }
  }, [])

  const handleSubmitPost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!postTitle.trim() || !postContent.trim()) {
      return
    }

    if (postType === 'recipe' && !consentRecipeUse) {
      return
    }

    const payload = {
      title: postTitle,
      content: postContent,
      postType,
      imageUrl: postImageUrl || null,
      linkUrl: postLinkUrl || null,
      recipeId,
      consentRecipeUse,
    }

    if (editingPostId) {
      const updated = await community.updatePost(editingPostId, payload)

      if (updated) {
        resetPostForm()
      }
      return
    }

    const created = await community.createPost(payload)

    if (created) {
      resetPostForm()
    }
  }

  const startEditPost = (post: CommunityPostRecord) => {
    setEditingPostId(post.id)
    setPostTitle(post.title)
    setPostContent(post.content)
    setPostType(post.postType)
    setPostImageUrl(post.imageUrl ?? '')
    setPostLinkUrl(post.linkUrl ?? '')
    setRecipeId(post.recipeId)
    setConsentRecipeUse(post.consentRecipeUse)
  }

  const cancelEditPost = () => {
    resetPostForm()
  }

  const fillFridgeShareDraft = () => {
    const summary = ingredients.length === 0
      ? '아직 등록된 재료가 없습니다.'
      : ingredients
          .slice(0, 20)
          .map((ingredient) => `- ${ingredient.name}${ingredient.quantity ? ` (${ingredient.quantity})` : ''}`)
          .join('\n')

    setPostType('fridge')
    setPostTitle('우리집 냉장고 재료 공유')
    setPostContent(`오늘 우리집 냉장고에는 이런 재료가 있어요.\n\n${summary}`)
  }

  const handleImageFileChange = async (file: File | null) => {
    if (!file) return

    setUploadingImage(true)
    try {
      const uploadedUrl = await community.uploadImage(file)
      if (uploadedUrl) {
        setPostImageUrl(uploadedUrl)
      }
    } finally {
      setUploadingImage(false)
    }
  }

  const submitComment = async (postId: string) => {
    const draft = commentDrafts[postId] ?? ''
    if (!draft.trim()) {
      return
    }

    const created = await community.createComment(postId, {
      content: draft,
    })

    if (created) {
      setCommentDrafts((prev) => ({
        ...prev,
        [postId]: '',
      }))
    }
  }

  return (
    <div className="flex flex-col px-5 pb-6 pt-4">
      {/* 헤더 */}
      <div className="rounded-3xl bg-gradient-to-br from-mint-100 via-cream-100 to-lavender-100 p-5 shadow-soft">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-mint-500/80">COMMUNITY</p>
            <h2 className="mt-1 text-xl font-bold text-gray-800">집밥러 커뮤니티</h2>
            <p className="mt-1 text-sm text-gray-600">오늘의 집밥 이야기와 팁을 함께 나눠보세요.</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              community.source === 'supabase' ? 'bg-white text-mint-500' : 'bg-white text-orange-500'
            }`}
          >
            {community.source === 'supabase' ? '클라우드 모드' : '로컬 모드'}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="rounded-full bg-white/80 px-3 py-1">작성자: {community.viewerName}</span>
          <span className="rounded-full bg-white/80 px-3 py-1">
            로그인 상태: {auth.isAuthenticated ? '로그인됨' : '비로그인'}
          </span>
          {!auth.isAuthenticated ? (
            <span className="rounded-full bg-white/80 px-3 py-1">로그인하면 계정 기반으로 자동 동기화됩니다</span>
          ) : null}
        </div>
      </div>

      {community.error ? (
        <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {community.error.message}
        </div>
      ) : null}

      {/* 작성/수정 폼 */}
      <form onSubmit={handleSubmitPost} className="mt-4 rounded-3xl bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-800">{editingPostId ? '글 수정하기' : '새 글 작성하기'}</h3>
          <button
            type="button"
            onClick={() => {
              void community.refreshCommunity()
            }}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600"
          >
            <RefreshCw size={12} />
            새로고침
          </button>
        </div>

        <input
          value={postTitle}
          onChange={(event) => setPostTitle(event.target.value)}
          placeholder="제목을 입력해주세요"
          className="mt-3 w-full rounded-xl border border-gray-100 px-3 py-2 text-sm outline-none ring-mint-300 focus:ring-2"
          maxLength={80}
        />
        <textarea
          value={postContent}
          onChange={(event) => setPostContent(event.target.value)}
          placeholder="오늘의 집밥 팁이나 질문을 남겨보세요"
          className="mt-2 h-28 w-full resize-none rounded-xl border border-gray-100 px-3 py-2 text-sm outline-none ring-mint-300 focus:ring-2"
          maxLength={1200}
        />

        <div className="mt-3 grid grid-cols-3 gap-2">
          {(['story', 'recipe', 'fridge'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setPostType(type)}
              className={`inline-flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-bold ${
                postType === type ? 'bg-mint-100 text-mint-500' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {type === 'recipe' ? <BookOpen size={13} /> : type === 'fridge' ? <Refrigerator size={13} /> : null}
              {postTypeLabels[type]}
            </button>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-1 gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-gray-100 px-3 py-2 text-sm text-gray-500">
            <Link2 size={15} className="text-gray-400" />
            <input
              value={postLinkUrl}
              onChange={(event) => setPostLinkUrl(event.target.value)}
              placeholder="공유할 링크를 붙여넣으세요"
              className="min-w-0 flex-1 outline-none"
            />
          </label>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-100 px-3 py-2 text-sm text-gray-500">
            <ImageIcon size={15} className="text-gray-400" />
            <span className="shrink-0">사진 올리기</span>
            <input
              type="file"
            accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                void handleImageFileChange(event.target.files?.[0] ?? null)
              }}
            />
            {uploadingImage ? <span className="truncate text-xs text-gray-400">업로드 중...</span> : null}
            {!uploadingImage && postImageUrl ? <span className="truncate text-xs text-mint-500">사진 업로드됨</span> : null}
          </label>
        </div>

        {postImageUrl ? (
          <div className="mt-2 h-36 overflow-hidden rounded-2xl bg-gray-100">
            {/* 사용자가 올린 사진 미리보기입니다. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={postImageUrl} alt="커뮤니티 첨부 사진" className="h-full w-full object-cover" />
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={fillFridgeShareDraft}
            className="rounded-full bg-mint-50 px-3 py-1.5 text-xs font-bold text-mint-500"
          >
            내 냉장고 재료 공유
          </button>
          {postType === 'recipe' ? (
            <label className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
              <input
                type="checkbox"
                checked={consentRecipeUse}
                onChange={(event) => setConsentRecipeUse(event.target.checked)}
              />
              앱 내 레시피 채택/활용에 동의
            </label>
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-gray-400">{postContent.length}/1200</p>
          <div className="flex items-center gap-2">
            {editingPostId ? (
              <button
                type="button"
                onClick={cancelEditPost}
                className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600"
              >
                취소
              </button>
            ) : null}
            <button
              type="submit"
              disabled={isSubmitting || (postType === 'recipe' && !consentRecipeUse)}
              className="rounded-full bg-mint-300 px-5 py-2 text-sm font-bold text-white shadow-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? '저장 중...' : editingPostId ? '수정 완료' : '글 올리기'}
            </button>
          </div>
        </div>
      </form>

      {/* 게시글 목록 */}
      <div className="mt-4 space-y-3">
        {community.loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-10 text-sm text-gray-500 shadow-soft">
            <LoaderCircle size={16} className="animate-spin" />
            커뮤니티를 불러오는 중입니다
          </div>
        ) : null}

        {!community.loading && community.posts.length === 0 ? (
          <div className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-gray-500 shadow-soft">
            아직 글이 없습니다. 첫 글을 남겨보세요.
          </div>
        ) : null}

        {community.posts.map((post) => {
          const comments = community.commentsByPostId[post.id] ?? []
          const canManagePostRecord = canManageRecord(post, community.viewerUserId, community.viewerDeviceId)
          const safeLinkUrl = normalizeSafeHttpUrl(post.linkUrl)

          return (
            <article key={post.id} className="rounded-3xl bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-gray-800">{post.authorName}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{formatDateLabel(post.createdAt)}</p>
                </div>

                {canManagePostRecord ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEditPost(post)}
                      className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                      aria-label="글 수정"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void community.deletePost(post.id)
                        if (editingPostId === post.id) {
                          cancelEditPost()
                        }
                      }}
                      className="rounded-full p-2 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                      aria-label="글 삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-500">
                  {postTypeLabels[post.postType]}
                </span>
                {post.postType === 'recipe' && post.consentRecipeUse ? (
                  <span className="rounded-full bg-mint-50 px-2.5 py-1 text-[11px] font-bold text-mint-500">
                    활용 동의
                  </span>
                ) : null}
                {post.postType === 'recipe' && post.likeCount >= RECIPE_ADOPTION_LIKE_THRESHOLD ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                    채택 레시피 후보
                  </span>
                ) : null}
              </div>

              <h4 className="mt-2 text-base font-bold text-gray-800">{post.title}</h4>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{post.content}</p>

              {post.imageUrl ? (
                <div className="mt-3 h-48 overflow-hidden rounded-2xl bg-gray-100">
                  {/* 커뮤니티 첨부 이미지입니다. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.imageUrl} alt={`${post.title} 첨부 이미지`} className="h-full w-full object-cover" />
                </div>
              ) : null}

              {safeLinkUrl ? (
                <a
                  href={safeLinkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex items-center gap-2 rounded-2xl bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600"
                >
                  <Link2 size={13} />
                  <span className="truncate">{formatExternalUrlLabel(safeLinkUrl)}</span>
                </a>
              ) : null}

              <div className="mt-3 flex items-center gap-3 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    void community.toggleLike(post.id)
                  }}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    post.likedByMe
                      ? 'bg-rose-100 text-rose-500'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <Heart size={13} className={post.likedByMe ? 'fill-rose-500' : ''} />
                  좋아요 {post.likeCount}
                </button>
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-500">
                  <MessageCircle size={13} />
                  댓글 {post.commentCount}
                </span>
              </div>

              <div className="mt-3 space-y-2 rounded-2xl bg-gray-50 p-3">
                {comments.length === 0 ? (
                  <p className="text-xs text-gray-400">아직 댓글이 없습니다.</p>
                ) : (
                  comments.map((comment) => {
                    const canManageCommentRecord = canManageRecord(
                      comment,
                      community.viewerUserId,
                      community.viewerDeviceId,
                    )

                    return (
                      <div key={comment.id} className="rounded-xl bg-white px-3 py-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-gray-700">{comment.authorName}</p>
                            <p className="mt-1 text-sm text-gray-600">{comment.content}</p>
                          </div>
                          {canManageCommentRecord ? (
                            <button
                              type="button"
                              onClick={() => {
                                void community.deleteComment(comment.id)
                              }}
                              className="rounded-full p-1.5 text-gray-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                              aria-label="댓글 삭제"
                            >
                              <Trash2 size={13} />
                            </button>
                          ) : null}
                        </div>
                        <p className="mt-1 text-[11px] text-gray-400">{formatDateLabel(comment.createdAt)}</p>
                      </div>
                    )
                  })
                )}

                <div className="flex items-center gap-2">
                  <input
                    value={commentDrafts[post.id] ?? ''}
                    onChange={(event) => {
                      const value = event.target.value
                      setCommentDrafts((prev) => ({
                        ...prev,
                        [post.id]: value,
                      }))
                    }}
                    placeholder="댓글을 입력해주세요"
                    maxLength={500}
                    className="h-9 flex-1 rounded-full border border-gray-200 px-3 text-sm outline-none ring-mint-300 focus:ring-2"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void submitComment(post.id)
                    }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-mint-300 text-white disabled:opacity-50"
                    disabled={community.writing}
                    aria-label="댓글 등록"
                  >
                    <SendHorizontal size={14} />
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

export default function CommunityPage() {
  return COMMUNITY_ENABLED ? <CommunityExperience /> : <CommunityPaused />
}
