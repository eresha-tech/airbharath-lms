-- E.1 found that row-level guards do not intercept TRUNCATE. Preserve stable
-- influencer identities and their immutable attribution audit history, including CASCADE.
-- This correction is additive; applied migration 0023 and all existing rows stay unchanged.
CREATE FUNCTION workspace_influencer_reject_truncate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Influencer identity and attribution history cannot be truncated' USING ERRCODE='23514';
END; $$;
--> statement-breakpoint
CREATE TRIGGER workspace_influencers_truncate_guard BEFORE TRUNCATE ON workspace_influencers
 FOR EACH STATEMENT EXECUTE FUNCTION workspace_influencer_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_influencer_history_truncate_guard BEFORE TRUNCATE ON workspace_influencer_history
 FOR EACH STATEMENT EXECUTE FUNCTION workspace_influencer_reject_truncate();
