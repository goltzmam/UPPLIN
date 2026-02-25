import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Update this with your verified Resend domain, or keep resend.dev for testing
const FROM_EMAIL = "UPPLIN <onboarding@resend.dev>";
const SITE_URL = Deno.env.get("SITE_URL") || "https://upplin.lovable.app";

interface EmailRequest {
  type: "purchase_confirmation" | "event_reminder" | "ticket_cancelled" | "password_reset" | "welcome" | "welcome_organizer" | "pix_pending";
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
    resetLink?: string;
    companyName?: string;
    pixQrCodeBase64?: string;
    pixCopyPaste?: string;
    pixExpiration?: string;
    paymentLink?: string;
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A); padding: 40px 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { padding: 30px; }
          .event-card { background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #FF2D2D; }
          .event-title { font-size: 20px; font-weight: bold; color: #1e293b; margin-bottom: 10px; }
          .event-detail { color: #64748b; margin: 5px 0; }
          .ticket-info { background: #fff7ed; border-radius: 8px; padding: 15px; margin: 15px 0; border: 1px solid #fed7aa; }
          .total { font-size: 24px; font-weight: bold; color: #FF2D2D; text-align: center; margin: 20px 0; }
          .footer { background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px; }
          .btn { display: inline-block; background: linear-gradient(135deg, #FF6A00, #FF2D2D); color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px 0; }
          .logo { font-size: 24px; font-weight: 900; color: white; letter-spacing: -1px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">UPPLIN</div>
            <h1 style="margin-top: 12px;">🎉 Compra Confirmada!</h1>
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
            
            <div class="total">Total: ${data.totalAmount}</div>
            
            <p style="text-align: center;">
              <a href="${SITE_URL}/meus-ingressos" class="btn">Ver Meus Ingressos</a>
            </p>
            
            <p style="color: #64748b; font-size: 14px; text-align: center;">
              Pedido: #${data.orderId?.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <div class="footer">
            <p><strong>UPPLIN</strong> — A melhor experiência em eventos</p>
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A); padding: 40px 30px; text-align: center; }
          .content { padding: 30px; }
          .event-card { background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #FF6A00; }
          .footer { background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px; }
          .logo { font-size: 24px; font-weight: 900; color: white; letter-spacing: -1px; }
          .btn { display: inline-block; background: linear-gradient(135deg, #FF6A00, #FF2D2D); color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">UPPLIN</div>
            <h1 style="color: white; margin-top: 12px;">⏰ Não se esqueça!</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${data.userName}</strong>,</p>
            <p>Seu evento é <strong>amanhã</strong>! Não se esqueça de levar seu ingresso.</p>
            <div class="event-card">
              <h2 style="margin-top: 0; color: #1e293b;">${data.eventTitle}</h2>
              <p style="color: #64748b;">📅 ${data.eventDate}</p>
              <p style="color: #64748b;">📍 ${data.eventVenue}</p>
            </div>
            <p><strong>Dicas importantes:</strong></p>
            <ul style="color: #64748b;">
              <li>Chegue com antecedência para evitar filas</li>
              <li>Tenha seu QR Code pronto no celular</li>
              <li>Leve um documento de identificação</li>
            </ul>
            <p style="text-align: center; margin-top: 24px;">
              <a href="${SITE_URL}/meus-ingressos" class="btn">Ver Meu Ingresso</a>
            </p>
          </div>
          <div class="footer">
            <p><strong>UPPLIN</strong></p>
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: #dc2626; padding: 40px 30px; text-align: center; }
          .content { padding: 30px; }
          .footer { background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px; }
          .logo { font-size: 24px; font-weight: 900; color: white; letter-spacing: -1px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">UPPLIN</div>
            <h1 style="color: white; margin-top: 12px;">Ingresso Cancelado</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${data.userName}</strong>,</p>
            <p>Seu ingresso para <strong>${data.eventTitle}</strong> foi cancelado.</p>
            <p style="color: #64748b;">Se você não solicitou este cancelamento ou tem dúvidas, entre em contato conosco respondendo este email.</p>
          </div>
          <div class="footer">
            <p><strong>UPPLIN</strong></p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  password_reset: (data: EmailRequest["data"]) => ({
    subject: "🔐 Redefinir sua senha - UPPLIN",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A); padding: 40px 30px; text-align: center; }
          .content { padding: 30px; }
          .info-box { background: #fef9ec; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin: 20px 0; color: #92400e; font-size: 14px; }
          .footer { background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px; }
          .logo { font-size: 24px; font-weight: 900; color: white; letter-spacing: -1px; }
          .btn { display: inline-block; background: linear-gradient(135deg, #FF6A00, #FF2D2D); color: white !important; padding: 16px 36px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; margin: 20px 0; }
          .link-fallback { word-break: break-all; color: #FF2D2D; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">UPPLIN</div>
            <h1 style="color: white; margin-top: 12px;">🔐 Recuperar Senha</h1>
          </div>
          <div class="content">
            <p>Olá${data.userName ? ` <strong>${data.userName}</strong>` : ""},</p>
            <p>Recebemos uma solicitação para redefinir a senha da sua conta UPPLIN.</p>
            
            <p style="text-align: center;">
              <a href="${data.resetLink}" class="btn">Redefinir Minha Senha</a>
            </p>
            
            <div class="info-box">
              ⚠️ Este link é válido por <strong>1 hora</strong>. Se você não solicitou a redefinição de senha, ignore este email — sua conta está segura.
            </div>
            
            <p style="color: #64748b; font-size: 14px;">Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
            <p class="link-fallback">${data.resetLink}</p>
          </div>
          <div class="footer">
            <p><strong>UPPLIN</strong> — A melhor experiência em eventos</p>
            <p>Este é um email automático, por favor não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  welcome: (data: EmailRequest["data"]) => ({
    subject: "🎉 Bem-vindo ao UPPLIN!",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A); padding: 50px 30px; text-align: center; }
          .content { padding: 30px; }
          .feature { display: flex; align-items: flex-start; margin: 16px 0; }
          .feature-icon { font-size: 24px; margin-right: 12px; min-width: 32px; }
          .footer { background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px; }
          .logo { font-size: 32px; font-weight: 900; color: white; letter-spacing: -1px; }
          .btn { display: inline-block; background: linear-gradient(135deg, #FF6A00, #FF2D2D); color: white !important; padding: 16px 36px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">UPPLIN</div>
            <p style="color: rgba(255,255,255,0.85); margin-top: 8px; font-size: 16px;">Descubra os melhores eventos</p>
          </div>
          <div class="content">
            <h2 style="color: #1e293b;">Bem-vindo${data.userName ? `, ${data.userName}` : ""}! 🎉</h2>
            <p style="color: #64748b;">Que bom ter você aqui! Sua conta de participante foi criada com sucesso. Veja o que você pode fazer:</p>
            
            <div class="feature">
              <span class="feature-icon">🎟️</span>
              <div><strong>Compre ingressos</strong><br><span style="color: #64748b; font-size: 14px;">Garanta seu lugar nos melhores eventos da cidade</span></div>
            </div>
            <div class="feature">
              <span class="feature-icon">📅</span>
              <div><strong>Salve seus favoritos</strong><br><span style="color: #64748b; font-size: 14px;">Nunca mais perca um evento que você curtiu</span></div>
            </div>
            <div class="feature">
              <span class="feature-icon">👥</span>
              <div><strong>Siga organizadores</strong><br><span style="color: #64748b; font-size: 14px;">Fique por dentro das novidades dos seus favoritos</span></div>
            </div>
            
            <p style="text-align: center; margin-top: 32px;">
              <a href="${SITE_URL}" class="btn">Explorar Eventos</a>
            </p>
          </div>
          <div class="footer">
            <p><strong>UPPLIN</strong></p>
            <p>Este é um email automático, por favor não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  welcome_organizer: (data: EmailRequest["data"]) => ({
    subject: "🚀 Sua conta de organizador está pronta - UPPLIN",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A); padding: 50px 30px; text-align: center; }
          .content { padding: 30px; }
          .feature { display: flex; align-items: flex-start; margin: 16px 0; }
          .feature-icon { font-size: 24px; margin-right: 12px; min-width: 32px; }
          .footer { background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px; }
          .logo { font-size: 32px; font-weight: 900; color: white; letter-spacing: -1px; }
          .btn { display: inline-block; background: linear-gradient(135deg, #FF6A00, #FF2D2D); color: white !important; padding: 16px 36px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">UPPLIN</div>
            <p style="color: rgba(255,255,255,0.85); margin-top: 8px; font-size: 16px;">Painel do Organizador</p>
          </div>
          <div class="content">
            <h2 style="color: #1e293b;">Bem-vindo, ${data.userName || "Organizador"}! 🚀</h2>
            <p style="color: #64748b;">Sua conta de organizador <strong>${data.companyName || ""}</strong> foi criada com sucesso. Tudo pronto para você começar a criar eventos incríveis!</p>
            
            <div class="feature">
              <span class="feature-icon">🎪</span>
              <div><strong>Crie eventos</strong><br><span style="color: #64748b; font-size: 14px;">Publique e gerencie seus eventos em poucos cliques</span></div>
            </div>
            <div class="feature">
              <span class="feature-icon">📊</span>
              <div><strong>Acompanhe vendas</strong><br><span style="color: #64748b; font-size: 14px;">Relatórios em tempo real de ingressos e receita</span></div>
            </div>
            <div class="feature">
              <span class="feature-icon">📱</span>
              <div><strong>Check-in por QR Code</strong><br><span style="color: #64748b; font-size: 14px;">Valide ingressos na entrada do evento com rapidez</span></div>
            </div>
            <div class="feature">
              <span class="feature-icon">🎫</span>
              <div><strong>Cupons de desconto</strong><br><span style="color: #64748b; font-size: 14px;">Crie promoções para atrair mais público</span></div>
            </div>
            
            <p style="text-align: center; margin-top: 32px;">
              <a href="${SITE_URL}/organizador/dashboard" class="btn">Acessar Meu Painel</a>
            </p>
          </div>
          <div class="footer">
            <p><strong>UPPLIN</strong> — A melhor experiência em eventos</p>
            <p>Este é um email automático, por favor não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  pix_pending: (data: EmailRequest["data"]) => ({
    subject: `💳 PIX pendente - ${data.eventTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A); padding: 40px 30px; text-align: center; }
          .content { padding: 30px; }
          .qr-container { text-align: center; margin: 24px 0; padding: 20px; background: #f8fafc; border-radius: 12px; }
          .qr-container img { max-width: 220px; }
          .copy-paste { background: #f1f5f9; border: 1px dashed #94a3b8; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 11px; word-break: break-all; color: #334155; margin: 16px 0; }
          .info-box { background: #fef9ec; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin: 20px 0; color: #92400e; font-size: 14px; }
          .footer { background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px; }
          .logo { font-size: 24px; font-weight: 900; color: white; letter-spacing: -1px; }
          .btn { display: inline-block; background: linear-gradient(135deg, #FF6A00, #FF2D2D); color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">UPPLIN</div>
            <h1 style="color: white; margin-top: 12px;">💳 Pagamento PIX Pendente</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${data.userName || "Cliente"}</strong>,</p>
            <p>Seu pedido para <strong>${data.eventTitle}</strong> está aguardando pagamento via PIX.</p>
            
            ${data.pixQrCodeBase64 ? `
            <div class="qr-container">
              <p style="font-weight: bold; margin-bottom: 12px;">Escaneie o QR Code abaixo:</p>
              <img src="data:image/png;base64,${data.pixQrCodeBase64}" alt="QR Code PIX" />
            </div>
            ` : ""}
            
            ${data.pixCopyPaste ? `
            <p style="font-weight: bold; font-size: 14px;">Ou copie o código PIX:</p>
            <div class="copy-paste">${data.pixCopyPaste}</div>
            ` : ""}
            
            <div class="info-box">
              ⏰ <strong>Atenção:</strong> O pagamento expira em ${data.pixExpiration || "30 minutos"}. Após esse prazo, o pedido será cancelado automaticamente.
            </div>
            
            <p style="text-align: center; margin-top: 24px;">
              <a href="${data.paymentLink || SITE_URL + "/meus-ingressos"}" class="btn">Ver Pedido</a>
            </p>
            
            <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 16px;">
              Valor: <strong>${data.totalAmount}</strong> · Pedido #${data.orderId?.slice(0, 8).toUpperCase() || ""}
            </p>
          </div>
          <div class="footer">
            <p><strong>UPPLIN</strong> — A melhor experiência em eventos</p>
            <p>Este é um email automático, por favor não responda.</p>
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

  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
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

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    });

    const result = await emailResponse.json();

    if (!emailResponse.ok) {
      throw new Error(result.message || `Resend API error: ${emailResponse.status}`);
    }

    console.log(`Email [${type}] sent to ${to}:`, result.id);

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
