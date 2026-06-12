// MP Refund: organizer/admin triggers MP refund for an approved request.
// Tickets are NOT cancelled here; that happens when the MP webhook calls
// mark_refund_completed. We only flip to pending_refund + send notifications.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) return j({ error: "unauthenticated" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return j({ error: "unauthenticated" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));
    const requestId: string | undefined = body?.request_id;
    if (!requestId) return j({ error: "missing_request_id" }, 400);

    const { data: refund, error: rErr } = await admin
      .from("refund_requests")
      .select("*, orders(id, mp_payment_id, total_cents, created_at, buyer_user_id), events(organizer_id)")
      .eq("id", requestId)
      .single();
    if (rErr || !refund) return j({ error: "refund_not_found" }, 404);

    // Permission: organizer owner OR admin
    const { data: isOwner } = await admin.rpc("is_organizer_owner", {
      _user_id: user.id, _organizer_id: refund.organizer_id,
    });
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: user.id, _role: "admin",
    });
    if (!isOwner && !isAdmin) return j({ error: "not_allowed" }, 403);

    if (refund.status !== "approved") {
      return j({ error: "refund_not_approved", status: refund.status }, 400);
    }

    const order = refund.orders;
    let paymentId = order?.mp_payment_id;
    if (!paymentId) {
      const { data: payment } = await admin
        .from("payments")
        .select("provider_payment_id")
        .eq("order_id", refund.order_id)
        .eq("provider", "mercadopago")
        .neq("amount_cents", 0)
        .order("created_at", { ascending: false })
        .maybeSingle();
      paymentId = payment?.provider_payment_id;
    }

    if (!paymentId) {
      await admin.rpc("mark_refund_failed", {
        p_request_id: requestId, p_note: "Pagamento original não encontrado",
      });
      return j({ error: "mp_payment_missing" }, 400);
    }

    // Determine fee policy:
    // Full refund within 90 days of purchase → MP returns the fee.
    // Otherwise (after 90 days) → organizer absorbs MP fee.
    const purchasedAt = new Date(order.created_at).getTime();
    const within90d = Date.now() - purchasedAt <= 90 * 24 * 3600 * 1000;
    const feePolicy = within90d ? "mp_returns_fee" : "organizer_absorbs_fee";

    // Use organizer MP token if connected, else platform token
    const { data: mpAcc } = await admin
      .from("organizer_mp_accounts")
      .select("mp_access_token")
      .eq("organizer_id", refund.organizer_id)
      .maybeSingle();
    const accessToken = mpAcc?.mp_access_token || Deno.env.get("MP_ACCESS_TOKEN");
    if (!accessToken) {
      await admin.rpc("mark_refund_failed", {
        p_request_id: requestId, p_note: "Token MP indisponível",
      });
      return j({ error: "mp_token_missing" }, 500);
    }

    const mpResp = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}/refunds`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": `refund-${requestId}`,
        },
        body: JSON.stringify({}), // total refund
      },
    );

    const mpData = await mpResp.json().catch(() => ({}));
    if (!mpResp.ok) {
      console.error("MP refund error:", mpResp.status, mpData);
      await admin.rpc("mark_refund_failed", {
        p_request_id: requestId,
        p_note: `MP ${mpResp.status}: ${JSON.stringify(mpData).slice(0, 200)}`,
      });
      return j({ error: "mp_refund_failed", details: mpData }, 502);
    }

    // Move to pending_refund first for audit, then finalize immediately on MP success.
    // The webhook can still arrive later; mark_refund_completed is idempotent.
    await admin.rpc("mark_refund_pending", {
      p_request_id: requestId,
      p_mp_refund_id: String(mpData?.id ?? ""),
      p_fee_policy: feePolicy,
    });

    await admin.rpc("mark_refund_completed", {
      p_request_id: requestId,
      p_mp_refund_id: String(mpData?.id ?? ""),
    });

    // Fire-and-forget transactional emails for pending_refund
    fetch(`${supabaseUrl}/functions/v1/notify-refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ request_id: requestId, event: "pending_refund" }),
    }).catch((e) => console.error("notify-refund (pending) failed:", e));

    return j({ ok: true, status: "refunded", refund_id: mpData?.id, fee_policy: feePolicy });
  } catch (err) {
    console.error("mp-refund fatal:", err);
    return j({ error: "internal_error", message: String(err) }, 500);
  }
});

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
