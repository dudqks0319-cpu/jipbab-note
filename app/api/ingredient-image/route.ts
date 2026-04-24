import { NextResponse } from "next/server";

import { findCatalogIngredient } from "@/lib/ingredient-catalog";
import type { IngredientCategory } from "@/types";

const CATEGORY_TONE: Record<IngredientCategory | "기타", { bg: string; accent: string; emoji: string }> = {
  채소: { bg: "#ecfdf5", accent: "#24d3a4", emoji: "🥬" },
  과일: { bg: "#fff1f2", accent: "#fb7185", emoji: "🍎" },
  육류: { bg: "#fff1f2", accent: "#ef4444", emoji: "🥩" },
  수산물: { bg: "#eff6ff", accent: "#38bdf8", emoji: "🐟" },
  유제품: { bg: "#fffbeb", accent: "#f4c245", emoji: "🥛" },
  양념: { bg: "#fff7ed", accent: "#f97316", emoji: "🧂" },
  기타: { bg: "#f8fafc", accent: "#64748b", emoji: "📦" },
};

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawName = searchParams.get("name")?.trim() || "재료";
  const catalogItem = findCatalogIngredient(rawName);
  const category = (catalogItem?.category ?? searchParams.get("category") ?? "기타") as IngredientCategory;
  const tone = CATEGORY_TONE[category] ?? CATEGORY_TONE.기타;
  const name = escapeXml(rawName);
  const chars = [...rawName].slice(0, 5).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="540" viewBox="0 0 720 540">
  <defs>
    <filter id="shadow" x="80" y="70" width="560" height="390" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#4b3a22" flood-opacity="0.16"/>
    </filter>
  </defs>
  <rect width="720" height="540" rx="44" fill="${tone.bg}"/>
  <circle cx="612" cy="94" r="72" fill="${tone.accent}" opacity="0.14"/>
  <circle cx="112" cy="452" r="92" fill="${tone.accent}" opacity="0.12"/>
  <g filter="url(#shadow)">
    <rect x="118" y="92" width="484" height="330" rx="36" fill="#ffffff"/>
    <rect x="152" y="126" width="416" height="214" rx="30" fill="${tone.bg}"/>
  </g>
  <text x="360" y="252" text-anchor="middle" font-family="Apple Color Emoji, Segoe UI Emoji, sans-serif" font-size="118">${tone.emoji}</text>
  <rect x="218" y="356" width="284" height="54" rx="27" fill="${tone.accent}"/>
  <text x="360" y="392" text-anchor="middle" font-family="Arial, Apple SD Gothic Neo, sans-serif" font-size="27" font-weight="800" fill="#ffffff">${name}</text>
  <text x="360" y="470" text-anchor="middle" font-family="Arial, Apple SD Gothic Neo, sans-serif" font-size="24" font-weight="800" fill="#1f2937">${escapeXml(chars)}</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
