
# Plano: Email Marketing + Colaboradores Admin

## Visão geral

Dois módulos novos no painel admin, totalmente isolados do fluxo transacional atual (que continua via Lovable Emails para não comprometer a reputação do remetente):

1. **Marketing** (`/admin/marketing`) — criação, segmentação, agendamento e métricas de campanhas, enviadas por um remetente separado via Resend (domínio/subdomínio dedicado a marketing).
2. **Equipe** (`/admin/equipe`) — admin master adiciona colaboradores por email; cada um recebe um ou mais papéis granulares (`marketing`, `support`) que controlam o acesso aos módulos.

---

## 1. Papéis e permissões

### Banco
- Estender enum `app_role` adicionando `marketing` e `support` (mantendo `admin`, `organizer`, `user`).
- Nova tabela `admin_invites`:
  - `id`, `email` (lowercase), `roles app_role[]`, `token` (uuid, único), `invited_by`, `expires_at` (7 dias), `accepted_at`, `accepted_user_id`, `created_at`.
  - RLS: só admin lê/escreve; aceite via Edge Function com `SECURITY DEFINER` que valida o token.
- Funções helper:
  - `has_any_role(uid, app_role[])` — usada em RLS dos módulos.
  - `accept_admin_invite(token)` — valida, marca aceite e insere papéis em `user_roles` para o `auth.uid()` atual.

### Frontend
- `useUserRoles` retorna `isMarketing`, `isSupport`.
- Novo guard `<AdminRoleRoute roles={['marketing']}>` para proteger rotas.
- Layout admin: menu lateral filtra itens por papel (admin master vê tudo; marketing só vê Marketing; support só vê Chats/Suporte).

---

## 2. Módulo "Equipe" (admin master)

Rota `/admin/equipe`:
- Lista colaboradores ativos (join `user_roles` + `profiles`) com papéis, último acesso, ações (alterar papéis, remover).
- Lista convites pendentes (`admin_invites` sem `accepted_at`) com reenviar/cancelar.
- Botão "Convidar colaborador":
  - Form: email + checkboxes (marketing, support, admin).
  - Cria registro em `admin_invites` e dispara email "convite UPPLIN" via Lovable Emails (transacional) com link `https://upplin.com/admin/aceitar-convite?token=…`.
- Página `/admin/aceitar-convite`:
  - Se não logado → redireciona para signup/login com `redirectTo`.
  - Se logado → mostra resumo do convite, botão "Aceitar" chama `accept_admin_invite(token)` e redireciona para o painel apropriado.

Edge Functions:
- `admin-invite-create` — valida admin, insere convite, enfileira email.
- `admin-invite-accept` — wrapper opcional (a RPC já cobre, mas a função facilita logging/anti-abuse).

---

## 3. Módulo Marketing (papéis: admin, marketing)

### Tabelas novas
- `email_audiences` — segmentos salvos: `name`, `description`, `filter jsonb` (DSL simples: `audience: 'participants'|'organizers'|'both'`, `city`, `bought_event_id`, `inactive_days`, `followers_of_organizer`), `created_by`, contagem cacheada.
- `email_campaigns` — `name`, `subject`, `preheader`, `from_name`, `reply_to`, `html_body`, `audience_id`, `status` (`draft|scheduled|sending|sent|failed|cancelled`), `scheduled_at`, `sent_at`, totals (sent/delivered/opened/clicked/bounced/unsubscribed), `created_by`.
- `email_campaign_recipients` — `campaign_id`, `user_id`, `email`, `status` (`queued|sent|delivered|opened|clicked|bounced|complained|unsubscribed|failed`), `resend_message_id`, `opened_at`, `clicked_at`, `error`. Índice em `resend_message_id` para o webhook.
- `email_marketing_unsubscribes` — `email` único, `reason`, `created_at`. Toda lista global respeita esta tabela + a tabela existente `suppressed_emails`.
- RLS: leitura/escrita restrita a `has_any_role(uid, ARRAY['admin','marketing'])`.

### Segmentação
- RPC `compute_audience(filter jsonb) returns table(user_id, email, full_name)` — junta `profiles`, `organizer_accounts`, `orders`, `follows`, aplicando filtros e excluindo:
  - emails em `email_marketing_unsubscribes`
  - emails em `suppressed_emails`
  - perfis com `marketing_opt_in = false` (campo novo em `profiles`, default `true`, com toggle no perfil do participante e do organizador para LGPD).
- Botão "Pré-visualizar audiência" mostra total + amostra (50).

### UI Admin (`/admin/marketing`)
- Aba **Campanhas**: lista com status, audiência, agendamento, métricas resumidas.
- Aba **Audiências**: criar/editar segmentos (form com filtros), ver contagem.
- Aba **Métricas**: gráfico de envios x tempo, taxa de abertura/clique/bounce/unsubscribe agregada e por campanha (tabela com filtros — segue padrão do guia de email dashboard, deduplicando por `resend_message_id`).
- Editor de campanha:
  - Campos: nome interno, assunto, preheader, From name, reply-to, audiência (select), HTML (textarea com toolbar simples + variáveis `{{first_name}}`, `{{unsubscribe_url}}`).
  - Preview lado a lado com substituição das variáveis.
  - Botões "Salvar rascunho", "Enviar teste para email X", "Agendar" (datetime), "Enviar agora".
