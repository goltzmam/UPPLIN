DROP INDEX IF EXISTS public.idx_payments_provider_payment_unique;
CREATE UNIQUE INDEX idx_payments_provider_payment_unique
ON public.payments(provider, provider_payment_id);