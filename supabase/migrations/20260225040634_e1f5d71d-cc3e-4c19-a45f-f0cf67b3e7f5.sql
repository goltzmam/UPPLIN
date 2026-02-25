
-- Function to find a user's id by email (for adding collaborators)
-- Returns the user_id if found, null otherwise
CREATE OR REPLACE FUNCTION public.find_user_by_email(p_email text)
RETURNS TABLE(id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name
  FROM public.profiles p
  WHERE p.email = lower(p_email)
  LIMIT 1;
$$;
