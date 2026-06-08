# Sistema de Reembolso UPPLIN

## 1. Regras de negócio (fixadas)

- **Janela de garantia**: até **7 dias após a compra** E **antes do início do evento** (Art. 49 CDC).
- **Fluxo de aprovação**:
  1. Participante abre solicitação dentro da garantia → status `pending`.
  2. Organizador tem **48h** para aprovar ou recusar em 1 clique.
  3. Se aprovar → estorno automático via MP, ingressos cancelados.
  4. Se recusar → status `disputed`, escalado ao admin.
  5. Se não responder em 48h dentro da garantia → admin pode **forçar estorno**.
- **Fora da garantia**: solicitação vai direto para `disputed` (admin decide).
- **Taxas MP**:
  - Estorno **total dentro de 90 dias**: MP devolve a taxa → custo zero.
  - Estorno **parcial ou após 90 dias**: taxa fica com o organizador (descontada do próximo repasse).
  - Plataforma **não** retém comissão em reembolsos aprovados.

## 2. Banco de dados (migration)

**Nova tabela `refund_requests`**:
- `order_id`, `ticket_id` (opcional, null = reembolso total), `requester_user_id`
- `reason` (text), `attachments` (jsonb array de URLs)
- `status`: `pending` | `approved` | `rejected` | `disputed` | `refunded` | `failed`
- `decided_by`, `decided_at`, `decision_note`
- `refund_amount_cents`, `mp_refund_id`, `within_guarantee` (bool)
- RLS: participante vê os seus; organizador vê do seu evento; admin vê tudo.

**Alterar `orders.status`**: adicionar `refunded`, `partially_refunded`.
**Alterar `payments.status`**: adicionar `refunded`.
**Alterar `tickets.status`**: adicionar `refunded`.

**Novo bucket storage** `refund-attachments` (privado, RLS por user_id).

**RPCs SECURITY DEFINER**:
- `request_refund(order_id, reason, attachments)` — valida janela, cria request.
- `decide_refund(request_id, action, note)` — organizador aprova/recusa.
- `admin_force_refund(request_id, note)` — admin força após 48h.

## 3. Edge Function `mp-refund`

- Recebe `request_id`, valida permissão (organizer/admin), busca `mp_payment_id`.
- Chama `POST https://api.mercadopago.com/v1/payments/{id}/refunds` com token do organizador.
- Atualiza `refund_requests.status = refunded`, `mp_refund_id`.
- Em sucesso: atualiza `orders.status`, `payments.status`, `tickets.status = refunded`, libera `quantity_sold`.
- Em erro: status `failed`, log no admin.

## 4. Webhook `mp-webhook` (atualização)

Adicionar handler para `type=refund`:
- Localiza `payment` e `refund_request` correlato.
- Confirma estorno, invalida ingressos, envia notificação + email ao participante.

## 5. Frontend

### Participante — `MeusIngressos.tsx`
- Botão **"Solicitar reembolso"** nos cards (somente se elegível: pago, evento futuro).
- Dialog `RefundRequestDialog`:
  - Mostra se está dentro da garantia.
  - Textarea motivo (obrigatório, min 20 chars).
  - Upload até 3 anexos (imagens/PDF).
  - Confirma e cria request.
- Nova aba **"Reembolsos"** mostrando status de cada solicitação com timeline.

### Organizador — nova rota `/organizador/reembolsos`
- Lista de requests com filtro por status.
- Card mostra: evento, comprador, valor, motivo, anexos, dias restantes para decidir.
- Botões **"Aprovar e estornar"** / **"Recusar"** (com nota obrigatória se recusa).
- Aprovar → chama `mp-refund` direto.
- Adicionar item no `OrganizerLayout` sidebar com badge de pendentes.

### Admin — nova rota `/admin/refunds`
- Lista todos requests, foco em `disputed` e `pending > 48h`.
- Botão **"Forçar estorno"** (somente se dentro da garantia ou disputa válida).
- Botão **"Rejeitar definitivamente"**.
- Histórico de decisões.

## 6. Notificações & Email

- Participante abre → notifica organizador (in-app + email).
- Organizador decide → notifica participante.
- Admin força → notifica ambos.
- Estorno confirmado pelo MP → email com comprovante ao participante.

## 7. Detalhes técnicos

```
fluxo:
participante → request_refund() → pending
              ↓
       (organizador 48h)
        ├─ aprova → mp-refund → MP API → webhook → refunded
        ├─ recusa → disputed → admin
        └─ silêncio 48h → admin pode forçar
              ↓
       admin_force_refund → mp-refund → refunded
```

**Arquivos a criar**:
- `supabase/functions/mp-refund/index.ts`
- `src/components/tickets/RefundRequestDialog.tsx`
- `src/components/tickets/RefundStatusCard.tsx`
- `src/pages/organizador/ReembolsosContent.tsx`
- `src/pages/admin/AdminRefunds.tsx`
- `src/hooks/use-refund-eligibility.ts`

**Arquivos a editar**:
- `src/pages/MeusIngressos.tsx` (botão + aba)
- `src/components/organizador/OrganizerLayout.tsx` (item menu)
- `src/components/admin/AdminLayout.tsx` (item menu)
- `src/App.tsx` (rotas)
- `supabase/functions/mp-webhook/index.ts` (handler refund)
- `supabase/config.toml` (registrar mp-refund)

## Confirmação necessária

Antes de implementar, confirma:
1. **Janela de 7 dias** está OK ou prefere outro prazo (ex: 24h antes do evento)?
2. **48h** para o organizador decidir está OK?
3. Aceita as regras de taxa MP acima (organizador absorve em estorno parcial/+90d)?
