import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const localGate = readFileSync("scripts/run-release-gates.mjs", "utf8");
const ciGate = readFileSync("scripts/run-ci-release-gates.mjs", "utf8");
const staticCheck = readFileSync("scripts/check-phase-6-mobile-accessibility.mjs", "utf8");
const runtimeCapture = readFileSync("scripts/capture-phase-6-mobile-accessibility.mjs", "utf8");

test("Phase 6 mobile accessibility check is wired into local and CI gates", () => {
  assert.equal(
    packageJson.scripts["check:phase6-accessibility"],
    "node scripts/check-phase-6-mobile-accessibility.mjs",
  );
  assert.match(localGate, /scripts\/check-phase-6-mobile-accessibility\.mjs/);
  assert.match(ciGate, /scripts\/check-phase-6-mobile-accessibility\.mjs/);
});

test("Phase 6 mobile accessibility contract passes against app surfaces", () => {
  const result = spawnSync("node", ["scripts/check-phase-6-mobile-accessibility.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /Failures: 0/);
  assert.match(result.stdout, /timer, and reduced-motion contracts passed/);
  assert.match(result.stdout, /primary button contrast: [4-9]\.[0-9]{2}:1/);
});

test("FE-017 checks explicit names, keyboard focus, state, timer, and AA contrast", () => {
  assert.match(staticCheck, /core form accessible names/);
  assert.match(staticCheck, /visible form label association/);
  assert.match(staticCheck, /error message association/);
  assert.match(staticCheck, /non-color selected state/);
  assert.match(staticCheck, /dialog keyboard navigation/);
  assert.match(staticCheck, /timer multimodal completion/);
  assert.match(staticCheck, /AA contrast palette/);
});

test("runtime capture can audit multiple routes for names, labels, focus, size, and overflow", () => {
  assert.match(runtimeCapture, /PHASE6_ACCESSIBILITY_PATHS/);
  assert.match(runtimeCapture, /unlabeledFields/);
  assert.match(runtimeCapture, /unnamedControls/);
  assert.match(runtimeCapture, /contrastFailures/);
  assert.match(runtimeCapture, /focusIndicatorVisible/);
  assert.match(runtimeCapture, /frameworkOverlay/);
  assert.match(runtimeCapture, /controls below 44px/);
  assert.match(runtimeCapture, /horizontal overflow/);
});
