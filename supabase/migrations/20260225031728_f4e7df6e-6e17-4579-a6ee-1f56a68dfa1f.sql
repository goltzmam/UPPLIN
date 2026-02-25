
-- Add commission_percent to organizer_accounts (default 10%)
ALTER TABLE public.organizer_accounts
ADD COLUMN IF NOT EXISTS commission_percent numeric NOT NULL DEFAULT 10;

-- Table to store organizer Mercado Pago credentials (via OAuth)
CREATE TABLE public.organizer_mp_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id uuid NOT NULL REFERENCES public.organizer_accounts(id) ON DELETE CASCADE,
  mp_user_id text NOT NULL,
  mp_access_token text NOT NULL,
  mp_refresh_token text,
  mp_public_key text,
  mp_email text,
  connected_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(organizer_id)
);

ALTER TABLE public.organizer_mp_accounts ENABLE ROW LEVEL SECURITY;

-- Only the organizer owner can see/manage their MP connection
CREATE POLICY "Owners can view own mp account"
  ON public.organizer_mp_accounts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM organizer_accounts oa
    WHERE oa.id = organizer_mp_accounts.organizer_id
    AND oa.owner_user_id = auth.uid()
  ));

CREATE POLICY "Owners can update own mp account"
  ON public.organizer_mp_accounts FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM organizer_accounts oa
    WHERE oa.id = organizer_mp_accounts.organizer_id
    AND oa.owner_user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all mp accounts"
  ON public.organizer_mp_accounts FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Add MP-specific fields to orders for tracking split
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS mp_preference_id text,
ADD COLUMN IF NOT EXISTS mp_payment_id text,
ADD COLUMN IF NOT EXISTS commission_cents integer DEFAULT 0;

-- Trigger for updated_at on organizer_mp_accounts
CREATE TRIGGER update_organizer_mp_accounts_updated_at
  BEFORE UPDATE ON public.organizer_mp_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
