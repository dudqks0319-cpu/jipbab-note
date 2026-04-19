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
    <section className="mt-6 px-5">
      <div className="rounded-3xl bg-white p-4 shadow-soft">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lavender-100 text-violet-500">
            <SearchCode size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">더 다양한 레시피 탐색</h2>
            <p className="mt-1 text-sm text-gray-500">
              같은 메뉴를 영상과 블로그로도 찾아보며 재료 대체 아이디어를 확인하세요.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {links.map((item, index) => (
            <a
              key={item.key}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className={`rounded-2xl border px-4 py-4 transition hover:-translate-y-0.5 hover:shadow-soft ${
                index === 0
                  ? "border-rose-100 bg-rose-50"
                  : "border-lavender-100 bg-lavender-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {index === 0 ? (
                    <PlayCircle size={16} className="text-rose-500" />
                  ) : (
                    <ExternalLink size={16} className="text-violet-500" />
                  )}
                  <span className="text-sm font-bold text-gray-800">{item.label}</span>
                </div>
                <ExternalLink size={14} className="text-gray-400" />
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-600">{item.description}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
