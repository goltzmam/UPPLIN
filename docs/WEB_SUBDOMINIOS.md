# Áreas web da UPPLIN

- Aplicativo web: https://www.upplin.com
- Administração: https://admin.upplin.com — login em /login, painel em /. Apenas conta com papel admin. Sem cadastro nem recuperação pública de senha.
- Apresentação para organizadores: https://planos.upplin.com — login/cadastro levam ao aplicativo web em /organizador/login e /organizador/cadastro.

Os subdomínios usam o mesmo projeto Vercel com seleção de superfície por hostname e routing middleware. O admin entrega HTML privado, no-store/noindex, e não disponibiliza as rotas do aplicativo público. As sessões ficam no armazenamento de cada origem; separar domínio não substitui autorização do banco. O código da senha nunca é incluído no frontend, arquivos ou Git.

## Recuperação

Participante: /recuperar-senha → email → /redefinir-senha → /login.
Organizador: /organizador/recuperar-senha → email → /organizador/redefinir-senha → /organizador/login.

Links antigos com tipo=organizador são direcionados para a rota correta. Novos links usam token_hash no fragmento, verificado pelo Supabase na tela correta. O token é removido da URL após validação, e uma sessão comum não habilita o formulário de recuperação. Após trocar a senha, a sessão local é encerrada e o usuário volta ao login correspondente.

O RPC can_request_password_reset é exclusivo de service_role e bloqueia contas admin no fluxo público, sem revelar o resultado ao cliente. O hook assinado de email também aplica a política para chamadas diretas à recuperação Supabase. Recuperação de admin é operação privilegiada do responsável pelo ambiente, não uma tela pública.

## Lojas

A LP tem os badges oficiais das lojas. Enquanto os endereços estiverem vazios, os botões ficam desativados e marcados como Em breve. Depois de publicar, configurar na Vercel:

- VITE_APP_STORE_URL
- VITE_GOOGLE_PLAY_URL

Nenhum identificador ou URL fictícia de aplicativo foi usado.

## Escopo nativo

Esta alteração não modifica android/, ios/, arquivos capacitor.config.* nem os IDs das lojas. Os apps registrados usam com.despia.upplin e são mantidos pelo desenvolvedor nativo. Não executar cap sync durante tarefas web. As superfícies admin e LP são bloqueadas pelo roteamento quando Capacitor identifica execução nativa.

## Testes

npm run typecheck; npm test; Deno tests de auth-email e checks das funções. Validar logins administrativos e recuperação com contas técnicas removidas ao terminar. No domínio, conferir admin sem recuperação, LP com CTAs para o app web, badges desativados e canonical da LP no subdomínio.
