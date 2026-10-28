-- Restrict coupon code exposure to signed-in users only
DROP POLICY IF EXISTS "Anyone can view active coupons for published events" ON public.coupons;

CREATE POLICY "Authenticated users can view active coupons for checkout"
ON public.coupons
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (valid_from IS NULL OR valid_from <= now())
  AND (valid_until IS NULL OR valid_until > now())
  AND (usage_limit IS NULL OR usage_count < usage_limit)
);

-- Restrict follow relationship enumeration
DROP POLICY IF EXISTS "Users can view follows" ON public.follows;

CREATE POLICY "Users can view relevant follows"
ON public.follows
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.organizer_accounts oa
    WHERE oa.id = follows.organizer_id
      AND oa.owner_user_id = auth.uid()
  )
);

-- Postgres Changes is authorized by RLS on the application tables.
-- Do not alter the platform-owned realtime.messages table.
