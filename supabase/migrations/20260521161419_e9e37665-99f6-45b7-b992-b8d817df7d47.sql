-- Add coupon tracking to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal_cents integer;

-- Backfill subtotal for old orders
UPDATE public.orders
SET subtotal_cents = total_cents
WHERE subtotal_cents IS NULL;

-- ============================================================
-- Server-side coupon application (atomic, ownership-checked)
-- ============================================================
CREATE OR REPLACE FUNCTION public.apply_coupon_to_order(
  p_order_id uuid,
  p_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_order public.orders%ROWTYPE;
  v_coupon public.coupons%ROWTYPE;
  v_subtotal integer;
  v_discount integer := 0;
  v_new_total integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_order FROM public.orders
  WHERE id = p_order_id AND buyer_user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF v_order.status <> 'pending' THEN
    RAISE EXCEPTION 'order_not_pending';
  END IF;

  v_subtotal := COALESCE(v_order.subtotal_cents, v_order.total_cents + COALESCE(v_order.discount_cents, 0));

  SELECT * INTO v_coupon FROM public.coupons
  WHERE upper(code) = upper(btrim(p_code))
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'coupon_not_found';
  END IF;

  -- Validate coupon belongs to this event's organizer
  IF v_coupon.event_id IS NOT NULL AND v_coupon.event_id <> v_order.event_id THEN
    RAISE EXCEPTION 'coupon_wrong_event';
  END IF;

  IF v_coupon.event_id IS NULL THEN
    PERFORM 1 FROM public.events e
      WHERE e.id = v_order.event_id AND e.organizer_id = v_coupon.organizer_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'coupon_wrong_organizer';
    END IF;
  END IF;

  IF v_coupon.valid_from IS NOT NULL AND v_coupon.valid_from > now() THEN
    RAISE EXCEPTION 'coupon_not_yet_valid';
  END IF;
  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < now() THEN
    RAISE EXCEPTION 'coupon_expired';
  END IF;
  IF v_coupon.usage_limit IS NOT NULL AND v_coupon.usage_count >= v_coupon.usage_limit THEN
    RAISE EXCEPTION 'coupon_exhausted';
  END IF;
  IF v_coupon.min_purchase_cents IS NOT NULL AND v_subtotal < v_coupon.min_purchase_cents THEN
    RAISE EXCEPTION 'coupon_min_purchase';
  END IF;

  -- Compute discount
  IF v_coupon.discount_type = 'percent' THEN
    v_discount := floor(v_subtotal * (v_coupon.discount_value::numeric / 100))::int;
  ELSE
    v_discount := v_coupon.discount_value;
  END IF;

  IF v_discount > v_subtotal THEN
    v_discount := v_subtotal;
  END IF;

  v_new_total := GREATEST(0, v_subtotal - v_discount);

  UPDATE public.orders
  SET coupon_id = v_coupon.id,
      discount_cents = v_discount,
      subtotal_cents = v_subtotal,
      total_cents = v_new_total,
      updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'discount_cents', v_discount,
    'subtotal_cents', v_subtotal,
    'total_cents', v_new_total
  );
END;
$$;

-- Remove coupon from an order (restores subtotal)
CREATE OR REPLACE FUNCTION public.remove_coupon_from_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_order public.orders%ROWTYPE;
  v_subtotal integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO v_order FROM public.orders
  WHERE id = p_order_id AND buyer_user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF v_order.status <> 'pending' THEN RAISE EXCEPTION 'order_not_pending'; END IF;

  v_subtotal := COALESCE(v_order.subtotal_cents, v_order.total_cents + COALESCE(v_order.discount_cents, 0));

  UPDATE public.orders
  SET coupon_id = NULL,
      discount_cents = 0,
      total_cents = v_subtotal,
      subtotal_cents = v_subtotal,
      updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('total_cents', v_subtotal);
END;
$$;

-- ============================================================
-- Patch confirm_paid_order to increment coupon usage_count
-- (Only change: add INSERT-trigger style increment after paid update)
-- ============================================================
CREATE OR REPLACE FUNCTION public.confirm_paid_order(
  p_order_id uuid,
  p_provider text,
  p_provider_payment_id text,
  p_amount_cents integer,
  p_method text,
  p_raw jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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