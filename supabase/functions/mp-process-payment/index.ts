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

    const body = await req.json();
    const {
      order_id,
      payment_type, // "card" or "pix"
      // Card fields
      token,
      payment_method_id,
      installments,
      issuer_id,
      payer_email,
      identification_type,
      identification_number,
    } = body;

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: "Missing order_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isPixPayment = payment_type === "pix";

    if (!isPixPayment && (!token || !payment_method_id)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields for card payment: token, payment_method_id" }),
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
        events(id, title, organizer_id, organizer_accounts!organizer_id(id, owner_user_id, display_name, commission_percent)),
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

    if (order.expires_at && new Date(order.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Order expired" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const organizer = order.events?.organizer_accounts;

    const { data: commissionResult } = await adminClient.rpc("get_organizer_commission", {
      p_organizer_id: organizer?.id,
    });
    const commissionPercent = commissionResult ?? organizer?.commission_percent ?? 10;

    const { data: mpAccount } = await adminClient
      .from("organizer_mp_accounts")
      .select("mp_access_token, mp_user_id")
      .eq("organizer_id", organizer?.id)
      .single();

    if (!mpAccount) {
      return new Response(
        JSON.stringify({
          error: "O organizador deste evento ainda não conectou a conta Mercado Pago. Pagamentos estarão disponíveis assim que a conexão for feita.",
          code: "ORGANIZER_MP_NOT_CONNECTED",
          organizer_name: organizer?.display_name ?? null,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transactionAmount = order.total_cents / 100;
    const commissionCents = Math.ceil(order.total_cents * (commissionPercent / 100));
    const applicationFee = commissionCents / 100;

    if (isPixPayment) {
      const { data: existingPix } = await adminClient
        .from("payments")
        .select("provider_payment_id, raw")
        .eq("order_id", order_id)
        .eq("provider", "mercadopago")
        .eq("method", "pix")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const pixData = (existingPix?.raw as any)?.point_of_interaction?.transaction_data;
      if (existingPix?.provider_payment_id && pixData?.qr_code) {
        return new Response(
          JSON.stringify({
            status: "pending",
            payment_id: Number(existingPix.provider_payment_id),
            pix_qr_code: pixData.qr_code,
            pix_qr_code_base64: pixData.qr_code_base64,
            pix_expiration: (existingPix.raw as any)?.date_of_expiration,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate qty limits (max 10 per ticket type per order to prevent abuse)
    for (const item of order.order_items || []) {
      if ((item as any).qty > 10) {
        return new Response(
          JSON.stringify({ error: "Maximum 10 tickets per type per order" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Build payment payload
    const paymentPayload: Record<string, unknown> = {
      transaction_amount: transactionAmount,
      description: order.events?.title || "Ingresso UPPLIN",
      statement_descriptor: "UPPLIN",
      external_reference: order_id,
      application_fee: applicationFee,
      notification_url: `${supabaseUrl}/functions/v1/mp-webhook`,
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
    };

    if (isPixPayment) {
      paymentPayload.payment_method_id = "pix";
    } else {
      paymentPayload.token = token;
      paymentPayload.payment_method_id = payment_method_id;
      paymentPayload.installments = installments || 1;
      if (issuer_id) paymentPayload.issuer_id = issuer_id;
    }

    console.log("Creating MP payment:", JSON.stringify({
      type: isPixPayment ? "pix" : "card",
      transaction_amount: transactionAmount,
      application_fee: applicationFee,
      order_id,
    }));

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mpAccount.mp_access_token}`,
        "X-Idempotency-Key": isPixPayment
          ? `order-${order_id}-pix`
          : `order-${order_id}-card-${crypto.randomUUID()}`,
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
      payment_method: mpData.payment_method_id,
    }));

    // Validate payment amount matches order total (prevent amount manipulation)
    if (mpData.transaction_amount && Math.round(mpData.transaction_amount * 100) !== order.total_cents) {
      console.error(`Amount mismatch: MP=${mpData.transaction_amount * 100}, order=${order.total_cents}`);
      return new Response(
        JSON.stringify({ error: "Payment amount does not match order total" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update order with payment info
    await adminClient
      .from("orders")
      .update({
        mp_payment_id: mpData.id?.toString(),
        commission_cents: commissionCents,
      })
      .eq("id", order_id);

    // Build response
    const response: Record<string, unknown> = {
      status: mpData.status,
      status_detail: mpData.status_detail,
      payment_id: mpData.id,
    };

    // For PIX, include QR code data
    if (isPixPayment && mpData.point_of_interaction?.transaction_data) {
      response.pix_qr_code = mpData.point_of_interaction.transaction_data.qr_code;
      response.pix_qr_code_base64 = mpData.point_of_interaction.transaction_data.qr_code_base64;
      response.pix_expiration = mpData.date_of_expiration;
    }

    // Handle approved payments inline
    if (mpData.status === "approved") {
      await handleApprovedPayment(adminClient, order, order_id, mpData);
    } else if (mpData.status === "rejected") {
      await handleRejectedPayment(adminClient, order, order_id);
    } else if (isPixPayment && (mpData.status === "pending" || mpData.status === "in_process")) {
      // Save pending PIX payment so user can retrieve QR code later
      await adminClient.from("payments").upsert({
        order_id: order_id,
        provider: "mercadopago",
        provider_payment_id: mpData.id.toString(),
        amount_cents: Math.round(mpData.transaction_amount * 100),
        status: "pending",
        method: "pix",
        raw: mpData,
      }, { onConflict: "provider,provider_payment_id" });

      // Send PIX QR Code email to user
      try {
        const pixData = mpData.point_of_interaction?.transaction_data;
        const expirationDate = mpData.date_of_expiration
          ? new Date(mpData.date_of_expiration).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
          : "30 minutos";

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            type: "pix_pending",
            to: user.email,
            data: {
              userName: user.user_metadata?.full_name || user.user_metadata?.name || undefined,
              eventTitle: order.events?.title || "Evento",
              totalAmount: `R$ ${(order.total_cents / 100).toFixed(2).replace(".", ",")}`,
              orderId: order_id,
              pixQrCodeBase64: pixData?.qr_code_base64 || undefined,
              pixCopyPaste: pixData?.qr_code || undefined,
              pixExpiration: expirationDate,
              paymentLink: `${Deno.env.get("SITE_URL") || "https://upplin.lovable.app"}/pagamento-pendente/${order_id}`,
            },
          }),
        });
        console.log("PIX pending email sent to", user.email);
      } catch (emailErr) {
        console.error("Failed to send PIX email:", emailErr);
        // Don't fail the payment flow if email fails
      }
    }

    return new Response(
      JSON.stringify(response),
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

async function handleApprovedPayment(adminClient: any, order: any, orderId: string, mpData: any) {
  const { data, error } = await adminClient.rpc("confirm_paid_order", {
    p_order_id: orderId,
    p_provider: "mercadopago",
    p_provider_payment_id: mpData.id?.toString(),
    p_amount_cents: Math.round((mpData.transaction_amount || 0) * 100),
    p_method: mpData.payment_method_id || mpData.payment_type_id,
    p_raw: mpData,
  });

  if (error) throw error;
  console.log(`Order ${orderId} paid inline`, JSON.stringify(data));
}

async function handleRejectedPayment(adminClient: any, order: any, orderId: string) {
  await adminClient.from("orders").update({ status: "failed" }).eq("id", orderId);

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
