-- Create user-posts bucket for user generated content
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-posts', 'user-posts', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing problematic policies for event-images
DROP POLICY IF EXISTS "Organizers can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Organizers can update event images" ON storage.objects;
DROP POLICY IF EXISTS "Organizers can delete event images" ON storage.objects;

-- Create correct policies for event-images based on organizer_accounts ownership
CREATE POLICY "Organizers can upload event images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-images' AND (
    -- User owns an organizer account
    EXISTS (
      SELECT 1 FROM public.organizer_accounts
      WHERE owner_user_id = auth.uid()
      AND status = 'active'
    )
    OR
    -- Or user is admin
    public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Organizers can update event images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'event-images' AND (
    EXISTS (
      SELECT 1 FROM public.organizer_accounts
      WHERE owner_user_id = auth.uid()
      AND status = 'active'
    )
    OR
    public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Organizers can delete event images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'event-images' AND (
    EXISTS (
      SELECT 1 FROM public.organizer_accounts
      WHERE owner_user_id = auth.uid()
      AND status = 'active'
    )
    OR
    public.has_role(auth.uid(), 'admin')
  )
);

-- User posts bucket policies
CREATE POLICY "User posts are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-posts');

CREATE POLICY "Users can upload their own posts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-posts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own posts"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user-posts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own posts"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-posts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);