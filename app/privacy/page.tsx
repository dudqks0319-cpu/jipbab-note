// 이 파일은 App Store 제출과 사용자 신뢰를 위한 개인정보 처리방침 화면입니다.
import Link from "next/link";

const dataItems = [
  "냉장고 재료명, 카테고리, 보관 방식, 수량, 유통기한, 메모",
  "로그인 시 Supabase OAuth 식별자와 이메일 등 계정 기본 정보",
  "즐겨찾기, 조리 완료, 가족 냉장고 공유 등 앱 사용 데이터",
  "커뮤니티가 활성화된 경우 게시글, 댓글, 좋아요, 첨부 이미지",
  "바코드 조회 코드와 외부 API 조회 결과",
  "익명 사용자를 구분하기 위한 기기별 임시 ID",
];

const thirdParties = [
  "Supabase: 로그인, 데이터 저장, 동기화",
  "Vercel: 웹앱 호스팅과 서버 API 실행",
  "Kakao SDK: 사용자가 선택한 공유 기능",
  "식품의약품안전처 OpenAPI: 레시피/재료 추천 데이터",
  "Open Food Facts: 바코드 상품 정보 조회",
  "외부 쇼핑 링크: 사용자가 선택한 재료 검색 이동",
];

export default function PrivacyPage() {
  return (
    <div className="flex flex-col px-5 pb-6 pt-4">
      <section className="rounded-3xl bg-white p-5 shadow-soft">
        <p className="text-xs font-semibold tracking-[0.16em] text-mint-500">PRIVACY</p>
        <h2 className="mt-2 text-xl font-bold text-gray-800">개인정보 처리방침</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          집밥노트는 냉장고 재료 기반 추천과 데이터 동기화를 제공하기 위해 필요한 정보만 처리합니다.
          정식 배포 전 운영 주체, 문의처, 보관 기간은 App Store Connect 정보와 동일하게 확정해야 합니다.
        </p>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-soft">
        <h3 className="text-base font-bold text-gray-800">처리하는 정보</h3>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-gray-600">
          {dataItems.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-soft">
        <h3 className="text-base font-bold text-gray-800">이용 목적</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          재료 관리, 유통기한 확인, 보유 재료 기반 레시피 추천, 부족 재료 장보기 연결,
          로그인 계정 동기화, 서비스 안정성 개선과 문의 대응을 위해 사용합니다.
        </p>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-soft">
        <h3 className="text-base font-bold text-gray-800">제3자 서비스</h3>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-gray-600">
          {thirdParties.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-soft">
        <h3 className="text-base font-bold text-gray-800">보관과 삭제</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          로그인 사용자는 마이페이지의 계정 삭제에서 계정과 계정 기반 데이터를 삭제할 수 있습니다.
          비로그인 로컬 데이터는 사용자의 브라우저/기기 저장소에 보관되며 앱 데이터 삭제로 초기화할 수 있습니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/mypage" className="inline-flex rounded-2xl bg-mint-100 px-4 py-2 text-sm font-bold text-mint-500">
            마이페이지에서 관리하기
          </Link>
          <Link href="/account/delete" className="inline-flex rounded-2xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-600">
            삭제 안내 보기
          </Link>
        </div>
      </section>
    </div>
  );
}
