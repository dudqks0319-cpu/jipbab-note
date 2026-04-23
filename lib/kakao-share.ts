// 이 파일은 카카오톡 공유 SDK가 있으면 카카오 공유를, 없으면 기본 공유를 실행합니다.
export type KakaoSharePayload = {
  title: string;
  description: string;
  imageUrl?: string | null;
  path?: string;
};

type KakaoShareApi = {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Share?: {
    sendDefault: (payload: unknown) => void;
  };
};

declare global {
  interface Window {
    Kakao?: KakaoShareApi;
  }
}

function resolveShareUrl(path: string | undefined): string {
  if (typeof window === "undefined") {
    return path ?? "/";
  }

  return new URL(path ?? window.location.pathname, window.location.origin).toString();
}

export async function shareToKakaoOrNative(payload: KakaoSharePayload): Promise<"kakao" | "native" | "clipboard"> {
  const shareUrl = resolveShareUrl(payload.path);
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY?.trim();

  if (typeof window !== "undefined" && window.Kakao?.Share && kakaoKey) {
    if (!window.Kakao.isInitialized()) {
      window.Kakao.init(kakaoKey);
    }

    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: payload.title,
        description: payload.description,
        imageUrl: payload.imageUrl || "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=900&q=80",
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
      buttons: [
        {
          title: "레시피 보기",
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
      ],
    });

    return "kakao";
  }

  if (typeof navigator !== "undefined" && navigator.share) {
    await navigator.share({
      title: payload.title,
      text: payload.description,
      url: shareUrl,
    });
    return "native";
  }

  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(shareUrl);
  }
  return "clipboard";
}

