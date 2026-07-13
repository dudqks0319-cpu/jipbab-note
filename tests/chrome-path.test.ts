import assert from "node:assert/strict";
import test from "node:test";

import { resolveChromeExecutable } from "../scripts/lib/chrome-path.mjs";

test("Chrome resolver prefers an explicit existing CHROME_PATH", () => {
  const resolved = resolveChromeExecutable({
    explicitPath: "/custom/chrome",
    platform: "linux",
    exists: (candidate: string) => candidate === "/custom/chrome",
  });

  assert.equal(resolved, "/custom/chrome");
});

test("Chrome resolver discovers Linux and macOS candidates", () => {
  const linux = resolveChromeExecutable({
    platform: "linux",
    exists: (candidate: string) => candidate === "/usr/bin/google-chrome",
  });
  const mac = resolveChromeExecutable({
    platform: "darwin",
    exists: (candidate: string) => candidate.endsWith("Google Chrome for Testing"),
  });

  assert.equal(linux, "/usr/bin/google-chrome");
  assert.match(mac, /Google Chrome for Testing$/);
});

test("Chrome resolver reports every attempted candidate", () => {
  assert.throws(
    () => resolveChromeExecutable({
      explicitPath: "/missing/chrome",
      platform: "linux",
      exists: () => false,
    }),
    /CHROME_PATH[\s\S]*\/missing\/chrome[\s\S]*google-chrome/,
  );
});
