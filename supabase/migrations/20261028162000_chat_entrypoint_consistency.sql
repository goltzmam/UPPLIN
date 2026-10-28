-- Keep ticket, buyer-list and message-center chat entry points on the same thread.

CREATE OR REPLACE FUNCTION public.open_event_conversation(p_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('user_organizer'||v_p1::text||v_p2::text||p_event_id::text,0));

  SELECT id INTO v_conv_id
  FROM public.conversations
  WHERE type = 'user_organizer'
    AND event_id = p_event_id
    AND ((participant_1_id = v_p1 AND participant_2_id = v_p2)
      OR (participant_1_id = v_p2 AND participant_2_id = v_p1))
  LIMIT 1;

  IF v_conv_id IS NULL THEN
    INSERT INTO public.conversations (type, event_id, participant_1_id, participant_2_id, subject)
    VALUES ('user_organizer', p_event_id, v_p1, v_p2, v_event_title)
    RETURNING id INTO v_conv_id;
  END IF;

  RETURN jsonb_build_object('conversation_id', v_conv_id, 'chat_available', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.open_organizer_conversation_with_user(p_event_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('user_organizer'||v_p1::text||v_p2::text||p_event_id::text,0));

  SELECT id INTO v_conv_id
  FROM public.conversations
  WHERE type = 'user_organizer'
    AND event_id = p_event_id
    AND ((participant_1_id = v_p1 AND participant_2_id = v_p2)
      OR (participant_1_id = v_p2 AND participant_2_id = v_p1))
  LIMIT 1;

  IF v_conv_id IS NULL THEN
    INSERT INTO public.conversations (type, event_id, participant_1_id, participant_2_id, subject)
    VALUES ('user_organizer', p_event_id, v_p1, v_p2, v_event_title)
    RETURNING id INTO v_conv_id;
  END IF;

  RETURN jsonb_build_object('conversation_id', v_conv_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.start_chat(p_type text, p_event_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); other_id uuid; result uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF p_type='user_organizer' THEN
    SELECT a.owner_user_id INTO other_id FROM public.events e JOIN public.organizer_accounts a ON a.id=e.organizer_id
      WHERE e.id=p_event_id AND a.status='active' AND a.chat_available IS DISTINCT FROM false
      AND (e.status='published' OR EXISTS(SELECT 1 FROM public.tickets t WHERE t.event_id=e.id AND t.buyer_user_id=uid)
        OR EXISTS(SELECT 1 FROM public.orders o WHERE o.event_id=e.id AND o.buyer_user_id=uid AND o.status='paid'));
  ELSIF p_type IN ('user_admin','organizer_admin') THEN
    IF p_event_id IS NOT NULL THEN RAISE EXCEPTION 'Invalid support context'; END IF;
    IF p_type='organizer_admin' AND NOT EXISTS(SELECT 1 FROM public.organizer_accounts a WHERE a.owner_user_id=uid)
      AND NOT public.has_role(uid,'organizer') THEN RAISE EXCEPTION 'Organizer account required' USING ERRCODE='42501'; END IF;
    SELECT r.user_id INTO other_id FROM public.user_roles r JOIN auth.users u ON u.id=r.user_id
      WHERE r.role='admin' AND r.user_id<>uid ORDER BY r.user_id LIMIT 1;
  ELSE RAISE EXCEPTION 'Invalid conversation type'; END IF;
  IF other_id IS NULL OR other_id=uid OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=other_id) THEN
    RAISE EXCEPTION 'Contact unavailable'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_type||least(uid,other_id)::text||greatest(uid,other_id)::text||coalesce(p_event_id::text,''),0));
  SELECT c.id INTO result FROM public.conversations c WHERE c.type=p_type AND c.event_id IS NOT DISTINCT FROM p_event_id
    AND ((c.participant_1_id=uid AND c.participant_2_id=other_id) OR (c.participant_2_id=uid AND c.participant_1_id=other_id))
    ORDER BY c.created_at LIMIT 1;
  IF result IS NULL THEN
    INSERT INTO public.conversations(type,event_id,participant_1_id,participant_2_id)
      VALUES(p_type,p_event_id,least(uid,other_id),greatest(uid,other_id)) RETURNING id INTO result;
  END IF;
  RETURN result;
END;
$function$;
