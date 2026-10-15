-- Phone OTP authenticates the account. Contact syntax is required for new orders;
-- email ownership proof remains independent and is still required for sensitive mail.
-- Replace only the 0027 INSERT prerequisite; retain its trigger and all history guards.
CREATE OR REPLACE FUNCTION workspace_email_order_required() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE contact text;
BEGIN
  SELECT lower(btrim(email)) INTO contact FROM users WHERE id = NEW.user_id FOR UPDATE;
  IF contact IS NULL OR length(contact) > 254
    OR contact !~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$'
    OR position('..' in contact) > 0 THEN
    RAISE EXCEPTION 'Valid Workspace contact email required for new order' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
