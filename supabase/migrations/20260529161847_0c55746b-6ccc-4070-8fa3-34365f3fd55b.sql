
-- 1. Recreate views with security_invoker so RLS is enforced as the caller, not the view owner
ALTER VIEW public.organizer_accounts_feed SET (security_invoker = true);
ALTER VIEW public.organizer_accounts_public SET (security_invoker = true);
ALTER VIEW public.profiles_public SET (security_invoker = true);

-- 2. Pin search_path on the remaining SECURITY DEFINER functions that lack it
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
