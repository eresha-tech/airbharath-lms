-- Withdrawal is purpose-specific. No deletion, retention term or backup guarantee is introduced.
CREATE TABLE mentor_withdrawals (
 application_id uuid PRIMARY KEY CONSTRAINT mentor_withdrawals_application_id_mentor_applications_id_fk REFERENCES mentor_applications(id) ON DELETE RESTRICT,
 owner_id uuid NOT NULL CONSTRAINT mentor_withdrawals_owner_id_users_id_fk REFERENCES users(id) ON DELETE RESTRICT,
 request_key uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE FUNCTION mentor_withdrawal_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE applicant uuid; actor uuid;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'protected mentorship withdrawal evidence'; END IF;
 actor:=nullif(current_setting('airbharath.mentor_actor',true),'')::uuid;
 -- Same lock as screening/contact decisions: committed withdrawal wins all later work.
 SELECT owner_id INTO applicant FROM mentor_applications WHERE id=NEW.application_id FOR UPDATE;
 IF actor IS NULL OR actor IS DISTINCT FROM applicant OR NEW.owner_id IS DISTINCT FROM applicant
  OR NOT EXISTS(SELECT 1 FROM users WHERE id=actor) OR NEW.created_at IS DISTINCT FROM now()
 THEN RAISE EXCEPTION 'authenticated applicant withdrawal required'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER mentor_withdrawal_identity BEFORE INSERT OR UPDATE OR DELETE ON mentor_withdrawals FOR EACH ROW EXECUTE FUNCTION mentor_withdrawal_guard();
CREATE TRIGGER mentor_withdrawal_no_truncate BEFORE TRUNCATE ON mentor_withdrawals FOR EACH STATEMENT EXECUTE FUNCTION mentor_withdrawal_guard();
--> statement-breakpoint
CREATE FUNCTION mentor_suppression_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE wanted uuid;
BEGIN
 IF TG_TABLE_NAME='mentor_applications' THEN wanted:=NEW.id; ELSE wanted:=NEW.application_id; END IF;
 PERFORM 1 FROM mentor_applications WHERE id=wanted FOR UPDATE;
 IF EXISTS(SELECT 1 FROM mentor_withdrawals WHERE application_id=wanted)
 THEN RAISE EXCEPTION 'withdrawn application: screening and contact suppressed'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER mentor_application_suppression BEFORE UPDATE ON mentor_applications FOR EACH ROW EXECUTE FUNCTION mentor_suppression_guard();
CREATE TRIGGER mentor_review_suppression BEFORE INSERT ON mentor_review_events FOR EACH ROW EXECUTE FUNCTION mentor_suppression_guard();
