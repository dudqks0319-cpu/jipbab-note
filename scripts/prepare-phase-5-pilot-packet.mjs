// 실제 사람 검수 전에 현재 앱 SHA와 레시피 내용을 고정한 Wave 1A 운영 패킷을 만듭니다.
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { findCuratedRecipe } from "../lib/curated-recipes.ts";

const OUTPUT_DIR = path.join("output", "phase5-human-evidence", "pilot-wave-1a");
const PRODUCTION_ORIGIN = "https://jipbab-note-app.vercel.app";
const PILOT_RECIPES = [
  "beginner-recipe-001",
  "beginner-recipe-016",
  "beginner-recipe-013",
  "beginner-recipe-002",
  "beginner-recipe-006",
];

function currentGitSha() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.trim() || "git rev-parse failed");
  return result.stdout.trim();
}

function appBuildShaForPacket() {
  const requested = process.env.PHASE5_APP_BUILD_SHA?.trim();
  if (!requested) return currentGitSha();
  if (!/^[0-9a-f]{7,40}$/iu.test(requested)) {
    throw new Error("PHASE5_APP_BUILD_SHA must be a 7-40 character Git SHA.");
  }
  const result = spawnSync("git", ["cat-file", "-e", `${requested}^{commit}`], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error("PHASE5_APP_BUILD_SHA does not identify a local commit.");
  }
  return requested;
}

function versionFor(recipe) {
  const stableContent = {
    id: recipe.id,
    name: recipe.name,
    servings: recipe.servings,
    totalMinutes: recipe.totalMinutes,
    ingredients: recipe.ingredientDetails,
    tools: recipe.requiredTools,
    beforeStart: recipe.beforeStart,
    steps: recipe.steps,
    safetyNotes: recipe.safetyNotes,
    storageTip: recipe.storageTip,
    reheatTip: recipe.reheatTip,
    source: recipe.source,
  };
  const digest = createHash("sha256").update(JSON.stringify(stableContent)).digest("hex");
  return `sha256-${digest.slice(0, 12)}`;
}

function renderRecipe(recipe, recipeVersion) {
  const ingredients = (recipe.ingredientDetails ?? [])
    .map((item) => `- ${item.required === false ? "선택" : "필수"} · ${item.name} ${item.display}${item.prepNote ? ` · ${item.prepNote}` : ""}`)
    .join("\n");
  const steps = recipe.steps
    .map((step) => [
      `### ${step.index}단계`,
      `- 행동: ${step.description}`,
      `- 불·시간: ${step.heat} · ${step.minutes}분`,
      `- 완료 신호: ${step.visualCue}`,
      `- 흔한 실수: ${step.commonMistake}`,
      `- 복구: ${step.rescueTip}`,
    ].join("\n"))
    .join("\n\n");
  const safety = (recipe.safetyNotes ?? []).map((item) => `- ${item}`).join("\n");

  return `## ${recipe.name}\n\n- recipe_id: \`${recipe.id}\`\n- recipe_version: \`${recipeVersion}\`\n- 테스트 화면: ${PRODUCTION_ORIGIN}/recipe/preview/${recipe.id}\n- 기준: ${recipe.servings}인분 · ${recipe.totalMinutes}분 · 도구 ${(recipe.requiredTools ?? []).length}개\n\n### 코디네이터 확인용 재료\n\n${ingredients}\n\n### 코디네이터 확인용 도구\n\n${(recipe.requiredTools ?? []).map((item) => `- ${item}`).join("\n")}\n\n${steps}\n\n### 안전 확인\n\n${safety || "- 레시피 화면의 안전 안내를 확인합니다."}\n\n### 테스트 종료 질문\n\n- 앱 화면만 보고 완성했나요?\n- 이해하지 못한 단계는 몇 번인가요?\n- 불 세기·시간·완료 신호 중 가장 불안했던 것은 무엇인가요?\n- 복구 안내가 실제로 도움이 됐나요?\n- 다음에도 혼자 만들 수 있나요?\n`;
}

const appBuildSha = appBuildShaForPacket();
const recipes = PILOT_RECIPES.map((id) => {
  const recipe = findCuratedRecipe(id);
  if (!recipe) throw new Error(`Pilot recipe not found: ${id}`);
  return { recipe, recipeVersion: versionFor(recipe) };
});

mkdirSync(OUTPUT_DIR, { recursive: true });
const manifest = {
  generatedAt: new Date().toISOString(),
  appBuildSha,
  productionOrigin: PRODUCTION_ORIGIN,
  humanEvidenceStatus: "pending",
  recipes: recipes.map(({ recipe, recipeVersion }) => ({
    recipeId: recipe.id,
    selectedTitle: recipe.name,
    recipeVersion,
    previewUrl: `${PRODUCTION_ORIGIN}/recipe/preview/${recipe.id}`,
  })),
};
const packet = `# Phase 5 Wave 1A 실제 조리 파일럿 패킷\n\nGenerated: ${manifest.generatedAt}\n\n- app_build_sha: \`${appBuildSha}\`\n- 상태: 사람 조리·검수 전 \`pending\`\n- 범위: 간단한 밥·달걀 5개\n\n> 이 문서는 코디네이터가 앱 화면과 고정 버전을 대조하기 위한 참고 자료입니다. 테스터는 각 Production 미리보기 화면만 보고 조리하며, 이 문서나 자동 점수를 사람 검수 증거로 사용하지 않습니다. 실패와 안전 문제도 삭제하지 않고 기록합니다.\n\n## 실행 전\n\n1. 테스터에게 익명 코드만 발급합니다.\n2. 얼굴·주소·알림·계정 정보가 사진과 영상에 보이지 않게 합니다.\n3. 각 미리보기의 제목·재료·단계가 아래 버전과 같은지 확인합니다.\n4. 결과는 기존 CSV 행을 지우지 말고 \`docs/phase-5-actual-cooking-template.csv\`와 \`docs/phase-5-human-review-template.csv\`에 기록합니다.\n5. 안전 문제가 생기면 즉시 조리를 중단하고 \`approved\`를 사용하지 않습니다.\n\n${recipes.map(({ recipe, recipeVersion }) => renderRecipe(recipe, recipeVersion)).join("\n---\n\n")}\n`;

writeFileSync(path.join(OUTPUT_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
writeFileSync(path.join(OUTPUT_DIR, "pilot-packet.md"), packet, "utf8");

console.log("Phase 5 pilot packet prepared");
console.log(`- ${path.join(OUTPUT_DIR, "pilot-packet.md")}`);
console.log(`- ${path.join(OUTPUT_DIR, "manifest.json")}`);
console.log(`- app SHA ${appBuildSha}`);
console.log("- human evidence remains pending; no CSV or database approval was changed");
