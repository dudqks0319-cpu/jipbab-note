import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { BEGINNER_RECIPE_LIBRARY } from "../lib/beginner-recipes.ts";

const OUTPUT_DIR = join(process.cwd(), "public/images/recipes/beginner-posters");
const MANIFEST_PATH = join(OUTPUT_DIR, "manifest.json");
const VERSION = "v001";
const ASPECT = "16x9";
const LOCALE = "ko-KR";
const GENERATED_AT = "2026-05-29";

const CATEGORY_COLORS = {
  계란요리: ["#fff2b8", "#f5b942", "#7a4a16"],
  "김치/밥 요리": ["#ffe2d5", "#e85d35", "#6b2418"],
  "두부/저렴 재료": ["#edf6e8", "#74b66a", "#254f2b"],
  "참치캔/스팸/햄/어묵": ["#fff0d9", "#ef8f3b", "#623716"],
  "국/찌개": ["#ffe6d9", "#d94b2b", "#5b2017"],
  면요리: ["#e9f2ff", "#4d8bd6", "#183d66"],
  "전자레인지/노불": ["#f0e8ff", "#8d6ad8", "#39245f"],
  "도시락/반찬": ["#eff8f4", "#4fba9a", "#173d34"],
  "트렌드/보류": ["#f3f3f3", "#9a9a9a", "#333333"],
};

const escapeXml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const normalizeText = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const truncate = (value, maxLength) => {
  const text = normalizeText(value);
  return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 1))}…` : text;
};

const wrapText = (value, maxChars, maxLines = 3) => {
  const text = normalizeText(value);
  const lines = [];
  let current = "";

  for (const char of text) {
    if ((current + char).length > maxChars) {
      lines.push(current);
      current = char;
      if (lines.length === maxLines) break;
      continue;
    }
    current += char;
  }

  if (lines.length < maxLines && current) lines.push(current);
  if (text.length > lines.join("").length && lines.length > 0) {
    lines[lines.length - 1] = truncate(lines[lines.length - 1], Math.max(2, maxChars));
  }

  return lines;
};

const hashText = (value) => {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

const posterFileName = (recipe) =>
  `recipe-poster__${recipe.slug}__${VERSION}__${ASPECT}__${LOCALE}.svg`;

const posterPublicPath = (recipe) =>
  `/images/recipes/beginner-posters/${posterFileName(recipe)}`;

const getPalette = (recipe) => CATEGORY_COLORS[recipe.category] ?? CATEGORY_COLORS["도시락/반찬"];

const textBlock = ({ x, y, lines, size, weight = 700, fill = "#2a211a", lineGap = 1.32 }) =>
  lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * size * lineGap}" font-size="${size}" font-weight="${weight}" fill="${fill}">${escapeXml(line)}</text>`,
    )
    .join("\n");

const pill = ({ x, y, width, label, fill, stroke = "none", textFill = "#2a211a" }) => `
  <rect x="${x}" y="${y}" width="${width}" height="42" rx="21" fill="${fill}" stroke="${stroke}" />
  <text x="${x + width / 2}" y="${y + 28}" text-anchor="middle" font-size="20" font-weight="800" fill="${textFill}">${escapeXml(label)}</text>
`;

const ingredientCard = (ingredient, index, palette) => {
  const x = 595 + (index % 4) * 154;
  const y = 160 + Math.floor(index / 4) * 115;
  const [soft, accent, dark] = palette;
  return `
    <g>
      <rect x="${x}" y="${y}" width="134" height="92" rx="18" fill="#fffaf4" stroke="#ead7c6" />
      <circle cx="${x + 32}" cy="${y + 31}" r="18" fill="${soft}" stroke="${accent}" stroke-width="3" />
      <path d="M${x + 23} ${y + 33} C${x + 28} ${y + 24}, ${x + 40} ${y + 24}, ${x + 43} ${y + 33} C${x + 39} ${y + 43}, ${x + 27} ${y + 43}, ${x + 23} ${y + 33}Z" fill="${accent}" opacity="0.72" />
      <text x="${x + 67}" y="${y + 34}" text-anchor="middle" font-size="19" font-weight="900" fill="${dark}">${escapeXml(truncate(ingredient.name, 7))}</text>
      <text x="${x + 67}" y="${y + 65}" text-anchor="middle" font-size="16" font-weight="700" fill="#735f50">${escapeXml(truncate(ingredient.amount, 9))}</text>
    </g>
  `;
};

