-- A comissão de cada organizador deixa de ser lida por quem não entrou no app.
-- get_organizer_commission(uuid) é SECURITY DEFINER e não confere quem chama; PUBLIC e anon podiam executar,
-- e com o id de um organizador qualquer pessoa via a comissão dele (pela tabela isso não aparece).
-- Quem continua chamando, conferido em 11/11/2026:
--   - a tela Configurações do painel do organizador (OrderCommissionDisclosure), que só abre com login;
--   - mp-create-preference e mp-process-payment, com a chave service_role;
--   - o gatilho snapshot_commission_on_event_create, SECURITY DEFINER do postgres (dono da função).
REVOKE EXECUTE ON FUNCTION public.get_organizer_commission(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_organizer_commission(uuid) TO authenticated, service_role;
