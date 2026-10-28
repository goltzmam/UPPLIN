import { test } from "node:test";
import assert from "node:assert/strict";
import { assertClientEnvironment, resolveClientEnvironment } from "../scripts/client-env.ts";
const url = "https://ermhzlthjlolqsbtjawf.supabase.co";
const jwt = (role: string, ref: string) => `eyJtest.${Buffer.from(JSON.stringify({ role, ref })).toString("base64url")}.test-signature`;

test("deployment requires credentials for the intended project", () => {
  assert.doesNotThrow(() => assertClientEnvironment({ VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test" }));
  assert.doesNotThrow(() => assertClientEnvironment({ VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: jwt("anon", "ermhzlthjlolqsbtjawf") }));
  assert.throws(() => assertClientEnvironment({ VITE_SUPABASE_URL: "https://old.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test" }));
  assert.throws(() => assertClientEnvironment({ VITE_SUPABASE_URL: url }));
  assert.throws(() => assertClientEnvironment({ VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: jwt("anon", "old-project") }));
});
test("deployment rejects privileged server credentials in public VITE variables", () => {
  assert.throws(() => assertClientEnvironment({ VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: "sb_secret_test" }));
  assert.throws(() => assertClientEnvironment({ VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: jwt("service_role", "ermhzlthjlolqsbtjawf") }));
});
test("Vercel integration public aliases resolve to the frontend configuration", () => {
  const env = resolveClientEnvironment({ NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test" });
  assert.equal(env.VITE_SUPABASE_URL,url);
  assert.equal(env.VITE_SUPABASE_PUBLISHABLE_KEY,"sb_publishable_test");
  assert.doesNotThrow(() => assertClientEnvironment(env));
});
test("Vercel integration server keys are never mapped into the client", () => {
  const env = resolveClientEnvironment({ SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: "server-secret", SUPABASE_SECRET_KEY: "server-secret" });
  assert.equal(env.VITE_SUPABASE_PUBLISHABLE_KEY,undefined);
  assert.throws(() => assertClientEnvironment(env));
});
