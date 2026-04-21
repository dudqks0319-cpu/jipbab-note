import assert from "node:assert/strict";
import test from "node:test";

import { resolvePartnerLink } from "../lib/partner-links.ts";

test("prefers item-specific partner links", () => {
  const result = resolvePartnerLink(
    {
      category: "유제품",
      name: "계란",
    },
    {
      itemLinks: {
        egg: "https://partners.example/item/egg",
      },
      categoryLinks: {
        "유제품": "https://partners.example/category/dairy",
      },
    },
  );

  assert.equal(result.href, "https://partners.example/item/egg");
  assert.equal(result.kind, "item");
});

test("falls back to category link when no specific item link exists", () => {
  const result = resolvePartnerLink(
    {
      category: "냉동식품",
      name: "냉동만두",
    },
    {
      itemLinks: {},
      categoryLinks: {
        "냉동식품": "https://partners.example/category/frozen",
      },
    },
  );

  assert.equal(result.href, "https://partners.example/category/frozen");
  assert.equal(result.kind, "category");
});

test("falls back to Coupang search when no partner links exist", () => {
  const result = resolvePartnerLink(
    {
      category: "채소",
      name: "양배추",
    },
    {
      itemLinks: {},
      categoryLinks: {},
    },
  );

  assert.match(result.href, /coupang\.com/);
  assert.equal(result.kind, "search");
});
