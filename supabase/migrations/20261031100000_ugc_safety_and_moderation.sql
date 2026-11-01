CREATE TABLE public.user_blocks (
 blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(blocker_id,blocked_id),CHECK(blocker_id<>blocked_id)
);
CREATE INDEX user_blocks_reverse ON public.user_blocks(blocked_id,blocker_id);
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_blocks FROM anon,authenticated;
GRANT SELECT ON public.user_blocks TO authenticated;
CREATE POLICY own_blocks ON public.user_blocks FOR SELECT TO authenticated USING(blocker_id=auth.uid());
CREATE TABLE public.content_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,target_kind text NOT NULL CHECK(target_kind IN('post','comment','profile')),
 target_id uuid NOT NULL,reason text NOT NULL CHECK(reason IN('sexual','violence','hate','harassment','fraud','spam','other')),
 details text NOT NULL DEFAULT '' CHECK(length(details)<=1000),evidence jsonb NOT NULL DEFAULT '{}',
 status text NOT NULL DEFAULT 'open' CHECK(status IN('open','reviewing','resolved','dismissed')),
 created_at timestamptz NOT NULL DEFAULT now(),due_at timestamptz NOT NULL DEFAULT(now()+interval '24 hours'),
 resolved_at timestamptz,resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,resolution_note text NOT NULL DEFAULT '' CHECK(length(resolution_note)<=1000)
);
CREATE UNIQUE INDEX content_reports_open_unique ON public.content_reports(reporter_id,target_kind,target_id) WHERE status IN('open','reviewing');
CREATE INDEX content_reports_queue ON public.content_reports(status,created_at);
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.content_reports FROM anon,authenticated;
GRANT SELECT ON public.content_reports TO authenticated;
CREATE POLICY support_reports ON public.content_reports FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));

ALTER TABLE public.user_posts ADD COLUMN moderation_status text NOT NULL DEFAULT 'approved' CHECK(moderation_status IN('approved','pending','hidden'));
ALTER TABLE public.user_post_comments ADD COLUMN moderation_status text NOT NULL DEFAULT 'approved' CHECK(moderation_status IN('approved','pending','hidden'));
ALTER TABLE public.profiles ADD COLUMN moderation_status text NOT NULL DEFAULT 'approved' CHECK(moderation_status IN('approved','pending','hidden'));
ALTER TABLE public.organizer_accounts ADD COLUMN moderation_status text NOT NULL DEFAULT 'approved' CHECK(moderation_status IN('approved','pending','hidden'));

CREATE FUNCTION public.ugc_user_blocked(p_other uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.user_blocks WHERE (blocker_id=auth.uid() AND blocked_id=p_other) OR (blocked_id=auth.uid() AND blocker_id=p_other));
$$;
CREATE FUNCTION public.ugc_author_visible(p_author uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p_author IS NOT NULL AND (p_author=auth.uid() OR public.has_role(auth.uid(),'admin') OR
 (NOT public.ugc_user_blocked(p_author) AND NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_author AND moderation_status='hidden')
 AND NOT EXISTS(SELECT 1 FROM public.organizer_accounts WHERE owner_user_id=p_author AND moderation_status='hidden')));
