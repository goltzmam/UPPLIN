-- Database-only regression: all fixtures are rolled back, including Auth rows.
-- No email is sent and no payment provider is contacted.
BEGIN;
SET LOCAL statement_timeout = '15s';
DO $test$
DECLARE
  seller uuid := gen_random_uuid(); buyer uuid := gen_random_uuid(); outsider uuid := gen_random_uuid();
  org uuid; event uuid; ticket_type uuid; free_order uuid; paid_order uuid; failed_order uuid;
  conversation uuid; refund uuid; rejected boolean; n integer;
BEGIN
  INSERT INTO auth.users(id,email,raw_user_meta_data,email_confirmed_at)
  VALUES (seller,seller::text||'@audit.invalid','{}',now()),
         (buyer,buyer::text||'@audit.invalid','{}',now()),
         (outsider,outsider::text||'@audit.invalid','{}',now());
  INSERT INTO public.organizer_accounts(owner_user_id,display_name)
  VALUES (seller,'Transactional fixture') RETURNING id INTO org;
  INSERT INTO public.events(organizer_id,title,start_at,end_at,status)
  VALUES (org,'Transactional fixture',now()+interval '1 day',now()+interval '2 days','published') RETURNING id INTO event;
  INSERT INTO public.ticket_types(event_id,name,price_cents,quantity_total,quantity_sold)
  VALUES(event,'Fixture',0,100,4) RETURNING id INTO ticket_type;
  INSERT INTO public.orders(buyer_user_id,event_id,total_cents,status,expires_at)
  VALUES(buyer,event,0,'pending',now()+interval '10 minutes') RETURNING id INTO free_order;
  INSERT INTO public.order_items(order_id,ticket_type_id,qty,unit_price_cents) VALUES(free_order,ticket_type,1,0);
  INSERT INTO public.orders(buyer_user_id,event_id,total_cents,status,expires_at)
  VALUES(buyer,event,200,'pending',now()+interval '10 minutes') RETURNING id INTO paid_order;
  INSERT INTO public.order_items(order_id,ticket_type_id,qty,unit_price_cents) VALUES(paid_order,ticket_type,1,200);
  INSERT INTO public.orders(buyer_user_id,event_id,total_cents,status,expires_at)
  VALUES(buyer,event,200,'pending',now()-interval '1 minute') RETURNING id INTO failed_order;
  INSERT INTO public.order_items(order_id,ticket_type_id,qty,unit_price_cents) VALUES(failed_order,ticket_type,2,100);

  PERFORM set_config('request.jwt.claim.sub',buyer::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM public.confirm_free_order(free_order);
  PERFORM public.confirm_free_order(free_order);
  SELECT count(*) INTO n FROM public.tickets WHERE order_id=free_order;
  IF n<>1 THEN RAISE EXCEPTION 'Free confirmation did not issue exactly one ticket'; END IF;
  rejected:=false;
  BEGIN PERFORM public.confirm_free_order(paid_order);
  EXCEPTION WHEN OTHERS THEN IF SQLERRM='order_is_not_free' THEN rejected:=true; ELSE RAISE; END IF; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Paid order accepted as free'; END IF;
  PERFORM set_config('request.jwt.claim.sub',outsider::text,true);
  rejected:=false;
  BEGIN PERFORM public.confirm_free_order(free_order);
  EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Another user confirmed a buyer order'; END IF;
  EXECUTE 'RESET ROLE';

  rejected:=false;
  BEGIN PERFORM public.confirm_paid_order(paid_order,'local-validation','fixture-payment',100,'test','{}');
  EXCEPTION WHEN OTHERS THEN IF SQLERRM='payment_amount_mismatch' THEN rejected:=true; ELSE RAISE; END IF; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Payment amount mismatch accepted'; END IF;
  PERFORM public.confirm_paid_order(paid_order,'local-validation','fixture-payment',200,'test','{}');
  PERFORM public.confirm_paid_order(paid_order,'local-validation','fixture-payment',200,'test','{}');
  SELECT count(*) INTO n FROM public.tickets WHERE order_id=paid_order;
  IF n<>1 THEN RAISE EXCEPTION 'Duplicate notification issued duplicate tickets'; END IF;
  IF public.release_pending_order(paid_order,'failed') THEN RAISE EXCEPTION 'Paid stock was released'; END IF;
  IF NOT public.release_pending_order(failed_order,'cancelled') THEN RAISE EXCEPTION 'Expired order not released'; END IF;
  IF public.release_pending_order(failed_order,'cancelled') THEN RAISE EXCEPTION 'Repeated expiration released twice'; END IF;
  SELECT quantity_sold INTO n FROM public.ticket_types WHERE id=ticket_type;
  IF n<>2 THEN RAISE EXCEPTION 'Incorrect stock after release: %',n; END IF;
  IF has_table_privilege('authenticated','public.organizer_mp_accounts','SELECT') THEN RAISE EXCEPTION 'OAuth credentials visible to client role'; END IF;
  IF has_function_privilege('authenticated','public.confirm_paid_order(uuid,text,text,integer,text,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Client can confirm paid payments'; END IF;

  SELECT id INTO conversation FROM public.conversations WHERE participant_1_id=LEAST(seller,buyer) AND participant_2_id=GREATEST(seller,buyer) LIMIT 1;
  IF conversation IS NULL THEN RAISE EXCEPTION 'Payment did not create its conversation'; END IF;
  PERFORM set_config('request.jwt.claim.sub',buyer::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM public.set_chat_presence(conversation,true,true);
  PERFORM set_config('request.jwt.claim.sub',outsider::text,true);
  SELECT count(*) INTO n FROM public.chat_presence WHERE conversation_id=conversation;
  IF n<>0 THEN RAISE EXCEPTION 'Outsider can read chat presence'; END IF;
  rejected:=false;
  BEGIN PERFORM public.set_chat_presence(conversation,true,true);
  EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Outsider can publish chat presence'; END IF;
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claim.sub',buyer::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  refund := (public.request_refund(paid_order,'Transactional refund regression validation','[]')->>'id')::uuid;
  PERFORM set_config('request.jwt.claim.sub',outsider::text,true);
  rejected:=false;
  BEGIN PERFORM public.decide_refund(refund,'approve',NULL);
  EXCEPTION WHEN OTHERS THEN IF SQLERRM='not_allowed' THEN rejected:=true; ELSE RAISE; END IF; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Outsider approved a refund'; END IF;
  PERFORM set_config('request.jwt.claim.sub',seller::text,true);
  PERFORM public.decide_refund(refund,'approve','Fixture approval');
  EXECUTE 'RESET ROLE';
  PERFORM public.mark_refund_pending(refund,'fixture-refund','mp_returns_fee');
  PERFORM public.mark_refund_completed(refund,'fixture-refund');
  PERFORM public.mark_refund_completed(refund,'fixture-refund');
  SELECT count(*) INTO n FROM public.tickets WHERE order_id=paid_order AND status='cancelled';
  IF n<>1 THEN RAISE EXCEPTION 'Refund did not cancel its ticket'; END IF;
  SELECT quantity_sold INTO n FROM public.ticket_types WHERE id=ticket_type;
  IF n<>1 THEN RAISE EXCEPTION 'Refund released stock more than once'; END IF;
END;
$test$;
ROLLBACK;
