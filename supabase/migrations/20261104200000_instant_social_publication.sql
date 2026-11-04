-- Publish ordinary social content immediately; preserve text filters, reports, blocks and hidden content.
CREATE OR REPLACE FUNCTION public.moderate_ugc_write() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE text_value text;has_media boolean:=false;old_hidden boolean:=false;old_pending boolean:=false;media_changed boolean:=false;
BEGIN
 IF auth.role()='service_role' OR public.has_role(auth.uid(),'admin') OR (coalesce(auth.role(),'')='' AND TG_OP='UPDATE') THEN RETURN NEW; END IF;
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND moderation_status='hidden') THEN RAISE EXCEPTION 'Sua conta está restrita. Entre em contato com o suporte.' USING ERRCODE='42501'; END IF;
 IF TG_OP='UPDATE' THEN
  old_hidden:=OLD.moderation_status='hidden';old_pending:=OLD.moderation_status='pending';
  IF NEW.moderation_status<>OLD.moderation_status THEN RAISE EXCEPTION 'A revisão é feita pelo suporte.' USING ERRCODE='42501'; END IF;
 END IF;
 IF TG_TABLE_NAME='user_posts' THEN
  text_value:=NEW.content;has_media:=NEW.media_url IS NOT NULL;
  IF TG_OP='UPDATE' THEN media_changed:=NEW.media_url IS DISTINCT FROM OLD.media_url;
   IF NEW.user_id<>OLD.user_id OR NEW.event_id IS DISTINCT FROM OLD.event_id THEN RAISE EXCEPTION 'Autor e evento não podem ser alterados.'; END IF;
  ELSE media_changed:=has_media;END IF;
 ELSIF TG_TABLE_NAME='user_post_comments' THEN
  text_value:=NEW.content;
  IF TG_OP='UPDATE' AND (NEW.user_id<>OLD.user_id OR NEW.post_id<>OLD.post_id) THEN RAISE EXCEPTION 'Autor e publicação não podem ser alterados.'; END IF;
 ELSIF TG_TABLE_NAME='event_reviews' THEN
  text_value:=NEW.comment;
  IF TG_OP='UPDATE' AND (NEW.user_id<>OLD.user_id OR NEW.event_id<>OLD.event_id) THEN RAISE EXCEPTION 'Autor e evento não podem ser alterados.';END IF;
 ELSIF TG_TABLE_NAME='event_comments' THEN
  text_value:=NEW.content;
  IF TG_OP='UPDATE' AND (NEW.user_id<>OLD.user_id OR NEW.event_id<>OLD.event_id OR NEW.parent_id IS DISTINCT FROM OLD.parent_id) THEN RAISE EXCEPTION 'Autor e evento não podem ser alterados.';END IF;
  IF TG_OP='INSERT' AND NEW.parent_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.event_comments p WHERE p.id=NEW.parent_id AND public.ugc_author_visible(p.user_id) AND (p.moderation_status='approved' OR p.user_id=auth.uid())) THEN RAISE EXCEPTION 'Não foi possível responder a este comentário.' USING ERRCODE='42501';END IF;
 ELSIF TG_TABLE_NAME='profiles' THEN
  text_value:=NEW.full_name;has_media:=NEW.photo_url IS NOT NULL OR NEW.cover_photo_url IS NOT NULL;
  IF TG_OP='UPDATE' THEN media_changed:=NEW.photo_url IS DISTINCT FROM OLD.photo_url OR NEW.cover_photo_url IS DISTINCT FROM OLD.cover_photo_url;ELSE media_changed:=has_media;END IF;
 ELSE
  text_value:=NEW.display_name||' '||coalesce(NEW.description,'');has_media:=NEW.logo_url IS NOT NULL;
  IF TG_OP='UPDATE' THEN media_changed:=NEW.logo_url IS DISTINCT FROM OLD.logo_url;ELSE media_changed:=has_media;END IF;
 END IF;
 -- Text filters run automatically; ordinary media does not wait for manual approval.
 IF public.ugc_text_needs_review(text_value) THEN
  RAISE EXCEPTION 'Revise o texto: ele contém conteúdo que não é permitido na UPPLIN.' USING ERRCODE='23514';
 END IF;
 IF old_hidden THEN NEW.moderation_status:='hidden';
 ELSE NEW.moderation_status:='approved';END IF;
 RETURN NEW;
END $$;

UPDATE public.user_posts t SET moderation_status='approved'
WHERE moderation_status='pending' AND NOT public.ugc_text_needs_review(content)
AND NOT EXISTS(SELECT 1 FROM public.content_reports r WHERE (r.target_id=t.id OR r.target_user_id=t.user_id) AND r.status IN('open','reviewing'))
AND NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=t.user_id AND p.moderation_status='hidden');

