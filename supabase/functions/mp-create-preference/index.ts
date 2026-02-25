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

    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(
        JSON.stringify({ error: "Missing order_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch order with items and event
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select(`
        *,
        events(id, title, organizer_id, organizer_accounts!organizer_id(id, display_name, commission_percent)),
        order_items(*, ticket_types(name))
      `)
      .eq("id", order_id)
      .eq("buyer_user_id", user.id)
      .eq("status", "pending")
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found or not pending" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if order is expired
    if (order.expires_at && new Date(order.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Order expired" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const organizer = order.events?.organizer_accounts;

    // Get commission from subscription plan (uses DB function)
    const { data: commissionResult } = await adminClient.rpc("get_organizer_commission", {
      p_organizer_id: organizer?.id,
    });
    const commissionPercent = commissionResult ?? organizer?.commission_percent ?? 10;

    // Fetch organizer's Mercado Pago account
    const { data: mpAccount } = await adminClient
      .from("organizer_mp_accounts")
      .select("mp_access_token, mp_user_id")
      .eq("organizer_id", organizer?.id)
      .single();

    if (!mpAccount) {
      return new Response(
        JSON.stringify({ error: "Organizer has not connected Mercado Pago" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate commission
    const commissionCents = Math.ceil(order.total_cents * (commissionPercent / 100));
    const sellerAmount = order.total_cents - commissionCents;

    // Build preference items
    const items = (order.order_items || []).map((item: any) => ({
      title: item.ticket_types?.name || "Ingresso",
      quantity: item.qty,
      unit_price: item.unit_price_cents / 100,
      currency_id: "BRL",
    }));

    // Build MP preference with marketplace split
    const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN")!;
    const supabaseProjectId = Deno.env.get("SUPABASE_URL")!.replace("https://", "").replace(".supabase.co", "");
    
    const preference = {
      items,
      payer: {
        email: user.email,
      },
      marketplace_fee: commissionCents / 100, // MP expects in reais
      back_urls: {
        success: `${req.headers.get("origin") || "https://upplin.lovable.app"}/pagamento-sucesso?status=approved`,
        failure: `${req.headers.get("origin") || "https://upplin.lovable.app"}/checkout/${order_id}?status=rejected`,
        pending: `${req.headers.get("origin") || "https://upplin.lovable.app"}/checkout/${order_id}?status=pending`,
      },
      auto_return: "approved",
      external_reference: order_id,
      notification_url: `${supabaseUrl}/functions/v1/mp-webhook`,
      statement_descriptor: "UPPLIN",
    };

    // Create preference using seller's access token (split payment)
    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mpAccount.mp_access_token}`,
      },
      body: JSON.stringify(preference),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("MP Error:", JSON.stringify(mpData));
      return new Response(
        JSON.stringify({ error: "Failed to create payment preference", details: mpData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update order with MP preference ID and commission
    await adminClient
      .from("orders")
      .update({
        mp_preference_id: mpData.id,
        commission_cents: commissionCents,
      })
      .eq("id", order_id);

    return new Response(
      JSON.stringify({
        preference_id: mpData.id,
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
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
