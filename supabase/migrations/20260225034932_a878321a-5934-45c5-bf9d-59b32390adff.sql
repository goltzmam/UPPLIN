
-- Create subscription invoices table for billing history
CREATE TABLE public.subscription_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id uuid NOT NULL REFERENCES public.organizer_accounts(id),
  subscription_id uuid NOT NULL REFERENCES public.organizer_subscriptions(id),
  plan_id text NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  mp_payment_id text,
  paid_at timestamp with time zone,
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;

-- Owners can view their own invoices
CREATE POLICY "Owners can view own invoices"
  ON public.subscription_invoices
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM organizer_accounts oa
    WHERE oa.id = subscription_invoices.organizer_id
    AND oa.owner_user_id = auth.uid()
  ));

-- Admins can manage all invoices
CREATE POLICY "Admins can manage all invoices"
  ON public.subscription_invoices
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_subscription_invoices_updated_at
  BEFORE UPDATE ON public.subscription_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
