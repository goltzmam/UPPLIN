-- Fix the overly permissive INSERT policy on social_notifications
-- Replace WITH CHECK (true) with a proper check that only allows creating notifications for others
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.social_notifications;

-- Only allow creating notifications where actor is the current user
CREATE POLICY "Users can create notifications as actor"
  ON public.social_notifications FOR INSERT
  TO authenticated
  WITH CHECK (actor_user_id = auth.uid());