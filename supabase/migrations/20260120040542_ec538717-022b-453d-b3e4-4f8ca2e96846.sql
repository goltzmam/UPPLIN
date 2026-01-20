-- Create trigger function to notify followers when a new event is published
CREATE OR REPLACE FUNCTION public.notify_followers_on_new_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follower RECORD;
  organizer_name TEXT;
BEGIN
  -- Only trigger when status changes to 'published'
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    -- Get organizer name
    SELECT display_name INTO organizer_name
    FROM organizer_accounts
    WHERE id = NEW.organizer_id;
    
    -- Insert notification for each follower
    FOR follower IN 
      SELECT user_id FROM follows WHERE organizer_id = NEW.organizer_id
    LOOP
      INSERT INTO notifications (user_id, title, body, type, data)
      VALUES (
        follower.user_id,
        'Novo evento!',
        organizer_name || ' publicou um novo evento: ' || NEW.title,
        'new_event',
        jsonb_build_object('event_id', NEW.id, 'organizer_id', NEW.organizer_id)
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on events table
DROP TRIGGER IF EXISTS notify_followers_on_event_publish ON events;
CREATE TRIGGER notify_followers_on_event_publish
AFTER INSERT OR UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION notify_followers_on_new_event();