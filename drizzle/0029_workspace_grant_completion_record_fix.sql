-- PROPOSED ONLY: local application requires separate owner authorization.
-- Repair table-specific NEW record selection; all completion checks are preserved.
CREATE OR REPLACE FUNCTION workspace_grant_complete() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE g workspace_access_grants; e workspace_access_grant_events; target_grant uuid;
BEGIN
 IF TG_TABLE_NAME='workspace_access_grants' THEN target_grant:=NEW.id;
 ELSIF TG_TABLE_NAME='workspace_access_grant_events' THEN target_grant:=NEW.grant_id;
 ELSE RAISE EXCEPTION 'Unsupported grant completion table' USING ERRCODE='23514'; END IF;
 SELECT * INTO g FROM workspace_access_grants WHERE id=target_grant;
 SELECT * INTO e FROM workspace_access_grant_events WHERE grant_id=g.id AND action='granted';
 IF e.id IS NULL OR e.user_id<>g.user_id OR e.actor_id<>g.granted_by OR e.reason<>g.reason OR e.request_key<>g.request_key OR e.payload_hash<>g.payload_hash OR e.created_at<>g.created_at THEN RAISE EXCEPTION 'Grant and matching audit must commit together' USING ERRCODE='23514'; END IF;
 IF g.status<>'active' AND NOT EXISTS(SELECT 1 FROM workspace_access_grant_events WHERE grant_id=g.id AND action=g.status AND actor_id=g.closed_by AND reason=g.close_reason AND created_at=g.closed_at) THEN RAISE EXCEPTION 'Grant closure needs durable audit' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM workspace_access_grant_events WHERE grant_id=g.id AND action<>'granted' AND (action<>g.status OR actor_id<>g.closed_by OR reason<>g.close_reason OR created_at<>g.closed_at)) THEN RAISE EXCEPTION 'Audit must match grant transition' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END; $$;