$$;
CREATE FUNCTION public.ugc_text_needs_review(p_text text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT lower(translate(coalesce(p_text,''),'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc')) ~
 '(pornograf|sexo explicito|conteudo sexual explicito|exploracao sexual|abuso sexual|estupro|ameaca de morte|vou te matar|terrorismo|trafico de drogas|nazismo|supremacia racial|filho da puta|vai se foder)' OR length(coalesce(p_text,''))>5000;
$$;
CREATE FUNCTION public.moderate_ugc_write() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE text_value text;has_media boolean:=false;old_hidden boolean:=false;old_pending boolean:=false;media_changed boolean:=false;
BEGIN
 IF coalesce(auth.role(),'') IN('','service_role') OR public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
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
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['user_posts','user_post_comments','profiles','organizer_accounts'] LOOP
 EXECUTE format('CREATE TRIGGER moderate_ugc_write BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.moderate_ugc_write()',t);
END LOOP;END $$;
REVOKE ALL ON FUNCTION public.moderate_ugc_write() FROM PUBLIC,anon,authenticated;

CREATE POLICY ugc_visible_posts ON public.user_posts AS RESTRICTIVE FOR SELECT TO anon,authenticated USING
 (public.has_role(auth.uid(),'admin') OR user_id=auth.uid() OR (moderation_status='approved' AND public.ugc_author_visible(user_id)));
CREATE POLICY ugc_visible_comments ON public.user_post_comments AS RESTRICTIVE FOR SELECT TO anon,authenticated USING
 ((public.has_role(auth.uid(),'admin') OR user_id=auth.uid() OR (moderation_status='approved' AND public.ugc_author_visible(user_id)))
 AND EXISTS(SELECT 1 FROM public.user_posts WHERE id=post_id));
CREATE POLICY ugc_visible_likes ON public.user_post_likes AS RESTRICTIVE FOR SELECT TO anon,authenticated USING
 (public.ugc_author_visible(user_id) AND EXISTS(SELECT 1 FROM public.user_posts WHERE id=post_id));
CREATE POLICY ugc_parent_comments ON public.user_post_comments AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK
 (EXISTS(SELECT 1 FROM public.user_posts WHERE id=post_id AND public.ugc_author_visible(user_id)));
CREATE POLICY ugc_parent_likes ON public.user_post_likes AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK
 (EXISTS(SELECT 1 FROM public.user_posts WHERE id=post_id AND moderation_status='approved' AND public.ugc_author_visible(user_id)));

CREATE OR REPLACE VIEW public.profiles_public AS SELECT id,
 CASE WHEN moderation_status='approved' OR id=auth.uid() OR public.has_role(auth.uid(),'admin') THEN full_name ELSE 'Perfil em análise' END full_name,
 CASE WHEN moderation_status='approved' OR id=auth.uid() OR public.has_role(auth.uid(),'admin') THEN photo_url END photo_url,
 CASE WHEN moderation_status='approved' OR id=auth.uid() OR public.has_role(auth.uid(),'admin') THEN cover_photo_url END cover_photo_url
 FROM public.profiles WHERE public.ugc_author_visible(id);
CREATE OR REPLACE VIEW public.organizer_accounts_public AS SELECT id,
 CASE WHEN moderation_status='approved' OR owner_user_id=auth.uid() OR public.has_role(auth.uid(),'admin') THEN display_name ELSE 'Organizador em análise' END display_name,
 slug,CASE WHEN moderation_status='approved' OR owner_user_id=auth.uid() OR public.has_role(auth.uid(),'admin') THEN description END description,
 CASE WHEN moderation_status='approved' OR owner_user_id=auth.uid() OR public.has_role(auth.uid(),'admin') THEN logo_url END logo_url,
 social_instagram,social_facebook,social_website,status,city,state,created_at,updated_at
 FROM public.organizer_accounts WHERE status='active' AND public.ugc_author_visible(owner_user_id);
CREATE OR REPLACE VIEW public.organizer_accounts_feed AS SELECT id,owner_user_id,status FROM public.organizer_accounts
 WHERE status='active' AND public.ugc_author_visible(owner_user_id);

CREATE FUNCTION public.set_user_block(p_user_id uuid,p_blocked boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM public.ensure_active_account();
 IF p_user_id=auth.uid() OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user_id) OR public.has_role(p_user_id,'admin') THEN RAISE EXCEPTION 'Este perfil não pode ser bloqueado.'; END IF;
 IF p_blocked THEN INSERT INTO public.user_blocks(blocker_id,blocked_id) VALUES(auth.uid(),p_user_id) ON CONFLICT DO NOTHING;
 ELSE DELETE FROM public.user_blocks WHERE blocker_id=auth.uid() AND blocked_id=p_user_id;END IF;
END $$;
CREATE FUNCTION public.my_blocked_users() RETURNS TABLE(user_id uuid,display_name text,created_at timestamptz) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT b.blocked_id,coalesce(nullif(p.full_name,''),'Usuário'),b.created_at FROM public.user_blocks b LEFT JOIN public.profiles p ON p.id=b.blocked_id WHERE blocker_id=auth.uid() ORDER BY b.created_at DESC;
$$;
CREATE FUNCTION public.report_content(p_kind text,p_target uuid,p_reason text,p_details text DEFAULT '') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target_user uuid;proof jsonb;existing uuid;rid uuid;
BEGIN
 PERFORM public.ensure_active_account();
 IF p_kind='post' THEN SELECT user_id,jsonb_build_object('content',content,'media_url',media_url,'media_type',media_type) INTO target_user,proof FROM public.user_posts WHERE id=p_target;
 ELSIF p_kind='comment' THEN SELECT user_id,jsonb_build_object('content',content,'post_id',post_id) INTO target_user,proof FROM public.user_post_comments WHERE id=p_target;
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
CREATE FUNCTION public.guard_blocked_chat() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a uuid;b uuid;
BEGIN
 IF coalesce(auth.role(),'') IN('','service_role') OR public.has_role(auth.uid(),'admin') THEN RETURN NEW;END IF;
 IF TG_TABLE_NAME='messages' THEN SELECT participant_1_id,participant_2_id INTO a,b FROM public.conversations WHERE id=NEW.conversation_id;
 ELSE a:=NEW.participant_1_id;b:=NEW.participant_2_id;END IF;
 IF EXISTS(SELECT 1 FROM public.user_blocks WHERE (blocker_id=a AND blocked_id=b) OR (blocker_id=b AND blocked_id=a))
 OR EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND moderation_status='hidden') THEN
 RAISE EXCEPTION 'Não é possível conversar com este perfil.' USING ERRCODE='42501';END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_blocked_message BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.guard_blocked_chat();
