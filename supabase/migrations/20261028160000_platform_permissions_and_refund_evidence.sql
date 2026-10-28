-- Clients read their orders; prices and payment state are written by backend flows.
REVOKE INSERT,UPDATE,DELETE ON public.orders,public.order_items FROM PUBLIC,anon,authenticated;

-- Queue administration belongs to the backend, not app clients.
DO $$ DECLARE fn regprocedure; BEGIN
  FOR fn IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('enqueue_email','read_email_batch','delete_email','move_to_dlq')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',fn);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.protect_organizer_management_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.role()='authenticated' AND NOT public.has_role(auth.uid(),'admin') THEN
    IF TG_OP='INSERT' THEN
      IF NEW.owner_user_id IS DISTINCT FROM auth.uid() OR NEW.commission_percent IS DISTINCT FROM 10
        OR NEW.status IS DISTINCT FROM 'active'::public.organizer_status THEN
        RAISE EXCEPTION 'Managed organizer fields cannot be assigned by the client' USING ERRCODE='42501'; END IF;
    ELSIF NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id OR NEW.id IS DISTINCT FROM OLD.id
      OR NEW.commission_percent IS DISTINCT FROM OLD.commission_percent OR NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Managed organizer fields cannot be changed by the client' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_organizer_management_fields() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER protect_organizer_management_fields BEFORE INSERT OR UPDATE ON public.organizer_accounts
  FOR EACH ROW EXECUTE FUNCTION public.protect_organizer_management_fields();

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('refund-attachments','refund-attachments',false,5242880,ARRAY['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif','application/pdf'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

CREATE POLICY "Buyer uploads refund evidence" ON storage.objects FOR INSERT TO authenticated
WITH CHECK(bucket_id='refund-attachments' AND (storage.foldername(name))[1]=auth.uid()::text
  AND EXISTS(SELECT 1 FROM public.orders o WHERE o.id::text=(storage.foldername(name))[2]
    AND o.buyer_user_id=auth.uid() AND o.status='paid'));
CREATE POLICY "Refund parties read evidence" ON storage.objects FOR SELECT TO authenticated
USING(bucket_id='refund-attachments' AND (
  public.has_role(auth.uid(),'admin') OR EXISTS(
    SELECT 1 FROM public.orders o JOIN public.events e ON e.id=o.event_id
    JOIN public.organizer_accounts a ON a.id=e.organizer_id
    WHERE o.id::text=(storage.foldername(name))[2] AND o.buyer_user_id::text=(storage.foldername(name))[1]
      AND (o.buyer_user_id=auth.uid() OR a.owner_user_id=auth.uid())
  )));
CREATE POLICY "Buyer removes own refund evidence" ON storage.objects FOR DELETE TO authenticated
USING(bucket_id='refund-attachments' AND (storage.foldername(name))[1]=auth.uid()::text);
