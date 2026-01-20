-- Create event_reviews table for star ratings
CREATE TABLE public.event_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- Enable RLS
ALTER TABLE public.event_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view reviews
CREATE POLICY "Anyone can view event reviews"
ON public.event_reviews
FOR SELECT
USING (true);

-- Users can add reviews (only if they have a ticket for the event)
CREATE POLICY "Users can add reviews if they have ticket"
ON public.event_reviews
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.event_id = event_reviews.event_id
    AND t.buyer_user_id = auth.uid()
    AND t.status = 'used'
  )
);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
ON public.event_reviews
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
ON public.event_reviews
FOR DELETE
USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_event_reviews_event_id ON public.event_reviews(event_id);
CREATE INDEX idx_event_reviews_user_id ON public.event_reviews(user_id);
CREATE INDEX idx_event_reviews_rating ON public.event_reviews(rating);

-- Trigger for updated_at
CREATE TRIGGER update_event_reviews_updated_at
BEFORE UPDATE ON public.event_reviews
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();