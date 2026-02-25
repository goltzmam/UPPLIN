import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log("MP Webhook received:", JSON.stringify(body));

    // Mercado Pago sends different notification types
    const { type, data, action } = body;

    // Log webhook event
    await adminClient.from("webhook_events").insert({
      provider: "mercadopago",
      event_type: type || action || "unknown",
      provider_event_id: data?.id?.toString(),
      payload: body,
      status: "received",
    });

    // Handle subscription (preapproval) notifications
    if (type === "subscription_preapproval" || action === "updated") {
      if (data?.id) {
        await handleSubscriptionWebhook(adminClient, data.id);
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // We only care about payment notifications
    if (type !== "payment" && action !== "payment.updated") {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!data?.id) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch payment details from Mercado Pago
    const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN")!;
    const paymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${data.id}`,
      {
        headers: { Authorization: `Bearer ${mpAccessToken}` },
      }
    );

    if (!paymentResponse.ok) {
      console.error("Failed to fetch MP payment:", paymentResponse.status);
      return new Response(JSON.stringify({ error: "Failed to fetch payment" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payment = await paymentResponse.json();
    console.log("MP Payment details:", JSON.stringify({
      id: payment.id,
      status: payment.status,
      external_reference: payment.external_reference,
      transaction_amount: payment.transaction_amount,
    }));

    const orderId = payment.external_reference;
    if (!orderId) {
      console.log("No external_reference found, skipping");
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch order
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("Order not found:", orderId);
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map MP status to our status
    if (payment.status === "approved") {
      // Already paid? Skip
      if (order.status === "paid") {
        return new Response(JSON.stringify({ ok: true, message: "Already processed" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create payment record
      await adminClient.from("payments").insert({
        order_id: orderId,
        provider: "mercadopago",
        provider_payment_id: payment.id.toString(),
        amount_cents: Math.round(payment.transaction_amount * 100),
        status: "paid",
        method: payment.payment_method_id || payment.payment_type_id,
        raw: payment,
      });

      // Update order
      await adminClient
        .from("orders")
        .update({ status: "paid", mp_payment_id: payment.id.toString() })
        .eq("id", orderId);

      // Issue tickets
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
        }
      }

      // Notify organizer about the payment
      try {
        const { data: event } = await adminClient
          .from("events")
          .select("title, organizer_id, organizer_accounts!organizer_id(owner_user_id, display_name)")
          .eq("id", order.event_id)
          .single();

        if (event?.organizer_accounts) {
          const organizer = event.organizer_accounts as any;
          const totalReais = (payment.transaction_amount || 0).toFixed(2).replace(".", ",");
          const commissionCents = order.commission_cents || 0;
          const commissionReais = (commissionCents / 100).toFixed(2).replace(".", ",");
          const netCents = Math.round((payment.transaction_amount || 0) * 100) - commissionCents;
          const netReais = (netCents / 100).toFixed(2).replace(".", ",");

          await adminClient.from("notifications").insert({
            user_id: organizer.owner_user_id,
            title: "💰 Nova venda!",
            body: `Venda de R$ ${totalReais} no evento "${event.title}". Comissão: R$ ${commissionReais} | Valor líquido: R$ ${netReais}`,
            type: "payment_received",
            data: {
              order_id: orderId,
              event_id: order.event_id,
              total_cents: Math.round((payment.transaction_amount || 0) * 100),
              commission_cents: commissionCents,
              net_cents: netCents,
            },
          });
        }
      } catch (notifErr) {
        console.error("Error creating organizer notification:", notifErr);
      }

      console.log(`Order ${orderId} paid, ${ticketsToCreate.length} tickets issued`);
    } else if (payment.status === "rejected" || payment.status === "cancelled") {
      await adminClient
        .from("orders")
        .update({ status: "failed", mp_payment_id: payment.id.toString() })
        .eq("id", orderId);

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
              quantity_sold: Math.max(0, (ticketType.quantity_sold || 0) - item.qty),
            })
            .eq("id", item.ticket_type_id);
        }
      }

      console.log(`Order ${orderId} failed/cancelled, tickets released`);
    } else if (payment.status === "refunded") {
      await adminClient
        .from("orders")
        .update({ status: "refunded", mp_payment_id: payment.id.toString() })
        .eq("id", orderId);

      await adminClient
        .from("tickets")
        .update({ status: "cancelled" })
        .eq("order_id", orderId);

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
              quantity_sold: Math.max(0, (ticketType.quantity_sold || 0) - item.qty),
            })
            .eq("id", item.ticket_type_id);
        }
      }

      // Create refund payment record
      await adminClient.from("payments").insert({
        order_id: orderId,
        provider: "mercadopago",
        provider_payment_id: payment.id.toString(),
        amount_cents: -Math.round(payment.transaction_amount * 100),
        status: "refunded",
        method: payment.payment_method_id,
        raw: payment,
      });

      console.log(`Order ${orderId} refunded, tickets cancelled`);
    }
    // "pending" and "in_process" — do nothing, order stays pending

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("MP Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleSubscriptionWebhook(adminClient: any, preapprovalId: string) {
  try {
    const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN")!;
    const resp = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      headers: { Authorization: `Bearer ${mpAccessToken}` },
    });

    if (!resp.ok) {
      console.error("Failed to fetch preapproval:", resp.status);
      return;
    }

    const preapproval = await resp.json();
    console.log("Preapproval details:", JSON.stringify({
      id: preapproval.id,
      status: preapproval.status,
      external_reference: preapproval.external_reference,
    }));

    const externalRef = preapproval.external_reference;
    if (!externalRef?.startsWith("sub_")) return;

    // Parse: sub_{organizer_id}_{plan_id}
    const parts = externalRef.split("_");
    const organizerId = parts.slice(1, -1).join("_");
    const planId = parts[parts.length - 1];

    if (preapproval.status === "authorized") {
      // Subscription approved - activate
      const nextPeriodEnd = new Date();
      nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

      await adminClient
        .from("organizer_subscriptions")
        .upsert({
          organizer_id: organizerId,
          plan_id: planId,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: nextPeriodEnd.toISOString(),
          mp_subscription_id: preapprovalId,
        }, { onConflict: "organizer_id" });

      // Notify organizer
      const { data: org } = await adminClient
        .from("organizer_accounts")
        .select("owner_user_id, display_name")
        .eq("id", organizerId)
        .single();

      if (org) {
        const { data: plan } = await adminClient
          .from("subscription_plans")
          .select("name")
          .eq("id", planId)
          .single();

        await adminClient.from("notifications").insert({
          user_id: org.owner_user_id,
          title: "✅ Assinatura ativada!",
          body: `Seu plano ${plan?.name || planId} foi ativado com sucesso. Aproveite os benefícios!`,
          type: "subscription_activated",
          data: { organizer_id: organizerId, plan_id: planId },
        });
      }

      console.log(`Subscription activated: organizer=${organizerId}, plan=${planId}`);
    } else if (preapproval.status === "cancelled" || preapproval.status === "paused") {
      // Downgrade to free
      await adminClient
        .from("organizer_subscriptions")
        .upsert({
          organizer_id: organizerId,
          plan_id: "free",
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: null,
          mp_subscription_id: null,
        }, { onConflict: "organizer_id" });

      const { data: org } = await adminClient
        .from("organizer_accounts")
        .select("owner_user_id")
        .eq("id", organizerId)
        .single();

      if (org) {
        await adminClient.from("notifications").insert({
          user_id: org.owner_user_id,
          title: "📋 Assinatura cancelada",
          body: "Sua assinatura foi cancelada. Você foi migrado para o plano Free.",
          type: "subscription_cancelled",
          data: { organizer_id: organizerId },
        });
      }

      console.log(`Subscription cancelled, downgraded to free: organizer=${organizerId}`);
    }
  } catch (err) {
    console.error("Error handling subscription webhook:", err);
  }
}
