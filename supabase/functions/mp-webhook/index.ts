import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Mercado Pago webhook signature verification
async function verifyMPSignature(req: Request, rawBody: string): Promise<boolean> {
  const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.warn("WEBHOOK_SECRET not set, skipping MP signature verification");
    return true; // Allow if secret not configured (development)
  }

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  if (!xSignature || !xRequestId) {
    console.error("Missing x-signature or x-request-id headers");
    return false;
  }

  // Parse x-signature: "ts=TIMESTAMP,v1=HASH"
  const parts: Record<string, string> = {};
  for (const part of xSignature.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key && value) parts[key.trim()] = value.trim();
  }

  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) {
    console.error("Invalid x-signature format");
    return false;
  }

  // Reject signatures older than 5 minutes (replay attack prevention)
  const signatureAge = Date.now() - parseInt(ts) * 1000;
  if (signatureAge > 5 * 60 * 1000) {
    console.error("Webhook signature too old, possible replay attack");
    return false;
  }

  // Parse data.id from body for signature template
  let dataId = "";
  try {
    const parsed = JSON.parse(rawBody);
    dataId = parsed?.data?.id?.toString() || "";
  } catch {
    // ignore parse errors
  }

  // Build the manifest string per MP docs
  // Template: id:[data.id];request-id:[x-request-id];ts:[ts];
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  // Compute HMAC-SHA256
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(manifest));
  const computedHash = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (computedHash !== v1) {
    console.error("Webhook signature mismatch");
    return false;
  }

  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Read raw body for signature verification
    const rawBody = await req.text();

    // Verify Mercado Pago webhook signature
    const isValid = await verifyMPSignature(req, rawBody);
    if (!isValid) {
      console.error("Invalid webhook signature - rejecting request");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Parse body from raw text (already consumed)
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate webhook payload structure
    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("MP Webhook received (verified):", JSON.stringify(body));

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

    // First try to find the order by the payment's external_reference
    // We need to fetch the payment details - try with platform token first, then organizer token
    let payment: any = null;
    
    // Try with platform MP_ACCESS_TOKEN first
    const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN");
    if (mpAccessToken) {
      const paymentResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${data.id}`,
        { headers: { Authorization: `Bearer ${mpAccessToken}` } }
      );
      if (paymentResponse.ok) {
        payment = await paymentResponse.json();
      } else {
        await paymentResponse.text(); // consume body
      }
    }

    // If platform token didn't work, try finding via order -> organizer -> mp_account
    if (!payment) {
      // Look for order with this mp_payment_id
      const { data: orderByPayment } = await adminClient
        .from("orders")
        .select("event_id, events(organizer_id)")
        .eq("mp_payment_id", data.id.toString())
        .maybeSingle();

      let organizerToken: string | null = null;
      if (orderByPayment) {
        const orgId = (orderByPayment.events as any)?.organizer_id;
        if (orgId) {
          const { data: mpAcc } = await adminClient
            .from("organizer_mp_accounts")
            .select("mp_access_token")
            .eq("organizer_id", orgId)
            .single();
          organizerToken = mpAcc?.mp_access_token || null;
        }
      }

      if (organizerToken) {
        const paymentResponse = await fetch(
          `https://api.mercadopago.com/v1/payments/${data.id}`,
          { headers: { Authorization: `Bearer ${organizerToken}` } }
        );
        if (paymentResponse.ok) {
          payment = await paymentResponse.json();
        } else {
          console.error("Failed to fetch MP payment with organizer token:", paymentResponse.status);
          await paymentResponse.text();
        }
      }
    }

    if (!payment) {
      console.error("Failed to fetch MP payment with any token:", data.id);
      return new Response(JSON.stringify({ error: "Failed to fetch payment" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      // Already paid? Continue idempotently to ensure tickets/conversation exist
      if (order.status === "paid") {
        console.log(`Order ${orderId} already paid; confirming side effects idempotently`);
      }

      const { data: confirmResult, error: confirmError } = await adminClient.rpc("confirm_paid_order", {
        p_order_id: orderId,
        p_provider: "mercadopago",
        p_provider_payment_id: payment.id?.toString(),
        p_amount_cents: Math.round((payment.transaction_amount || 0) * 100),
        p_method: payment.payment_method_id || payment.payment_type_id,
        p_raw: payment,
      });

      if (confirmError) throw confirmError;
      const confirmedTicketsCount = Number((confirmResult as any)?.tickets_created ?? 0);

      // Notify buyer about confirmed payment
      try {
        const { data: event } = await adminClient
          .from("events")
          .select("title, organizer_id, start_at, venue_name, organizer_accounts!organizer_id(owner_user_id, display_name)")
          .eq("id", order.event_id)
          .single();

        const totalReais = (payment.transaction_amount || 0).toFixed(2).replace(".", ",");
        const paymentMethod = payment.payment_method_id || payment.payment_type_id || "";
        const isPix = paymentMethod === "pix" || payment.payment_type_id === "bank_transfer";

        // Notify buyer in-app
        await adminClient.from("notifications").insert({
          user_id: order.buyer_user_id,
          title: isPix ? "✅ PIX confirmado!" : "✅ Pagamento confirmado!",
          body: `Seu pagamento de R$ ${totalReais} para "${event?.title || "evento"}" foi confirmado. Seus ingressos já estão disponíveis!`,
          type: "payment_confirmed",
          data: {
            order_id: orderId,
            event_id: order.event_id,
            total_cents: Math.round((payment.transaction_amount || 0) * 100),
            tickets_count: confirmedTicketsCount,
          },
        });

        // Send PIX confirmation email
        if (isPix) {
          const { data: buyerProfile } = await adminClient
            .from("profiles")
            .select("email, full_name")
            .eq("id", order.buyer_user_id)
            .single();

          if (buyerProfile?.email) {
            // Get first ticket type name
            let ticketTypeName = "";
            if (order.order_items?.length > 0) {
              const { data: tt } = await adminClient
                .from("ticket_types")
                .select("name")
                .eq("id", order.order_items[0].ticket_type_id)
                .single();
              ticketTypeName = tt?.name || "";
            }

            const eventDate = event?.start_at
              ? new Date(event.start_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
              : "";

            try {
              await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                },
                body: JSON.stringify({
                  type: "pix_confirmed",
                  to: buyerProfile.email,
                  data: {
                    userName: buyerProfile.full_name || "",
                    eventTitle: event?.title || "Evento",
                    eventDate,
                    eventVenue: event?.venue_name || "",
                    ticketType: ticketTypeName,
                    ticketQuantity: confirmedTicketsCount,
                    totalAmount: `R$ ${totalReais}`,
                    orderId: orderId,
                  },
                }),
              });
              console.log(`PIX confirmation email sent to ${buyerProfile.email}`);
            } catch (emailErr) {
              console.error("Error sending PIX confirmation email:", emailErr);
            }
          }
        }

        // Notify organizer about the payment
        if (event?.organizer_accounts) {
          const organizer = event.organizer_accounts as any;
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
        console.error("Error creating notifications:", notifErr);
      }

      console.log(`Order ${orderId} paid, ${confirmedTicketsCount} tickets issued`);
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
      const periodStart = new Date();

      const { data: subUpsert } = await adminClient
        .from("organizer_subscriptions")
        .upsert({
          organizer_id: organizerId,
          plan_id: planId,
          status: "active",
          current_period_start: periodStart.toISOString(),
          current_period_end: nextPeriodEnd.toISOString(),
          mp_subscription_id: preapprovalId,
        }, { onConflict: "organizer_id" })
        .select("id")
        .single();

      // Fetch plan to get price
      const { data: plan } = await adminClient
        .from("subscription_plans")
        .select("name, price_cents")
        .eq("id", planId)
        .single();

      // Record subscription invoice
      if (subUpsert) {
        await adminClient.from("subscription_invoices").insert({
          organizer_id: organizerId,
          subscription_id: subUpsert.id,
          plan_id: planId,
          amount_cents: plan?.price_cents || 0,
          status: "paid",
          paid_at: new Date().toISOString(),
          period_start: periodStart.toISOString(),
          period_end: nextPeriodEnd.toISOString(),
          mp_payment_id: preapprovalId,
        });
      }

      // Notify organizer
      const { data: org } = await adminClient
        .from("organizer_accounts")
        .select("owner_user_id, display_name")
        .eq("id", organizerId)
        .single();

      if (org) {
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
