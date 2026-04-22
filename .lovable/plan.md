
Objetivo: fechar uma auditoria completa do app e implementar o que ainda falta para deixar o fluxo social confiável (publicar, curtir, comentar), além de validar o checkout/assinaturas com Mercado Pago.

1. Estado atual confirmado
- Publicação social já aceita `event_id` nulo no banco e existem posts recentes sem evento, então a regra “precisa ter ingresso para postar” não existe.
- Comentários já têm pelo menos um registro recente no banco.
- Likes ainda não têm registros recentes, então o fluxo de curtir continua suspeito/inconsistente.
- O app já tem base pronta para:
  - feed/home e evento público
  - perfil e abas sociais
  - ingressos e checkout
  - pagamentos PIX/cartão
  - assinaturas do organizador
  - chat/mensagens
- O backend de pagamentos está implementado, mas sem logs recentes de execução; precisa de teste funcional real ponta a ponta.

2. Problemas ainda visíveis no código
- Social feed usa `profiles` diretamente em `SocialFeedTab`, mas comentários usam `profiles_public`. Isso pode quebrar exibição de autor em feed por RLS.
- `PostLikeButton` ainda está em uma versão frágil:
  - depende de `useMutation` + estado otimista que pode contar errado
  - não trata usuário sem login com fallback claro
  - não sincroniza todas as queries relacionadas
- `PostComments` só carrega comentários quando expandido, então o contador pode aparecer zerado antes de abrir.
- `UpActionMenu` publica, mas não invalida caches sociais após sucesso; o post pode ser criado e não aparecer imediatamente.
- `UserPostsTab` ainda permite só imagem no upload local da aba de posts, enquanto a regra desejada é texto, imagem, vídeo ou combinação.
- O texto do modal de publicação ainda sugere obrigatoriedade/ênfase errada para evento marcado.
- Há inconsistência de UX entre criação no modal “UP” e criação dentro da aba de posts.

3. Implementação proposta para o social funcionar de verdade
- Unificar o modelo de publicação:
  - permitir texto-only, imagem-only, vídeo-only ou texto+mídia
  - manter `event_id` opcional
  - listar para marcação apenas eventos com ingresso emitido, sem bloquear publicação sem evento
- Refatorar `UpActionMenu` e `UserPostsTab` para usar a mesma lógica de criação de post:
  - mesma validação
  - mesmo uploader
  - mesmo tratamento de erro
  - mesma invalidação de cache
- Corrigir curtidas:
  - trocar a lógica atual por handler assíncrono simples e previsível
  - invalidar `post-likes`, `social-feed`, `user-posts` e quaisquer contadores derivados
  - bloquear duplo clique simultâneo
- Corrigir comentários:
  - separar query de contagem e query da lista
  - garantir atualização imediata do contador mesmo com drawer fechado
  - invalidar feed, posts do usuário e comentários após inserir/excluir
- Padronizar perfis públicos:
  - trocar consultas do feed social para `profiles_public`
  - manter `profiles` apenas para o próprio usuário autenticado
- Ajustar UX:
  - mensagens de erro mais claras no publicar/curtir/comentar
  - remover qualquer texto que sugira bloqueio por ingresso na publicação
  - manter mídia de post em formato vertical 9:16 para imagem e vídeo

4. Auditoria funcional por seção do app
- Home/feed:
  - revisar cards, links para evento, fallback de capa, preço e navegação
- Evento:
  - validar compra, save, comentários, reviews, check-in social e contagem de posts
- Perfil:
  - validar header, abas, edição de perfil e fluxo completo de posts
- Mensagens:
  - revisar abertura de conversa, listagem e seleção
- Meus ingressos:
  - validar ingressos emitidos, pedidos pendentes e rota de pagamento pendente
- Organizador:
  - revisar configurações, assinatura, relatórios e fluxo de conexão de pagamento
- Admin:
  - fazer leitura estrutural das rotas e checar possíveis pontos de risco, sem mexer onde não houver falha real

5. Revisão de pagamentos
- Validar checkout:
  - criação de pedido
  - carregamento da chave pública
  - cartão
  - PIX
  - tela de pendência
  - tela de sucesso
- Validar assinaturas do organizador:
  - assinar plano
  - cancelar plano
  - histórico de faturas
- Conferir consistência do pós-pagamento:
  - tickets emitidos
  - status do pedido
  - atualização das telas
- Se houver falha, corrigir no frontend e nas funções de backend já existentes.

6. O que parece corrigido até agora
- Mídia quebrada de posts recebeu fallback visual.
- Posts sem evento já existem e provam que `event_id` é opcional.
- Layout vertical de mídia foi padronizado.
- Cor do badge de preço já foi melhorada no card do feed.
- Fluxo base de Mercado Pago já existe para checkout e assinatura.

7. O que falta corrigir
- Garantir publicação confiável com atualização imediata na UI.
- Corrigir curtidas para persistirem e refletirem na interface.
- Corrigir comentários para contagem e listagem ficarem consistentes.
- Unificar criação de posts entre modal UP e aba de posts.
- Validar Mercado Pago com teste ponta a ponta real.
- Fazer um smoke test geral nas principais seções.

Detalhes técnicos
- Arquivos centrais do social:
  - `src/components/navigation/UpActionMenu.tsx`
  - `src/components/profile/UserPostsTab.tsx`
  - `src/components/profile/PostLikeButton.tsx`
  - `src/components/profile/PostComments.tsx`
  - `src/components/profile/SocialFeedTab.tsx`
  - `src/components/profile/PostMedia.tsx`
- Arquivos centrais de pagamentos:
  - `src/pages/Evento.tsx`
  - `src/pages/Checkout.tsx`
  - `src/pages/PagamentoPendente.tsx`
  - `src/pages/PagamentoSucesso.tsx`
  - `src/pages/organizador/AssinaturasContent.tsx`
  - `supabase/functions/create-order/index.ts`
  - `supabase/functions/mp-get-public-key/index.ts`
  - `supabase/functions/mp-process-payment/index.ts`
  - `supabase/functions/mp-subscribe/index.ts`
  - `supabase/functions/mp-cancel-subscription/index.ts`
  - `supabase/functions/mp-webhook/index.ts`

Resultado esperado após a execução
- Usuário consegue postar texto, foto, vídeo ou ambos, com ou sem evento.
- Feed e perfil mostram o post imediatamente.
- Curtir funciona e persiste.
- Comentar funciona e o contador atualiza certo.
- Checkout e assinatura ficam validados com comportamento consistente.
- Fica um relatório final dizendo o que foi ajustado, o que foi confirmado funcionando e o que ainda depende de credencial/conta externa para teste real.
