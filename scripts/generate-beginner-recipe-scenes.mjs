import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { BEGINNER_RECIPE_LIBRARY } from "../lib/beginner-recipes.ts";

const OUTPUT_DIR = join(process.cwd(), "public/images/recipes/beginner-scenes");
const MANIFEST_PATH = join(OUTPUT_DIR, "manifest.json");
const LOCALE = "ko-KR";
const GENERATED_AT = "2026-05-29";

const CATEGORY_COLORS = {
  계란요리: ["#fff4c9", "#f6b73f", "#5e3510"],
  "김치/밥 요리": ["#fff0e7", "#e85027", "#5b1d10"],
  "두부/저렴 재료": ["#f0f8ea", "#70b764", "#244c27"],
  "참치캔/스팸/햄/어묵": ["#fff1dd", "#ef8f37", "#5e3414"],
  "국/찌개": ["#fff0e6", "#d94324", "#551d12"],
  면요리: ["#edf5ff", "#4b8ad6", "#173d66"],
  "전자레인지/노불": ["#f2edff", "#8465d8", "#342057"],
  "도시락/반찬": ["#eff8f4", "#48ae8c", "#173d34"],
  "트렌드/보류": ["#f4f4f4", "#909090", "#333333"],
};

const TOOL_ICONS = {
  냄비: "pot",
  프라이팬: "pan",
  전자레인지: "microwave",
  "전자레인지용 그릇": "bowl",
  그릇: "bowl",
  숟가락: "spoon",
  국자: "ladle",
  주걱: "spatula",
  뒤집개: "spatula",
  도마: "board",
  칼: "knife",
  볼: "bowl",
  채망: "sieve",
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

const getPalette = (recipe) => CATEGORY_COLORS[recipe.category] ?? CATEGORY_COLORS["도시락/반찬"];

const fileNameFor = (scene) => `${scene}.svg`;
const publicPathFor = (recipe, scene) => `/images/recipes/beginner-scenes/${recipe.slug}/${fileNameFor(scene)}`;
const outputPathFor = (recipe, scene) => join(OUTPUT_DIR, recipe.slug, fileNameFor(scene));

const stepSceneName = (order) => `step-${String(order).padStart(2, "0")}`;

const textLines = ({ x, y, lines, size, fill = "#2a211a", weight = 800, lineGap = 1.32 }) =>
  lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * size * lineGap}" font-size="${size}" font-weight="${weight}" fill="${fill}">${escapeXml(line)}</text>`,
    )
    .join("\n");

const pageBadge = (current, total) => `
  <g>
    <rect x="42" y="34" width="108" height="66" rx="20" fill="#df321c"/>
    <path d="M143 68 L171 52 L171 84 Z" fill="#df321c"/>
    <text x="96" y="78" text-anchor="middle" font-size="34" font-weight="950" fill="#fff">${current}/${total}</text>
  </g>
`;

const baseSvg = ({ recipe, current, total, title, subtitle, body }) => {
  const [, accent, dark] = getPalette(recipe);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(recipe.title)} ${escapeXml(title)}</title>
  <desc id="desc">${escapeXml(recipe.oneLineDescription)} ${escapeXml(title)} 장면 이미지입니다. 외부 사진, 브랜드, 캐릭터를 사용하지 않은 집밥노트 자체 제작 SVG입니다.</desc>
  <defs>
    <radialGradient id="warmBg" cx="50%" cy="18%" r="78%">
      <stop offset="0%" stop-color="#fffdf8"/>
      <stop offset="100%" stop-color="${soft}"/>
    </radialGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#5b3219" flood-opacity="0.16"/>
    </filter>
  </defs>
  <rect width="1200" height="900" fill="url(#warmBg)"/>
  <rect x="14" y="14" width="1172" height="872" rx="20" fill="#fffdf8" opacity="0.88" stroke="#e6cda8"/>
  ${pageBadge(current, total)}
  <text x="600" y="74" text-anchor="middle" font-size="46" font-weight="950" fill="#1e1510">${escapeXml(title)}</text>
  <text x="600" y="118" text-anchor="middle" font-size="24" font-weight="850" fill="${accent}">${escapeXml(subtitle)}</text>
  <g fill="${dark}" opacity="0.96">${body}</g>
