-- Drop the restrictive self-only policy
DROP POLICY IF EXISTS "Users can view own full profile" ON public.profiles;

-- Allow authenticated users to see all profiles but only safe fields via the view
-- We need a policy that allows SELECT for authenticated users
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- The profiles_public view (security_invoker) restricts WHICH columns are exposed
-- Social features should query profiles_public instead of profiles directly