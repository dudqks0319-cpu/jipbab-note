// 이 화면은 개별 초보 조리 가이드를 구조화 데이터와 함께 공개합니다.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getCookingGuide, getCookingGuides } from "@/lib/cooking-guides";

type GuidePageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getCookingGuides().map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const guide = getCookingGuide((await params).slug);
  if (!guide) return { title: "가이드를 찾을 수 없습니다", robots: { index: false, follow: false } };
  return {
    title: guide.title,
    description: guide.summary,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: { title: `${guide.title} | 집밥노트`, description: guide.summary, url: `/guides/${guide.slug}`, type: "article" },
  };
}

export default async function CookingGuidePage({ params }: GuidePageProps) {
  const guide = getCookingGuide((await params).slug);
  if (!guide) notFound();
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.summary,
    author: { "@type": "Organization", name: "집밥노트" },
  }).replace(/</g, "\\u003c");
  return (
    <article className="min-h-full bg-[#fbf6ee] px-5 pb-24 pt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
      <Link href="/guides" className="inline-flex min-h-11 items-center text-sm font-black text-[#5b8f49]">← 가이드 목록</Link>
      <h1 className="mt-4 break-keep text-3xl font-black leading-tight text-[#2f2117]">{guide.title}</h1>
      <p className="mt-4 text-base font-semibold leading-7 text-[#7d6d5f]">{guide.summary}</p>
      <div className="mt-7 space-y-4">
        {guide.sections.map((section) => (
          <section key={section.heading} className="rounded-3xl bg-white px-5 py-5 shadow-soft">
            <h2 className="text-xl font-black text-[#2f2117]">{section.heading}</h2>
            <div className="mt-3 space-y-3">{section.paragraphs.map((paragraph) => <p key={paragraph} className="break-keep text-sm font-semibold leading-7 text-[#5d554d]">{paragraph}</p>)}</div>
          </section>
        ))}
      </div>
      <Link href="/recipe" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-[#ea5a1f] px-5 text-sm font-black text-white">검수 레시피 보러 가기</Link>
    </article>
  );
}
