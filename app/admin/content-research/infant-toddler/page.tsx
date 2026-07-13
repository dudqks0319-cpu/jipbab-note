// 이 화면은 서버 전용 플래그를 켠 비운영 환경에서만 조사 후보를 검토합니다.
import { notFound } from "next/navigation";

import { INFANT_TODDLER_RESEARCH_RECIPES } from "@/lib/infant-toddler-recipes";

export default function InfantToddlerContentResearchPage() {
  const enabled = process.env.CHILD_MEAL_RESEARCH_ADMIN_ENABLED === "true";
  if (!enabled || process.env.NODE_ENV === "production") notFound();

  return (
    <main className="min-h-screen bg-[#fbf6ee] px-5 py-8 text-[#2f2117]">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#a14a28]">Internal research only</p>
        <h1 className="mt-2 text-3xl font-black">이유식·유아식 내부 조사</h1>
        <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#6f5f51]">
          일반 사용자에게 공개되지 않는 조사 후보입니다. 월령만으로 제공 여부를 판단하지 않으며 실제 조리,
          의료·영양·연하·식품안전·권리 검수 전에는 레시피로 승격할 수 없습니다.
        </p>

        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#eadcc9] bg-white p-4">
            <dt className="text-xs font-bold text-[#7d6d5f]">조사 후보</dt>
            <dd className="mt-1 text-2xl font-black">{INFANT_TODDLER_RESEARCH_RECIPES.length}</dd>
          </div>
          <div className="rounded-2xl border border-[#eadcc9] bg-white p-4">
            <dt className="text-xs font-bold text-[#7d6d5f]">전문가 검수</dt>
            <dd className="mt-1 text-2xl font-black">0 / 24</dd>
          </div>
          <div className="rounded-2xl border border-[#eadcc9] bg-white p-4">
            <dt className="text-xs font-bold text-[#7d6d5f]">공개 승인</dt>
            <dd className="mt-1 text-2xl font-black">0 / 24</dd>
          </div>
        </dl>

        <section className="mt-6 space-y-3" aria-label="아동식 조사 후보">
          {INFANT_TODDLER_RESEARCH_RECIPES.map((recipe) => (
            <article key={recipe.id} className="rounded-2xl border border-[#eadcc9] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-[#a14a28]">공개 금지 · recipe v{recipe.schemaVersion}</p>
                  <h2 className="mt-1 text-lg font-black">{recipe.name}</h2>
                </div>
                <span className="rounded-full bg-[#fff0e4] px-3 py-2 text-xs font-black text-[#a14a28]">
                  {recipe.childGuidance.minimumAgeMonths}개월 조사값
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl bg-[#fffaf3] p-3">
                  <h3 className="text-sm font-black">자료 상태</h3>
                  <p className="mt-2 text-xs font-semibold leading-5 text-[#6f5f51]">
                    {recipe.source.name} · 요약만 허용 · 권리 검수 필요
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[#6f5f51]">
                    {recipe.childGuidance.textureLevel}
                  </p>
                </div>
                <div className="rounded-xl bg-[#fff8e8] p-3">
                  <h3 className="text-sm font-black">안전 차단</h3>
                  <ul className="mt-2 space-y-1 text-xs font-semibold leading-5 text-[#7b5a31]">
                    {recipe.childGuidance.chokingHazards.map((hazard) => <li key={hazard}>• {hazard}</li>)}
                    <li>• 의료 검수: 미완료</li>
                    <li>• 실제 조리: 미완료</li>
                  </ul>
                </div>
              </div>

              <details className="mt-3 rounded-xl border border-[#eadcc9] px-3 py-2">
                <summary className="min-h-11 cursor-pointer py-3 text-sm font-black">조사 재료·흐름 보기</summary>
                <div className="border-t border-[#eadcc9] py-3 text-xs font-semibold leading-5 text-[#6f5f51]">
                  <ul>{recipe.ingredientDetails.map((item) => <li key={item.display}>• {item.display}</li>)}</ul>
                  <ol className="mt-3">{recipe.steps.map((step) => <li key={step.order}>{step.order}. {step.action}</li>)}</ol>
                </div>
              </details>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
