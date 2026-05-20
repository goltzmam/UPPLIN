// Actively polls Mercado Pago for the order's payment status.
// Used as a reliability fallback for webhook delivery (PIX and async card).
// Idempotent: if already paid, simply returns paid.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "Missing order_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select(`
        *,
        events(id, title, organizer_id, organizer_accounts!organizer_id(id, owner_user_id, display_name)),
        order_items(*)
      `)
      .eq("id", order_id)
      .eq("buyer_user_id", user.id)
      .maybeSingle();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already finalized
    if (order.status === "paid") {
      return new Response(JSON.stringify({ status: "paid" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (order.status === "failed" || order.status === "cancelled" || order.status === "refunded") {
      return new Response(JSON.stringify({ status: order.status }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!order.mp_payment_id) {
      return new Response(JSON.stringify({ status: order.status }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch organizer's MP token
    const orgId = order.events?.organizer_id;
    const { data: mpAcc } = await admin
      .from("organizer_mp_accounts")
      .select("mp_access_token")
      .eq("organizer_id", orgId)
      .maybeSingle();

    const token = mpAcc?.mp_access_token || Deno.env.get("MP_ACCESS_TOKEN");
    if (!token) {
      return new Response(JSON.stringify({ status: order.status }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${order.mp_payment_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!mpResp.ok) {
      console.error("MP fetch failed:", await mpResp.text());
      return new Response(JSON.stringify({ status: order.status }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payment = await mpResp.json();
    console.log("MP poll status:", payment.id, payment.status);

    if (payment.status === "approved") {
      const { error: confirmError } = await admin.rpc("confirm_paid_order", {
        p_order_id: order.id,
        p_provider: "mercadopago",
        p_provider_payment_id: payment.id?.toString(),
        p_amount_cents: Math.round((payment.transaction_amount || 0) * 100),
        p_method: payment.payment_method_id || payment.payment_type_id,
        p_raw: payment,
      });

      if (confirmError) throw confirmError;

      return new Response(JSON.stringify({ status: "paid" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payment.status === "rejected" || payment.status === "cancelled") {
      await admin.from("orders").update({ status: "failed" }).eq("id", order.id).eq("status", "pending");
      return new Response(JSON.stringify({ status: "failed" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ status: payment.status || order.status }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-payment-status error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
