// 이 스크립트는 집밥노트 레시피 상세페이지형 이미지 에셋을 생성합니다.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const recipeDir = path.resolve(__dirname, "../public/images/recipes");

const WIDTH = 1080;
const MARGIN = 64;
const CONTENT = WIDTH - MARGIN * 2;
const GREEN = "#22C55E";
const ORANGE = "#FF8C42";
const TEXT = "#333333";
const BODY = "#666666";
const MUTED = "#999999";
const BORDER = "#E5E7EB";
const BG = "#FAFAFA";

const recipes = [
  {
    slug: "bossam",
    title: "보쌈",
    subtitle: "잡내 없이 부드러운 수육과 쌈채소를 한 접시에",
    hero: "bossam-hero.png",
    meta: ["80분", "보통", "3~4인분", "돼지고기 활용"],
    summary:
      "향신 채소와 된장으로 고기를 천천히 삶고, 잠깐 뜸을 들인 뒤 결 반대로 썰어 촉촉한 식감을 살리는 집밥 보쌈입니다.",
    ingredientGroups: [
      {
        title: "주재료",
        items: ["돼지고기 수육용 600g", "알배추 1/2통", "상추 또는 깻잎 12장", "부추 한 줌"],
      },
      {
        title: "삶는 재료",
        items: ["대파 1대", "양파 1/2개", "마늘 8알", "생강 2쪽", "된장 1큰술", "맛술 3큰술", "통후추 1작은술"],
      },
      {
        title: "곁들임",
        items: ["보쌈김치 또는 무생채", "새우젓", "쌈장", "마늘 슬라이스", "청양고추"],
      },
    ],
    prep: [
      "고기는 키친타월로 눌러 핏물을 제거합니다.",
      "배추와 쌈채소는 씻어 물기를 충분히 빼둡니다.",
      "대파와 양파는 큼직하게 썰어 향신수에 넣기 좋게 준비합니다.",
    ],
    steps: [
      {
        title: "향신수 끓이기",
        time: "10분",
        icon: "pot",
        body: "냄비에 물 1.6L, 대파, 양파, 마늘, 생강, 된장, 맛술, 통후추를 넣고 센 불에서 끓입니다.",
      },
      {
        title: "고기 삶기",
        time: "45~55분",
        icon: "steam",
        body: "물이 끓으면 고기를 넣고 센 불 10분, 중약불 35~45분으로 익힙니다. 젓가락이 부드럽게 들어가면 충분합니다.",
      },
      {
        title: "뜸 들이기",
        time: "5분",
        icon: "timer",
        body: "불을 끄고 뚜껑을 덮은 채 5분 쉬게 하면 육즙이 안정되어 썰 때 덜 마릅니다.",
      },
      {
        title: "결 반대로 썰기",
        time: "3분",
        icon: "knife",
        body: "한 김 식힌 고기를 결 반대 방향으로 0.7cm 두께로 썰어 촉촉한 단면을 살립니다.",
      },
      {
        title: "완성 플레이팅",
        time: "2분",
        icon: "plate",
        body: "고기, 배추, 쌈채소, 보쌈김치, 새우젓을 접시에 나눠 담고 쌈장과 마늘을 곁들입니다.",
      },
    ],
    finish:
      "고기는 접시 중앙에 가지런히 세워 담고, 붉은 보쌈김치와 초록 쌈채소를 양쪽에 배치하면 앱 상세페이지용 사진처럼 색 대비가 살아납니다.",
    tips: [
      "고기 냄새가 걱정되면 된장과 맛술을 줄이지 마세요.",
      "삶는 중간에 물이 부족하면 뜨거운 물을 보충합니다.",
      "남은 수육은 얇게 썰어 김치볶음밥이나 된장찌개 토핑으로 활용할 수 있습니다.",
    ],
  },
  {
    slug: "gyeran-mari",
    title: "계란말이",
    subtitle: "초보자도 실패 적은 촉촉한 집밥 반찬",
    hero: "gyeran-mari.png",
    meta: ["15분", "쉬움", "2인분", "달걀 활용"],
    summary:
      "달걀물을 체에 한 번 내려 부드럽게 만들고, 약불에서 얇게 부어 여러 번 말아 단면이 예쁜 계란말이를 만듭니다.",
    ingredientGroups: [
      {
        title: "주재료",
        items: ["달걀 5개", "당근 2큰술", "대파 또는 쪽파 2큰술", "양파 1큰술"],
      },
      {
        title: "간",
        items: ["소금 1/4작은술", "맛술 1큰술", "우유 또는 물 2큰술", "식용유 약간"],
      },
      {
        title: "선택 재료",
        items: ["김 한 장", "치즈 1장", "참기름 몇 방울", "깨 약간"],
      },
    ],
    prep: [
      "당근, 대파, 양파는 아주 잘게 다져야 말 때 찢어지지 않습니다.",
      "달걀은 소금, 맛술, 우유와 섞은 뒤 체에 내려 알끈을 제거합니다.",
      "팬은 중약불로 예열하고 키친타월로 기름을 얇게 펴 바릅니다.",
    ],
    steps: [
      {
        title: "달걀물 만들기",
        time: "3분",
        icon: "bowl",
        body: "달걀, 다진 채소, 소금, 맛술, 우유를 섞고 체에 내려 표면이 매끈한 달걀물을 준비합니다.",
      },
      {
        title: "첫 층 익히기",
        time: "2분",
        icon: "pan",
        body: "중약불 팬에 달걀물을 얇게 붓고 가장자리가 익기 시작하면 끝에서부터 천천히 말아줍니다.",
      },
      {
        title: "반복해서 말기",
        time: "5분",
        icon: "roll",
        body: "말아둔 계란을 한쪽으로 밀고 빈 공간에 달걀물을 다시 부어 이어 붙입니다. 3~4번 반복합니다.",
      },
      {
        title: "모양 잡기",
        time: "3분",
        icon: "timer",
        body: "완성된 계란말이를 팬 가장자리나 김발로 살짝 눌러 네모난 형태를 잡고 잠시 식힙니다.",
      },
      {
        title: "두툼하게 썰기",
        time: "2분",
        icon: "knife",
        body: "칼을 물에 살짝 적신 뒤 1.5cm 두께로 썰어 단면이 흐트러지지 않게 담습니다.",
      },
    ],
    finish:
      "흰 접시에 계란말이를 사선으로 겹쳐 담고 초록 파를 곁들이면 노란색과 초록색이 살아나 레시피 카드에서 가장 잘 보입니다.",
    tips: [
      "불이 세면 겉만 타고 속이 비어 보이니 끝까지 중약불을 유지합니다.",
      "달걀물이 완전히 익기 전 말아야 층이 잘 붙습니다.",
      "남은 계란말이는 김밥 속재료나 도시락 반찬으로 바로 활용할 수 있습니다.",
    ],
  },
  {
    slug: "jjimdak",
    title: "찜닭",
    subtitle: "감자와 당면까지 양념이 배는 달콤짭짤 메인요리",
    hero: "jjimdak-hero.png",
    meta: ["45분", "보통", "3인분", "닭고기 활용"],
    summary:
      "닭을 한 번 데쳐 잡내와 불순물을 줄이고, 간장 양념을 졸여 감자와 당면까지 깊게 배게 만드는 집밥 찜닭입니다.",
    ingredientGroups: [
      {
        title: "주재료",
        items: ["닭볶음탕용 닭 800g", "감자 2개", "당근 1/2개", "양파 1개", "불린 당면 100g", "대파 1대"],
      },
      {
        title: "양념장",
        items: ["진간장 6큰술", "맛술 3큰술", "설탕 2큰술", "올리고당 1큰술", "다진 마늘 1.5큰술", "후추 약간"],
      },
      {
        title: "마무리",
        items: ["참기름 1작은술", "깨 약간", "청양고추 1개", "물 600ml"],
      },
    ],
    prep: [
      "당면은 미지근한 물에 20분 이상 불려둡니다.",
      "닭은 끓는 물에 3분 데친 뒤 찬물에 헹궈 불순물을 제거합니다.",
      "감자와 당근은 큼직하게, 양파와 대파는 한입 크기로 썹니다.",
    ],
    steps: [
      {
        title: "닭 데치기",
        time: "3분",
        icon: "pot",
        body: "닭을 끓는 물에 살짝 데친 뒤 헹구면 잡내가 줄고 국물이 깔끔해집니다.",
      },
      {
        title: "양념 넣고 끓이기",
        time: "15분",
        icon: "steam",
        body: "냄비에 닭, 물 600ml, 간장 양념을 넣고 중불에서 끓여 고기에 먼저 맛을 입힙니다.",
      },
      {
        title: "채소 넣기",
        time: "15분",
        icon: "carrot",
        body: "감자, 당근, 양파를 넣고 뚜껑을 덮어 익힙니다. 감자가 부드러워질 때까지 끓입니다.",
      },
      {
        title: "당면 넣고 졸이기",
        time: "8분",
        icon: "noodle",
        body: "불린 당면과 대파를 넣고 양념이 자작하게 남을 때까지 저어가며 졸입니다.",
      },
      {
        title: "마무리 향 내기",
        time: "2분",
        icon: "plate",
        body: "불을 끄고 참기름과 깨를 넣습니다. 매콤함이 필요하면 청양고추를 얹어 완성합니다.",
      },
    ],
    finish:
      "닭과 감자는 높게 쌓고 당면은 앞쪽에 자연스럽게 보이게 담습니다. 윤기 있는 소스를 한 번 끼얹으면 완성 연출사진이 풍성해집니다.",
    tips: [
      "색을 진하게 내고 싶으면 마지막 5분은 뚜껑을 열고 졸입니다.",
      "당면은 오래 끓이면 불기 때문에 마지막에 넣어야 식감이 좋습니다.",
      "남은 양념은 밥과 김가루를 넣어 볶음밥으로 마무리하기 좋습니다.",
    ],
  },
];

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const imageDataUri = (filename) => {
  const buffer = readFileSync(path.join(recipeDir, filename));
  return `data:image/png;base64,${buffer.toString("base64")}`;
};