CREATE TRIGGER guard_blocked_conversation BEFORE INSERT ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.guard_blocked_chat();
REVOKE ALL ON FUNCTION public.guard_blocked_chat() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE def text; BEGIN
 SELECT pg_get_functiondef(oid) INTO def FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='start_chat';
 IF position('PERFORM pg_catalog.pg_advisory_xact_lock' IN def)=0 THEN RAISE EXCEPTION 'Unexpected chat function version';END IF;
 def:=replace(def,'PERFORM pg_catalog.pg_advisory_xact_lock',E'IF public.ugc_user_blocked(other_id) THEN RAISE EXCEPTION ''Este perfil está bloqueado.'' USING ERRCODE=''42501''; END IF;\n  PERFORM pg_catalog.pg_advisory_xact_lock');
 EXECUTE def;
END $$;

CREATE FUNCTION public.moderation_queue() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE reports jsonb;pending jsonb;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso restrito ao suporte.' USING ERRCODE='42501';END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]') INTO reports FROM (
 SELECT r.*,p.full_name target_name FROM public.content_reports r LEFT JOIN public.profiles p ON p.id=r.target_user_id ORDER BY CASE WHEN status IN('open','reviewing') THEN 0 ELSE 1 END,created_at LIMIT 200) r;
 SELECT coalesce(jsonb_agg(to_jsonb(c)),'[]') INTO pending FROM (
 SELECT 'post' kind,id,user_id author_id,content,media_url,'Publicação' label,created_at FROM public.user_posts WHERE moderation_status='pending'
 UNION ALL SELECT 'comment',id,user_id,content,NULL,'Comentário',created_at FROM public.user_post_comments WHERE moderation_status='pending'
 UNION ALL SELECT 'profile',id,id,full_name,photo_url,'Perfil do participante',created_at FROM public.profiles WHERE moderation_status='pending'
 UNION ALL SELECT 'organizer',id,owner_user_id,display_name||' — '||coalesce(description,''),logo_url,'Perfil do organizador',created_at FROM public.organizer_accounts WHERE moderation_status='pending'
 ORDER BY created_at LIMIT 200) c;
 RETURN jsonb_build_object('reports',reports,'pending',pending);
END $$;
CREATE FUNCTION public.review_ugc(p_kind text,p_id uuid,p_action text,p_report_id uuid DEFAULT NULL,p_note text DEFAULT '') RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target_table text;report_row public.content_reports%rowtype;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso restrito ao suporte.' USING ERRCODE='42501';END IF;
 IF length(coalesce(p_note,''))>1000 OR p_action NOT IN('approve','hide','reviewing','dismiss') THEN RAISE EXCEPTION 'Ação inválida.';END IF;
 IF p_report_id IS NOT NULL THEN
  SELECT * INTO report_row FROM public.content_reports WHERE id=p_report_id FOR UPDATE;
  IF NOT FOUND OR report_row.target_kind<>p_kind OR report_row.target_id<>p_id THEN RAISE EXCEPTION 'Denúncia inválida.';END IF;
 END IF;
 target_table:=CASE p_kind WHEN 'post' THEN 'user_posts' WHEN 'comment' THEN 'user_post_comments' WHEN 'profile' THEN 'profiles' WHEN 'organizer' THEN 'organizer_accounts' END;
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
CREATE FUNCTION privacy.erase_ugc_report_evidence() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.data_erased AND NOT OLD.data_erased THEN
  UPDATE public.content_reports SET evidence='{}',details='',resolution_note='',reporter_id=CASE WHEN reporter_id=NEW.user_id THEN NULL ELSE reporter_id END,
   target_user_id=CASE WHEN target_user_id=NEW.user_id THEN NULL ELSE target_user_id END
   WHERE reporter_id=NEW.user_id OR target_user_id=NEW.user_id;
  DELETE FROM public.user_blocks WHERE blocker_id=NEW.user_id OR blocked_id=NEW.user_id;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER erase_ugc_report_evidence BEFORE UPDATE OF data_erased ON privacy.deletion_jobs FOR EACH ROW EXECUTE FUNCTION privacy.erase_ugc_report_evidence();
REVOKE ALL ON FUNCTION privacy.erase_ugc_report_evidence() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE p record; BEGIN FOR p IN SELECT oid::regprocedure fn,proname FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN
 ('ugc_user_blocked','ugc_author_visible','ugc_text_needs_review','set_user_block','my_blocked_users','report_content','moderation_queue','review_ugc') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',p.fn);
 EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated,service_role',p.fn);
 IF p.proname IN('ugc_author_visible','ugc_user_blocked') THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon',p.fn);END IF;
END LOOP;END $$;
