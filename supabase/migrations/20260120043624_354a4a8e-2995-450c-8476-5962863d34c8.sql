-- Create comments table for events
CREATE TABLE public.event_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.event_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can view comments
CREATE POLICY "Anyone can view event comments"
ON public.event_comments
FOR SELECT
USING (true);

-- Authenticated users can add comments
CREATE POLICY "Users can add comments"
ON public.event_comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
ON public.event_comments
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
ON public.event_comments
FOR DELETE
USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_event_comments_event_id ON public.event_comments(event_id);
CREATE INDEX idx_event_comments_user_id ON public.event_comments(user_id);
CREATE INDEX idx_event_comments_parent_id ON public.event_comments(parent_id);

-- Trigger for updated_at using existing function
CREATE TRIGGER update_event_comments_updated_at
BEFORE UPDATE ON public.event_comments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();