# Conversas e suporte

A equipe aparece nas conversas como **Suporte UPPLIN**, com o ícone UPPLIN. O papel interno não é uma identidade exibida aos participantes.

- Participante e organizador podem trocar mensagens e abrir os perfis públicos pelo nome ou foto. Organizador usa nome/logo da empresa e tem link para sua página; participante usa nome/foto do perfil. A ausência de foto usa iniciais, sem inventar imagem.
- A central acompanha todas as conversas, identifica cada remetente e permite responder como suporte. Abrir uma conversa de terceiros para acompanhamento não marca mensagens como lidas em nome do destinatário.
- Conversas históricas sem perfil mostram “Conta indisponível”, sem tentar acessar propriedades de um perfil nulo. Os registros são preservados.
- O compositor no celular ocupa o espaço da navegação inferior durante a conversa. O fechamento restaura a navegação.
- Mensagens usam IDs estáveis, confirmação do servidor, nova tentativa em falha, atualizações Realtime e consulta periódica de segurança. Histórico carrega 50 mensagens por página, com cursor por data e ID.

## Banco e autorização

Migration `20261028150000_chat_support_and_identity`:

- `profiles_public` expõe apenas ID, nome, foto e capa a pessoas autenticadas. Dados privados continuam na tabela com RLS; não foram expostos CPF, email ou campos de suspensão.
- `get_chat_identities` só retorna identidades das conversas do solicitante ou da equipe autorizada. Remetentes da equipe são identificados como suporte.
- `start_chat` escolhe o suporte no servidor, valida evento/organizador e reutiliza a conversa por evento e tipo sob trava transacional. Não depende da leitura pública de papéis.
- `mark_chat_read` atualiza apenas o recebimento das conversas das quais a pessoa participa. O cliente não pode editar mensagens/participantes diretamente.
- O envio valida remetente, participação ou acesso da equipe, texto não vazio e limite de 4000 caracteres. O servidor atualiza a atividade da conversa.

## Verificação realizada

Testes com identidades temporárias e evento privado: troca nos dois sentidos, intervenção do suporte, perfis/fotos, criação e reutilização de atendimento, recibos de leitura, histórico órfão e envio em viewport móvel. Testes de API negaram acesso externo à conversa, falsificação de remetente, edição de mensagens e leitura de dados privados. Fixtures removidos ao final; não houve cobrança nem envio de emails a pessoas.

Essas verificações não certificam transações financeiras reais nem builds nativos. Android, iOS, Capacitor e identificadores de loja são mantidos pelo desenvolvedor nativo, sem alterações nesta entrega.

As migrations `20261028160000` e `20261028161000` corrigem o armazenamento privado dos anexos de reembolso e preservam evidências submetidas, além de proteger a escrita de pedidos, campos de gestão de organizador e funções internas de fila. Os testes confirmaram upload e abertura autorizada dos anexos e rejeição de terceiros. O registro técnico de reembolso usado no teste foi removido sem invocar o provedor.

Os atalhos de conversa em Meus ingressos e na lista de compradores usam a mesma identificação e trava de criação da central. A criação automática após confirmação também reaproveita a conversa existente, mesmo em registros legados com participantes em ordem diferente. O ajuste preserva as validações financeiras da função.
