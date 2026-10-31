ALTER TABLE public.event_reviews ADD COLUMN moderation_status text NOT NULL DEFAULT 'approved' CHECK(moderation_status IN('approved','pending','hidden'));
ALTER TABLE public.content_reports DROP CONSTRAINT content_reports_target_kind_check;
ALTER TABLE public.content_reports ADD CONSTRAINT content_reports_target_kind_check CHECK(target_kind IN('post','comment','profile','review'));
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
 SELECT r.*,p.full_name target_name FROM public.content_reports r LEFT JOIN public.profiles p ON p.id=r.target_user_id ORDER BY CASE WHEN r.status IN('open','reviewing') THEN 0 ELSE 1 END,r.created_at LIMIT 200) r;
 SELECT coalesce(jsonb_agg(to_jsonb(c)),'[]') INTO pending FROM (
 SELECT 'post' kind,id,user_id author_id,content,media_url,NULL::text cover_url,'Publicação' label,created_at FROM public.user_posts WHERE moderation_status='pending'
 UNION ALL SELECT 'comment',id,user_id,content,NULL,NULL,'Comentário',created_at FROM public.user_post_comments WHERE moderation_status='pending'
 UNION ALL SELECT 'review',id,user_id,comment,NULL,NULL,'Avaliação do evento',created_at FROM public.event_reviews WHERE moderation_status='pending'
 UNION ALL SELECT 'profile',id,id,full_name,photo_url,cover_photo_url,'Perfil do participante',created_at FROM public.profiles WHERE moderation_status='pending'
 UNION ALL SELECT 'organizer',id,owner_user_id,display_name||' — '||coalesce(description,''),logo_url,NULL,'Perfil do organizador',created_at FROM public.organizer_accounts WHERE moderation_status='pending'
 ORDER BY created_at LIMIT 200) c;
 RETURN jsonb_build_object('reports',reports,'pending',pending);
END $$;


CREATE OR REPLACE FUNCTION public.report_content(p_kind text,p_target uuid,p_reason text,p_details text DEFAULT '') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target_user uuid;proof jsonb;existing uuid;rid uuid;
BEGIN
 PERFORM public.ensure_active_account();
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ugc-report-'||auth.uid()::text,0));
 IF p_kind='post' THEN SELECT user_id,jsonb_build_object('content',content,'media_url',media_url,'media_type',media_type) INTO target_user,proof FROM public.user_posts WHERE id=p_target;
 ELSIF p_kind='comment' THEN SELECT user_id,jsonb_build_object('content',content,'post_id',post_id) INTO target_user,proof FROM public.user_post_comments WHERE id=p_target;
 ELSIF p_kind='review' THEN SELECT user_id,jsonb_build_object('content',comment,'rating',rating,'event_id',event_id) INTO target_user,proof FROM public.event_reviews WHERE id=p_target;
 ELSIF p_kind='profile' THEN SELECT id,jsonb_build_object('name',full_name,'photo_url',photo_url) INTO target_user,proof FROM public.profiles WHERE id=p_target;
 ELSE RAISE EXCEPTION 'Tipo inválido.';END IF;
 IF target_user IS NULL OR target_user=auth.uid() THEN RAISE EXCEPTION 'Não foi possível denunciar este conteúdo.';END IF;
 IF p_reason NOT IN('sexual','violence','hate','harassment','fraud','spam','other') OR length(coalesce(p_details,''))>1000 THEN RAISE EXCEPTION 'Confira os dados da denúncia.';END IF;
 SELECT id INTO existing FROM public.content_reports WHERE reporter_id=auth.uid() AND target_kind=p_kind AND target_id=p_target AND status IN('open','reviewing');
 IF existing IS NOT NULL THEN RETURN existing;END IF;
 IF (SELECT count(*) FROM public.content_reports WHERE reporter_id=auth.uid() AND created_at>now()-interval '1 hour')>=10 THEN RAISE EXCEPTION 'Aguarde antes de enviar novas denúncias.';END IF;
 INSERT INTO public.content_reports(reporter_id,target_user_id,target_kind,target_id,reason,details,evidence)
 VALUES(auth.uid(),target_user,p_kind,p_target,p_reason,coalesce(p_details,''),proof)
 ON CONFLICT(reporter_id,target_kind,target_id) WHERE status IN('open','reviewing') DO UPDATE SET target_id=excluded.target_id RETURNING id INTO rid;
 RETURN rid;
END $$;
CREATE OR REPLACE FUNCTION public.review_ugc(p_kind text,p_id uuid,p_action text,p_report_id uuid DEFAULT NULL,p_note text DEFAULT '') RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target_table text;report_row public.content_reports%rowtype;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso restrito ao suporte.' USING ERRCODE='42501';END IF;
 IF length(coalesce(p_note,''))>1000 OR p_action NOT IN('approve','hide','reviewing','dismiss') THEN RAISE EXCEPTION 'Ação inválida.';END IF;
 IF p_report_id IS NOT NULL THEN
  SELECT * INTO report_row FROM public.content_reports WHERE id=p_report_id FOR UPDATE;
  IF NOT FOUND OR report_row.target_kind<>p_kind OR report_row.target_id<>p_id THEN RAISE EXCEPTION 'Denúncia inválida.';END IF;
 END IF;
 target_table:=CASE p_kind WHEN 'post' THEN 'user_posts' WHEN 'comment' THEN 'user_post_comments' WHEN 'review' THEN 'event_reviews' WHEN 'profile' THEN 'profiles' WHEN 'organizer' THEN 'organizer_accounts' END;
 IF target_table IS NULL THEN RAISE EXCEPTION 'Conteúdo inválido.';END IF;
 IF p_action IN('approve','hide') THEN
  IF p_kind='profile' AND public.has_role(p_id,'admin') THEN RAISE EXCEPTION 'Perfil oficial protegido.';END IF;
  EXECUTE format('UPDATE public.%I SET moderation_status=$1 WHERE id=$2',target_table) USING CASE WHEN p_action='approve' THEN 'approved' ELSE 'hidden' END,p_id;
 END IF;
 IF p_report_id IS NOT NULL THEN
  UPDATE public.content_reports SET status=CASE p_action WHEN 'reviewing' THEN 'reviewing' WHEN 'dismiss' THEN 'dismissed' ELSE 'resolved' END,
   resolved_at=CASE WHEN p_action='reviewing' THEN NULL ELSE now() END,resolved_by=auth.uid(),resolution_note=coalesce(p_note,'') WHERE id=p_report_id;
 END IF;
END $$;

CREATE TRIGGER moderate_event_review BEFORE INSERT OR UPDATE ON public.event_reviews FOR EACH ROW EXECUTE FUNCTION public.moderate_ugc_write();
CREATE POLICY ugc_visible_reviews ON public.event_reviews AS RESTRICTIVE FOR SELECT TO anon,authenticated USING(public.has_role(auth.uid(),'admin') OR user_id=auth.uid() OR (moderation_status='approved' AND public.ugc_author_visible(user_id)));
UPDATE public.event_reviews SET moderation_status='pending' WHERE public.ugc_text_needs_review(comment);
