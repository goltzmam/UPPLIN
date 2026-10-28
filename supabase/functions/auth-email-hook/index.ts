import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { Webhook } from 'npm:standardwebhooks@1.0.0'
import { sendEmail } from '../_shared/email-provider.ts'
import { authEmailDeliveries, type AuthEmailPayload } from '../_shared/auth-email.ts'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

type TemplateProps = {
  siteName: string; siteUrl: string; recipient: string; confirmationUrl: string;
  token: string; email: string; newEmail: string;
}
const templates: Record<string, React.ComponentType<TemplateProps>> = {
  signup: SignupEmail, invite: InviteEmail, magiclink: MagicLinkEmail,
  recovery: RecoveryEmail, email_change: EmailChangeEmail, reauthentication: ReauthenticationEmail,
}
const subjects: Record<string, string> = {
  signup: 'Confirme seu e-mail', invite: 'Seu convite UPPLIN', magiclink: 'Seu link de acesso',
  recovery: 'Redefina sua senha', email_change: 'Confirme a alteração de e-mail', reauthentication: 'Seu código de verificação',
}
const json = (status: number, body: object) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
})

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })
  const secret = Deno.env.get('SEND_EMAIL_HOOK_SECRET')?.replace(/^v1,whsec_/, '')
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('EMAIL_FROM')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const siteUrl = Deno.env.get('SITE_URL') || 'https://www.upplin.com'
  if (!secret || !apiKey || !from || !supabaseUrl) return json(503, { error: 'Auth email service is not configured' })
  let payload: AuthEmailPayload
  try {
    payload = new Webhook(secret).verify(await req.text(), Object.fromEntries(req.headers)) as AuthEmailPayload
  } catch {
    return json(401, { error: 'Invalid webhook signature' })
  }
  const action = payload?.email_data?.email_action_type
  const Template = templates[action]
  if (!Template) return json(400, { error: 'Unsupported auth email action' })
  try {
    if (action === 'recovery') {
      const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (!service) return json(503, { error: 'Recovery policy unavailable' })
      const check = await fetch(`${supabaseUrl}/rest/v1/rpc/can_request_password_reset`, {
        method: 'POST', headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_email: payload.user.email }),
      })
      if (!check.ok) return json(503, { error: 'Recovery policy unavailable' })
      if (await check.json() !== true) return json(403, { error: 'Self-service recovery is unavailable for this account' })
    }
    const deliveries = authEmailDeliveries(payload, supabaseUrl, siteUrl)
    for (const delivery of deliveries) {
      const element = React.createElement(Template, {
        siteName: 'UPPLIN', siteUrl, recipient: delivery.to, confirmationUrl: delivery.confirmationUrl,
        token: delivery.token, email: payload.user.email, newEmail: payload.user.new_email || '',
      })
      await sendEmail({
        to: delivery.to, from, subject: subjects[action],
        html: await renderAsync(element), text: await renderAsync(element, { plainText: true }),
      }, apiKey, `auth-${req.headers.get('webhook-id')}-${delivery.recipient}`)
    }
    return json(200, {})
  } catch {
    console.error(JSON.stringify({ event: 'auth_email_failed', request_id: req.headers.get('webhook-id'), action }))
    return json(500, { error: 'Unable to send authentication email' })
  }
})
