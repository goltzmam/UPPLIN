-- Recreate view with SECURITY INVOKER (default, resolves linter warning)
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public WITH (security_invoker = true) AS
SELECT id, full_name, photo_url, cover_photo_url
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;