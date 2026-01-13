-- Create saved_events table for users to save/favorite events
CREATE TABLE public.saved_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- Enable RLS
ALTER TABLE public.saved_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for saved_events
CREATE POLICY "Users can view own saved events"
ON public.saved_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can save events"
ON public.saved_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave events"
ON public.saved_events FOR DELETE
USING (auth.uid() = user_id);

-- Create coupons table for organizers to manage discounts
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES public.organizer_accounts(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value integer NOT NULL CHECK (discount_value > 0),
  usage_limit integer,
  usage_count integer DEFAULT 0,
  min_purchase_cents integer DEFAULT 0,
  valid_from timestamp with time zone DEFAULT now(),
  valid_until timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(organizer_id, code)
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- RLS policies for coupons
CREATE POLICY "Anyone can view active coupons for published events"
ON public.coupons FOR SELECT
USING (
  is_active = true 
  AND (valid_from IS NULL OR valid_from <= now()) 
  AND (valid_until IS NULL OR valid_until > now())
  AND (usage_limit IS NULL OR usage_count < usage_limit)
);

CREATE POLICY "Organizers can manage own coupons"
ON public.coupons FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.organizer_accounts
    WHERE id = coupons.organizer_id AND owner_user_id = auth.uid()
  )
);

-- Add trigger for updated_at on coupons
CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create predefined categories if not using the category field effectively
-- The events table already has a category column, so we'll use that