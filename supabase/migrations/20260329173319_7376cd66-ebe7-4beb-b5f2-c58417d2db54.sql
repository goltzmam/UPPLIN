-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Organizers can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Organizers can update event images" ON storage.objects;
DROP POLICY IF EXISTS "Organizers can delete event images" ON storage.objects;

-- Create scoped policies: organizers can only manage files in their own folder
-- Path structure: {organizer_id}/{event_id}/{filename} or organizers/{organizer_id}-logo.{ext}
CREATE POLICY "Organizers can upload own event images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'event-images' AND (
    -- Own organizer folder (event media)
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.organizer_accounts
      WHERE owner_user_id = auth.uid() AND status = 'active'
    )
    OR
    -- Organizer logos folder
    (storage.foldername(name))[1] = 'organizers'
    AND name LIKE '%' || (
      SELECT id::text FROM public.organizer_accounts
      WHERE owner_user_id = auth.uid() AND status = 'active'
      LIMIT 1
    ) || '%'
    OR
    -- Admins can upload anywhere
    public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Organizers can update own event images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'event-images' AND (
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.organizer_accounts
      WHERE owner_user_id = auth.uid() AND status = 'active'
    )
    OR
    (storage.foldername(name))[1] = 'organizers'
    AND name LIKE '%' || (
      SELECT id::text FROM public.organizer_accounts
      WHERE owner_user_id = auth.uid() AND status = 'active'
      LIMIT 1
    ) || '%'
    OR
    public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Organizers can delete own event images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'event-images' AND (
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.organizer_accounts
      WHERE owner_user_id = auth.uid() AND status = 'active'
    )
    OR
    (storage.foldername(name))[1] = 'organizers'
    AND name LIKE '%' || (
      SELECT id::text FROM public.organizer_accounts
      WHERE owner_user_id = auth.uid() AND status = 'active'
      LIMIT 1
    ) || '%'
    OR
    public.has_role(auth.uid(), 'admin')
  )
);