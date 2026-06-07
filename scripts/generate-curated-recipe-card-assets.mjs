import { mkdir, writeFile } from "node:fs/promises";

const moduleUrl = new URL("../lib/curated-recipes.ts", import.meta.url);
const { CURATED_JIPBAB_RECIPES } = await import(moduleUrl.href);

const outDir = new URL("../public/images/recipes/jipbab-curated/guides/", import.meta.url);

function escapeXml(value) {
  return String(value).replace(/[&<>"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
  })[character]);
}

function trimText(value, maxLength) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function textLines(value, maxChars, maxLines) {
  const words = String(value ?? "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
    if (lines.length === maxLines) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function svgTextLines(lines, x, y, options = {}) {
  const {
    size = 28,
    weight = 700,
    fill = "#4b3929",
    gap = 38,
    anchor = "start",
  } = options;

  return lines.map((line, index) => (
    `<text x="${x}" y="${y + index * gap}" text-anchor="${anchor}" font-family="Apple SD Gothic Neo, Pretendard, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${escapeXml(line)}</text>`
  )).join("\n");
}

function buildCard(recipe) {
  const ingredients = recipe.ingredientDetails?.slice(0, 5) ?? [];
  const titleLines = textLines(recipe.name, 11, 2);
  const summaryLines = textLines(recipe.beginnerSummary ?? recipe.imageCaption ?? recipe.featuredReason, 28, 3);
  const imageUrl = recipe.thumbnailUrl ?? "/images/recipes/kimchi-fried-rice.png";
  const isBabyFood = recipe.category === "이유식";
  const cardSteps = isBabyFood
    ? [
        "재료를 아기 단계에 맞게 아주 작고 부드럽게 준비합니다.",
        "약불에서 눌어붙지 않게 저어가며 충분히 익힙니다.",
        "입자와 농도를 맞춘 뒤 덩어리가 큰지 확인합니다.",
        "미지근하게 식혀 소량부터 천천히 제공합니다.",
      ]
    : [
        "재료를 비슷한 크기로 손질해 익는 속도를 맞춥니다.",
        "팬이나 냄비를 중약불로 달군 뒤 천천히 조리합니다.",
        "양념은 절반부터 넣고 마지막에 간을 확인합니다.",
        "불을 끄고 한 김 식힌 뒤 먹기 좋게 담습니다.",
      ];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(recipe.name)} 레시피 이미지</title>
  <desc id="desc">${escapeXml(recipe.name)} 재료와 조리 순서를 요약한 집밥노트 레시피 카드</desc>
  <defs>
    <clipPath id="photoClip"><rect x="60" y="70" width="460" height="460" rx="34"/></clipPath>
    <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#6e431d" flood-opacity=".16"/>
    </filter>
  </defs>
  <rect width="1080" height="1350" fill="#fbf6ee"/>
  <rect x="38" y="42" width="1004" height="1266" rx="42" fill="#fffaf3" stroke="#eadcc9" stroke-width="3" filter="url(#softShadow)"/>
  <image href="${escapeXml(imageUrl)}" x="60" y="70" width="460" height="460" preserveAspectRatio="xMidYMid slice" clip-path="url(#photoClip)"/>
  <rect x="60" y="70" width="460" height="460" rx="34" fill="none" stroke="#eadcc9" stroke-width="3"/>

  <text x="565" y="112" font-family="Apple SD Gothic Neo, Pretendard, sans-serif" font-size="26" font-weight="900" fill="#d94d19">집밥노트 레시피</text>
  ${svgTextLines(titleLines, 565, 174, { size: titleLines.length > 1 ? 54 : 62, weight: 900, fill: "#2f2117", gap: 64 })}
  <rect x="565" y="320" width="112" height="42" rx="21" fill="#fff0e4"/>
  <text x="621" y="349" text-anchor="middle" font-family="Apple SD Gothic Neo, Pretendard, sans-serif" font-size="22" font-weight="900" fill="#d94d19">${escapeXml(recipe.category)}</text>
  <rect x="692" y="320" width="112" height="42" rx="21" fill="#eef4ff"/>
  <text x="748" y="349" text-anchor="middle" font-family="Apple SD Gothic Neo, Pretendard, sans-serif" font-size="22" font-weight="900" fill="#2f6fec">${escapeXml(recipe.method)}</text>
  <rect x="819" y="320" width="128" height="42" rx="21" fill="#eef6df"/>
  <text x="883" y="349" text-anchor="middle" font-family="Apple SD Gothic Neo, Pretendard, sans-serif" font-size="22" font-weight="900" fill="#3d7b38">${escapeXml(`${recipe.cookingTime ?? 15}분`)}</text>
  ${svgTextLines(summaryLines, 565, 414, { size: 25, weight: 700, fill: "#6e5a49", gap: 34 })}

  <text x="78" y="615" font-family="Apple SD Gothic Neo, Pretendard, sans-serif" font-size="34" font-weight="900" fill="#2f2117">재료</text>
  ${ingredients.map((ingredient, index) => {
    const y = 672 + index * 58;
    return `<rect x="78" y="${y - 36}" width="420" height="46" rx="23" fill="#fff7ed"/>
    <text x="102" y="${y - 5}" font-family="Apple SD Gothic Neo, Pretendard, sans-serif" font-size="23" font-weight="800" fill="#4b3929">${escapeXml(trimText(ingredient.name, 10))}</text>
    <text x="474" y="${y - 5}" text-anchor="end" font-family="Apple SD Gothic Neo, Pretendard, sans-serif" font-size="22" font-weight="900" fill="#d94d19">${escapeXml(trimText(ingredient.display, 12))}</text>`;
  }).join("\n")}

  <text x="555" y="615" font-family="Apple SD Gothic Neo, Pretendard, sans-serif" font-size="34" font-weight="900" fill="#2f2117">순서</text>
  ${cardSteps.map((step, index) => {
    const y = 666 + index * 132;
    const lines = textLines(step, 25, 2);
    return `<circle cx="586" cy="${y - 10}" r="24" fill="#6e431d"/>
    <text x="586" y="${y - 2}" text-anchor="middle" font-family="Apple SD Gothic Neo, Pretendard, sans-serif" font-size="22" font-weight="900" fill="#ffffff">${index + 1}</text>
    ${svgTextLines(lines, 630, y - 12, { size: 23, weight: 800, fill: "#4b3929", gap: 31 })}`;
  }).join("\n")}

  <rect x="78" y="1185" width="924" height="72" rx="28" fill="#2f2117"/>
  <text x="540" y="1231" text-anchor="middle" font-family="Apple SD Gothic Neo, Pretendard, sans-serif" font-size="25" font-weight="900" fill="#ffe7c9">${escapeXml(recipe.featuredReason ?? "냉장고 재료로 만드는 쉬운 집밥")}</text>
</svg>
`;
}

await mkdir(outDir, { recursive: true });

for (const recipe of CURATED_JIPBAB_RECIPES) {
  await writeFile(new URL(`${recipe.id}-recipe-card.svg`, outDir), buildCard(recipe));
}

console.log(`generated ${CURATED_JIPBAB_RECIPES.length} recipe card SVGs`);
