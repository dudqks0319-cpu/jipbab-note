// 이 화면은 운영자가 구조화 요리 후기를 승인·숨김·반려하는 검수함입니다.
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { COOKING_OUTCOMES, COOKING_REMAKE_INTENTS } from "@/lib/recipe-cooking-session";
import { getSupabaseClient } from "@/lib/supabase";

type ReviewStatus = "pending" | "visible" | "hidden" | "rejected";
type ReviewRecord = {
  id: string;
  recipe_id: string;
  author_name: string;
  content: string;
  status: ReviewStatus;
  outcome: "success" | "partial" | "failed" | null;
  taste: string | null;
  remake_intent: "yes" | "maybe" | "no" | null;
  actual_duration_minutes: number | null;
  substitution_notes: string | null;
  family_reaction: string | null;
  moderation_note: string | null;
  created_at: string;
};

const STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: "검수 대기",
  visible: "공개",
  hidden: "숨김",
  rejected: "반려",
};

export default function AdminRecipeReviewsPage() {
  const { isAuthenticated, loading } = useAuth();
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [activeStatus, setActiveStatus] = useState<ReviewStatus | "all">("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadReviews = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const { data } = await getSupabaseClient().auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("missing_admin_session");
      const response = await fetch("/api/v1/admin/recipe-reviews", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json() as { reviews?: ReviewRecord[] };
      if (!response.ok) throw new Error("review_list_failed");
      const records = payload.reviews ?? [];
      setReviews(records);
      setNotes(Object.fromEntries(records.map((review) => [review.id, review.moderation_note ?? ""])));
      setError("");
    } catch {
      setError("후기 검수 목록을 불러오지 못했습니다. 운영자 권한과 서버 설정을 확인해 주세요.");
    }
  }, [isAuthenticated]);

  useEffect(() => { void loadReviews(); }, [loadReviews]);

  const visibleReviews = useMemo(
    () => activeStatus === "all" ? reviews : reviews.filter((review) => review.status === activeStatus),
    [activeStatus, reviews],
  );

  const moderate = async (review: ReviewRecord, status: "visible" | "hidden" | "rejected") => {
    const note = notes[review.id]?.trim() ?? "";
    if (status !== "visible" && note.length < 3) {
      setError("숨김 또는 반려에는 3자 이상의 검수 메모가 필요합니다.");
      return;
    }
    setWorkingId(review.id);
    setError("");
    setMessage("");
    try {
      const { data } = await getSupabaseClient().auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("missing_admin_session");
      const response = await fetch(`/api/v1/admin/recipe-reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, note: note || null }),
      });
      if (!response.ok) throw new Error("review_moderation_failed");
      setMessage(`${STATUS_LABELS[status]} 상태와 감사 이력을 저장했습니다.`);
      await loadReviews();
    } catch {
      setError("후기 검수 상태를 저장하지 못했습니다. 상태 충돌과 운영 로그를 확인해 주세요.");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="flex flex-col pb-8">
      <section className="px-5 pt-4">
        <p className="text-xs font-semibold tracking-[0.16em] text-gray-400">ADMIN</p>
        <h1 className="text-2xl font-bold text-gray-800">요리 후기 검수함</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          사진 없이 구조화된 후기만 검수합니다. 승인한 후기만 레시피 상세에 공개됩니다.
        </p>
      </section>

      <section className="mt-4 space-y-4 px-5">
        {loading ? <p className="rounded-3xl bg-white px-4 py-4 text-sm text-gray-500 shadow-soft">로그인 상태를 확인하는 중입니다.</p> : null}
        {message ? <p className="rounded-3xl bg-mint-50 px-4 py-4 text-sm text-mint-600 shadow-soft">{message}</p> : null}
        {error ? <p className="rounded-3xl bg-rose-50 px-4 py-4 text-sm text-rose-600 shadow-soft">{error}</p> : null}

        <div className="flex flex-wrap gap-2 rounded-3xl bg-white px-4 py-4 shadow-soft">
          {(["pending", "visible", "hidden", "rejected", "all"] as const).map((status) => (
            <button key={status} type="button" onClick={() => setActiveStatus(status)} className={`min-h-11 rounded-full px-3 text-xs font-semibold ${activeStatus === status ? "bg-mint-100 text-mint-600" : "bg-gray-100 text-gray-600"}`}>
              {status === "all" ? "전체" : STATUS_LABELS[status]}
            </button>
          ))}
        </div>

        {visibleReviews.length === 0 && !loading ? <p className="rounded-3xl bg-white px-4 py-8 text-center text-sm text-gray-400 shadow-soft">표시할 후기가 없습니다.</p> : null}
        {visibleReviews.map((review) => (
          <article key={review.id} className="rounded-3xl bg-white px-4 py-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-gray-800">{review.author_name}</p>
                <p className="mt-1 text-xs text-gray-400">{new Date(review.created_at).toLocaleString("ko-KR")}</p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">{STATUS_LABELS[review.status]}</span>
            </div>
            <p className="mt-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-700">{review.content}</p>
            <div className="mt-2 flex flex-wrap gap-1 text-xs font-semibold text-gray-600">
              {review.outcome ? <span>{COOKING_OUTCOMES.find((item) => item.id === review.outcome)?.label}</span> : null}
              {review.actual_duration_minutes ? <span>· 실제 {review.actual_duration_minutes}분</span> : null}
              {review.remake_intent ? <span>· {COOKING_REMAKE_INTENTS.find((item) => item.id === review.remake_intent)?.label}</span> : null}
            </div>
            {review.substitution_notes ? <p className="mt-2 text-xs text-gray-600">대체 재료: {review.substitution_notes}</p> : null}
            {review.family_reaction ? <p className="mt-1 text-xs text-gray-600">가족 반응: {review.family_reaction}</p> : null}
            <Link href={`/recipe/${review.recipe_id}`} className="mt-3 inline-flex min-h-11 items-center text-xs font-bold text-mint-600">레시피 확인</Link>
            <textarea value={notes[review.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [review.id]: event.target.value.slice(0, 1000) }))} rows={2} className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700" placeholder="숨김·반려 사유 또는 승인 메모" />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => void moderate(review, "visible")} disabled={workingId === review.id || review.status === "visible"} className="min-h-11 rounded-full bg-mint-100 px-3 text-xs font-semibold text-mint-700 disabled:opacity-50">공개 승인</button>
              <button type="button" onClick={() => void moderate(review, "hidden")} disabled={workingId === review.id || review.status === "hidden"} className="min-h-11 rounded-full bg-gray-100 px-3 text-xs font-semibold text-gray-600 disabled:opacity-50">숨김</button>
              <button type="button" onClick={() => void moderate(review, "rejected")} disabled={workingId === review.id || review.status === "rejected"} className="min-h-11 rounded-full bg-rose-100 px-3 text-xs font-semibold text-rose-600 disabled:opacity-50">반려</button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
