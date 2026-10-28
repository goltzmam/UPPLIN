-- Public identity exposes four display fields, never the private profile table.
ALTER VIEW public.profiles_public SET (security_invoker = false, security_barrier = true);
REVOKE ALL ON public.profiles_public FROM PUBLIC, anon;
GRANT SELECT ON public.profiles_public TO authenticated;

CREATE OR REPLACE FUNCTION public.get_chat_identities(p_conversation_ids uuid[])
RETURNS TABLE(conversation_id uuid, user_id uuid, full_name text, photo_url text, cover_photo_url text, is_support boolean, is_organizer boolean, profile_path text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH allowed AS (
    SELECT c.* FROM public.conversations c
    WHERE c.id = ANY(p_conversation_ids)
      AND (auth.uid() IN (c.participant_1_id,c.participant_2_id) OR public.has_role(auth.uid(),'admin'))
  ), people AS (
    SELECT c.id conversation_id,c.event_id,v.uid FROM allowed c
    CROSS JOIN LATERAL (VALUES(c.participant_1_id),(c.participant_2_id)) v(uid)
    UNION
    SELECT c.id,c.event_id,m.sender_id FROM allowed c JOIN public.messages m ON m.conversation_id=c.id
  )
  SELECT x.conversation_id,x.uid,
    CASE WHEN public.has_role(x.uid,'admin') THEN 'Suporte UPPLIN'
      ELSE coalesce(nullif(o.display_name,''),nullif(p.full_name,''),'Conta indisponível') END,
    CASE WHEN public.has_role(x.uid,'admin') THEN '/upplin-icon.svg' ELSE coalesce(o.logo_url,p.photo_url) END,
    p.cover_photo_url,public.has_role(x.uid,'admin'),o.id IS NOT NULL,
    CASE WHEN NOT public.has_role(x.uid,'admin') AND o.id IS NOT NULL THEN '/o/'||coalesce(nullif(o.slug,''),o.id::text) END
  FROM people x LEFT JOIN public.profiles p ON p.id=x.uid
  LEFT JOIN LATERAL (
    SELECT a.* FROM public.organizer_accounts a WHERE a.owner_user_id=x.uid
      AND (x.event_id IS NULL OR EXISTS(SELECT 1 FROM public.events e WHERE e.id=x.event_id AND e.organizer_id=a.id))
    ORDER BY a.created_at LIMIT 1
  ) o ON true;
$$;
REVOKE ALL ON FUNCTION public.get_chat_identities(uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_chat_identities(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.start_chat(p_type text,p_event_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE uid uuid:=auth.uid(); other_id uuid; result uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF p_type='user_organizer' THEN
    SELECT a.owner_user_id INTO other_id FROM public.events e JOIN public.organizer_accounts a ON a.id=e.organizer_id
      WHERE e.id=p_event_id AND (e.status='published' OR EXISTS(SELECT 1 FROM public.tickets t WHERE t.event_id=e.id AND t.buyer_user_id=uid));
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
      VALUES(p_type,p_event_id,uid,other_id) RETURNING id INTO result;
  END IF;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.start_chat(text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.start_chat(text,uuid) TO authenticated;
-- Creation goes through the validated, race-safe server function.
REVOKE INSERT,UPDATE ON public.conversations FROM PUBLIC,anon,authenticated;

DROP POLICY IF EXISTS "Support can send messages" ON public.messages;
CREATE POLICY "Support can send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK(sender_id=auth.uid() AND public.has_role(auth.uid(),'admin'));
-- Reading a conversation must not allow editing its contents or participants.
REVOKE UPDATE,INSERT ON public.messages FROM PUBLIC,anon,authenticated;
GRANT INSERT(id,conversation_id,sender_id,content) ON public.messages TO authenticated;
CREATE OR REPLACE FUNCTION public.mark_chat_read(p_conversation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.conversations c WHERE c.id=p_conversation_id
    AND auth.uid() IN(c.participant_1_id,c.participant_2_id)) THEN RETURN; END IF;
  UPDATE public.messages SET read_at=now() WHERE conversation_id=p_conversation_id AND sender_id<>auth.uid() AND read_at IS NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_chat_read(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mark_chat_read(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.chat_message_inserted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF length(btrim(NEW.content))=0 OR length(NEW.content)>4000 THEN RAISE EXCEPTION 'Message must contain between 1 and 4000 characters'; END IF;
  UPDATE public.conversations SET updated_at=now() WHERE id=NEW.conversation_id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.chat_message_inserted() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER chat_message_inserted AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.chat_message_inserted();
