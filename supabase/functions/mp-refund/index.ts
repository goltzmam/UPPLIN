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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return json({ error: "unauthenticated" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "unauthenticated" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const requestId = body?.request_id;
    if (!requestId) return json({ error: "missing_request_id" }, 400);

    // Load refund request
    const { data: refund, error: refundErr } = await admin
      .from("refund_requests")
      .select("*, orders(*, events(organizer_id))")
      .eq("id", requestId)
      .single();
    if (refundErr || !refund) return json({ error: "refund_not_found" }, 404);

    // Permission: organizer owner OR admin OR forced_by_admin
    const { data: isOwner } = await admin.rpc("is_organizer_owner", {
      _user_id: user.id,
      _organizer_id: refund.organizer_id,
    });
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isOwner && !isAdmin) {
      return json({ error: "not_allowed" }, 403);
    }

    if (refund.status !== "approved") {
      return json({ error: "refund_not_approved", status: refund.status }, 400);
    }

    const order = refund.orders;
    if (!order?.mp_payment_id) {
      await admin.rpc("mark_refund_failed", {
        p_request_id: requestId,
        p_note: "Pagamento original não encontrado",
      });
      return json({ error: "mp_payment_missing" }, 400);
    }

    // Get organizer MP token
    const { data: mpAcc } = await admin
      .from("organizer_mp_accounts")
      .select("mp_access_token")
      .eq("organizer_id", refund.organizer_id)
      .maybeSingle();

    const accessToken =
      mpAcc?.mp_access_token || Deno.env.get("MP_ACCESS_TOKEN");

    if (!accessToken) {
      await admin.rpc("mark_refund_failed", {
        p_request_id: requestId,
        p_note: "Token MP indisponível",
      });
      return json({ error: "mp_token_missing" }, 500);
    }

    // Call Mercado Pago refund API (total refund)
    const mpResp = await fetch(
      `https://api.mercadopago.com/v1/payments/${order.mp_payment_id}/refunds`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": `refund-${requestId}`,
        },
        body: JSON.stringify({}),
      }
    );

    const mpData = await mpResp.json().catch(() => ({}));
    if (!mpResp.ok) {
      console.error("MP refund error:", mpResp.status, mpData);
      await admin.rpc("mark_refund_failed", {
        p_request_id: requestId,
        p_note: `MP ${mpResp.status}: ${JSON.stringify(mpData).slice(0, 200)}`,
      });
      return json({ error: "mp_refund_failed", details: mpData }, 502);
    }

    // Mark completed in DB (cancels tickets, releases stock, notifies buyer)
    await admin.rpc("mark_refund_completed", {
      p_request_id: requestId,
      p_mp_refund_id: String(mpData?.id ?? ""),
    });

    return json({ ok: true, refund_id: mpData?.id });
  } catch (err) {
    console.error("mp-refund fatal:", err);
    return json({ error: "internal_error", message: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
