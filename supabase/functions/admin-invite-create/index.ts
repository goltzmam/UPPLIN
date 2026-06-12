import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const userClient = createClient(supabaseUrl, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    // Verify caller is admin
    const admin = createClient(supabaseUrl, service);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "forbidden" }, 403);

    const { email, roles } = await req.json();
    if (!email || !Array.isArray(roles) || !roles.length) return json({ error: "invalid_body" }, 400);
    const validRoles = ["admin", "marketing", "support"];
    const cleanRoles = roles.filter((r: string) => validRoles.includes(r));
    if (!cleanRoles.length) return json({ error: "invalid_roles" }, 400);

    const { data: invite, error } = await admin
      .from("admin_invites")
      .insert({ email: email.toLowerCase(), roles: cleanRoles, invited_by: user.id })
      .select()
      .single();
    if (error) throw error;

    const origin = req.headers.get("origin") || "https://upplin.com";
    const link = `${origin}/admin/aceitar-convite?token=${invite.token}`;

    // Enqueue transactional email via existing pipeline
    const subject = "Você foi convidado para a equipe UPPLIN";
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#000;color:#fff">
        <h1 style="background:linear-gradient(135deg,#FF6A00,#FF2D2D,#FF007A);-webkit-background-clip:text;color:transparent">UPPLIN</h1>
        <h2>Você foi convidado</h2>
        <p>Você recebeu um convite para colaborar com a equipe UPPLIN com os seguintes acessos: <b>${cleanRoles.join(", ")}</b>.</p>
        <p style="margin:32px 0">
          <a href="${link}" style="background:#FF2D2D;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;display:inline-block">Aceitar convite</a>
        </p>
        <p style="color:#888;font-size:12px">Link válido por 7 dias. Se você não esperava este convite, pode ignorar este email.</p>
      </div>`;

    await admin.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        to: email.toLowerCase(),
        subject,
        html,
        label: "admin-invite",
        message_id: `admin-invite-${invite.id}`,
        purpose: "transactional",
        queued_at: new Date().toISOString(),
      },
    });

    return json({ ok: true, invite_id: invite.id, link });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
