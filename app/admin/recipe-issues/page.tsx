// 이 화면은 운영자가 비공개 레시피 오류 신고를 검토하고 검증된 레시피 버전에 연결합니다.
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import {
  RECIPE_ISSUE_STATUSES,
  RECIPE_ISSUE_TYPES,
  type RecipeIssueStatus,
} from "@/lib/recipe-issue-report";
import { getSupabaseClient } from "@/lib/supabase";

type RecipeReference = { title: string; version: number };
type RecipeIssueRecord = {
  id: string;
  recipe_id: string;
  issue_type: string;
  details: string;
  status: RecipeIssueStatus;
  resolution_note: string | null;
  resolution_recipe_version_id: string | null;
  triaged_by: string | null;
  triaged_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  recipes: RecipeReference | RecipeReference[] | null;
};

const STATUS_LABELS: Record<RecipeIssueStatus, string> = {
  open: "접수",
  triaged: "검토 중",
  resolved: "해결",
  rejected: "반려",
};

function recipeReference(record: RecipeIssueRecord): RecipeReference | null {
  return Array.isArray(record.recipes) ? record.recipes[0] ?? null : record.recipes;
}

function allowedNextStatuses(status: RecipeIssueStatus): RecipeIssueStatus[] {
  if (status === "open") return ["triaged", "rejected"];
  if (status === "triaged") return ["open", "resolved", "rejected"];
  return ["triaged"];
}

