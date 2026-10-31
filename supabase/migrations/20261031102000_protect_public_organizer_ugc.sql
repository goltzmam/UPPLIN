-- Public views can present neutral placeholders for profiles awaiting review.
-- Direct table joins must not bypass that review or a personal block.
CREATE POLICY ugc_visible_organizers ON public.organizer_accounts AS RESTRICTIVE FOR SELECT TO anon,authenticated USING
 (owner_user_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR (moderation_status='approved' AND public.ugc_author_visible(owner_user_id)));
-- A deleted profile's UUID is not retained as the report subject identifier.
CREATE OR REPLACE FUNCTION privacy.erase_ugc_report_evidence() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.data_erased AND NOT OLD.data_erased THEN
  UPDATE public.content_reports SET evidence='{}',details='',resolution_note='',reporter_id=CASE WHEN reporter_id=NEW.user_id THEN NULL ELSE reporter_id END,
   target_id=CASE WHEN target_kind='profile' AND target_id=NEW.user_id THEN NEW.anonymous_id ELSE target_id END,
   target_user_id=CASE WHEN target_user_id=NEW.user_id THEN NULL ELSE target_user_id END
   WHERE reporter_id=NEW.user_id OR target_user_id=NEW.user_id;
  DELETE FROM public.user_blocks WHERE blocker_id=NEW.user_id OR blocked_id=NEW.user_id;
 END IF;RETURN NEW;
END $$;