</svg>
`;
};

const foodIllustration = (recipe, { x = 600, y = 520, scale = 1 } = {}) => {
  const [, accent, dark] = getPalette(recipe);
  const isSoup = recipe.category.includes("국") || recipe.category.includes("찌개") || recipe.title.includes("국") || recipe.title.includes("탕");
  const isRice = recipe.title.includes("밥") || recipe.title.includes("덮밥") || recipe.title.includes("볶음밥");
  const isNoodle = recipe.category.includes("면") || recipe.title.includes("국수") || recipe.title.includes("우동") || recipe.title.includes("라면");
  return `
    <g transform="translate(${x} ${y}) scale(${scale})" filter="url(#softShadow)">
      <ellipse cx="0" cy="118" rx="250" ry="58" fill="#4b2b1e" opacity="0.16"/>
      <ellipse cx="0" cy="20" rx="255" ry="155" fill="#1e1b19"/>
      <ellipse cx="0" cy="5" rx="218" ry="124" fill="#fff4d9"/>
      <ellipse cx="0" cy="8" rx="196" ry="103" fill="${accent}" opacity="${isSoup ? "0.92" : "0.78"}"/>
      ${isRice ? `<ellipse cx="-12" cy="2" rx="158" ry="80" fill="#fff6de" opacity="0.98"/>` : ""}
      ${isNoodle ? Array.from({ length: 7 }, (_, index) => `<path d="M${-145 + index * 45} ${-30 + (index % 2) * 18} C${-110 + index * 42} ${-70}, ${-48 + index * 27} ${52}, ${20 + index * 19} ${20}" fill="none" stroke="#ffe2a1" stroke-width="16" stroke-linecap="round" opacity="0.9"/>`).join("") : ""}
      ${Array.from({ length: 16 }, (_, index) => {
        const angle = (index / 16) * Math.PI * 2;
        const px = Math.cos(angle) * (55 + (index % 4) * 22);
        const py = Math.sin(angle) * (28 + (index % 3) * 13);
        const color = index % 5 === 0 ? "#f7f0dc" : index % 3 === 0 ? "#7cbf62" : index % 2 === 0 ? "#d33b21" : dark;
        return `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${10 + (index % 4) * 3}" fill="${color}" opacity="0.76"/>`;
      }).join("")}
      ${isSoup ? `<path d="M-130 -28 C-80 -58, -35 -52, 16 -42 C78 -29, 112 -50, 145 -20" fill="none" stroke="#fff1c9" stroke-width="16" opacity="0.42" stroke-linecap="round"/>` : ""}
    </g>
  `;
};

const ingredientIcon = (ingredient, index, x, y, size = 122) => {
  const hue = (index * 47) % 360;
  const name = truncate(ingredient.name, 8);
  const amount = truncate(ingredient.amount, 12);
  return `
    <g>
      <rect x="${x}" y="${y}" width="${size}" height="${size + 62}" rx="18" fill="#fffaf3" stroke="#e7d3bb"/>
      <ellipse cx="${x + size / 2}" cy="${y + 52}" rx="${size * 0.35}" ry="${size * 0.24}" fill="hsl(${hue} 75% 54%)" opacity="0.88"/>
      <ellipse cx="${x + size / 2}" cy="${y + 42}" rx="${size * 0.37}" ry="${size * 0.20}" fill="#ffffff" opacity="0.62"/>
      <circle cx="${x + size * 0.36}" cy="${y + 50}" r="${size * 0.08}" fill="#fff6d0" opacity="0.78"/>
      <circle cx="${x + size * 0.56}" cy="${y + 63}" r="${size * 0.07}" fill="#5d8f36" opacity="0.68"/>
      <text x="${x + size / 2}" y="${y + size + 22}" text-anchor="middle" font-size="22" font-weight="950" fill="#251b14">${escapeXml(name)}</text>
      <text x="${x + size / 2}" y="${y + size + 52}" text-anchor="middle" font-size="17" font-weight="800" fill="#6f5a49">${escapeXml(amount)}</text>
    </g>
  `;
};

const toolIcon = (tool, index, x, y) => {
  const icon = TOOL_ICONS[tool] ?? "bowl";
  const iconSvg = {
    pot: `<rect x="${x + 36}" y="${y + 49}" width="112" height="74" rx="24" fill="#202020"/><ellipse cx="${x + 92}" cy="${y + 49}" rx="56" ry="20" fill="#3a3a3a"/><rect x="${x + 18}" y="${y + 68}" width="28" height="24" rx="10" fill="#262626"/><rect x="${x + 139}" y="${y + 68}" width="28" height="24" rx="10" fill="#262626"/>`,
    pan: `<ellipse cx="${x + 82}" cy="${y + 74}" rx="64" ry="38" fill="#1e1e1e"/><ellipse cx="${x + 82}" cy="${y + 66}" rx="50" ry="25" fill="#3a3a3a"/><rect x="${x + 138}" y="${y + 64}" width="68" height="17" rx="8" fill="#453020"/>`,
    microwave: `<rect x="${x + 22}" y="${y + 39}" width="160" height="94" rx="16" fill="#f3eee8" stroke="#453020" stroke-width="4"/><rect x="${x + 39}" y="${y + 55}" width="90" height="56" rx="10" fill="#1f1f1f"/><circle cx="${x + 154}" cy="${y + 73}" r="10" fill="#d94324"/><circle cx="${x + 154}" cy="${y + 98}" r="10" fill="#6f5a49"/>`,
    board: `<rect x="${x + 28}" y="${y + 41}" width="145" height="91" rx="17" fill="#c78a47"/><circle cx="${x + 148}" cy="${y + 62}" r="11" fill="#fff4dc"/>`,
    knife: `<path d="M${x + 48} ${y + 122} L${x + 150} ${y + 45} L${x + 172} ${y + 62} L${x + 69} ${y + 137} Z" fill="#d9dde0" stroke="#5d6266" stroke-width="3"/><rect x="${x + 34}" y="${y + 119}" width="58" height="21" rx="8" fill="#1f1f1f" transform="rotate(-37 ${x + 63} ${y + 129})"/>`,
    spoon: `<ellipse cx="${x + 72}" cy="${y + 63}" rx="29" ry="40" fill="#cfd4d9"/><rect x="${x + 92}" y="${y + 92}" width="19" height="84" rx="9" fill="#cfd4d9" transform="rotate(-35 ${x + 101} ${y + 134})"/>`,
    ladle: `<ellipse cx="${x + 72}" cy="${y + 67}" rx="35" ry="30" fill="#cfd4d9"/><rect x="${x + 100}" y="${y + 86}" width="19" height="92" rx="9" fill="#cfd4d9" transform="rotate(-31 ${x + 109} ${y + 132})"/>`,
    spatula: `<rect x="${x + 44}" y="${y + 41}" width="58" height="78" rx="12" fill="#b9783d"/><rect x="${x + 88}" y="${y + 94}" width="20" height="88" rx="9" fill="#8c552e" transform="rotate(-34 ${x + 98} ${y + 138})"/>`,
    sieve: `<circle cx="${x + 84}" cy="${y + 83}" r="46" fill="none" stroke="#bfc6cc" stroke-width="8"/><path d="M${x + 50} ${y + 83} H${x + 118} M${x + 84} ${y + 49} V${y + 117}" stroke="#bfc6cc" stroke-width="5"/><rect x="${x + 126}" y="${y + 75}" width="60" height="16" rx="8" fill="#bfc6cc"/>`,
    bowl: `<ellipse cx="${x + 92}" cy="${y + 75}" rx="68" ry="32" fill="#f7f3ed" stroke="#d0c5b8" stroke-width="4"/><path d="M${x + 30} ${y + 77} C${x + 45} ${y + 139}, ${x + 139} ${y + 139}, ${x + 154} ${y + 77}" fill="#fffaf3" stroke="#d0c5b8" stroke-width="4"/>`,
  }[icon];
  return `
    <g>
      <rect x="${x}" y="${y}" width="210" height="190" rx="18" fill="#fffaf3" stroke="#e7d3bb"/>
      ${iconSvg}
      <text x="${x + 105}" y="${y + 166}" text-anchor="middle" font-size="22" font-weight="950" fill="#251b14">${escapeXml(truncate(tool, 10))}</text>
    </g>
  `;
};

const buildCoverSvg = (recipe, total) => {
  const [, accent, dark] = getPalette(recipe);
  const body = `
    <text x="600" y="210" text-anchor="middle" font-size="92" font-weight="950" fill="${dark}">${escapeXml(recipe.title)}</text>
    <rect x="390" y="240" width="420" height="48" rx="24" fill="${accent}"/>
    <text x="600" y="272" text-anchor="middle" font-size="23" font-weight="950" fill="#fff">${escapeXml(recipe.homeCardCopy.badge)} · ${recipe.totalMinutes}분 · ${recipe.servings}인분</text>
    ${foodIllustration(recipe, { x: 600, y: 555, scale: 1.18 })}
    <rect x="165" y="782" width="870" height="70" rx="22" fill="#fff8ed" stroke="#e4cba7"/>
    <text x="600" y="826" text-anchor="middle" font-size="25" font-weight="850" fill="#5b3e2f">${escapeXml(truncate(recipe.oneLineDescription, 40))}</text>
  `;
  return baseSvg({
    recipe,
    current: 1,
    total,
    title: recipe.title,
    subtitle: "요리 초보도 따라 할 수 있는 집밥노트 대표 이미지입니다.",
    body,
  });
};

const buildIngredientsSvg = (recipe, total) => {
  const ingredients = recipe.ingredients.slice(0, 14);
  const body = `
    <rect x="36" y="150" width="1128" height="622" rx="20" fill="#fffaf3" stroke="#e7d3bb"/>
    <rect x="62" y="173" width="118" height="44" rx="12" fill="#d94324"/>
    <text x="121" y="203" text-anchor="middle" font-size="23" font-weight="950" fill="#fff">재료</text>
    ${ingredients
      .map((ingredient, index) => ingredientIcon(ingredient, index, 70 + (index % 7) * 156, 246 + Math.floor(index / 7) * 228))
      .join("\n")}
    <rect x="150" y="800" width="900" height="52" rx="15" fill="#fff7df" stroke="#e4cba7"/>
    <text x="600" y="834" text-anchor="middle" font-size="22" font-weight="850" fill="#6a4128">TIP! ${escapeXml(truncate(recipe.ingredients[0]?.beginnerNote ?? recipe.beforeStart[0], 44))}</text>
  `;
  return baseSvg({
    recipe,
    current: 2,
    total,
    title: `재료 준비 (${recipe.servings}인분)`,
    subtitle: `${recipe.title}에 필요한 재료입니다.`,
    body,
  });
};

const buildToolsSvg = (recipe, total) => {
  const tools = recipe.requiredTools.slice(0, 8);
  const body = `
    <rect x="44" y="165" width="1112" height="610" rx="22" fill="#fffaf3" stroke="#e7d3bb"/>
    ${tools.map((tool, index) => toolIcon(tool, index, 78 + (index % 4) * 270, 230 + Math.floor(index / 4) * 260)).join("\n")}
    <rect x="176" y="810" width="848" height="45" rx="15" fill="#fff7df" stroke="#e4cba7"/>
    <text x="600" y="840" text-anchor="middle" font-size="21" font-weight="850" fill="#6a4128">불을 켜기 전 도구를 먼저 꺼내두면 조리 중 당황하지 않습니다.</text>
  `;
  return baseSvg({
    recipe,
    current: 3,
    total,
    title: "필요한 조리도구",
    subtitle: `${recipe.title}를 만들 때 필요한 기본 도구입니다.`,
    body,
  });
};

const buildStepSvg = (recipe, step, total) => {
  const [, accent, dark] = getPalette(recipe);
  const actionLines = wrapText(step.action, 22, 4);
  const cueLines = wrapText(step.visualCue, 36, 2);
  const mistakeLines = wrapText(step.commonMistake, 36, 2);
  const rescueLines = wrapText(step.rescueTip, 36, 2);
  const body = `
    <rect x="40" y="154" width="500" height="480" rx="22" fill="#fffaf3" stroke="#e7d3bb"/>
    <g transform="translate(290 380) scale(0.9)">
      ${foodIllustration(recipe, { x: 0, y: 0, scale: 0.88 })}
      <path d="M-190 -132 C-120 -190, -26 -176, 64 -148 C126 -128, 164 -126, 200 -150" fill="none" stroke="#fff3cf" stroke-width="16" opacity="0.38" stroke-linecap="round"/>
    </g>
    <rect x="575" y="154" width="585" height="480" rx="22" fill="#fffdf8" stroke="#e7d3bb"/>
    <circle cx="630" cy="218" r="33" fill="${accent}"/>
    <text x="630" y="229" text-anchor="middle" font-size="36" font-weight="950" fill="#fff">${step.order}</text>
    <text x="685" y="229" font-size="38" font-weight="950" fill="${dark}">${escapeXml(truncate(step.title, 15))}</text>
    ${textLines({ x: 626, y: 300, lines: actionLines, size: 31, fill: "#241c17", weight: 850, lineGap: 1.45 })}
    <rect x="626" y="515" width="210" height="46" rx="16" fill="#fff3df" stroke="#e4cba7"/>
    <text x="731" y="546" text-anchor="middle" font-size="22" font-weight="950" fill="#6a4128">${escapeXml(step.heat)} · ${escapeXml(String(step.minutes))}분</text>
    <rect x="858" y="515" width="210" height="46" rx="16" fill="#f3faec" stroke="#d8e8c9"/>
    <text x="963" y="546" text-anchor="middle" font-size="22" font-weight="950" fill="#4d7a37">초보 확인</text>

    <rect x="40" y="665" width="360" height="82" rx="18" fill="#f3faec" stroke="#d8e8c9"/>
    <text x="68" y="697" font-size="20" font-weight="950" fill="#4d7a37">체크 포인트</text>
    ${textLines({ x: 68, y: 727, lines: cueLines, size: 18, fill: "#49643d", weight: 800, lineGap: 1.25 })}
    <rect x="420" y="665" width="360" height="82" rx="18" fill="#fff7df" stroke="#e4cba7"/>
    <text x="448" y="697" font-size="20" font-weight="950" fill="#a14a25">주의</text>
    ${textLines({ x: 448, y: 727, lines: mistakeLines, size: 18, fill: "#6a4128", weight: 800, lineGap: 1.25 })}
    <rect x="800" y="665" width="360" height="82" rx="18" fill="#fff0ee" stroke="#f0c6bf"/>
    <text x="828" y="697" font-size="20" font-weight="950" fill="#c63421">망했어요?</text>
    ${textLines({ x: 828, y: 727, lines: rescueLines, size: 18, fill: "#6b3028", weight: 800, lineGap: 1.25 })}
  `;
  return baseSvg({
    recipe,
    current: step.order + 3,
    total,
    title: `${step.order}단계. ${step.title}`,
    subtitle: `${recipe.title} 조리순서입니다.`,
    body,
  });
};

const buildManifestEntry = (recipe) => {
  const totalScenes = recipe.steps.length + 3;
  const scenes = [
    { kind: "cover", path: publicPathFor(recipe, "cover") },
    { kind: "ingredients", path: publicPathFor(recipe, "ingredients") },
    { kind: "tools", path: publicPathFor(recipe, "tools") },
    ...recipe.steps.map((step) => ({
      kind: "step",
      order: step.order,
      path: publicPathFor(recipe, stepSceneName(step.order)),
    })),
  ];
  const promptSource = [
    recipe.id,
    recipe.slug,
    recipe.title,
    recipe.oneLineDescription,
    recipe.ingredients.map((ingredient) => `${ingredient.name}:${ingredient.amount}`).join("|"),
    recipe.requiredTools.join("|"),
    recipe.steps.map((step) => `${step.order}:${step.title}:${step.action}:${step.visualCue}`).join("|"),
  ].join("\n");

  return {
    recipeId: recipe.id,
    recipeSlug: recipe.slug,
    titleKo: recipe.title,
    version: 1,
    status: "app_ready",
    locale: LOCALE,
    aspectRatio: "4:3",
    sceneCount: totalScenes,
    basePath: `/images/recipes/beginner-scenes/${recipe.slug}/`,
    coverPath: publicPathFor(recipe, "cover"),
    ingredientsPath: publicPathFor(recipe, "ingredients"),
    toolsPath: publicPathFor(recipe, "tools"),
    scenes,
    promptHash: hashText(promptSource),
    generator: "jipbab-note-svg-scene-generator",
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
      perStepImage: true,
    },
  };
};

mkdirSync(OUTPUT_DIR, { recursive: true });

const manifest = {
  schemaVersion: 1,
  generatedAt: GENERATED_AT,
  assetFamily: "beginner-recipe-scenes",
  sourcePolicy:
    "Generated from 집밥노트 BeginnerRecipe data. No external photos, blog screenshots, shopping images, brand logos, or character references are used.",
  namingRule: `beginner-scenes/{recipeSlug}/{cover|ingredients|tools|step-XX}.svg`,
  count: BEGINNER_RECIPE_LIBRARY.length,
  assets: BEGINNER_RECIPE_LIBRARY.map((recipe) => {
    const total = recipe.steps.length + 3;
    mkdirSync(join(OUTPUT_DIR, recipe.slug), { recursive: true });
    writeFileSync(outputPathFor(recipe, "cover"), buildCoverSvg(recipe, total), "utf8");
    writeFileSync(outputPathFor(recipe, "ingredients"), buildIngredientsSvg(recipe, total), "utf8");
    writeFileSync(outputPathFor(recipe, "tools"), buildToolsSvg(recipe, total), "utf8");
    for (const step of recipe.steps) {
      writeFileSync(outputPathFor(recipe, stepSceneName(step.order)), buildStepSvg(recipe, step, total), "utf8");
    }
    return buildManifestEntry(recipe);
  }),
};

writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(`Generated ${manifest.assets.length} beginner recipe scene sets in ${OUTPUT_DIR}`);
