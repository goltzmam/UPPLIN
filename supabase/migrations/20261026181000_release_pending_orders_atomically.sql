BEGIN;

CREATE OR REPLACE FUNCTION public.release_pending_order(
  p_order_id uuid,
  p_target_status text,
  p_payment_id text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item record;
BEGIN
  IF p_target_status IS NULL OR p_target_status NOT IN ('failed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid release status';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.status IS DISTINCT FROM 'pending'::public.order_status THEN RETURN false; END IF;
  IF p_target_status = 'cancelled' AND
     (v_order.expires_at IS NULL OR v_order.expires_at >= now()) THEN
    RETURN false;
  END IF;

  UPDATE public.orders
  SET status = p_target_status::public.order_status,
      mp_payment_id = COALESCE(p_payment_id, mp_payment_id), updated_at = now()
  WHERE id = p_order_id;

  FOR v_item IN
    SELECT ticket_type_id, SUM(qty) AS qty FROM public.order_items
    WHERE order_id = p_order_id GROUP BY ticket_type_id ORDER BY ticket_type_id
  LOOP
    UPDATE public.ticket_types
    SET quantity_sold = GREATEST(0, COALESCE(quantity_sold, 0) - v_item.qty)
    WHERE id = v_item.ticket_type_id;
  END LOOP;
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.release_pending_order(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_pending_order(uuid, text, text)
  TO service_role;

COMMIT;
