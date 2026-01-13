import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: "purchase_confirmation" | "event_reminder" | "ticket_cancelled";
  to: string;
  data: {
    userName?: string;
    eventTitle?: string;
    eventDate?: string;
    eventVenue?: string;
    ticketType?: string;
    ticketQuantity?: number;
    totalAmount?: string;
    orderId?: string;
  };
}

const emailTemplates = {
  purchase_confirmation: (data: EmailRequest["data"]) => ({
    subject: `✅ Compra confirmada - ${data.eventTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #ea580c, #f59e0b); padding: 40px 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { padding: 30px; }
          .event-card { background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #ea580c; }
          .event-title { font-size: 20px; font-weight: bold; color: #1e293b; margin-bottom: 10px; }
          .event-detail { color: #64748b; margin: 5px 0; }
          .ticket-info { background: #fef3c7; border-radius: 8px; padding: 15px; margin: 15px 0; }
          .total { font-size: 24px; font-weight: bold; color: #ea580c; text-align: center; margin: 20px 0; }
          .footer { background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px; }
          .btn { display: inline-block; background: #ea580c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Compra Confirmada!</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${data.userName || "Cliente"}</strong>,</p>
            <p>Sua compra foi realizada com sucesso! Aqui estão os detalhes:</p>
            
            <div class="event-card">
              <div class="event-title">${data.eventTitle}</div>
              <div class="event-detail">📅 ${data.eventDate}</div>
              <div class="event-detail">📍 ${data.eventVenue}</div>
            </div>
            
            <div class="ticket-info">
              <strong>Ingresso:</strong> ${data.ticketType}<br>
              <strong>Quantidade:</strong> ${data.ticketQuantity}x
            </div>
            
            <div class="total">
              Total: ${data.totalAmount}
            </div>
            
            <p style="text-align: center;">
              <a href="${Deno.env.get("SITE_URL") || "https://app.lovable.dev"}/meus-ingressos" class="btn">
                Ver Meus Ingressos
              </a>
            </p>
            
            <p style="color: #64748b; font-size: 14px;">
              Pedido: #${data.orderId?.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <div class="footer">
            <p>Influente Eventos - A melhor experiência em eventos</p>
            <p>Este é um email automático, por favor não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  event_reminder: (data: EmailRequest["data"]) => ({
    subject: `⏰ Lembrete: ${data.eventTitle} é amanhã!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #7c3aed, #db2777); padding: 40px 30px; text-align: center; }
          .header h1 { color: white; margin: 0; }
          .content { padding: 30px; }
          .event-card { background: #faf5ff; border-radius: 12px; padding: 20px; margin: 20px 0; }
          .footer { background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Não se esqueça!</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${data.userName}</strong>,</p>
            <p>Seu evento é <strong>amanhã</strong>! Não se esqueça de levar seu ingresso.</p>
            
            <div class="event-card">
              <h2 style="margin-top: 0;">${data.eventTitle}</h2>
              <p>📅 ${data.eventDate}</p>
              <p>📍 ${data.eventVenue}</p>
            </div>
            
            <p><strong>Dicas importantes:</strong></p>
            <ul>
              <li>Chegue com antecedência para evitar filas</li>
              <li>Tenha seu QR Code pronto no celular</li>
              <li>Leve um documento de identificação</li>
            </ul>
          </div>
          <div class="footer">
            <p>Influente Eventos</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  ticket_cancelled: (data: EmailRequest["data"]) => ({
    subject: `❌ Ingresso cancelado - ${data.eventTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; }
          .header { background: #dc2626; padding: 40px 30px; text-align: center; }
          .header h1 { color: white; margin: 0; }
          .content { padding: 30px; }
          .footer { background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Ingresso Cancelado</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${data.userName}</strong>,</p>
            <p>Seu ingresso para <strong>${data.eventTitle}</strong> foi cancelado.</p>
            <p>Se você não solicitou este cancelamento ou tem dúvidas, entre em contato conosco.</p>
          </div>
          <div class="footer">
            <p>Influente Eventos</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, to, data }: EmailRequest = await req.json();

    if (!type || !to || !data) {
      throw new Error("Missing required fields: type, to, data");
    }

    const template = emailTemplates[type];
    if (!template) {
      throw new Error(`Unknown email type: ${type}`);
    }

    const { subject, html } = template(data);

    // Use Resend API directly
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Influente <noreply@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });

    const result = await emailResponse.json();
    
    if (!emailResponse.ok) {
      throw new Error(result.message || "Failed to send email");
    }

    console.log("Email sent successfully:", result);

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
