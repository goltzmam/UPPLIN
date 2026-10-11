# upplin

MODE: AGENT MODE (BUILD)

Você está criando uma PLATAFORMA COMPLETA DE VENDA E RESERVA DE INGRESSOS chamda Influente Eventos
(sem MVP limitado), usando Lovable Cloud (database, auth, storage e edge functions).

OBJETIVO
Criar uma plataforma tipo Sympla / Ingresso.com com:
- Cadastro de usuários
- Eventos
- Múltiplos tipos de ingressos
- Reservas e vendas
- Painel do organizador
- Painel administrativo
- Base pronta para pagamentos reais

────────────────────────
REGRAS ABSOLUTAS (NÃO QUEBRAR)
────────────────────────
1) Usar Lovable Cloud (Postgres/Supabase).
2) Ativar RLS (Row Level Security) em TODAS as tabelas (default deny).
3) Nunca confirmar pagamento pelo frontend.
4) Pagamentos só mudam para “paid” via webhook (Edge Function).
5) CPF é PERMANENTE e NÃO pode ser alterado pelo usuário.
6) Código deve ser production-ready, sem atalhos.
7) Criar logs estruturados nas Edge Functions.
8) Separar claramente: usuário, organizador e admin.

────────────────────────
AUTENTICAÇÃO
────────────────────────
- Login por email e senha
- Login social (Google e Facebook)
- Após login social, permitir completar cadastro (nome, foto, CPF)
- Usuário pode editar perfil, EXCETO CPF

────────────────────────
DATABASE (CRIAR AS TABELAS)
────────────────────────
Crie no Postgres:

1) profiles
- id (uuid, PK, = auth.users.id)
- email
- full_name
- photo_url
- cpf (UNIQUE, NOT NULL)
- cpf_locked (boolean, default true)
- created_at, updated_at

Criar TRIGGER que bloqueia qualquer UPDATE no campo cpf,
exceto quando executado por função admin (security definer).

2) cpf_change_requests
- id
- user_id
- current_cpf
- requested_cpf
- reason
- status (pending, approved, rejected)
- created_at, updated_at

3) organizer_accounts
- id
- owner_user_id
- display_name
- status (active, suspended)
- created_at, updated_at

4) events
- id
- organizer_id
- title
- description
- start_at
- end_at
- venue_name
- address_text
- lat, lng
- cover_image_url
- status (draft, published, cancelled)
- created_at, updated_at

5) event_media
- id
- event_id
- type (image, video)
- url
- sort_order

6) ticket_types
- id
- event_id
- name
- price_cents (0 = gratuito)
- currency (BRL)
- quantity_total
- quantity_sold
- sale_start_at
- sale_end_at
- status (active, paused, sold_out)

7) orders
- id
- buyer_user_id
- event_id
- status (pending, paid, failed, cancelled, refunded)
- total_cents
- expires_at
- created_at, updated_at

8) order_items
- id
- order_id
- ticket_type_id
- unit_price_cents
- qty

9) tickets
- id
- order_id
- event_id
- buyer_user_id
- ticket_type_id
- status (issued, used, cancelled)
- qr_token (UNIQUE)
- issued_at
- used_at

10) payments
- id
- order_id
- provider
- method
- status (pending, paid, failed, refunded)
- amount_cents
- provider_payment_id
- raw (jsonb)
- created_at, updated_at

11) webhook_events
- id
- provider
- event_type
- provider_event_id (UNIQUE)
- status (received, processed, failed)
- payload (jsonb)
- error
- received_at
- processed_at

────────────────────────
RLS (SEGURANÇA)
────────────────────────
- profiles: usuário só vê/edita o próprio (exceto CPF)
- organizer_accounts: apenas o owner
- events: 
  - público lê apenas published
  - organizador edita apenas os seus
- orders:
  - comprador vê os seus
  - organizador vê pedidos dos seus eventos
- tickets:
  - comprador vê os seus
- payments e webhook_events:
  - apenas admin
- Admin tem acesso total

────────────────────────
EDGE FUNCTIONS
────────────────────────
1) checkout/create-order
- Valida estoque e janela de venda
- Cria order + order_items
- Cria payment com status "pending"
- Retorna redirect_url (mock nesta fase)

2) payments/webhook/:provider
- Recebe webhooks
- Implementa idempotência (provider_event_id)
- Atualiza payment e order
- Emite tickets quando status = paid
- Loga tudo (request_id, status, erro)

────────────────────────
FRONTEND (CRIAR AS TELAS)
────────────────────────
Usuário:
- Cadastro / Login
- Completar perfil
- Catálogo de eventos
- Página do evento
- Seleção de ingressos
- Checkout
- Meus ingressos / reservas

Organizador:
- Criar / editar eventos
- Criar / editar tipos de ingresso
- Visualizar vendas e pedidos

Admin:
- Lista de usuários
- Solicitações de troca de CPF
- Webhook events (auditoria)

Todas as telas DEVEM ter:
- loading
- empty
- error
- success

────────────────────────
OBSERVABILIDADE
────────────────────────
- Logs estruturados nas Edge Functions
- request_id
- user_id quando existir
- status da operação
- erro detalhado em falha

────────────────────────
ENTREGA
────────────────────────
- Aplicação funcionando no preview
- Banco criado com RLS ativo
- Edge Functions deployadas
- UI navegável
- Version Pin ao final

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://upplin.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/22b45c0d-4c50-4b2a-96fd-f42cde095566).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
