// 이 파일은 커뮤니티 페이지를 담당하며 글/댓글/좋아요 CRUD UI를 제공합니다.
'use client'

import { FormEvent, useState } from 'react'
import { Heart, LoaderCircle, MessageCircle, Pencil, RefreshCw, SendHorizontal, Trash2 } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { useCommunity } from '@/hooks/useCommunity'
import type { CommunityCommentRecord, CommunityPostRecord } from '@/types'

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

export default function CommunityPage() {
  const auth = useAuth()
  const community = useCommunity()

  const [postTitle, setPostTitle] = useState('')
  const [postContent, setPostContent] = useState('')
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})

  const isSubmitting = community.loading || community.writing

  const handleSubmitPost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!postTitle.trim() || !postContent.trim()) {
      return
    }

    if (editingPostId) {
      const updated = await community.updatePost(editingPostId, {
        title: postTitle,
        content: postContent,
      })

      if (updated) {
        setEditingPostId(null)
        setPostTitle('')
        setPostContent('')
      }
      return
    }

    const created = await community.createPost({
      title: postTitle,
      content: postContent,
    })

    if (created) {
      setPostTitle('')
      setPostContent('')
    }
  }

  const startEditPost = (post: CommunityPostRecord) => {
    setEditingPostId(post.id)
    setPostTitle(post.title)
    setPostContent(post.content)
  }

  const cancelEditPost = () => {
    setEditingPostId(null)
    setPostTitle('')
    setPostContent('')
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
              disabled={isSubmitting}
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

              <h4 className="mt-3 text-base font-bold text-gray-800">{post.title}</h4>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{post.content}</p>

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
