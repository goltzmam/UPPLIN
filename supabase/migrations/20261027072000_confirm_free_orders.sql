-- A success toast must never stand in for server-side ticket issuance.
CREATE OR REPLACE FUNCTION public.confirm_free_order(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order public.orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_order FROM public.orders
  WHERE id=p_order_id AND buyer_user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found' USING ERRCODE='42501'; END IF;
  IF v_order.total_cents IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'order_is_not_free'; END IF;
  IF v_order.status NOT IN ('pending','paid') THEN RAISE EXCEPTION 'order_not_pending'; END IF;
  IF v_order.status='pending' AND (v_order.expires_at IS NULL OR v_order.expires_at<=now()) THEN
    RAISE EXCEPTION 'order_expired';
  END IF;
  RETURN public.confirm_paid_order(p_order_id,'free','free-'||p_order_id::text,0,'free','{}'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.confirm_free_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_free_order(uuid) TO authenticated;
