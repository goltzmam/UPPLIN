import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminDb, rpc } from "../_shared/account-deletion.ts";
const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Content-Type": "application/json" };
const reply = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers });
serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
  const db = adminDb();
  const { data: { user }, error } = await db.auth.getUser((req.headers.get("Authorization") || "").replace(/^Bearer /i, ""));
  if (error || !user) return reply({ error: "unauthorized" }, 401);
  const identity = user.identities?.find(i => i.provider === "apple");
  if (!identity) return reply({ error: "not_apple_account" }, 403);
  const clientId = Deno.env.get("APPLE_CLIENT_ID");const secret = Deno.env.get("APPLE_CLIENT_SECRET");
  if (!clientId || !secret) return reply({ error: "apple_revocation_not_configured" }, 503);
  try {
    const body = await req.json();
    if (typeof body.refresh_token !== "string" || body.refresh_token.length < 16 || body.refresh_token.length > 8192) return reply({ error: "invalid_token" }, 400);
    const response = await fetch("https://appleid.apple.com/auth/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId, client_secret: secret, grant_type: "refresh_token", refresh_token: body.refresh_token }) });
    const result = await response.json();
    if (!response.ok || !result.id_token) return reply({ error: "apple_token_verification_failed" }, 409);
    // This ID token came directly from Apple's HTTPS token endpoint, never from the client.
    const claim = JSON.parse(atob(result.id_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (claim.sub !== (identity.identity_data?.sub || identity.id) || claim.aud !== clientId || claim.iss !== "https://appleid.apple.com") return reply({ error: "apple_identity_mismatch" }, 403);
    await rpc(db, "store_apple_deletion_token", { p_user_id: user.id, p_token: result.refresh_token || body.refresh_token });
    return reply({ stored: true });
  } catch { return reply({ error: "apple_token_storage_failed" }, 503); }
});
