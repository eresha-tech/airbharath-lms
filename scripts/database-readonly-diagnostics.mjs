import { queries } from './database-readonly-queries.mjs';

// Never classify from messages, stacks, SQL, URLs, details, or arbitrary code strings.
const guardCategories = Object.freeze({
  preflight_owner_authorization_required: 'configuration_rejected',
  preflight_environment_invalid: 'configuration_rejected',
  preflight_manifest_required: 'configuration_rejected',
  preflight_role_separation_required: 'configuration_rejected',
  preflight_target_invalid: 'configuration_rejected',
  preflight_channel_binding_unsupported: 'configuration_rejected',
  preflight_options_unsupported: 'configuration_rejected',
  preflight_verified_tls_required: 'tls_verification_failed',
  preflight_source_unreviewed: 'source_integrity_failure',
  preflight_snapshot_lineage_invalid: 'source_integrity_failure',
  preflight_identity_mismatch: 'target_identity_mismatch',
  preflight_limits_unverified: 'session_safety_check_failed',
  preflight_tls_unverified: 'tls_verification_failed',
  preflight_readonly_role_required: 'role_verification_failed',
  preflight_deadline_exceeded: 'inspection_timeout',
});
const stages = new Set(['inspection', 'configuration', 'driver_import', 'source_integrity',
  'client_initialization', 'transaction_begin', 'identity_verification', 'session_limits_verification',
  'tls_verification', 'privilege_verification', 'ledger_reconciliation', 'catalog_assessment',
  'prerequisite_assessment', 'report_serialization', 'transaction_finish', 'connection_close', ...Object.keys(queries)]);
const authentication = new Set(['28P01', '28000']);
const connectionSqlstates = new Set(['08000', '08001', '08003', '08004', '08006', '08007', '08P01', '53300', '57P01', '57P02', '57P03']);
const timeoutSqlstates = new Set(['57014', '55P03', '25P03']);
const querySqlstates = new Set(['25006', '25P02', '42P01', '42703', '42883', '42601', 'XX000']);
const sqlstates = new Set([...authentication, ...connectionSqlstates, ...timeoutSqlstates, ...querySqlstates, '42501']);
const tlsCodes = new Set(['ERR_TLS_CERT_ALTNAME_INVALID', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'UNABLE_TO_GET_ISSUER_CERT',
  'CERT_HAS_EXPIRED', 'CERT_NOT_YET_VALID', 'ERR_TLS_CERT_SIGNATURE_ALGORITHM_UNSUPPORTED']);
const connectionCodes = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH',
  'CONNECTION_CLOSED', 'CONNECTION_DESTROYED', 'CONNECTION_ENDED']);
const timeoutCodes = new Set(['CONNECT_TIMEOUT', 'ETIMEDOUT', 'SOCKET_TIMEOUT']);

export function safeDiagnostic(error, stage, guardCode = null) {
  stage = stages.has(stage) ? stage : 'inspection';
  const code = Object.hasOwn(guardCategories, guardCode) ? guardCode : 'preflight_inspection_failed';
  const driverCode = typeof error?.code === 'string' ? error.code : null;
  const sqlstate = sqlstates.has(driverCode) ? driverCode : null;
  let category = guardCategories[code] ?? (stage === 'source_integrity' ? 'source_integrity_failure'
    : Object.hasOwn(queries, stage) ? 'query_failed' : 'inspection_failed');
  if (authentication.has(driverCode)) category = 'authentication_failed';
  else if (tlsCodes.has(driverCode)) category = 'tls_verification_failed';
  else if (timeoutCodes.has(driverCode) || timeoutSqlstates.has(driverCode)) category = 'inspection_timeout';
  else if (connectionCodes.has(driverCode) || connectionSqlstates.has(driverCode)) category = 'connection_failed';
  else if (driverCode === '42501') category = 'insufficient_privileges';
  else if (querySqlstates.has(driverCode)) category = 'query_failed';
  return { code, category, stage, sqlstate };
}
