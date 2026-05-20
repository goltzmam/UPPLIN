
ALTER TABLE public.organizer_accounts
  ADD COLUMN IF NOT EXISTS chat_available boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.open_event_conversation(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner_id uuid;
  v_chat_available boolean;
  v_event_title text;
  v_conv_id uuid;
  v_p1 uuid;
  v_p2 uuid;
  v_has_ticket boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT oa.owner_user_id, oa.chat_available, e.title
    INTO v_owner_id, v_chat_available, v_event_title
  FROM public.events e
  JOIN public.organizer_accounts oa ON oa.id = e.organizer_id
  WHERE e.id = p_event_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'organizer_not_found';
  END IF;

  -- Caller is the organizer himself: just return null, frontend redirects
  IF v_owner_id = v_uid THEN
    RETURN jsonb_build_object('self', true);
  END IF;

  -- Must have a ticket OR a paid order for this event
  SELECT EXISTS (
    SELECT 1 FROM public.tickets
    WHERE event_id = p_event_id AND buyer_user_id = v_uid
    UNION ALL
    SELECT 1 FROM public.orders
    WHERE event_id = p_event_id AND buyer_user_id = v_uid AND status = 'paid'
  ) INTO v_has_ticket;

  IF NOT v_has_ticket THEN
    RAISE EXCEPTION 'no_ticket';
  END IF;

  IF v_chat_available = false THEN
    RAISE EXCEPTION 'organizer_offline';
  END IF;

  v_p1 := LEAST(v_uid, v_owner_id);
  v_p2 := GREATEST(v_uid, v_owner_id);

  SELECT id INTO v_conv_id
  FROM public.conversations
  WHERE type = 'user_organizer'
    AND event_id = p_event_id
    AND participant_1_id = v_p1
    AND participant_2_id = v_p2
  LIMIT 1;

  IF v_conv_id IS NULL THEN
    INSERT INTO public.conversations (type, event_id, participant_1_id, participant_2_id, subject)
    VALUES ('user_organizer', p_event_id, v_p1, v_p2, v_event_title)
    RETURNING id INTO v_conv_id;
  END IF;

  RETURN jsonb_build_object('conversation_id', v_conv_id, 'chat_available', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.open_event_conversation(uuid) TO authenticated;

-- Public read of minimal organizer info via SECURITY DEFINER func (status + name)
CREATE OR REPLACE FUNCTION public.get_event_organizer_status(p_event_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'organizer_id', oa.id,
    'display_name', oa.display_name,
    'chat_available', oa.chat_available
  )
  FROM public.events e
  JOIN public.organizer_accounts oa ON oa.id = e.organizer_id
  WHERE e.id = p_event_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_organizer_status(uuid) TO authenticated, anon;