const wrapText = (text, maxChars) => {
  const words = String(text).split(" ");
  const lines = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) lines.push(line);
  return lines;
};

const textLines = (lines, x, y, className, lineHeight = 36) =>
  lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" class="${className}">${escapeXml(line)}</text>`,
    )
    .join("\n");

const pill = (x, y, label, fill = "#F0FDF4", color = "#166534") => `
  <rect x="${x}" y="${y}" width="${label.length * 22 + 44}" height="46" rx="23" fill="${fill}"/>
  <text x="${x + 22}" y="${y + 31}" class="pill" fill="${color}">${escapeXml(label)}</text>
`;

const sectionTitle = (y, title, subtitle) => `
  <text x="${MARGIN}" y="${y}" class="section">${escapeXml(title)}</text>
  <text x="${MARGIN}" y="${y + 42}" class="small">${escapeXml(subtitle)}</text>
`;

const icon = (type, x, y) => {
  const common = `stroke-linecap="round" stroke-linejoin="round"`;
  if (type === "pot") {
    return `
      <ellipse cx="${x + 48}" cy="${y + 62}" rx="58" ry="30" fill="#111827"/>
      <rect x="${x + 2}" y="${y + 30}" width="92" height="54" rx="18" fill="#374151"/>
      <path d="M${x + 12} ${y + 36}h72" stroke="#64748B" stroke-width="8" ${common}/>
      <path d="M${x + 24} ${y + 18}c-10-18 14-24 5-40M${x + 52} ${y + 18}c-11-18 16-26 6-44M${x + 80} ${y + 18}c-9-16 13-22 5-38" stroke="${ORANGE}" stroke-width="8" ${common}/>
    `;
  }
  if (type === "steam") {
    return `
      <rect x="${x + 8}" y="${y + 34}" width="98" height="66" rx="18" fill="#FFEDD5"/>
      <path d="M${x + 24} ${y + 62}h66M${x + 30} ${y + 82}h50" stroke="${ORANGE}" stroke-width="9" ${common}/>
      <path d="M${x + 24} ${y + 20}c-11-18 16-25 5-43M${x + 58} ${y + 20}c-13-20 20-28 7-50M${x + 92} ${y + 20}c-9-17 14-23 5-39" stroke="#FDBA74" stroke-width="8" ${common}/>
    `;
  }
  if (type === "timer") {
    return `
      <circle cx="${x + 56}" cy="${y + 58}" r="48" fill="#DCFCE7"/>
      <circle cx="${x + 56}" cy="${y + 58}" r="32" fill="#FFFFFF" stroke="${GREEN}" stroke-width="7"/>
      <path d="M${x + 56} ${y + 58}V${y + 36}M${x + 56} ${y + 58}l18 12" stroke="${GREEN}" stroke-width="7" ${common}/>
    `;
  }
  if (type === "knife") {
    return `
      <rect x="${x + 20}" y="${y + 74}" width="92" height="18" rx="9" fill="#E5E7EB"/>
      <path d="M${x + 22} ${y + 34}L${x + 94} ${y + 62}L${x + 68} ${y + 90}L${x + 8} ${y + 48}Z" fill="#CBD5E1"/>
      <rect x="${x + 70}" y="${y + 60}" width="42" height="18" rx="9" fill="#A16207" transform="rotate(24 ${x + 70} ${y + 60})"/>
    `;
  }
  if (type === "plate") {
    return `
      <ellipse cx="${x + 56}" cy="${y + 68}" rx="62" ry="30" fill="#E2E8F0"/>
      <ellipse cx="${x + 56}" cy="${y + 62}" rx="48" ry="20" fill="#FFFFFF"/>
      <circle cx="${x + 42}" cy="${y + 52}" r="14" fill="${ORANGE}"/>
      <circle cx="${x + 66}" cy="${y + 54}" r="15" fill="${GREEN}"/>
      <rect x="${x + 73}" y="${y + 39}" width="36" height="12" rx="6" fill="#F59E0B" transform="rotate(24 ${x + 73} ${y + 39})"/>
    `;
  }
  if (type === "bowl") {
    return `
      <ellipse cx="${x + 56}" cy="${y + 78}" rx="62" ry="26" fill="#CBD5E1"/>
      <path d="M${x + 8} ${y + 48}h96c-5 45-25 67-48 67S${x + 13} ${y + 93} ${x + 8} ${y + 48}Z" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="6"/>
      <circle cx="${x + 56}" cy="${y + 45}" r="26" fill="#FACC15"/>
      <path d="M${x + 30} ${y + 44}h52" stroke="#22C55E" stroke-width="7" ${common}/>
    `;
  }
  if (type === "pan") {
    return `
      <ellipse cx="${x + 48}" cy="${y + 70}" rx="56" ry="24" fill="#111827"/>
      <ellipse cx="${x + 48}" cy="${y + 64}" rx="44" ry="17" fill="#374151"/>
      <rect x="${x + 86}" y="${y + 56}" width="54" height="15" rx="7" fill="#111827"/>
      <path d="M${x + 24} ${y + 36}c22 20 44 20 66 0" stroke="#FACC15" stroke-width="12" ${common}/>
    `;
  }
  if (type === "roll") {
    return `
      <rect x="${x + 14}" y="${y + 32}" width="92" height="68" rx="28" fill="#FACC15"/>
      <path d="M${x + 28} ${y + 45}c24 22 48 22 72 0M${x + 28} ${y + 66}c24 22 48 22 72 0" stroke="#FEF3C7" stroke-width="8" ${common}/>
      <circle cx="${x + 48}" cy="${y + 62}" r="5" fill="#22C55E"/>
      <circle cx="${x + 74}" cy="${y + 72}" r="5" fill="#F97316"/>
    `;
  }
  if (type === "carrot") {
    return `
      <path d="M${x + 24} ${y + 34}c62 0 86 34 56 76-48-12-72-36-56-76Z" fill="#F97316"/>
      <path d="M${x + 78} ${y + 30}c26-22 54-18 70 4-34 20-58 22-70-4Z" fill="#22C55E"/>
      <path d="M${x + 80} ${y + 32}c-4 30-16 52-38 68" stroke="#FDBA74" stroke-width="7" ${common}/>
    `;
  }
  if (type === "noodle") {
    return `
      <ellipse cx="${x + 58}" cy="${y + 82}" rx="62" ry="24" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="6"/>
      <path d="M${x + 22} ${y + 56}c22 20 44-20 66 0s34 20 54 0M${x + 26} ${y + 74}c22 20 44-20 66 0s30 18 46 0" stroke="#F59E0B" stroke-width="8" fill="none" ${common}/>
    `;
  }
  return "";
};

