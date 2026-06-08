
-- =========================================================================
-- Refund state machine
-- =========================================================================

CREATE TYPE public.refund_status AS ENUM (
  'requested',       -- buyer created the request
  'approved',        -- organizer (or admin) approved; MP call will be made
  'rejected',        -- organizer rejected outside guarantee window (final)
  'disputed',        -- organizer rejected within guarantee → escalated to admin
  'pending_refund',  -- MP call sent, awaiting webhook confirmation
  'refunded',        -- final: webhook confirmed, tickets cancelled
  'failed'           -- MP call failed permanently
);

-- =========================================================================
-- refund_requests table
-- =========================================================================
CREATE TABLE public.refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  organizer_id uuid NOT NULL REFERENCES public.organizer_accounts(id) ON DELETE CASCADE,
  requester_user_id uuid NOT NULL,
  reason text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  status public.refund_status NOT NULL DEFAULT 'requested',
  within_guarantee boolean NOT NULL DEFAULT false,
  refund_amount_cents integer NOT NULL DEFAULT 0,
  mp_refund_id text,
  organizer_decision_note text,
  admin_decision_note text,
  organizer_decided_at timestamptz,
  admin_decided_at timestamptz,
  organizer_deadline_at timestamptz,
  fee_policy text,              -- 'mp_returns_fee' | 'organizer_absorbs_fee'
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);

CREATE INDEX idx_refund_requests_organizer ON public.refund_requests(organizer_id, status);
CREATE INDEX idx_refund_requests_event ON public.refund_requests(event_id);
CREATE INDEX idx_refund_requests_requester ON public.refund_requests(requester_user_id);
CREATE INDEX idx_refund_requests_status ON public.refund_requests(status);

GRANT SELECT, INSERT, UPDATE ON public.refund_requests TO authenticated;
GRANT ALL ON public.refund_requests TO service_role;

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyer sees own refund requests"
  ON public.refund_requests FOR SELECT TO authenticated
  USING (requester_user_id = auth.uid());

CREATE POLICY "Organizer sees refund requests for their events"
  ON public.refund_requests FOR SELECT TO authenticated
  USING (public.is_organizer_owner(auth.uid(), organizer_id));

CREATE POLICY "Admin sees all refund requests"
  ON public.refund_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_refund_requests_updated_at
  BEFORE UPDATE ON public.refund_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =========================================================================
-- refund_status_logs (audit trail)
-- =========================================================================
CREATE TABLE public.refund_status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_request_id uuid NOT NULL REFERENCES public.refund_requests(id) ON DELETE CASCADE,
  from_status public.refund_status,
  to_status public.refund_status NOT NULL,
  actor_user_id uuid,
  actor_role text NOT NULL,   -- 'buyer' | 'organizer' | 'admin' | 'system' | 'webhook'
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_refund_logs_request ON public.refund_status_logs(refund_request_id, created_at DESC);

GRANT SELECT, INSERT ON public.refund_status_logs TO authenticated;
GRANT ALL ON public.refund_status_logs TO service_role;

ALTER TABLE public.refund_status_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View logs for refunds I can see"
  ON public.refund_status_logs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.refund_requests r
    WHERE r.id = refund_request_id
      AND (
        r.requester_user_id = auth.uid()
        OR public.is_organizer_owner(auth.uid(), r.organizer_id)
        OR public.has_role(auth.uid(), 'admin')
      )
  ));