- Toasts permitidos (escopo admin).

### Envio (Resend dedicado)
- Conectar Resend via connector standard (`standard_connectors--connect`) com uma conexão separada apontando para subdomínio `news.upplin.com` (configurado pelo usuário no painel Resend). Não tocar nas NS records do subdomínio usado pelo Lovable Emails.
- Edge Function `marketing-send-campaign` (verify_jwt=true, role admin/marketing):
  - Marca campanha como `sending`.
  - Itera audiência em batches de 50, com `await sleep(1000)` entre lotes (throttling ~50/s, ajustável).
  - Para cada destinatário: gera `unsubscribe_url` com token único (`email_marketing_unsubscribes` ainda não criado, mas token HMAC), insere em `email_campaign_recipients` com status `queued`, chama Resend via gateway com `headers.List-Unsubscribe` e `List-Unsubscribe-Post: List-Unsubscribe=One-Click`, salva `resend_message_id`.
  - Em erro 429: pausa e retoma.
- Agendamento: cron pg_cron a cada minuto chama `marketing-run-scheduled` que busca campanhas `scheduled` com `scheduled_at <= now()` e invoca `marketing-send-campaign`.
- Edge Function `marketing-test-send` para envio de teste único.

### Métricas (webhook Resend)
- Edge Function pública `resend-marketing-webhook` (verify_jwt=false, valida `Svix-Signature` com `RESEND_WEBHOOK_SECRET`):
  - Eventos `email.delivered/opened/clicked/bounced/complained` → update `email_campaign_recipients` + incrementa contador em `email_campaigns`.
  - `bounced` permanente / `complained` → insere em `email_marketing_unsubscribes` automaticamente.
- Usuário configura URL desse webhook no painel Resend.

### Unsubscribe
- Página pública `/email/unsubscribe?token=…` que chama Edge Function `marketing-unsubscribe` (valida token HMAC, insere email em `email_marketing_unsubscribes`, mostra confirmação). Reutiliza o visual do projeto.
- Toggle em `Perfil → Privacidade`: "Receber emails de marketing da UPPLIN" (sincroniza `profiles.marketing_opt_in` e tabela de unsubscribe).

---

## 4. Módulo Suporte (papéis: admin, support)

- O `/admin/chats` existente passa a ser acessível também por `support` (via `AdminRoleRoute`), mas oculta ações destrutivas (banir, alterar pedidos) — só admin master vê.
- Filtra a lista para conversas com `type in ('user_organizer','support')` e mostra fila por status (aberto, aguardando, resolvido).
- Adicionar campo `status` em `conversations` (`open|pending|resolved`) e `assigned_to` (user_id do colaborador). Migração + RLS.
- Botões: "Assumir", "Marcar resolvido", "Encaminhar para admin".

---

## 5. Segredos necessários

Solicitar via `add_secret` no momento da implementação:
- `RESEND_MARKETING_API_KEY` (chave Resend separada — recomendado domínio dedicado).
- `RESEND_WEBHOOK_SECRET` (assinatura Svix).
- `MARKETING_UNSUBSCRIBE_SECRET` (HMAC para tokens).

A conexão via connector `resend` cobre o gateway; usaremos a chave dedicada para isolar reputação.

---

## 6. Compliance (LGPD/CAN-SPAM)

- Toda campanha incluirá automaticamente: nome legal UPPLIN, endereço, link de unsubscribe um-clique, `List-Unsubscribe` headers.
- Opt-in implícito (já são usuários cadastrados) + opt-out fácil.
- `marketing_opt_in` exposto no perfil.

---

## 7. Ordem de entrega sugerida

1. Migração: enum `app_role` + `admin_invites` + `has_any_role` + `marketing_opt_in` em `profiles`.
2. Módulo Equipe (UI + Edge Functions + email de convite reaproveitando Lovable Emails).
3. Conectar Resend + segredos.
4. Tabelas marketing + RPC `compute_audience` + página de Audiências.
5. Editor + envio + agendamento + cron.
6. Webhook Resend + página de unsubscribe + métricas.
7. Refino do módulo Suporte (status/assigned_to, RoleRoute).

---

## Detalhes técnicos

- Todas as Edge Functions seguem padrão CORS atual e validam JWT manualmente quando `verify_jwt=false`.
- Templates de email do convite ficam em `_shared/email-templates/admin-invite.tsx`.
- Para emails de marketing usamos HTML simples renderizado no servidor (sem React Email — o usuário cola HTML ou usa nosso template padrão com neon UPPLIN).
- Nenhuma alteração em fluxos transacionais existentes (mp-webhook, auth-email-hook, etc.).
- Respeita Core memory: toasts só no escopo admin, dark theme, valores em centavos (não aplicável aqui).
