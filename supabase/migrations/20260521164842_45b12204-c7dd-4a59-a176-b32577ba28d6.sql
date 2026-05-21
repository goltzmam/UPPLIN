ALTER VIEW public.profiles_public SET (security_invoker = false);
GRANT SELECT ON public.profiles_public TO anon, authenticated;