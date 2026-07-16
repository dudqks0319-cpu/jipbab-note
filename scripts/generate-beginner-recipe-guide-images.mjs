import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { BEGINNER_RECIPE_LIBRARY } from "../lib/beginner-recipes.ts";
import { CURATED_JIPBAB_RECIPES } from "../lib/curated-recipes.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outDir = path.join(rootDir, "public/images/recipes/beginner-recipe-guides");
const prepOutDir = path.join(outDir, "prep");
const stepsOutDir = path.join(outDir, "steps");
const tmpSvgDir = path.join("/private/tmp", "jipbab-beginner-recipe-guide-svgs");
const tmpPngDir = path.join("/private/tmp", "jipbab-beginner-recipe-guide-pngs");
const curatedBySlug = new Map(CURATED_JIPBAB_RECIPES.map((recipe) => [recipe.slug, recipe]));

mkdirSync(outDir, { recursive: true });
mkdirSync(prepOutDir, { recursive: true });
mkdirSync(stepsOutDir, { recursive: true });
mkdirSync(tmpSvgDir, { recursive: true });
mkdirSync(tmpPngDir, { recursive: true });

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function imageDataUri(publicUrl) {
  const relativePath = publicUrl.replace(/^\//, "");
  const absolutePath = path.join(rootDir, "public", relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing guide background image: ${publicUrl}`);
  }
  const extension = path.extname(absolutePath).toLowerCase();
  const mime = extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${readFileSync(absolutePath).toString("base64")}`;
}

function truncateText(value, maxLength) {
  const text = String(value).trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function formatIngredients(recipe) {
  return recipe.ingredients
    .filter((ingredient) => ingredient.required)
    .slice(0, 6)
    .map((ingredient) => `${ingredient.name} ${ingredient.amount}`)
    .join(" · ");
}

function formatTools(recipe) {
  return recipe.requiredTools.slice(0, 6).join(" · ");
}

function formatStep(step) {
  return `${step.order} ${step.title}: ${step.action}`;
}

function formatPrepIngredient(ingredient) {
  return `${ingredient.name} ${ingredient.amount}`;
}

function splitTwoLines(value, maxLength) {
  const text = truncateText(value, maxLength * 2);
  if (text.length <= maxLength) return [text];
  let breakAt = text.lastIndexOf(" · ", maxLength);
  if (breakAt < maxLength * 0.45) breakAt = text.lastIndexOf(" ", maxLength);
  if (breakAt < maxLength * 0.45) breakAt = maxLength;
  return [text.slice(0, breakAt).trim(), text.slice(breakAt).replace(/^·\s*/, "").trim()];
}

function wrapText(value, maxLength, maxLines) {
  const words = String(value).trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxLength) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }
  if (current && lines.length < maxLines) lines.push(current);

  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[maxLines - 1] = truncateText(lines[maxLines - 1], maxLength);
  }
  return lines.length ? lines : [""];
}

function textLine(x, y, text, className = "body") {
  return `<text x="${x}" y="${y}" class="${className}">${escapeXml(text)}</text>`;
}