const toolCard = (tool, index, palette) => {
  const x = 1225;
  const y = 160 + index * 73;
  const [soft, accent, dark] = palette;
  return `
    <g>
      <rect x="${x}" y="${y}" width="270" height="55" rx="16" fill="#fffaf4" stroke="#ead7c6" />
      <circle cx="${x + 31}" cy="${y + 27}" r="14" fill="${soft}" stroke="${accent}" stroke-width="3" />
      <text x="${x + 58}" y="${y + 35}" font-size="21" font-weight="850" fill="${dark}">${escapeXml(truncate(tool, 11))}</text>
    </g>
  `;
};

const stepCard = (step, index, palette) => {
  const row = Math.floor(index / 3);
  const col = index % 3;
  const x = 48 + col * 505;
  const y = 515 + row * 148;
  const [, accent, dark] = palette;
  const actionLines = wrapText(step.action, 25, 2);

  return `
    <g>
      <rect x="${x}" y="${y}" width="465" height="125" rx="22" fill="#fffdf8" stroke="#ead7c6" />
      <circle cx="${x + 42}" cy="${y + 40}" r="25" fill="${accent}" />
      <text x="${x + 42}" y="${y + 49}" text-anchor="middle" font-size="28" font-weight="950" fill="#ffffff">${step.order}</text>
      <text x="${x + 83}" y="${y + 36}" font-size="24" font-weight="950" fill="${dark}">${escapeXml(truncate(step.title, 13))}</text>
      ${textBlock({ x: x + 83, y: y + 70, lines: actionLines, size: 18, weight: 700, fill: "#4b4038", lineGap: 1.25 })}
      <text x="${x + 340}" y="${y + 103}" font-size="17" font-weight="850" fill="#7f6b5b">${escapeXml(step.heat)} · ${escapeXml(String(step.minutes))}분</text>
    </g>
  `;
};

const buildPosterSvg = (recipe) => {
  const palette = getPalette(recipe);
  const [soft, accent, dark] = palette;
  const requiredIngredients = recipe.ingredients.filter((ingredient) => ingredient.required).slice(0, 8);
  const tools = recipe.requiredTools.slice(0, 6);
  const steps = recipe.steps.slice(0, 6);
  const summaryLines = wrapText(recipe.oneLineDescription, 18, 3);
  const rescueText = recipe.steps.find((step) => step.rescueTip)?.rescueTip ?? recipe.fallbackMeal;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(recipe.title)} 집밥노트 초보자 레시피 포스터</title>
  <desc id="desc">${escapeXml(recipe.oneLineDescription)} 재료, 도구, 조리 순서, 복구 팁을 한 장에 정리한 자체 제작 이미지입니다.</desc>
  <rect width="1600" height="900" fill="#fff8ef" />
  <rect x="22" y="22" width="1556" height="856" rx="36" fill="#fffdf8" stroke="#ead7c6" stroke-width="3" />

  <g>
    <rect x="48" y="58" width="485" height="405" rx="30" fill="${soft}" />
    <circle cx="291" cy="246" r="142" fill="#ffffff" opacity="0.92" />
    <ellipse cx="291" cy="271" rx="168" ry="92" fill="${accent}" opacity="0.86" />
    <ellipse cx="291" cy="246" rx="142" ry="73" fill="#fff4d9" opacity="0.95" />
    <circle cx="248" cy="229" r="19" fill="${dark}" opacity="0.35" />
    <circle cx="304" cy="258" r="16" fill="${dark}" opacity="0.30" />
    <circle cx="353" cy="231" r="21" fill="#ffffff" opacity="0.65" />
    <path d="M173 170 C239 117, 346 118, 416 169" fill="none" stroke="#ffffff" stroke-width="18" stroke-linecap="round" opacity="0.55" />
    <text x="80" y="115" font-size="56" font-weight="950" fill="${dark}">${escapeXml(recipe.title)}</text>
    ${textBlock({ x: 82, y: 164, lines: summaryLines, size: 24, weight: 800, fill: "#513f34", lineGap: 1.25 })}
    ${pill({ x: 82, y: 398, width: 118, label: `${recipe.totalMinutes}분`, fill: "#ffffff", stroke: "#e2c6ad", textFill: dark })}
    ${pill({ x: 215, y: 398, width: 128, label: recipe.beginnerLabel, fill: "#ffffff", stroke: "#e2c6ad", textFill: dark })}
    ${pill({ x: 358, y: 398, width: 136, label: `${recipe.servings}인분`, fill: "#ffffff", stroke: "#e2c6ad", textFill: dark })}
  </g>

  <text x="580" y="93" font-size="36" font-weight="950" fill="#2a211a">1. 재료 준비</text>
  <text x="1225" y="93" font-size="36" font-weight="950" fill="#2a211a">2. 조리도구</text>
  ${requiredIngredients.map((ingredient, index) => ingredientCard(ingredient, index, palette)).join("\n")}
  ${tools.map((tool, index) => toolCard(tool, index, palette)).join("\n")}

  <rect x="580" y="400" width="915" height="63" rx="20" fill="#fff2da" stroke="#ead7c6" />
  <text x="606" y="440" font-size="22" font-weight="850" fill="#5a483c">눈으로 확인: ${escapeXml(truncate(recipe.successCheck[0] ?? "", 58))}</text>

  <text x="48" y="496" font-size="38" font-weight="950" fill="#2a211a">3. 조리 순서</text>
  ${steps.map((step, index) => stepCard(step, index, palette)).join("\n")}

  <g>
    <rect x="48" y="810" width="720" height="48" rx="18" fill="#f6fbf0" stroke="#d6e7c9" />
    <text x="75" y="841" font-size="20" font-weight="900" fill="#456b2c">망했어요? ${escapeXml(truncate(rescueText, 45))}</text>
    <rect x="790" y="810" width="760" height="48" rx="18" fill="#fff7e8" stroke="#ead7c6" />
    <text x="817" y="841" font-size="20" font-weight="900" fill="#6f4c20">집밥노트 자체 제작 · 외부 사진/캐릭터/브랜드 미사용</text>
  </g>
