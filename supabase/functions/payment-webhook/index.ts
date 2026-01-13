import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
  provider: string;
  event_type: string;
  provider_event_id?: string;
  order_id?: string;
  payment_id?: string;
  status: "paid" | "failed" | "refunded";
  amount_cents?: number;
  method?: string;
  raw?: Record<string, unknown>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Parse webhook payload
    const payload: WebhookPayload = await req.json();
    const { 
      provider, 
      event_type, 
      provider_event_id, 
      order_id, 
      status, 
      amount_cents, 
      method,
      raw 
    } = payload;

    // Log webhook event
    const { data: webhookEvent, error: webhookError } = await adminClient
      .from("webhook_events")
      .insert({
        provider,
        event_type,
        provider_event_id,
        payload: raw || payload,
        status: "received",
      })
      .select()
      .single();

    if (webhookError) {
      console.error("Webhook logging error:", webhookError);
    }

    // Validate required fields
    if (!order_id || !status) {
      await updateWebhookStatus(adminClient, webhookEvent?.id, "failed", "Missing order_id or status");
      return new Response(
        JSON.stringify({ error: "Missing order_id or status" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      await updateWebhookStatus(adminClient, webhookEvent?.id, "failed", "Order not found");
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process based on status
    if (status === "paid") {
      // Create payment record
      const { error: paymentError } = await adminClient
        .from("payments")
        .insert({
          order_id,
          provider,
          provider_payment_id: provider_event_id,
          amount_cents: amount_cents || order.total_cents,
          status: "paid",
          method,
          raw,
        });

      if (paymentError) {
        console.error("Payment creation error:", paymentError);
        await updateWebhookStatus(adminClient, webhookEvent?.id, "failed", "Failed to create payment");
        return new Response(
          JSON.stringify({ error: "Failed to create payment" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update order status
      await adminClient
        .from("orders")
        .update({ status: "paid" })
        .eq("id", order_id);

      // Issue tickets for each order item
      const ticketsToCreate = [];
      for (const item of order.order_items || []) {
        for (let i = 0; i < item.qty; i++) {
          ticketsToCreate.push({
            order_id: order.id,
            event_id: order.event_id,
            buyer_user_id: order.buyer_user_id,
            ticket_type_id: item.ticket_type_id,
            status: "issued",
          });
        }
      }

      if (ticketsToCreate.length > 0) {
        const { error: ticketsError } = await adminClient
          .from("tickets")
          .insert(ticketsToCreate);

        if (ticketsError) {
          console.error("Tickets creation error:", ticketsError);
          await updateWebhookStatus(adminClient, webhookEvent?.id, "failed", "Failed to issue tickets");
          return new Response(
            JSON.stringify({ error: "Failed to issue tickets" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      await updateWebhookStatus(adminClient, webhookEvent?.id, "processed");

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Payment processed, tickets issued",
          tickets_count: ticketsToCreate.length 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (status === "failed") {
      // Update order status
      await adminClient
        .from("orders")
        .update({ status: "failed" })
        .eq("id", order_id);

      // Release reserved tickets
      for (const item of order.order_items || []) {
        const { data: ticketType } = await adminClient
          .from("ticket_types")
          .select("quantity_sold")
          .eq("id", item.ticket_type_id)
          .single();

        if (ticketType) {
          await adminClient
            .from("ticket_types")
            .update({ 
              quantity_sold: Math.max(0, (ticketType.quantity_sold || 0) - item.qty) 
            })
            .eq("id", item.ticket_type_id);
        }
      }

      await updateWebhookStatus(adminClient, webhookEvent?.id, "processed");

      return new Response(
        JSON.stringify({ success: true, message: "Payment failed, tickets released" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (status === "refunded") {
      // Update order status
      await adminClient
        .from("orders")
        .update({ status: "refunded" })
        .eq("id", order_id);

      // Cancel tickets
      await adminClient
        .from("tickets")
        .update({ status: "cancelled" })
        .eq("order_id", order_id);

      // Release ticket counts
      for (const item of order.order_items || []) {
        const { data: ticketType } = await adminClient
          .from("ticket_types")
          .select("quantity_sold")
          .eq("id", item.ticket_type_id)
          .single();

        if (ticketType) {
          await adminClient
            .from("ticket_types")
            .update({ 
              quantity_sold: Math.max(0, (ticketType.quantity_sold || 0) - item.qty) 
            })
            .eq("id", item.ticket_type_id);
        }
      }

      // Create refund payment record
      await adminClient
        .from("payments")
        .insert({
          order_id,
          provider,
          provider_payment_id: provider_event_id,
          amount_cents: -(amount_cents || order.total_cents),
          status: "refunded",
          method,
          raw,
        });

      await updateWebhookStatus(adminClient, webhookEvent?.id, "processed");

      return new Response(
        JSON.stringify({ success: true, message: "Payment refunded, tickets cancelled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown status" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function updateWebhookStatus(
  client: any,
  webhookId: string | undefined,
  status: "processed" | "failed",
  error?: string
) {
  if (!webhookId) return;
  
  await client
    .from("webhook_events")
    .update({ 
      status, 
      processed_at: new Date().toISOString(),
      error 
    })
    .eq("id", webhookId);
}
