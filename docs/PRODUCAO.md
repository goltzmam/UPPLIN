# Produção UPPLIN

Atualizado em 27/10/2026. Stack: GitHub, Vercel, Supabase, Mercado Pago, Resend e Capacitor.

## Banco e backend aplicados

Projeto: `ermhzlthjlolqsbtjawf`. O histórico possui 79 migrations aplicadas, com 40 tabelas públicas e RLS habilitado em todas. As 25 colunas exigidas pelo frontend foram verificadas no catálogo real e não estão mais ausentes.

A auditoria inicial contou 15 tabelas históricas ausentes. Dez eram necessárias e foram restauradas pela sequência de migrations. Cinco pertenciam a módulos que a última migration do próprio repositório remove; elas não fazem parte do modelo atual e não devem ser recriadas.

Antes da atualização foram conferidos catálogo, histórico e contagens: não havia registros nas tabelas da aplicação nem usuários de Auth. As mudanças foram aplicadas em transações, com histórico registrado atomicamente e proteção contra exclusão de tabelas não vazias. As adaptações nas migrations pendentes tratam uma identidade antiga inexistente, objetos já importados e uma tabela Realtime pertencente à plataforma. A aplicação usa RLS das tabelas próprias, incluindo a nova presença privada do chat.

As 19 Edge Functions foram publicadas. Credenciais OAuth Mercado Pago ficaram acessíveis somente ao backend; o frontend consulta apenas o estado da conexão. Confirmação de pagamento valida o total e o estado do pedido. Cancelamentos usam liberação transacional de estoque. Pedidos gratuitos são confirmados por RPC com validação de titularidade, em vez de apenas mostrar uma mensagem de sucesso.

## Verificações executadas

- Build e tipos TypeScript do frontend.
- Tipos das 19 funções e testes Deno das regras, assinaturas e emails.
- Testes Node do ambiente público e callbacks nativos.
- Navegação de 26 rotas no bundle de produção, com áreas privadas redirecionando usuários sem sessão.
- Testes transacionais no banco real para emissão gratuita, titularidade, valor do pagamento, idempotência, estoque, solicitação/aprovação/conclusão de reembolso e presença privada. Todos os registros foram revertidos.
- Teste por HTTP real com duas identidades técnicas temporárias: login por senha, organizador, evento privado/publicado, pedido gratuito, emissão de ingresso, upload e CRUD de post. Outra identidade não conseguiu confirmar o pedido nem excluir o post. Arquivos, contas e registros temporários foram removidos.
- `npm audit` sem vulnerabilidades na árvore instalada e lockfile corrigido.

Esses resultados não substituem testes de cobrança e liquidação no provedor. Não houve movimentação financeira nem teste de entrega de email para pessoas.

## Vercel e domínio

O domínio observado é `https://www.upplin.com`, com `https://upplin.com` também respondendo pela Vercel. A versão pública inspecionada inicialmente ainda usava o banco antigo. É necessário verificar o deploy após publicar o commit atual.

`vercel.json` define Node/Vite com `npm ci`, `npm run build`, saída `dist` e fallback das rotas da SPA. Configure em Production e Preview:

| Variável | Configuração |
|---|---|
| `VITE_SUPABASE_URL` | `https://ermhzlthjlolqsbtjawf.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública do novo projeto, inserida nas configurações seguras |
| `VITE_APP_URL` | `https://www.upplin.com` |

