// 이 파일은 알림 토글과 개인정보/지원 링크를 관리하는 설정 화면입니다.
"use client";

import Link from "next/link";
import { Bell, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";

import { useAppSettings } from "@/hooks/useAppSettings";
import { getSupportEmail, getSupportMailtoUrl } from "@/lib/external-links";

const SETTINGS_ITEMS: Array<{
  key: "expiryAlerts" | "shoppingReminders" | "recipeDiscoveryTips";
  title: string;
  description: string;
}> = [
  {
    key: "expiryAlerts",
    title: "유통기한 임박 알림",
    description: "냉장고에 3일 이하 남은 재료가 있을 때 먼저 확인할 수 있게 도와줍니다.",
  },
  {
    key: "shoppingReminders",
    title: "장보기 리마인드",
    description: "장보기 미완료 항목이 남아 있을 때 다시 확인하기 쉽도록 유지합니다.",
  },
  {
    key: "recipeDiscoveryTips",
    title: "레시피 탐색 팁",
    description: "유튜브/블로그 등 외부 레시피 탐색 동선을 추천 형태로 노출합니다.",
  },
];

export default function SettingsPage() {
  const { settings, enabledCount, toggleSetting, resetSettings } = useAppSettings();
  const supportEmail = getSupportEmail();
  const supportMailto = getSupportMailtoUrl("집밥노트 문의");

  return (
    <div className="flex flex-col pb-6">
      <section className="px-5 pt-4">
        <p className="text-xs font-semibold tracking-[0.16em] text-gray-400">SETTINGS</p>
        <h2 className="text-2xl font-bold text-gray-800">⚙️ 앱 설정</h2>
        <p className="mt-1 text-sm text-gray-500">배포 전 꼭 확인해야 하는 사용자 설정과 운영 링크를 한 곳에 모았습니다.</p>
      </section>

      <section id="notifications" className="mt-4 px-5">
        <div className="rounded-3xl bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-mint-500" />
              <h3 className="text-lg font-bold text-gray-800">알림 설정</h3>
            </div>
            <button
              type="button"
              onClick={resetSettings}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-500"
            >
              <RefreshCw size={12} />
              기본값 복원
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">현재 {enabledCount}개의 보조 기능이 켜져 있습니다.</p>

          <div className="mt-4 space-y-3">
            {SETTINGS_ITEMS.map((item) => {
              const enabled = settings[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleSetting(item.key)}
                  className="flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 text-left"
                >
                  <div className="pr-3">
                    <p className="text-sm font-bold text-gray-800">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">{item.description}</p>
                  </div>
                  <span
                    className={`inline-flex min-w-16 justify-center rounded-full px-3 py-1.5 text-xs font-bold ${
                      enabled ? "bg-mint-100 text-mint-600" : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {enabled ? "켜짐" : "꺼짐"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-4 px-5">
        <div className="rounded-3xl bg-white p-4 shadow-soft">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-violet-500" />
            <h3 className="text-lg font-bold text-gray-800">개인정보와 지원</h3>
          </div>

          <div className="mt-4 space-y-3">
            <Link href="/privacy" className="block rounded-2xl bg-gray-50 px-4 py-4">
              <p className="text-sm font-bold text-gray-800">개인정보 처리방침</p>
              <p className="mt-1 text-xs text-gray-500">앱에서 처리하는 데이터와 보관 기간, 권리 행사 방법을 확인합니다.</p>
            </Link>

            <Link href="/support" className="block rounded-2xl bg-gray-50 px-4 py-4">
              <p className="text-sm font-bold text-gray-800">문의/삭제 요청</p>
              <p className="mt-1 text-xs text-gray-500">문의 채널과 데이터 정정/삭제 요청 방법을 안내합니다.</p>
            </Link>

            <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-4">
              <p className="text-sm font-bold text-gray-800">운영 연락처</p>
              <p className="mt-1 text-xs text-gray-500">
                {supportEmail ? supportEmail : "배포 전 NEXT_PUBLIC_SUPPORT_EMAIL 값을 설정해 운영 이메일을 연결하세요."}
              </p>
              {supportMailto ? (
                <a
                  href={supportMailto}
                  className="mt-3 inline-flex rounded-full bg-mint-100 px-3 py-2 text-xs font-bold text-mint-600"
                >
                  메일 보내기
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 px-5">
        <div className="rounded-3xl bg-white p-4 shadow-soft">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-peach-500" />
            <h3 className="text-lg font-bold text-gray-800">배포 체크</h3>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            <li>• Supabase URL, 익명 키, OAuth 리디렉트 URL 설정</li>
            <li>• 쿠팡 파트너스 개별 링크 연결</li>
            <li>• 개인정보 처리방침 URL/App Store Privacy 정보 등록</li>
            <li>• iOS/Android 실기기 로그인 및 장바구니 이동 QA</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