UPDATE public.user_post_comments t SET moderation_status='approved'
WHERE moderation_status='pending' AND NOT public.ugc_text_needs_review(content)
AND NOT EXISTS(SELECT 1 FROM public.content_reports r WHERE (r.target_id=t.id OR r.target_user_id=t.user_id) AND r.status IN('open','reviewing'))
AND NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=t.user_id AND p.moderation_status='hidden');

UPDATE public.event_reviews t SET moderation_status='approved'
WHERE moderation_status='pending' AND NOT public.ugc_text_needs_review(comment)
AND NOT EXISTS(SELECT 1 FROM public.content_reports r WHERE (r.target_id=t.id OR r.target_user_id=t.user_id) AND r.status IN('open','reviewing'))
AND NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=t.user_id AND p.moderation_status='hidden');

UPDATE public.profiles t SET moderation_status='approved'
WHERE moderation_status='pending' AND NOT public.ugc_text_needs_review(full_name)
AND NOT EXISTS(SELECT 1 FROM public.content_reports r WHERE (r.target_id=t.id OR r.target_user_id=t.id) AND r.status IN('open','reviewing'))
AND NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=t.id AND p.moderation_status='hidden');

UPDATE public.organizer_accounts t SET moderation_status='approved'
WHERE moderation_status='pending' AND NOT public.ugc_text_needs_review(display_name||' '||coalesce(description,''))
AND NOT EXISTS(SELECT 1 FROM public.content_reports r WHERE (r.target_id=t.id OR r.target_user_id=t.owner_user_id) AND r.status IN('open','reviewing'))
AND NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=t.owner_user_id AND p.moderation_status='hidden');

UPDATE storage.buckets SET allowed_mime_types=array_append(allowed_mime_types,'video/quicktime') WHERE id='user-posts' AND allowed_mime_types IS NOT NULL AND NOT ('video/quicktime'=ANY(allowed_mime_types));

UPDATE public.event_comments t SET moderation_status='approved'
WHERE moderation_status='pending' AND NOT public.ugc_text_needs_review(content)
AND NOT EXISTS(SELECT 1 FROM public.content_reports r WHERE (r.target_id=t.id OR r.target_user_id=t.user_id) AND r.status IN('open','reviewing'))
AND NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=t.user_id AND p.moderation_status='hidden');

-- Keep real report alerts; technical regression fixtures must never email account owners.
CREATE OR REPLACE FUNCTION public.notify_content_report()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE a record;
BEGIN
 -- Only server-marked disposable technical accounts skip outbound alerts.
 IF EXISTS(SELECT 1 FROM auth.users u WHERE u.id=NEW.reporter_id AND u.raw_app_meta_data->>'privacy_test'='true') THEN RETURN NEW; END IF;
 FOR a IN SELECT r.user_id AS admin_id,u.email FROM public.user_roles r JOIN auth.users u ON u.id=r.user_id WHERE r.role='admin'::public.app_role LOOP
  BEGIN
   INSERT INTO public.notifications(user_id,title,body,type,data)
   VALUES(a.admin_id,'Nova denúncia','Há uma denúncia para analisar no painel.','content_report',pg_catalog.jsonb_build_object('report_id',NEW.id));
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'notify_content_report notification failed: %',SQLERRM;
  END;
  IF a.email IS NOT NULL THEN
   BEGIN
    PERFORM public.enqueue_email('transactional_emails',pg_catalog.jsonb_build_object(
     'to',a.email,
     'subject','Nova denúncia na Upplin',
     'html','<p>Há uma nova denúncia para analisar. Prazo: 24 horas.</p><p>Código: '||NEW.id||'<br>Tipo: '||NEW.target_kind||'<br>Motivo: '||NEW.reason||'</p><p><a href="https://admin.upplin.com/moderation">Abrir Moderação e denúncias</a></p>',
     'text','Há uma nova denúncia para analisar. Prazo: 24 horas. Código: '||NEW.id||'. Tipo: '||NEW.target_kind||'. Motivo: '||NEW.reason||'. Painel: https://admin.upplin.com/moderation',
     'label','content_report',
     'message_id',gen_random_uuid()::text,
     'idempotency_key','content-report-'||NEW.id||'-'||a.admin_id,
     'queued_at',now()));
   EXCEPTION WHEN OTHERS THEN RAISE WARNING 'notify_content_report email failed: %',SQLERRM;
   END;
  END IF;
 END LOOP;
 RETURN NEW;
EXCEPTION WHEN OTHERS THEN
 RAISE WARNING 'notify_content_report failed: %',SQLERRM;
 RETURN NEW;
END $function$;

