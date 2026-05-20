// 이 파일은 앱 내 계정 삭제 요청 시작 화면을 제공합니다.
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { getDeviceId } from "@/lib/device-id";
import { getSupportEmail, getSupportMailtoUrl } from "@/lib/external-links";
import { getSupabaseClient } from "@/lib/supabase";

type DeletionRequestRecord = {
  id: string;
  status: string;
  reason: string | null;
  created_at: string;
  updated_at: string;
};

const statusLabels: Record<string, string> = {
  requested: "요청됨",
  reviewing: "검토 중",
  completed: "삭제 완료",
  rejected: "반려",
};

export default function AccountDeletePage() {
  const supportEmail = getSupportEmail();
  const mailtoUrl = getSupportMailtoUrl("집밥노트 계정 삭제 요청");
  const { user, isAuthenticated, loading } = useAuth();
  const deviceId = useMemo(() => getDeviceId(), []);
  const [reason, setReason] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<DeletionRequestRecord[]>([]);

  const refreshRequests = async () => {
    if (!user) {
      setRequests([]);
      return;
    }

    try {
      const client = getSupabaseClient({ deviceId });
      const { data } = await client
        .from("account_deletion_requests")
        .select("id,status,reason,created_at,updated_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setRequests(Array.isArray(data) ? data as DeletionRequestRecord[] : []);
    } catch {
      setRequests([]);
    }
  };

  useEffect(() => {
    void refreshRequests();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, deviceId]);

  const handleSubmit = async () => {
    if (!user) {
      setErrorMessage("로그인 후에 계정 삭제 요청을 보낼 수 있습니다.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const client = getSupabaseClient({ deviceId });
      const { error } = await client.from("account_deletion_requests").insert({
        user_id: user.id,
        email: user.email ?? null,
        reason: reason.trim() || null,
      });

      if (error) {
        throw error;
      }

      setStatusMessage("계정 삭제 요청이 접수되었습니다. 운영자가 완료 처리하면 계정과 연동 데이터가 실제 삭제됩니다.");
      setReason("");
      await refreshRequests();
    } catch (error) {
      const message = error instanceof Error ? error.message : "계정 삭제 요청을 접수하지 못했습니다.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col pb-8">
      <section className="px-5 pt-4">
        <p className="text-xs font-semibold tracking-[0.16em] text-gray-400">ACCOUNT DELETE</p>
        <h1 className="text-2xl font-bold text-gray-800">계정 삭제 요청</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          앱 안에서 계정 삭제를 시작하고 처리 상태를 확인할 수 있습니다. 완료 처리 시 로그인 계정과 연동 데이터를 실제 삭제합니다.
        </p>
      </section>

      <section className="mt-4 space-y-4 px-5">
        <article className="rounded-3xl bg-white px-4 py-4 shadow-soft">
          <h2 className="text-base font-bold text-gray-800">삭제되는 항목</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-7 text-gray-600">
            <li>로그인 계정 정보</li>
            <li>냉장고 재료, 장보기 목록, 즐겨찾기</li>
            <li>계정에 연결된 커뮤니티 작성 데이터</li>
          </ul>
        </article>

        <article className="rounded-3xl bg-white px-4 py-4 shadow-soft">
          <h2 className="text-base font-bold text-gray-800">요청 방법</h2>
          <p className="mt-2 text-sm leading-7 text-gray-600">
            로그인 상태라면 앱 안에서 삭제 요청을 바로 접수할 수 있습니다. 운영자가 완료 처리할 때 계정, 냉장고, 장보기, 즐겨찾기, 커뮤니티 연결 데이터를 삭제하고 처리 이력만 최소 감사 목적으로 남깁니다.
          </p>

          {loading ? (
            <p className="mt-4 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
              로그인 상태를 확인하는 중입니다.
            </p>
          ) : isAuthenticated ? (
            <div className="mt-4 space-y-3">
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="삭제 사유나 참고할 내용을 적어주세요. 비워도 요청은 가능합니다."
                className="min-h-28 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-rose-300"
              />
              <button
                type="button"
                onClick={() => {
                  void handleSubmit();
                }}
                disabled={submitting}
                className="inline-flex rounded-full bg-rose-100 px-4 py-2 text-sm font-bold text-rose-600 disabled:opacity-50"
              >
                {submitting ? "접수 중..." : "앱에서 삭제 요청 접수"}
              </button>
            </div>
          ) : (
            <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
              로그인 후에 앱 안에서 계정 삭제 요청을 접수할 수 있습니다.
            </p>
          )}

          {statusMessage ? (
            <p className="mt-3 rounded-2xl bg-mint-50 px-4 py-3 text-sm text-mint-600">{statusMessage}</p>
          ) : null}

          {errorMessage ? (
            <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{errorMessage}</p>
          ) : null}

          {supportEmail ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700">
                {supportEmail}
              </span>
              {mailtoUrl ? (
                <a
                  href={mailtoUrl}
                  className="inline-flex rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600"
                >
                  메일로도 요청 가능
                </a>
              ) : null}
            </div>
          ) : null}
        </article>

        {requests.length > 0 ? (
          <article className="rounded-3xl bg-white px-4 py-4 shadow-soft">
            <h2 className="text-base font-bold text-gray-800">내 요청 처리 상태</h2>
            <div className="mt-3 space-y-2">
              {requests.map((request) => (
                <div key={request.id} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-gray-800">
                      {statusLabels[request.status] ?? request.status}
                    </p>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-500">
                      {new Date(request.updated_at).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    {request.status === "completed"
                      ? "삭제 완료 상태입니다. 로그인 계정과 연동 데이터는 복구할 수 없습니다."
                      : "요청이 열린 동안 같은 계정으로 중복 요청은 만들지 않습니다."}
                  </p>
                </div>
              ))}
            </div>
          </article>
        ) : null}
      </section>

      <div className="px-5 pt-5">
        <Link href="/mypage" className="inline-flex rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600">
          마이페이지로 돌아가기
        </Link>
      </div>
    </div>
  );
}
