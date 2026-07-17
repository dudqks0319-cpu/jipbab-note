// 이 화면은 검수 가능한 초보 조리 가이드 목록을 공개합니다.
import type { Metadata } from "next";
import Link from "next/link";

import { getCookingGuides } from "@/lib/cooking-guides";

export const metadata: Metadata = {
  title: "초보 집밥 조리 가이드",
  description: "계량, 불 조절, 냉장고 중심 식단 계획을 초보자 눈높이로 확인하세요.",
  alternates: { canonical: "/guides" },
};

export default function CookingGuidesPage() {
  return (
    <div className="min-h-full bg-[#fbf6ee] px-5 pb-24 pt-8">
      <p className="text-xs font-black tracking-[0.16em] text-[#78a95f]">COOKING GUIDE</p>
      <h1 className="mt-2 text-3xl font-black text-[#2f2117]">초보 집밥 가이드</h1>
      <div className="mt-6 space-y-3">
        {getCookingGuides().map((guide) => (
          <Link key={guide.slug} href={`/guides/${guide.slug}`} className="block rounded-3xl bg-white px-5 py-5 shadow-soft">
            <h2 className="text-lg font-black text-[#2f2117]">{guide.title}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#7d6d5f]">{guide.summary}</p>
            <span className="mt-3 inline-block text-sm font-black text-[#5b8f49]">읽어보기 →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
