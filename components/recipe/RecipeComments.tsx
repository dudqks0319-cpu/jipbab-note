// 이 파일은 레시피 상세 화면의 댓글 조회, 작성, 삭제 UI를 담당합니다.
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle, Trash2 } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { ApiClientError, requestApi } from "@/lib/api-client";
import { getSupabaseClient } from "@/lib/supabase";
import type { RecipeCommentRecord } from "@/types";

const MAX_COMMENT_LENGTH = 500;

type RecipeCommentsProps = {
  recipeId: string;
  recipeName: string;
};

function getSafeCommentErrorMessage(status: number): string {
  if (status === 401) {
    return "로그인하면 댓글을 남길 수 있어요.";
  }
  if (status === 429) {
    return "요청이 많습니다. 잠시 후 다시 시도해주세요.";
  }
  return "댓글을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.";
}

function invalidCommentResponse(message: string, requestId: string | null): never {
  throw new ApiClientError({
    code: "INVALID_RESPONSE",
    message,
    status: 502,
    requestId,
    retryable: false,
  });
}

function parseCommentList(value: unknown, requestId: string | null): RecipeCommentRecord[] {
  const payload = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
  if (!Array.isArray(payload?.comments)) {
    return invalidCommentResponse("댓글 목록 응답 형식을 확인하지 못했습니다.", requestId);
  }
  return payload.comments as RecipeCommentRecord[];
}

function parseCreatedComment(value: unknown, requestId: string | null): RecipeCommentRecord {
  const payload = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
  const comment = payload?.comment;
  if (!comment || typeof comment !== "object" || Array.isArray(comment)) {
    return invalidCommentResponse("댓글 저장 응답 형식을 확인하지 못했습니다.", requestId);
  }
  return comment as RecipeCommentRecord;
}

function formatCommentDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function getAccessToken(): Promise<string | null> {
  const client = getSupabaseClient();
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}

