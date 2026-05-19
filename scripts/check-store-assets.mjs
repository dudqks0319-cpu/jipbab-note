// 이 파일은 App Store와 Play Store 제출용 이미지 자산의 존재와 규격을 확인합니다.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const screenshotNames = [
  "01-home",
  "02-fridge",
  "03-recipe",
  "04-recipe-detail",
  "05-shopping",
];
const appStoreDir = "docs/app-store-screenshots/2026-05-19-iphone69";
const playStoreDir = "docs/play-store-assets/phone";

function addResult(results, level, label, detail) {
  results.push({ level, label, detail });
}

function readPngInfo(filePath) {
  const buffer = readFileSync(filePath);
  if (buffer.readUInt32BE(0) !== 0x89504e47 || buffer.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error("not a PNG file");
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25],
  };
}

function readJpegInfo(filePath) {
  const buffer = readFileSync(filePath);
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error("not a JPEG file");
  }

  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7)) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }

  throw new Error("JPEG dimensions not found");
}

function checkFile(results, relativePath, reader, predicate, expected) {
  const filePath = path.join(cwd, relativePath);
  if (!existsSync(filePath)) {
    addResult(results, "fail", relativePath, "missing");
    return;
  }

  try {
    const info = reader(filePath);
    if (predicate(info)) {
      addResult(results, "pass", relativePath, `${info.width}x${info.height}`);
    } else {
      addResult(results, "fail", relativePath, `expected ${expected}, got ${info.width}x${info.height}`);
    }
  } catch (error) {
    addResult(results, "fail", relativePath, error instanceof Error ? error.message : "unreadable image");
  }
}

const results = [];

for (const name of screenshotNames) {
  checkFile(
    results,
    `${appStoreDir}/${name}.png`,
    readPngInfo,
    (info) => info.width === 1290 && info.height === 2796,
    "1290x2796 App Store 6.9-inch portrait screenshot",
  );
}

for (const name of screenshotNames) {
  checkFile(
    results,
    `${playStoreDir}/${name}.jpg`,
    readJpegInfo,
    (info) =>
      info.width === 1080 &&
      info.height === 1920 &&
      info.width >= 320 &&
      info.height <= 3840 &&
      info.height <= info.width * 2,
    "1080x1920 Play Store phone screenshot",
  );
}

checkFile(
  results,
  "docs/play-store-assets/feature-graphic.png",
  readPngInfo,
  (info) => info.width === 1024 && info.height === 500 && info.colorType === 2,
  "1024x500 RGB Play Store feature graphic",
);

checkFile(
  results,
  "app/icon.png",
  readPngInfo,
  (info) => info.width === 512 && info.height === 512 && info.colorType === 2,
  "512x512 RGB app icon",
);

checkFile(
  results,
  "public/icons/app-icon-512.png",
  readPngInfo,
  (info) => info.width === 512 && info.height === 512 && info.colorType === 2,
  "512x512 RGB public icon",
);

const passes = results.filter((item) => item.level === "pass");
const failures = results.filter((item) => item.level === "fail");

console.log("Store asset check");
console.log(`Passes: ${passes.length}`);
console.log(`Failures: ${failures.length}`);

for (const [title, items] of [
  ["PASS", passes],
  ["FAIL", failures],
]) {
  if (items.length === 0) {
    continue;
  }

  console.log(`\n${title}`);
  for (const item of items) {
    console.log(`- ${item.label}: ${item.detail}`);
  }
}

if (failures.length > 0) {
  process.exit(1);
}
