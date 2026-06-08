// notify-refund: looks up a refund_request and sends transactional emails
// to the buyer, the organizer owner, and (for disputes/failures) admins.
// Permission: only people who can already see the refund_request via RLS
// can trigger notifications for it.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EventKey =
  | "requested"
  | "approved"
  | "rejected"
  | "disputed"
  | "pending_refund"
  | "refunded"
  | "failed";

const COPY: Record<EventKey, { headline: string; buyer: string; organizer: string; admin?: string }> = {
  requested: {
    headline: "Solicitação de reembolso recebida",
    buyer: "Recebemos sua solicitação. Você será avisado a cada atualização.",
    organizer: "Um participante solicitou reembolso. Você tem 48h para aprovar ou recusar.",
  },
  approved: {
    headline: "Reembolso aprovado",
    buyer: "O organizador aprovou seu reembolso. O estorno será processado em instantes.",
    organizer: "Você aprovou o reembolso. O estorno será enviado ao Mercado Pago.",
  },
  rejected: {
    headline: "Reembolso negado",
    buyer: "Sua solicitação foi negada após análise.",
    organizer: "Solicitação negada definitivamente.",
  },
  disputed: {
    headline: "Reembolso em análise pela UPPLIN",
    buyer: "Sua solicitação foi encaminhada à equipe UPPLIN para análise.",
    organizer: "A recusa foi escalada para a equipe UPPLIN.",
    admin: "Nova disputa de reembolso aguardando decisão administrativa.",
  },
  pending_refund: {
    headline: "Estorno em processamento",
    buyer: "Enviamos o estorno ao Mercado Pago. Em breve aparecerá no seu método de pagamento.",
    organizer: "Estorno enviado ao Mercado Pago.",
  },
  refunded: {
    headline: "Reembolso concluído",
    buyer: "O valor foi estornado para o método de pagamento original.",
    organizer: "Reembolso concluído. Os ingressos foram cancelados.",
  },
  failed: {
    headline: "Falha no reembolso",
    buyer: "Não foi possível concluir o estorno. A equipe UPPLIN foi avisada.",
    organizer: "O Mercado Pago recusou o estorno. A equipe UPPLIN foi avisada.",
    admin: "Falha em um estorno. Intervenção manual pode ser necessária.",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) return j({ error: "unauthenticated" }, 401);

    const isService = authHeader === `Bearer ${serviceKey}`;
    let actorId: string | null = null;

    if (!isService) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: uErr } = await userClient.auth.getUser();
      if (uErr || !user) return j({ error: "unauthenticated" }, 401);
      actorId = user.id;

      const body = await req.json().catch(() => ({}));
      const requestId: string | undefined = body?.request_id;
      const event: EventKey | undefined = body?.event;
      if (!requestId || !event || !(event in COPY)) return j({ error: "invalid_input" }, 400);

      // Caller must be able to see this refund (enforced by RLS)
      const { data: visible, error: visErr } = await userClient
        .from("refund_requests").select("id").eq("id", requestId).maybeSingle();
      if (visErr || !visible) return j({ error: "not_allowed" }, 403);

      return await dispatch(supabaseUrl, serviceKey, requestId, event, actorId);
    }

    const body = await req.json().catch(() => ({}));
    const requestId: string | undefined = body?.request_id;
    const event: EventKey | undefined = body?.event;
    if (!requestId || !event || !(event in COPY)) return j({ error: "invalid_input" }, 400);

    return await dispatch(supabaseUrl, serviceKey, requestId, event, null);
  } catch (err) {
    console.error("notify-refund fatal:", err);
    return j({ error: "internal_error", message: String(err) }, 500);
  }
});

async function dispatch(
  supabaseUrl: string,
  serviceKey: string,
  requestId: string,
  event: EventKey,
  actorId: string | null,
) {
  const admin = createClient(supabaseUrl, serviceKey);

    const { data: refund } = await admin
      .from("refund_requests")
      .select(`
        id, status, refund_amount_cents, order_id, organizer_id,
        requester_user_id, event_id,
        events(title, start_at),
        organizer_accounts(owner_user_id, display_name)
      `)
      .eq("id", requestId).single();

    if (!refund) return j({ error: "not_found" }, 404);

    const copy = COPY[event];
    const baseData = {
      orderId: refund.order_id,
      eventTitle: (refund.events as any)?.title,
      eventDate: (refund.events as any)?.start_at
        ? new Date((refund.events as any).start_at).toLocaleString("pt-BR")
        : undefined,
      refundStatus: event,
      refundHeadline: copy.headline,
      refundAmount: `R$ ${(refund.refund_amount_cents / 100).toFixed(2).replace(".", ",")}`,
      refundRequestId: refund.id,
    };

    // Lookup recipient emails
    const recipients: Array<{ email: string; role: "buyer" | "organizer" | "admin"; name?: string; message: string }> = [];

    const { data: buyer } = await admin
      .from("profiles").select("email, full_name").eq("id", refund.requester_user_id).maybeSingle();
    if (buyer?.email) {
      recipients.push({ email: buyer.email, role: "buyer", name: buyer.full_name || undefined, message: copy.buyer });
    }

    const ownerId = (refund.organizer_accounts as any)?.owner_user_id;
    if (ownerId) {
      const { data: org } = await admin
        .from("profiles").select("email, full_name").eq("id", ownerId).maybeSingle();
      if (org?.email) {
        recipients.push({ email: org.email, role: "organizer", name: org.full_name || undefined, message: copy.organizer });
      }
    }

    if (copy.admin) {
      const { data: adminRoles } = await admin
        .from("user_roles").select("user_id").eq("role", "admin");
      const ids = (adminRoles || []).map((r: any) => r.user_id);
      if (ids.length) {
        const { data: adminProfs } = await admin
          .from("profiles").select("email, full_name").in("id", ids);
        for (const a of adminProfs || []) {
          if (a.email) recipients.push({ email: a.email, role: "admin", name: a.full_name || undefined, message: copy.admin });
        }
      }
    }

    // Structured log
    await admin.from("refund_status_logs").insert({
      refund_request_id: refund.id,
      from_status: refund.status,
      to_status: refund.status,
      actor_user_id: user.id,
      actor_role: "system",
      note: `Notificação ${event} enviada a ${recipients.length} destinatário(s)`,
      metadata: { event, recipients: recipients.map(r => ({ role: r.role, email: r.email })) },
    });

    // Dispatch emails (service-role call to send-email)
    const sendUrl = `${supabaseUrl}/functions/v1/send-email`;
    const results: Array<Record<string, unknown>> = [];
    for (const r of recipients) {
      const resp = await fetch(sendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          type: "refund_status_update",
          to: r.email,
          data: { ...baseData, userName: r.name, refundMessage: r.message, recipientRole: r.role },
        }),
      });
      results.push({ to: r.email, role: r.role, status: resp.status });
    }

    return j({ ok: true, sent: results });
  } catch (err) {
    console.error("notify-refund fatal:", err);
    return j({ error: "internal_error", message: String(err) }, 500);
  }
});

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
