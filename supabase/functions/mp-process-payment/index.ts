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

    const {
      order_id,
      token,
      payment_method_id,
      installments,
      issuer_id,
      payer_email,
      identification_type,
      identification_number,
    } = await req.json();

    if (!order_id || !token || !payment_method_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: order_id, token, payment_method_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch order with items and event/organizer
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

    // Check expiry
    if (order.expires_at && new Date(order.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Order expired" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const organizer = order.events?.organizer_accounts;

    // Get dynamic commission
    const { data: commissionResult } = await adminClient.rpc("get_organizer_commission", {
      p_organizer_id: organizer?.id,
    });
    const commissionPercent = commissionResult ?? organizer?.commission_percent ?? 10;

    // Fetch organizer's MP account
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

    // Calculate split
    const transactionAmount = order.total_cents / 100;
    const commissionCents = Math.ceil(order.total_cents * (commissionPercent / 100));
    const applicationFee = commissionCents / 100;

    // Create payment via MP API using seller's access token (marketplace split)
    const paymentPayload: Record<string, unknown> = {
      transaction_amount: transactionAmount,
      token,
      description: order.events?.title || "Ingresso UPPLIN",
      installments: installments || 1,
      payment_method_id,
      statement_descriptor: "UPPLIN",
      external_reference: order_id,
      application_fee: applicationFee,
      payer: {
        email: payer_email || user.email,
        ...(identification_type && identification_number
          ? {
              identification: {
                type: identification_type,
                number: identification_number,
              },
            }
          : {}),
      },
      notification_url: `${supabaseUrl}/functions/v1/mp-webhook`,
    };

    if (issuer_id) {
      paymentPayload.issuer_id = issuer_id;
    }

    console.log("Creating MP payment with payload:", JSON.stringify({
      transaction_amount: transactionAmount,
      application_fee: applicationFee,
      payment_method_id,
      installments,
      order_id,
    }));

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mpAccount.mp_access_token}`,
        "X-Idempotency-Key": `order-${order_id}-${Date.now()}`,
      },
      body: JSON.stringify(paymentPayload),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("MP Payment Error:", JSON.stringify(mpData));
      const errorMessage = mpData?.message || mpData?.cause?.[0]?.description || "Erro ao processar pagamento";
      return new Response(
        JSON.stringify({ error: errorMessage, details: mpData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("MP Payment created:", JSON.stringify({
      id: mpData.id,
      status: mpData.status,
      status_detail: mpData.status_detail,
    }));

    // Update order with payment info and commission
    await adminClient
      .from("orders")
      .update({
        mp_payment_id: mpData.id?.toString(),
        commission_cents: commissionCents,
      })
      .eq("id", order_id);

    // If payment approved immediately, process it
    if (mpData.status === "approved") {
      // Create payment record
      await adminClient.from("payments").insert({
        order_id,
        provider: "mercadopago",
        provider_payment_id: mpData.id.toString(),
        amount_cents: Math.round(mpData.transaction_amount * 100),
        status: "paid",
        method: mpData.payment_method_id || mpData.payment_type_id,
        raw: mpData,
      });

      // Update order status
      await adminClient
        .from("orders")
        .update({ status: "paid" })
        .eq("id", order_id);

      // Issue tickets
      const ticketsToCreate = [];
      for (const item of order.order_items || []) {
        for (let i = 0; i < (item as any).qty; i++) {
          ticketsToCreate.push({
            order_id: order.id,
            event_id: order.event_id,
            buyer_user_id: order.buyer_user_id,
            ticket_type_id: (item as any).ticket_type_id,
            status: "issued",
          });
        }
      }

      if (ticketsToCreate.length > 0) {
        await adminClient.from("tickets").insert(ticketsToCreate);
      }

      console.log(`Order ${order_id} paid inline, ${ticketsToCreate.length} tickets issued`);
    } else if (mpData.status === "rejected") {
      await adminClient
        .from("orders")
        .update({ status: "failed" })
        .eq("id", order_id);

      // Release reserved tickets
      for (const item of order.order_items || []) {
        const { data: ticketType } = await adminClient
          .from("ticket_types")
          .select("quantity_sold")
          .eq("id", (item as any).ticket_type_id)
          .single();

        if (ticketType) {
          await adminClient
            .from("ticket_types")
            .update({
              quantity_sold: Math.max(0, (ticketType.quantity_sold || 0) - (item as any).qty),
            })
            .eq("id", (item as any).ticket_type_id);
        }
      }
    }
    // "pending" / "in_process" - order stays pending, webhook will handle it

    return new Response(
      JSON.stringify({
        status: mpData.status,
        status_detail: mpData.status_detail,
        payment_id: mpData.id,
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
