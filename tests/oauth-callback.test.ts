import { test } from "node:test";
import assert from "node:assert/strict";
import { createCallbackProcessor } from "../src/lib/oauth-callback.ts";

test("duplicate native callbacks exchange a one-use code only once", async () => {
  let exchanges = 0, completions = 0, failures = 0;
  const process = createCallbackProcessor({ exchange: async () => { exchanges++; await new Promise(resolve => setTimeout(resolve, 5)); return true; }, hasSession: async () => true, complete: async () => { completions++; }, fail: () => { failures++; } });
  await Promise.all([process("fixture-one-use-code"), process("fixture-one-use-code")]);
  await process("fixture-one-use-code");
  assert.deepEqual({ exchanges, completions, failures }, { exchanges: 1, completions: 1, failures: 0 });
});
test("stale launch URL does not report a failed login when a session exists", async () => {
  let failures = 0, completions = 0;
  const process = createCallbackProcessor({ exchange: async () => false, hasSession: async () => true, complete: async () => { completions++; }, fail: () => { failures++; } });
  await process("fixture-stale-code");
  assert.equal(failures, 0); assert.equal(completions, 0);
});
test("a real failed callback without a session still reports an error and permits retry", async () => {
  let failures = 0, attempts = 0, completions = 0;
  const process = createCallbackProcessor({ exchange: async () => ++attempts > 1, hasSession: async () => false, complete: async () => { completions++; }, fail: () => { failures++; } });
  await process("fixture-retry-code"); await process("fixture-retry-code");
  assert.equal(failures, 1); assert.equal(completions, 1);
});
