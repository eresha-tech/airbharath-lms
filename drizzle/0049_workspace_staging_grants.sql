-- Distinct authoring-only grant scope; no existing grants or audit history are changed.
ALTER TABLE workspace_access_grants DROP CONSTRAINT workspace_grant_context_check;
--> statement-breakpoint
ALTER TABLE workspace_access_grants ADD CONSTRAINT workspace_grant_context_check CHECK (
 source='admin_complimentary' AND scope='creator_workspace'
 AND environment IN ('development','test','staging','production')
 AND payload_hash ~ '^[a-f0-9]{64}$' AND length(btrim(reason)) BETWEEN 10 AND 1000);
