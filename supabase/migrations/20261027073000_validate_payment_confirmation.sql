-- Preserve payment state and exact totals inside the transaction.
CREATE OR REPLACE FUNCTION public.confirm_paid_order(p_order_id uuid, p_provider text, p_provider_payment_id text, p_amount_cents integer, p_method text, p_raw jsonb = CAST('{}' AS jsonb)) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item record;
  v_owner_id uuid;
  v_p1 uuid;
  v_p2 uuid;
  v_tickets_created integer := 0;
  v_ticket_exists boolean;
  v_was_pending boolean;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  IF p_amount_cents IS DISTINCT FROM v_order.total_cents OR p_amount_cents < 0 THEN
    RAISE EXCEPTION 'payment_amount_mismatch';
  END IF;
  IF v_order.status NOT IN ('pending','paid') THEN RAISE EXCEPTION 'invalid_order_payment_state'; END IF;
  IF v_order.status='paid' AND v_order.mp_payment_id IS NOT NULL
     AND p_provider_payment_id IS DISTINCT FROM v_order.mp_payment_id THEN
    RAISE EXCEPTION 'order_already_paid_with_another_payment';
  END IF;
  v_was_pending := (v_order.status = 'pending');

  IF p_provider_payment_id IS NOT NULL THEN
    INSERT INTO public.payments (order_id, provider, provider_payment_id, amount_cents, status, method, raw)
    VALUES (p_order_id, p_provider, p_provider_payment_id, COALESCE(p_amount_cents, v_order.total_cents), 'paid', p_method, COALESCE(p_raw, '{}'::jsonb))
    ON CONFLICT (provider, provider_payment_id)
    DO UPDATE SET
      status = 'paid',
      amount_cents = EXCLUDED.amount_cents,
      method = COALESCE(EXCLUDED.method, public.payments.method),
      raw = COALESCE(EXCLUDED.raw, public.payments.raw),
      updated_at = now();
  ELSE
    INSERT INTO public.payments (order_id, provider, amount_cents, status, method, raw)
    VALUES (p_order_id, p_provider, COALESCE(p_amount_cents, v_order.total_cents), 'paid', p_method, COALESCE(p_raw, '{}'::jsonb));
  END IF;

  UPDATE public.orders
  SET status = 'paid',
      mp_payment_id = COALESCE(p_provider_payment_id, mp_payment_id),
      updated_at = now()
  WHERE id = p_order_id;

  -- Increment coupon usage exactly once per order
  IF v_was_pending AND v_order.coupon_id IS NOT NULL THEN
    UPDATE public.coupons
    SET usage_count = COALESCE(usage_count, 0) + 1,
        updated_at = now()
    WHERE id = v_order.coupon_id;
  END IF;

  FOR v_item IN
    SELECT
      oi.*,
      COALESCE(oi.item_index, row_number() OVER (PARTITION BY oi.order_id ORDER BY oi.created_at, oi.id))::integer AS stable_item_index
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id
    ORDER BY oi.created_at, oi.id
  LOOP
    UPDATE public.order_items
    SET item_index = v_item.stable_item_index
    WHERE id = v_item.id AND item_index IS NULL;

    FOR i IN 1..v_item.qty LOOP
      SELECT EXISTS (
        SELECT 1 FROM public.tickets
        WHERE order_id = p_order_id
          AND item_index = v_item.stable_item_index
          AND ticket_number = i
      ) INTO v_ticket_exists;

      IF NOT v_ticket_exists THEN
        INSERT INTO public.tickets (
          order_id,
          event_id,
          buyer_user_id,
          ticket_type_id,
          status,
          item_index,
          ticket_number
        )
        VALUES (
          p_order_id,
          v_order.event_id,
          v_order.buyer_user_id,
          v_item.ticket_type_id,
          'issued',
          v_item.stable_item_index,
          i
        )
        ON CONFLICT DO NOTHING;

        IF FOUND THEN
          v_tickets_created := v_tickets_created + 1;
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  SELECT oa.owner_user_id INTO v_owner_id
  FROM public.events e
  JOIN public.organizer_accounts oa ON oa.id = e.organizer_id
  WHERE e.id = v_order.event_id;

  IF v_owner_id IS NOT NULL AND v_owner_id <> v_order.buyer_user_id THEN
    v_p1 := LEAST(v_order.buyer_user_id, v_owner_id);
    v_p2 := GREATEST(v_order.buyer_user_id, v_owner_id);

    INSERT INTO public.conversations (type, event_id, participant_1_id, participant_2_id, subject)
    SELECT 'user_organizer', v_order.event_id, v_p1, v_p2, e.title
    FROM public.events e
    WHERE e.id = v_order.event_id
      AND NOT EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.type = 'user_organizer'
          AND c.event_id = v_order.event_id
          AND c.participant_1_id = v_p1
          AND c.participant_2_id = v_p2
      );
  END IF;

  RETURN jsonb_build_object(
    'status', 'paid',
    'order_id', p_order_id,
    'tickets_created', v_tickets_created
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.confirm_paid_order(uuid,text,text,integer,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_paid_order(uuid,text,text,integer,text,jsonb) TO service_role;
