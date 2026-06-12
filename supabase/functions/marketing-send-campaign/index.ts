import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM_DEFAULT = "UPPLIN <news@upplin.com>";
const PUBLIC_URL = "https://upplin.com";

async function sendResend(apiKey: string, payload: Record<string, unknown>) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`resend_${res.status}: ${JSON.stringify(body)}`);
  return body as { id?: string };
}

async function hmac(secret: string, msg: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_KEY = Deno.env.get("RESEND_MARKETING_API_KEY");
    const UNSUB_SECRET = Deno.env.get("MARKETING_UNSUBSCRIBE_SECRET");

    if (!RESEND_KEY || !UNSUB_SECRET) {
      return json({ error: "missing_secrets", detail: "Configure RESEND_MARKETING_API_KEY e MARKETING_UNSUBSCRIBE_SECRET nos segredos da Cloud." }, 400);
    }

    // Auth: only admin/marketing
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const userClient = createClient(supabaseUrl, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "unauthorized" }, 401);
    const admin = createClient(supabaseUrl, service);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
    const allowed = roles?.some((r) => r.role === "admin" || r.role === "marketing");
    if (!allowed) return json({ error: "forbidden" }, 403);

    const { campaign_id } = await req.json();
    if (!campaign_id) return json({ error: "missing_campaign_id" }, 400);

    const { data: campaign, error: cErr } = await admin.from("email_campaigns").select("*").eq("id", campaign_id).single();
    if (cErr || !campaign) return json({ error: "campaign_not_found" }, 404);
    if (campaign.status !== "draft" && campaign.status !== "scheduled") {
      return json({ error: "campaign_not_sendable" }, 400);
    }

    // Resolve audience
    let filter: any = { audience: "participants" };
    if (campaign.audience_id) {
      const { data: aud } = await admin.from("email_audiences").select("filter").eq("id", campaign.audience_id).single();
      if (aud) filter = aud.filter;
    }
    const { data: recipients, error: aErr } = await admin.rpc("compute_audience", { p_filter: filter });
    if (aErr) throw aErr;
    const list = (recipients || []) as Array<{ user_id: string; email: string; full_name: string | null }>;

    await admin
      .from("email_campaigns")
      .update({ status: "sending", started_at: new Date().toISOString(), total_recipients: list.length })
      .eq("id", campaign_id);

    // Background send
    const task = (async () => {
      let sent = 0;
      const batchSize = 20;
      for (let i = 0; i < list.length; i += batchSize) {
        const batch = list.slice(i, i + batchSize);
        await Promise.all(batch.map(async (r) => {
          try {
            // Skip globally unsubscribed
            const { data: unsub } = await admin.from("email_marketing_unsubscribes").select("email").eq("email", r.email).maybeSingle();
            if (unsub) return;

            const token = await hmac(UNSUB_SECRET, r.email);
            const unsubUrl = `${PUBLIC_URL}/email/unsubscribe?token=${r.email}:${token}`;
            const firstName = (r.full_name || "").split(" ")[0] || "";
            const html = (campaign.html_body as string)
              .replaceAll("{{first_name}}", firstName)
              .replaceAll("{{unsubscribe_url}}", unsubUrl);

            const result = await sendResend(RESEND_KEY, {
              from: campaign.from_name ? `${campaign.from_name} <news@upplin.com>` : FROM_DEFAULT,
              to: [r.email],
              subject: campaign.subject,
              html,
              reply_to: campaign.reply_to || undefined,
              headers: {
                "List-Unsubscribe": `<${unsubUrl}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
            });

            await admin.from("email_campaign_recipients").upsert({
              campaign_id, user_id: r.user_id, email: r.email,
              status: "sent", resend_message_id: result.id, sent_at: new Date().toISOString(),
            }, { onConflict: "campaign_id,email" });
            await admin.rpc("increment_campaign_counter", { p_campaign_id: campaign_id, p_field: "sent_count" });
            sent++;
          } catch (e) {
            console.error("send error", r.email, e);
            await admin.from("email_campaign_recipients").upsert({
              campaign_id, user_id: r.user_id, email: r.email,
              status: "failed", error: (e as Error).message.slice(0, 500),
            }, { onConflict: "campaign_id,email" });
            await admin.rpc("increment_campaign_counter", { p_campaign_id: campaign_id, p_field: "failed_count" });
          }
        }));
        await new Promise((r) => setTimeout(r, 1000));
      }
      await admin.from("email_campaigns").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", campaign_id);
    })();

    // @ts-ignore - EdgeRuntime
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(task);
    else await task;

    return json({ ok: true, total: list.length });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
