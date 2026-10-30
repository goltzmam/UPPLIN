-- Validate backend tokens through PostgREST, including valid rotated service keys.
CREATE FUNCTION public.is_backend_service() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT auth.role()='service_role'; $$;
REVOKE ALL ON FUNCTION public.is_backend_service() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.is_backend_service() TO service_role;
