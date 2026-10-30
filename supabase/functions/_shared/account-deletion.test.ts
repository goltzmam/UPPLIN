import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runDeletionSteps, revokeApple, cancelMpSubscription, receiptHash, freshReceipt } from "./account-deletion.ts";
Deno.test("provider refusal prevents any storage, data or Auth erasure", async () => {
  const calls: string[] = [];
  await assertRejects(() => runDeletionSteps({ providers_revoked: false, data_erased: false, auth_erased: false }, {
    providers: async () => { await revokeApple("refresh-test", "client", "secret", async () => new Response("invalid_client", { status: 400 })); },
    storage: async () => { calls.push("storage"); }, data: async () => { calls.push("data"); }, auth: async () => { calls.push("auth"); }, complete: async () => { calls.push("complete"); },
  }));
  assertEquals(calls, []);
});
Deno.test("storage failure keeps Auth and personal rows available for a safe retry", async () => {
  const calls: string[] = [];
  await assertRejects(() => runDeletionSteps({ providers_revoked: true, data_erased: false, auth_erased: false }, {
    providers: async () => { throw new Error("must not revoke twice"); }, storage: async () => { throw new Error("offline"); },
    data: async () => { calls.push("data"); }, auth: async () => { calls.push("auth"); }, complete: async () => { calls.push("complete"); },
  }));assertEquals(calls, []);
});
Deno.test("retry after committed data erasure only finishes Auth and confirmation", async () => {
  const calls: string[] = [];
  await runDeletionSteps({ providers_revoked: true, data_erased: true, auth_erased: false }, {
    providers: async () => { calls.push("providers"); },storage: async () => { calls.push("storage"); },data: async () => { calls.push("data"); },
    auth: async () => { calls.push("auth"); },complete: async () => { calls.push("complete"); },
  });assertEquals(calls, ["auth", "complete"]);
});
Deno.test("Apple revocation sends the refresh token only to Apple's endpoint", async () => {
  await revokeApple("private-refresh", "com.example.login", "private-client-secret", async (url, init) => {
    assertEquals(String(url), "https://appleid.apple.com/auth/revoke");
    const body = new URLSearchParams(String(init?.body));assertEquals(body.get("token_type_hint"), "refresh_token");assertEquals(body.get("client_id"), "com.example.login");assertEquals(body.get("token"), "private-refresh");return new Response(null, { status: 200 });
  });
});
Deno.test("subscription deletion refuses both MP failure and an unconfirmed cancellation", async () => {
  await assertRejects(() => cancelMpSubscription("subscription", "server-token", async () => Response.json({ status: "authorized" })));
  await assertRejects(() => cancelMpSubscription("subscription", "server-token", async () => Response.json({ error: "offline" }, { status: 503 })));
  await cancelMpSubscription("subscription", "server-token", async () => Response.json({ status: "cancelled" }));
});
Deno.test("private status receipts are random and stored as nonreversible digests", async () => {
  const first = freshReceipt();const second = freshReceipt();assertEquals(first.length, 64);assertEquals(first === second, false);assertEquals((await receiptHash(first)).length, 64);assertEquals(await receiptHash(first) === first, false);
});
