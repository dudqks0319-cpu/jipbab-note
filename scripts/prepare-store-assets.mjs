// 이 파일은 기존 캡처를 스토어 제출 규격에 맞는 로컬 자산으로 변환합니다.
import { deflateSync } from "node:zlib";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const cwd = process.cwd();
const sourceDir = path.join(cwd, "docs/app-store-screenshots/2026-04-21-iphone17");
const appStoreDir = path.join(cwd, "docs/app-store-screenshots/2026-05-19-iphone69");
const playStoreDir = path.join(cwd, "docs/play-store-assets/phone");
const playFeaturePath = path.join(cwd, "docs/play-store-assets/feature-graphic.png");
const screenshotNames = [
  "01-home",
  "02-fridge",
  "03-recipe",
  "04-recipe-detail",
  "05-shopping",
];

function ensureDir(dirPath) {
  mkdirSync(dirPath, { recursive: true });
}

function runSips(args) {
  const result = spawnSync("sips", args, {
    cwd,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(`sips ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function writeFeatureGraphic(filePath) {
  const width = 1024;
  const height = 500;
  const rows = [];

  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 3);
    row[0] = 0;
    for (let x = 0; x < width; x += 1) {
      const index = 1 + x * 3;
      const warm = Math.round(246 - y * 0.08);
      row[index] = warm;
      row[index + 1] = Math.round(239 - x * 0.015);
      row[index + 2] = Math.round(225 - y * 0.035);

      const inPanel = x > 96 && x < 928 && y > 64 && y < 436;
      if (inPanel) {
        row[index] = 255;
        row[index + 1] = 250;
        row[index + 2] = 243;
      }

      const inFridge = x > 140 && x < 328 && y > 112 && y < 394;
      if (inFridge) {
        row[index] = 240;
        row[index + 1] = 248;
        row[index + 2] = 244;
      }

      const inRecipe = x > 418 && x < 608 && y > 126 && y < 378;
      if (inRecipe) {
        row[index] = 255;
        row[index + 1] = 238;
        row[index + 2] = 218;
      }

      const inShopping = x > 700 && x < 866 && y > 128 && y < 382;
      if (inShopping) {
        row[index] = 238;
        row[index + 1] = 245;
        row[index + 2] = 230;
      }

      const accent =
        (x > 172 && x < 296 && y > 188 && y < 214) ||
        (x > 172 && x < 270 && y > 246 && y < 272) ||
        (x > 452 && x < 574 && y > 166 && y < 194) ||
        (x > 452 && x < 560 && y > 238 && y < 266) ||
        (x > 732 && x < 838 && y > 186 && y < 210) ||
        (x > 732 && x < 814 && y > 248 && y < 272);
      if (accent) {
        row[index] = 234;
        row[index + 1] = 90;
        row[index + 2] = 31;
      }

      const dark =
        (x > 146 && x < 322 && (y === 112 || y === 393)) ||
        (y > 112 && y < 394 && (x === 140 || x === 327)) ||
        (x > 424 && x < 602 && (y === 126 || y === 377)) ||
        (y > 126 && y < 378 && (x === 418 || x === 607)) ||
        (x > 706 && x < 860 && (y === 128 || y === 381)) ||
        (y > 128 && y < 382 && (x === 700 || x === 865));
      if (dark) {
        row[index] = 47;
        row[index + 1] = 33;
        row[index + 2] = 23;
      }
    }
    rows.push(row);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(Buffer.concat(rows))),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
  writeFileSync(filePath, png);
}

ensureDir(appStoreDir);
ensureDir(playStoreDir);
ensureDir(path.dirname(playFeaturePath));

for (const name of screenshotNames) {
  const source = path.join(sourceDir, `${name}.png`);
  if (!existsSync(source)) {
    throw new Error(`Missing source screenshot: ${path.relative(cwd, source)}`);
  }

  const appStoreTarget = path.join(appStoreDir, `${name}.png`);
  const playTarget = path.join(playStoreDir, `${name}.jpg`);
  runSips(["-z", "2796", "1290", source, "--out", appStoreTarget]);
  runSips(["-z", "1920", "1080", source, "--out", playTarget, "-s", "format", "jpeg"]);
}

writeFeatureGraphic(playFeaturePath);

const generated = [
  ...screenshotNames.map((name) => path.join(appStoreDir, `${name}.png`)),
  ...screenshotNames.map((name) => path.join(playStoreDir, `${name}.jpg`)),
  playFeaturePath,
];

console.log("Prepared store assets");
for (const filePath of generated) {
  const hash = createHash("sha256").update(readFileSync(filePath)).digest("hex").slice(0, 12);
  console.log(`- ${path.relative(cwd, filePath)} sha256:${hash}`);
}
