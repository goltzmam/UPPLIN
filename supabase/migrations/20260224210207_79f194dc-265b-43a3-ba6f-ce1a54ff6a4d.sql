
-- Add new values to event_status enum
ALTER TYPE public.event_status ADD VALUE IF NOT EXISTS 'paused';
ALTER TYPE public.event_status ADD VALUE IF NOT EXISTS 'pending_review';

-- Update RLS: allow anyone to see pending_review events? No - only admins and organizer owners
-- The existing policies already cover this:
-- "Admins can manage all events" covers admin access
-- "Organizers can manage own events" covers organizer access
-- "Anyone can view published events" correctly excludes pending_review and paused
-- So no RLS changes needed!
