import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hmac(secret: string, msg: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const UNSUB_SECRET = Deno.env.get("MARKETING_UNSUBSCRIBE_SECRET");
    if (!UNSUB_SECRET) return json({ error: "missing_secret" }, 400);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { token } = await req.json();
    if (!token || !token.includes(":")) return json({ error: "invalid_token" }, 400);
    const [email, sig] = token.split(":");
    const expected = await hmac(UNSUB_SECRET, email);
    if (sig !== expected) return json({ error: "invalid_signature" }, 400);

    await admin.from("email_marketing_unsubscribes").upsert({ email: email.toLowerCase(), reason: "user_action" });
    await admin.from("profiles").update({ marketing_opt_in: false }).eq("email", email.toLowerCase());

    return json({ ok: true, email });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
