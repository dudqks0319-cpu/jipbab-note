// 이 파일은 Google Play 데이터 삭제 URL로 사용할 수 있는 공개 안내 화면입니다.
import Link from "next/link";

const deletionItems = [
  "Supabase 로그인 계정과 계정 식별자",
  "계정에 연결된 냉장고 재료, 즐겨찾기, 가족 냉장고 정보",
  "커뮤니티가 활성화된 경우 계정에 연결된 게시글, 댓글, 좋아요",
  "앱 안에서 생성한 로컬 임시 데이터는 사용자의 기기 저장소 삭제로 초기화",
];

export default function AccountDeletePage() {
  return (
    <div className="flex flex-col px-5 pb-6 pt-4">
      <section className="rounded-3xl bg-white p-5 shadow-soft">
        <p className="text-xs font-semibold tracking-[0.16em] text-mint-500">DATA DELETION</p>
        <h2 className="mt-2 text-xl font-bold text-gray-800">계정 및 데이터 삭제</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          이 화면은 Google Play 데이터 삭제 URL로 사용할 수 있는 공개 안내입니다.
          로그인 사용자는 앱의 마이페이지에서 계정 삭제를 시작할 수 있습니다.
        </p>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-soft">
        <h3 className="text-base font-bold text-gray-800">삭제되는 데이터</h3>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-gray-600">
          {deletionItems.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-soft">
        <h3 className="text-base font-bold text-gray-800">앱에서 삭제하기</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          앱에 로그인한 뒤 마이페이지의 계정 삭제 영역에서 안내 문구를 확인하고 삭제를 확정해 주세요.
          삭제 후 계정 기반 데이터는 복구할 수 없습니다.
        </p>
        <Link href="/mypage" className="mt-3 inline-flex rounded-2xl bg-mint-100 px-4 py-2 text-sm font-bold text-mint-500">
          마이페이지로 이동
        </Link>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-soft">
        <h3 className="text-base font-bold text-gray-800">앱에 접근할 수 없는 경우</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          로그인 제공자 이메일, 삭제 요청 사유, 연락 가능한 이메일을 포함해 지원 채널로 요청해 주세요.
          운영 환경에서는 접수 후 본인 확인을 거쳐 계정과 관련 데이터를 삭제합니다.
        </p>
        <Link href="/support" className="mt-3 inline-flex rounded-2xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-600">
          지원/문의 보기
        </Link>
      </section>
    </div>
  );
}