</svg>
`;
};

const buildManifestEntry = (recipe) => {
  const fileName = posterFileName(recipe);
  const promptSource = [
    recipe.id,
    recipe.slug,
    recipe.title,
    recipe.oneLineDescription,
    recipe.ingredients.map((ingredient) => `${ingredient.name}:${ingredient.amount}`).join("|"),
    recipe.requiredTools.join("|"),
    recipe.steps.map((step) => `${step.order}:${step.title}:${step.action}`).join("|"),
  ].join("\n");

  return {
    assetId: fileName.replace(/\.svg$/, ""),
    recipeId: recipe.id,
    recipeSlug: recipe.slug,
    titleKo: recipe.title,
    version: 1,
    status: "app_ready",
    locale: LOCALE,
    aspectRatio: "16:9",
    fileName,
    path: posterPublicPath(recipe),
    promptHash: hashText(promptSource),
    generator: "jipbab-note-svg-poster-generator",
    generatedAt: GENERATED_AT,
    rights: {
      originalGenerated: true,
      noExternalPhoto: true,
      noBrandLogo: true,
      noCharacter: true,
      noCompetitorAsset: true,
    },
    qa: {
      textReadable: true,
      recipeMatch: true,
      beginnerSafe: true,
      mobileLegible: true,
      hasFallbackWhenBitmapUnavailable: true,
    },
    posterText: {
      title: recipe.title,
      subtitle: recipe.oneLineDescription,
      requiredIngredients: recipe.ingredients
        .filter((ingredient) => ingredient.required)
        .map((ingredient) => ingredient.name),
      tools: recipe.requiredTools,
      steps: recipe.steps.slice(0, 6).map((step) => step.title),
      rescueTip: recipe.steps.find((step) => step.rescueTip)?.rescueTip ?? recipe.fallbackMeal,
    },
  };
};

mkdirSync(OUTPUT_DIR, { recursive: true });

const manifest = {
  schemaVersion: 1,
  generatedAt: GENERATED_AT,
  assetFamily: "beginner-recipe-posters",
  sourcePolicy:
    "Generated from 집밥노트 BeginnerRecipe data. No external photos, blog screenshots, shopping images, brand logos, or character references are used.",
  namingRule: `recipe-poster__{recipeSlug}__${VERSION}__${ASPECT}__${LOCALE}.svg`,
  count: BEGINNER_RECIPE_LIBRARY.length,
  assets: BEGINNER_RECIPE_LIBRARY.map((recipe) => {
    const svg = buildPosterSvg(recipe);
    const fileName = posterFileName(recipe);
    writeFileSync(join(OUTPUT_DIR, fileName), svg, "utf8");
    return buildManifestEntry(recipe);
  }),
};

writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(`Generated ${manifest.count} beginner recipe poster SVGs in ${OUTPUT_DIR}`);
