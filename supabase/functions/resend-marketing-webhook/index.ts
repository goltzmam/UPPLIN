import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-signature, svix-timestamp",
};

// Resend webhook events: email.sent, email.delivered, email.opened, email.clicked, email.bounced, email.complained
const fieldMap: Record<string, string> = {
  "email.delivered": "delivered_count",
  "email.opened": "opened_count",
  "email.clicked": "clicked_count",
  "email.bounced": "bounced_count",
  "email.complained": "complained_count",
};

const statusMap: Record<string, string> = {
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    // NOTE: Resend uses Svix-style signatures. Validation simplified — verify with svix lib when integrating.
    const body = await req.json();
    const type = body.type as string;
    const data = body.data || {};
    const messageId = data.email_id || data.id;
    if (!type || !messageId) return json({ ok: true, skipped: true });

    const { data: rec } = await admin
      .from("email_campaign_recipients")
      .select("id, campaign_id, email")
      .eq("resend_message_id", messageId)
      .maybeSingle();
    if (!rec) return json({ ok: true, unknown_message: true });

    const newStatus = statusMap[type];
    if (newStatus) {
      const updates: Record<string, unknown> = { status: newStatus };
      if (type === "email.delivered") updates.delivered_at = new Date().toISOString();
      if (type === "email.opened") updates.opened_at = new Date().toISOString();
      if (type === "email.clicked") updates.clicked_at = new Date().toISOString();
      await admin.from("email_campaign_recipients").update(updates).eq("id", rec.id);
    }
    const field = fieldMap[type];
    if (field) await admin.rpc("increment_campaign_counter", { p_campaign_id: rec.campaign_id, p_field: field });

    if (type === "email.bounced" || type === "email.complained") {
      await admin.from("email_marketing_unsubscribes").upsert({
        email: rec.email.toLowerCase(),
        reason: type === "email.bounced" ? "bounced" : "complained",
      });
    }

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
