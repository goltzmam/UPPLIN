-- Admin passwords are managed through privileged operations, not public recovery.
CREATE OR REPLACE FUNCTION public.can_request_password_reset(p_email text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM auth.users u
    JOIN public.user_roles r ON r.user_id=u.id
    WHERE lower(u.email)=lower(trim(p_email)) AND r.role='admin'::public.app_role
  );
$$;
REVOKE ALL ON FUNCTION public.can_request_password_reset(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_request_password_reset(text) TO service_role;
