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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub as string;

    const { invoiceId } = await req.json();
    if (!invoiceId) {
      return new Response(JSON.stringify({ error: "Missing invoiceId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch invoice with plan and organizer info (RLS ensures user can only see own)
    const { data: invoice, error: invError } = await supabase
      .from("subscription_invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (invError || !invoice) {
      return new Response(JSON.stringify({ error: "Fatura não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch plan name
    const { data: plan } = await supabase
      .from("subscription_plans")
      .select("name, price_cents")
      .eq("id", invoice.plan_id)
      .single();

    // Fetch organizer info
    const { data: organizer } = await supabase
      .from("organizer_accounts")
      .select("display_name, email, cnpj, cpf, city, state")
      .eq("id", invoice.organizer_id)
      .single();

    const escapeHtml = (value: unknown) => String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

    const formatCurrency = (cents: number) => {
      return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
    };

    const formatDate = (iso: string) => {
      const d = new Date(iso);
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    };

    const statusLabel: Record<string, string> = {
      paid: "Pago",
      pending: "Pendente",
      failed: "Falhou",
      refunded: "Reembolsado",
    };

    const periodStart = escapeHtml(formatDate(invoice.period_start));
    const periodEnd = escapeHtml(invoice.period_end ? formatDate(invoice.period_end) : "—");
    const paidAt = escapeHtml(invoice.paid_at ? formatDate(invoice.paid_at) : formatDate(invoice.created_at));
    const invoiceNum = escapeHtml(invoice.id.slice(0, 8).toUpperCase());
    const organizerName = escapeHtml(organizer?.display_name || "Organizador");
    const organizerEmail = organizer?.email ? escapeHtml(organizer.email) : "";
    const organizerDocument = organizer?.cnpj
      ? `CNPJ: ${escapeHtml(organizer.cnpj)}`
      : organizer?.cpf
        ? `CPF: ${escapeHtml(organizer.cpf)}`
        : "";
    const organizerLocation = organizer?.city && organizer?.state
      ? `${escapeHtml(organizer.city)} - ${escapeHtml(organizer.state)}`
      : "";
    const safeStatusKey = invoice.status === "paid" || invoice.status === "pending" || invoice.status === "failed" || invoice.status === "refunded"
      ? invoice.status
      : "pending";
    const safeStatusLabel = escapeHtml(statusLabel[invoice.status] || invoice.status);
    const safePaymentId = invoice.mp_payment_id ? escapeHtml(invoice.mp_payment_id) : "";
    const safePlanName = escapeHtml(plan?.name || invoice.plan_id);
    const safeAmount = escapeHtml(formatCurrency(invoice.amount_cents));

    // Generate a simple HTML receipt that can be converted to PDF client-side
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:;">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; padding: 40px; max-width: 700px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #FF2D2D; }
    .logo { font-size: 28px; font-weight: 900; color: #FF2D2D; letter-spacing: -1px; }
    .logo-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }
    .receipt-title { text-align: right; }
    .receipt-title h1 { font-size: 22px; color: #1e293b; }
    .receipt-title p { font-size: 12px; color: #64748b; margin-top: 4px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
    .info-block h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 6px; }
    .info-block p { font-size: 13px; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    th { background: #f8fafc; text-align: left; padding: 10px 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; border-bottom: 2px solid #e2e8f0; }
    td { padding: 12px 14px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
    .total-row td { font-weight: 700; font-size: 15px; border-top: 2px solid #1e293b; border-bottom: none; }
    .status { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .status-paid { background: #dcfce7; color: #166534; }
    .status-pending { background: #fef9c3; color: #854d0e; }
    .status-failed { background: #fecaca; color: #991b1b; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">UPPLIN</div>
      <div class="logo-sub">Plataforma de Eventos</div>
    </div>
    <div class="receipt-title">
      <h1>Comprovante</h1>
      <p>#${invoiceNum} · ${paidAt}</p>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-block">
      <h3>Emitido para</h3>
      <p><strong>${organizerName}</strong></p>
      ${organizerEmail ? `<p>${organizerEmail}</p>` : ""}
      ${organizerDocument ? `<p>${organizerDocument}</p>` : ""}
      ${organizerLocation ? `<p>${organizerLocation}</p>` : ""}
    </div>
    <div class="info-block">
      <h3>Detalhes</h3>
      <p><strong>Status:</strong> <span class="status status-${safeStatusKey}">${safeStatusLabel}</span></p>
      <p><strong>Período:</strong> ${periodStart} — ${periodEnd}</p>
      ${safePaymentId ? `<p><strong>ID Pagamento:</strong> ${safePaymentId}</p>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Descrição</th>
        <th style="text-align:right">Valor</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Assinatura Plano ${safePlanName} — ${periodStart} a ${periodEnd}</td>
        <td style="text-align:right">${safeAmount}</td>
      </tr>
      <tr class="total-row">
        <td>Total</td>
        <td style="text-align:right">${safeAmount}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <p>UPPLIN — Plataforma de Eventos · upplin.lovable.app</p>
    <p style="margin-top:4px">Documento gerado automaticamente. Não constitui nota fiscal.</p>
  </div>
</body>
</html>`;

    return new Response(JSON.stringify({ html, invoiceNumber: invoiceNum }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Generate receipt error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
