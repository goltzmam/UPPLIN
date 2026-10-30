import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info" };
const reply = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "private, no-store" } });
serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer /i, "");
  const caller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: backend } = await caller.rpc("is_backend_service");
  if (backend !== true) {
    const { data: { user }, error } = await db.auth.getUser(token);
    if (error || !user) return reply({ error: "unauthorized" }, 401);
    const { data: staff } = await db.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!staff) return reply({ error: "forbidden" }, 403);
  }
  const body = await req.json().catch(() => ({}));
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return reply({ error: "mail_service_unavailable" }, 503);
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  if (body.action === "inspect-apple") {
    const secret = Deno.env.get("APPLE_CLIENT_SECRET") || "";
    let payload: { sub?: string; exp?: number } = {};
    try { payload = JSON.parse(atob(secret.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); } catch { /* no secret returned */ }
    return reply({ client_configured: !!Deno.env.get("APPLE_CLIENT_ID"), secret_configured: !!secret, secret_jwt_format: secret.split(".").length === 3, secret_subject: payload.sub || null, secret_expires_at: payload.exp ? new Date(payload.exp * 1000).toISOString() : null });
  }
  if (body.action === "verify-apple") {
    const id = Deno.env.get("APPLE_CLIENT_ID"); const secret = Deno.env.get("APPLE_CLIENT_SECRET");
    if (!id || !secret) return reply({ configured: false });
    const response = await fetch("https://appleid.apple.com/auth/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: id, client_secret: secret, grant_type: "authorization_code", code: "upplin-config-check-" + crypto.randomUUID() }) });
    const result = await response.json();
    return reply({ configured: true, client_accepted_for_invalid_code: result.error === "invalid_grant", provider_error: ["invalid_grant", "invalid_client", "invalid_request"].includes(result.error) ? result.error : "unexpected_response" });
  }
  if (body.action === "inspect-mail") {
    const domains = await fetch("https://api.resend.com/domains", { headers });
    const list = await domains.json();
    const domain = list.data?.find((d: { name: string }) => d.name === "upplin.com");
    let info = null;
    if (domain) {
      const r = await fetch(`https://api.resend.com/domains/${domain.id}`, { headers });
      const value = await r.json();
      info = { status: value.status, capabilities: value.capabilities, records: value.records?.map((x: { record: string; type: string; name: string; status: string }) => ({ record: x.record, type: x.type, name: x.name, status: x.status })) };
    }
    const incoming = await fetch("https://api.resend.com/emails/receiving?limit=1", { headers });
    return reply({ domains_access: domains.status, domain: info, incoming_access: incoming.status });
  }
  if (body.action === "probe-mail") {
    const code = crypto.randomUUID();
    const result = await fetch("https://api.resend.com/emails", { method: "POST", headers, body: JSON.stringify({ from: Deno.env.get("EMAIL_FROM") || "UPPLIN <noreply@upplin.com>", to: ["suporte@upplin.com"], subject: `UPPLIN — verificação de recebimento ${code}`, text: `Mensagem técnica autorizada para verificar o canal de suporte da UPPLIN. Nenhuma conta será excluída por esta mensagem. Código de verificação: ${code}.` }) });
    const data = await result.json();
    return reply({ sent: result.ok, id: data.id || null, code }, result.ok ? 200 : 502);
  }
  if (body.action === "check-probe" && /^[a-f0-9-]{36}$/.test(body.id || "") && /^[a-f0-9-]{36}$/.test(body.code || "")) {
    const outgoing = await fetch(`https://api.resend.com/emails/${body.id}`, { headers });
    const status = await outgoing.json();
    const incoming = await fetch("https://api.resend.com/emails/receiving?limit=100", { headers });
    const received = await incoming.json();
    const matched = received.data?.find((x: { subject?: string; to?: string[] }) => x.subject?.endsWith(body.code) && x.to?.includes("suporte@upplin.com"));
    return reply({ delivery_status: status.last_event || null, receiving_access: incoming.status, received: !!matched, received_id: matched?.id || null });
  }
  return reply({ error: "invalid_action" }, 400);
});
