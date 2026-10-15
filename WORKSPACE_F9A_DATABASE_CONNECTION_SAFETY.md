# Workspace F.9A — database connection safety

**WORKSPACE F.9A DATABASE CONNECTION SAFETY VERIFIED LOCALLY**

Branch: `codex/workspace-1.8-launch`. Starting HEAD: `f650d81`. Implementation commit: `b83bd83` (`fix(db): validate connection targets and bound runtime pools`). Verification date: 14 October 2026. Scope: F6-04 only.

## Root cause and exact changes

The shared initializer searched the entire URL for `5433`, then discarded its host, database, credentials and options for a fixed local socket configuration. A synthetic remote password containing those digits reproduced the defect through the actual initializer with the driver mocked; the regression failed before the correction. The worker's narrower socket inference also lacked an environment gate and substituted a fixed identity.

Changed files:

- `lib/db/configuration.ts`: validated target, TLS, pool and timeout configuration; a single adapter for installed postgres.js **3.4.9**. Its runtime accepts host/port arrays although the public `Options` declaration narrows their types; the documented adapter assertion and actual lazy-driver tests cover this discrepancy.
- `lib/db/client.ts`: one lazy shared web pool per process/isolate, including module reloads, with explicit bounded shutdown and configuration-change rejection.
- `lib/db/index.ts`: use the validated shared client; remove substring routing and embedded fallback connection credentials.
- `lib/workspace/payments/worker-database.ts`: use the same target validation while retaining a dedicated serial pool and existing close/finally lifecycle. Financial and refund-notice worker business logic is unchanged.
- `tests/routes/database-configuration.test.ts`: 39 pure/driver-constructor regressions; no remote queries.
- `tests/routes/database-runtime.test.ts`: five mocked initializer, pool-reuse, missing-configuration and failure regressions.
- `tests/routes/workspace-worker-database.test.ts`: update three existing worker assertions for explicit development socket opt-in and preserved identity/limits.
- `WORKSPACE_F9A_DATABASE_CONNECTION_SAFETY.md`: this report, committed separately after implementation.

## Before/after target resolution and fail-closed behavior

TCP is now the default. Parsed hostname and port determine the target; digits in password, username, database or supported query parameters never select a socket. Both PostgreSQL URL schemes, encoded credentials/database names and IPv4/IPv6 are supported. Host arrays avoid the installed driver's string-based IPv6 colon splitting. Credentials are decoded once and retained; explicit password callbacks prevent an empty password falling through to `PGPASSWORD`.

A socket requires **all** of: `DATABASE_LOCAL_SOCKET_PATH=/tmp`, `DATABASE_ENV=development`, non-production Node runtime, parsed host `localhost`, port `5433`, database `airbharath_lms`. It uses the configured identity and explicit `/tmp/.s.PGSQL.5433` path. Other socket paths/targets are rejected. No automatic TCP-to-socket fallback exists.

`DATABASE_ENV` must be explicit. Production Node requires staging/production classification. `DATABASE_URL` or the existing `POSTGRES_URL` alias is required; if both exist they must agree exactly. Missing, malformed, conflicting, duplicate-query, unsupported-query, multi-host or invalid bounded configuration fails before a client is constructed. Errors are fixed identifiers, without connection strings. Configuration changes to an existing web pool require process restart. Connection failure can only retry the configured target, never local credentials or another target.

Remote and production connections use certificate-verified TLS. `sslmode=require`, `verify-full`, `ssl=true` and `sslrootcert=system` with TLS map to `verify-full`; **require is deliberately strengthened**, because postgres.js's native require mode disables certificate validation. Plaintext is permitted only for explicit non-production loopback TCP or the permitted local socket. Prefer/allow, verify-ca, unsupported root-cert files and production plaintext are rejected. Supported bounded URL options are validated rather than forwarded as arbitrary driver/server parameters.

## Pools, timeouts and lifecycle

All settings below are integer-valued and reject zero, fractional, nonnumeric or out-of-range values. Conflicting URL/environment values are rejected. Lock timeout cannot exceed statement timeout. `prepare=false`, `debug=false`, explicit TLS negotiation, suppressed driver notices and explicit session parameters prevent unsafe ambient defaults and incidental sensitive logging.