const stepCard = (step, index, y) => {
  const lines = wrapText(step.body, 38);
  const height = Math.max(172, 104 + lines.length * 34);
  return {
    height,
    svg: `
      <rect x="${MARGIN}" y="${y}" width="${CONTENT}" height="${height}" rx="28" fill="#FFFFFF" stroke="${BORDER}" stroke-width="2"/>
      <circle cx="${MARGIN + 58}" cy="${y + 62}" r="34" fill="${GREEN}"/>
      <text x="${MARGIN + 48}" y="${y + 73}" class="stepNo">${index}</text>
      <text x="${MARGIN + 112}" y="${y + 52}" class="stepTitle">${escapeXml(step.title)}</text>
      <rect x="${MARGIN + 112}" y="${y + 70}" width="${step.time.length * 18 + 42}" height="34" rx="17" fill="#FFF7ED"/>
      <text x="${MARGIN + 133}" y="${y + 94}" class="time">${escapeXml(step.time)}</text>
      ${textLines(lines, MARGIN + 112, y + 132, "body", 34)}
      ${icon(step.icon, MARGIN + CONTENT - 146, y + 42)}
    `,
  };
};

const ingredientCard = (group, x, y, width) => {
  const itemLines = group.items.flatMap((item) => wrapText(`· ${item}`, 17));
  const height = 96 + itemLines.length * 30;
  return {
    height,
    svg: `
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="24" fill="#FFFFFF" stroke="${BORDER}" stroke-width="2"/>
      <text x="${x + 28}" y="${y + 44}" class="cardTitle">${escapeXml(group.title)}</text>
      ${textLines(itemLines, x + 28, y + 84, "bodySmall", 30)}
    `,
  };
};

