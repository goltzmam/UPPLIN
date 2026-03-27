

# Status Completo do Projeto UPPLIN

---

## ✅ O QUE ESTÁ CORRETO E FUNCIONANDO

### Banco de Dados — Planos Alinhados
| Plano | Preço | Comissão (banco) | UI |
|-------|-------|-------------------|-----|
| Free | R$ 0 | 10% | 10% ✅ |
| Pro | R$ 49 | 8,49% | 8,49% ✅ |
| Enterprise | R$ 199 | 6,99% | 6,99% ✅ |

### Funcionalidades Completas
- Feed TikTok-style, CRUD eventos, ingressos, checkout (Cartão + PIX)
- QR check-in + colaboradores, cupons, assinaturas
- Chat, notificações, RSVP, posts sociais, follow
- Painéis admin e organizador completos
- RLS em todas as tabelas, webhook HMAC verificado
- Snapshot de comissão por evento

---

## 🔴 ERROS DE BUILD (precisa corrigir agora)

Dois arquivos têm erro de TypeScript que impede o build:

1. **`src/components/events/LocationPicker.tsx`** — `NodeJS.Timeout` não encontrado
2. **`src/components/map/MapSearch.tsx`** — `NodeJS.Timeout` não encontrado

**Correção:** Trocar `useRef<NodeJS.Timeout>()` por `useRef<ReturnType<typeof setTimeout>>()` nos dois arquivos.

---

## 🟡 SEGURANÇA — 1 Issue "Error" Pendente

**Exposição de dados sensíveis na tabela profiles** (nível: error)
- A policy "Authenticated users can view basic profiles" permite que qualquer usuário autenticado veja TODOS os campos do perfil, incluindo **CPF** e **email**.
- **Correção:** Criar uma view restrita ou trocar a policy para limitar o acesso apenas a campos seguros (id, full_name, photo_url).

---

## 🟡 SEGURANÇA — Warnings (prioridade média)

1. **Leaked password protection desabilitada** — senhas fracas permitidas
2. **Enumeração de email** via `find_user_by_email` — qualquer usuário pode verificar emails
3. **Storage event-images** — qualquer organizador pode modificar imagens de outros
4. **Admin auto-assign** via email hardcoded — risco se verificação de email for desabilitada

---

## 🔴 INFRAESTRUTURA — Email NÃO configurado

- **Nenhum domínio de email configurado.** Os emails transacionais (confirmação de compra, PIX, boas-vindas) **NÃO estão sendo enviados** em produção.
- É necessário configurar um domínio de email para que os emails funcionem.

---

## 📋 PLANO DE AÇÃO (em ordem de prioridade)

### Passo 1 — Corrigir erros de build
- Trocar `NodeJS.Timeout` por `ReturnType<typeof setTimeout>` em `LocationPicker.tsx` e `MapSearch.tsx`

### Passo 2 — Corrigir exposição de CPF/email (security error)
- Criar uma view `profiles_public` com apenas campos seguros, ou restringir a policy existente para que só retorne campos não-sensíveis via RPC

### Passo 3 — Configurar domínio de email
- Configurar domínio de email para emails transacionais funcionarem em produção

### Passo 4 — Habilitar leaked password protection
- Ativar proteção contra senhas vazadas na autenticação

---

## PODE LANÇAR?

**Ainda não.** Os passos 1-3 são obrigatórios antes do lançamento:
1. Build quebrado (erros TypeScript)
2. CPF exposto para qualquer usuário logado
3. Emails não funcionam sem domínio configurado

Após resolver esses 3 pontos + conectar pelo menos 1 conta Mercado Pago de organizador, a plataforma está pronta para lançar.

