
Objetivo: migrar o fluxo de recuperação de senha para os templates nativos de autenticação em PT-BR, mantendo segurança e previsibilidade no redirecionamento, e usar o fallback atual apenas como contingência temporária.

1. Diagnóstico atual
- O app já usa `request-password-reset` como camada intermediária:
  - tenta envio nativo primeiro com `resetPasswordForEmail(...)`
  - cai para fallback via `send-email` quando o envio nativo falha
- As telas `RecuperarSenha` e `RedefinirSenha` já estão em PT-BR e já diferenciam participante vs. organizador.
- O redirect por tipo já existe:
  - participante: `/redefinir-senha`
  - organizador: `/redefinir-senha?tipo=organizador`
- O bloqueio atual para o nativo está na infraestrutura de e-mail: o domínio `notify.upplin.com` está com falha de provisionamento.

2. Migração proposta
- Ativar os templates nativos de autenticação do projeto para recovery.
- Gerar os templates nativos oficiais e personalizar o template de recuperação em PT-BR com a identidade da UPPLIN.
- Publicar o hook nativo de auth para que o fluxo real de recuperação passe a usar esse template.
- Manter `request-password-reset` por enquanto, mas rebaixá-lo para contingência:
  - tentar o nativo primeiro
  - só cair para `send-email` se houver erro real de envio/provisionamento
- Quando o nativo estiver confirmado funcionando, simplificar o fluxo e avaliar desativar o fallback customizado para reduzir complexidade.

3. Ajustes de implementação
- Infra de e-mail
  - Reconfigurar o domínio de envio do projeto para sair do estado de falha.
  - Confirmar que o domínio do projeto está apto para envio autenticado.
- Templates nativos
  - Criar/atualizar os templates oficiais de auth.
  - Traduzir o e-mail de recovery para PT-BR com:
    - assunto em português
    - título “Redefinir sua senha”
    - CTA “Redefinir minha senha”
    - aviso de expiração do link em português
    - instrução de ignorar o e-mail, se a solicitação não foi feita pelo usuário
  - Aplicar branding UPPLIN:
    - fundo branco no corpo do e-mail
    - cores primárias da marca
    - tipografia coerente com o app
- Frontend
  - Revisar `src/pages/RecuperarSenha.tsx` para alinhar mensagens de:
    - envio realizado
    - falha no envio
    - comportamento silencioso quando o e-mail não existir
  - Revisar `src/pages/RedefinirSenha.tsx` para alinhar:
    - título
    - instrução inicial
    - erro de token/link expirado
    - sucesso após salvar senha
- Fallback
  - Ajustar `supabase/functions/request-password-reset/index.ts` para:
    - registrar claramente se o envio foi `native`, `fallback` ou `silent`
    - considerar o nativo como principal
    - preservar o `redirectTo` correto por tipo
  - Revisar `supabase/functions/send-email/index.ts` para manter o template `password_reset` coerente com o template nativo enquanto o fallback existir.

4. Validação
- Testar os cenários:
  - participante → recebe e-mail em PT-BR → link abre `/redefinir-senha`
  - organizador → recebe e-mail em PT-BR → link abre `/redefinir-senha?tipo=organizador`
  - link expirado/inválido → mensagem clara em PT-BR na tela de redefinição
  - falha do envio nativo → fallback envia em PT-BR sem quebrar a UX
- Confirmar qual caminho foi usado no teste:
  - nativo
  - fallback
- Só considerar a migração concluída quando o e-mail real chegar traduzido.

5. Arquivos/áreas envolvidos
- `src/pages/RecuperarSenha.tsx`
- `src/pages/RedefinirSenha.tsx`
- `supabase/functions/request-password-reset/index.ts`
- `supabase/functions/send-email/index.ts`
- `supabase/config.toml`
- templates nativos de auth que serão criados no backend
- hook nativo de auth do projeto

6. Resultado esperado
- O fluxo principal de recuperação passa a usar o sistema nativo de autenticação com template em português.
- O e-mail chega com assunto, conteúdo e botão em PT-BR.
- Participante e organizador são redirecionados para a rota correta.
- O fallback continua cobrindo indisponibilidade temporária do domínio sem voltar o usuário para inglês.
- As telas do app e o e-mail ficam 100% consistentes entre si.