O build aceita os aliases públicos fornecidos pela integração Supabase da Vercel (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_ANON_KEY`). Chaves de serviço nunca são usadas como fallback público. URL antiga, JWT de outro projeto e chave privilegiada no campo público fazem o build falhar, preservando o último deploy bem-sucedido.

Para consultar ou alterar o projeto Vercel por API, disponibilize `VERCEL_TOKEN` no ambiente seguro. O requisito foi salvo. Publicar por integração GitHub também pode disparar o deploy quando o projeto e suas variáveis estiverem configurados.

## Auth e email

O Site URL e os callbacks de domínio/nativo foram configurados no Supabase. Login por senha foi verificado. Google e Apple continuam desativados até suas credenciais serem configuradas em Authentication → Providers. Os botões Google ficam desabilitados quando o provedor não está habilitado.

O envio usa Resend. Os secrets `SITE_URL`, `EMAIL_FROM` e `SEND_EMAIL_HOOK_SECRET` foram configurados; a assinatura do hook foi gerada e armazenada diretamente nos serviços, sem valores no repositório. O hook está preparado e permanece desativado até haver `RESEND_API_KEY` e domínio de envio verificado. Confirme o remetente `UPPLIN <noreply@upplin.com>` e ajuste-o se a conta Resend usar outro remetente autorizado. O SMTP padrão do Supabase tem limitações para cadastro público.

Hook: `https://ermhzlthjlolqsbtjawf.supabase.co/functions/v1/auth-email-hook`.

O primeiro administrador deve ser provisionado explicitamente para o email indicado pelo responsável; não há promoção automática por cadastro nem conta/senha fixa. Nenhum usuário técnico foi mantido.

## Mercado Pago

Cadastrar em Edge Functions → Secrets, sem enviar valores por chat ou commit:

- `MP_ACCESS_TOKEN`
- `MP_PUBLIC_KEY`
- `MP_CLIENT_ID`
- `MP_CLIENT_SECRET`
- `WEBHOOK_SECRET`

Depois, conectar a conta de cada organizador pela aplicação e validar cobranças, assinaturas, cancelamentos e estornos autorizados. O split do código usa `application_fee`/`marketplace_fee`; isso não equivale a validar prazo de liquidação ou um sistema próprio de saques.

OAuth: `https://ermhzlthjlolqsbtjawf.supabase.co/functions/v1/mp-connect?action=callback`.
Webhook: `https://ermhzlthjlolqsbtjawf.supabase.co/functions/v1/mp-webhook`.

A política de expiração de PIX e a renovação dos tokens OAuth de organizadores ainda precisam de validação integrada antes de afirmar operação financeira contínua. Não existe evidência de teste real do provedor nesta configuração.

## Android e iOS

Identificador aprovado: `com.upplin.app`. Projetos nativos, permissões e retorno OAuth foram preparados. Login nativo usa navegador do sistema, PKCE e callback `com.upplin.app://auth/callback`, autorizado no Supabase. O deep link aceita somente esse destino.

```sh
npm ci
npm run build
npx cap sync android
npx cap sync ios
```

O APK de depuração foi compilado neste ambiente. Testes em aparelho, assinatura de release e publicação Play Store não foram realizados. iOS requer macOS/Xcode e assinatura Apple. As lojas exigem revisão das identidades, ícones, permissões e conta de demonstração.

## Operação e ferramentas

```sh
python3 -m pip install -r scripts/requirements.txt
python3 scripts/audit-production.py
python3 scripts/migrate-supabase.py          # lista somente o que ainda não foi aplicado
python3 scripts/migrate-supabase.py --apply  # executar após revisão e backup
python3 scripts/deploy-functions.py         # lista as funções
python3 scripts/deploy-functions.py --apply
python3 scripts/configure-supabase-automation.py          # lista rotinas
python3 scripts/configure-supabase-automation.py --apply  # configura usando Vault
```

Os scripts usam `SUPABASE_ACCESS_TOKEN` por HTTPS sem expor valores. São compatíveis com credenciais gerenciadas que não passam pela validação local de formato de versões antigas da CLI. A auditoria exporta apenas metadados selecionados, nomes de secrets e configurações públicas de Auth.

Nunca use `db reset` em produção. Não há necessidade de executar novamente migrations já registradas. O lint do código legado ainda tem pendências; build, tipos, testes e auditoria de dependências são resultados separados.

Rotinas configuradas: liberação de pedidos vencidos a cada minuto e revisão de assinaturas às 12h UTC (09h de São Paulo). A fila de email fica inativa até configurar o Resend; depois habilite `upplin-process-email-queue` em `cron.job`. Credenciais das tarefas são armazenadas no Vault criptografado. O script preserva a ativação de tarefas já existentes.
