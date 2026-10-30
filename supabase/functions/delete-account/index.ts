import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminDb, rpc, freshReceipt, receiptHash, processDeletion, PrivacyFailure } from "../_shared/account-deletion.ts";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info" };
const reply = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...cors, "Content-Type": "application/json" } });
serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
  const db = adminDb();
  try {
    if (Number(req.headers.get("Content-Length") || 0) > 16384) return reply({ error: "body_too_large" }, 413);
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply({ error: "invalid_body" }, 400);
    if (body.action === "status") {
      if (!/^[a-f0-9-]{36}$/.test(body.job_id || "") || !/^[a-f0-9]{64}$/.test(body.receipt || "")) return reply({ error: "invalid_receipt" }, 400);
      const status = await rpc(db, "deletion_job_status", { p_job_id: body.job_id, p_receipt_hash: await receiptHash(body.receipt) });
      return status ? reply(status) : reply({ error: "not_found" }, 404);
    }
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer /i, "");
    const { data: { user }, error } = await db.auth.getUser(token);
    if (error || !user) return reply({ error: "unauthorized" }, 401);
    if (body.user_id || body.target_user_id) return reply({ error: "self_service_only" }, 400);
    if (body.confirmation !== "EXCLUIR") return reply({ error: "confirmation_required" }, 400);
    const { data: staff } = await db.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (staff) return reply({ error: "support_account_protected" }, 409);
    let sessionId = "";
    try { const segment = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");sessionId = JSON.parse(atob(segment)).session_id || ""; } catch { /* verified token still requires a session */ }
    if (!sessionId || !(await rpc(db, "deletion_session_is_recent", { p_user_id: user.id, p_session_id: sessionId }))) return reply({ error: "recent_login_required" }, 409);
    if (user.identities?.some(i => i.provider === "apple")) {
      if (!Deno.env.get("APPLE_CLIENT_SECRET") || !Deno.env.get("APPLE_CLIENT_ID")) return reply({ error: "apple_revocation_not_configured" }, 503);
      if (!(await rpc(db, "apple_deletion_token_ready", { p_user_id: user.id }))) return reply({ error: "apple_reauthentication_required" }, 409);
    }
    const receipt = freshReceipt();
    const id = await rpc(db, "begin_account_deletion", { p_user_id: user.id, p_receipt_hash: await receiptHash(receipt) });
    const status = await processDeletion(db, id);
    return reply({ job_id: id, receipt, status }, status === "completed" ? 200 : 202);
  } catch (error) { return reply({ error: error instanceof PrivacyFailure ? error.code : "deletion_request_failed" }, 503); }
});
