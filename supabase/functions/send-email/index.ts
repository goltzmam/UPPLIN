import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://esm.sh/zod@4.6.7";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// EMAIL_FROM must use a verified sending domain.
const FROM_EMAIL = Deno.env.get("EMAIL_FROM");
const SITE_URL = Deno.env.get("SITE_URL") || "https://www.upplin.com";
const ALLOWED_APP_ORIGINS = [
  SITE_URL,
  "https://www.upplin.com",
  "https://upplin.com",
  "https://upplin.com.br",
];

function isAllowedAppOrigin(origin: string) {
  try {
    const parsed = new URL(origin);
    if (!["https:", "http:"].includes(parsed.protocol)) return false;

    return (
      ALLOWED_APP_ORIGINS.includes(parsed.origin) ||
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

const emailRequestSchema = z.object({
  type: z.enum([
    "purchase_confirmation",
    "event_reminder",
    "ticket_cancelled",
    "password_reset",
    "welcome",
    "welcome_organizer",
    "pix_pending",
    "pix_confirmed",
    "collaborator_invite",
    "refund_status_update",
  ]),
  to: z.string().email(),
  data: z.object({
    userName: z.string().min(1).max(120).optional(),
    eventTitle: z.string().min(1).max(160).optional(),
    eventDate: z.string().min(1).max(120).optional(),
    eventVenue: z.string().min(1).max(160).optional(),
    ticketType: z.string().min(1).max(120).optional(),
    ticketQuantity: z.number().int().min(1).max(50).optional(),
    totalAmount: z.string().min(1).max(60).optional(),
    orderId: z.string().uuid().optional(),
    resetLink: z.string().url().optional(),
    resetOrigin: z.string().min(1).max(300).optional(),
    isOrganizer: z.boolean().optional(),
    companyName: z.string().min(1).max(160).optional(),
    pixQrCodeBase64: z.string().min(1).max(200000).optional(),
    pixCopyPaste: z.string().min(1).max(10000).optional(),
    pixExpiration: z.string().min(1).max(120).optional(),
    paymentLink: z.string().url().optional(),
    organizerName: z.string().min(1).max(160).optional(),
    scannerLink: z.string().url().optional(),
    collaboratorName: z.string().min(1).max(120).optional(),
    organizerId: z.string().uuid().optional(),
    eventId: z.string().uuid().optional(),
    // refund_status_update extras
    refundStatus: z.string().min(1).max(40).optional(),
    refundHeadline: z.string().min(1).max(160).optional(),
    refundMessage: z.string().min(1).max(2000).optional(),
    refundAmount: z.string().min(1).max(60).optional(),
    refundRequestId: z.string().uuid().optional(),
    recipientRole: z.enum(["buyer", "organizer", "admin"]).optional(),
  }),
});


const clientAllowedTypes = new Set<string>([
  "welcome",
  "welcome_organizer",
] as const);

interface EmailRequest {
  type: "purchase_confirmation" | "event_reminder" | "ticket_cancelled" | "password_reset" | "welcome" | "welcome_organizer" | "pix_pending" | "pix_confirmed" | "collaborator_invite" | "refund_status_update";
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
    resetOrigin?: string;
    isOrganizer?: boolean;
    companyName?: string;
    pixQrCodeBase64?: string;
    pixCopyPaste?: string;
    pixExpiration?: string;
    paymentLink?: string;
    organizerName?: string;
    scannerLink?: string;
    collaboratorName?: string;
    organizerId?: string;
    eventId?: string;
    refundStatus?: string;
    refundHeadline?: string;
    refundMessage?: string;
    refundAmount?: string;
    refundRequestId?: string;
    recipientRole?: "buyer" | "organizer" | "admin";
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
          body { font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #ffffff; margin: 0; padding: 24px; color: #111111; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid rgba(0,0,0,0.08); box-shadow: 0 18px 48px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #FF6A00, #FF2D2D 52%, #FF007A); padding: 40px 30px 34px; text-align: center; }
          .content { padding: 32px 30px; }
          .eyebrow { display: inline-block; background: rgba(255,255,255,0.18); color: #ffffff; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
          .title { margin: 14px 0 0; color: #ffffff; font-family: 'Space Grotesk', 'Inter', sans-serif; font-size: 30px; line-height: 1.1; }
          .lead { color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 16px; }
          .cta-wrap { text-align: center; margin: 30px 0 26px; }
          .btn { display: inline-block; background: linear-gradient(135deg, #FF6A00, #FF2D2D); color: #ffffff !important; padding: 16px 34px; text-decoration: none; border-radius: 16px; font-weight: 800; font-size: 16px; }
          .info-box { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 14px; padding: 16px 18px; margin: 0 0 22px; color: #9a3412; font-size: 14px; line-height: 1.6; }
          .note { color: #6b7280; font-size: 14px; line-height: 1.7; margin: 0 0 10px; }
          .link-fallback { word-break: break-all; color: #e11d48; font-size: 13px; line-height: 1.7; }
          .footer { background: #111111; color: #a3a3a3; padding: 18px 24px; text-align: center; font-size: 12px; line-height: 1.6; }
          .logo { font-size: 24px; font-weight: 900; color: white; letter-spacing: -0.04em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">UPPLIN</div>
            <div class="eyebrow">Recuperação de senha</div>
            <h1 class="title">Redefinir sua senha</h1>
          </div>
          <div class="content">
            <p>Olá${data.userName ? ` <strong>${data.userName}</strong>` : ""},</p>
            <p class="lead">Recebemos uma solicitação para redefinir a senha da sua conta na UPPLIN. Para continuar com segurança, clique no botão abaixo.</p>
            
            <div class="cta-wrap">
              <a href="${data.resetLink}" class="btn">Redefinir minha senha</a>
            </div>
            
            <div class="info-box">
              Este link é válido por <strong>1 hora</strong>. Se você não pediu essa redefinição, pode ignorar este e-mail com segurança — sua senha atual continuará a mesma.
            </div>
            
            <p class="note">Se o botão não abrir corretamente, copie e cole este link no navegador:</p>
            <p class="link-fallback">${data.resetLink}</p>
          </div>
          <div class="footer">
            <p><strong>UPPLIN</strong> — recuperação de acesso em português do Brasil.</p>
            <p>Este é um e-mail automático. Se precisar de ajuda, fale com o suporte oficial da plataforma.</p>
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

  pix_confirmed: (data: EmailRequest["data"]) => ({
    subject: `✅ PIX confirmado - ${data.eventTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #10b981, #059669); padding: 40px 30px; text-align: center; }
          .content { padding: 30px; }
          .event-card { background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981; }
          .event-title { font-size: 20px; font-weight: bold; color: #1e293b; margin-bottom: 10px; }
          .event-detail { color: #64748b; margin: 5px 0; }
          .ticket-info { background: #ecfdf5; border-radius: 8px; padding: 15px; margin: 15px 0; border: 1px solid #a7f3d0; }
          .total { font-size: 24px; font-weight: bold; color: #059669; text-align: center; margin: 20px 0; }
          .footer { background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px; }
          .btn { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px 0; }
          .logo { font-size: 24px; font-weight: 900; color: white; letter-spacing: -1px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">UPPLIN</div>
            <h1 style="color: white; margin-top: 12px;">✅ PIX Confirmado!</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${data.userName || "Cliente"}</strong>,</p>
            <p>Seu pagamento via PIX foi confirmado com sucesso! Seus ingressos já estão disponíveis.</p>
            
            <div class="event-card">
              <div class="event-title">${data.eventTitle}</div>
              ${data.eventDate ? `<div class="event-detail">📅 ${data.eventDate}</div>` : ""}
              ${data.eventVenue ? `<div class="event-detail">📍 ${data.eventVenue}</div>` : ""}
            </div>
            
            <div class="ticket-info">
              ${data.ticketType ? `<strong>Ingresso:</strong> ${data.ticketType}<br>` : ""}
              ${data.ticketQuantity ? `<strong>Quantidade:</strong> ${data.ticketQuantity}x` : ""}
            </div>
            
            <div class="total">Total: ${data.totalAmount}</div>
            
            <p style="text-align: center;">
              <a href="${SITE_URL}/meus-ingressos" class="btn">Ver Meus Ingressos</a>
            </p>
            
            <p style="color: #64748b; font-size: 14px; text-align: center;">
              Pedido: #${data.orderId?.slice(0, 8).toUpperCase() || ""}
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

  collaborator_invite: (data: EmailRequest["data"]) => ({
    subject: `📱 Você foi convidado para fazer check-in - ${data.eventTitle || "UPPLIN"}`,
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
          .info-card { background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #FF6A00; }
          .footer { background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px; }
          .logo { font-size: 24px; font-weight: 900; color: white; letter-spacing: -1px; }
          .btn { display: inline-block; background: linear-gradient(135deg, #FF6A00, #FF2D2D); color: white !important; padding: 16px 36px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">UPPLIN</div>
            <h1 style="color: white; margin-top: 12px;">📱 Convite de Check-in</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${data.collaboratorName || data.userName || ""}</strong>,</p>
            <p>Você foi convidado por <strong>${data.organizerName || "um organizador"}</strong> para ajudar no check-in de participantes.</p>
            
            <div class="info-card">
              <h3 style="margin-top: 0; color: #1e293b;">${data.eventTitle || "Evento"}</h3>
              ${data.eventDate ? `<p style="color: #64748b; margin: 4px 0;">📅 ${data.eventDate}</p>` : ""}
              ${data.eventVenue ? `<p style="color: #64748b; margin: 4px 0;">📍 ${data.eventVenue}</p>` : ""}
            </div>
            
            <p>Use o link abaixo no seu celular para acessar o scanner de QR Code e validar ingressos na entrada:</p>
            
            <p style="text-align: center; margin-top: 24px;">
              <a href="${data.scannerLink || SITE_URL}" class="btn">Abrir Scanner</a>
            </p>
            
            <p style="color: #64748b; font-size: 13px; margin-top: 20px;">
              💡 <strong>Dica:</strong> Salve esse link nos favoritos do celular para acesso rápido no dia do evento.
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

  refund_status_update: (data: EmailRequest["data"]) => ({
    subject: `${data.refundHeadline || "Atualização do seu reembolso"} - ${data.eventTitle || ""}`.trim(),
    html: `
      <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
      <style>
        body{font-family:'Segoe UI',sans-serif;background:#f5f5f5;margin:0;padding:20px}
        .container{max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.1)}
        .header{background:linear-gradient(135deg,#FF6A00,#FF2D2D,#FF007A);padding:32px 30px;text-align:center}
        .header h1{color:#fff;margin:0;font-size:24px}
        .logo{font-size:22px;font-weight:900;color:#fff;letter-spacing:-1px;margin-bottom:8px}
        .content{padding:30px;color:#1e293b;line-height:1.6}
        .card{background:#f8fafc;border-radius:12px;padding:18px;margin:18px 0;border-left:4px solid #FF2D2D}
        .row{color:#475569;margin:4px 0;font-size:14px}
        .amount{font-size:22px;font-weight:bold;color:#FF2D2D;text-align:center;margin:16px 0}
        .footer{background:#1e293b;color:#94a3b8;padding:18px;text-align:center;font-size:12px}
      </style></head><body>
        <div class="container">
          <div class="header"><div class="logo">UPPLIN</div><h1>${data.refundHeadline || "Atualização do reembolso"}</h1></div>
          <div class="content">
            <p>Olá <strong>${data.userName || ""}</strong>,</p>
            <p>${data.refundMessage || "Houve uma atualização na sua solicitação de reembolso."}</p>
            <div class="card">
              ${data.eventTitle ? `<div class="row"><strong>Evento:</strong> ${data.eventTitle}</div>` : ""}
              ${data.eventDate ? `<div class="row">📅 ${data.eventDate}</div>` : ""}
              <div class="row"><strong>Status:</strong> ${data.refundStatus || "-"}</div>
              ${data.orderId ? `<div class="row"><strong>Pedido:</strong> #${data.orderId.slice(0,8).toUpperCase()}</div>` : ""}
            </div>
            ${data.refundAmount ? `<div class="amount">${data.refundAmount}</div>` : ""}
            <p style="color:#64748b;font-size:13px;margin-top:24px">Acompanhe pelo app em <strong>Meus Ingressos → Reembolsos</strong>.</p>
          </div>
          <div class="footer"><p><strong>UPPLIN</strong></p><p>Este é um email automático, por favor não responda.</p></div>
        </div>
      </body></html>
    `,
  }),
};


function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function isInternalServiceCall(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ") || !SUPABASE_SERVICE_ROLE_KEY) return false;
  return authHeader.replace("Bearer ", "") === SUPABASE_SERVICE_ROLE_KEY;
}

function validateResetLink(link: string) {
  const parsed = new URL(link);
  if (!isAllowedAppOrigin(parsed.origin)) {
    throw new Error("Reset link origin is not allowed");
  }

  const allowedPaths = new Set(["/redefinir-senha", "/organizador/redefinir-senha"]);
  if (!allowedPaths.has(parsed.pathname)) {
    throw new Error("Reset link path is not allowed");
  }
}

async function canInviteCollaborator(authHeader: string, organizerId?: string, eventId?: string) {
  if (!organizerId) return false;

  const adminClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: organizer, error: organizerError } = await adminClient
    .from("organizer_accounts")
    .select("id")
    .eq("id", organizerId)
    .maybeSingle();

  if (organizerError || !organizer) return false;

  if (!eventId) return true;

  const { data: event, error: eventError } = await adminClient
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("organizer_id", organizerId)
    .maybeSingle();

  return !eventError && !!event;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!RESEND_API_KEY || !FROM_EMAIL || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return jsonResponse(503, { error: "Email service is not configured" });
  }

  try {
    const parsedBody = emailRequestSchema.safeParse(await req.json());
    if (!parsedBody.success) {
      return jsonResponse(400, { error: parsedBody.error.flatten().fieldErrors });
    }

    const { type, to, data } = parsedBody.data;
    const authHeader = req.headers.get("Authorization");
    const internalCall = isInternalServiceCall(authHeader);

    if (!internalCall) {
      if (!authHeader?.startsWith("Bearer ")) {
        return jsonResponse(401, { error: "Unauthorized" });
      }

      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await client.auth.getClaims(token);
      const { data: userData, error: userError } = await client.auth.getUser(token);

      if (claimsError || userError || !claimsData?.claims?.sub || !userData?.user) {
        return jsonResponse(401, { error: "Unauthorized" });
      }

      if (!clientAllowedTypes.has(type)) {
        if (type !== "collaborator_invite") {
          return jsonResponse(403, { error: "This email type requires a trusted backend call" });
        }

        const inviteAllowed = await canInviteCollaborator(authHeader, data.organizerId, data.eventId);
        if (!inviteAllowed) {
          return jsonResponse(403, { error: "You are not allowed to send this invite" });
        }
      }

      if (!userData.user.email || userData.user.email.toLowerCase() !== to.toLowerCase()) {
        return jsonResponse(403, { error: "You can only send emails to your own address" });
      }
    }

    const template = emailTemplates[type];
    if (!template) {
      return jsonResponse(400, { error: `Unknown email type: ${type}` });
    }

    if (type === "password_reset") {
      if (!data.resetLink) {
        return jsonResponse(400, { error: "Reset link is required" });
      }

      if (data.resetOrigin && !isAllowedAppOrigin(data.resetOrigin)) {
        return jsonResponse(400, { error: "Reset origin is not allowed" });
      }

      validateResetLink(data.resetLink);
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

    return jsonResponse(200, { success: true, id: result.id });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return jsonResponse(500, { error: error.message });
  }
};

serve(handler);
