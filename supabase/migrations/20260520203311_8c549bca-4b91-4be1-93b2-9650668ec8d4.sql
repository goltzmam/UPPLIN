-- Track last seen timestamp on profiles for presence/active users analytics
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at
  ON public.profiles (last_seen_at DESC NULLS LAST);

-- RPC: lightweight heartbeat callable by any authenticated user to update only their own last_seen_at
CREATE OR REPLACE FUNCTION public.touch_last_seen()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET last_seen_at = now()
  WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.touch_last_seen() FROM public;
GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated;

-- RPC: aggregated active users metrics — admin-only
CREATE OR REPLACE FUNCTION public.get_active_users_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can read active user metrics';
  END IF;

  WITH org AS (
    SELECT DISTINCT owner_user_id AS uid FROM organizer_accounts WHERE owner_user_id IS NOT NULL
  ),
  base AS (
    SELECT
      p.id,
      p.last_seen_at,
      (p.id IN (SELECT uid FROM org)) AS is_organizer
    FROM profiles p
  )
  SELECT jsonb_build_object(
    'live', jsonb_build_object(
      'total',        (SELECT count(*) FROM base WHERE last_seen_at > now() - interval '2 minutes'),
      'organizers',   (SELECT count(*) FROM base WHERE last_seen_at > now() - interval '2 minutes' AND is_organizer),
      'participants', (SELECT count(*) FROM base WHERE last_seen_at > now() - interval '2 minutes' AND NOT is_organizer)
    ),
    'today', jsonb_build_object(
      'total',        (SELECT count(*) FROM base WHERE last_seen_at >= date_trunc('day', now())),
      'organizers',   (SELECT count(*) FROM base WHERE last_seen_at >= date_trunc('day', now()) AND is_organizer),
      'participants', (SELECT count(*) FROM base WHERE last_seen_at >= date_trunc('day', now()) AND NOT is_organizer)
    ),
    'd7', jsonb_build_object(
      'total',        (SELECT count(*) FROM base WHERE last_seen_at >= now() - interval '7 days'),
      'organizers',   (SELECT count(*) FROM base WHERE last_seen_at >= now() - interval '7 days' AND is_organizer),
      'participants', (SELECT count(*) FROM base WHERE last_seen_at >= now() - interval '7 days' AND NOT is_organizer)
    ),
    'd30', jsonb_build_object(
      'total',        (SELECT count(*) FROM base WHERE last_seen_at >= now() - interval '30 days'),
      'organizers',   (SELECT count(*) FROM base WHERE last_seen_at >= now() - interval '30 days' AND is_organizer),
      'participants', (SELECT count(*) FROM base WHERE last_seen_at >= now() - interval '30 days' AND NOT is_organizer)
    ),
    'totals', jsonb_build_object(
      'total',        (SELECT count(*) FROM base),
      'organizers',   (SELECT count(*) FROM base WHERE is_organizer),
      'participants', (SELECT count(*) FROM base WHERE NOT is_organizer)
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_active_users_metrics() FROM public;
GRANT EXECUTE ON FUNCTION public.get_active_users_metrics() TO authenticated;