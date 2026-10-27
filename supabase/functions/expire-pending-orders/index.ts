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

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey || req.headers.get("Authorization") !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Find all pending orders that have expired
    const { data: expiredOrders, error: fetchError } = await adminClient
      .from("orders")
      .select("*, order_items(*)")
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString());

    if (fetchError) {
      console.error("Error fetching expired orders:", fetchError);
      return new Response(JSON.stringify({ error: "Failed to fetch orders" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      return new Response(JSON.stringify({ ok: true, expired: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let expiredCount = 0;

    for (const order of expiredOrders) {
      const { data: released, error: releaseError } = await adminClient.rpc("release_pending_order", {
        p_order_id: order.id,
        p_target_status: "cancelled",
      });
      if (releaseError) throw releaseError;
      if (!released) continue;

      // Notify buyer that order expired
      try {
        const { data: event } = await adminClient
          .from("events")
          .select("title")
          .eq("id", order.event_id)
          .single();

        await adminClient.from("notifications").insert({
          user_id: order.buyer_user_id,
          title: "⏰ Pedido expirado",
          body: `Seu pedido para "${event?.title || "evento"}" expirou pois o pagamento não foi confirmado a tempo. Você pode tentar novamente.`,
          type: "order_expired",
          data: { order_id: order.id, event_id: order.event_id },
        });
      } catch (notifErr) {
        console.error("Error sending expiry notification:", notifErr);
      }

      expiredCount++;
    }

    console.log(`Expired ${expiredCount} pending orders`);

    return new Response(JSON.stringify({ ok: true, expired: expiredCount }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Expire orders error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
