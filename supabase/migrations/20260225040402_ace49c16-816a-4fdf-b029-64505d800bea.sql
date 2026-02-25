
-- Table for check-in collaborators
CREATE TABLE public.checkin_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES public.organizer_accounts(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

-- Unique constraint: one collaborator per event (or global if event_id is null)
CREATE UNIQUE INDEX idx_checkin_collab_unique ON public.checkin_collaborators (organizer_id, user_id, COALESCE(event_id, '00000000-0000-0000-0000-000000000000'));

-- Track who performed each check-in
ALTER TABLE public.tickets ADD COLUMN checked_in_by uuid;

-- Enable RLS
ALTER TABLE public.checkin_collaborators ENABLE ROW LEVEL SECURITY;

-- Organizer owners can fully manage collaborators
CREATE POLICY "Organizers can manage own collaborators"
ON public.checkin_collaborators
FOR ALL
USING (is_organizer_owner(auth.uid(), organizer_id))
WITH CHECK (is_organizer_owner(auth.uid(), organizer_id));

-- Collaborators can view their own records
CREATE POLICY "Collaborators can view own records"
ON public.checkin_collaborators
FOR SELECT
USING (auth.uid() = user_id AND status = 'active');

-- Admins full access
CREATE POLICY "Admins can manage all collaborators"
ON public.checkin_collaborators
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Allow collaborators to UPDATE tickets for check-in on events they're assigned to
CREATE POLICY "Collaborators can check-in tickets"
ON public.tickets
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.checkin_collaborators cc
    WHERE cc.user_id = auth.uid()
    AND cc.status = 'active'
    AND cc.organizer_id = (SELECT organizer_id FROM public.events WHERE id = tickets.event_id)
    AND (cc.event_id IS NULL OR cc.event_id = tickets.event_id)
  )
);

-- Allow collaborators to VIEW tickets for events they're assigned to
CREATE POLICY "Collaborators can view event tickets"
ON public.tickets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.checkin_collaborators cc
    WHERE cc.user_id = auth.uid()
    AND cc.status = 'active'
    AND cc.organizer_id = (SELECT organizer_id FROM public.events WHERE id = tickets.event_id)
    AND (cc.event_id IS NULL OR cc.event_id = tickets.event_id)
  )
);

-- Enable realtime for collaborators table
ALTER PUBLICATION supabase_realtime ADD TABLE public.checkin_collaborators;
