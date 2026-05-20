UPDATE public.subscription_plans
SET features = '["Tudo do Pro","Menor comissão 5%","Dashboard financeiro completo","Gerente de conta dedicado"]'::jsonb
WHERE id = 'enterprise';