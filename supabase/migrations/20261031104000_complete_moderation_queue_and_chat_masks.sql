CREATE OR REPLACE FUNCTION public.moderation_queue() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE reports jsonb;pending jsonb;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso restrito ao suporte.' USING ERRCODE='42501';END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]') INTO reports FROM (
 SELECT r.*,p.full_name target_name FROM public.content_reports r LEFT JOIN public.profiles p ON p.id=r.target_user_id ORDER BY CASE WHEN r.status IN('open','reviewing') THEN 0 ELSE 1 END,r.created_at LIMIT 200) r;
 SELECT coalesce(jsonb_agg(to_jsonb(c)),'[]') INTO pending FROM (
 SELECT 'post' kind,id,user_id author_id,content,media_url,NULL::text cover_url,'Publicação' label,created_at FROM public.user_posts WHERE moderation_status='pending'
 UNION ALL SELECT 'comment',id,user_id,content,NULL,NULL,'Comentário',created_at FROM public.user_post_comments WHERE moderation_status='pending'
 UNION ALL SELECT 'profile',id,id,full_name,photo_url,cover_photo_url,'Perfil do participante',created_at FROM public.profiles WHERE moderation_status='pending'
 UNION ALL SELECT 'organizer',id,owner_user_id,display_name||' — '||coalesce(description,''),logo_url,NULL,'Perfil do organizador',created_at FROM public.organizer_accounts WHERE moderation_status='pending'
 ORDER BY created_at LIMIT 200) c;
 RETURN jsonb_build_object('reports',reports,'pending',pending);
END $$;


CREATE OR REPLACE FUNCTION public.ugc_text_needs_review(p_text text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT translate(lower(normalize(coalesce(p_text,''),NFKC)),'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc') ~
 '(pornograf|sexo explicito|conteudo sexual explicito|exploracao sexual|abuso sexual|estupro|ameaca de morte|vou te matar|terrorismo|trafico de drogas|nazismo|supremacia racial|filho da puta|vai se foder)' OR length(coalesce(p_text,''))>5000;
$$;
DO $$ DECLARE def text;BEGIN
 SELECT pg_get_functiondef(oid) INTO def FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='get_chat_identities';
 def:=replace(def,'LEFT JOIN public.profiles p','LEFT JOIN public.profiles_public p');
 def:=replace(def,'SELECT a.* FROM public.organizer_accounts a',
 'SELECT a.id,a.slug,a.created_at, CASE WHEN a.moderation_status=''approved'' OR a.owner_user_id=auth.uid() OR public.has_role(auth.uid(),''admin'') THEN a.display_name ELSE ''Organizador em análise'' END display_name, CASE WHEN a.moderation_status=''approved'' OR a.owner_user_id=auth.uid() OR public.has_role(auth.uid(),''admin'') THEN a.logo_url END logo_url FROM public.organizer_accounts a');
 EXECUTE def;
END $$;
