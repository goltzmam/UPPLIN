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
 ELSIF TG_TABLE_NAME='profiles' THEN
  text_value:=NEW.full_name;has_media:=NEW.photo_url IS NOT NULL OR NEW.cover_photo_url IS NOT NULL;
  IF TG_OP='UPDATE' THEN media_changed:=NEW.photo_url IS DISTINCT FROM OLD.photo_url OR NEW.cover_photo_url IS DISTINCT FROM OLD.cover_photo_url;ELSE media_changed:=has_media;END IF;
 ELSE
  text_value:=NEW.display_name||' '||coalesce(NEW.description,'');has_media:=NEW.logo_url IS NOT NULL;
  IF TG_OP='UPDATE' THEN media_changed:=NEW.logo_url IS DISTINCT FROM OLD.logo_url;ELSE media_changed:=has_media;END IF;
 END IF;
 IF old_hidden OR old_pending OR public.ugc_text_needs_review(text_value) OR (has_media AND media_changed) THEN NEW.moderation_status:='pending';
 ELSE NEW.moderation_status:='approved';END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.moderation_queue() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE reports jsonb;pending jsonb;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso restrito ao suporte.' USING ERRCODE='42501';END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]') INTO reports FROM (
 SELECT r.*,p.full_name target_name FROM public.content_reports r LEFT JOIN public.profiles p ON p.id=r.target_user_id ORDER BY CASE WHEN status IN('open','reviewing') THEN 0 ELSE 1 END,created_at LIMIT 200) r;
 SELECT coalesce(jsonb_agg(to_jsonb(c)),'[]') INTO pending FROM (
 SELECT 'post' kind,id,user_id author_id,content,media_url,NULL::text cover_url,'Publicação' label,created_at FROM public.user_posts WHERE moderation_status='pending'
 UNION ALL SELECT 'comment',id,user_id,content,NULL,NULL,'Comentário',created_at FROM public.user_post_comments WHERE moderation_status='pending'
 UNION ALL SELECT 'profile',id,id,full_name,photo_url,cover_photo_url,'Perfil do participante',created_at FROM public.profiles WHERE moderation_status='pending'
 UNION ALL SELECT 'organizer',id,owner_user_id,display_name||' — '||coalesce(description,''),logo_url,NULL,'Perfil do organizador',created_at FROM public.organizer_accounts WHERE moderation_status='pending'
 ORDER BY created_at LIMIT 200) c;
 RETURN jsonb_build_object('reports',reports,'pending',pending);
END $$;

-- Apply the filter to legacy media as well, without trusting user-supplied
-- moderation state. Official support accounts are managed separately.
UPDATE public.user_posts SET moderation_status='pending' WHERE moderation_status='approved' AND (media_url IS NOT NULL OR public.ugc_text_needs_review(content));
UPDATE public.user_post_comments SET moderation_status='pending' WHERE moderation_status='approved' AND public.ugc_text_needs_review(content);
UPDATE public.profiles SET moderation_status='pending' WHERE NOT public.has_role(id,'admin') AND (photo_url IS NOT NULL OR cover_photo_url IS NOT NULL OR public.ugc_text_needs_review(full_name));
UPDATE public.organizer_accounts SET moderation_status='pending' WHERE NOT public.has_role(owner_user_id,'admin') AND (logo_url IS NOT NULL OR public.ugc_text_needs_review(display_name||' '||coalesce(description,'')));
REVOKE ALL ON public.user_blocks,public.content_reports FROM PUBLIC;
-- Private identities remain available to support, while blocked users cannot
-- use the chat identity RPC as an alternate public profile endpoint.
DO $$ DECLARE def text;BEGIN
 SELECT pg_get_functiondef(oid) INTO def FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='get_chat_identities';
 IF position(') o ON true;' IN def)=0 THEN RAISE EXCEPTION 'Unexpected chat identity function version';END IF;
 def:=replace(def,') o ON true;',') o ON true WHERE public.ugc_author_visible(x.uid);');EXECUTE def;
END $$;
-- Serialize report creation per reporter before checking the hourly budget.
DO $$ DECLARE def text;BEGIN
 SELECT pg_get_functiondef(oid) INTO def FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='report_content';
 def:=replace(def,'PERFORM public.ensure_active_account();',E'PERFORM public.ensure_active_account();\n PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(''ugc-report-''||auth.uid()::text,0));');
 EXECUTE def;
END $$;
