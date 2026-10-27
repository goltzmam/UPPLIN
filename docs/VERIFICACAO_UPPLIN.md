# Verificação UPPLIN — 27/10/2026

## Resultado confirmado

O novo Supabase (`ermhzlthjlolqsbtjawf`) recebeu as migrations pendentes. O histórico está com **79 versões aplicadas**. Há **40 tabelas públicas, todas com RLS**, e nenhuma das 25 colunas originalmente ausentes continua faltando.

Das 15 tabelas históricas inicialmente apontadas como ausentes, dez pertencem ao modelo atual e foram restauradas. Cinco eram de módulos que o próprio repositório remove em sua última migration; não foram recriadas indevidamente. A tabela adicional é a presença privada do chat.

As 19 funções Edge foram publicadas. Os tipos TypeScript foram regenerados do banco real. Site URL e callbacks web/nativo de Auth foram configurados. `SITE_URL`, `EMAIL_FROM` e a assinatura do hook de email foram preparados sem valores de credenciais no código.

## Evidências

| Verificação | Resultado |
|---|---|
| Histórico de migrations | Em dia; nova execução não encontra pendências |
| Requisitos de colunas do frontend anterior | Nenhuma coluna ausente |
| RLS das tabelas públicas | Habilitado nas 40 tabelas |
| Login por senha real | Passou com contas técnicas temporárias |
| Evento | Organizador criou rascunho; participante não viu o rascunho; publicação e leitura funcionaram |
| Ingresso gratuito | Pedido criado pela Edge Function e confirmado no servidor; repetição não duplicou ingresso |
| Titularidade | Outra identidade não confirmou o pedido do comprador |
| Posts/Storage | Upload e CRUD funcionaram; outra identidade não excluiu o post |
| Credenciais Mercado Pago | Leitura pelo cliente negada |
| Teste transacional real | Valor de pagamento, idempotência, estoque, reembolso e presença privada passaram; fixtures revertidas |
| Limpeza do teste HTTP | Arquivos, eventos, posts e identidades técnicas removidos |
| Navegador | 26 rotas renderizadas sem exceções; áreas privadas redirecionaram para login |
| Dependências npm | Zero vulnerabilidades reportadas após correções e atualizações |
| Android | APK de depuração compilado com os plugins de App/Browser |
| iOS | Projeto e deep link preparados; compilação exige macOS/Xcode |

Foram corrigidos o checkout gratuito que mostrava sucesso sem emitir ingressos, validação do estado/valor de pagamento, reentregas de liberação de estoque, estado assinado do OAuth Mercado Pago, webhooks sem assinatura e credenciais de vendedores expostas ao papel do cliente.

O build usa npm e Vite, sem dependências do provedor anterior. A integração Supabase da Vercel pode fornecer aliases públicos; nenhum alias de chave de serviço é publicado no bundle. URL antiga e JWT de outro projeto são rejeitados no build.

## Limites atuais

- O commit `6a5ae46` foi enviado ao `master`. O deploy automático da Vercel falhou (`dpl_CzoNSyK9zoNH4DzJZwPxZ5YusPok`); a versão pública inspecionada ainda apontava ao banco antigo.
- A API de logs da Vercel retornou 403 sem autenticação. Falta disponibilizar `VERCEL_TOKEN` nas configurações seguras para diagnosticar a falha, corrigir o deploy e verificar a troca no domínio. Não há evidência suficiente para atribuir uma causa ao erro.
- Os secrets Mercado Pago e `RESEND_API_KEY` não estavam cadastrados. Não houve cobrança, assinatura financeira ou estorno real. Entrega de email não foi validada.
- O hook Resend foi preparado e permanece desativado até a chave e o domínio remetente estarem prontos. Google/Apple dependem de configuração de provedores.
- O primeiro administrador aguarda o email indicado pelo responsável. Não há conta/senha fixa nem usuário técnico mantido.
- Expiração de PIX, renovação de tokens de vendedores, liquidação, assinaturas e fluxo financeiro completo exigem validação com o provedor configurado.
- Logs de execução e respostas foram inspecionados. A consulta agregada de logs pela API do serviço retornou erros de backend/esquema; não foi declarada uma varredura completa dos logs internos.
- O lint legado ainda tem pendências; tipos, build, testes e auditoria de dependências passaram separadamente.
- Não houve teste físico em aparelhos nem assinatura/publicação nas lojas.

Instruções e requisitos detalhados: [PRODUCAO.md](PRODUCAO.md).

Os artefatos de auditoria e resultados detalhados ficam em `/workspace/upplin-audit`, fora do checkout. Nenhum valor de secret foi incluído neste relatório.

As rotinas de expiração de pedidos (a cada minuto) e revisão de assinaturas (diariamente às 09h de São Paulo) foram configuradas no cron. A fila de email está agendada, mas inativa enquanto falta o Resend. A autenticação das tarefas fica no Vault criptografado, sem chave no código ou comando do cron.
