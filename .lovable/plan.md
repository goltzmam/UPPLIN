# Atualizar conformidade App Store — Produção Mercado Pago

## Contexto
O APP_STORE_COMPLIANCE.md foi criado com informações genéricas (mencionava Stripe e contas de teste). O projeto está em **produção** com **Mercado Pago** real, e **não há contas de teste** nem ingressos gratuitos no banco.

## O que será feito

### 1. Atualizar `APP_STORE_COMPLIANCE.md`
- Substituir referências a Stripe por Mercado Pago
- Remover sugestão de contas de teste (não existem)
- Adicionar orientações para o revisor navegar no feed sem login
- Documentar que checkout exige conta real + pagamento real via Mercado Pago

### 2. Criar seção "Notas para o Revisor da Apple"
No mesmo arquivo, adicionar bloco pronto para copiar/colar no App Store Connect, incluindo:
- Feed social funciona sem login (navegação completa)
- Para criar conta: o revisor deve usar email próprio e verificar
- Para testar checkout: o revisor pode usar qualquer evento ativo (ex: "Copa Bar", ingresso R$ 5,00) — pagamento real via Mercado Pago
- Funcionalidades de organizador exigem onboarding completo (CPF, endereço)
- Contato de suporte: WhatsApp (85) 2010-3399 e `/suporte`

### 3. Sugestão de melhoria (não obrigatória agora)
Se o usuário quiser facilitar aprovação futura, pode-se:
- Criar 1 evento de teste com ingresso a R$ 1,00 (menor risco para revisor)
- Ou gravar um vídeo de demonstração do fluxo e hospedar no YouTube não listado

## Arquivos alterados
- `APP_STORE_COMPLIANCE.md` (edição)

## Nada muda no código do app
Esta é apenas atualização de documentação de conformidade.