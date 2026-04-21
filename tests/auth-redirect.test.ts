import assert from "node:assert/strict";
import test from "node:test";

import { normalizeAuthNextPath } from "../lib/auth-redirect.ts";

test("keeps safe internal OAuth redirect paths", () => {
  assert.equal(normalizeAuthNextPath("/fridge?tab=cold#top"), "/fridge?tab=cold#top");
});

test("rejects protocol-relative OAuth redirect paths", () => {
  assert.equal(normalizeAuthNextPath("//evil.example/phish"), "/mypage");
});

test("rejects missing or external OAuth redirect paths", () => {
  assert.equal(normalizeAuthNextPath(null), "/mypage");
  assert.equal(normalizeAuthNextPath("https://evil.example/phish"), "/mypage");
});
