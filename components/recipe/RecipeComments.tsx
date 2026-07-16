// 이 파일은 레시피 상세 화면의 댓글 조회, 작성, 삭제 UI를 담당합니다.
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle, Trash2 } from "lucide-react";

import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import {
  COOKING_OUTCOMES,
  COOKING_REMAKE_INTENTS,
  COOKING_TASTES,
  type CookingOutcome,
  type CookingRemakeIntent,
  type CookingTaste,
} from "@/lib/recipe-cooking-session";
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
  const { requestConfirmation, confirmationDialog } = useConfirmDialog();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [comments, setComments] = useState<RecipeCommentRecord[]>([]);
  const [content, setContent] = useState("");
  const [outcome, setOutcome] = useState<CookingOutcome>("success");
  const [taste, setTaste] = useState<CookingTaste>("not_rated");
  const [remakeIntent, setRemakeIntent] = useState<CookingRemakeIntent>("yes");
  const [actualDurationMinutes, setActualDurationMinutes] = useState("30");
  const [substitutionNotes, setSubstitutionNotes] = useState("");
  const [familyReaction, setFamilyReaction] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const encodedRecipeId = useMemo(() => encodeURIComponent(recipeId), [recipeId]);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/recipes/${encodedRecipeId}/comments`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(String(response.status));
      }
      const payload = (await response.json()) as { comments?: RecipeCommentRecord[] };
      setComments(Array.isArray(payload.comments) ? payload.comments : []);
    } catch {
      setErrorMessage("댓글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }, [encodedRecipeId]);

  useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  const submitComment = async () => {
    const trimmed = content.trim();
    setErrorMessage(null);
    const duration = Number(actualDurationMinutes);
    if (trimmed.length < 3 || trimmed.length > MAX_COMMENT_LENGTH) {
      setErrorMessage("후기는 3자 이상 500자 이하로 입력해 주세요.");
      return;
    }
    if (!Number.isInteger(duration) || duration < 1 || duration > 1440) {
      setErrorMessage("실제 소요시간은 1분 이상 1,440분 이하로 입력해 주세요.");
      return;
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("로그인하면 댓글을 남길 수 있어요.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/recipes/${encodedRecipeId}/comments`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          content: trimmed,
          outcome,
          taste,
          remakeIntent,
          actualDurationMinutes: duration,
          substitutionNotes,
          familyReaction,
        }),
      });
      if (!response.ok) {
        setErrorMessage(getSafeCommentErrorMessage(response.status));
        return;
      }

      const payload = (await response.json()) as { review?: { status?: string } };
      if (payload.review?.status !== "pending") throw new Error("unexpected_review_status");
      setContent("");
      setSubstitutionNotes("");
      setFamilyReaction("");
      setErrorMessage("후기를 검수 대기로 접수했습니다. 운영자가 승인하기 전에는 공개되지 않습니다.");
    } catch {
      setErrorMessage("댓글을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    const shouldDelete = await requestConfirmation({
      title: "댓글을 삭제할까요?",
      message: "삭제한 댓글은 복구할 수 없습니다.",
      confirmLabel: "댓글 삭제",
      destructive: true,
    });
    if (!shouldDelete) {
      return;
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("로그인이 필요합니다.");
      return;
    }

    try {
      const response = await fetch(`/api/recipes/${encodedRecipeId}/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) {
        setErrorMessage(getSafeCommentErrorMessage(response.status));
        return;
      }
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    } catch {
      setErrorMessage("댓글을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  return (
    <>
      <section className="px-5 pt-5">
      <div className="jipbab-panel rounded-[16px] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-[17px] font-black text-[#2f2117]">
              <MessageCircle size={17} className="text-[#d94d19]" />
              검수된 요리 후기
            </h2>
            <p className="mt-1 text-[12px] font-semibold leading-5 text-[#8f7f70]">
              {recipeName}을 실제로 만든 결과를 남겨주세요. 운영 검수 후에만 공개됩니다.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[#fff7ed] px-3 py-1 text-[11px] font-black text-[#8a5a2a]">
            {comments.length}
          </span>
        </div>

        {authLoading ? (
          <p className="mt-4 rounded-[12px] bg-[#fffaf3] px-3 py-3 text-[12px] font-bold text-[#7d6d5f]">
            로그인 상태를 확인하는 중입니다.
          </p>
        ) : isAuthenticated ? (
          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-3 gap-2" aria-label="요리 결과">
              {COOKING_OUTCOMES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setOutcome(item.id)}
                  aria-pressed={outcome === item.id}
                  className={`min-h-11 rounded-xl px-2 text-[11px] font-black ${outcome === item.id ? "bg-[#ea5a1f] text-white" : "bg-[#fffaf3] text-[#7d6d5f]"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="grid gap-1 text-[11px] font-black text-[#7d6d5f]">
                맛
                <select value={taste} onChange={(event) => setTaste(event.target.value as CookingTaste)} className="min-h-11 rounded-xl border border-[#eadcc9] bg-[#fffaf3] px-2 text-[12px] font-bold text-[#4b3929]">
                  {COOKING_TASTES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-[11px] font-black text-[#7d6d5f]">
                다시 만들기
                <select value={remakeIntent} onChange={(event) => setRemakeIntent(event.target.value as CookingRemakeIntent)} className="min-h-11 rounded-xl border border-[#eadcc9] bg-[#fffaf3] px-2 text-[12px] font-bold text-[#4b3929]">
                  {COOKING_REMAKE_INTENTS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-[11px] font-black text-[#7d6d5f]">
                실제 소요시간(분)
                <input type="number" min={1} max={1440} value={actualDurationMinutes} onChange={(event) => setActualDurationMinutes(event.target.value)} className="min-h-11 rounded-xl border border-[#eadcc9] bg-[#fffaf3] px-3 text-[12px] font-bold text-[#4b3929]" />
              </label>
            </div>
            <input value={substitutionNotes} onChange={(event) => setSubstitutionNotes(event.target.value.slice(0, 300))} placeholder="대체한 재료 (선택)" className="min-h-11 w-full rounded-xl border border-[#eadcc9] bg-[#fffaf3] px-3 text-sm font-semibold text-[#4b3929]" />
            <input value={familyReaction} onChange={(event) => setFamilyReaction(event.target.value.slice(0, 300))} placeholder="가족 반응 (선택)" className="min-h-11 w-full rounded-xl border border-[#eadcc9] bg-[#fffaf3] px-3 text-sm font-semibold text-[#4b3929]" />
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value.slice(0, MAX_COMMENT_LENGTH))}
              placeholder="예: 안내대로 익히니 성공했고 다음에는 간장을 조금 줄이려고 해요."
              className="min-h-24 w-full resize-none rounded-[13px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-3 text-sm font-semibold leading-6 text-[#4b3929] outline-none focus:border-[#ea5a1f]"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold text-[#8f7f70]">{content.length}/{MAX_COMMENT_LENGTH}</span>
              <button
                type="button"
                onClick={submitComment}
                disabled={submitting || content.trim().length === 0}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#ea5a1f] px-4 text-[12px] font-black text-white disabled:bg-[#e6b49a]"
              >
                {submitting ? "접수 중..." : "후기 검수 요청"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-[14px] border border-[#eadcc9] bg-[#fffaf3] px-4 py-4">
            <p className="text-sm font-black text-[#4b3929]">로그인하면 댓글을 남길 수 있어요.</p>
            <Link
              href="/login"
              className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full bg-[#ea5a1f] px-4 text-[12px] font-black text-white"
            >
              로그인하기
            </Link>
          </div>
        )}

        {errorMessage ? (
          <p className="mt-3 rounded-[12px] bg-[#fff0e4] px-4 py-3 text-sm font-bold text-[#d94d19]" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-4 space-y-2">
          {loading ? (
            <p className="rounded-[12px] bg-[#fffaf3] px-3 py-3 text-[12px] font-bold text-[#7d6d5f]">
              댓글을 불러오는 중입니다.
            </p>
          ) : comments.length === 0 ? (
            <p className="rounded-[12px] bg-[#fffaf3] px-3 py-3 text-[12px] font-bold text-[#7d6d5f]">
              아직 승인된 후기가 없습니다. 실제 요리 후기를 검수 요청해 보세요.
            </p>
          ) : (
            comments.map((comment) => {
              const mine = user?.id && comment.userId === user.id;
              return (
                <article key={comment.id} className="rounded-[13px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[12px] font-black text-[#4b3929]">{comment.authorName || "집밥러"}</p>
                      <p className="mt-0.5 text-[10px] font-bold text-[#a69585]">{formatCommentDate(comment.createdAt)}</p>
                    </div>
                    {mine ? (
                      <button
                        type="button"
                        onClick={() => {
                          void deleteComment(comment.id);
                        }}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#b5a493] hover:bg-[#fff0e4] hover:text-[#d94d19]"
                        aria-label="내 댓글 삭제"
                      >
                        <Trash2 size={13} />
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-2 whitespace-pre-line text-[13px] font-semibold leading-6 text-[#4b3929]">
                    {comment.content}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1 text-[10px] font-black text-[#8a5a2a]">
                    {comment.outcome ? <span className="rounded-full bg-[#fff0e4] px-2 py-1">{COOKING_OUTCOMES.find((item) => item.id === comment.outcome)?.label}</span> : null}
                    {comment.actualDurationMinutes ? <span className="rounded-full bg-[#fff0e4] px-2 py-1">실제 {comment.actualDurationMinutes}분</span> : null}
                    {comment.remakeIntent ? <span className="rounded-full bg-[#fff0e4] px-2 py-1">{COOKING_REMAKE_INTENTS.find((item) => item.id === comment.remakeIntent)?.label}</span> : null}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
      </section>
      {confirmationDialog}
    </>
  );
}
