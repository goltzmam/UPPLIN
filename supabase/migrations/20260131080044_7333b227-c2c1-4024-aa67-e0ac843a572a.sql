-- Create user_post_likes table
CREATE TABLE public.user_post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.user_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create user_post_comments table
CREATE TABLE public.user_post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.user_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.user_post_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_post_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_post_likes
CREATE POLICY "Anyone can view post likes" ON public.user_post_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like posts" ON public.user_post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts" ON public.user_post_likes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for user_post_comments
CREATE POLICY "Anyone can view post comments" ON public.user_post_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can add comments" ON public.user_post_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON public.user_post_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.user_post_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_user_post_likes_post_id ON public.user_post_likes(post_id);
CREATE INDEX idx_user_post_likes_user_id ON public.user_post_likes(user_id);
CREATE INDEX idx_user_post_comments_post_id ON public.user_post_comments(post_id);
CREATE INDEX idx_user_post_comments_user_id ON public.user_post_comments(user_id);

-- Enable realtime for social notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_notifications;

-- Function to notify followers when user creates a post
CREATE OR REPLACE FUNCTION public.notify_followers_on_new_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  follower RECORD;
  author_name TEXT;
BEGIN
  -- Get author name
  SELECT full_name INTO author_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- For now, notify users who follow organizers owned by the post author
  -- In a full implementation, you'd have user-to-user follows
  FOR follower IN 
    SELECT DISTINCT f.user_id 
    FROM follows f
    JOIN organizer_accounts oa ON oa.id = f.organizer_id
    WHERE oa.owner_user_id = NEW.user_id
    AND f.user_id != NEW.user_id
  LOOP
    INSERT INTO social_notifications (actor_user_id, target_user_id, type, message)
    VALUES (
      NEW.user_id,
      follower.user_id,
      'new_post',
      COALESCE(author_name, 'Alguém') || ' fez uma nova publicação 📸'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger for new posts
CREATE TRIGGER on_new_user_post
  AFTER INSERT ON public.user_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_followers_on_new_post();

-- Add updated_at trigger for comments
CREATE TRIGGER update_user_post_comments_updated_at
  BEFORE UPDATE ON public.user_post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();