
-- Add commission snapshot column to events table
ALTER TABLE public.events 
ADD COLUMN commission_percent_snapshot numeric NULL;

-- Populate existing events with current organizer commission
UPDATE public.events e
SET commission_percent_snapshot = (
  SELECT public.get_organizer_commission(e.organizer_id)
);

-- Create trigger to auto-snapshot commission on event creation
CREATE OR REPLACE FUNCTION public.snapshot_commission_on_event_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.commission_percent_snapshot IS NULL THEN
    NEW.commission_percent_snapshot := public.get_organizer_commission(NEW.organizer_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_snapshot_commission
BEFORE INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.snapshot_commission_on_event_create();
