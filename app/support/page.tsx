// 이 파일은 문의 접수와 데이터 삭제/정정 요청 안내를 제공합니다.
import { getSupportEmail, getSupportMailtoUrl } from "@/lib/external-links";

export default function SupportPage() {
  const supportEmail = getSupportEmail();
  const mailtoUrl = getSupportMailtoUrl("집밥노트 문의");

  return (
    <div className="flex flex-col pb-8">
      <section className="px-5 pt-4">
        <p className="text-xs font-semibold tracking-[0.16em] text-gray-400">SUPPORT</p>
        <h1 className="text-2xl font-bold text-gray-800">문의 / 데이터 요청</h1>
        <p className="mt-2 text-sm text-gray-500">서비스 문의, 개인정보 정정/삭제 요청, 쿠팡 파트너스 링크 수정 요청을 여기에서 안내합니다.</p>
      </section>

      <section className="mt-4 space-y-4 px-5">
        <article className="rounded-3xl bg-white px-4 py-4 shadow-soft">
          <h2 className="text-base font-bold text-gray-800">1. 일반 문의</h2>
          <p className="mt-2 text-sm leading-7 text-gray-600">
            로그인 오류, 레시피 노출 문제, 장바구니 이동 오류, 쿠팡 링크 수정 요청 등은 운영 채널을 통해 접수할 수 있습니다.
          </p>
          {supportEmail ? (
            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-800">{supportEmail}</p>
              {mailtoUrl ? (
                <a
                  href={mailtoUrl}
                  className="mt-3 inline-flex rounded-full bg-mint-100 px-4 py-2 text-sm font-bold text-mint-600"
                >
                  메일 보내기
                </a>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
              배포 전에는 NEXT_PUBLIC_SUPPORT_EMAIL 값을 설정해 실제 운영 이메일을 연결하세요.
            </p>
          )}
        </article>

        <article className="rounded-3xl bg-white px-4 py-4 shadow-soft">
          <h2 className="text-base font-bold text-gray-800">2. 데이터 정정 / 삭제 요청</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-7 text-gray-600">
            <li>요청 시 계정 이메일 또는 기기 식별 정보를 함께 알려주세요.</li>
            <li>삭제 요청 대상: 재료 목록, 장보기 목록, 즐겨찾기, 커뮤니티 데이터</li>
            <li>본인 확인 후 지체 없이 처리하며, 결과를 안내합니다.</li>
          </ul>
        </article>

        <article className="rounded-3xl bg-white px-4 py-4 shadow-soft">
          <h2 className="text-base font-bold text-gray-800">3. 운영 체크</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-7 text-gray-600">
            <li>문의용 이메일</li>
            <li>개인정보 처리방침 URL</li>
            <li>쿠팡 파트너스 실제 링크</li>
            <li>소셜 로그인 리디렉트 URL</li>
          </ul>
        </article>
      </section>
    </div>
  );
}
