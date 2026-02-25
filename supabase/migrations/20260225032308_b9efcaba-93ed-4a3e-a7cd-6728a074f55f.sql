
-- Subscription plans table
CREATE TABLE public.subscription_plans (
  id text PRIMARY KEY, -- 'free', 'pro', 'enterprise'
  name text NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  commission_percent numeric NOT NULL DEFAULT 10,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage plans"
  ON public.subscription_plans FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Insert default plans
INSERT INTO public.subscription_plans (id, name, price_cents, commission_percent, features, sort_order) VALUES
  ('free', 'Free', 0, 10, '["Até 3 eventos/mês", "Suporte por email", "Relatórios básicos"]'::jsonb, 0),
  ('pro', 'Pro', 4900, 7, '["Eventos ilimitados", "Suporte prioritário", "Relatórios avançados", "Cupons ilimitados", "Check-in rápido"]'::jsonb, 1),
  ('enterprise', 'Enterprise', 19900, 5, '["Eventos ilimitados", "Suporte dedicado", "Relatórios completos", "API de integração", "White-label", "Comissão reduzida"]'::jsonb, 2);

-- Organizer subscriptions table
CREATE TABLE public.organizer_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id uuid NOT NULL REFERENCES public.organizer_accounts(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'active', -- active, cancelled, past_due
  current_period_start timestamp with time zone NOT NULL DEFAULT now(),
  current_period_end timestamp with time zone,
  mp_subscription_id text, -- Mercado Pago subscription ID
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(organizer_id)
);

ALTER TABLE public.organizer_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own subscription"
  ON public.organizer_subscriptions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM organizer_accounts oa
    WHERE oa.id = organizer_subscriptions.organizer_id
    AND oa.owner_user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all subscriptions"
  ON public.organizer_subscriptions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_organizer_subscriptions_updated_at
  BEFORE UPDATE ON public.organizer_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to get organizer's commission rate based on subscription
CREATE OR REPLACE FUNCTION public.get_organizer_commission(p_organizer_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT sp.commission_percent
     FROM organizer_subscriptions os
     JOIN subscription_plans sp ON sp.id = os.plan_id
     WHERE os.organizer_id = p_organizer_id
     AND os.status = 'active'),
    (SELECT commission_percent FROM organizer_accounts WHERE id = p_organizer_id),
    10
  )
$$;
