CREATE OR REPLACE FUNCTION public.check_in_ticket(
  p_ticket_code text,
  p_event_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code text := btrim(coalesce(p_ticket_code, ''));
  v_payload jsonb;
  v_ticket_id uuid;
  v_token text;
  v_ticket public.tickets%ROWTYPE;
  v_event_title text;
  v_ticket_type_name text;
  v_buyer_name text;
  v_buyer_email text;
  v_buyer_photo_url text;
  v_is_owner boolean := false;
  v_is_collaborator boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_code = '' THEN
    RAISE EXCEPTION 'empty_ticket_code';
  END IF;

  BEGIN
    v_payload := v_code::jsonb;
    v_ticket_id := NULLIF(v_payload->>'ticketId', '')::uuid;
    v_token := NULLIF(coalesce(v_payload->>'token', v_payload->>'qr_token'), '');
  EXCEPTION WHEN OTHERS THEN
    v_payload := NULL;
  END;

  IF v_ticket_id IS NULL THEN
    BEGIN
      v_ticket_id := v_code::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_ticket_id := NULL;
    END;
  END IF;

  IF v_ticket_id IS NOT NULL THEN
    SELECT * INTO v_ticket
    FROM public.tickets
    WHERE id = v_ticket_id;
  END IF;

  IF NOT FOUND AND v_token IS NOT NULL THEN
    SELECT * INTO v_ticket
    FROM public.tickets
    WHERE qr_token = v_token;
  END IF;

  IF NOT FOUND AND v_payload IS NULL THEN
    SELECT * INTO v_ticket
    FROM public.tickets
    WHERE qr_token = v_code;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ticket_not_found';
  END IF;

  IF p_event_id IS NOT NULL AND v_ticket.event_id <> p_event_id THEN
    RAISE EXCEPTION 'wrong_event';
  END IF;

  IF v_token IS NOT NULL AND v_ticket.qr_token IS NOT NULL AND v_token <> v_ticket.qr_token THEN
    RAISE EXCEPTION 'invalid_qr_token';
  END IF;

  SELECT public.is_organizer_owner(v_uid, e.organizer_id)
  INTO v_is_owner
  FROM public.events e
  WHERE e.id = v_ticket.event_id;

  SELECT EXISTS (
    SELECT 1
    FROM public.checkin_collaborators cc
    JOIN public.events e ON e.organizer_id = cc.organizer_id
    WHERE e.id = v_ticket.event_id
      AND cc.user_id = v_uid
      AND cc.status = 'active'
      AND (cc.event_id IS NULL OR cc.event_id = v_ticket.event_id)
  ) INTO v_is_collaborator;

  IF NOT (coalesce(v_is_owner, false) OR coalesce(v_is_collaborator, false) OR public.has_role(v_uid, 'admin')) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  IF v_ticket.status = 'used' THEN
    RAISE EXCEPTION 'already_used';
  END IF;

  IF v_ticket.status = 'cancelled' THEN
    RAISE EXCEPTION 'ticket_cancelled';
  END IF;

  IF v_ticket.status <> 'issued' THEN
    RAISE EXCEPTION 'invalid_ticket_status';
  END IF;

  UPDATE public.tickets
  SET status = 'used',
      used_at = now(),
      checked_in_by = v_uid
  WHERE id = v_ticket.id
  RETURNING * INTO v_ticket;

  SELECT e.title, tt.name, p.full_name, p.email, p.photo_url
  INTO v_event_title, v_ticket_type_name, v_buyer_name, v_buyer_email, v_buyer_photo_url
  FROM public.tickets t
  JOIN public.events e ON e.id = t.event_id
  JOIN public.ticket_types tt ON tt.id = t.ticket_type_id
  LEFT JOIN public.profiles p ON p.id = t.buyer_user_id
  WHERE t.id = v_ticket.id;

  RETURN jsonb_build_object(
    'id', v_ticket.id,
    'event_id', v_ticket.event_id,
    'order_id', v_ticket.order_id,
    'buyer_user_id', v_ticket.buyer_user_id,
    'ticket_type_id', v_ticket.ticket_type_id,
    'status', v_ticket.status,
    'qr_token', v_ticket.qr_token,
    'issued_at', v_ticket.issued_at,
    'used_at', v_ticket.used_at,
    'checked_in_by', v_ticket.checked_in_by,
    'events', jsonb_build_object('title', v_event_title),
    'ticket_types', jsonb_build_object('name', v_ticket_type_name),
    'profiles', jsonb_build_object(
      'full_name', coalesce(v_buyer_name, 'Participante'),
      'email', v_buyer_email,
      'photo_url', v_buyer_photo_url
    )
  );
END;
$$;