# Auth, emails e posts — 30/10/2026

## Alterações

- Botão Apple já utiliza Supabase OAuth; conferido contra o endpoint real de autorização (cliente com.upplin.login, callback do projeto ermhzlthjlolqsbtjawf). Não foram alteradas as credenciais, os provedores ou as URLs de Auth. A única configuração alterada, expressamente autorizada pelo responsável, foi rate_limit_email_sent: 2 → 100 por hora.
- Emails de autenticação e transacionais usam CTA compartilhado, com tabela de apresentação, estilos inline, fundo #EF4444, texto #FFFFFF, raio de 12px e padding 16px 24px. Os atributos HTML são escapados sem modificar o valor do link/token dinâmico fornecido pelo Supabase. As cores HSL dos templates de autenticação foram convertidas para HEX.
- Perfil e configurações do organizador oferecem Alterar senha, solicitando confirmação por email no fluxo correspondente. Links inválidos são removidos da barra de endereços e a tela oferece novo pedido de recuperação. O formulário só libera a troca após validar a sessão de recuperação.
- Campos editáveis em telas móveis ou com ponteiro de toque usam no mínimo 16px, evitando o zoom automático do Safari. O zoom manual de acessibilidade permanece disponível.
- Posts: edição de texto, feedback de falhas, remoção da mídia própria após exclusão, limpeza do upload se a publicação falhar, curtida vinculada ao usuário da sessão e exclusão de comentário visível em toque. Feed e comentários oferecem nova tentativa após falhas de leitura.
- Evento: uma RPC salva evento, ingressos e mídias em uma transação e valida proprietário/conta ativa. Tipos removidos são pausados, preservando os pedidos. Triggers impedem apagar eventos/tipos com compras vinculadas. Datas do editor usam horário local e voltam em ISO, evitando deslocamento de três horas no Brasil. Mídias salvas não são apagadas enquanto o organizador ainda pode cancelar a edição.
- Organizador com CPF também é reconhecido como cadastro existente no login/onboarding.

## Verificação e limites

Foram exercitados usuários e dados temporários, sem cobrar, reembolsar ou chamar um provedor financeiro. Testes de API cobrem posts, curtidas, comentários, permissões, rollback do evento, propriedade e preservação de ingressos/pedidos. Testes de interface cobrem posts e formulários em 320, 390, 768 e 1440px. Os testes de email usam tokens reais gerados pelo Supabase; verificam confirmação de cadastro, redefinição nos dois públicos, senha nova aceita e antiga recusada. Credenciais/tokens não são impressos. Os usuários temporários são removidos ao concluir.

Foi enviada ao suporte uma cópia autorizada para conferir a aparência no Gmail de um iPhone físico. A renderização automática de HTML não equivale a validar Gmail/Outlook/Apple Mail reais. A confirmação no Gmail depende do responsável. Navegação de verificação do Supabase no navegador de teste encontrou a CA do proxy do ambiente; a validação do token de cadastro foi feita por HTTPS com a CA confiável do ambiente e o redirecionamento resultante foi validado na interface.

O teste do botão Apple verifica a autorização e os parâmetros reais, sem entrar numa conta Apple de outra pessoa. A conclusão do login requer conta/dispositivo reais. Google está desabilitado no projeto e foi mantido assim. Android, iOS, Capacitor e IDs de loja permanecem intactos. O responsável nativo deve integrar o commit e validar teclado/zoom/OAuth no build antes do envio às lojas.
