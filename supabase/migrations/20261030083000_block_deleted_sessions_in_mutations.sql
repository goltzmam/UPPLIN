-- Auth deletion does not instantly expire already-issued JWTs. Guard definer RPCs too.
CREATE FUNCTION public.ensure_active_account() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.role()='authenticated' AND (auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid())
   OR EXISTS(SELECT 1 FROM privacy.deletion_jobs WHERE user_id=auth.uid())) THEN
   RAISE EXCEPTION 'account_unavailable' USING ERRCODE='42501';
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.ensure_active_account() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ensure_active_account() TO authenticated,service_role;
DO $$ DECLARE f record;definition text;guarded text; BEGIN
 FOR f IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang
  WHERE p.pronamespace='public'::regnamespace AND p.prosecdef AND l.lanname='plpgsql'
   AND p.prorettype<>'trigger'::regtype AND p.proname<>'ensure_active_account'
   AND has_function_privilege('authenticated',p.oid,'EXECUTE')
 LOOP
  definition:=pg_get_functiondef(f.oid);
  IF position('PERFORM public.ensure_active_account();' IN definition)>0 THEN CONTINUE; END IF;
  guarded:=regexp_replace(definition,chr(10)||'([ '||chr(9)||']*)BEGIN\M',chr(10)||'\1BEGIN'||chr(10)||'\1  PERFORM public.ensure_active_account();','i');
  IF guarded=definition THEN
   guarded:=regexp_replace(definition,'(\$function\$[ '||chr(9)||']*)BEGIN\M','\1BEGIN'||chr(10)||'  PERFORM public.ensure_active_account();','i');
  END IF;
  IF guarded=definition THEN RAISE EXCEPTION 'Unable to apply deleted-session guard to %',f.proname; END IF;
  EXECUTE guarded;
 END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
