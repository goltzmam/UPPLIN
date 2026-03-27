-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view basic profiles" ON public.profiles;

-- Create a secure view that only exposes safe fields
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT id, full_name, photo_url, cover_photo_url
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;

-- Create a restrictive policy: users can only SELECT their own full profile
CREATE POLICY "Users can view own full profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);