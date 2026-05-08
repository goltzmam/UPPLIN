ALTER TABLE public.social_notifications DROP CONSTRAINT IF EXISTS social_notifications_type_check;
ALTER TABLE public.social_notifications ADD CONSTRAINT social_notifications_type_check
  CHECK (type = ANY (ARRAY['rsvp'::text, 'ticket_purchase'::text, 'follow'::text, 'comment'::text, 'like'::text, 'new_post'::text, 'mention'::text]));