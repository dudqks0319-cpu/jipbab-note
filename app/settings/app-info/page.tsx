import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, CircleCheck, Clock3, Code2, Database, Layers3, ShieldCheck } from 'lucide-react'

import { buildReleaseInfo, type ReleaseEnvironment } from '@/lib/release-info'

export const metadata: Metadata = {
  title: '앱 정보 | 집밥노트',
}

const environmentLabels: Record<ReleaseEnvironment, string> = {
  local: '로컬',
  development: '개발',
  preview: '미리보기',
  production: '운영',
}

function formatBuildTime(value: string | null): string {
  if (!value) {
    return '확인할 수 없음'
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul',
  }).format(new Date(value))
}

export default function AppInfoPage() {
  const release = buildReleaseInfo()
  const deploymentSha = release.deploymentSha === 'unknown'
    ? '확인할 수 없음'
    : release.deploymentSha

  return (
    <div className="min-h-full bg-[#fbf6ee] pb-8">
      <section className="mobile-safe-top px-5">
        <div className="grid grid-cols-[44px_1fr_44px] items-center">
          <Link
            href="/settings"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#eadcc9] bg-[#fffaf3] text-[#2f2117] transition-colors duration-200 hover:bg-[#f8eadc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea5a1f]"
            aria-label="설정으로 돌아가기"
          >
            <ChevronLeft size={18} />
          </Link>
          <h1 className="text-center text-[16px] font-black text-[#2f2117]">앱 정보</h1>
          <span />
        </div>
      </section>

      <main className="px-5 pt-4" id="main-content">
        <section className="jipbab-panel rounded-[22px] px-5 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#fff0e4] text-[#d94d19]">
            <ShieldCheck size={22} aria-hidden="true" />
          </div>
          <p className="mt-4 text-[12px] font-black text-[#d94d19]">현재 실행 중인 집밥노트</p>
          <h2 className="mt-1 text-[22px] font-black leading-8 text-[#2f2117]">
            배포본을 직접 확인할 수 있어요
          </h2>
          <p className="mt-2 text-[15px] font-semibold leading-6 text-[#6f5b49]">
            오류를 문의할 때 배포 SHA를 함께 알려주면 같은 버전을 빠르게 찾을 수 있어요.
          </p>
        </section>

        <section className="jipbab-panel mt-4 overflow-hidden rounded-[18px]">
          <dl className="divide-y divide-[#eadcc9]">
            <ReleaseRow icon={CircleCheck} label="앱 버전" value={release.appVersion} />
            <ReleaseRow
              icon={Layers3}
              label="배포 환경"
              value={environmentLabels[release.deploymentEnvironment]}
            />
            <ReleaseRow icon={Code2} label="배포 SHA" value={deploymentSha} code />
            <ReleaseRow icon={Clock3} label="빌드 시각" value={formatBuildTime(release.buildTime)} />
            <ReleaseRow
              icon={Database}
              label="앱 요구 레시피 스키마"
              value={release.recipeSchemaVersion}
            />
            <ReleaseRow
              icon={Database}
              label="포함된 최신 DB 변경"
              value={release.includedMigrationVersion}
              code
            />
            <ReleaseRow
              icon={Layers3}
              label="레시피 콘텐츠 기준"
              value={release.recipeContentVersion}
              code
            />
          </dl>
        </section>

        <section className="mt-4 rounded-[18px] border border-[#f1caa9] bg-[#fff7ed] px-4 py-4">
          <h2 className="text-[14px] font-black text-[#7b3f17]">버전 정보의 의미</h2>
          <p className="mt-2 text-[13px] font-semibold leading-6 text-[#7d5a3b]">
            이 화면은 앱 코드에 포함된 버전을 보여줍니다. DB 변경의 운영 적용, 레시피 사람 검수,
            실제 조리 승인이 끝났다는 뜻은 아니에요.
          </p>
          <p className="mt-2 text-[13px] font-semibold leading-6 text-[#7d5a3b]">
            계정, 이메일, 냉장고 재료 같은 사용자 정보는 이 화면에 포함하지 않습니다.
          </p>
        </section>

        <Link
          href="/privacy"
          className="mt-4 flex min-h-11 w-full items-center justify-center rounded-[14px] border border-[#eadcc9] bg-[#fffaf3] px-4 text-[14px] font-black text-[#4b3929] transition-colors duration-200 hover:bg-[#f8eadc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea5a1f]"
        >
          개인정보 처리방침 보기
        </Link>
      </main>
    </div>
  )
}

function ReleaseRow({
  icon: Icon,
  label,
  value,
  code = false,
}: {
  icon: typeof CircleCheck
  label: string
  value: string
  code?: boolean
}) {
  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 px-4 py-3.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#fff0e4] text-[#d94d19]">
        <Icon size={16} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-[12px] font-black text-[#8f7f70]">{label}</dt>
        <dd className={`mt-1 break-all text-[14px] font-black leading-6 text-[#2f2117] ${code ? 'font-mono text-[12px]' : ''}`}>
          {value}
        </dd>
      </div>
    </div>
  )
}
