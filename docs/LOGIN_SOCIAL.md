# Login Google e Apple

## Estado e responsabilidade

Em 28/10/2026, os dois provedores estavam desativados no Supabase e sem Client IDs/secrets. O código possui a opção Apple nas telas de login e cadastro de participante e organizador. As opções só ficam habilitadas quando o Supabase informa o provedor ativo. No Capacitor iOS, Google só é habilitado junto com Apple. A presença do botão não substitui um teste real de autorização.

O admin permanece em `admin.upplin.com` com login/senha, sem botões sociais. Não foram alteradas pastas Android/iOS, configurações do Capacitor, identificadores, assinatura ou perfis de provisionamento. Não foi produzido um build nativo.

## Google Cloud (titular da conta)

1. Em Google Auth Platform, configurar Branding: UPPLIN, suporte, `https://www.upplin.com`, política `https://www.upplin.com/privacidade`, domínio `upplin.com`.
2. Público externo. Publicar o app se não quiser limitar a uma lista de usuários de teste. Atender a qualquer verificação solicitada pelo Google.
3. Pedir somente os escopos de identidade necessários: openid, email, profile.
4. Criar cliente OAuth do tipo Web. Origens JavaScript: `https://www.upplin.com` e `https://upplin.com`.
5. Callback exato: `https://ermhzlthjlolqsbtjawf.supabase.co/auth/v1/callback`.
6. Colar Client ID e Client Secret diretamente em Supabase → Authentication → Sign In / Providers → Google. Salvar e habilitar.

Não colocar secrets na Vercel, no frontend ou no Git. Para o fluxo OAuth no navegador usado pelo código, não é necessário criar clientes Android/iOS. Uma futura implementação com SDK nativo tem requisitos diferentes.

## Apple Developer (titular da conta)

1. Confirmar com o desenvolvedor nativo o App ID da loja: **com.despia.upplin**. Habilitar Sign in with Apple no App ID correto; o desenvolvedor verifica capabilities e perfis antes do próximo build.
2. Criar Services ID, por exemplo `com.upplin.login`, habilitar Sign in with Apple e vincular ao Primary App ID correto.
3. Configurar domínio `ermhzlthjlolqsbtjawf.supabase.co` e Return URL `https://ermhzlthjlolqsbtjawf.supabase.co/auth/v1/callback`.
4. Criar chave Sign in with Apple vinculada ao App ID. Guardar `.p8` (download único), Key ID e Team ID em local seguro. Confirmar o Team ID na conta; não assumir o ID de uma mensagem.
5. Gerar o client secret JWT conforme a [documentação do Supabase](https://supabase.com/docs/guides/auth/social-login/auth-apple). O JWT expira em até seis meses. O arquivo `.p8` não vence automaticamente a cada seis meses.
6. Colar Services ID e client secret JWT diretamente em Supabase → Authentication → Sign In / Providers → Apple. Salvar e habilitar.
7. Registrar e autenticar os remetentes de email no Apple Private Email Relay antes de liberar em produção o uso de email oculto. Testar mensagens de autenticação e notificações com endereço de relay.
8. Agendar renovação antes do `exp` real do JWT (por exemplo, após cinco meses quando emitido com validade de seis meses). Após trocar, testar novo login antes de considerar a renovação concluída.

## Redirects e nativo

O Supabase já contém Site URL `https://www.upplin.com` e redirects `https://www.upplin.com/**`, `https://upplin.com/**`.

**Bundle ID e URL scheme são configurações diferentes.** O checkout atual possui o esquema legado `com.upplin.app://auth/callback` no código OAuth e nos arquivos nativos, enquanto os apps de loja são mantidos em outra frente com ID `com.despia.upplin`. Não substituir um pelo outro por inferência. O desenvolvedor responsável precisa confirmar o esquema registrado no build real. Depois, alinhar allowlist do Supabase, listener e esquema do build em uma tarefa nativa explícita. O esquema legado e o allowlist atual foram preservados.

No fluxo web, participante retorna ao app/onboarding; organizador retorna a `/organizador/onboarding`, que resolve o perfil e sua área. A Apple pode não fornecer nome; coletar os dados obrigatórios no onboarding existente. Email oculto deve funcionar sem exigir endereço pessoal.

## Validação para liberação

- Após configurar cada provedor: testar login novo e recorrente, cancelamento e erros no domínio real; conferir perfil, sessão e retorno de participante/organizador.
- Testar Apple com email compartilhado e oculto; conferir recebimento de emails pelo relay.
- O desenvolvedor nativo testa retorno do navegador em iPhone/Android, app aberto e fechado, antes de enviar às lojas. Um teste web não comprova esse retorno.
- A [regra 4.8 da Apple](https://developer.apple.com/app-store/review/guidelines/#login-services) pede uma opção equivalente que cumpra os critérios de privacidade quando aplicável; Apple é a opção escolhida aqui, não uma garantia automática de aprovação.