export default function RecipeComments({ recipeId, recipeName }: RecipeCommentsProps) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [comments, setComments] = useState<RecipeCommentRecord[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const encodedRecipeId = useMemo(() => encodeURIComponent(recipeId), [recipeId]);

  const fetchComments = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const nextComments = await requestApi(`/api/recipes/${encodedRecipeId}/comments`, {
        signal,
        parseResponse: parseCommentList,
      });
      setComments(nextComments);
    } catch {
      if (signal?.aborted) return;
      setErrorMessage("댓글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [encodedRecipeId]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchComments(controller.signal);
    return () => controller.abort();
  }, [fetchComments]);

  const submitComment = async () => {
    const trimmed = content.trim();
    setErrorMessage(null);
    if (trimmed.length < 1 || trimmed.length > MAX_COMMENT_LENGTH) {
      setErrorMessage("댓글은 1자 이상 500자 이하로 입력해주세요.");
      return;
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("로그인하면 댓글을 남길 수 있어요.");
      return;
    }

    setSubmitting(true);
    try {
      const comment = await requestApi(`/api/recipes/${encodedRecipeId}/comments`, {
        method: "POST",
        bearerToken: accessToken,
        json: { content: trimmed },
        parseResponse: parseCreatedComment,
      });
      setComments((prev) => [comment, ...prev]);
      setContent("");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiClientError
          ? getSafeCommentErrorMessage(error.status)
          : "댓글을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    const shouldDelete = window.confirm("내 댓글을 삭제할까요?");
    if (!shouldDelete) {
      return;
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("로그인이 필요합니다.");
      return;
    }

    try {
      await requestApi(
        `/api/recipes/${encodedRecipeId}/comments/${encodeURIComponent(commentId)}`,
        {
        method: "DELETE",
          bearerToken: accessToken,
          parseResponse(value, requestId, status) {
            if (status !== 204 || value !== null) {
              return invalidCommentResponse("댓글 삭제 응답 형식을 확인하지 못했습니다.", requestId);
            }
            return undefined;
          },
        },
      );
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    } catch (error) {
      setErrorMessage(
        error instanceof ApiClientError
          ? getSafeCommentErrorMessage(error.status)
          : "댓글을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.",
      );
    }
  };

  return (
    <section className="px-5 pt-5">
      <div className="jipbab-panel rounded-[16px] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-[17px] font-black text-[#2f2117]">
              <MessageCircle size={17} className="text-[#a63b13]" />
              이 레시피 어땠나요?
            </h2>
            <p className="mt-1 text-[12px] font-semibold leading-5 text-[#6b5f55]">
              {recipeName}을 만들어 본 느낌이나 다음에 볼 메모를 남겨보세요.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[#fff7ed] px-3 py-1 text-[11px] font-black text-[#8a5a2a]">
            {comments.length}
          </span>
        </div>

        {authLoading ? (
          <p className="mt-4 rounded-[12px] bg-[#fffaf3] px-3 py-3 text-[12px] font-bold text-[#5f5145]">
            로그인 상태를 확인하는 중입니다.
          </p>
        ) : isAuthenticated ? (
          <div className="mt-4 space-y-2">
            <textarea
              id="recipe-comment"
              aria-label="레시피 댓글"
              aria-invalid={Boolean(errorMessage)}
              aria-describedby={`recipe-comment-count${errorMessage ? ' recipe-comment-error' : ''}`}
              value={content}
              onChange={(event) => setContent(event.target.value.slice(0, MAX_COMMENT_LENGTH))}
              placeholder="예: 간을 조금 줄이니 아이도 잘 먹었어요."
              className="min-h-24 w-full resize-none rounded-[13px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-3 text-sm font-semibold leading-6 text-[#4b3929] outline-none focus:border-[#ea5a1f]"
            />
            <div className="flex items-center justify-between gap-3">
              <span id="recipe-comment-count" className="text-[11px] font-bold text-[#6b5f55]">{content.length}/{MAX_COMMENT_LENGTH}</span>
              <button
                type="button"
                onClick={submitComment}
                disabled={submitting || content.trim().length === 0}
                className="rounded-full bg-[#c2410c] px-4 py-2 text-[12px] font-black text-white disabled:bg-[#e6b49a]"
              >
                {submitting ? "등록 중..." : "댓글 등록"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-[14px] border border-[#eadcc9] bg-[#fffaf3] px-4 py-4">
            <p className="text-sm font-black text-[#4b3929]">로그인하면 댓글을 남길 수 있어요.</p>
            <Link
              href="/login"
              className="mt-3 inline-flex min-h-11 items-center rounded-full bg-[#c2410c] px-4 py-2 text-[12px] font-black text-white"
            >
              로그인하기
            </Link>
          </div>
        )}

        {errorMessage ? (
          <p id="recipe-comment-error" className="mt-3 rounded-[12px] bg-[#fff0e4] px-4 py-3 text-sm font-bold text-[#a63b13]" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-4 space-y-2">
          {loading ? (
            <p className="rounded-[12px] bg-[#fffaf3] px-3 py-3 text-[12px] font-bold text-[#5f5145]">
              댓글을 불러오는 중입니다.
            </p>
          ) : comments.length === 0 ? (
            <p className="rounded-[12px] bg-[#fffaf3] px-3 py-3 text-[12px] font-bold text-[#5f5145]">
              아직 댓글이 없습니다. 첫 후기를 남겨보세요.
            </p>
          ) : (
            comments.map((comment) => {
              const mine = user?.id && comment.userId === user.id;
              return (
                <article key={comment.id} className="rounded-[13px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[12px] font-black text-[#4b3929]">{comment.authorName || "집밥러"}</p>
                      <p className="mt-0.5 text-[10px] font-bold text-[#6b5f55]">{formatCommentDate(comment.createdAt)}</p>
                    </div>
                    {mine ? (
                      <button
                        type="button"
                        onClick={() => {
                          void deleteComment(comment.id);
                        }}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#75675b] hover:bg-[#fff0e4] hover:text-[#a63b13]"
                        aria-label="내 댓글 삭제"
                      >
                        <Trash2 size={13} />
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-2 whitespace-pre-line text-[13px] font-semibold leading-6 text-[#4b3929]">
                    {comment.content}
                  </p>
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
