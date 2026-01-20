-- Create follows table for user-organizer relationships
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organizer_id UUID REFERENCES public.organizer_accounts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, organizer_id)
);

-- Enable RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- RLS policies for follows
CREATE POLICY "Users can view their own follows"
ON public.follows
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can follow organizers"
ON public.follows
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow organizers"
ON public.follows
FOR DELETE
USING (auth.uid() = user_id);

-- Anyone can see follower counts (for public profiles)
CREATE POLICY "Anyone can count followers"
ON public.follows
FOR SELECT
USING (true);

-- Add featured/sponsored fields to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE;