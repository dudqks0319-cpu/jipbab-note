// 초보자 레시피 확장 목표의 모바일 화면 증거를 로컬 PNG 캡처 기준으로 검증합니다.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const artifactRoot = process.env.BEGINNER_MOBILE_EVIDENCE_ROOT
  ? path.resolve(process.env.BEGINNER_MOBILE_EVIDENCE_ROOT)
  : path.resolve(cwd, "..");

const requiredScreenshots = [
  { label: "home 360", file: "jipbab-home-360-beginner-family.png", width: 360 },
  { label: "home 390", file: "jipbab-home-390-beginner-family.png", width: 390 },
  { label: "home 430", file: "jipbab-home-430-beginner-family.png", width: 430 },
  { label: "recipe list 360", file: "jipbab-recipe-360-filters-final.png", width: 360 },
  { label: "recipe list 390", file: "jipbab-recipe-390-filters-final.png", width: 390 },
  { label: "recipe list 430", file: "jipbab-recipe-430-filters-final.png", width: 430 },
  { label: "recipe detail cook 360", file: "jipbab-recipe-detail-cook-360.png", width: 360 },
  { label: "recipe detail cook 390", file: "jipbab-recipe-detail-cook-390.png", width: 390 },
  { label: "recipe detail cook 430", file: "jipbab-recipe-detail-cook-430.png", width: 430 },
  { label: "recipe detail shopping 360", file: "jipbab-recipe-detail-shopping-360.png", width: 360 },
  { label: "recipe detail shopping 390", file: "jipbab-recipe-detail-shopping-390.png", width: 390 },
  { label: "recipe detail shopping 430", file: "jipbab-recipe-detail-shopping-430.png", width: 430 },
];

const PNG_SIGNATURE = "89504e470d0a1a0a";

function readPngDimensions(filePath) {
  const buffer = readFileSync(filePath);
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== PNG_SIGNATURE) {
    throw new Error("not a PNG file");
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

const failures = [];
const passes = [];

for (const screenshot of requiredScreenshots) {
  const filePath = path.join(artifactRoot, screenshot.file);
  if (!existsSync(filePath)) {
    failures.push(`${screenshot.label}: missing ${filePath}`);
    continue;
  }

  try {
    const dimensions = readPngDimensions(filePath);
    if (dimensions.width !== screenshot.width) {
      failures.push(`${screenshot.label}: expected width ${screenshot.width}, got ${dimensions.width}`);
      continue;
    }
    if (dimensions.height < 700) {
      failures.push(`${screenshot.label}: expected height >= 700, got ${dimensions.height}`);
      continue;
    }
    passes.push(`${screenshot.label}: ${dimensions.width}x${dimensions.height}`);
  } catch (error) {
    failures.push(`${screenshot.label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log("Beginner mobile evidence check");
console.log(`Artifact root: ${artifactRoot}`);
console.log(`Passes: ${passes.length}`);
console.log(`Failures: ${failures.length}`);
console.log("");

for (const pass of passes) {
  console.log(`PASS - ${pass}`);
}

if (failures.length > 0) {
  console.log("");
  for (const failure of failures) {
    console.log(`FAIL - ${failure}`);
  }
  process.exit(1);
}
