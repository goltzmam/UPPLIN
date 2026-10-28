# UPPLIN

Plataforma web e nativa de eventos, ingressos e relacionamento entre participantes e organizadores.

- Desenvolvimento e revisão: Codex + GitHub.
- Frontend: React, TypeScript e Vite, publicado na Vercel.
- Backend: Supabase (Postgres, Auth, Storage e Edge Functions).
- Pagamentos, assinaturas e split: Mercado Pago.
- Emails transacionais: Resend.
- Android/iOS: Capacitor, identificador `com.upplin.app`.

## Desenvolvimento

Use Node.js 24 e npm. Cada tarefa na nuvem já possui um checkout isolado; não crie outro worktree sem necessidade explícita.

```sh
npm ci
cp .env.example .env.local
# Configure a chave pública do novo Supabase em .env.local ou no ambiente seguro.
npm run dev
```

O projeto Supabase é `ermhzlthjlolqsbtjawf`. Nunca coloque chaves de serviço, tokens de gerenciamento ou credenciais de pagamento em variáveis `VITE_`. Apenas a chave pública pode ir para o frontend.

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`npm run sitemap` é uma operação explícita para atualizar o sitemap; desenvolvimento e build não alteram esse arquivo automaticamente.

## Produção

Veja [docs/PRODUCAO.md](docs/PRODUCAO.md) para Vercel, Supabase, emails, pagamentos e nativos.

O build rejeita a URL do projeto Supabase antigo, uma chave JWT de outro projeto e chaves privilegiadas em variáveis públicas. A publicação do frontend não aplica migrations nem publica Edge Functions.

A auditoria do banco exposto identificou estruturas ausentes. Antes de aplicar migrations no banco existente, consulte o histórico e o catálogo com acesso de gerenciamento, obtenha backup e reconcilie as estruturas. Não use `db reset` em produção.
