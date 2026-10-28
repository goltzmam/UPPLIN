# Produção UPPLIN

Atualizado em 27/10/2026. Stack: GitHub, Vercel, Supabase, Mercado Pago, Resend e Capacitor.

## Banco e backend aplicados

Projeto: `ermhzlthjlolqsbtjawf`. O histórico possui 81 migrations aplicadas, com 40 tabelas públicas e RLS habilitado em todas. As 25 colunas exigidas pelo frontend foram verificadas no catálogo real e não estão mais ausentes.

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

Esses resultados não substituem testes de cobrança e liquidação no provedor. Não houve movimentação financeira. O convite do administrador foi aceito pelo serviço de Auth com o hook Resend ativo; a entrega final na caixa de entrada não foi confirmada.

## Vercel e domínio

O domínio observado é `https://www.upplin.com`, com `https://upplin.com` também respondendo pela Vercel. O deploy `dpl_2pC4o1DjoYVKiyM6suxd3UAW6Z7Z` está READY e associado aos dois domínios. Ambos retornaram HTTP 200; o bundle usa o novo Supabase, sem a URL antiga nem SDK Lovable. Seis rotas públicas passaram no navegador sem exceções.

`vercel.json` define Node/Vite com `npm ci`, `npm run build`, saída `dist` e fallback das rotas da SPA. Configure em Production e Preview:

| Variável | Configuração |
|---|---|
| `VITE_SUPABASE_URL` | `https://ermhzlthjlolqsbtjawf.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública do novo projeto, inserida nas configurações seguras |
| `VITE_APP_URL` | `https://www.upplin.com` |

O build aceita os aliases públicos fornecidos pela integração Supabase da Vercel (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_ANON_KEY`). Chaves de serviço nunca são usadas como fallback público. URL antiga, JWT de outro projeto e chave privilegiada no campo público fazem o build falhar, preservando o último deploy bem-sucedido.

Os acessos Supabase/Vercel agora funcionam. Os logs confirmaram que o deploy anterior falhou pela URL de Supabase incorreta/ausente; as três variáveis VITE foram configuradas explicitamente. A branch de produção da Vercel foi corrigida para `master` em Environments → Production → Branch Tracking, acompanhando a branch padrão do GitHub. A publicação atual foi solicitada explicitamente com target production.

## Auth e email

O Site URL e os callbacks de domínio/nativo foram configurados no Supabase. Login por senha foi verificado. Google e Apple continuam desativados até suas credenciais serem configuradas em Authentication → Providers. Os botões Google ficam desabilitados quando o provedor não está habilitado.

O envio usa Resend. `RESEND_API_KEY`, `SITE_URL`, `EMAIL_FROM` e `SEND_EMAIL_HOOK_SECRET` estão configurados; o hook está ativo. O remetente é `UPPLIN <noreply@upplin.com>`. A API confirmou SPF e DKIM verificados; o domínio aparece parcialmente verificado por pendências de recebimento/rastreamento. Não altere MX da caixa de email apenas para satisfazer recursos opcionais de recebimento do Resend.

Hook: `https://ermhzlthjlolqsbtjawf.supabase.co/functions/v1/auth-email-hook`.

O primeiro administrador `admin@upplin.com` foi provisionado explicitamente com papel admin. O login por senha e a autorização administrativa foram verificados. A senha é gerenciada no Supabase e não está no repositório; a recuperação pública da conta administrativa está desativada. Não há senha fixa nem promoção automática por cadastro. Nenhum usuário técnico foi mantido.

## Mercado Pago

Configurados em Edge Functions → Secrets, sem valores em código ou commit:

- `MP_ACCESS_TOKEN`
- `MP_PUBLIC_KEY`
- `MP_CLIENT_ID`
- `MP_CLIENT_SECRET`
- `WEBHOOK_SECRET`

Depois, conectar a conta de cada organizador pela aplicação e validar cobranças, assinaturas, cancelamentos e estornos autorizados. O split do código usa `application_fee`/`marketplace_fee`; isso não equivale a validar prazo de liquidação ou um sistema próprio de saques.

OAuth: `https://ermhzlthjlolqsbtjawf.supabase.co/functions/v1/mp-connect?action=callback`.
Webhook: `https://ermhzlthjlolqsbtjawf.supabase.co/functions/v1/mp-webhook`.

A política de expiração de PIX e a renovação dos tokens OAuth de organizadores ainda precisam de validação integrada antes de afirmar operação financeira contínua. A consulta `/users/me` pelo servidor Supabase retornou HTTP 200 e corresponde à conta esperada. O webhook rejeitou assinatura inválida (401) e aceitou notificação técnica assinada (200), removida após o teste. Ainda não houve cobrança, assinatura financeira, repasse ou estorno no provedor.

## Android e iOS

Identificador das lojas informado pelo responsável: `com.despia.upplin`. A configuração nativa é mantida separadamente; atualizações web não devem alterar android/, ios/ ou capacitor.config.*. Projetos nativos, permissões e retorno OAuth foram preparados. Login nativo usa navegador do sistema, PKCE e callback `com.upplin.app://auth/callback`, autorizado no Supabase. O deep link aceita somente esse destino.

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

Rotinas configuradas: liberação de pedidos vencidos a cada minuto e revisão de assinaturas às 12h UTC (09h de São Paulo). A fila de email está ativa após configurar o Resend; sua chamada autenticada retornou HTTP 200 e a anônima foi rejeitada com 401. Credenciais das tarefas são armazenadas no Vault criptografado. O script preserva a ativação de tarefas já existentes.

## Por perto — interface revisada

Mapa escuro, marcadores com a capa do evento e navegação direta à página. A lista acompanha a região visível, com filtros por data e distância a partir da posição autorizada. Desktop/tablet usam painel lateral; celular usa painel inferior acima da navegação. Os créditos obrigatórios ficam discretos no rodapé, sem o prefixo Leaflet.

As tabelas events e ticket_types foram adicionadas à publicação Realtime, preservando RLS. O cliente invalida consultas nas alterações e verifica atualizações a cada 30 segundos como fallback. Busca de cidade/endereço acontece ao enviar o formulário, sem consultas por digitação. Falhas, ausência de resultados e permissões têm estados próprios. Eventos exibidos em produção são somente dados reais publicados com coordenadas.

Verificação de interface com fixtures isoladas no navegador (sem gravar eventos de demonstração): desktop, tablet, celular e tela estreita; filtros, sincronização mapa/lista, busca e navegação por card/marcador passaram.

O mapa utiliza somente OpenStreetMap, sem chave de API, na web e nos aplicativos nativos. O visual escuro de Por perto, os marcadores e a lista de eventos foram mantidos.

As áreas web usam admin.upplin.com e planos.upplin.com. Os fluxos de recuperação de participante e organizador têm rotas próprias; admin não tem recuperação pública. Detalhes em [WEB_SUBDOMINIOS.md](WEB_SUBDOMINIOS.md).