| Environment setting | Default | Allowed range |
| --- | --- | --- |
| `DB_WEB_POOL_MAX` | 5 development/test; 3 staging/production | 1–10 per process/isolate |
| `DB_WORKER_POOL_MAX` | 1 | Exactly 1 |
| `DB_CONNECT_TIMEOUT_SECONDS` | 5 | 1–30 |
| `DB_IDLE_TIMEOUT_SECONDS` | 20 web | 1–300 |
| `DB_WORKER_IDLE_TIMEOUT_SECONDS` | 5 | 1–60 |
| `DB_MAX_LIFETIME_SECONDS` | 300 | 60–1,800 |
| `DB_STATEMENT_TIMEOUT_MS` | 15,000 web | 1,000–60,000 |
| `DB_WORKER_STATEMENT_TIMEOUT_MS` | 5,000 | 1,000–5,000 |
| `DB_LOCK_TIMEOUT_MS` | 2,000 web | 100–5,000 |
| `DB_WORKER_LOCK_TIMEOUT_MS` | 2,000 | 100–2,000 |
| `DB_IDLE_TRANSACTION_TIMEOUT_MS` | 15,000 web | 1,000–60,000 |
| `DB_WORKER_IDLE_TRANSACTION_TIMEOUT_MS` | 5,000 | 1,000–5,000 |

Web pools survive module reloads and warm serverless invocations within the same isolate; they are not closed per HTTP request. Controlled shutdown/test teardown drains with a five-second bound. Idle/lifetime limits recycle connections. Worker invocations keep their separate one-connection pool and existing one-second close bound in caller `finally` blocks; batch/concurrency/deadline behavior is untouched.

Migrator inspection: `scripts/migrate.mjs` still validates `DATABASE_ENV`, `DATABASE_URL` and `ALLOW_DATABASE_MIGRATION=true` before spawning Drizzle CLI. `drizzle.config.ts` passes the URL directly; the installed CLI's postgres.js adapter uses `max=1`, independently of the web/worker initializer. No substring socket routing exists there. Migration guards/configuration were preserved and no migration command ran; application statement limits are not imposed on migration DDL.

## Authorized local read-only smoke

The **actual corrected `lib/db/index.ts` initializer and Drizzle connection**, loaded using the installed TypeScript compiler in a temporary Node harness, completed SELECT-only verification over TCP and then explicit socket transport. Startup `default_transaction_read_only=on` protected both connections; both pools were closed afterward.

| Evidence | TCP | Explicit socket |
| --- | --- | --- |
| Database | airbharath_lms | airbharath_lms |
| Database OID | 16384 | 16384 |
| System identifier | 7680462735222304705 | 7680462735222304705 |
| Server/configured port | 5433 / 5433 | Unix socket / 5433 |
| Server address | 127.0.0.1 | NULL, as expected for socket |
| Read-only setting | on | on |
| Statement / lock timeout | 15s / 2s | 15s / 2s |
| Ledger | 31 entries, 0000–0030 | Same |
| Journal timestamps / SQL SHA256 | All 31 match | All 31 match |

The temporary harness initially needed correction for PostgreSQL's CIDR formatting of `inet_server_addr()::text`; using `host(inet_server_addr())` made the address assertion accurate. This was a harness issue, with no product or database mutation. No migrations, fixtures, row changes, cleanup, collation/FK repairs or external database connections occurred.

## Completed validation

- Focused configuration/runtime/worker suite: **47 passed**, including all 14 requested categories. Remote scenarios use pure configuration, lazy constructors or mocks; no external connections.
- Full `pnpm validate`: **1,180 Vitest tests across 96 files + 33 Node checks**, TypeScript and lint passed. The initial sandbox run could not complete the native Sharp test; the authorized local rerun completed successfully.
- One isolated production build: **PASS**, 69 static pages generated. Exact source copy, existing dependency symlink and cached original font responses; no dependency/lockfile changes. Synthetic unreachable loopback port 1, production classification and all payment/provider flags off; no secrets/private providers used.
- Migration no-drift: all **64 tracked schema/migration/journal/snapshot files** byte-identical to starting HEAD; 31 journal entries and real ledger/hash match. Neither migration generation nor application was run.
- `git diff --check` and staged diff review: **PASS**. Scope contains only the eight files listed above.

## Production preflight still required

Confirm actual production hostname/database, explicit production classification, trust chain and supported URL options separately before authorized production connection testing. Custom certificate files and multi-host failover URLs are not implemented here; reject rather than guess. Production TLS connectivity was **not** tested locally.

Choose the web pool cap from the actual serverless/replica concurrency and database/pooler capacity: budget all web isolates, concurrent financial/notice worker invocations, LMS/other jobs, migrations and operator headroom. A per-isolate cap does not bound total deployment connections. Keep worker pools serial. Prefer role-specific environment settings over common URL pool/timeouts; shared URL options must also satisfy worker bounds. Confirm transaction-pooler compatibility (`prepare=false`) and statement/lock limits against real workload/worker deadlines. Restart processes after configuration changes.

No production/staging access, genuine provider call, deployment, public-payment enablement or other F.9 work occurred. Existing migrations/payment authorization, authentication, financial, legal and entitlement rules remain unchanged. This verifies F6-04 locally and does not authorize public launch.
