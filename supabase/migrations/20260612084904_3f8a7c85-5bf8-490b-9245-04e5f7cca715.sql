
-- has_any_role helper
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- profiles opt-in
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marketing_opt_in boolean NOT NULL DEFAULT true;

-- admin_invites
CREATE TABLE IF NOT EXISTS public.admin_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  roles app_role[] NOT NULL,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_invites_email ON public.admin_invites(lower(email));
CREATE INDEX IF NOT EXISTS idx_admin_invites_token ON public.admin_invites(token);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_invites TO authenticated;
GRANT ALL ON public.admin_invites TO service_role;
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage invites" ON public.admin_invites;
CREATE POLICY "Admins manage invites" ON public.admin_invites
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- accept_admin_invite
CREATE OR REPLACE FUNCTION public.accept_admin_invite(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_invite public.admin_invites%ROWTYPE;
  v_role app_role;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT * INTO v_invite FROM public.admin_invites WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invite_not_found'; END IF;
  IF v_invite.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'invite_already_used'; END IF;
  IF v_invite.expires_at < now() THEN RAISE EXCEPTION 'invite_expired'; END IF;
  IF lower(v_invite.email) <> lower(v_email) THEN RAISE EXCEPTION 'email_mismatch'; END IF;
  FOREACH v_role IN ARRAY v_invite.roles LOOP
    INSERT INTO public.user_roles(user_id, role) VALUES (v_uid, v_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
  UPDATE public.admin_invites SET accepted_at = now(), accepted_user_id = v_uid WHERE id = v_invite.id;
  RETURN jsonb_build_object('ok', true, 'roles', v_invite.roles);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.accept_admin_invite(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.accept_admin_invite(uuid) TO authenticated;

-- email_audiences
CREATE TABLE IF NOT EXISTS public.email_audiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  cached_count integer,
  cached_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_audiences TO authenticated;
GRANT ALL ON public.email_audiences TO service_role;
ALTER TABLE public.email_audiences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Marketing manages audiences" ON public.email_audiences;
CREATE POLICY "Marketing manages audiences" ON public.email_audiences
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','marketing']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','marketing']::app_role[]));

-- email_campaigns
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  preheader text,
  from_name text NOT NULL DEFAULT 'UPPLIN',
  reply_to text,
  html_body text NOT NULL,
  audience_id uuid REFERENCES public.email_audiences(id) ON DELETE SET NULL,
  audience_snapshot jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','failed','cancelled')),
  scheduled_at timestamptz,
  started_at timestamptz,
  sent_at timestamptz,
  total_recipients integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  delivered_count integer NOT NULL DEFAULT 0,
  opened_count integer NOT NULL DEFAULT 0,
  clicked_count integer NOT NULL DEFAULT 0,
  bounced_count integer NOT NULL DEFAULT 0,
  complained_count integer NOT NULL DEFAULT 0,
  unsubscribed_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON public.email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled ON public.email_campaigns(scheduled_at) WHERE status = 'scheduled';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaigns TO authenticated;
GRANT ALL ON public.email_campaigns TO service_role;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Marketing manages campaigns" ON public.email_campaigns;
CREATE POLICY "Marketing manages campaigns" ON public.email_campaigns
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','marketing']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','marketing']::app_role[]));

