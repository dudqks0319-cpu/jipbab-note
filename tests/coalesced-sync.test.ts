import assert from "node:assert/strict";
import { test } from "node:test";

import { createCoalescedSyncRunner } from "../lib/sync/coalesced-sync.ts";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

test("coalesces concurrent sync requests and reruns after queued work arrives", async () => {
  const firstRun = deferred();
  let callCount = 0;
  const runner = createCoalescedSyncRunner(async () => {
    callCount += 1;
    if (callCount === 1) {
      await firstRun.promise;
    }
    return callCount;
  });

  const firstPromise = runner();
  const queuedPromise = runner();

  assert.equal(firstPromise, queuedPromise);
  assert.equal(callCount, 1);

  firstRun.resolve();
  assert.equal(await firstPromise, 2);
  assert.equal(callCount, 2);

  assert.equal(await runner(), 3);
});

test("allows a later retry after a failed sync run", async () => {
  let callCount = 0;
  const runner = createCoalescedSyncRunner(async () => {
    callCount += 1;
    if (callCount === 1) {
      throw new Error("temporary sync failure");
    }
    return "synced";
  });

  await assert.rejects(runner(), /temporary sync failure/);
  assert.equal(await runner(), "synced");
  assert.equal(callCount, 2);
});
