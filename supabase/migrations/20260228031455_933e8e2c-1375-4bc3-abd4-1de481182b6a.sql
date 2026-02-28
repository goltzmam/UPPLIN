-- Allow authenticated users to view basic profile info for social features
-- This is needed for comments, reviews, RSVPs, chat, social feed to display user names/photos
CREATE POLICY "Authenticated users can view basic profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);