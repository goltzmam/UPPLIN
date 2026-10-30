ALTER TABLE public.events ADD COLUMN is_store_review boolean NOT NULL DEFAULT false;
ALTER TABLE public.events ADD COLUMN review_owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.organizer_accounts ADD COLUMN is_store_review boolean NOT NULL DEFAULT false;
CREATE POLICY "Review events are not public discovery" ON public.events AS RESTRICTIVE FOR SELECT TO anon,authenticated
USING(NOT is_store_review OR review_owner_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Review organizer is private" ON public.organizer_accounts AS RESTRICTIVE FOR SELECT TO anon,authenticated
USING(NOT is_store_review OR owner_user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.protect_store_review_flags() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.role()='authenticated' THEN
  IF TG_OP='INSERT' THEN
   IF coalesce((auth.jwt()->'app_metadata'->>'store_review_account')::boolean,false) THEN
    NEW.is_store_review=true;
    IF TG_TABLE_NAME='events' THEN NEW.review_owner_id=auth.uid();END IF;
   ELSIF NEW.is_store_review OR (TG_TABLE_NAME='events' AND to_jsonb(NEW)->>'review_owner_id' IS NOT NULL) THEN RAISE EXCEPTION 'review_flags_managed' USING ERRCODE='42501'; END IF;
  ELSIF NEW.is_store_review IS DISTINCT FROM OLD.is_store_review
   OR (TG_TABLE_NAME='events' AND to_jsonb(NEW)->>'review_owner_id' IS DISTINCT FROM to_jsonb(OLD)->>'review_owner_id') THEN
    RAISE EXCEPTION 'review_flags_managed' USING ERRCODE='42501';
  END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.protect_store_review_flags() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER protect_store_review_event BEFORE INSERT OR UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.protect_store_review_flags();
CREATE TRIGGER protect_store_review_organizer BEFORE INSERT OR UPDATE ON public.organizer_accounts FOR EACH ROW EXECUTE FUNCTION public.protect_store_review_flags();
NOTIFY pgrst,'reload schema';
