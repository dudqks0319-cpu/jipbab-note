// 이 파일은 집밥노트 이용약관과 커뮤니티 운영 기준을 안내합니다.
import Link from "next/link";

const terms = [
  {
    title: "서비스 목적",
    body: "집밥노트는 사용자가 보유한 재료를 관리하고, 현재 재료로 만들 수 있는 집밥 메뉴를 추천하는 보조 도구입니다.",
  },
  {
    title: "레시피와 상품 정보",
    body: "레시피, 재료, 바코드 상품 정보는 외부 데이터와 사용자 입력을 바탕으로 제공되며 실제 조리 가능 여부와 상품 정보는 사용자가 최종 확인해야 합니다.",
  },
  {
    title: "사용자 콘텐츠",
    body: "커뮤니티가 활성화된 경우 불법, 혐오, 음란, 개인정보 노출, 광고성 콘텐츠를 게시할 수 없습니다. 운영자는 안전을 위해 콘텐츠를 숨기거나 삭제할 수 있습니다.",
  },
  {
    title: "계정과 데이터",
    body: "사용자는 마이페이지에서 로그아웃하거나 계정 삭제를 요청할 수 있습니다. 계정 삭제 시 계정과 연결된 데이터는 복구할 수 없습니다.",
  },
  {
    title: "책임 제한",
    body: "집밥노트는 식품 안전, 알레르기, 영양, 구매 결정에 대한 전문 자문을 대체하지 않습니다. 민감한 식단이나 건강 상태는 전문가와 확인해 주세요.",
  },
];

export default function TermsPage() {
  return (
    <div className="flex flex-col px-5 pb-6 pt-4">
      <section className="rounded-3xl bg-white p-5 shadow-soft">
        <p className="text-xs font-semibold tracking-[0.16em] text-mint-500">TERMS</p>
        <h2 className="mt-2 text-xl font-bold text-gray-800">이용약관</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          아래 내용은 TestFlight와 App Store 제출 전 사용자에게 고지할 기본 약관 초안입니다.
          운영 주체와 문의처는 배포 전 확정 정보로 교체해야 합니다.
        </p>
      </section>

      <section className="mt-4 space-y-3">
        {terms.map((item) => (
          <article key={item.title} className="rounded-3xl bg-white p-5 shadow-soft">
            <h3 className="text-base font-bold text-gray-800">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.body}</p>
          </article>
        ))}
      </section>

      <Link href="/support" className="mt-4 rounded-2xl bg-mint-100 px-4 py-3 text-center text-sm font-bold text-mint-500">
        문의하기
      </Link>
    </div>
  );
}
