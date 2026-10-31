-- Approved media must not be replaced at the same public URL after review.
CREATE FUNCTION public.ugc_normalized_media_url(p_url text) RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE value text:=split_part(split_part(coalesce(p_url,''),'?',1),'#',1);token text;code integer;counter integer:=0;
BEGIN
 LOOP
  token:=substring(value FROM '%[0-9A-Fa-f]{2}');EXIT WHEN token IS NULL OR counter>1024;
  code:=('x'||substring(token FROM 2))::bit(8)::integer;
  IF code=0 THEN RETURN '';END IF;
  value:=replace(value,token,chr(code));counter:=counter+1;
 END LOOP;RETURN value;
END $$;
CREATE FUNCTION public.ugc_storage_path_available(p_bucket text,p_name text) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE marker text:='/storage/v1/object/public/'||p_bucket||'/'||p_name;
BEGIN
 IF p_name !~ '^[A-Za-z0-9._/-]+$' THEN RETURN false;END IF;
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND moderation_status='hidden') THEN RETURN false;END IF;
 IF p_bucket='avatars' THEN RETURN NOT EXISTS(SELECT 1 FROM public.profiles WHERE position(marker IN public.ugc_normalized_media_url(photo_url))>0 OR position(marker IN public.ugc_normalized_media_url(cover_photo_url))>0);
 ELSIF p_bucket='user-posts' THEN RETURN NOT EXISTS(SELECT 1 FROM public.user_posts WHERE position(marker IN public.ugc_normalized_media_url(media_url))>0);
 ELSIF p_bucket='event-images' THEN RETURN NOT EXISTS(SELECT 1 FROM public.event_media WHERE position(marker IN public.ugc_normalized_media_url(url))>0)
 AND NOT EXISTS(SELECT 1 FROM public.events WHERE position(marker IN public.ugc_normalized_media_url(cover_image_url))>0 OR position(marker IN public.ugc_normalized_media_url(checkout_banner_url))>0)
 AND NOT EXISTS(SELECT 1 FROM public.organizer_accounts WHERE position(marker IN public.ugc_normalized_media_url(logo_url))>0);
 END IF;RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.ugc_normalized_media_url(text),public.ugc_storage_path_available(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ugc_storage_path_available(text,text) TO authenticated,service_role;
CREATE POLICY immutable_ugc_objects ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated USING(bucket_id NOT IN('avatars','user-posts','event-images')) WITH CHECK(bucket_id NOT IN('avatars','user-posts','event-images'));
CREATE POLICY new_ugc_object_path ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(bucket_id NOT IN('avatars','user-posts','event-images') OR public.ugc_storage_path_available(bucket_id,name));
-- Event media already has an approval queue. Prevent direct API edits from
-- bypassing it after an event has been approved.
CREATE FUNCTION public.require_event_content_review() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF coalesce(auth.role(),'') IN('','service_role') OR public.has_role(auth.uid(),'admin') THEN RETURN NEW;END IF;
 IF NEW.status='published' THEN NEW.status:='pending_review';END IF;RETURN NEW;
END $$;
CREATE TRIGGER require_event_content_review BEFORE INSERT OR UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.require_event_content_review();
CREATE FUNCTION public.review_changed_event_media() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF coalesce(auth.role(),'') NOT IN('','service_role') AND NOT public.has_role(auth.uid(),'admin') THEN
  UPDATE public.events SET status='pending_review' WHERE id=CASE WHEN TG_OP='DELETE' THEN OLD.event_id ELSE NEW.event_id END AND status='published';
 END IF;RETURN NULL;
END $$;
CREATE TRIGGER review_changed_event_media AFTER INSERT OR UPDATE OR DELETE ON public.event_media FOR EACH ROW EXECUTE FUNCTION public.review_changed_event_media();
REVOKE ALL ON FUNCTION public.require_event_content_review(),public.review_changed_event_media() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION privacy.prune_moderation_reports() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 DELETE FROM public.content_reports WHERE status IN('resolved','dismissed') AND resolved_at<now()-interval '90 days';
$$;
REVOKE ALL ON FUNCTION privacy.prune_moderation_reports() FROM PUBLIC,anon,authenticated;
SELECT cron.schedule('upplin-prune-moderation-reports','20 3 * * *','SELECT privacy.prune_moderation_reports()');
