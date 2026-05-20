// 이 파일은 앱스토어 제출용 이용약관 페이지를 제공합니다.
import Link from "next/link";

const effectiveDate = "2026년 5월 8일";

export default function TermsPage() {
  return (
    <div className="flex flex-col pb-8">
      <section className="px-5 pt-4">
        <p className="text-xs font-semibold tracking-[0.16em] text-gray-400">TERMS</p>
        <h1 className="text-2xl font-bold text-gray-800">이용약관</h1>
        <p className="mt-2 text-sm text-gray-500">시행일: {effectiveDate}</p>
      </section>

      <section className="mt-4 space-y-4 px-5 text-sm leading-7 text-gray-700">
        <TermsCard title="1. 서비스 목적">
          집밥노트는 사용자가 입력한 냉장고 재료를 바탕으로 레시피 탐색, 장보기 목록 관리,
          유통기한 확인을 돕는 생활 편의 서비스입니다.
        </TermsCard>

        <TermsCard title="2. 정보의 한계">
          레시피, 유통기한, 보관 방법, 알림은 참고용 정보입니다. 실제 식품 상태, 알레르기,
          건강 상태, 제품 표시사항은 사용자가 최종 확인해야 합니다.
        </TermsCard>

        <TermsCard title="3. 계정과 데이터">
          사용자는 본인의 계정과 데이터를 정확하게 관리해야 합니다. 계정 삭제가 완료되면 계정과
          연결 데이터는 복구할 수 없으며, 보안 및 분쟁 대응에 필요한 최소 처리 이력은 개인정보
          처리방침에 고지한 기간 동안 보관될 수 있습니다.
        </TermsCard>

        <TermsCard title="4. 외부 링크와 제휴 링크">
          앱은 외부 쇼핑/레시피 링크를 제공할 수 있으며, 일부 구매 링크는 제휴 링크입니다.
          외부 사이트의 상품, 가격, 배송, 결제, 환불은 해당 사이트의 정책을 따릅니다.
        </TermsCard>

        <TermsCard title="5. 금지 행위">
          타인의 계정 또는 데이터를 침해하는 행위, 서비스 보안을 우회하는 행위, 자동화된 대량
          요청으로 서비스 운영을 방해하는 행위, 타인의 저작권이나 상표권을 침해하는 콘텐츠
          저장 행위는 허용되지 않습니다.
        </TermsCard>

        <TermsCard title="6. 서비스 변경과 중단">
          운영상 필요하거나 보안, 법령, 외부 서비스 변경에 따라 일부 기능이 변경되거나 중단될 수
          있습니다. 중요한 변경은 앱 또는 공지 가능한 채널을 통해 안내합니다.
        </TermsCard>
      </section>

      <div className="px-5 pt-5">
        <Link href="/settings" className="inline-flex rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600">
          설정으로 돌아가기
        </Link>
      </div>
    </div>
  );
}

function TermsCard({
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
