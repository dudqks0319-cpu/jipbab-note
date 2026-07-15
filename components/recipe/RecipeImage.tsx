// 이 컴포넌트는 로컬 레시피 이미지를 최적화하고 실패해도 같은 크기의 대체 상태를 유지합니다.
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const RECIPE_IMAGE_BLUR_DATA_URL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAO7n3f///yH5BAEAAAEALAAAAAABAAEAAAIBRAA7";

type RecipeImageProps = {
  src: string | null;
  alt: string;
  fallbackSrc?: string;
  className: string;
  imageClassName: string;
  sizes: string;
  caption?: string | null;
  preload?: boolean;
  fallbackLabel?: string;
};

export default function RecipeImage({
  src,
  alt,
  fallbackSrc,
  className,
  imageClassName,
  sizes,
  caption,
  preload = false,
  fallbackLabel = "이미지를 불러오지 못했어요",
}: RecipeImageProps) {
  const initialSrc = src || fallbackSrc || "";
  const [currentSrc, setCurrentSrc] = useState(initialSrc);
  const [failed, setFailed] = useState(!initialSrc);

  useEffect(() => {
    const nextSrc = src || fallbackSrc || "";
    setCurrentSrc(nextSrc);
    setFailed(!nextSrc);
  }, [fallbackSrc, src]);

  const handleError = () => {
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      return;
    }
    setFailed(true);
  };

  if (failed) {
    return (
      <div className={`relative ${className}`} role="img" aria-label={`${alt}: ${fallbackLabel}`}>
        <span className="absolute inset-0 grid place-items-center bg-[#f2eee8] px-3 text-center text-[12px] font-bold text-[#6b5f55]">
          {fallbackLabel}
        </span>
      </div>
    );
  }

  const isLocalAsset = currentSrc.startsWith("/") && !currentSrc.startsWith("//");
  const isVectorAsset = /\.svg(?:$|\?)/i.test(currentSrc);

  return (
    <div className={`relative ${className}`}>
      {isLocalAsset ? (
        <Image
          src={currentSrc}
          alt={alt}
          fill
          sizes={sizes}
          preload={preload}
          loading={preload ? undefined : "lazy"}
          placeholder={isVectorAsset ? "empty" : "blur"}
          blurDataURL={isVectorAsset ? undefined : RECIPE_IMAGE_BLUR_DATA_URL}
          unoptimized={isVectorAsset}
          onError={handleError}
          className={imageClassName}
        />
      ) : (
        // 외부 사용자 이미지 URL은 도메인을 임의 허용하지 않고 원본 로딩으로 제한합니다.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentSrc}
          alt={alt}
          loading={preload ? "eager" : "lazy"}
          fetchPriority={preload ? "high" : "auto"}
          decoding="async"
          onError={handleError}
          className={imageClassName}
        />
      )}
      {caption ? (
        <p className="absolute bottom-2 left-3 right-3 rounded-full bg-[#2f2117]/72 px-3 py-1 text-[11px] font-bold text-white">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
