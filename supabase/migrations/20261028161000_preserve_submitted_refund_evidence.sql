-- Unsubmitted uploads may be cleaned up; submitted evidence stays available for review.
ALTER POLICY "Buyer removes own refund evidence" ON storage.objects
USING(bucket_id='refund-attachments' AND (storage.foldername(name))[1]=auth.uid()::text
  AND NOT EXISTS(SELECT 1 FROM public.refund_requests r
    WHERE r.requester_user_id=auth.uid() AND r.attachments ? name));
