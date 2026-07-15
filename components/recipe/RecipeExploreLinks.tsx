// 이 파일은 레시피 상세에서 유튜브/블로그 탐색 링크를 보여줍니다.
"use client";

import { ExternalLink, PlayCircle, SearchCode } from "lucide-react";

import { getRecipeExploreLinks } from "@/lib/external-links";

type RecipeExploreLinksProps = {
  recipeName: string;
};

export default function RecipeExploreLinks({ recipeName }: RecipeExploreLinksProps) {
  const links = getRecipeExploreLinks(recipeName);

  return (
    <section className="px-5 pt-5">
      <div className="jipbab-panel rounded-[16px] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#fff0e4] text-[#a63b13]">
            <SearchCode size={20} />
          </div>
          <div>
            <h2 className="text-[17px] font-black text-[#2f2117]">더 다양한 레시피 탐색</h2>
            <p className="mt-1 text-sm text-[#5f5145]">
              같은 메뉴를 영상과 블로그로도 찾아보며 재료 대체 아이디어를 확인하세요. 외부 페이지는 Safari에서 열립니다.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {links.map((item, index) => (
            <a
              key={item.key}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className={`rounded-[14px] border px-4 py-4 transition hover:-translate-y-0.5 hover:shadow-soft ${
                index === 0
                  ? "border-[#eadcc9] bg-[#fff7ed]"
                  : "border-[#eadcc9] bg-[#fffaf3]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {index === 0 ? (
                    <PlayCircle size={16} className="text-[#a63b13]" />
                  ) : (
                    <ExternalLink size={16} className="text-[#8a5a2a]" />
                  )}
                  <span className="text-sm font-black text-[#2f2117]">{item.label}</span>
                </div>
                <ExternalLink size={14} className="text-[#75675b]" />
              </div>
              <p className="mt-2 text-sm leading-6 text-[#5f5145]">{item.description}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
