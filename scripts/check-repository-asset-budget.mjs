// 배포 저장소의 이미지·생성물 증가를 CI에서 제한해 clone, build, bandwidth 비용 폭증을 막습니다.
import { statSync } from "node:fs";
import { extname } from "node:path";
import { spawnSync } from "node:child_process";

const MAX_PUBLIC_IMAGE_FILES = 2_420;
const MAX_PUBLIC_IMAGE_BYTES = 1_500_000_000;
const MAX_SINGLE_IMAGE_BYTES = 7_000_000;
const BANNED_TRACKED_PATH_PARTS = [
  "/.build/",
  "/.next/",
  "/node_modules/",
];
const BITMAP_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

function trackedFiles(...pathspecs) {
  const result = spawnSync("git", ["ls-files", "-z", "--", ...pathspecs], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "git ls-files failed");
  }
  return result.stdout.split("\0").filter(Boolean);
}

const imageFiles = trackedFiles("public/images");
const trackedRepositoryFiles = trackedFiles();
const oversized = [];
let totalBytes = 0;
let bitmapCount = 0;
let svgCount = 0;

for (const file of imageFiles) {
  const bytes = statSync(file).size;
  totalBytes += bytes;
  const extension = extname(file).toLowerCase();
  if (BITMAP_EXTENSIONS.has(extension)) bitmapCount += 1;
  if (extension === ".svg") svgCount += 1;
  if (bytes > MAX_SINGLE_IMAGE_BYTES) oversized.push({ file, bytes });
}

const bannedTrackedFiles = trackedRepositoryFiles.filter((file) =>
  BANNED_TRACKED_PATH_PARTS.some((part) => `/${file}`.includes(part))
);
const failures = [];

if (imageFiles.length > MAX_PUBLIC_IMAGE_FILES) {
  failures.push(`tracked public image files ${imageFiles.length} exceed ${MAX_PUBLIC_IMAGE_FILES}`);
}
if (totalBytes > MAX_PUBLIC_IMAGE_BYTES) {
  failures.push(`tracked public image bytes ${totalBytes} exceed ${MAX_PUBLIC_IMAGE_BYTES}`);
}
if (oversized.length > 0) {
  failures.push(`${oversized.length} image file(s) exceed ${MAX_SINGLE_IMAGE_BYTES} bytes`);
}
if (bannedTrackedFiles.length > 0) {
  failures.push(`${bannedTrackedFiles.length} generated build artifact(s) are tracked`);
}

console.log("Repository asset budget");
console.log(`Tracked public images: ${imageFiles.length}/${MAX_PUBLIC_IMAGE_FILES}`);
console.log(`Tracked image bytes: ${totalBytes}/${MAX_PUBLIC_IMAGE_BYTES}`);
console.log(`Bitmap/SVG files: ${bitmapCount}/${svgCount}`);
console.log(`Largest allowed file: ${MAX_SINGLE_IMAGE_BYTES} bytes`);

if (oversized.length > 0) {
  for (const item of oversized.slice(0, 10)) {
    console.log(`- oversized ${item.bytes}: ${item.file}`);
  }
}
if (bannedTrackedFiles.length > 0) {
  for (const file of bannedTrackedFiles.slice(0, 10)) {
    console.log(`- generated artifact: ${file}`);
  }
}
if (failures.length > 0) {
  console.log("\nFAIL");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("\nPASS");
console.log("- current large asset baseline is frozen; additions require prior optimization or removal");
