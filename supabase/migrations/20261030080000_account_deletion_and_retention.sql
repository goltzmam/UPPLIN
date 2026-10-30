CREATE SCHEMA IF NOT EXISTS privacy;
REVOKE ALL ON SCHEMA privacy FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA privacy TO service_role;
CREATE TABLE privacy.deletion_jobs(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL UNIQUE,anonymous_id uuid NOT NULL DEFAULT gen_random_uuid(),
  receipt_hash text NOT NULL,contact_email text,test_mode boolean NOT NULL DEFAULT false,status text NOT NULL DEFAULT 'queued',created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),providers_revoked boolean NOT NULL DEFAULT false,data_erased boolean NOT NULL DEFAULT false,
  auth_erased boolean NOT NULL DEFAULT false,confirmation_sent boolean NOT NULL DEFAULT false,attempts integer NOT NULL DEFAULT 0,
  error_code text,lease_until timestamptz,completed_at timestamptz
);
CREATE TABLE privacy.deletion_objects(job_id uuid REFERENCES privacy.deletion_jobs(id) ON DELETE CASCADE,bucket_id text NOT NULL,name text NOT NULL,removed_at timestamptz,PRIMARY KEY(job_id,bucket_id,name));
CREATE TABLE privacy.apple_credentials(user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,secret_id uuid NOT NULL,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE privacy.financial_retention(subject_id uuid NOT NULL,record_type text NOT NULL,record_id uuid NOT NULL,data jsonb NOT NULL,expires_at timestamptz NOT NULL,PRIMARY KEY(subject_id,record_type,record_id));
CREATE TABLE privacy.retention_targets(record_type text NOT NULL,record_id uuid NOT NULL,expires_at timestamptz NOT NULL,PRIMARY KEY(record_type,record_id));
CREATE TABLE privacy.access_logs(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,user_id uuid,ip inet,accessed_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL DEFAULT(now()+interval '6 months'));
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['deletion_jobs','deletion_objects','apple_credentials','financial_retention','retention_targets','access_logs'] LOOP
    EXECUTE format('ALTER TABLE privacy.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON privacy.%I FROM PUBLIC,anon,authenticated',t);
    EXECUTE format('GRANT ALL ON privacy.%I TO service_role',t);
  END LOOP;
END $$;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA privacy TO service_role;

-- Deleting Auth must never cascade into financial history or other buyers' tickets.
ALTER TABLE public.orders ALTER COLUMN buyer_user_id DROP NOT NULL;
ALTER TABLE public.tickets ALTER COLUMN buyer_user_id DROP NOT NULL;
ALTER TABLE public.organizer_accounts ALTER COLUMN owner_user_id DROP NOT NULL;
ALTER TABLE public.refund_requests ALTER COLUMN requester_user_id DROP NOT NULL;
ALTER TABLE public.orders DROP CONSTRAINT orders_buyer_user_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_buyer_user_id_fkey FOREIGN KEY(buyer_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.tickets DROP CONSTRAINT tickets_buyer_user_id_fkey;
ALTER TABLE public.tickets ADD CONSTRAINT tickets_buyer_user_id_fkey FOREIGN KEY(buyer_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.organizer_accounts DROP CONSTRAINT organizer_accounts_owner_user_id_fkey;
ALTER TABLE public.organizer_accounts ADD CONSTRAINT organizer_accounts_owner_user_id_fkey FOREIGN KEY(owner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE FUNCTION public.account_is_active() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT NOT EXISTS(SELECT 1 FROM privacy.deletion_jobs WHERE user_id=auth.uid());
$$;
REVOKE ALL ON FUNCTION public.account_is_active() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.account_is_active() TO authenticated;
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('CREATE POLICY "Block account pending deletion" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING(public.account_is_active()) WITH CHECK(public.account_is_active())',t.tablename);
  END LOOP;
END $$;
CREATE POLICY "Block deleting accounts storage writes" ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
USING(public.account_is_active()) WITH CHECK(public.account_is_active());
CREATE FUNCTION public.prevent_deleted_buyer_order() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM privacy.deletion_jobs WHERE user_id=NEW.buyer_user_id) THEN RAISE EXCEPTION 'account_deletion_in_progress' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM public.events e JOIN public.organizer_accounts a ON a.id=e.organizer_id WHERE e.id=NEW.event_id
   AND (a.owner_user_id IS NULL OR a.status='suspended' OR EXISTS(SELECT 1 FROM privacy.deletion_jobs WHERE user_id=a.owner_user_id))) THEN
   RAISE EXCEPTION 'seller_unavailable' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER prevent_deleted_buyer_order BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.prevent_deleted_buyer_order();

CREATE FUNCTION public.deletion_session_is_recent(p_user_id uuid,p_session_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM auth.sessions WHERE id=p_session_id AND user_id=p_user_id AND created_at>now()-interval '15 minutes');
$$;
CREATE FUNCTION public.store_apple_deletion_token(p_user_id uuid,p_token text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE sid uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM auth.identities WHERE user_id=p_user_id AND provider='apple') THEN RAISE EXCEPTION 'not_apple_account'; END IF;
 IF length(p_token)<16 OR length(p_token)>8192 THEN RAISE EXCEPTION 'invalid_token'; END IF;
 SELECT secret_id INTO sid FROM privacy.apple_credentials WHERE user_id=p_user_id FOR UPDATE;
 IF sid IS NULL THEN
   SELECT vault.create_secret(p_token,'upplin-apple-'||p_user_id::text,'Apple revocation credential') INTO sid;
   INSERT INTO privacy.apple_credentials(user_id,secret_id) VALUES(p_user_id,sid);
 ELSE PERFORM vault.update_secret(sid,p_token);UPDATE privacy.apple_credentials SET updated_at=now() WHERE user_id=p_user_id; END IF;
END $$;

CREATE FUNCTION public.begin_account_deletion(p_user_id uuid,p_receipt_hash text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE jid uuid;em text;
BEGIN
 IF public.has_role(p_user_id,'admin') THEN RAISE EXCEPTION 'support_account_protected'; END IF;
 SELECT email INTO em FROM auth.users WHERE id=p_user_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'account_not_found'; END IF;
 INSERT INTO privacy.deletion_jobs(user_id,receipt_hash,contact_email,test_mode) SELECT p_user_id,p_receipt_hash,em,coalesce((raw_app_meta_data->>'privacy_test')::boolean,false) FROM auth.users WHERE id=p_user_id
 ON CONFLICT(user_id) DO UPDATE SET receipt_hash=excluded.receipt_hash RETURNING id INTO jid;
 INSERT INTO privacy.deletion_objects(job_id,bucket_id,name)
 SELECT jid,o.bucket_id,o.name FROM storage.objects o WHERE o.owner_id=p_user_id::text
 OR (o.bucket_id IN('avatars','user-posts','refund-attachments') AND split_part(o.name,'/',1)=p_user_id::text)
 OR (o.bucket_id='event-images' AND EXISTS(SELECT 1 FROM public.organizer_accounts a WHERE a.owner_user_id=p_user_id
   AND (split_part(o.name,'/',1)=a.id::text OR o.name LIKE 'organizers/'||a.id::text||'-%')))
 ON CONFLICT DO NOTHING;
 RETURN jid;
END $$;
CREATE FUNCTION public.apple_deletion_token_ready(p_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM privacy.apple_credentials WHERE user_id=p_user_id);
$$;
CREATE FUNCTION public.deletion_context(p_job_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('job',to_jsonb(j),'apple',EXISTS(SELECT 1 FROM auth.identities WHERE user_id=j.user_id AND provider='apple'),
  'apple_subject',(SELECT coalesce(identity_data->>'sub',provider_id) FROM auth.identities WHERE user_id=j.user_id AND provider='apple' LIMIT 1),
  'apple_token',(SELECT d.decrypted_secret FROM privacy.apple_credentials a JOIN vault.decrypted_secrets d ON d.id=a.secret_id WHERE a.user_id=j.user_id),
  'subscriptions',coalesce((SELECT jsonb_agg(s.mp_subscription_id) FROM public.organizer_subscriptions s JOIN public.organizer_accounts a ON a.id=s.organizer_id WHERE a.owner_user_id=j.user_id AND s.mp_subscription_id IS NOT NULL),'[]'::jsonb),
  'mp_accounts',coalesce((SELECT jsonb_agg(jsonb_build_object('user_id',m.mp_user_id,'token',m.mp_access_token)) FROM public.organizer_mp_accounts m JOIN public.organizer_accounts a ON a.id=m.organizer_id WHERE a.owner_user_id=j.user_id),'[]'::jsonb))
 FROM privacy.deletion_jobs j WHERE j.id=p_job_id;
$$;
CREATE FUNCTION public.claim_deletion_job(p_job_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE privacy.deletion_jobs SET lease_until=now()+interval '2 minutes',attempts=attempts+1,updated_at=now()
 WHERE id=p_job_id AND (lease_until IS NULL OR lease_until<now()) AND status<>'completed';
 RETURN FOUND;
END $$;
CREATE FUNCTION public.deletion_objects_batch(p_job_id uuid) RETURNS TABLE(bucket_id text,name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT bucket_id,name FROM privacy.deletion_objects WHERE job_id=p_job_id AND removed_at IS NULL LIMIT 100;
$$;
CREATE FUNCTION public.mark_deletion_objects(p_job_id uuid,p_bucket text,p_names text[]) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 UPDATE privacy.deletion_objects SET removed_at=now() WHERE job_id=p_job_id AND bucket_id=p_bucket AND name=ANY(p_names);
$$;

CREATE FUNCTION public.erase_account_personal_data(p_job_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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

CREATE FUNCTION public.update_deletion_job(p_job_id uuid,p_stage text,p_error text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_stage='providers_revoked' THEN UPDATE privacy.deletion_jobs SET providers_revoked=true WHERE id=p_job_id;
 ELSIF p_stage='auth_erased' THEN
  UPDATE auth.audit_log_entries a SET payload=jsonb_build_object('action',a.payload->>'action','actor_id',j.anonymous_id::text,'log_type',a.payload->>'log_type')
  FROM privacy.deletion_jobs j WHERE j.id=p_job_id AND position(j.user_id::text IN a.payload::text)>0;
  UPDATE privacy.deletion_jobs SET auth_erased=true WHERE id=p_job_id;
 ELSIF p_stage='completed' THEN
  IF NOT EXISTS(SELECT 1 FROM privacy.deletion_jobs WHERE id=p_job_id AND data_erased AND auth_erased) THEN RAISE EXCEPTION 'deletion_incomplete'; END IF;
  UPDATE privacy.deletion_jobs SET status='completed',completed_at=now(),lease_until=NULL,error_code=NULL WHERE id=p_job_id;
 ELSIF p_stage='confirmation_sent' THEN UPDATE privacy.deletion_jobs SET confirmation_sent=true,contact_email=NULL WHERE id=p_job_id;
 ELSIF p_stage='retry' THEN UPDATE privacy.deletion_jobs SET lease_until=NULL,error_code=left(p_error,80) WHERE id=p_job_id;
 ELSE RAISE EXCEPTION 'invalid_stage'; END IF;
 UPDATE privacy.deletion_jobs SET updated_at=now() WHERE id=p_job_id;
END $$;
CREATE FUNCTION public.deletion_job_status(p_job_id uuid,p_receipt_hash text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('status',status,'created_at',created_at,'completed_at',completed_at) FROM privacy.deletion_jobs WHERE id=p_job_id AND receipt_hash=p_receipt_hash;
$$;
CREATE FUNCTION public.pending_deletion_jobs() RETURNS TABLE(id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT id FROM privacy.deletion_jobs WHERE (status<>'completed' AND coalesce(lease_until,now()-interval '1 second')<now()) OR (status='completed' AND NOT confirmation_sent AND contact_email IS NOT NULL AND completed_at>now()-interval '30 days') ORDER BY created_at LIMIT 5;
$$;
CREATE FUNCTION public.prune_privacy_retention() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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
CREATE FUNCTION public.record_private_access(p_user_id uuid,p_ip inet) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 INSERT INTO privacy.access_logs(user_id,ip) VALUES(p_user_id,p_ip);
$$;
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT oid::regprocedure fn FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN(
 'apple_deletion_token_ready','deletion_session_is_recent','store_apple_deletion_token','begin_account_deletion','deletion_context','claim_deletion_job','deletion_objects_batch',
 'mark_deletion_objects','erase_account_personal_data','update_deletion_job','deletion_job_status','pending_deletion_jobs','prune_privacy_retention','record_private_access') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',p.fn);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',p.fn);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.prevent_deleted_buyer_order() FROM PUBLIC,anon,authenticated;
SELECT cron.schedule('upplin-prune-privacy-retention','10 3 * * *','SELECT public.prune_privacy_retention()');
SELECT cron.schedule('upplin-account-deletion-worker','* * * * *',$cmd$SELECT net.http_post(
 url:='https://ermhzlthjlolqsbtjawf.supabase.co/functions/v1/privacy-worker',
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='upplin_cron_auth')),
 body:='{}'::jsonb,timeout_milliseconds:=10000);$cmd$);

NOTIFY pgrst, 'reload schema';