export default function AdminRecipeIssuesPage() {
  const { isAuthenticated, loading } = useAuth();
  const [records, setRecords] = useState<RecipeIssueRecord[]>([]);
  const [activeStatus, setActiveStatus] = useState<RecipeIssueStatus | "all">("all");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [versionIds, setVersionIds] = useState<Record<string, string>>({});
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadRecords = useCallback(async () => {
    if (!isAuthenticated) return;
    setError("");
    try {
      const client = getSupabaseClient();
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("missing_admin_session");
      const response = await fetch("/api/v1/admin/recipe-issue-reports", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json() as {
        message?: string;
        reports?: RecipeIssueRecord[];
      };
      if (!response.ok) throw new Error(payload.message ?? "admin_list_failed");
      const nextRecords = payload.reports ?? [];
      setRecords(nextRecords);
      setNotes(Object.fromEntries(nextRecords.map((item) => [item.id, item.resolution_note ?? ""])));
      setVersionIds(Object.fromEntries(nextRecords.map((item) => [item.id, item.resolution_recipe_version_id ?? ""])));
    } catch {
      setError("오류 신고 목록을 불러오지 못했습니다. 운영자 권한과 서버 설정을 확인해 주세요.");
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const counts = useMemo(
    () => Object.fromEntries(RECIPE_ISSUE_STATUSES.map((status) => [
      status,
      records.filter((record) => record.status === status).length,
    ])) as Record<RecipeIssueStatus, number>,
    [records],
  );
  const visibleRecords = useMemo(
    () => activeStatus === "all"
      ? records
      : records.filter((record) => record.status === activeStatus),
    [activeStatus, records],
  );

  const updateStatus = async (record: RecipeIssueRecord, status: RecipeIssueStatus) => {
    const note = notes[record.id]?.trim() ?? "";
    const versionId = versionIds[record.id]?.trim() ?? "";
    if (status === "resolved" && (note.length < 3 || !versionId)) {
      setError("해결 처리에는 3자 이상의 해결 메모와 해당 레시피의 버전 ID가 필요합니다.");
      return;
    }

    setWorkingId(record.id);
    setMessage("");
    setError("");
    try {
      const client = getSupabaseClient();
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("missing_admin_session");
      const response = await fetch(`/api/v1/admin/recipe-issue-reports/${record.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          resolutionNote: note || null,
          resolutionRecipeVersionId: versionId || null,
        }),
      });
      const payload = await response.json() as {
        message?: string;
        report?: RecipeIssueRecord;
      };
      if (!response.ok || !payload.report) {
        throw new Error(payload.message ?? "admin_update_failed");
      }
      setMessage(`${STATUS_LABELS[status]} 상태로 변경하고 감사 이력을 저장했습니다.`);
      await loadRecords();
    } catch {
      setError("상태를 저장하지 못했습니다. 상태 충돌, 레시피 버전 ID, 운영 로그를 확인해 주세요.");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="flex flex-col pb-8">
      <section className="px-5 pt-4">
        <p className="text-xs font-semibold tracking-[0.16em] text-gray-400">ADMIN</p>
        <h1 className="text-2xl font-bold text-gray-800">레시피 오류 신고함</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          신고를 검토하고 실제 레시피 버전과 연결합니다. 이 화면은 레시피 본문을 자동 수정하지 않습니다.
        </p>
      </section>

      <section className="mt-4 space-y-4 px-5">
        {loading ? (
          <div className="rounded-3xl bg-white px-4 py-4 text-sm text-gray-500 shadow-soft">
            로그인 상태를 확인하는 중입니다.
          </div>
        ) : null}
        {message ? (
          <div className="rounded-3xl bg-mint-50 px-4 py-4 text-sm text-mint-600 shadow-soft">{message}</div>
        ) : null}
        {error ? (
          <div className="rounded-3xl bg-rose-50 px-4 py-4 text-sm text-rose-600 shadow-soft">{error}</div>
        ) : null}

        <div className="flex flex-wrap gap-2 rounded-3xl bg-white px-4 py-4 shadow-soft">
          <button
            type="button"
            onClick={() => setActiveStatus("all")}
            className={`rounded-full px-3 py-2 text-xs font-semibold ${activeStatus === "all" ? "bg-mint-100 text-mint-600" : "bg-gray-100 text-gray-600"}`}
          >
            전체 {records.length}
          </button>
          {RECIPE_ISSUE_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setActiveStatus(status)}
              className={`rounded-full px-3 py-2 text-xs font-semibold ${activeStatus === status ? "bg-mint-100 text-mint-600" : "bg-gray-100 text-gray-600"}`}
            >
              {STATUS_LABELS[status]} {counts[status]}
            </button>
          ))}
        </div>

        {visibleRecords.length === 0 && !loading ? (
          <div className="rounded-3xl bg-white px-4 py-8 text-center text-sm text-gray-400 shadow-soft">
            표시할 오류 신고가 없습니다.
          </div>
        ) : null}

        {visibleRecords.map((record) => {
          const recipe = recipeReference(record);
          const issueLabel = RECIPE_ISSUE_TYPES.find((item) => item.id === record.issue_type)?.label ?? record.issue_type;
          return (
            <article key={record.id} className="rounded-3xl bg-white px-4 py-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-rose-500">{issueLabel}</p>
                  <h2 className="mt-1 truncate text-base font-bold text-gray-800">{recipe?.title ?? record.recipe_id}</h2>
                  <p className="mt-1 text-xs text-gray-400">
                    현재 레시피 v{recipe?.version ?? "?"} · {new Date(record.created_at).toLocaleString("ko-KR")}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                  {STATUS_LABELS[record.status]}
                </span>
              </div>
              <p className="mt-4 rounded-2xl bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-700">{record.details}</p>
              <Link href={`/recipe/${record.recipe_id}`} className="mt-3 inline-block text-xs font-bold text-mint-600">
                공개 레시피 확인
              </Link>

              <label className="mt-4 block text-xs font-bold text-gray-600" htmlFor={`note-${record.id}`}>
                처리 메모
              </label>
              <textarea
                id={`note-${record.id}`}
                value={notes[record.id] ?? ""}
                onChange={(event) => setNotes((current) => ({ ...current, [record.id]: event.target.value }))}
                maxLength={2000}
                rows={3}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700 outline-none focus:border-mint-400"
                placeholder="검토 근거와 처리 내용을 남겨주세요."
              />
              <label className="mt-3 block text-xs font-bold text-gray-600" htmlFor={`version-${record.id}`}>
                해결 레시피 버전 ID
              </label>
              <input
                id={`version-${record.id}`}
                value={versionIds[record.id] ?? ""}
                onChange={(event) => setVersionIds((current) => ({ ...current, [record.id]: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700 outline-none focus:border-mint-400"
                placeholder="해결 처리 시 필수 UUID"
              />

              <div className="mt-4 flex flex-wrap gap-2">
                {allowedNextStatuses(record.status).map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={workingId === record.id}
                    onClick={() => void updateStatus(record, status)}
                    className={`rounded-full px-3 py-2 text-xs font-semibold disabled:opacity-50 ${status === "resolved" ? "bg-mint-100 text-mint-700" : status === "rejected" ? "bg-rose-100 text-rose-600" : "bg-gray-100 text-gray-600"}`}
                  >
                    {STATUS_LABELS[status]}로 변경
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
