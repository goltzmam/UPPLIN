-- Create event_likes table for persistent likes
CREATE TABLE public.event_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- Enable RLS
ALTER TABLE public.event_likes ENABLE ROW LEVEL SECURITY;

-- Users can view all likes (for counting)
CREATE POLICY "Anyone can view event likes"
ON public.event_likes
FOR SELECT
USING (true);

-- Users can like events
CREATE POLICY "Users can like events"
ON public.event_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can unlike events
CREATE POLICY "Users can unlike events"
ON public.event_likes
FOR DELETE
USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_event_likes_event_id ON public.event_likes(event_id);
CREATE INDEX idx_event_likes_user_id ON public.event_likes(user_id);

-- Add index on saved_events for performance
CREATE INDEX IF NOT EXISTS idx_saved_events_event_id ON public.saved_events(event_id);
CREATE INDEX IF NOT EXISTS idx_saved_events_user_id ON public.saved_events(user_id);