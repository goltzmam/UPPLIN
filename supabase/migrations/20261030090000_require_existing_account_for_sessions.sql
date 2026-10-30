CREATE OR REPLACE FUNCTION public.account_is_active() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid())
   AND NOT EXISTS(SELECT 1 FROM privacy.deletion_jobs WHERE user_id=auth.uid());
$$;
