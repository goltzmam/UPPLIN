
-- Revoke anon, grant authenticated on user-callable functions
REVOKE EXECUTE ON FUNCTION public.request_refund(uuid,text,jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.decide_refund(uuid,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_force_refund(uuid,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_reject_refund(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_refund(uuid,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_refund(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_force_refund(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_refund(uuid,text) TO authenticated;

-- Internal helpers / webhook-only → service_role only
REVOKE EXECUTE ON FUNCTION public.mark_refund_pending(uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_refund_completed(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_refund_failed(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._refund_log(uuid,public.refund_status,public.refund_status,uuid,text,text,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._refund_notify(uuid,text,text,uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.find_refund_by_payment(text) FROM PUBLIC, anon, authenticated;

-- Storage policies for refund-attachments (private bucket)
-- Path convention: <user_id>/<order_id>/<filename>

CREATE POLICY "Buyer can upload own refund attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'refund-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Buyer can read own refund attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'refund-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Organizer can read attachments of their refunds"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'refund-attachments'
    AND EXISTS (
      SELECT 1 FROM public.refund_requests rr
      WHERE (storage.foldername(name))[2] = rr.order_id::text
        AND public.is_organizer_owner(auth.uid(), rr.organizer_id)
    )
  );

CREATE POLICY "Admin can read all refund attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'refund-attachments'
    AND public.has_role(auth.uid(), 'admin')
  );
