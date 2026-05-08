// 이 파일은 앱스토어 제출용 개인정보 처리방침을 제공합니다.
import Link from "next/link";

import { getSupportEmail } from "@/lib/external-links";

const effectiveDate = "2026년 5월 8일";

export default function PrivacyPage() {
  const supportEmail = getSupportEmail();

  return (
    <div className="flex flex-col pb-8">
      <section className="px-5 pt-4">
        <p className="text-xs font-semibold tracking-[0.16em] text-gray-400">PRIVACY POLICY</p>
        <h1 className="text-2xl font-bold text-gray-800">개인정보 처리방침</h1>
        <p className="mt-2 text-sm text-gray-500">시행일: {effectiveDate}</p>
      </section>

      <section className="mt-4 space-y-4 px-5 text-sm leading-7 text-gray-700">
        <PolicyCard title="1. 처리 목적">
          집밥노트는 냉장고 재료 관리, 레시피 추천, 장보기 목록 관리, 유통기한 알림,
          로그인 기반 데이터 동기화, 고객 문의 대응을 위해 필요한 최소한의 개인정보를 처리합니다.
        </PolicyCard>

        <PolicyCard title="2. 처리 항목">
          <ul className="list-disc space-y-1 pl-5">
            <li>로그인 시: 이메일 주소, 닉네임, 프로필 이미지, 소셜 로그인 식별자</li>
            <li>서비스 이용 시: 재료명, 수량, 보관 위치, 유통기한, 소진 기록, 장보기 목록, 즐겨찾기, 기기 식별값</li>
            <li>알림 설정 시: 알림 대상 재료명, 유통기한, 예약 시각, 알림 수신 설정</li>
            <li>문의 및 계정 삭제 요청 시: 사용자가 직접 입력한 문의 내용, 회신 연락처, 삭제 요청 사유</li>
          </ul>
        </PolicyCard>

        <PolicyCard title="3. 보유 및 이용 기간">
          회원 정보와 서비스 데이터는 계정이 유지되는 동안 보관하며, 사용자가 삭제를 요청하거나
          서비스 운영 목적이 종료되면 지체 없이 파기합니다. 계정 삭제 완료 후 삭제 요청 처리 이력은
          보안, 오남용 방지, 분쟁 대응을 위해 식별자를 제거한 상태로 최대 6개월간 보관할 수 있습니다.
        </PolicyCard>

        <PolicyCard title="4. 제3자 제공 및 외부 서비스">
          집밥노트는 개인정보를 판매하거나 마케팅 목적의 제3자 제공을 하지 않습니다. 서비스 제공을
          위해 Supabase(인증/DB), Vercel(웹 호스팅), Kakao/Google/Apple(소셜 로그인), 식품안전나라
          OpenAPI(레시피 조회), 쿠팡 파트너스 또는 외부 쇼핑 사이트(구매 링크 이동)를 사용할 수 있습니다.
          외부 사이트로 이동한 뒤의 결제, 배송, 환불, 개인정보 처리는 해당 사이트 정책을 따릅니다.
        </PolicyCard>

        <PolicyCard title="5. 로컬 알림과 온디바이스 기능">
          유통기한 알림은 사용자가 동의한 경우 기기 로컬 알림으로 예약됩니다. 알림 예약을 위해 재료명,
          유통기한, 예약 시각이 기기와 앱 저장소에 보관될 수 있습니다. 온디바이스 AI/Gemma 테스트 기능은
          기본 출시 화면에서 숨겨져 있으며, 별도 기능 플래그를 켠 테스트 빌드에서만 노출됩니다.
        </PolicyCard>

        <PolicyCard title="6. 정보주체의 권리">
          사용자는 언제든지 본인 데이터의 열람, 정정, 삭제, 처리정지를 요청할 수 있습니다. 계정 삭제는
          앱 내 계정 삭제 요청 화면에서 접수할 수 있으며, 처리 완료 후 계정과 연동 데이터는 복구할 수 없습니다.
        </PolicyCard>

        <PolicyCard title="7. 파기 절차 및 방법">
          보유 기간이 끝나거나 처리 목적이 달성된 개인정보는 재생이 불가능한 방식으로 삭제합니다. 전자 파일은
          복구가 어렵도록 삭제하며, 출력물은 분쇄 또는 소각합니다. 삭제 요청 처리 이력에서 이메일, 사용자 ID,
          요청 사유 등 직접 식별 정보는 완료 처리 시 제거합니다.
        </PolicyCard>

        <PolicyCard title="8. 안전성 확보 조치">
          접근 권한 최소화, 인증 정보 분리 관리, HTTPS 기반 전송, 데이터베이스 접근 통제, RLS 기반 사용자별
          데이터 격리, 보안 헤더 적용 등 합리적인 보호 조치를 적용합니다.
        </PolicyCard>

        <PolicyCard title="9. 문의 및 권리 행사">
          {supportEmail ? (
            <p>운영 문의 및 권리 행사는 {supportEmail} 또는 앱 내 문의하기 메뉴를 통해 접수할 수 있습니다.</p>
          ) : (
            <p>운영 문의 및 권리 행사는 앱 내 문의하기 메뉴를 통해 접수할 수 있습니다. 배포 전 운영 이메일을 반드시 연결하세요.</p>
          )}
          <p className="mt-2">
            추가로 개인정보 침해에 대한 신고나 상담이 필요한 경우 개인정보보호위원회 및 개인정보 침해신고센터(국번없이 118)를 이용할 수 있습니다.
          </p>
        </PolicyCard>

        <div className="rounded-3xl border border-dashed border-gray-200 bg-white px-4 py-4 text-xs leading-6 text-gray-500 shadow-soft">
          이 문서는 개인정보보호위원회 개인정보 처리방침 작성지침(2026.4.)과 개인정보 포털의 법정 필수 항목 안내를 참고해
          현재 출시 후보 빌드의 실제 기능 기준으로 작성했습니다. 운영 환경의 수집 항목, 보관 기간, 외부 서비스 목록이 바뀌면 함께 갱신합니다.
        </div>
      </section>

      <div className="px-5 pt-5">
        <Link href="/settings" className="inline-flex rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600">
          설정으로 돌아가기
        </Link>
      </div>
    </div>
  );
}

function PolicyCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white px-4 py-4 shadow-soft">
      <h2 className="text-base font-bold text-gray-800">{title}</h2>
      <div className="mt-2 text-sm leading-7 text-gray-600">{children}</div>
    </section>
  );
}
