// 이 화면은 개별 재료의 기본 보관 정보와 검수 레시피 검색 링크를 제공합니다.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getIngredientCatalog, getIngredientCatalogItem } from "@/lib/ingredient-catalog";

type IngredientPageProps = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return getIngredientCatalog().map((item) => ({ id: item.id }));
}

export async function generateMetadata({ params }: IngredientPageProps): Promise<Metadata> {
  const item = getIngredientCatalogItem((await params).id);
  if (!item) return { title: "재료 정보를 찾을 수 없습니다", robots: { index: false, follow: false } };
  const description = `${item.name}의 기본 ${item.defaultStorageType} 보관 정보와 ${item.name}을 활용한 검수 레시피를 확인하세요.`;
  return {
    title: `${item.name} 보관법과 레시피`,
    description,
    alternates: { canonical: `/ingredients/${item.id}` },
    openGraph: { title: `${item.name} 보관법과 레시피 | 집밥노트`, description, url: `/ingredients/${item.id}` },
  };
}

export default async function IngredientLandingPage({ params }: IngredientPageProps) {
  const item = getIngredientCatalogItem((await params).id);
  if (!item) notFound();
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${item.name} 보관법과 레시피`,
    description: `${item.name}의 기본 보관 위치와 레시피 탐색 안내`,
  }).replace(/</g, "\\u003c");

  return (
    <article className="min-h-full bg-[#fbf6ee] px-5 pb-24 pt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
      <Link href="/ingredients" className="inline-flex min-h-11 items-center text-sm font-black text-[#5b8f49]">← 재료 목록</Link>
      <p className="mt-4 text-xs font-black text-[#78a95f]">{item.category}</p>
      <h1 className="mt-2 text-4xl font-black text-[#2f2117]">{item.name}</h1>
      <div className="mt-6 rounded-3xl bg-white px-5 py-5 shadow-soft">
        <h2 className="text-lg font-black text-[#2f2117]">기본 보관 정보</h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-[#f4fbef] px-4 py-3"><dt className="font-semibold text-[#6d8463]">권장 위치</dt><dd className="mt-1 font-black text-[#315f2d]">{item.defaultStorageType}</dd></div>
          <div className="rounded-2xl bg-[#fff7ed] px-4 py-3"><dt className="font-semibold text-[#98704f]">기본 단위</dt><dd className="mt-1 font-black text-[#8a4b20]">{item.defaultUnit}</dd></div>
        </dl>
        {item.aliases?.length ? <p className="mt-4 text-sm font-semibold leading-6 text-[#7d6d5f]">함께 검색되는 이름: {item.aliases.join(", ")}</p> : null}
      </div>
      <div className="mt-5 rounded-3xl bg-[#2f2117] px-5 py-5 text-white">
        <h2 className="text-xl font-black">{item.name}으로 무엇을 만들까요?</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-white/75">공개 기준을 통과한 레시피만 검색 결과에 표시됩니다.</p>
        <Link href={`/recipe?ingredient=${encodeURIComponent(item.name)}`} className="mt-4 inline-flex min-h-12 items-center rounded-full bg-[#ea5a1f] px-5 text-sm font-black text-white">{item.name} 레시피 찾기</Link>
      </div>
    </article>
  );
}
