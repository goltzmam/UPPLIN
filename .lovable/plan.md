

# Checkup Completo da Plataforma UPPLIN

---

## 1. INCONSISTÊNCIA CRÍTICA: Comissões no Banco vs UI

| Plano | UI (Precos/LP) | Banco de Dados |
|-------|---------------|----------------|
| Free | 10% | 10% ✅ |
| Pro | **8,49%** | **7%** ❌ |
| Enterprise | **6,99%** | **5%** ❌ |

O banco de dados tem 7% e 5%, mas a UI mostra 8,49% e 6,99%. A Edge Function `get_organizer_commission` puxa do banco, então **o valor real cobrado é 7% e 5%**, diferente do que o organizador vê na tela. Precisa decidir qual é o correto e alinhar.

---

## 2. O QUE FUNCIONA (Completo)

- **Feed TikTok-style** (mobile + desktop) com scroll infinito
- **Cadastro/Login** participante e organizador (email + Google OAuth)
- **Onboarding organizador** em 3 passos (CNPJ, dados, redes sociais)
- **CRUD de eventos** com slug amigável, mídia, categorias
- **Sistema de ingressos** com tipos, quantidades, preços
- **Checkout completo** com Cartão + PIX via Mercado Pago Split
- **QR Code check-in** + colaboradores de check-in
- **Cupons de desconto** (percentual e fixo)
- **Sistema de assinaturas** (Free/Pro/Enterprise) via Mercado Pago
- **Perfil público do organizador** com follow
- **Comentários e avaliações** em eventos
- **Posts sociais** (feed social com likes/comentários)
- **Mensagens** entre usuários
- **Notificações** (push + in-app)
- **RSVP** ("Quem vai")
- **Eventos salvos**
- **Painel admin** completo (users, events, orders, CPF, analytics, subscriptions)
- **Painel organizador** (dashboard, relatórios, cupons, configurações)
- **Recuperação de senha**
- **Expiração automática** de pedidos PIX pendentes (CRON)
- **Emails transacionais** (confirmação, PIX, convite colaborador)
- **Políticas por plano** (/politica/standart, /pro, /enterprise)
- **SEO** com JSON-LD estruturado
- **RLS** em todas as tabelas (segurança OK)

---

## 3. BUGS E PROBLEMAS ENCONTRADOS

### Críticos
1. **Comissões desalinhadas** (banco vs UI) — descrito acima. Isso afeta diretamente o faturamento.
2. **Email de envio usando domínio de teste** — `send-email` usa `onboarding@resend.dev`. Emails vão cair em spam ou nem chegar. Precisa configurar domínio próprio (ex: `noreply@upplin.com.br`).
3. **Nenhum organizador conectou Mercado Pago** (0 registros em `organizer_mp_accounts`) — sem isso, nenhuma venda real funciona.

### Médios
4. **Console warning: `Function components cannot be given refs`** em `AnimatedRoutes` — não quebra nada, mas poluí o console e pode causar bugs futuros.
5. **Nenhum ticket emitido** e **todas as 11 orders canceladas** — indica que o fluxo de compra ainda não foi testado end-to-end com sucesso.
6. **Leaked password protection desabilitada** — risco de segurança para senhas fracas.

### Baixos
7. **React Router v6 deprecation warnings** — precisa adicionar future flags (`v7_startTransition`, `v7_relativeSplatPath`) antes de migrar para v7.

---

## 4. O QUE FALTA CONCLUIR

| Item | Status | Prioridade |
|------|--------|------------|
| Corrigir comissões no banco (7%→8.49%, 5%→6.99% ou vice-versa) | Pendente | **ALTA** |
| Configurar domínio de email no Resend | Pendente | **ALTA** |
| Testar fluxo completo de compra (cartão + PIX) em produção | Pendente | **ALTA** |
| Conectar conta Mercado Pago de pelo menos 1 organizador | Pendente | **ALTA** |
| Habilitar leaked password protection | Pendente | Média |
| Corrigir warning de refs no AnimatedRoutes | Pendente | Baixa |
| Adicionar future flags do React Router | Pendente | Baixa |

---

## 5. PODE LANÇAR?

**Ainda não.** As 4 pendências de alta prioridade precisam ser resolvidas antes:

1. **Alinhar comissões** — você precisa decidir: o correto é 8,49%/6,99% (como mostra a UI) ou 7%/5% (como está no banco)?
2. **Configurar email** — sem domínio verificado, emails de confirmação de compra, PIX e boas-vindas não funcionarão em produção.
3. **Testar compra real** — nenhuma compra foi concluída com sucesso ainda (0 tickets, 11 orders canceladas).
4. **Conectar Mercado Pago** — pelo menos o organizador principal precisa ter conta MP conectada.

Uma vez resolvidos esses 4 pontos, a plataforma tem todas as funcionalidades necessárias para lançar.

---

## Plano de Implementação

1. Corrigir `subscription_plans` no banco para alinhar `commission_percent` com o que a UI exibe (8.49 e 6.99)
2. Atualizar `send-email` com domínio de email verificado
3. Habilitar leaked password protection
4. Corrigir warning de refs no AnimatedRoutes

