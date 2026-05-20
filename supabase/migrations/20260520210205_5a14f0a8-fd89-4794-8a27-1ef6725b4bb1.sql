
UPDATE public.subscription_plans
SET name = 'Standart',
    price_cents = 0,
    commission_percent = 10,
    features = '["Eventos ilimitados","Check-in QR Code","Dashboard básico","Cupons de desconto","Suporte por chat"]'::jsonb,
    sort_order = 0,
    is_active = true
WHERE id = 'free';

UPDATE public.subscription_plans
SET name = 'Pro',
    price_cents = 4900,
    commission_percent = 8.49,
    features = '["Tudo do Standart","Comissão reduzida (8,49%)","Relatórios avançados","Suporte prioritário","Cupons ilimitados","Exportação de dados"]'::jsonb,
    sort_order = 1,
    is_active = true
WHERE id = 'pro';

UPDATE public.subscription_plans
SET name = 'Enterprise',
    price_cents = 19900,
    commission_percent = 6.99,
    features = '["Tudo do Pro","Menor comissão (6,99%)","Dashboard financeiro completo","Gerente de conta dedicado","Suporte 24/7"]'::jsonb,
    sort_order = 2,
    is_active = true
WHERE id = 'enterprise';
