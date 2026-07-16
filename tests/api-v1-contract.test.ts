import assert from "node:assert/strict";
import test from "node:test";

import {
  ApiV1ValidationError,
  decodeRecipeCursor,
  encodeRecipeCursor,
  parseApiIdList,
  parseApiIntegerFilter,
  parseApiLimit,
  parseApiQuery,
  parseApiSort,
} from "../lib/api-v1-contract.ts";

test("recipe cursors round-trip a canonical timestamp and UUID", () => {
  const cursor = {
    kind: "recent" as const,
    publishedAt: "2026-07-10T05:00:00.000Z",
    id: "a36e34ec-5f17-4e4a-8e07-246b8082447e",
  };

  assert.deepEqual(decodeRecipeCursor(encodeRecipeCursor(cursor)), cursor);
});

test("recipe cursors reject malformed and non-canonical values", () => {
  for (const value of [
    "not-base64!",
    Buffer.from(JSON.stringify({ publishedAt: "yesterday", id: "bad" })).toString("base64url"),
    Buffer.from(
      JSON.stringify({
        publishedAt: "2026-07-10T05:00:00Z",
        id: "a36e34ec-5f17-4e4a-8e07-246b8082447e",
      }),
    ).toString("base64url"),
  ]) {
    assert.throws(
      () => decodeRecipeCursor(value),
      (error: unknown) => error instanceof ApiV1ValidationError && error.code === "INVALID_CURSOR",
    );
  }
});

test("API v1 query parsers keep bounded values", () => {
  assert.equal(parseApiLimit(null), 24);
  assert.equal(parseApiLimit("50"), 50);
  assert.equal(parseApiQuery(" 달걀 국 "), "달걀 국");
  assert.equal(parseApiSort(null), "recommended");
  assert.equal(parseApiSort("fastest"), "fastest");
  assert.equal(parseApiIntegerFilter("3", "difficulty", 1, 3), 3);
  assert.deepEqual(parseApiIdList("veg-onion,veg-onion,dairy-egg", "ingredientIds"), [
    "veg-onion",
    "dairy-egg",
  ]);
});

test("API v1 query parsers reject oversized or unsafe values", () => {
  assert.throws(() => parseApiLimit("0"), ApiV1ValidationError);
  assert.throws(() => parseApiLimit("51"), ApiV1ValidationError);
  assert.throws(() => parseApiQuery("a".repeat(41)), ApiV1ValidationError);
  assert.throws(() => parseApiQuery("달걀_국"), ApiV1ValidationError);
  assert.throws(() => parseApiQuery("%27;drop table"), ApiV1ValidationError);
  assert.throws(() => parseApiSort("random"), ApiV1ValidationError);
  assert.throws(() => parseApiIntegerFilter("4", "difficulty", 1, 3), ApiV1ValidationError);
  assert.throws(() => parseApiIdList("valid,<script>", "ingredientIds"), ApiV1ValidationError);
});

test("ranked cursors are bounded and tied to their sort", () => {
  const cursor = encodeRecipeCursor({ kind: "ranked", sort: "least-missing", offset: 24 });
  assert.deepEqual(decodeRecipeCursor(cursor, "least-missing"), {
    kind: "ranked",
    sort: "least-missing",
    offset: 24,
  });
  assert.throws(() => decodeRecipeCursor(cursor, "fastest"), ApiV1ValidationError);
});
