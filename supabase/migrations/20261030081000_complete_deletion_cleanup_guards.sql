-- Preserve dependent financial records and remove remaining personal associations.
CREATE OR REPLACE FUNCTION public.prevent_deleted_buyer_order() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM privacy.deletion_jobs WHERE user_id=NEW.buyer_user_id) THEN RAISE EXCEPTION 'account_deletion_in_progress' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM public.events e JOIN public.organizer_accounts a ON a.id=e.organizer_id WHERE e.id=NEW.event_id
   AND (a.owner_user_id IS NULL OR a.status='suspended' OR EXISTS(SELECT 1 FROM privacy.deletion_jobs WHERE user_id=a.owner_user_id))) THEN
   RAISE EXCEPTION 'seller_unavailable' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.erase_account_personal_data(p_job_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE j privacy.deletion_jobs%ROWTYPE;buyer_cpf text;orgs uuid[];o record;until_at timestamptz;em text;
BEGIN
 SELECT * INTO j FROM privacy.deletion_jobs WHERE id=p_job_id FOR UPDATE;
 IF j.id IS NULL OR NOT j.providers_revoked THEN RAISE EXCEPTION 'providers_not_revoked'; END IF;
 IF j.data_erased THEN RETURN; END IF;
 IF EXISTS(SELECT 1 FROM privacy.deletion_objects WHERE job_id=j.id AND removed_at IS NULL) THEN RAISE EXCEPTION 'storage_not_erased'; END IF;
 SELECT cpf INTO buyer_cpf FROM public.profiles WHERE id=j.user_id;
 SELECT email INTO em FROM auth.users WHERE id=j.user_id;
 SELECT coalesce(array_agg(id),'{}'::uuid[]) INTO orgs FROM public.organizer_accounts WHERE owner_user_id=j.user_id;
 FOR o IN SELECT od.* FROM public.orders od JOIN public.events e ON e.id=od.event_id
   WHERE od.buyer_user_id=j.user_id OR e.organizer_id=ANY(orgs)
 LOOP
   SELECT greatest(o.created_at,coalesce((SELECT max(updated_at) FROM public.payments WHERE order_id=o.id),o.created_at),
     coalesce((SELECT max(updated_at) FROM public.refund_requests WHERE order_id=o.id),o.created_at),
     coalesce((SELECT coalesce(end_at,start_at) FROM public.events WHERE id=o.event_id),o.created_at))+interval '5 years' INTO until_at;
   INSERT INTO privacy.financial_retention(subject_id,record_type,record_id,data,expires_at)
   VALUES(j.anonymous_id,'order',o.id,jsonb_build_object('order',to_jsonb(o)-'buyer_user_id',
     'buyer_cpf',CASE WHEN o.buyer_user_id=j.user_id THEN buyer_cpf ELSE NULL END,
     'items',(SELECT jsonb_agg(to_jsonb(i)) FROM public.order_items i WHERE i.order_id=o.id),
     'tickets',(SELECT jsonb_agg(to_jsonb(t)-'buyer_user_id'-'qr_token'-'checked_in_by') FROM public.tickets t WHERE t.order_id=o.id),
     'payments',(SELECT jsonb_agg(to_jsonb(p)-'raw') FROM public.payments p WHERE p.order_id=o.id)),until_at)
   ON CONFLICT(subject_id,record_type,record_id) DO NOTHING;
   INSERT INTO privacy.retention_targets(record_type,record_id,expires_at) VALUES('order',o.id,until_at)
   ON CONFLICT(record_type,record_id) DO UPDATE SET expires_at=greatest(privacy.retention_targets.expires_at,excluded.expires_at);
 END LOOP;
 INSERT INTO privacy.financial_retention(subject_id,record_type,record_id,data,expires_at)
 SELECT j.anonymous_id,'subscription_invoice',i.id,to_jsonb(i),greatest(coalesce(i.paid_at,i.created_at),coalesce(i.period_end,i.created_at))+interval '5 years'
 FROM public.subscription_invoices i WHERE i.organizer_id=ANY(orgs) ON CONFLICT DO NOTHING;
 DELETE FROM public.messages WHERE sender_id=j.user_id;
 UPDATE public.conversations SET participant_1_id=CASE WHEN participant_1_id=j.user_id THEN j.anonymous_id ELSE participant_1_id END,
  participant_2_id=CASE WHEN participant_2_id=j.user_id THEN j.anonymous_id ELSE participant_2_id END,subject=NULL
 WHERE j.user_id IN(participant_1_id,participant_2_id);
 DELETE FROM public.chat_presence WHERE user_id=j.user_id;
 DELETE FROM public.user_posts WHERE user_id=j.user_id;
 DELETE FROM public.user_post_comments WHERE user_id=j.user_id;
 DELETE FROM public.user_post_likes WHERE user_id=j.user_id;
 DELETE FROM public.event_comments WHERE user_id=j.user_id;
 DELETE FROM public.event_reviews WHERE user_id=j.user_id;
 DELETE FROM public.event_likes WHERE user_id=j.user_id;
 DELETE FROM public.event_rsvps WHERE user_id=j.user_id;
 DELETE FROM public.saved_events WHERE user_id=j.user_id;
 DELETE FROM public.follows WHERE user_id=j.user_id OR organizer_id=ANY(orgs);
 DELETE FROM public.coupons WHERE organizer_id=ANY(orgs);
 DELETE FROM public.social_notifications WHERE actor_user_id=j.user_id OR target_user_id=j.user_id;
 DELETE FROM public.notifications WHERE user_id=j.user_id;
 DELETE FROM public.push_subscriptions WHERE user_id=j.user_id;
 DELETE FROM public.cpf_change_requests WHERE user_id=j.user_id;
 UPDATE public.checkin_collaborators SET user_id=j.anonymous_id,display_name='Conta excluída',status='revoked',revoked_at=now() WHERE user_id=j.user_id;
 UPDATE public.tickets SET checked_in_by=NULL WHERE checked_in_by=j.user_id;
 UPDATE public.refund_status_logs SET actor_user_id=j.anonymous_id,note='Dados pessoais removidos',metadata='{}' WHERE actor_user_id=j.user_id;
 UPDATE public.refund_requests SET requester_user_id=NULL,reason='Dados pessoais removidos',attachments='[]',organizer_decision_note=NULL,admin_decision_note=NULL WHERE requester_user_id=j.user_id;
 UPDATE public.admin_action_logs SET target_id=j.anonymous_id,reason='Dados pessoais removidos',metadata='{}' WHERE target_id=j.user_id;
 DELETE FROM public.email_send_log WHERE lower(recipient_email)=lower(em);
 INSERT INTO privacy.access_logs(user_id,ip,accessed_at,expires_at)
 SELECT NULL,CASE WHEN pg_input_is_valid(nullif(a.ip_address,''),'inet') THEN a.ip_address::inet ELSE NULL END,a.created_at,a.created_at+interval '6 months'
 FROM auth.audit_log_entries a WHERE a.payload->>'actor_id'=j.user_id::text AND a.created_at>now()-interval '6 months';
 UPDATE auth.audit_log_entries SET payload=jsonb_build_object('action',payload->>'action','actor_id',j.anonymous_id::text,'actor_type',payload->>'actor_type','log_type',payload->>'log_type')
 WHERE payload->>'actor_id'=j.user_id::text;
 DELETE FROM public.email_unsubscribe_tokens WHERE lower(email)=lower(em);
 DELETE FROM public.suppressed_emails WHERE lower(email)=lower(em);
 UPDATE public.payments p SET raw=jsonb_build_object('personal_data_removed',true) WHERE EXISTS(SELECT 1 FROM public.orders od WHERE od.id=p.order_id AND od.buyer_user_id=j.user_id);
 UPDATE public.orders SET buyer_user_id=NULL WHERE buyer_user_id=j.user_id;
 UPDATE public.tickets SET buyer_user_id=NULL WHERE buyer_user_id=j.user_id;
 DELETE FROM public.organizer_mp_accounts WHERE organizer_id=ANY(orgs);
 UPDATE public.organizer_subscriptions SET plan_id='free',status='active',mp_subscription_id=NULL,current_period_end=NULL WHERE organizer_id=ANY(orgs);
 DELETE FROM public.events e WHERE e.organizer_id=ANY(orgs) AND NOT EXISTS(SELECT 1 FROM public.orders od WHERE od.event_id=e.id);
 UPDATE public.events SET cover_image_url=NULL,checkout_banner_url=NULL WHERE organizer_id=ANY(orgs);
 DELETE FROM public.event_media WHERE event_id IN(SELECT id FROM public.events WHERE organizer_id=ANY(orgs));
 UPDATE public.organizer_accounts SET owner_user_id=NULL,display_name='Organizador excluído',status='suspended',cnpj=NULL,cpf=NULL,email=NULL,phone=NULL,
  logo_url=NULL,description=NULL,slug='excluido-'||id::text,social_instagram=NULL,social_facebook=NULL,social_website=NULL,
  cep=NULL,street=NULL,street_number=NULL,complement=NULL,neighborhood=NULL,city=NULL,state=NULL,chat_available=false WHERE id=ANY(orgs);
 DELETE FROM public.user_roles WHERE user_id=j.user_id;
 DELETE FROM public.profiles WHERE id=j.user_id;
 DELETE FROM vault.secrets WHERE id IN(SELECT secret_id FROM privacy.apple_credentials WHERE user_id=j.user_id);
 DELETE FROM privacy.apple_credentials WHERE user_id=j.user_id;
 UPDATE privacy.access_logs SET user_id=NULL WHERE user_id=j.user_id;
 UPDATE privacy.deletion_jobs SET data_erased=true,status='data_erased',updated_at=now() WHERE id=j.id;
END $$;

CREATE OR REPLACE FUNCTION public.prune_privacy_retention() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE r record;
BEGIN
 UPDATE privacy.retention_targets t SET expires_at=greatest(t.expires_at,
   greatest(od.created_at,coalesce((SELECT max(updated_at) FROM public.payments p WHERE p.order_id=od.id),od.created_at),
     coalesce((SELECT max(updated_at) FROM public.refund_requests f WHERE f.order_id=od.id),od.created_at),coalesce(e.end_at,e.start_at,od.created_at))+interval '5 years')
 FROM public.orders od JOIN public.events e ON e.id=od.event_id WHERE t.record_type='order' AND t.record_id=od.id;
 UPDATE privacy.financial_retention f SET expires_at=greatest(f.expires_at,t.expires_at) FROM privacy.retention_targets t WHERE f.record_type=t.record_type AND f.record_id=t.record_id;
 DELETE FROM privacy.financial_retention WHERE expires_at<now();
 FOR r IN SELECT * FROM privacy.retention_targets WHERE expires_at<now() AND record_type='order' LOOP
   DELETE FROM public.orders WHERE id=r.record_id;
   DELETE FROM privacy.retention_targets WHERE record_type=r.record_type AND record_id=r.record_id;
 END LOOP;
 DELETE FROM public.subscription_invoices i USING public.organizer_accounts a WHERE a.id=i.organizer_id AND a.owner_user_id IS NULL
  AND greatest(coalesce(i.paid_at,i.created_at),coalesce(i.period_end,i.created_at))<now()-interval '5 years';
 DELETE FROM privacy.access_logs WHERE expires_at<now();
 DELETE FROM auth.audit_log_entries WHERE created_at<now()-interval '6 months';
 UPDATE privacy.deletion_jobs SET contact_email=NULL WHERE status='completed' AND completed_at<now()-interval '30 days';
 DELETE FROM privacy.deletion_jobs WHERE status='completed' AND completed_at<now()-interval '90 days';
END $$;
NOTIFY pgrst, 'reload schema';
