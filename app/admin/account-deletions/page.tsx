"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { getSupabaseClient } from "@/lib/supabase";

type DeletionRequestRecord = {
  id: string;
  user_id: string | null;
  email: string | null;
  reason: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

const STATUS_OPTIONS = [
  { key: "requested", label: "요청됨" },
  { key: "reviewing", label: "검토 중" },
  { key: "completed", label: "처리 완료" },
  { key: "rejected", label: "반려" },
] as const;

export default function AdminAccountDeletionsPage() {
  const { isAuthenticated, loading } = useAuth();
  const [records, setRecords] = useState<DeletionRequestRecord[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const groupedStatuses = useMemo(() => {
    return Object.fromEntries(
      STATUS_OPTIONS.map((status) => [
        status.key,
        records.filter((item) => item.status === status.key),
      ]),
    ) as Record<string, DeletionRequestRecord[]>;
  }, [records]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const run = async () => {
      try {
        const client = getSupabaseClient();
        const { data } = await client.auth.getSession();
        const accessToken = data.session?.access_token;

        if (!accessToken) {
          setError("운영자 세션 토큰을 찾지 못했습니다.");
          return;
        }

        const response = await fetch("/api/account-deletion-requests", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const payload = (await response.json()) as {
          message?: string;
          requests?: DeletionRequestRecord[];
        };

        if (!response.ok) {
          throw new Error(payload.message ?? "요청 목록을 불러오지 못했습니다.");
        }

        setRecords(payload.requests ?? []);
        setError(null);
      } catch {
        setError("계정 삭제 요청 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      }
    };

    void run();
  }, [isAuthenticated]);

  const updateStatus = async (
    record: DeletionRequestRecord,
    status: string,
    options?: { destructive?: boolean },
  ) => {
    if (options?.destructive) {
      if (!record.user_id) {
        setError("이미 삭제되었거나 대상 사용자 ID가 없는 요청입니다.");
        return;
      }

      const confirmed = window.confirm(
        `${record.email ?? record.user_id} 계정과 연결 데이터를 삭제합니다. 이 작업은 되돌릴 수 없습니다.`,
      );

      if (!confirmed) {
        return;
      }
    }

    const id = record.id;
    setWorkingId(id);
    setMessage(null);
    setError(null);

    try {
      const client = getSupabaseClient();
      const { data } = await client.auth.getSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        throw new Error("운영자 세션 토큰을 찾지 못했습니다.");
      }

      const response = await fetch(`/api/account-deletion-requests/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(
          options?.destructive
            ? { action: "delete-account", confirmUserId: record.user_id, status }
            : { status },
        ),
      });
      const payload = (await response.json()) as {
        message?: string;
        request?: DeletionRequestRecord;
      };

      if (!response.ok || !payload.request) {
        throw new Error(payload.message ?? "상태를 저장하지 못했습니다.");
      }

      setRecords((prev) =>
        prev.map((item) => (item.id === payload.request?.id ? payload.request : item)),
      );
      setMessage(options?.destructive ? "계정 삭제를 완료했습니다." : "상태를 업데이트했습니다.");
    } catch {
      setError("상태를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="flex flex-col pb-8">
      <section className="px-5 pt-4">
        <p className="text-xs font-semibold tracking-[0.16em] text-gray-400">ADMIN</p>
        <h1 className="text-2xl font-bold text-gray-800">계정 삭제 요청함</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          운영자가 앱 안에서 삭제 요청 상태를 관리하는 화면입니다.
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

        {STATUS_OPTIONS.map((status) => (
          <article key={status.key} className="rounded-3xl bg-white px-4 py-4 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-800">{status.label}</h2>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">
                {groupedStatuses[status.key]?.length ?? 0}건
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {(groupedStatuses[status.key] ?? []).length === 0 ? (
                <p className="text-sm text-gray-400">해당 상태의 요청이 없습니다.</p>
              ) : (
                groupedStatuses[status.key].map((record) => (
                  <div key={record.id} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4">
                    <p className="text-sm font-bold text-gray-800">{record.email ?? record.user_id}</p>
                    <p className="mt-1 text-xs text-gray-400">{record.created_at}</p>
                    <p className="mt-3 text-sm leading-6 text-gray-600">
                      {record.reason?.trim() ? record.reason : "사유 미입력"}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {STATUS_OPTIONS.map((option) => (
                        option.key === "completed" ? null : (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => {
                              void updateStatus(record, option.key);
                            }}
                            disabled={workingId === record.id || record.status === option.key}
                            className={`rounded-full px-3 py-2 text-xs font-semibold ${
                              record.status === option.key
                                ? "bg-mint-100 text-mint-600"
                                : "bg-white text-gray-600 ring-1 ring-gray-200"
                            } disabled:opacity-50`}
                          >
                            {option.label}
                          </button>
                        )
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          void updateStatus(record, "completed", { destructive: true });
                        }}
                        disabled={workingId === record.id || record.status === "completed" || !record.user_id}
                        className="rounded-full bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-600 disabled:opacity-50"
                      >
                        계정 삭제 실행
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
