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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { plan_id } = await req.json();
    if (!plan_id) {
      return new Response(
        JSON.stringify({ error: "Missing plan_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get organizer account
    const { data: organizer } = await adminClient
      .from("organizer_accounts")
      .select("id, display_name, email")
      .eq("owner_user_id", user.id)
      .single();

    if (!organizer) {
      return new Response(
        JSON.stringify({ error: "Organizer account not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get plan details
    const { data: plan } = await adminClient
      .from("subscription_plans")
      .select("*")
      .eq("id", plan_id)
      .eq("is_active", true)
      .single();

    if (!plan) {
      return new Response(
        JSON.stringify({ error: "Plan not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Free plan - just activate directly
    if (plan.price_cents === 0) {
      // Upsert subscription
      await adminClient
        .from("organizer_subscriptions")
        .upsert({
          organizer_id: organizer.id,
          plan_id: plan.id,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: null,
          mp_subscription_id: null,
        }, { onConflict: "organizer_id" });

      return new Response(
        JSON.stringify({ status: "active", plan_id: plan.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Paid plan - create MP preapproval (recurring subscription)
    const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN")!;
    const origin = Deno.env.get("SITE_URL") || "https://www.upplin.com";

    const preapprovalPayload = {
      reason: `UPPLIN ${plan.name} - ${organizer.display_name}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: plan.price_cents / 100,
        currency_id: "BRL",
      },
      back_url: `${origin}/organizador/painel/configuracoes?subscription=success`,
      payer_email: organizer.email || user.email,
      external_reference: `sub_${organizer.id}_${plan.id}`,
      status: "pending",
    };

    console.log("Creating MP preapproval:", JSON.stringify(preapprovalPayload));

    const mpResponse = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mpAccessToken}`,
      },
      body: JSON.stringify(preapprovalPayload),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("MP Preapproval Error:", JSON.stringify(mpData));
      return new Response(
        JSON.stringify({ error: "Failed to create subscription", details: mpData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("MP Preapproval created:", JSON.stringify({ id: mpData.id, init_point: mpData.init_point }));

    // Create/update subscription record as pending
    await adminClient
      .from("organizer_subscriptions")
      .upsert({
        organizer_id: organizer.id,
        plan_id: plan.id,
        status: "pending",
        current_period_start: new Date().toISOString(),
        mp_subscription_id: mpData.id,
      }, { onConflict: "organizer_id" });

    return new Response(
      JSON.stringify({
        status: "pending",
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
        preapproval_id: mpData.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
