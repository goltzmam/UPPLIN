REVOKE EXECUTE ON FUNCTION public.check_in_ticket(text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_in_ticket(text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.check_in_ticket(text, uuid) TO authenticated;