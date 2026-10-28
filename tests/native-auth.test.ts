import { test } from "node:test";
import assert from "node:assert/strict";
import { nativeAuthCode, safeAppPath } from "../src/lib/native-auth-url.ts";

test("native OAuth accepts only the application's callback", () => {
  assert.equal(nativeAuthCode("com.upplin.app://auth/callback?code=one-use-code"), "one-use-code");
  for (const url of ["https://evil.test/auth/callback?code=x", "com.upplin.app://evil/callback?code=x", "com.upplin.app://auth/other?code=x", "invalid", "com.upplin.app://user@auth/callback?code=x", "com.upplin.app://auth:99/callback?code=x", "com.upplin.app://auth/callback"]) {
    assert.equal(nativeAuthCode(url), null);
  }
});

test("native OAuth return paths cannot navigate to another origin", () => {
  for (const path of ["https://evil.test", "//evil.test", "/\\evil.test", "/\n/evil.test", "/\t/evil.test", null]) assert.equal(safeAppPath(path), "/");
  assert.equal(safeAppPath("/organizador/onboarding"), "/organizador/onboarding");
});