-- =========================================================================
-- Helper: log a transition
-- =========================================================================
CREATE OR REPLACE FUNCTION public._refund_log(
  p_request_id uuid,
  p_from public.refund_status,
  p_to public.refund_status,
  p_actor uuid,
  p_role text,
  p_note text DEFAULT NULL,
  p_meta jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.refund_status_logs(
    refund_request_id, from_status, to_status, actor_user_id, actor_role, note, metadata
  ) VALUES (p_request_id, p_from, p_to, p_actor, p_role, p_note, COALESCE(p_meta, '{}'::jsonb));
$$;

-- =========================================================================
-- Helper: emit in-app notification
-- =========================================================================
CREATE OR REPLACE FUNCTION public._refund_notify(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_request_id uuid
) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications(user_id, title, body, type, data)
  VALUES (
    p_user_id, p_title, p_body, 'refund',
    jsonb_build_object('refund_request_id', p_request_id)
  );
$$;

-- =========================================================================
-- request_refund (buyer)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.request_refund(
  p_order_id uuid,
  p_reason text,
  p_attachments jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_order public.orders%ROWTYPE;
  v_event public.events%ROWTYPE;
  v_organizer_owner uuid;
  v_within boolean;
  v_request_id uuid;
  v_existing public.refund_requests%ROWTYPE;
  v_initial_status public.refund_status;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) < 20 THEN
    RAISE EXCEPTION 'reason_too_short';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF v_order.buyer_user_id <> v_uid THEN RAISE EXCEPTION 'not_allowed'; END IF;
  IF v_order.status <> 'paid' THEN RAISE EXCEPTION 'order_not_paid'; END IF;

  SELECT * INTO v_event FROM public.events WHERE id = v_order.event_id;

  SELECT * INTO v_existing FROM public.refund_requests WHERE order_id = p_order_id;
  IF FOUND AND v_existing.status NOT IN ('rejected','failed') THEN
    RAISE EXCEPTION 'refund_already_requested';
  END IF;

  v_within := (v_order.created_at > now() - interval '7 days')
              AND (v_event.start_at IS NULL OR v_event.start_at > now());

  -- Within guarantee → goes to organizer queue (requested)
  -- Outside guarantee → escalated immediately to admin (disputed)
  v_initial_status := CASE WHEN v_within THEN 'requested' ELSE 'disputed' END;

  IF v_existing.id IS NOT NULL THEN
    -- Re-open a previously rejected/failed one
    UPDATE public.refund_requests SET
      reason = btrim(p_reason),
      attachments = COALESCE(p_attachments, '[]'::jsonb),
      status = v_initial_status,
      within_guarantee = v_within,
      organizer_deadline_at = CASE WHEN v_within THEN now() + interval '48 hours' ELSE NULL END,
      organizer_decision_note = NULL,
      admin_decision_note = NULL,
      organizer_decided_at = NULL,
      admin_decided_at = NULL,
      updated_at = now()
    WHERE id = v_existing.id
    RETURNING id INTO v_request_id;
  ELSE
    INSERT INTO public.refund_requests(
      order_id, event_id, organizer_id, requester_user_id,
      reason, attachments, status, within_guarantee,
      refund_amount_cents, organizer_deadline_at
    ) VALUES (
      p_order_id, v_order.event_id, v_event.organizer_id, v_uid,
      btrim(p_reason), COALESCE(p_attachments, '[]'::jsonb),
      v_initial_status, v_within,
      v_order.total_cents,
      CASE WHEN v_within THEN now() + interval '48 hours' ELSE NULL END
    ) RETURNING id INTO v_request_id;
  END IF;

  PERFORM public._refund_log(v_request_id, NULL, v_initial_status, v_uid, 'buyer',
    CASE WHEN v_within THEN 'Dentro da garantia (7 dias)' ELSE 'Fora da garantia, escalado para admin' END,
    jsonb_build_object('reason', btrim(p_reason)));

  -- Notify organizer owner (or admin if disputed)
  SELECT owner_user_id INTO v_organizer_owner FROM public.organizer_accounts WHERE id = v_event.organizer_id;
  IF v_within AND v_organizer_owner IS NOT NULL THEN
    PERFORM public._refund_notify(v_organizer_owner,
      'Nova solicitação de reembolso',
      'Você tem 48h para responder à solicitação do participante.',
      v_request_id);
  END IF;

  RETURN jsonb_build_object(
    'id', v_request_id,
    'status', v_initial_status,
    'within_guarantee', v_within,
    'refund_amount_cents', v_order.total_cents
  );
END;
$$;

-- =========================================================================
-- decide_refund (organizer approves/rejects)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.decide_refund(
  p_request_id uuid,
  p_decision text,           -- 'approve' | 'reject'
  p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req public.refund_requests%ROWTYPE;
  v_new_status public.refund_status;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO v_req FROM public.refund_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'refund_not_found'; END IF;
  IF NOT public.is_organizer_owner(v_uid, v_req.organizer_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;
  IF v_req.status <> 'requested' THEN RAISE EXCEPTION 'invalid_state'; END IF;

  IF p_decision = 'approve' THEN
    v_new_status := 'approved';
  ELSIF p_decision = 'reject' THEN
    -- Within guarantee: rejection escalates to admin
    -- Outside guarantee (shouldn't reach here): final rejection
    v_new_status := CASE WHEN v_req.within_guarantee THEN 'disputed' ELSE 'rejected' END;
  ELSE
    RAISE EXCEPTION 'invalid_decision';
  END IF;

  UPDATE public.refund_requests SET
    status = v_new_status,
    organizer_decision_note = p_note,
    organizer_decided_at = now(),
    updated_at = now()
  WHERE id = p_request_id;

  PERFORM public._refund_log(p_request_id, v_req.status, v_new_status, v_uid, 'organizer', p_note, '{}'::jsonb);

  PERFORM public._refund_notify(v_req.requester_user_id,
    CASE v_new_status
      WHEN 'approved' THEN 'Reembolso aprovado'
      WHEN 'disputed' THEN 'Reembolso recusado pelo organizador'
      ELSE 'Atualização do reembolso'
    END,
    CASE v_new_status
      WHEN 'approved' THEN 'O estorno será processado em instantes.'
      WHEN 'disputed' THEN 'Sua solicitação foi encaminhada para análise da equipe UPPLIN.'
      ELSE 'O status do seu reembolso mudou.'
    END,
    p_request_id);

  RETURN jsonb_build_object('id', p_request_id, 'status', v_new_status);
END;
$$;

-- =========================================================================
-- admin_force_refund — admin overrides and forces approval
-- =========================================================================
CREATE OR REPLACE FUNCTION public.admin_force_refund(
  p_request_id uuid,
  p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req public.refund_requests%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.has_role(v_uid, 'admin') THEN RAISE EXCEPTION 'not_allowed'; END IF;

  SELECT * INTO v_req FROM public.refund_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'refund_not_found'; END IF;
  IF v_req.status NOT IN ('requested','disputed') THEN RAISE EXCEPTION 'invalid_state'; END IF;

  UPDATE public.refund_requests SET
    status = 'approved',
    admin_decision_note = p_note,
    admin_decided_at = now(),
    updated_at = now()
  WHERE id = p_request_id;

  PERFORM public._refund_log(p_request_id, v_req.status, 'approved', v_uid, 'admin',
    COALESCE(p_note, 'Forçado pelo admin'), '{}'::jsonb);

  PERFORM public._refund_notify(v_req.requester_user_id,
    'Reembolso aprovado pela equipe UPPLIN', 'O estorno será processado em instantes.', p_request_id);

  RETURN jsonb_build_object('id', p_request_id, 'status', 'approved');
END;
$$;

-- =========================================================================
-- admin_reject_refund — admin definitively rejects a disputed refund
-- =========================================================================
CREATE OR REPLACE FUNCTION public.admin_reject_refund(
  p_request_id uuid,
  p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req public.refund_requests%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.has_role(v_uid, 'admin') THEN RAISE EXCEPTION 'not_allowed'; END IF;

  SELECT * INTO v_req FROM public.refund_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'refund_not_found'; END IF;
  IF v_req.status NOT IN ('requested','disputed') THEN RAISE EXCEPTION 'invalid_state'; END IF;

  UPDATE public.refund_requests SET
    status = 'rejected',
    admin_decision_note = p_note,
    admin_decided_at = now(),
    updated_at = now()
  WHERE id = p_request_id;

  PERFORM public._refund_log(p_request_id, v_req.status, 'rejected', v_uid, 'admin', p_note, '{}'::jsonb);

  PERFORM public._refund_notify(v_req.requester_user_id,
    'Reembolso negado', COALESCE(p_note, 'Sua solicitação foi negada pela equipe UPPLIN.'), p_request_id);

  RETURN jsonb_build_object('id', p_request_id, 'status', 'rejected');
END;
$$;

-- =========================================================================
-- mark_refund_pending — called by mp-refund right after MP call
-- =========================================================================
CREATE OR REPLACE FUNCTION public.mark_refund_pending(
  p_request_id uuid,
  p_mp_refund_id text DEFAULT NULL,
  p_fee_policy text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_req public.refund_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM public.refund_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'refund_not_found'; END IF;
  IF v_req.status NOT IN ('approved','pending_refund') THEN RAISE EXCEPTION 'invalid_state'; END IF;

  UPDATE public.refund_requests SET
    status = 'pending_refund',
    mp_refund_id = COALESCE(p_mp_refund_id, mp_refund_id),
    fee_policy = COALESCE(p_fee_policy, fee_policy),
    updated_at = now()
  WHERE id = p_request_id;

  PERFORM public._refund_log(p_request_id, v_req.status, 'pending_refund', NULL, 'system',
    'Chamada ao Mercado Pago enviada', jsonb_build_object('mp_refund_id', p_mp_refund_id, 'fee_policy', p_fee_policy));

  RETURN jsonb_build_object('id', p_request_id, 'status', 'pending_refund');
END;
$$;

-- =========================================================================
-- mark_refund_completed — webhook confirmed → cancel tickets & finalize
-- =========================================================================
CREATE OR REPLACE FUNCTION public.mark_refund_completed(
  p_request_id uuid,
  p_mp_refund_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_req public.refund_requests%ROWTYPE;
  v_owner uuid;
  v_item record;
BEGIN
  SELECT * INTO v_req FROM public.refund_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'refund_not_found'; END IF;
  IF v_req.status = 'refunded' THEN
    RETURN jsonb_build_object('id', p_request_id, 'status', 'refunded', 'already', true);
  END IF;

  -- Cancel tickets
  UPDATE public.tickets SET status = 'cancelled' WHERE order_id = v_req.order_id AND status <> 'used';

  -- Release stock
  FOR v_item IN SELECT ticket_type_id, qty FROM public.order_items WHERE order_id = v_req.order_id LOOP
    UPDATE public.ticket_types
    SET quantity_sold = GREATEST(0, COALESCE(quantity_sold,0) - v_item.qty)
    WHERE id = v_item.ticket_type_id;
  END LOOP;

  -- Update order/payments
  UPDATE public.orders SET status = 'refunded', updated_at = now() WHERE id = v_req.order_id;
  UPDATE public.payments SET status = 'refunded', updated_at = now() WHERE order_id = v_req.order_id;

  UPDATE public.refund_requests SET
    status = 'refunded',
    mp_refund_id = COALESCE(p_mp_refund_id, mp_refund_id),
    refunded_at = now(),
    updated_at = now()
  WHERE id = p_request_id;

  PERFORM public._refund_log(p_request_id, v_req.status, 'refunded', NULL, 'webhook',
    'Estorno confirmado', jsonb_build_object('mp_refund_id', p_mp_refund_id));

  -- Notify all parties
  PERFORM public._refund_notify(v_req.requester_user_id, 'Reembolso concluído',
    'O valor foi estornado para o método de pagamento original.', p_request_id);

  SELECT owner_user_id INTO v_owner FROM public.organizer_accounts WHERE id = v_req.organizer_id;
  IF v_owner IS NOT NULL THEN
    PERFORM public._refund_notify(v_owner, 'Reembolso processado',
      'O estorno do pedido foi confirmado pelo Mercado Pago.', p_request_id);
  END IF;

  RETURN jsonb_build_object('id', p_request_id, 'status', 'refunded');
END;
$$;

-- =========================================================================
-- mark_refund_failed
-- =========================================================================
CREATE OR REPLACE FUNCTION public.mark_refund_failed(
  p_request_id uuid,
  p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_req public.refund_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM public.refund_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'refund_not_found'; END IF;

  UPDATE public.refund_requests SET status = 'failed', updated_at = now() WHERE id = p_request_id;
  PERFORM public._refund_log(p_request_id, v_req.status, 'failed', NULL, 'system', p_note, '{}'::jsonb);

  PERFORM public._refund_notify(v_req.requester_user_id, 'Falha no reembolso',
    COALESCE(p_note, 'Não foi possível concluir o estorno. A equipe UPPLIN foi avisada.'), p_request_id);

  RETURN jsonb_build_object('id', p_request_id, 'status', 'failed');
END;
$$;

-- =========================================================================
-- find_refund_by_payment — used by webhook to map MP payment_id → request
-- =========================================================================
CREATE OR REPLACE FUNCTION public.find_refund_by_payment(p_mp_payment_id text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT rr.id FROM public.refund_requests rr
  JOIN public.orders o ON o.id = rr.order_id
  WHERE o.mp_payment_id = p_mp_payment_id
  LIMIT 1;
$$;
