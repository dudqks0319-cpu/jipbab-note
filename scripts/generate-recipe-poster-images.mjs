// 이 스크립트는 참고 이미지처럼 레시피 전체가 보이는 포스터형 에셋을 생성합니다.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const recipeDir = path.resolve(__dirname, "../public/images/recipes");

const WIDTH = 1600;
const M = 44;
const GAP = 18;
const CONTENT = WIDTH - M * 2;
const GREEN = "#22C55E";
const INK = "#2F2F2F";
const BODY = "#595959";
const MUTED = "#898989";
const LINE = "#D7D1C7";
const PAPER = "#F7F3EA";
const PANEL = "#FCFAF5";

const recipes = [
  {
    slug: "bossam",
    title: "보쌈 완벽 레시피",
    eyebrow: "집에서도 전문점 맛 그대로!",
    subtitle: "재료부터 완성까지, 모든 과정을 한눈에",
    hero: "bossam-hero.png",
    meta: [
      ["소요시간", "약 2시간"],
      ["난이도", "중"],
      ["분량", "2~3인분"],
    ],
    ingredients: [
      ["pork", "돼지고기 앞다리살", "1kg"],
      ["kimchi", "김치", "잘 익은 배추김치 1/4포기"],
      ["greens", "쌈채소", "상추, 깻잎, 마늘, 고추"],
      ["aromatics", "보쌈용 부재료", "양파 1개, 대파 1대, 통마늘 10알, 생강 1쪽"],
      ["spices", "삶을 때 향신 재료", "된장 2큰술, 월계수잎 2장, 통후추 1작은술, 커피 1작은술"],
      ["sauce", "새우젓 소스", "새우젓 2큰술, 다진마늘 1작은술, 다진파 1큰술, 고춧가루 약간"],
    ],
    steps: [
      ["soak", "01. 고기 핏물 빼기", "돼지고기를 찬물에 1시간 담가 핏물을 빼주세요."],
      ["pot", "02. 고기 삶기 준비", "냄비에 고기가 잠길 만큼 물을 붓고 양파, 대파, 통마늘, 생강을 넣어주세요."],
      ["spices", "03. 향신 재료 추가", "물이 끓기 시작하면 된장, 월계수잎, 통후추, 커피를 넣어 향을 더해줍니다."],
      ["boil", "04. 고기 삶기", "핏물 뺀 고기를 넣고 센 불에서 끓이다가 중약불로 줄여 50~60분 푹 삶아주세요."],
      ["check", "05. 고기 익힘 확인", "젓가락으로 찔러 핏물이 나오지 않으면 다 익은 상태입니다."],
      ["rest", "06. 뜸들이기", "불을 끄고 뚜껑을 덮은 채 10~15분간 뜸을 들여 육즙을 가둡니다."],
      ["kimchi", "07. 김치 준비", "잘 익은 김치를 먹기 좋은 크기로 썰어 준비합니다."],
      ["sauce", "08. 새우젓 소스 만들기", "새우젓, 다진마늘, 다진파, 청양고추를 섞어 소스를 만듭니다."],
      ["slice", "09. 고기 썰기", "뜸들인 고기를 꺼내 결 반대 방향으로 먹기 좋게 썰어줍니다."],
      ["plate", "10. 플레이팅", "접시에 고기, 김치, 쌈채소, 마늘, 고추를 보기 좋게 담아줍니다."],
    ],
    tips: [
      "핏물 제거를 충분히 해야 잡내가 나지 않습니다.",
      "된장과 커피는 고기의 잡내를 잡고 풍미를 깊게 만듭니다.",
      "뜸들이는 과정이 육즙을 가두어 부드러운 식감을 살립니다.",
      "김치는 너무 신 것보다 적당히 익은 것이 잘 어울립니다.",
    ],
    pairings: [
      ["radish", "무말랭이 무침"],
      ["scallion", "파절이"],
      ["radish", "쌈무"],
      ["greens", "부추무침"],
    ],
    eat: [
      "쌈채소를 깔고 고기 한 점과 김치를 올립니다.",
      "마늘, 고추를 올리고 새우젓 소스를 살짝 얹습니다.",
      "한 입에 쏙 맛있게 즐기세요!",
    ],
    drinks: [
      ["tea", "약식 차"],
      ["kimchi", "보쌈 무김치"],
      ["noodle", "쟁반국수"],
      ["soup", "동치미국물"],
    ],
    nutrition: [["열량", "580 kcal"], ["단백질", "38 g"], ["지방", "42 g"], ["탄수화물", "10 g"]],
    storage: ["남은 고기는 밀폐용기에 담아 냉장 보관합니다.", "김치는 따로 보관하면 신선도를 유지할 수 있습니다."],
    note: "집에서 든든한 한 상,\n가족과 함께 즐겨보세요!",
  },
  {
    slug: "gyeran-mari",
    title: "계란말이 완벽 레시피",
    eyebrow: "도시락 반찬도 식탁 반찬도 OK!",
    subtitle: "부드러운 달걀물부터 예쁜 단면까지 한눈에",
    hero: "gyeran-mari.png",
    meta: [
      ["소요시간", "약 15분"],
      ["난이도", "쉬움"],
      ["분량", "2인분"],
    ],
    ingredients: [
      ["egg", "달걀", "5개"],
      ["carrot", "당근", "잘게 다진 것 2큰술"],
      ["scallion", "대파 또는 쪽파", "잘게 다진 것 2큰술"],
      ["onion", "양파", "잘게 다진 것 1큰술"],
      ["seasoning", "기본 간", "소금 1/4작은술, 맛술 1큰술, 우유 2큰술"],
      ["oil", "팬 준비", "식용유 약간, 키친타월"],
    ],
    steps: [
      ["carrot", "01. 채소 다지기", "당근, 대파, 양파를 아주 잘게 다져 달걀물에 섞기 좋게 준비합니다."],
      ["egg", "02. 달걀 풀기", "달걀 5개에 소금, 맛술, 우유를 넣고 고르게 풀어줍니다."],
      ["sieve", "03. 체에 내리기", "알끈을 제거하면 표면이 매끈하고 부드러운 계란말이가 됩니다."],
      ["pan", "04. 팬 예열하기", "중약불로 예열한 팬에 기름을 얇게 발라줍니다."],
      ["pour", "05. 얇게 붓기", "달걀물을 얇게 붓고 가장자리가 익기 시작하면 끝부터 말아줍니다."],
      ["roll", "06. 반복해서 말기", "말아둔 계란을 한쪽으로 밀고 달걀물을 다시 부어 3~4번 반복합니다."],
      ["shape", "07. 모양 잡기", "팬 가장자리나 김발로 네모난 형태를 잡고 잠시 식혀줍니다."],
      ["slice", "08. 썰어서 담기", "1.5cm 두께로 썰어 접시에 가지런히 담아 완성합니다."],
    ],
    tips: [
      "불이 세면 겉만 타고 속이 비어 보이니 중약불을 유지합니다.",
      "달걀물이 완전히 익기 전에 말아야 층이 잘 붙습니다.",
      "채소는 작게 다질수록 단면이 깔끔하게 나옵니다.",
      "우유를 조금 넣으면 식감이 더 부드러워집니다.",
    ],
    pairings: [
      ["kimchi", "김치"],
      ["rice", "흰밥"],
      ["greens", "샐러드"],
      ["sauce", "간장 소스"],
    ],
    eat: [
      "따뜻할 때 한 조각씩 집어 먹으면 가장 부드럽습니다.",
      "김밥 속재료로 넣으면 단면 색이 예쁩니다.",
      "도시락에 넣을 땐 완전히 식힌 뒤 담아주세요.",
    ],
    drinks: [
      ["rice", "흰밥"],
      ["kimchi", "배추김치"],
      ["soup", "맑은 장국"],
      ["greens", "오이무침"],
    ],
    nutrition: [["열량", "210 kcal"], ["단백질", "15 g"], ["지방", "14 g"], ["탄수화물", "4 g"]],
    storage: ["남은 계란말이는 밀폐용기에 담아 냉장 보관합니다.", "다시 먹을 때는 약불 팬에 살짝 데우면 촉촉합니다."],
    note: "노란 단면이 예쁜\n매일 반찬 완성!",
  },
  {
    slug: "jjimdak",
    title: "찜닭 완벽 레시피",
    eyebrow: "달콤짭짤 양념이 쏙 배는 메인요리",
    subtitle: "닭 손질부터 당면 넣는 타이밍까지 한눈에",
    hero: "jjimdak-hero.png",
    meta: [
      ["소요시간", "약 45분"],
      ["난이도", "중"],
      ["분량", "3인분"],
    ],
    ingredients: [
      ["chicken", "닭볶음탕용 닭", "800g"],
      ["vegetable", "감자·당근·양파", "감자 2개, 당근 1/2개, 양파 1개"],
      ["noodle", "당면", "100g, 미지근한 물에 불리기"],
      ["scallion", "대파·고추", "대파 1대, 청양고추 1개"],
      ["sauce", "간장 양념", "진간장 6큰술, 맛술 3큰술, 설탕 2큰술, 올리고당 1큰술"],
      ["seasoning", "향과 마무리", "다진마늘 1.5큰술, 후추, 참기름, 깨"],
    ],
    steps: [
      ["noodle", "01. 당면 불리기", "당면은 미지근한 물에 20분 이상 불려둡니다."],
      ["pot", "02. 닭 데치기", "닭은 끓는 물에 3분 데친 뒤 찬물에 헹궈 불순물을 제거합니다."],
      ["sauce", "03. 양념장 만들기", "간장, 맛술, 설탕, 올리고당, 다진마늘, 후추를 섞어 양념장을 만듭니다."],
      ["vegetable", "04. 채소 손질", "감자와 당근은 큼직하게, 양파와 대파는 한입 크기로 썹니다."],
      ["boil", "05. 닭과 양념 끓이기", "냄비에 닭, 물 600ml, 양념장을 넣고 중불에서 끓입니다."],
      ["vegetable", "06. 채소 넣기", "감자, 당근, 양파를 넣고 뚜껑을 덮어 부드럽게 익힙니다."],
      ["noodle", "07. 당면 넣고 졸이기", "불린 당면과 대파를 넣고 양념이 자작하게 남을 때까지 졸입니다."],
      ["plate", "08. 마무리 플레이팅", "참기름과 깨를 넣고 청양고추를 올려 윤기 있게 담아줍니다."],
    ],
    tips: [
      "닭을 한 번 데치면 잡내와 불순물이 줄어 국물이 깔끔합니다.",
      "당면은 마지막에 넣어야 불지 않고 탱글한 식감이 납니다.",
      "색을 진하게 내고 싶으면 마지막 5분은 뚜껑을 열고 졸입니다.",
      "남은 양념은 밥과 김가루를 넣어 볶음밥으로 마무리하기 좋습니다.",
    ],
    pairings: [
      ["rice", "흰밥"],
      ["kimchi", "김치"],
      ["greens", "오이무침"],
      ["soup", "동치미국물"],
    ],
    eat: [
      "닭고기와 감자를 먼저 담고 당면은 앞쪽에 자연스럽게 올립니다.",
      "윤기 있는 소스를 한 번 끼얹으면 완성 사진이 풍성해집니다.",
      "매콤하게 먹고 싶으면 청양고추를 마지막에 더하세요.",
    ],
    drinks: [
      ["rice", "흰밥"],
      ["kimchi", "배추김치"],
      ["greens", "부추무침"],
      ["tea", "보리차"],
    ],
    nutrition: [["열량", "620 kcal"], ["단백질", "42 g"], ["지방", "24 g"], ["탄수화물", "58 g"]],
    storage: ["남은 찜닭은 당면을 따로 덜어 보관하면 덜 붇습니다.", "냉장 보관 후 데울 때 물을 조금 더해 약불로 데웁니다."],
    note: "윤기 있는 양념으로\n든든한 한 끼 완성!",
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

const textLines = (lines, x, y, className, lineHeight) =>
  lines
    .map((line, index) => `<text x="${x}" y="${y + index * lineHeight}" class="${className}">${escapeXml(line)}</text>`)
    .join("\n");

const panelFrame = (x, y, w, h) => `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#EDE8DD"/>
  <rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" rx="2" fill="#F8F3E8"/>
`;

const foodVisual = (kind, x, y, w, h) => {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const plate = `<ellipse cx="${cx}" cy="${cy + h * 0.18}" rx="${w * 0.33}" ry="${h * 0.13}" fill="#DED8CA"/><ellipse cx="${cx}" cy="${cy + h * 0.13}" rx="${w * 0.29}" ry="${h * 0.11}" fill="#FFFDF8"/>`;
  const greens = `<path d="M${cx - w * 0.18} ${cy + h * 0.08}c-56-46-6-91 40-40 44-48 89-2 43 42z" fill="#5DBB59"/><path d="M${cx + w * 0.02} ${cy + h * 0.04}c-35-42 26-78 62-28 36-20 72 18 28 54z" fill="#2F9E44"/>`;
  if (["pork", "bossam", "slice"].includes(kind)) {
    return `${plate}<rect x="${cx - w * 0.22}" y="${cy - h * 0.08}" width="${w * 0.43}" height="${h * 0.18}" rx="20" fill="#D8A08F"/><path d="M${cx - w * 0.18} ${cy - h * 0.03}c45-18 88-18 132 0" stroke="#F2D5C9" stroke-width="10" stroke-linecap="round"/><rect x="${cx - w * 0.16}" y="${cy + h * 0.03}" width="${w * 0.34}" height="${h * 0.07}" rx="14" fill="#EBC7B8"/>`;
  }
  if (kind === "chicken") {
    return `${plate}<circle cx="${cx - w * 0.08}" cy="${cy}" r="${h * 0.16}" fill="#B96C36"/><circle cx="${cx + w * 0.08}" cy="${cy + h * 0.02}" r="${h * 0.15}" fill="#D08442"/><rect x="${cx - w * 0.22}" y="${cy + h * 0.08}" width="${w * 0.45}" height="${h * 0.07}" rx="16" fill="#7C4A24"/><circle cx="${cx + w * 0.19}" cy="${cy - h * 0.08}" r="${h * 0.09}" fill="#F97316"/>`;
  }
  if (kind === "egg") {
    return `${plate}<ellipse cx="${cx}" cy="${cy}" rx="${w * 0.26}" ry="${h * 0.18}" fill="#FFD84D"/><path d="M${cx - w * 0.2} ${cy - h * 0.01}c58 28 116 28 174 0M${cx - w * 0.2} ${cy + h * 0.07}c58 28 116 28 174 0" stroke="#FFF4B8" stroke-width="10" stroke-linecap="round"/><circle cx="${cx - 16}" cy="${cy - 4}" r="7" fill="#22C55E"/><circle cx="${cx + 35}" cy="${cy + 20}" r="7" fill="#F97316"/>`;
  }
  if (kind === "kimchi") {
    return `${plate}<path d="M${cx - w * 0.24} ${cy + h * 0.12}c22-78 126-74 164-10-47 34-118 36-164 10z" fill="#D83A24"/><path d="M${cx - w * 0.14} ${cy - h * 0.04}h${w * 0.27}M${cx - w * 0.09} ${cy + h * 0.05}h${w * 0.24}" stroke="#FFB35C" stroke-width="8" stroke-linecap="round"/>`;
  }
  if (kind === "greens") {
    return `${plate}${greens}<circle cx="${cx + w * 0.18}" cy="${cy + h * 0.06}" r="13" fill="#F8F4E7"/><circle cx="${cx + w * 0.26}" cy="${cy + h * 0.06}" r="10" fill="#E7E0CF"/>`;
  }
  if (kind === "aromatics" || kind === "scallion") {
    return `${plate}<rect x="${cx - w * 0.2}" y="${cy - h * 0.03}" width="${w * 0.44}" height="15" rx="8" fill="#7BC96F" transform="rotate(-10 ${cx} ${cy})"/><rect x="${cx - w * 0.05}" y="${cy + h * 0.02}" width="${w * 0.36}" height="15" rx="8" fill="#53A653" transform="rotate(12 ${cx} ${cy})"/><circle cx="${cx - w * 0.18}" cy="${cy + h * 0.1}" r="20" fill="#F5E5C4"/><circle cx="${cx + w * 0.02}" cy="${cy + h * 0.08}" r="15" fill="#F8F4E7"/>`;
  }
  if (kind === "spices" || kind === "seasoning") {
    return `${plate}<circle cx="${cx - w * 0.12}" cy="${cy - h * 0.02}" r="36" fill="#B9824B"/><circle cx="${cx + w * 0.08}" cy="${cy}" r="34" fill="#7B4A2B"/><circle cx="${cx + w * 0.22}" cy="${cy + h * 0.08}" r="24" fill="#C8A06A"/><path d="M${cx - 36} ${cy + 54}h112" stroke="#6B4423" stroke-width="7" stroke-linecap="round"/>`;
  }
  if (kind === "sauce") {
    return `${plate}<ellipse cx="${cx}" cy="${cy}" rx="${w * 0.22}" ry="${h * 0.13}" fill="#B87945"/><ellipse cx="${cx}" cy="${cy - 8}" rx="${w * 0.18}" ry="${h * 0.08}" fill="#8B5E34"/><circle cx="${cx - 28}" cy="${cy - 12}" r="6" fill="#F8F4E7"/><circle cx="${cx + 18}" cy="${cy - 10}" r="6" fill="#22C55E"/>`;
  }
  if (kind === "vegetable" || kind === "carrot") {
    return `${plate}<path d="M${cx - 70} ${cy - 25}c74-8 111 35 65 88-58-15-91-46-65-88z" fill="#F97316"/><path d="M${cx + 12} ${cy - 38}c37-28 73-16 91 16-43 26-76 28-91-16z" fill="#22C55E"/><circle cx="${cx - 8}" cy="${cy + 26}" r="31" fill="#E9C46A"/>`;
  }
  if (kind === "noodle") {
    return `${plate}<path d="M${cx - w * 0.22} ${cy}c38 35 76-35 114 0s60 30 94-1M${cx - w * 0.22} ${cy + 28}c38 35 76-35 114 0s60 30 94-1" stroke="#D9982F" stroke-width="10" fill="none" stroke-linecap="round"/>`;
  }
  if (kind === "oil") {
    return `${plate}<path d="M${cx} ${cy - 54}c48 58 55 103 0 122-55-19-48-64 0-122z" fill="#FBBF24"/><path d="M${cx - 28} ${cy + 26}c18 14 38 14 56 0" stroke="#FFF4B8" stroke-width="8" stroke-linecap="round"/>`;
  }
  if (kind === "rice") {
    return `${plate}<ellipse cx="${cx}" cy="${cy - 4}" rx="${w * 0.24}" ry="${h * 0.16}" fill="#FFFFFF"/><path d="M${cx - 78} ${cy + 10}c42 26 112 26 154 0v50H${cx - 78}z" fill="#E5E7EB"/>`;
  }
  if (kind === "radish") {
    return `${plate}<circle cx="${cx}" cy="${cy}" r="52" fill="#FFFDF8"/><path d="M${cx - 48} ${cy + 18}c38 22 78 22 116 0" stroke="#C8D1D8" stroke-width="8" stroke-linecap="round"/>`;
  }
  if (kind === "tea") {
    return `${plate}<rect x="${cx - 50}" y="${cy - 42}" width="96" height="86" rx="18" fill="#EFE8DB"/><path d="M${cx + 42} ${cy - 16}c48-8 48 54 0 46" stroke="#CBBFAE" stroke-width="11" fill="none"/><path d="M${cx - 20} ${cy - 62}c-14-22 17-32 5-58M${cx + 16} ${cy - 62}c-14-22 17-32 5-58" stroke="#CBBFAE" stroke-width="8" stroke-linecap="round"/>`;
  }
  if (kind === "soup") {
    return `${plate}<ellipse cx="${cx}" cy="${cy}" rx="${w * 0.25}" ry="${h * 0.14}" fill="#D8E7D0"/><ellipse cx="${cx}" cy="${cy - 7}" rx="${w * 0.22}" ry="${h * 0.1}" fill="#F3F5DC"/><circle cx="${cx + 28}" cy="${cy - 16}" r="8" fill="#22C55E"/>`;
  }
  if (kind === "check") {
    return `${plate}<circle cx="${cx}" cy="${cy}" r="56" fill="#DCFCE7"/><path d="M${cx - 30} ${cy + 2}l20 22 48-56" stroke="${GREEN}" stroke-width="13" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (kind === "rest") {
    return `${plate}<rect x="${cx - 70}" y="${cy - 32}" width="140" height="80" rx="20" fill="#1F2937"/><ellipse cx="${cx}" cy="${cy - 32}" rx="76" ry="24" fill="#374151"/><path d="M${cx - 42} ${cy - 62}c-14-22 17-32 5-58M${cx} ${cy - 62}c-14-22 17-32 5-58M${cx + 42} ${cy - 62}c-14-22 17-32 5-58" stroke="#FDBA74" stroke-width="8" stroke-linecap="round"/>`;
  }
  if (kind === "boil" || kind === "pot") {
    return `${plate}<rect x="${cx - 86}" y="${cy - 28}" width="172" height="86" rx="24" fill="#1F2937"/><ellipse cx="${cx}" cy="${cy - 28}" rx="92" ry="26" fill="#374151"/><path d="M${cx - 50} ${cy - 64}c-14-22 17-32 5-58M${cx} ${cy - 64}c-14-22 17-32 5-58M${cx + 50} ${cy - 64}c-14-22 17-32 5-58" stroke="#FDBA74" stroke-width="8" stroke-linecap="round"/>`;
  }
  if (kind === "sieve") {
    return `${plate}<circle cx="${cx}" cy="${cy}" r="58" fill="#E5E7EB"/><circle cx="${cx}" cy="${cy}" r="42" fill="#FFFDF8"/><path d="M${cx - 24} ${cy - 15}h48M${cx - 30} ${cy + 4}h60M${cx - 20} ${cy + 23}h40" stroke="#CBD5E1" stroke-width="6" stroke-linecap="round"/>`;
  }
  if (kind === "pan" || kind === "pour") {
    return `${plate}<ellipse cx="${cx}" cy="${cy + 22}" rx="92" ry="36" fill="#111827"/><ellipse cx="${cx}" cy="${cy + 12}" rx="72" ry="24" fill="#374151"/><rect x="${cx + 70}" y="${cy + 3}" width="96" height="18" rx="9" fill="#111827"/><path d="M${cx - 52} ${cy}c46 22 92 22 138 0" stroke="#FACC15" stroke-width="13" stroke-linecap="round"/>`;
  }
  if (kind === "roll" || kind === "shape") {
    return `${plate}<rect x="${cx - 96}" y="${cy - 36}" width="192" height="96" rx="42" fill="#FACC15"/><path d="M${cx - 68} ${cy - 10}c45 30 91 30 136 0M${cx - 68} ${cy + 20}c45 30 91 30 136 0" stroke="#FEF3C7" stroke-width="10" stroke-linecap="round"/>`;
  }
  return `${plate}<circle cx="${cx}" cy="${cy}" r="54" fill="#F97316"/><circle cx="${cx + 44}" cy="${cy + 8}" r="32" fill="${GREEN}"/>`;
};

const sectionTitle = (y, number, title, note = "") => `
  <text x="${M}" y="${y}" class="section">${number}. ${escapeXml(title)}</text>
  ${note ? `<text x="${M + 238}" y="${y}" class="sectionNote">${escapeXml(note)}</text>` : ""}
`;

const ingredientCard = ([kind, name, amount], x, y, w, h) => `
  ${panelFrame(x, y, w, h)}
  ${foodVisual(kind, x + 8, y + 8, w - 16, 134)}
  <text x="${x + w / 2}" y="${y + 176}" class="ingTitle" text-anchor="middle">${escapeXml(name)}</text>
  ${textLines(wrapText(amount, 15).slice(0, 2), x + w / 2, y + 204, "ingAmount", 24).replaceAll("<text ", "<text text-anchor=\"middle\" ")}
`;

const stepCard = ([kind, title, body], x, y, w, h) => `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${PANEL}" stroke="${LINE}" stroke-width="1.5"/>
  <rect x="${x}" y="${y}" width="${w}" height="42" fill="#E8E1D5"/>
  <text x="${x + 16}" y="${y + 29}" class="stepHead">${escapeXml(title)}</text>
  ${foodVisual(kind, x + 12, y + 54, w - 24, 138)}
  ${textLines(wrapText(body, 24).slice(0, 3), x + 16, y + 222, "stepBody", 24)}
`;

const smallDish = ([kind, label], x, y, w) => `
  ${foodVisual(kind, x, y, w, 105)}
  <text x="${x + w / 2}" y="${y + 128}" class="smallLabel" text-anchor="middle">${escapeXml(label)}</text>
`;

const buildPoster = (recipe) => {
  const hero = imageDataUri(recipe.hero);
  const parts = [];

  parts.push(`<path d="M0 0h${WIDTH}v438H0z" fill="#F5F1E8"/>`);
  parts.push(`<clipPath id="heroClip"><rect x="780" y="0" width="820" height="438" rx="0"/></clipPath>`);
  parts.push(`<image x="780" y="0" width="820" height="438" href="${hero}" preserveAspectRatio="xMidYMid slice" clip-path="url(#heroClip)"/>`);
  parts.push(`<rect x="0" y="0" width="820" height="438" fill="url(#titleFade)"/>`);
  parts.push(`<text x="76" y="86" class="eyebrow">${escapeXml(recipe.eyebrow)}</text>`);
  parts.push(`<text x="76" y="158" class="posterTitle">${escapeXml(recipe.title)}</text>`);
  parts.push(`<text x="76" y="220" class="posterSubtitle">${escapeXml(recipe.subtitle)}</text>`);

  const metaX = [78, 250, 422];
  recipe.meta.forEach(([label, value], index) => {
    const x = metaX[index];
    parts.push(`<line x1="${x + 140}" y1="308" x2="${x + 140}" y2="382" stroke="#CFC8BA" stroke-width="2"/>`);
    parts.push(`<circle cx="${x + 44}" cy="316" r="28" fill="none" stroke="${INK}" stroke-width="4"/>`);
    parts.push(`<text x="${x + 44}" y="366" class="metaLabel" text-anchor="middle">${escapeXml(label)}</text>`);
    parts.push(`<text x="${x + 44}" y="396" class="metaValue" text-anchor="middle">${escapeXml(value)}</text>`);
  });

  let y = 492;
  parts.push(sectionTitle(y, "1", "재료 준비", recipe.meta[2][1] + " 기준"));
  y += 42;
  const ingW = (CONTENT - GAP * 5) / 6;
  recipe.ingredients.forEach((item, index) => {
    const x = M + index * (ingW + GAP);
    parts.push(ingredientCard(item, x, y, ingW, 260));
  });

  y += 330;
  parts.push(`<line x1="${M}" y1="${y - 20}" x2="${WIDTH - M}" y2="${y - 20}" stroke="${LINE}" stroke-width="2"/>`);
  parts.push(sectionTitle(y, "2", "조리 과정"));
  y += 42;
  const stepW = (CONTENT - GAP * 3) / 4;
  const stepH = 330;
  recipe.steps.forEach((step, index) => {
    const row = Math.floor(index / 4);
    const col = index % 4;
    const x = M + col * (stepW + GAP);
    const yy = y + row * (stepH + 22);
    parts.push(stepCard(step, x, yy, stepW, stepH));
  });
  const stepRows = Math.ceil(recipe.steps.length / 4);
  y += stepRows * stepH + (stepRows - 1) * 22 + 50;

  parts.push(`<rect x="${M}" y="${y}" width="${CONTENT}" height="214" fill="#FDFBF6" stroke="${LINE}" stroke-width="1.5"/>`);
  parts.push(`<text x="${M + 24}" y="${y + 42}" class="subsection">요리 팁</text>`);
  recipe.tips.forEach((tip, index) => {
    parts.push(`<text x="${M + 30}" y="${y + 84 + index * 30}" class="tip">✓ ${escapeXml(tip)}</text>`);
  });
  parts.push(`<line x1="${M + 610}" y1="${y + 22}" x2="${M + 610}" y2="${y + 192}" stroke="${LINE}" stroke-width="1.5"/>`);
  parts.push(`<text x="${M + 650}" y="${y + 42}" class="subsection">다양한 곁들임</text>`);
  recipe.pairings.forEach((item, index) => {
    parts.push(smallDish(item, M + 650 + index * 196, y + 62, 150));
  });
  y += 270;

  parts.push(`<line x1="${M}" y1="${y - 20}" x2="${WIDTH - M}" y2="${y - 20}" stroke="${LINE}" stroke-width="2"/>`);
  parts.push(sectionTitle(y, "3", "완성 맛있게 즐기는 방법"));
  y += 42;
  parts.push(`<clipPath id="finalClip"><rect x="${M}" y="${y}" width="720" height="410" rx="4"/></clipPath>`);
  parts.push(`<image x="${M}" y="${y}" width="720" height="410" href="${hero}" preserveAspectRatio="xMidYMid slice" clip-path="url(#finalClip)"/>`);
  parts.push(`<rect x="${M + 750}" y="${y}" width="${CONTENT - 750}" height="190" fill="#FDFBF6" stroke="${LINE}" stroke-width="1.5"/>`);
  parts.push(`<text x="${M + 774}" y="${y + 36}" class="subsection">맛있게 먹는 방법</text>`);
  recipe.eat.forEach((line, index) => {
    parts.push(`<text x="${M + 774}" y="${y + 76 + index * 34}" class="bodyText">${index + 1}. ${escapeXml(line)}</text>`);
  });
  parts.push(`<rect x="${M + 750}" y="${y + 212}" width="${CONTENT - 750}" height="198" fill="#FDFBF6" stroke="${LINE}" stroke-width="1.5"/>`);
  parts.push(`<text x="${M + 774}" y="${y + 248}" class="subsection">잘 어울리는 음식 &amp; 음료</text>`);
  recipe.drinks.forEach((item, index) => {
    parts.push(smallDish(item, M + 780 + index * 172, y + 266, 128));
  });
  y += 458;

  const cardW = (CONTENT - GAP * 2) / 3;
  parts.push(`<rect x="${M}" y="${y}" width="${cardW}" height="166" fill="#FDFBF6" stroke="${LINE}" stroke-width="1.5"/>`);
  parts.push(`<text x="${M + 28}" y="${y + 42}" class="subsection">영양 정보</text>`);
  recipe.nutrition.forEach(([label, value], index) => {
    parts.push(`<text x="${M + 36 + index * 112}" y="${y + 94}" class="nutriValue" text-anchor="middle">${escapeXml(value)}</text>`);
    parts.push(`<text x="${M + 36 + index * 112}" y="${y + 124}" class="smallText" text-anchor="middle">${escapeXml(label)}</text>`);
  });
  parts.push(`<rect x="${M + cardW + GAP}" y="${y}" width="${cardW}" height="166" fill="#FDFBF6" stroke="${LINE}" stroke-width="1.5"/>`);
  parts.push(`<text x="${M + cardW + GAP + 28}" y="${y + 42}" class="subsection">보관 방법</text>`);
  recipe.storage.forEach((line, index) => {
    parts.push(`<text x="${M + cardW + GAP + 34}" y="${y + 86 + index * 34}" class="bodyText">✓ ${escapeXml(line)}</text>`);
  });
  parts.push(`<rect x="${M + (cardW + GAP) * 2}" y="${y}" width="${cardW}" height="166" fill="#EFE6D5" stroke="${LINE}" stroke-width="1.5"/>`);
  parts.push(`<text x="${M + (cardW + GAP) * 2 + 54}" y="${y + 62}" class="noteText">${escapeXml(recipe.note.split("\n")[0])}</text>`);
  parts.push(`<text x="${M + (cardW + GAP) * 2 + 54}" y="${y + 102}" class="noteText">${escapeXml(recipe.note.split("\n")[1])}</text>`);
  parts.push(`<text x="${M + (cardW + GAP) * 2 + cardW - 88}" y="${y + 128}" class="heart">♥</text>`);

  const height = y + 218;
  const background = `<rect width="${WIDTH}" height="${height}" fill="${PAPER}"/>`;
  return `
<svg width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="titleFade" x1="0" y1="0" x2="820" y2="0">
      <stop stop-color="#F7F3EA"/>
      <stop offset="0.82" stop-color="#F7F3EA" stop-opacity="0.78"/>
      <stop offset="1" stop-color="#F7F3EA" stop-opacity="0"/>
    </linearGradient>
    <style>
      text { font-family: Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", Arial, sans-serif; letter-spacing: 0; }
      .eyebrow { font-size: 36px; font-weight: 700; fill: ${INK}; }
      .posterTitle { font-size: 68px; font-weight: 900; fill: #151515; }
      .posterSubtitle { font-size: 29px; font-weight: 700; fill: ${BODY}; }
      .metaLabel { font-size: 19px; font-weight: 800; fill: ${INK}; }
      .metaValue { font-size: 20px; font-weight: 900; fill: ${INK}; }
      .section { font-size: 34px; font-weight: 900; fill: ${INK}; }
      .sectionNote { font-size: 21px; font-weight: 800; fill: ${BODY}; }
      .ingTitle { font-size: 21px; font-weight: 900; fill: ${INK}; }
      .ingAmount { font-size: 17px; font-weight: 700; fill: ${BODY}; }
      .stepHead { font-size: 19px; font-weight: 900; fill: ${INK}; }
      .stepBody { font-size: 17px; font-weight: 700; fill: ${BODY}; }
      .subsection { font-size: 24px; font-weight: 900; fill: ${INK}; }
      .tip { font-size: 19px; font-weight: 700; fill: ${BODY}; }
      .smallLabel { font-size: 17px; font-weight: 900; fill: ${INK}; }
      .bodyText { font-size: 20px; font-weight: 700; fill: ${BODY}; }
      .smallText { font-size: 17px; font-weight: 700; fill: ${MUTED}; }
      .nutriValue { font-size: 22px; font-weight: 900; fill: ${INK}; }
      .noteText { font-size: 28px; font-weight: 900; fill: #5C4632; }
      .heart { font-size: 40px; font-weight: 900; fill: #D96B5C; }
    </style>
  </defs>
  ${background}
  ${parts.join("\n")}
</svg>`.trim();
};

mkdirSync(recipeDir, { recursive: true });

for (const recipe of recipes) {
  const svg = buildPoster(recipe);
  const svgPath = path.join(recipeDir, `${recipe.slug}-recipe-poster.svg`);
  writeFileSync(svgPath, svg, "utf8");
  console.log(svgPath);
}
