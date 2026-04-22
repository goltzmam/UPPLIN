DROP VIEW IF EXISTS public.organizer_accounts_public;

CREATE VIEW public.organizer_accounts_public
WITH (security_invoker = on) AS
SELECT
  id,
  display_name,
  slug,
  description,
  logo_url,
  social_instagram,
  social_facebook,
  social_website,
  status,
  city,
  state,
  created_at,
  updated_at
FROM public.organizer_accounts
WHERE status = 'active';

GRANT SELECT ON public.organizer_accounts_public TO anon, authenticated;

DROP VIEW IF EXISTS public.organizer_accounts_feed;

CREATE VIEW public.organizer_accounts_feed
WITH (security_invoker = on) AS
SELECT
  id,
  owner_user_id,
  status
FROM public.organizer_accounts
WHERE status = 'active';

GRANT SELECT ON public.organizer_accounts_feed TO authenticated;