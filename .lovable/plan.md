
Objetivo: deixar o e-mail de recuperação de senha em português do Brasil, com texto consistente com a UPPLIN, porque hoje o fluxo real ainda usa o e-mail padrão em inglês.

1. Diagnóstico confirmado
- A tela `src/pages/RecuperarSenha.tsx` chama `supabase.auth.resetPasswordForEmail(...)`.
- Isso dispara o e-mail nativo de autenticação, não o template `password_reset` da função `supabase/functions/send-email/index.ts`.
- O projeto não tem hoje os arquivos de templates nativos de auth (`auth-email-hook` / templates de recovery), então o envio está caindo no template padrão em inglês.
- Ou seja: o texto em português que existe na função `send-email` não está sendo usado no fluxo de “esqueci minha senha”.

2. Correção proposta
- Configurar os templates nativos de autenticação do projeto para que o e-mail de recuperação use um template customizado em PT-BR.
- Personalizar o template de recovery com:
  - assunto em português
  - título “Redefinir sua senha”
  - CTA “Redefinir minha senha”
  - texto de validade do link em português
  - tom e identidade visual da UPPLIN
- Publicar o hook de auth para que o envio nativo passe a usar esse template.
- Manter a página `RecuperarSenha.tsx` usando `resetPasswordForEmail`, porque esse é o fluxo correto e seguro.

3. Ajustes complementares
- Revisar a copy da página `RecuperarSenha.tsx` e da página `RedefinirSenha.tsx` para garantir consistência entre:
  - email enviado
  - tela de recuperação
  - tela de redefinição
- Verificar se o texto está adaptado tanto para participante quanto para organizador, sem deixar termos em inglês.
- Revisar se a função `send-email` ainda precisa manter o template `password_reset`; se ele estiver morto no fluxo atual, alinhar o uso para evitar confusão futura.

4. Arquivos/áreas envolvidos
- `src/pages/RecuperarSenha.tsx`
- `src/pages/RedefinirSenha.tsx`
- templates de auth email de recovery que serão gerados no backend
- hook de auth email do projeto

5. Resultado esperado
- Ao clicar em “Enviar link de recuperação”, o usuário recebe e-mail em português do Brasil.
- O assunto, botão e instruções ficam totalmente traduzidos.
- O fluxo continua seguro e nativo, sem gambiarra paralela.
- A experiência de recuperação fica coerente com a marca UPPLIN.