const prepList = (items, y) => {
  const rowHeight = 70;
  const rows = items
    .map(
      (item, index) => `
        <circle cx="${MARGIN + 30}" cy="${y + 37 + index * rowHeight}" r="18" fill="#DCFCE7"/>
        <text x="${MARGIN + 22}" y="${y + 46 + index * rowHeight}" class="prepNo">${index + 1}</text>
        ${textLines(wrapText(item, 43), MARGIN + 66, y + 45 + index * rowHeight, "body", 34)}
      `,
    )
    .join("\n");
  return {
    height: items.length * rowHeight + 16,
    svg: `
      <rect x="${MARGIN}" y="${y}" width="${CONTENT}" height="${items.length * rowHeight + 16}" rx="26" fill="#F9FAFB" stroke="${BORDER}" stroke-width="2"/>
      ${rows}
    `,
  };
};

const buildRecipeSvg = (recipe) => {
  const heroUri = imageDataUri(recipe.hero);
  const parts = [];
  let y = 0;

  y = 86;
  parts.push(pill(MARGIN, y, "집밥노트 상세 레시피"));
  y += 108;
  parts.push(`<text x="${MARGIN}" y="${y}" class="title">${escapeXml(recipe.title)}</text>`);
  y += 48;
  parts.push(`<text x="${MARGIN}" y="${y}" class="subtitle">${escapeXml(recipe.subtitle)}</text>`);
  y += 42;
  let pillX = MARGIN;
  for (const meta of recipe.meta) {
    parts.push(pill(pillX, y, meta, "#F0FDF4", "#166534"));
    pillX += meta.length * 22 + 58;
  }
  y += 78;

  parts.push(`
    <clipPath id="heroClip-${recipe.slug}"><rect x="${MARGIN}" y="${y}" width="${CONTENT}" height="536" rx="34"/></clipPath>
    <image x="${MARGIN}" y="${y}" width="${CONTENT}" height="536" href="${heroUri}" preserveAspectRatio="xMidYMid slice" clip-path="url(#heroClip-${recipe.slug})"/>
    <rect x="${MARGIN}" y="${y + 358}" width="${CONTENT}" height="178" rx="34" fill="url(#heroFade)"/>
    <text x="${MARGIN + 42}" y="${y + 432}" class="heroText">완성 연출사진</text>
    ${textLines(wrapText(recipe.finish, 34).slice(0, 2), MARGIN + 42, y + 478, "heroSmall", 32)}
  `);
  y += 604;

  parts.push(`
    <rect x="${MARGIN}" y="${y}" width="${CONTENT}" height="132" rx="28" fill="#F9FAFB" stroke="${BORDER}" stroke-width="2"/>
    <text x="${MARGIN + 36}" y="${y + 50}" class="cardTitle">레시피 요약</text>
    ${textLines(wrapText(recipe.summary, 44), MARGIN + 36, y + 92, "body", 34)}
  `);
  y += 202;

  parts.push(sectionTitle(y, "1. 재료 한눈에", "냉장고에서 꺼낼 재료와 양념을 먼저 확인하세요."));
  y += 82;
  const colGap = 24;
  const colWidth = (CONTENT - colGap) / 2;
  const firstIngredient = ingredientCard(recipe.ingredientGroups[0], MARGIN, y, colWidth);
  const secondIngredient = ingredientCard(recipe.ingredientGroups[1], MARGIN + colWidth + colGap, y, colWidth);
  parts.push(firstIngredient.svg, secondIngredient.svg);
  const thirdY = y + Math.max(firstIngredient.height, secondIngredient.height) + 24;
  const thirdIngredient = ingredientCard(recipe.ingredientGroups[2], MARGIN, thirdY, CONTENT);
  parts.push(thirdIngredient.svg);
  y = thirdY + thirdIngredient.height + 74;

  parts.push(sectionTitle(y, "2. 손질 순서", "익히기 전에 해두면 조리 흐름이 끊기지 않습니다."));
  y += 82;
  const prep = prepList(recipe.prep, y);
  parts.push(prep.svg);
  y += prep.height + 74;

  parts.push(sectionTitle(y, "3. 조리 과정", "재료가 완성 요리로 바뀌는 흐름을 단계별로 따라가세요."));
  y += 82;
  recipe.steps.forEach((step, index) => {
    const card = stepCard(step, index + 1, y);
    parts.push(card.svg);
    y += card.height + 22;
  });
  y += 52;

  parts.push(sectionTitle(y, "4. 완성 연출", "상세페이지 대표 이미지처럼 담는 방법입니다."));
  y += 82;
  parts.push(`
    <rect x="${MARGIN}" y="${y}" width="${CONTENT}" height="262" rx="30" fill="#FFF7ED" stroke="#FED7AA" stroke-width="2"/>
    <text x="${MARGIN + 36}" y="${y + 55}" class="cardTitle">플레이팅 포인트</text>
    ${textLines(wrapText(recipe.finish, 38), MARGIN + 36, y + 98, "body", 34)}
    <rect x="${MARGIN + CONTENT - 214}" y="${y + 54}" width="152" height="152" rx="76" fill="#FFFFFF"/>
    ${icon("plate", MARGIN + CONTENT - 198, y + 80)}
  `);
  y += 330;

  parts.push(sectionTitle(y, "5. 맛 보정과 보관", "마지막 간 조절과 남은 음식 활용 팁입니다."));
  y += 82;
  const tipRows = recipe.tips
    .map((tip, index) => {
      const rowY = y + index * 102;
      return `
        <rect x="${MARGIN}" y="${rowY}" width="${CONTENT}" height="82" rx="24" fill="#FFFFFF" stroke="${BORDER}" stroke-width="2"/>
        <circle cx="${MARGIN + 38}" cy="${rowY + 41}" r="18" fill="${ORANGE}"/>
        <text x="${MARGIN + 31}" y="${rowY + 50}" class="prepNo">${index + 1}</text>
        ${textLines(wrapText(tip, 43), MARGIN + 74, rowY + 50, "body", 34)}
      `;
    })
    .join("\n");
  parts.push(tipRows);
  y += recipe.tips.length * 102 + 70;

  parts.push(`
    <rect x="${MARGIN}" y="${y}" width="${CONTENT}" height="76" rx="38" fill="${GREEN}"/>
    <text x="${MARGIN + 52}" y="${y + 49}" class="footer">집밥노트 · 냉장고 재료로 오늘의 집밥 완성</text>
  `);
  y += 132;

  const height = Math.max(4200, y + 40);
  const background = `
    <rect width="${WIDTH}" height="${height}" fill="${BG}"/>
    <circle cx="980" cy="138" r="170" fill="#DCFCE7"/>
    <circle cx="70" cy="${height - 90}" r="210" fill="#FFEDD5"/>
    <rect x="40" y="40" width="1000" height="${height - 80}" rx="36" fill="#FFFFFF" filter="url(#shadow)"/>
  `;

  return `
<svg width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#111827" flood-opacity="0.10"/>
    </filter>
    <linearGradient id="heroFade" x1="0" y1="0" x2="0" y2="1">
      <stop stop-color="#111827" stop-opacity="0"/>
      <stop offset="1" stop-color="#111827" stop-opacity="0.64"/>
    </linearGradient>
    <style>
      .font { font-family: Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", Arial, sans-serif; letter-spacing: 0; }
      text { font-family: Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", Arial, sans-serif; letter-spacing: 0; }
      .title { font-size: 68px; font-weight: 900; fill: ${TEXT}; }
      .subtitle { font-size: 28px; font-weight: 600; fill: ${BODY}; }
      .pill { font-size: 23px; font-weight: 800; }
      .section { font-size: 36px; font-weight: 900; fill: ${TEXT}; }
      .small { font-size: 23px; font-weight: 600; fill: ${MUTED}; }
      .cardTitle { font-size: 29px; font-weight: 900; fill: ${TEXT}; }
      .body { font-size: 25px; font-weight: 600; fill: ${BODY}; }
      .bodySmall { font-size: 22px; font-weight: 600; fill: ${BODY}; }
      .stepTitle { font-size: 31px; font-weight: 900; fill: ${TEXT}; }
      .stepNo { font-size: 28px; font-weight: 900; fill: #FFFFFF; }
      .prepNo { font-size: 22px; font-weight: 900; fill: #FFFFFF; }
      .time { font-size: 20px; font-weight: 900; fill: #C2410C; }
      .heroText { font-size: 34px; font-weight: 900; fill: #FFFFFF; }
      .heroSmall { font-size: 24px; font-weight: 700; fill: #FFFFFF; }
      .footer { font-size: 25px; font-weight: 900; fill: #FFFFFF; }
    </style>
  </defs>
  ${background}
  ${parts.join("\n")}
</svg>
`.trim();
};

mkdirSync(recipeDir, { recursive: true });

for (const recipe of recipes) {
  const svg = buildRecipeSvg(recipe);
  const svgPath = path.join(recipeDir, `${recipe.slug}-recipe-detail.svg`);
  writeFileSync(svgPath, svg, "utf8");
  console.log(svgPath);
}
