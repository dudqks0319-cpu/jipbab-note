// 이 컴포넌트는 레시피 이미지 로딩 실패 시 클라이언트에서 fallback/숨김 처리를 담당합니다.
"use client";

import { useState } from "react";

type RecipeImageProps = {
  src: string | null;
  alt: string;
  fallbackSrc?: string;
  className: string;
  imageClassName: string;
  caption?: string | null;
};

export default function RecipeImage({
  src,
  alt,
  fallbackSrc,
  className,
  imageClassName,
  caption,
}: RecipeImageProps) {
  const initialSrc = src || fallbackSrc || "";
  const [currentSrc, setCurrentSrc] = useState(initialSrc);
  const [hidden, setHidden] = useState(!initialSrc);

  if (hidden) {
    return null;
  }

  return (
    <div className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={currentSrc}
        alt={alt}
        onError={() => {
          if (fallbackSrc && currentSrc !== fallbackSrc) {
            setCurrentSrc(fallbackSrc);
            return;
          }
          setHidden(true);
        }}
        className={imageClassName}
      />
      {caption ? (
        <p className="absolute bottom-2 left-3 right-3 rounded-full bg-[#2f2117]/72 px-3 py-1 text-[11px] font-bold text-white">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
