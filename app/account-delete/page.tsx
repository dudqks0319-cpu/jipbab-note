"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { getDeviceId } from "@/lib/device-id";
import { getSupportEmail, getSupportMailtoUrl } from "@/lib/external-links";
import { clearSupabaseAuthStorage, getSupabaseClient } from "@/lib/supabase";
import { clearAccountLinkedLocalData } from "@/lib/account-local-data";

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
const DELETE_CONFIRMATION_TEXT = "삭제";
const DIRECT_DELETE_CONFIRMATION = "DELETE_MY_ACCOUNT";

export default function AccountDeletePage() {
  const supportEmail = getSupportEmail();
  const mailtoUrl = getSupportMailtoUrl("집밥노트 계정 삭제 문의");
  const { user, isAuthenticated, loading } = useAuth();
  const deviceId = useMemo(() => getDeviceId(), []);
  const confirmInputRef = useRef<HTMLInputElement>(null);
  const [confirmText, setConfirmText] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [requests, setRequests] = useState<DeletionRequestRecord[]>([]);

  const refreshRequests = async () => {
    if (!user) {
      setRequests([]);
      return;
    }

    try {
      const client = getSupabaseClient();
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

  const handleDelete = async () => {
    const isConfirmed = confirmText.trim() === DELETE_CONFIRMATION_TEXT;

    if (!user) {
      setErrorMessage("로그인 후에 계정을 삭제할 수 있습니다.");
      return;
    }

    if (!isConfirmed) {
      setErrorMessage("확인 문구를 입력해야 계정을 삭제할 수 있습니다.");
      confirmInputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const client = getSupabaseClient();
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (sessionError || !accessToken) {
        throw new Error("Auth session was not available for account deletion.");
      }

      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmation: DIRECT_DELETE_CONFIRMATION,
        }),
      });

      if (!response.ok) {
        throw new Error("Account deletion API did not accept the request.");
      }

      let localCleanupFailed = false;
      try {
        await clearAccountLinkedLocalData();
      } catch {
        localCleanupFailed = true;
      }
      await client.auth.signOut({ scope: "local" }).catch(() => undefined);
      clearSupabaseAuthStorage();

      setDeleted(true);
      setStatusMessage(localCleanupFailed
        ? "계정은 삭제되었지만 기기 데이터 일부를 지우지 못했습니다. 앱 저장공간을 삭제해 주세요."
        : "계정과 이 기기의 냉장고·장보기·식단·조리 기록이 삭제되었습니다. 복구할 수 없습니다.");
      setConfirmText("");
      setRequests([]);
    } catch {
      setErrorMessage("계정을 삭제하지 못했습니다. 잠시 후 다시 시도하거나 고객센터로 문의해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const isDeleteConfirmationReady = confirmText.trim() === DELETE_CONFIRMATION_TEXT;

  return (
    <div className="flex flex-col pb-8">
      <section className="px-5 pt-4">
        <p className="text-xs font-semibold tracking-[0.16em] text-gray-400">ACCOUNT DELETE</p>
        <h1 className="text-2xl font-bold text-gray-800">계정 삭제</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          앱 안에서 계정 삭제를 바로 완료할 수 있습니다. 삭제 후에는 로그인 계정과 연동 데이터를 복구할 수 없습니다.
        </p>
      </section>

      <section className="mt-4 space-y-4 px-5">
        <article className="rounded-3xl bg-white px-4 py-4 shadow-soft">
          <h2 className="text-base font-bold text-gray-800">삭제되는 항목</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-7 text-gray-600">
            <li>로그인 계정 정보</li>
            <li>냉장고 재료, 장보기 목록, 즐겨찾기, 주간 식단</li>
            <li>기기에 저장된 조리 진행 기록과 가족 보드</li>
            <li>계정에 연결된 커뮤니티 작성 데이터</li>
          </ul>
        </article>

        <article className="rounded-3xl bg-white px-4 py-4 shadow-soft">
          <h2 className="text-base font-bold text-gray-800">삭제 방법</h2>
          <p className="mt-2 text-sm leading-7 text-gray-600">
            로그인 상태에서 확인 문구를 입력하면 계정, 냉장고, 장보기, 즐겨찾기, 커뮤니티 연결 데이터가 바로 삭제됩니다. 처리 이력은 최소 감사 목적으로만 남깁니다.
          </p>

          {deleted ? (
            <p className="mt-4 rounded-2xl bg-mint-50 px-4 py-3 text-sm text-mint-600">
              계정 삭제가 완료되었습니다.
            </p>
          ) : loading ? (
            <p className="mt-4 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
              로그인 상태를 확인하는 중입니다.
            </p>
          ) : isAuthenticated ? (
            <div className="mt-4 space-y-3">
              <label htmlFor="account-delete-confirm" className="block text-sm font-semibold text-gray-700">
                확인 문구
              </label>
              <input
                id="account-delete-confirm"
                ref={confirmInputRef}
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                placeholder="확인 문구를 직접 입력"
                autoComplete="off"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-rose-300"
              />
              <p className="text-xs leading-5 text-gray-500">
                입력칸에 “삭제”를 직접 입력하면 버튼이 활성화됩니다.
              </p>
              <button
                type="button"
                onClick={() => {
                  void handleDelete();
                }}
                disabled={submitting}
                className={`inline-flex rounded-full px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  isDeleteConfirmationReady ? "bg-rose-600 text-white" : "bg-rose-100 text-rose-600"
                }`}
              >
                {submitting ? "삭제 중..." : "계정 바로 삭제"}
              </button>
            </div>
          ) : (
            <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
              로그인 후에 앱 안에서 계정을 삭제할 수 있습니다.
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
