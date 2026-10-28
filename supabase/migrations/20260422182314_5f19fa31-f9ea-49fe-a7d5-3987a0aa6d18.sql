DROP POLICY IF EXISTS "Owners can view own organizer account" ON public.organizer_accounts;

DROP POLICY IF EXISTS "Owners can update own mp account" ON public.organizer_mp_accounts;
CREATE POLICY "Owners can update own mp account"
ON public.organizer_mp_accounts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organizer_accounts oa
    WHERE oa.id = organizer_mp_accounts.organizer_id
      AND oa.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organizer_accounts oa
    WHERE oa.id = organizer_mp_accounts.organizer_id
      AND oa.owner_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Anyone can view public RSVPs" ON public.event_rsvps;
CREATE POLICY "Authenticated users can view public RSVPs"
ON public.event_rsvps
FOR SELECT
TO authenticated
USING (is_public = true);

DROP POLICY IF EXISTS "Anyone can view event likes" ON public.event_likes;
CREATE POLICY "Authenticated users can view event likes"
ON public.event_likes
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can view active coupons for checkout" ON public.coupons;
CREATE POLICY "Organizers can view own coupons"
ON public.coupons
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organizer_accounts oa
    WHERE oa.id = coupons.organizer_id
      AND oa.owner_user_id = auth.uid()
  )
);

-- Chat presence uses public.chat_presence with participant RLS.