-- email_campaign_recipients
CREATE TABLE IF NOT EXISTS public.email_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','opened','clicked','bounced','complained','unsubscribed','failed')),
  resend_message_id text,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recipients_campaign ON public.email_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_recipients_message_id ON public.email_campaign_recipients(resend_message_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_recipients_campaign_email ON public.email_campaign_recipients(campaign_id, lower(email));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaign_recipients TO authenticated;
GRANT ALL ON public.email_campaign_recipients TO service_role;
ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Marketing reads recipients" ON public.email_campaign_recipients;
CREATE POLICY "Marketing reads recipients" ON public.email_campaign_recipients
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','marketing']::app_role[]));

-- email_marketing_unsubscribes
CREATE TABLE IF NOT EXISTS public.email_marketing_unsubscribes (
  email text PRIMARY KEY,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.email_marketing_unsubscribes TO authenticated;
GRANT ALL ON public.email_marketing_unsubscribes TO service_role;
ALTER TABLE public.email_marketing_unsubscribes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Marketing reads unsubscribes" ON public.email_marketing_unsubscribes;
CREATE POLICY "Marketing reads unsubscribes" ON public.email_marketing_unsubscribes
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','marketing']::app_role[]));

-- compute_audience
CREATE OR REPLACE FUNCTION public.compute_audience(p_filter jsonb)
RETURNS TABLE(user_id uuid, email text, full_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_audience text := COALESCE(p_filter->>'audience', 'participants');
  v_city text := NULLIF(p_filter->>'city', '');
  v_event_id uuid := NULLIF(p_filter->>'bought_event_id','')::uuid;
  v_inactive_days int := NULLIF(p_filter->>'inactive_days','')::int;
  v_followers_of uuid := NULLIF(p_filter->>'followers_of_organizer','')::uuid;
BEGIN
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin','marketing']::app_role[]) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;
  RETURN QUERY
  WITH base AS (
    SELECT p.id AS uid, lower(p.email) AS em, p.full_name AS fn,
      EXISTS(SELECT 1 FROM organizer_accounts oa WHERE oa.owner_user_id = p.id) AS is_organizer,
      p.last_seen_at, p.marketing_opt_in, p.city
    FROM profiles p
    WHERE p.email IS NOT NULL
  )
  SELECT b.uid, b.em, b.fn
  FROM base b
  WHERE b.marketing_opt_in = true
    AND NOT EXISTS (SELECT 1 FROM email_marketing_unsubscribes u WHERE u.email = b.em)
    AND NOT EXISTS (SELECT 1 FROM suppressed_emails s WHERE lower(s.email) = b.em)
    AND (v_audience = 'both'
         OR (v_audience = 'organizers' AND b.is_organizer)
         OR (v_audience = 'participants' AND NOT b.is_organizer))
    AND (v_city IS NULL OR lower(b.city) = lower(v_city))
    AND (v_event_id IS NULL OR EXISTS (SELECT 1 FROM orders o WHERE o.buyer_user_id = b.uid AND o.event_id = v_event_id AND o.status = 'paid'))
    AND (v_inactive_days IS NULL OR b.last_seen_at IS NULL OR b.last_seen_at < now() - (v_inactive_days || ' days')::interval)
    AND (v_followers_of IS NULL OR EXISTS (SELECT 1 FROM follows f WHERE f.user_id = b.uid AND f.organizer_id = v_followers_of));
END;
$$;
REVOKE EXECUTE ON FUNCTION public.compute_audience(jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.compute_audience(jsonb) TO authenticated;

-- increment counter
CREATE OR REPLACE FUNCTION public.increment_campaign_counter(p_campaign_id uuid, p_field text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_field NOT IN ('sent_count','delivered_count','opened_count','clicked_count','bounced_count','complained_count','unsubscribed_count','failed_count') THEN
    RAISE EXCEPTION 'invalid_field';
  END IF;
  EXECUTE format('UPDATE public.email_campaigns SET %I = %I + 1, updated_at = now() WHERE id = $1', p_field, p_field) USING p_campaign_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.increment_campaign_counter(uuid, text) FROM anon, public, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_campaign_counter(uuid, text) TO service_role;

-- conversations status + assigned_to
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','resolved'));
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);

CREATE OR REPLACE FUNCTION public.assign_conversation(p_conv_id uuid, p_status text DEFAULT NULL, p_take boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.has_any_role(v_uid, ARRAY['admin','support']::app_role[]) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;
  UPDATE public.conversations
    SET assigned_to = CASE WHEN p_take THEN v_uid ELSE assigned_to END,
        status = COALESCE(p_status, status),
        updated_at = now()
    WHERE id = p_conv_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.assign_conversation(uuid, text, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.assign_conversation(uuid, text, boolean) TO authenticated;

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_email_audiences_updated ON public.email_audiences;
CREATE TRIGGER trg_email_audiences_updated BEFORE UPDATE ON public.email_audiences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS trg_email_campaigns_updated ON public.email_campaigns;
CREATE TRIGGER trg_email_campaigns_updated BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS trg_email_recipients_updated ON public.email_campaign_recipients;
CREATE TRIGGER trg_email_recipients_updated BEFORE UPDATE ON public.email_campaign_recipients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
