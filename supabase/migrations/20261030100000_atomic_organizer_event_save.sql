-- Save the event, ticket types and media in one transaction. Never cascade
-- deletion of a ticket type/event into an existing customer's purchase.
CREATE FUNCTION public.protect_purchased_event_data() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_TABLE_NAME='events' THEN
  IF EXISTS(SELECT 1 FROM public.orders WHERE event_id=OLD.id) THEN RAISE EXCEPTION 'Este evento possui pedidos. Cancele o evento em vez de excluí-lo.'; END IF;
 ELSE
  IF EXISTS(SELECT 1 FROM public.order_items WHERE ticket_type_id=OLD.id)
   OR EXISTS(SELECT 1 FROM public.tickets WHERE ticket_type_id=OLD.id) THEN
   RAISE EXCEPTION 'Este ingresso possui pedidos. Desative as vendas em vez de excluí-lo.';
  END IF;
 END IF;
 RETURN OLD;
END $$;
CREATE TRIGGER protect_purchased_event BEFORE DELETE ON public.events FOR EACH ROW EXECUTE FUNCTION public.protect_purchased_event_data();
CREATE TRIGGER protect_purchased_ticket_type BEFORE DELETE ON public.ticket_types FOR EACH ROW EXECUTE FUNCTION public.protect_purchased_event_data();
REVOKE ALL ON FUNCTION public.protect_purchased_event_data() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.save_organizer_event(p_event_id uuid,p_event jsonb,p_tickets jsonb,p_media jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE eid uuid;org uuid;t jsonb;tid uuid;m jsonb;mid uuid;sold integer;ids uuid[]:=ARRAY[]::uuid[];start_date timestamptz;end_date timestamptz;
BEGIN
 IF auth.uid() IS NULL OR NOT public.account_is_active() THEN RAISE EXCEPTION 'Entre novamente para salvar.' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_tickets)<>'array' OR jsonb_typeof(p_media)<>'array' THEN RAISE EXCEPTION 'Dados inválidos.'; END IF;
 IF length(trim(coalesce(p_event->>'title','')))=0 THEN RAISE EXCEPTION 'Informe o título do evento.'; END IF;
 IF coalesce(p_event->>'status','') NOT IN('draft','pending_review') THEN RAISE EXCEPTION 'Status inválido.'; END IF;
 start_date:=(p_event->>'start_at')::timestamptz;end_date:=nullif(p_event->>'end_at','')::timestamptz;
 IF start_date IS NULL OR end_date<=start_date THEN RAISE EXCEPTION 'Confira as datas de início e término.'; END IF;
 IF p_event_id IS NOT NULL THEN
  SELECT id,organizer_id INTO eid,org FROM public.events WHERE id=p_event_id FOR UPDATE;
  IF eid IS NULL THEN RAISE EXCEPTION 'Evento não encontrado.'; END IF;
 ELSE org:=(p_event->>'organizer_id')::uuid;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.organizer_accounts WHERE id=org AND owner_user_id=auth.uid() AND status='active') THEN RAISE EXCEPTION 'Sem permissão para editar este evento.' USING ERRCODE='42501'; END IF;
 IF eid IS NULL THEN
  INSERT INTO public.events(organizer_id,title,start_at) VALUES(org,trim(p_event->>'title'),start_date) RETURNING id INTO eid;
 END IF;
 UPDATE public.events SET title=trim(p_event->>'title'),description=p_event->>'description',category=nullif(p_event->>'category',''),
  start_at=start_date,end_at=end_date,venue_name=nullif(p_event->>'venue_name',''),address_text=nullif(p_event->>'address_text',''),
  lat=nullif(p_event->>'lat','')::numeric,lng=nullif(p_event->>'lng','')::numeric,
  cover_image_url=nullif(p_event->>'cover_image_url',''),checkout_banner_url=nullif(p_event->>'checkout_banner_url',''),status=(p_event->>'status')::public.event_status WHERE id=eid;
 FOR t IN SELECT value FROM jsonb_array_elements(p_tickets) LOOP
  tid:=nullif(t->>'id','')::uuid;
  IF tid IS NOT NULL THEN
   SELECT coalesce(quantity_sold,0) INTO sold FROM public.ticket_types WHERE id=tid AND event_id=eid FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Ingresso inválido para este evento.'; END IF;
  ELSE sold:=0;END IF;
  IF coalesce((t->>'toDelete')::boolean,false) THEN
   IF tid IS NOT NULL THEN UPDATE public.ticket_types SET status='paused' WHERE id=tid AND event_id=eid; END IF;
   CONTINUE;
  END IF;
  IF length(trim(coalesce(t->>'name','')))=0 OR coalesce((t->>'price_cents')::integer,-1)<0
   OR coalesce((t->>'quantity_total')::integer,0)<greatest(1,sold) THEN RAISE EXCEPTION 'Confira nome, preço e quantidade dos ingressos. A quantidade não pode ser menor que a já reservada.'; END IF;
  IF tid IS NULL THEN
   INSERT INTO public.ticket_types(event_id,name,price_cents,quantity_total) VALUES(eid,trim(t->>'name'),(t->>'price_cents')::integer,(t->>'quantity_total')::integer);
  ELSE
   UPDATE public.ticket_types SET name=trim(t->>'name'),price_cents=(t->>'price_cents')::integer,quantity_total=(t->>'quantity_total')::integer WHERE id=tid AND event_id=eid;
  END IF;
 END LOOP;
 FOR m IN SELECT value FROM jsonb_array_elements(p_media) LOOP
  IF coalesce(m->>'type','') NOT IN('image','video') OR coalesce(m->>'url','') !~ '^https://' THEN RAISE EXCEPTION 'Mídia inválida.'; END IF;
  mid:=nullif(m->>'existing_id','')::uuid;
  IF mid IS NULL THEN
   INSERT INTO public.event_media(event_id,url,type,sort_order) VALUES(eid,m->>'url',(m->>'type')::public.media_type,(m->>'sort_order')::integer) RETURNING id INTO mid;
  ELSE
   UPDATE public.event_media SET url=m->>'url',sort_order=(m->>'sort_order')::integer WHERE id=mid AND event_id=eid;
   IF NOT FOUND THEN RAISE EXCEPTION 'Mídia não pertence a este evento.'; END IF;
  END IF;
  ids:=array_append(ids,mid);
 END LOOP;
 DELETE FROM public.event_media WHERE event_id=eid AND NOT(id=ANY(ids));
 RETURN eid;
END $$;
REVOKE ALL ON FUNCTION public.save_organizer_event(uuid,jsonb,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_organizer_event(uuid,jsonb,jsonb,jsonb) TO authenticated;
