import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  isCoupangPartnerUrl,
  parsePartnerItemLinksJson,
  resolvePartnerLink,
} from "../lib/partner-links.ts";
import { INGREDIENT_CATEGORIES } from "../types/index.ts";

test("accepts only Coupang Partners short links as partner URLs", () => {
  assert.equal(isCoupangPartnerUrl("https://link.coupang.com/a/example-egg"), true);
  assert.equal(isCoupangPartnerUrl("https://www.coupang.com/np/search?q=%EA%B3%84%EB%9E%80"), false);
  assert.equal(isCoupangPartnerUrl("https://partners.example/item/egg"), false);
  assert.equal(isCoupangPartnerUrl("javascript:alert(1)"), false);
});

test("prefers item-specific partner links", () => {
  const result = resolvePartnerLink(
    {
      category: "유제품",
      name: "계란",
    },
    {
      itemLinks: {
        egg: "https://link.coupang.com/a/example-egg",
      },
      categoryLinks: {
        "유제품": "https://link.coupang.com/a/example-dairy",
      },
    },
  );

  assert.equal(result.href, "https://link.coupang.com/a/example-egg");
  assert.equal(result.kind, "item");
});

test("prefers Korean item-specific partner links from JSON config", () => {
  const result = resolvePartnerLink(
    {
      category: "유제품",
      name: "계란",
    },
    {
      itemLinks: parsePartnerItemLinksJson(
        JSON.stringify({
          계란: "https://link.coupang.com/a/example-egg",
        }),
      ),
      categoryLinks: {
        "유제품": "https://link.coupang.com/a/example-dairy",
      },
    },
  );

  assert.equal(result.href, "https://link.coupang.com/a/example-egg");
  assert.equal(result.kind, "item");
});

test("prefers database item-specific links over category fallback", () => {
  const result = resolvePartnerLink(
    {
      category: "조미료",
      name: "간장",
    },
    {
      itemLinks: {
        간장: "https://link.coupang.com/a/db-soy-sauce",
      },
      categoryLinks: {
        "조미료": "https://link.coupang.com/a/category-seasoning",
      },
    },
  );

  assert.equal(result.href, "https://link.coupang.com/a/db-soy-sauce");
  assert.equal(result.kind, "item");
});

test("ignores malformed item-specific partner link JSON", () => {
  const result = resolvePartnerLink(
    {
      category: "채소",
      name: "양파",
    },
    {
      itemLinks: parsePartnerItemLinksJson("{not-json"),
      categoryLinks: {},
    },
  );

  assert.equal(result.kind, "search");
  assert.match(result.href, /%EC%96%91%ED%8C%8C/);
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
        "냉동식품": "https://link.coupang.com/a/example-frozen",
      },
    },
  );

  assert.equal(result.href, "https://link.coupang.com/a/example-frozen");
  assert.equal(result.kind, "category");
});

test("falls back to search when configured partner URLs are not allowlisted", () => {
  const result = resolvePartnerLink(
    {
      category: "유제품",
      name: "계란",
    },
    {
      itemLinks: {
        egg: "https://example.com/egg",
        계란: "javascript:alert(1)",
      },
      categoryLinks: {
        "유제품": "https://www.coupang.com/np/search?q=%EA%B3%84%EB%9E%80",
      },
    },
  );

  assert.equal(result.kind, "search");
  assert.match(result.href, /%EA%B3%84%EB%9E%80/);
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

test("partner link hook keeps validated fallback links when database loading fails", () => {
  const source = readFileSync(new URL("../hooks/usePartnerLinks.ts", import.meta.url), "utf8");

  assert.match(source, /const FALLBACK_PARTNER_LINKS = getFallbackPartnerLinks\(\)/);
  assert.match(source, /useState<PartnerLinkConfig>\(FALLBACK_PARTNER_LINKS\)/);
  assert.match(source, /setLinks\(FALLBACK_PARTNER_LINKS\)/);
  assert.match(source, /사과/);
  assert.doesNotMatch(source, /setLinks\(EMPTY_PARTNER_LINKS\)/);
});

test("fallback partner links cover every shopping catalog category", () => {
  const source = readFileSync(new URL("../hooks/usePartnerLinks.ts", import.meta.url), "utf8");

  for (const category of INGREDIENT_CATEGORIES) {
    assert.ok(
      source.includes(`${category}: 'https://link.coupang.com/a/`) ||
        source.includes(`'${category}': 'https://link.coupang.com/a/`),
      `${category} category should have a Coupang Partners fallback link`,
    );
  }
});
