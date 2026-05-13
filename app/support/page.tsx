// 이 파일은 App Store 지원 URL로 사용할 수 있는 문의/도움말 화면입니다.
import Link from "next/link";

const qaItems = [
  {
    question: "바코드 스캔이 안 됩니다.",
    answer: "카메라 권한을 허용했는지 확인해 주세요. 기기나 브라우저가 바코드 인식을 지원하지 않으면 수동 입력으로 냉장고에 추가할 수 있습니다.",
  },
  {
    question: "레시피 추천이 기본 메뉴로만 나옵니다.",
    answer: "외부 레시피 API가 지연되거나 키가 설정되지 않은 경우에도 앱이 깨지지 않도록 기본 추천 메뉴를 먼저 보여드립니다.",
  },
  {
    question: "계정 데이터를 삭제하고 싶습니다.",
    answer: "마이페이지의 계정 삭제에서 삭제 요청을 시작할 수 있습니다. 삭제 후 계정 기반 데이터는 복구할 수 없습니다.",
  },
];

export default function SupportPage() {
  return (
    <div className="flex flex-col px-5 pb-6 pt-4">
      <section className="rounded-3xl bg-gradient-to-br from-mint-100 via-cream-100 to-lavender-100 p-5 shadow-soft">
        <p className="text-xs font-semibold tracking-[0.16em] text-mint-500/80">SUPPORT</p>
        <h2 className="mt-2 text-xl font-bold text-gray-800">지원/문의</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          집밥노트를 사용하다 막히는 부분이 있으면 아래 안내를 먼저 확인해 주세요.
          배포 전에는 App Store Connect의 지원 URL과 동일한 주소로 이 화면을 연결하면 됩니다.
        </p>
      </section>

      <section className="mt-4 space-y-3">
        {qaItems.map((item) => (
          <article key={item.question} className="rounded-3xl bg-white p-5 shadow-soft">
            <h3 className="text-base font-bold text-gray-800">{item.question}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.answer}</p>
          </article>
        ))}
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-soft">
        <h3 className="text-base font-bold text-gray-800">문의 채널</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          정식 배포 전 운영 이메일 또는 문의 폼 URL을 확정해 주세요. 현재 개발 단계에서는 GitHub 이슈로 문제를 남길 수 있습니다.
        </p>
        <a
          href="https://github.com/dudqks0319-cpu/jipbab-note/issues"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex rounded-2xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-600"
        >
          GitHub 이슈 열기
        </a>
      </section>

      <Link href="/privacy" className="mt-4 rounded-2xl bg-mint-100 px-4 py-3 text-center text-sm font-bold text-mint-500">
        개인정보 처리방침 보기
      </Link>
      <Link href="/account/delete" className="mt-3 rounded-2xl bg-gray-100 px-4 py-3 text-center text-sm font-bold text-gray-600">
        계정 및 데이터 삭제 안내
      </Link>
    </div>
  );
}
