CREATE OR REPLACE FUNCTION public.find_user_by_email(p_email text)
RETURNS TABLE(id uuid, full_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow organizer owners to search users by email
  IF NOT EXISTS (
    SELECT 1 FROM organizer_accounts
    WHERE owner_user_id = auth.uid()
  ) AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only organizers can search for users by email';
  END IF;

  RETURN QUERY
  SELECT p.id, p.full_name
  FROM public.profiles p
  WHERE p.email = lower(p_email)
  LIMIT 1;
END;
$$;