-- OAuth credentials are backend-only. The application reads connection status
-- through mp-connect, which does not return access/refresh tokens.
REVOKE ALL ON public.organizer_mp_accounts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.organizer_mp_accounts TO service_role;
