-- Real E.1: held captures must retain coupon capacity without inventing a paid redemption.
-- Keep exact winning-payment checks and all unpaid/release invariants unchanged.
CREATE OR REPLACE FUNCTION workspace_phase15_financial_complete() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE order_id uuid; o workspace_membership_orders; p workspace_payment_attempts; r workspace_coupon_redemptions;
BEGIN
  IF TG_TABLE_NAME='workspace_membership_orders' THEN order_id := NEW.id; ELSE order_id := NEW.membership_order_id; END IF;
  SELECT * INTO o FROM workspace_membership_orders WHERE id=order_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Financial order missing' USING ERRCODE='23514'; END IF;
  IF o.financial_state='captured' THEN
    SELECT * INTO p FROM workspace_payment_attempts WHERE membership_order_id=o.id AND provider_payment_id=o.winning_payment_id AND winner;
    IF p.id IS NULL OR p.state<>'captured' OR p.amount_paise<>o.total_paise OR p.currency<>o.currency OR p.user_id<>o.user_id OR p.provider_order_id IS DISTINCT FROM o.provider_order_id
      OR p.provider_account_id<>o.provider_account_id OR p.provider_mode<>o.provider_mode OR (o.paid_at IS NOT NULL AND o.paid_at IS DISTINCT FROM p.captured_at) THEN
      RAISE EXCEPTION 'Captured order requires exact winning payment evidence' USING ERRCODE='23514';
    END IF;
  ELSIF EXISTS(SELECT 1 FROM workspace_payment_attempts WHERE membership_order_id=o.id AND winner) THEN
    RAISE EXCEPTION 'Winning payment requires captured financial order' USING ERRCODE='23514';
  END IF;
  IF o.coupon_id IS NOT NULL THEN
    SELECT * INTO r FROM workspace_coupon_redemptions WHERE membership_order_id=o.id;
    IF r.id IS NULL OR r.user_id<>o.user_id OR r.coupon_id<>o.coupon_id
      OR (o.financial_state='captured' AND r.status<>'redeemed' AND o.review_reason IS DISTINCT FROM 'reservation_inconsistent'
        AND NOT (r.status='reserved' AND o.activation_state='held_for_review'))
      OR (o.financial_state='unpaid' AND o.provider_setup_state<>'closed' AND r.status<>'reserved')
      OR (o.financial_state='unpaid' AND o.provider_setup_state='closed' AND r.status<>'released') THEN
      RAISE EXCEPTION 'Order and coupon financial ledger must commit together' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NULL;
END; $$;
