// 이 파일은 앱스토어 데모 데이터가 날짜가 지나도 만료 화면처럼 보이지 않는지 확인합니다.
import assert from "node:assert/strict";
import test from "node:test";

import { APPSTORE_DEMO_INGREDIENTS } from "../lib/demo-state.ts";

function getDaysUntil(dateValue: string | null): number {
  assert.ok(dateValue, "demo ingredient should have an expiry date");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateValue);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

test("keeps app store demo expiry dates relative to the current date", () => {
  const daysUntilExpiry = APPSTORE_DEMO_INGREDIENTS.map((item) => getDaysUntil(item.expiryDate));

  assert.deepEqual(daysUntilExpiry, [2, 4, 1, 3]);
});
