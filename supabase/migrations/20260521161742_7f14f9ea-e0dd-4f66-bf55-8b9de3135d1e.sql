
CREATE OR REPLACE FUNCTION public.get_organizer_leads(p_organizer_id uuid)
RETURNS TABLE(
  buyer_user_id uuid,
  full_name text,
  email text,
  photo_url text,
  event_id uuid,
  event_title text,
  event_start_at timestamptz,
  tickets_count integer,
  total_cents bigint,
  orders_count integer,
  last_order_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_organizer_owner(auth.uid(), p_organizer_id) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  RETURN QUERY
  SELECT
    o.buyer_user_id,
    COALESCE(p.full_name, 'Participante')::text AS full_name,
    p.email::text,
    p.photo_url::text,
    e.id AS event_id,
    e.title::text AS event_title,
    e.start_at AS event_start_at,
    COALESCE(SUM(oi.qty), 0)::int AS tickets_count,
    COALESCE(SUM(o.total_cents), 0)::bigint AS total_cents,
    COUNT(DISTINCT o.id)::int AS orders_count,
    MAX(o.updated_at) AS last_order_at
  FROM public.orders o
  JOIN public.events e ON e.id = o.event_id
  LEFT JOIN public.order_items oi ON oi.order_id = o.id
  LEFT JOIN public.profiles p ON p.id = o.buyer_user_id
  WHERE e.organizer_id = p_organizer_id
    AND o.status = 'paid'
  GROUP BY o.buyer_user_id, p.full_name, p.email, p.photo_url, e.id, e.title, e.start_at
  ORDER BY MAX(o.updated_at) DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.open_organizer_conversation_with_user(
  p_event_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_organizer_id uuid;
  v_event_title text;
  v_p1 uuid;
  v_p2 uuid;
  v_conv_id uuid;
  v_has_paid boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT e.organizer_id, e.title INTO v_organizer_id, v_event_title
  FROM public.events e
  WHERE e.id = p_event_id;

  IF v_organizer_id IS NULL THEN
    RAISE EXCEPTION 'event_not_found';
  END IF;

  IF NOT public.is_organizer_owner(v_uid, v_organizer_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  -- Buyer must have a paid order for this event
  SELECT EXISTS (
    SELECT 1 FROM public.orders
    WHERE event_id = p_event_id
      AND buyer_user_id = p_user_id
      AND status = 'paid'
  ) INTO v_has_paid;

  IF NOT v_has_paid THEN
    RAISE EXCEPTION 'user_has_no_paid_order';
  END IF;

  v_p1 := LEAST(v_uid, p_user_id);
  v_p2 := GREATEST(v_uid, p_user_id);

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

  RETURN jsonb_build_object('conversation_id', v_conv_id);
END;
$$;
