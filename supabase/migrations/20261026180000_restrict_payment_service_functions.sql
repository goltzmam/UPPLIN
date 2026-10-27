-- Payment confirmation and inventory writes must only run in trusted backend
-- functions, never via a participant's PostgREST session.
BEGIN;

REVOKE EXECUTE ON FUNCTION public.confirm_paid_order(uuid, text, text, integer, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_paid_order(uuid, text, text, integer, text, jsonb)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.increment_quantity_sold(uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_quantity_sold(uuid, integer)
  TO service_role;

COMMIT;
