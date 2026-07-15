import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migratedClientFiles = [
  "hooks/useFamilyShare.ts",
  "components/recipe/RecipeComments.tsx",
  "app/barcode/page.tsx",
  "app/account-delete/page.tsx",
  "app/admin/account-deletions/page.tsx",
  "lib/anonymous-user-merge.ts",
] as const;

test("FE-001 client request paths use the common API client boundary", () => {
  for (const file of migratedClientFiles) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /from ["']@\/lib\/api-client(?:\.ts)?["']/, `${file} imports the common API client`);
    assert.doesNotMatch(source, /\bfetch\s*\(/, `${file} has no direct fetch call`);
  }
});

test("barcode capability detection keeps the server and first client render identical", () => {
  const source = readFileSync("app/barcode/page.tsx", "utf8");
  assert.match(source, /const \[detectorSupported, setDetectorSupported\] = useState\(false\)/);
  assert.match(source, /const supported = isWebBarcodeDetectorSupported\(\)/);
  assert.match(source, /setDetectorSupported\(supported\)/);
  assert.doesNotMatch(source, /useMemo\(\(\) => isWebBarcodeDetectorSupported\(\), \[\]\)/);
});
