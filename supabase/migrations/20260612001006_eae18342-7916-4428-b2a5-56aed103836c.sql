
-- 1) Drop the broad collaborator SELECT policy (collaborators don't need direct read)
DROP POLICY IF EXISTS "Collaborators can view event tickets" ON public.tickets;

-- 2) RPC: safe aggregate stats for collaborator scanner UI
CREATE OR REPLACE FUNCTION public.get_collaborator_scanner_stats(p_event_id uuid)
RETURNS TABLE(total bigint, checked_in bigint, pending bigint, my_checkins bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_organizer uuid;
  v_allowed boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT organizer_id INTO v_organizer FROM public.events WHERE id = p_event_id;
  IF v_organizer IS NULL THEN
    RAISE EXCEPTION 'event_not_found';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.checkin_collaborators cc
     WHERE cc.user_id = v_user
       AND cc.status = 'active'
       AND cc.organizer_id = v_organizer
       AND (cc.event_id IS NULL OR cc.event_id = p_event_id)
  ) OR public.is_organizer_owner(v_user, v_organizer)
    OR public.has_role(v_user, 'admin'::app_role)
  INTO v_allowed;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE status = 'used')::bigint AS checked_in,
    COUNT(*) FILTER (WHERE status = 'issued')::bigint AS pending,
    COUNT(*) FILTER (WHERE checked_in_by = v_user)::bigint AS my_checkins
  FROM public.tickets
  WHERE event_id = p_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_collaborator_scanner_stats(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_collaborator_scanner_stats(uuid) TO authenticated;

-- 3) Restrict realtime publication of tickets to exclude qr_token
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tickets'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.tickets';
  END IF;

  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets (id, order_id, event_id, buyer_user_id, ticket_type_id, status, issued_at, used_at, checked_in_by, item_index, ticket_number)';
END $$;
