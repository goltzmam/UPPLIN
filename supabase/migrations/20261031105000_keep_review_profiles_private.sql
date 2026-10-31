CREATE OR REPLACE VIEW public.organizer_accounts_public AS SELECT id,
 CASE WHEN moderation_status='approved' OR owner_user_id=auth.uid() OR public.has_role(auth.uid(),'admin') THEN display_name ELSE 'Organizador em análise' END display_name,
 slug,CASE WHEN moderation_status='approved' OR owner_user_id=auth.uid() OR public.has_role(auth.uid(),'admin') THEN description END description,
 CASE WHEN moderation_status='approved' OR owner_user_id=auth.uid() OR public.has_role(auth.uid(),'admin') THEN logo_url END logo_url,
 CASE WHEN moderation_status='approved' OR owner_user_id=auth.uid() OR public.has_role(auth.uid(),'admin') THEN social_instagram END social_instagram, CASE WHEN moderation_status='approved' OR owner_user_id=auth.uid() OR public.has_role(auth.uid(),'admin') THEN social_facebook END social_facebook, CASE WHEN moderation_status='approved' OR owner_user_id=auth.uid() OR public.has_role(auth.uid(),'admin') THEN social_website END social_website,status,city,state,created_at,updated_at
 FROM public.organizer_accounts WHERE status='active' AND public.ugc_author_visible(owner_user_id) AND (NOT is_store_review OR owner_user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE VIEW public.organizer_accounts_feed AS SELECT id,owner_user_id,status FROM public.organizer_accounts
 WHERE status='active' AND public.ugc_author_visible(owner_user_id) AND (NOT is_store_review OR owner_user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
