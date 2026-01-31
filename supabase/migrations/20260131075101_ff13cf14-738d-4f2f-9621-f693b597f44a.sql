-- Create user_posts table for participant-generated content
CREATE TABLE public.user_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  content TEXT,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view posts"
  ON public.user_posts FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own posts"
  ON public.user_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON public.user_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON public.user_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_posts_updated_at
  BEFORE UPDATE ON public.user_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add indexes
CREATE INDEX idx_user_posts_user_id ON public.user_posts(user_id);
CREATE INDEX idx_user_posts_event_id ON public.user_posts(event_id);
CREATE INDEX idx_user_posts_created_at ON public.user_posts(created_at DESC);

-- Enable realtime for posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_posts;