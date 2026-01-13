-- Create app_role enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'organizer');

-- Create order_status enum
CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'failed', 'cancelled', 'refunded');

-- Create ticket_status enum
CREATE TYPE public.ticket_status AS ENUM ('issued', 'used', 'cancelled');

-- Create event_status enum
CREATE TYPE public.event_status AS ENUM ('draft', 'published', 'cancelled');

-- Create ticket_type_status enum
CREATE TYPE public.ticket_type_status AS ENUM ('active', 'paused', 'sold_out');

-- Create payment_status enum
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- Create cpf_request_status enum
CREATE TYPE public.cpf_request_status AS ENUM ('pending', 'approved', 'rejected');

-- Create organizer_status enum
CREATE TYPE public.organizer_status AS ENUM ('active', 'suspended');

-- Create webhook_status enum
CREATE TYPE public.webhook_status AS ENUM ('received', 'processed', 'failed');

-- Create media_type enum
CREATE TYPE public.media_type AS ENUM ('image', 'video');

-- 1) Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  photo_url TEXT,
  cpf TEXT UNIQUE,
  cpf_locked BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2) User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 3) CPF change requests
CREATE TABLE public.cpf_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_cpf TEXT,
  requested_cpf TEXT NOT NULL,
  reason TEXT,
  status cpf_request_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4) Organizer accounts
CREATE TABLE public.organizer_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  status organizer_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5) Events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES public.organizer_accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  venue_name TEXT,
  address_text TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  cover_image_url TEXT,
  status event_status DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6) Event media
CREATE TABLE public.event_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  type media_type NOT NULL,
  url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7) Ticket types
CREATE TABLE public.ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_cents INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  quantity_total INTEGER NOT NULL,
  quantity_sold INTEGER DEFAULT 0,
  sale_start_at TIMESTAMPTZ,
  sale_end_at TIMESTAMPTZ,
  status ticket_type_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8) Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  status order_status DEFAULT 'pending',
  total_cents INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9) Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  ticket_type_id UUID NOT NULL REFERENCES public.ticket_types(id) ON DELETE CASCADE,
  unit_price_cents INTEGER NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10) Tickets
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  buyer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_type_id UUID NOT NULL REFERENCES public.ticket_types(id) ON DELETE CASCADE,
  status ticket_status DEFAULT 'issued',
  qr_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  issued_at TIMESTAMPTZ DEFAULT now(),
  used_at TIMESTAMPTZ
);

-- 11) Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  method TEXT,
  status payment_status DEFAULT 'pending',
  amount_cents INTEGER NOT NULL,
  provider_payment_id TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12) Webhook events
CREATE TABLE public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_type TEXT,
  provider_event_id TEXT UNIQUE,
  status webhook_status DEFAULT 'received',
  payload JSONB,
  error TEXT,
  received_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpf_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to check if user is organizer owner
CREATE OR REPLACE FUNCTION public.is_organizer_owner(_user_id UUID, _organizer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizer_accounts
    WHERE id = _organizer_id AND owner_user_id = _user_id
  )
$$;

-- Function to get user's organizer id
CREATE OR REPLACE FUNCTION public.get_user_organizer_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.organizer_accounts
  WHERE owner_user_id = _user_id
  LIMIT 1
$$;

-- Trigger to block CPF updates (except by admin)
CREATE OR REPLACE FUNCTION public.block_cpf_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.cpf IS NOT NULL AND OLD.cpf_locked = true AND NEW.cpf IS DISTINCT FROM OLD.cpf THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'CPF cannot be modified once set';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_cpf_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.block_cpf_update();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_cpf_change_requests_updated_at BEFORE UPDATE ON public.cpf_change_requests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_organizer_accounts_updated_at BEFORE UPDATE ON public.organizer_accounts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_ticket_types_updated_at BEFORE UPDATE ON public.ticket_types FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, photo_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Add default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- RLS POLICIES

-- Profiles: users can read/update their own
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- User roles: users can view their own
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- CPF change requests
CREATE POLICY "Users can view own cpf requests"
  ON public.cpf_change_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create cpf requests"
  ON public.cpf_change_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage cpf requests"
  ON public.cpf_change_requests FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Organizer accounts
CREATE POLICY "Owners can view own organizer account"
  ON public.organizer_accounts FOR SELECT
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Owners can update own organizer account"
  ON public.organizer_accounts FOR UPDATE
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can create organizer account"
  ON public.organizer_accounts FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Admins can manage all organizer accounts"
  ON public.organizer_accounts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Events: public can view published
CREATE POLICY "Anyone can view published events"
  ON public.events FOR SELECT
  USING (status = 'published');

CREATE POLICY "Organizers can manage own events"
  ON public.events FOR ALL
  USING (public.is_organizer_owner(auth.uid(), organizer_id));

CREATE POLICY "Admins can manage all events"
  ON public.events FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Event media: follows event visibility
CREATE POLICY "Anyone can view media of published events"
  ON public.event_media FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = event_id AND status = 'published'
  ));

CREATE POLICY "Organizers can manage own event media"
  ON public.event_media FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND public.is_organizer_owner(auth.uid(), e.organizer_id)
  ));

-- Ticket types: public can view active
CREATE POLICY "Anyone can view ticket types of published events"
  ON public.ticket_types FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = event_id AND status = 'published'
  ));

CREATE POLICY "Organizers can manage own ticket types"
  ON public.ticket_types FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND public.is_organizer_owner(auth.uid(), e.organizer_id)
  ));

-- Orders: buyers can view their own
CREATE POLICY "Buyers can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = buyer_user_id);

CREATE POLICY "Buyers can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = buyer_user_id);

CREATE POLICY "Organizers can view orders for their events"
  ON public.orders FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND public.is_organizer_owner(auth.uid(), e.organizer_id)
  ));

CREATE POLICY "Admins can manage all orders"
  ON public.orders FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Order items
CREATE POLICY "Users can view own order items"
  ON public.order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND o.buyer_user_id = auth.uid()
  ));

CREATE POLICY "Users can create order items"
  ON public.order_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND o.buyer_user_id = auth.uid()
  ));

CREATE POLICY "Organizers can view order items for their events"
  ON public.order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.events e ON e.id = o.event_id
    WHERE o.id = order_id AND public.is_organizer_owner(auth.uid(), e.organizer_id)
  ));

-- Tickets
CREATE POLICY "Buyers can view own tickets"
  ON public.tickets FOR SELECT
  USING (auth.uid() = buyer_user_id);

CREATE POLICY "Organizers can view tickets for their events"
  ON public.tickets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND public.is_organizer_owner(auth.uid(), e.organizer_id)
  ));

CREATE POLICY "Organizers can update tickets for their events"
  ON public.tickets FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND public.is_organizer_owner(auth.uid(), e.organizer_id)
  ));

CREATE POLICY "Admins can manage all tickets"
  ON public.tickets FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Payments: only admins
CREATE POLICY "Admins can manage payments"
  ON public.payments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND o.buyer_user_id = auth.uid()
  ));

-- Webhook events: only admins
CREATE POLICY "Admins can manage webhook events"
  ON public.webhook_events FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_start_at ON public.events(start_at);
CREATE INDEX idx_orders_buyer ON public.orders(buyer_user_id);
CREATE INDEX idx_orders_event ON public.orders(event_id);
CREATE INDEX idx_tickets_buyer ON public.tickets(buyer_user_id);
CREATE INDEX idx_tickets_event ON public.tickets(event_id);
CREATE INDEX idx_tickets_qr_token ON public.tickets(qr_token);