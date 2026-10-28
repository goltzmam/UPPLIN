import { createOAuthState, verifyOAuthState } from "../_shared/oauth-state.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // ACTION: Generate OAuth URL for organizer to connect MP
    if (action === "auth-url") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const clientId = Deno.env.get("MP_CLIENT_ID")!;
      const redirectUri = `${supabaseUrl}/functions/v1/mp-connect?action=callback`;

      const state = await createOAuthState(user.id, Deno.env.get("MP_CLIENT_SECRET") || "");
      const authUrl = `https://auth.mercadopago.com.br/authorization?client_id=${clientId}&response_type=code&platform_id=mp&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

      return new Response(
        JSON.stringify({ auth_url: authUrl }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: OAuth callback from Mercado Pago
    if (action === "callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state") || "";
      const userId = await verifyOAuthState(state, Deno.env.get("MP_CLIENT_SECRET") || "");

      if (!code || !userId) {
        return new Response("Missing code or state", { status: 400 });
      }

      const clientId = Deno.env.get("MP_CLIENT_ID")!;
      const clientSecret = Deno.env.get("MP_CLIENT_SECRET")!;
      const redirectUri = `${supabaseUrl}/functions/v1/mp-connect?action=callback`;

      // Exchange code for tokens
      const tokenResponse = await fetch("https://api.mercadopago.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error("MP OAuth error:", JSON.stringify(tokenData));
        return new Response(
          `<html><body><h1>Erro ao conectar Mercado Pago</h1><p>${tokenData.message || "Tente novamente"}</p><script>setTimeout(()=>window.close(),3000)</script></body></html>`,
          { status: 400, headers: { "Content-Type": "text/html" } }
        );
      }

      // Get organizer account for this user
      const { data: organizer } = await adminClient
        .from("organizer_accounts")
        .select("id")
        .eq("owner_user_id", userId)
        .single();

      if (!organizer) {
        return new Response(
          `<html><body><h1>Conta de organizador não encontrada</h1><script>setTimeout(()=>window.close(),3000)</script></body></html>`,
          { status: 404, headers: { "Content-Type": "text/html" } }
        );
      }

      // Upsert MP account credentials
      const { error: upsertError } = await adminClient
        .from("organizer_mp_accounts")
        .upsert({
          organizer_id: organizer.id,
          mp_user_id: tokenData.user_id.toString(),
          mp_access_token: tokenData.access_token,
          mp_refresh_token: tokenData.refresh_token,
          mp_public_key: tokenData.public_key || null,
          mp_email: tokenData.email || null,
          connected_at: new Date().toISOString(),
        }, {
          onConflict: "organizer_id",
        });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        return new Response(
          `<html><body><h1>Erro ao salvar credenciais</h1><script>setTimeout(()=>window.close(),3000)</script></body></html>`,
          { status: 500, headers: { "Content-Type": "text/html" } }
        );
      }

      // Redirect back to organizer settings
      const origin = Deno.env.get("SITE_URL") || "https://upplin.com";
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${origin}/organizador/painel/configuracoes?mp=connected`,
        },
      });
    }

    // ACTION: Check connection status
    if (action === "status") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: organizer } = await adminClient
        .from("organizer_accounts")
        .select("id")
        .eq("owner_user_id", user.id)
        .single();

      if (!organizer) {
        return new Response(
          JSON.stringify({ connected: false }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: mpAccount } = await adminClient
        .from("organizer_mp_accounts")
        .select("mp_email, connected_at")
        .eq("organizer_id", organizer.id)
        .single();

      return new Response(
        JSON.stringify({
          connected: !!mpAccount,
          email: mpAccount?.mp_email || null,
          connected_at: mpAccount?.connected_at || null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("MP Connect error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