function baseSvg({ recipe, backgroundUri, subtitle, body }) {
  const method = recipe.requiredTools.includes("프라이팬")
    ? "팬 조리"
    : recipe.requiredTools.includes("냄비")
      ? "냄비 조리"
      : recipe.requiredTools.includes("전자레인지")
        ? "전자레인지"
        : "불 없이";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <style>
      text { font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", Arial, sans-serif; letter-spacing: 0; }
      .title { font-size: 62px; font-weight: 900; fill: #fffaf2; paint-order: stroke; stroke: rgba(0,0,0,0.26); stroke-width: 3px; }
      .badge { font-size: 25px; font-weight: 900; fill: #2f2117; }
      .label { font-size: 25px; font-weight: 900; fill: #ffffff; }
      .body { font-size: 31px; font-weight: 820; fill: #fffaf2; }
      .small { font-size: 25px; font-weight: 780; fill: #ffe8c7; }
      .step { font-size: 28px; font-weight: 840; fill: #fffaf2; }
      .number { font-size: 27px; font-weight: 900; fill: #2f2117; }
    </style>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000000" stop-opacity="0.10"/>
      <stop offset="0.45" stop-color="#000000" stop-opacity="0.20"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.78"/>
    </linearGradient>
  </defs>
  <image href="${backgroundUri}" x="0" y="0" width="1080" height="1080" preserveAspectRatio="xMidYMid slice"/>
  <rect width="1080" height="1080" fill="url(#shade)"/>

  <rect x="54" y="54" width="190" height="48" rx="24" fill="#f4d35e"/>
  ${textLine(88, 88, `${recipe.totalMinutes}분 · ${method}`, "badge")}
  ${textLine(54, 180, recipe.title, "title")}
  ${textLine(58, 230, subtitle, "small")}

${body}
</svg>`;
}

function renderCombinedSvg(recipe, backgroundUri) {
  const ingredients = splitTwoLines(formatIngredients(recipe), 35);
  const tools = splitTwoLines(formatTools(recipe), 36);
  const steps = recipe.steps.slice(0, 4).map((step) => truncateText(formatStep(step), 39));

  return baseSvg({
    recipe,
    backgroundUri,
    subtitle: "재료부터 순서까지 한 장으로 보기",
    body: `
  <g transform="translate(54 332)">
    <rect x="0" y="0" width="972" height="156" rx="24" fill="rgba(47,33,23,0.58)" stroke="rgba(255,250,242,0.22)" stroke-width="2"/>
    <rect x="26" y="24" width="96" height="38" rx="19" fill="#ea5a1f"/>
    ${textLine(55, 51, "재료", "label")}
    ${ingredients.map((line, index) => textLine(28, 100 + index * 36, line, "body")).join("\n    ")}
  </g>

  <g transform="translate(54 510)">
    <rect x="0" y="0" width="972" height="112" rx="24" fill="rgba(47,33,23,0.52)" stroke="rgba(255,250,242,0.18)" stroke-width="2"/>
    <rect x="26" y="24" width="96" height="38" rx="19" fill="#78a95f"/>
    ${textLine(55, 51, "도구", "label")}
    ${tools.map((line, index) => textLine(150, 53 + index * 36, line, "body")).join("\n    ")}
  </g>

  <g transform="translate(54 660)">
    <rect x="0" y="0" width="972" height="348" rx="30" fill="rgba(20,14,10,0.70)" stroke="rgba(255,250,242,0.22)" stroke-width="2"/>
    <rect x="28" y="26" width="152" height="40" rx="20" fill="#2f2117"/>
    ${textLine(58, 54, "요리 순서", "label")}
    ${steps.map((line, index) => `
    <circle cx="46" cy="${110 + index * 56}" r="22" fill="#f4d35e"/>
    ${textLine(39, 119 + index * 56, String(index + 1), "number")}
    ${textLine(84, 119 + index * 56, line, "step")}`).join("\n")}
  </g>`,
  });
}

function renderPrepSvg(recipe, backgroundUri) {
  const ingredients = recipe.ingredients
    .filter((ingredient) => ingredient.required)
    .slice(0, 8)
    .map(formatPrepIngredient);
  const tools = recipe.requiredTools.slice(0, 8);
  const ingredientRows = ingredients.map((line, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 32 + column * 470;
    const y = 92 + row * 74;
    return `
    <rect x="${x}" y="${y - 38}" width="430" height="56" rx="18" fill="rgba(255,250,242,0.14)" stroke="rgba(255,250,242,0.18)" stroke-width="2"/>
    ${textLine(x + 22, y, truncateText(line, 18), "body")}`;
  }).join("\n");
  const toolRows = tools.map((line, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 32 + column * 470;
    const y = 92 + row * 68;
    return `
    <circle cx="${x + 24}" cy="${y - 9}" r="20" fill="#78a95f"/>
    ${textLine(x + 60, y, truncateText(line, 16), "body")}`;
  }).join("\n");

  return baseSvg({
    recipe,
    backgroundUri,
    subtitle: "먼저 꺼낼 도구와 재료",
    body: `
  <g transform="translate(54 322)">
    <rect x="0" y="0" width="972" height="380" rx="30" fill="rgba(47,33,23,0.62)" stroke="rgba(255,250,242,0.24)" stroke-width="2"/>
    <rect x="28" y="28" width="220" height="42" rx="21" fill="#ea5a1f"/>
    ${textLine(58, 57, "재료 사진", "label")}
${ingredientRows}
  </g>

  <g transform="translate(54 730)">
    <rect x="0" y="0" width="972" height="286" rx="30" fill="rgba(20,14,10,0.70)" stroke="rgba(255,250,242,0.22)" stroke-width="2"/>
    <rect x="28" y="28" width="220" height="42" rx="21" fill="#2f2117"/>
    ${textLine(58, 57, "도구 사진", "label")}
${toolRows}
  </g>`,
  });
}

function renderStepsSvg(recipe, backgroundUri) {
  const stepRows = recipe.steps.slice(0, 6).map((step, index) => {
    const firstLineY = 104 + index * 132;
    const lines = wrapText(formatStep(step), 34, 2);
    return `
    <circle cx="54" cy="${firstLineY - 8}" r="26" fill="#f4d35e"/>
    ${textLine(45, firstLineY + 2, String(index + 1), "number")}
    ${lines.map((line, lineIndex) => textLine(96, firstLineY + lineIndex * 38, line, "step")).join("\n    ")}
    ${step.heat ? textLine(96, firstLineY + 78, `${step.heat}${step.minutes ? ` · ${step.minutes}분` : ""}`, "small") : ""}`;
  }).join("\n");

  return baseSvg({
    recipe,
    backgroundUri,
    subtitle: "다음 사진은 이 순서대로 만들기",
    body: `
  <g transform="translate(54 292)">
    <rect x="0" y="0" width="972" height="734" rx="34" fill="rgba(20,14,10,0.72)" stroke="rgba(255,250,242,0.24)" stroke-width="2"/>
    <rect x="28" y="28" width="220" height="42" rx="21" fill="#2f2117"/>
    ${textLine(58, 57, "요리 순서", "label")}
${stepRows}
  </g>`,
  });
}

function renderPng({ recipe, backgroundUri, fileStem, outputPath, render }) {
  const svgPath = path.join(tmpSvgDir, `${recipe.slug}-${fileStem}.svg`);
  const renderedPath = path.join(tmpPngDir, `${recipe.slug}-${fileStem}.svg.png`);

  writeFileSync(svgPath, render(recipe, backgroundUri), "utf8");
  if (existsSync(renderedPath)) unlinkSync(renderedPath);
  execFileSync("qlmanage", ["-t", "-s", "1080", "-o", tmpPngDir, svgPath], { stdio: "ignore" });
  if (!existsSync(renderedPath)) {
    throw new Error(`QuickLook did not render ${recipe.slug} ${fileStem}`);
  }
  copyFileSync(renderedPath, outputPath);
}

for (const recipe of BEGINNER_RECIPE_LIBRARY) {
  const curated = curatedBySlug.get(recipe.slug);
  if (!curated?.thumbnailUrl) {
    throw new Error(`Missing curated thumbnail for ${recipe.slug}`);
  }
  const backgroundUri = imageDataUri(curated.thumbnailUrl);

  renderPng({
    recipe,
    backgroundUri,
    fileStem: "combined",
    outputPath: path.join(outDir, `${recipe.slug}.png`),
    render: renderCombinedSvg,
  });
  renderPng({
    recipe,
    backgroundUri,
    fileStem: "prep",
    outputPath: path.join(prepOutDir, `${recipe.slug}.png`),
    render: renderPrepSvg,
  });
  renderPng({
    recipe,
    backgroundUri,
    fileStem: "steps",
    outputPath: path.join(stepsOutDir, `${recipe.slug}.png`),
    render: renderStepsSvg,
  });
}

console.log(`Generated ${BEGINNER_RECIPE_LIBRARY.length} combined, prep, and steps recipe guide PNG sets in ${path.relative(rootDir, outDir)}`);
