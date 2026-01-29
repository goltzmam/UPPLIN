-- Create RSVP/Going table for "Quem vai" feature
CREATE TABLE public.event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'interested', 'not_going')),
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

-- Policies: Anyone can see public RSVPs
CREATE POLICY "Anyone can view public RSVPs"
  ON public.event_rsvps FOR SELECT
  USING (is_public = true);

-- Users can view their own RSVPs (even private)
CREATE POLICY "Users can view own RSVPs"
  ON public.event_rsvps FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own RSVPs
CREATE POLICY "Users can create own RSVPs"
  ON public.event_rsvps FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own RSVPs
CREATE POLICY "Users can update own RSVPs"
  ON public.event_rsvps FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Users can delete their own RSVPs
CREATE POLICY "Users can delete own RSVPs"
  ON public.event_rsvps FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create social_notifications table for "Fulano vai no evento X"
CREATE TABLE public.social_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('rsvp', 'ticket_purchase', 'follow', 'comment', 'like')),
  message TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see notifications targeted at them
CREATE POLICY "Users can view own social notifications"
  ON public.social_notifications FOR SELECT
  TO authenticated
  USING (target_user_id = auth.uid());

-- System can insert notifications (via triggers/edge functions)
CREATE POLICY "Authenticated users can create notifications"
  ON public.social_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can mark notifications as read
CREATE POLICY "Users can update own notifications"
  ON public.social_notifications FOR UPDATE
  TO authenticated
  USING (target_user_id = auth.uid());

-- Enable realtime for RSVPs
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_rsvps;

-- Trigger to update updated_at
CREATE TRIGGER update_event_rsvps_updated_at
  BEFORE UPDATE ON public.event_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to notify followers when user RSVPs
CREATE OR REPLACE FUNCTION public.notify_followers_on_rsvp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  follower RECORD;
  actor_name TEXT;
  event_title TEXT;
BEGIN
  -- Only trigger for public "going" RSVPs
  IF NEW.status = 'going' AND NEW.is_public = true THEN
    -- Get actor name
    SELECT full_name INTO actor_name
    FROM profiles
    WHERE id = NEW.user_id;
    
    -- Get event title
    SELECT title INTO event_title
    FROM events
    WHERE id = NEW.event_id;
    
    -- Insert social notification for each follower of the user
    -- (For now, we'll use the follows table - users who follow organizers the actor owns)
    -- This is a simplified version - in production you'd have user-to-user follows
    INSERT INTO social_notifications (actor_user_id, target_user_id, event_id, type, message)
    SELECT 
      NEW.user_id,
      f.user_id,
      NEW.event_id,
      'rsvp',
      COALESCE(actor_name, 'Alguém') || ' vai em ' || COALESCE(event_title, 'um evento') || ' 👀'
    FROM follows f
    JOIN organizer_accounts oa ON oa.id = f.organizer_id
    WHERE oa.owner_user_id = NEW.user_id
    AND f.user_id != NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for RSVP notifications
CREATE TRIGGER notify_on_rsvp
  AFTER INSERT ON public.event_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_followers_on_rsvp();