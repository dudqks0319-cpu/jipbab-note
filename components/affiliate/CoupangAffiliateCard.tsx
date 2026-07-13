"use client";

import { ExternalLink } from "lucide-react";

import { isCoupangPartnerUrl } from "@/lib/partner-links";
import { trackProductAnalyticsEvent } from "@/lib/product-analytics";

type CoupangAffiliateCardProps = {
  productName: string;
  affiliateUrl: string;
  imageUrl?: string;
  reason?: string;
};

export default function CoupangAffiliateCard({
  productName,
  affiliateUrl,
  imageUrl,
  reason,
}: CoupangAffiliateCardProps) {
  if (!isCoupangPartnerUrl(affiliateUrl)) {
    return null;
  }

  return (
    <article className="rounded-[16px] border border-[#eadcc9] bg-[#fffaf3] p-4">
      <div className="flex gap-3">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={`${productName} 상품 이미지`}
            className="h-20 w-20 shrink-0 rounded-[14px] object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[14px] bg-[#f8eddf] text-xs font-bold text-[#9f9388]">
            상품
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="break-keep text-[13px] font-black leading-5 text-[#2f2117]">{productName}</p>
          {reason ? (
            <p className="mt-1 break-keep text-[12px] font-semibold leading-5 text-[#7d6d5f]">
              {reason}
            </p>
          ) : null}
          <a
            href={affiliateUrl}
            target="_blank"
            rel="sponsored noopener noreferrer"
            onClick={() => trackProductAnalyticsEvent("affiliate_link_clicked", { source: "recipe_missing_ingredient" })}
            className="mt-3 inline-flex min-h-11 items-center justify-center gap-1 rounded-[12px] bg-[#ea5a1f] px-4 text-[13px] font-black text-white"
          >
            <ExternalLink size={14} />
            쿠팡에서 보기
          </a>
        </div>
      </div>
      <p className="mt-3 break-keep text-[11px] font-semibold leading-5 text-[#8f7f70]">
        이 영역에는 제휴 링크가 포함될 수 있으며, 구매 시 집밥노트가 수수료를 받을 수 있습니다.
      </p>
    </article>
  );
}
