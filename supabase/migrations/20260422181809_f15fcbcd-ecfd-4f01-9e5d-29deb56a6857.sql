CREATE OR REPLACE VIEW public.organizer_accounts_public AS
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

DROP POLICY IF EXISTS "Anyone can view active organizers" ON public.organizer_accounts;
DROP POLICY IF EXISTS "Authenticated users can view active organizers" ON public.organizer_accounts;
DROP POLICY IF EXISTS "Users can view active organizers" ON public.organizer_accounts;
DROP POLICY IF EXISTS "Public can view active organizers" ON public.organizer_accounts;
DROP POLICY IF EXISTS "Owners and admins can view organizer accounts" ON public.organizer_accounts;

CREATE POLICY "Owners and admins can view organizer accounts"
ON public.organizer_accounts
FOR SELECT
TO authenticated
USING (
  owner_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- Application Realtime changes are controlled by public-table RLS.
