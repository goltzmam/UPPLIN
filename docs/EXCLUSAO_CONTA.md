# Exclusão de conta e revisão das lojas

## Operação

Participante: Perfil → Configurações → Excluir conta. Organizador: painel → Configurações → Excluir conta. Uma conta com ambos os perfis perde ambos. Exige confirmação EXCLUIR e autenticação recente; login por senha pede a senha atual. Contas de suporte não podem ser excluídas por esse fluxo.

Página pública: https://www.upplin.com/excluir-conta. Canal: suporte@upplin.com. Entrega, recebimento pelo Resend e abertura pelo responsável foram confirmados em 30/10/2026. Responder em até 2 dias úteis e concluir em até 30 dias corridos. A identidade do solicitante precisa ser verificada antes de executar pedidos recebidos por email.

Não excluir diretamente no painel Authentication: isso ignora o inventário, as obrigações financeiras e a revogação dos provedores. Para um pedido verificado, usar o mesmo serviço de exclusão:

```bash
python scripts/process-account-deletion.py --user-id UUID
python scripts/process-account-deletion.py --user-id UUID --identity-verified --apply
```

Usa SUPABASE_ACCESS_TOKEN somente nas configurações seguras. O primeiro comando apenas verifica a conta. O segundo é irreversível. Não utilizar para testar contas reais. A rotina protege contas de suporte, exige token Apple quando aplicável e não imprime credenciais nem dados pessoais. O processamento em segundo plano retoma falhas automaticamente.

## Arquitetura e retenção

As funções delete-account e store-apple-token validam a identidade no servidor. Um recibo aleatório permite consultar apenas status, sem login. O worker roda a cada minuto: bloqueia acesso, revoga Apple, cancela assinaturas Mercado Pago, remove o inventário de arquivos, elimina dados pessoais e só então apaga Auth. Falhas não são declaradas como exclusão concluída. Uma confirmação é enviada ao email registrado, com resposta para suporte@upplin.com.

O schema privacy não é exposto e não pode ser consultado por anon/authenticated. As RPCs operacionais são exclusivas do backend. Tokens Apple ficam criptografados no Vault. Sessões antigas ficam impedidas de acessar tabelas e executar operações mesmo antes do vencimento do JWT.

Pedidos/ingressos/pagamentos mínimos são desvinculados da conta; CPF fiscal e registros financeiros necessários ficam em arquivo privado por 5 anos, considerando a última movimentação relacionada e a data do evento. Não manter payloads completos do provedor. Pedidos e arquivos de outras pessoas são preservados. Uma rotina diária expira os registros, incluindo IP/data/hora após 6 meses. Emails pessoais pendentes, arquivados e nas filas de falha são apagados junto com os dados pessoais. Mensagens de outras pessoas não são apagadas com a conta do solicitante.

Contatos temporários de confirmação deixam de ser guardados após envio aceito ou, no máximo, 30 dias da conclusão. Recibos e inventários operacionais expiram em 90 dias. Os registros financeiros legalmente obrigatórios têm retenção própria.

## Apple

Configurar APPLE_CLIENT_ID e APPLE_CLIENT_SECRET nos secrets das Edge Functions, além do provedor Authentication. JWT deve ser de fato um JWT Apple, não o valor protegido retornado pela API de configuração. Última verificação: client ID com.upplin.login e credenciais aceitas pela Apple em 30/10/2026. Expiração atual do JWT: 27/04/2027 06:59 UTC. Renovar antes de 27/03/2027 e atualizar tanto Authentication quanto Edge Functions. Não há lembrete de agenda criado automaticamente.

Contas Apple existentes sem refresh token armazenado precisam autenticar novamente com Apple. A função valida o token contra a Apple antes de guardá-lo; falha de revogação impede conclusão. Não foi realizado login nem revogação de uma conta Apple real durante os testes automatizados.

## Backups

O prazo público aprovado é de até 90 dias corridos. A consulta de infraestrutura atual não mostrou backups/PITR ativos. A retenção padrão documentada do Supabase (7 dias Pro, 14 Team, 30 Enterprise) é inferior a esse limite. Não criar exportações externas que ultrapassem 90 dias; registrar e remover cópias manuais também. Ao restaurar um backup, reaplicar os pedidos de exclusão posteriores à cópia antes de liberar acesso. Preservar apenas registros financeiros sujeitos à retenção legal. Revisar a política ao alterar o plano, PITR ou destino de backups.

## Apps e conta de revisão

No runtime Capacitor, o menu e as rotas de planos ficam indisponíveis. Na web os planos continuam acessíveis. A comissão por pedido permanece visível; não houve alteração dos percentuais ou do split. Ingressos presenciais continuam no Mercado Pago.

A conta de revisão é marcada por app_metadata exclusivamente no servidor. Possui evento privado de demonstração em 20/11/2026 às 19h de Brasília, ingresso gratuito com emissão real e ingresso pago apenas para visualizar o checkout. O servidor impede cobranças reais, conexão Mercado Pago e assinatura para essa conta. Não se usa CPF/CNPJ de outra pessoa. Credenciais entregues em arquivo privado, fora do Git. Se o revisor testar a exclusão, é necessário reprovisionar a conta antes da próxima revisão.

As alterações são de código compartilhado React e backend. Android, iOS, configurações Capacitor e IDs das lojas permanecem intactos. O responsável nativo deve integrar esse commit e validar em dispositivos/builds antes do envio às lojas; a verificação automatizada de navegação nativa usa simulação de runtime.
