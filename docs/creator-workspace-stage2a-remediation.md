# Creator Workspace — Stage 2A focused remediation

Prepared 10 November 2026, Asia/Kolkata. Branch `feat/creator-workspace`; baseline `3bc3f96`. **Public launch remains NO-GO.** This phase addresses private media delivery, media/course worker budgets, and missing FAV health coverage. Founder approval is still required. No canonical Creator Terms, production configuration, production database, live AWS asset, real provider operation, deployment, push or merge was performed.

The unchanged Stage 1 readiness packet remains authoritative for every unaffected gate. See [founder acceptance](creator-workspace-stage2a-acceptance.md). Exact results, measurements, file hashes and screenshots are retained under `output/audits/workspace-stage2a/`; its `REPORT.md` records final validation and commit identity.

## Confirmed problems and corrections

### Private delivery

The old Creator/Admin resource handlers and private/frozen/learner HLS segment handlers materialized entire bodies before constructing the response. Existing limits permit 20 MiB resources, 32 MiB segments and 2 GiB original MP4s. The old approach was incompatible with Vercel's documented 4.5 MB buffered response constraint.

The selected architecture keeps application authorization in front of private storage and streams the authorized immutable version through the Node route. This is the smallest correction that preserves current access and revocation semantics. No public object, unrestricted storage URL or new delivery token is issued. Short-lived signed storage delivery was considered: it would require additional revocation/caching controls and would continue to permit bearer access until expiry. It is unnecessary for the current same-origin architecture.

Creator, persisted Admin, saved revision and paid-learner handlers now share a pull-driven response. Single closed/open/suffix byte ranges return 206 with exact lengths and Content-Range; invalid/multiple/unsatisfiable ranges return 416. HEAD returns metadata without an object GET body and ignores Range. A mismatching If-Range causes a full representation. Strong SHA-based ETags describe pinned immutable versions.

The S3 adapters verify bucket privacy/versioning, exact owner/key/version, expected size and applicable source metadata/checksum/encryption. Full binary delivery hashes the body and withholds its last chunk until integrity, EOF and access checks succeed. Range delivery pins a previously fully verified immutable version. HLS manifests remain bounded for parsing and reference rewriting; they only reference authorized application routes. Captions remain bounded, verified text. Small manifest/caption/prefix reads also receive deadlines and cancel their readers on interruption.

Output is emitted on demand in chunks of at most 64 KiB. The Node reader uses its async iterator to preserve backpressure and avoid a Node22 `Readable.toWeb` cancellation race found during testing. Client cancellation and a 50-second request budget propagate to storage; payload routes declare 60 seconds. A slow full download can terminate at that deadline; Range seeking/resumption and actual hosted bandwidth must be accepted externally. This phase does not claim successful full 2 GiB transfers over arbitrary slow connections.

Responses are private, no-store/no-transform, nosniff, same-origin resource policy, no-referrer and vary on Cookie/Authorization. Cross-origin playback/download is deliberately not enabled. Access is checked before opening, again after opening, at least every five seconds during pulls and before the final chunk. Published revisions, current course suspension/retirement, enrollment, ownership and persisted Admin checks remain authoritative. Bytes already received cannot be revoked. No previously unauthorized learner can obtain a private body.

### Course reconciliation

The old invocation could sequentially drain 20 inbox records, 25 payment checks and up to 100 disputes without an aggregate deadline. Provider work could consume the 60-second route before durable recovery finished.

Recovery now has a 35-second cooperative budget, a three-record limit per inbox/check queue, a three-dispute page, six-second provider header/body deadlines and a 256 KB provider JSON cap. It uses read-only GETs to the existing Razorpay collection merchant endpoints, with the same scope and credentials; checkout and capture/refund/dispute accounting remain in the existing commerce/ledger services. No competing payment path was added.

A 90-second scope lease serializes cursor progress. Row claims are made one at a time, so a short invocation does not reserve a large unprocessed batch. A durable rotating phase prevents one queue from starving the others. The dispute cursor advances only after successful item effects; partial pages retain their offset. Failures retain their original intents and use bounded backoff. Late provider completion cannot continue into entitlement or ledger work after abort. Existing database locks and uniqueness still enforce exactly-once effects.

An owned, single-connection worker pool is closed on the invocation deadline, bounding SQL waits/rolling back incomplete transactions without terminating the shared LMS pool. A hard interruption can leave the durable scope lease until its 90-second expiry. The existing outer health lease can delay a hard-crashed observed worker for up to six minutes. Reconciliation resumes safely afterward. Result counts expose due backlog, deferred work, review/failure and elapsed time; persisted dispute errors and expired leases appear in Admin recovery. Backlog capacity still requires hosted arrival-rate/throughput measurement.

### Media verification

The old HLS scan performed the whole LIST/HEAD/GET/hash sequence in one invocation, up to 2,000 objects/4 GiB. It had no durable partial verification.

Migration 0044 adds `workspace_media_verifications`, bound to the exact existing job, source version and provider identity. It stores a paginated inventory, verified version/hash/size evidence, phase and CAS version. Verification is limited to 128 objects, 512 MiB and 45 seconds per pass, with a 15-second per-object cap and a reserve before starting another object. Each fully checked object is checkpointed in a fresh authorized transaction. It reads no provider body larger than the existing object limit.

Resume skips already verified immutable versions. The final LIST must still match the fixed inventory before complete evidence becomes the final job manifest. Canonical inventory comparison tolerates PostgreSQL JSONB key ordering; a real PostgreSQL test exposed and fixed that issue. Additive triggers enforce immutable binding, monotonic inventory/evidence, bounds, retained history and rejection of partial Ready transitions. Existing completed historical jobs remain readable without retroactively manufacturing checkpoints.

The media worker retains the 300-second host declaration and three-asset bound. Its owned pool closes at 230 seconds, with the existing outer cooperative reserve; no plan upgrade or arbitrary maxDuration increase is assumed. Source schedule/health cadence now uses one minute so many-pass jobs can progress. Duplicate dispatch safeguards, private source references, callback identity and original asset retention remain unchanged. A transient read leaves resumable Processing; definitive integrity failure cannot become Ready. No object deletion was added.

### Bank-validation health

The old worker schema and definitions had no FAV identity. The scheduled route now records `bank_validations` through the existing observed-worker model, guarded by the existing worker authorization. Migration 0044 adds this exact key to the CHECK; no other worker's identity was reused.

Admin Launch operations now includes the independent Creator bank verification card and Bank verification queue. It records last attempted/finished/successful run, current outcome and last completed snapshot counts for pending, uncertain, blocked/review and stale records. Failure preserves the previous success and displays missing snapshot evidence honestly. A one-minute worker is Stale after the existing ten-minute floor; active lease and interrupted-run semantics remain unchanged. Uncertain/blocked/review/stale conditions need attention. Invalid evidence retains priority even if configuration is unavailable. Recovery links point to the original immutable payee version and never offer a second billable request as a timeout shortcut.

FAV activation, API permissions, funding type, pricing and ticket #1221276 remain unconfirmed. This phase does not change bank verification or payout authorization policy, approve payees, or establish external uptime alerts. Operational ownership remains the platform/on-call owner together with the bank-review lead.

## Reviewed additive migration

`0044_workspace_launch_runtime_remediation.sql` adds the checkpoint table/guards, course-worker lease/cursor scheduling fields and FAV health CHECK. It changes no historical SQL or snapshot. The journal appends entry 44; schema snapshot lineage is preserved. Read-only release-preflight migration/source pins and its bounded ledger query were updated to the 45-entry chain.

Only the disposable PostgreSQL database was migrated. Its complete 45-entry ledger hashes were compared to source, and all indexes were valid. Offline Drizzle generation reports no schema drift. Production application, lock assessment, backup/restore and rollout remain a separate human-approved release. Retain checkpoint and financial history on rollback; do not drop evidence or rewrite old migrations.

## Verification boundaries

The final evidence report enumerates actual test outcomes. Coverage includes large/small responses, HEAD/Range, private roles, expired/revoked access, full hash/truncation/error/abort/cancellation, interrupted/slow/concurrent media verification, 2,000-object PostgreSQL recovery, slow/partial/repeated payment recovery, dispute cursor continuity and dedicated FAV health/stale/backlog visibility. Real Chrome decodes locally generated H.264/AAC HLS in the existing Creator and learner desktop/mobile UI and seeks both HLS and private MP4. The 2,000-object PostgreSQL fixture uses small synthetic TS bodies; a separate byte-budget test uses large synthetic segments. Neither is a 4 GiB real-AWS benchmark.

The isolated financial foundation rechecks refund/dispute recovery, verified beneficiary/version binding, independent financial approval, durable payout idempotency/uncertainty, rejected or revoked payees and terminal provider evidence using synthetic transports. Required full validation covers Creator membership/renewal/grants, LMS access, mentorship pre-registration and the existing RazorpayX safeguards. Unrelated historical audit suites were not rerun merely to increase totals.

All code checks use sanitized source copies with no `.env` files or live credentials. The build uses an unreachable loopback database URL. PostgreSQL tests assert database name, Unix socket, data-directory ownership and null external server address before SQL. Browser traffic is restricted to localhost; all provider operations are synthetic. Temporary injected transports are outside shipping source. Tested source includes the six retained unrelated edits; those edits are excluded from this scoped commit.

During development, tests exposed the Node cancellation race and PostgreSQL JSONB ordering issue above; both were corrected. A late contract assertion needed updating when abort propagation added a signal argument. Initial root typechecking accidentally included archived output sources and ran out of memory; correct credential-free source-copy validation is the reported result. No incomplete or failed attempt is counted as successful.

## Affected readiness gates only

| Gate | Stage 1 | Stage 2A local result | Remaining launch evidence |
| --- | --- | --- | --- |
| MEDIA-DELIVERY | Blocked: buffered large bodies | Streaming/Range/HEAD/authorization correction locally verified | **NOT VERIFIED** on actual hosting; retain public blocker until hosted large/slow/cancel/privacy checks pass |
| MEDIA-BUDGET | Blocked: one unbounded integrity scan | Bounded checkpoint/resume locally verified, including maximum object count | Representative AWS duration/bytes/latency, scheduler throughput and host memory/runtime |
| WORKER-BUDGET | Blocked: sequential provider overrun | Deadline/batch/lease/cursor/backoff and exactly-once recovery locally verified | Actual host/provider latency, SQL cancellation, arrival-rate/backlog drain and external alert delivery |
| FAV-HEALTH | Blocked: missing identity | Dedicated schema/observer, timestamps/backlog/stale/Admin links locally verified | Real scheduler health, assigned owner and independent alert receipt; no live FAV capability inferred |
| MEDIA-AWS | Not verified | **NOT VERIFIED** | Actual authorized AWS bucket/IAM/MediaConvert/event/lifecycle and representative real-media proof |
| JOB-DELIVERY | Not verified | **NOT VERIFIED** | Actual authenticated hosted cron/webhook invocation, hard-crash recovery and missed-run alerts |

All other readiness gates retain their Stage 1 status, including FAV enablement, live payout/funding, hosting plan/static egress, production drift/restore, canonical policies and native encoding. Source cron declarations and synthetic tests do not close these gates. Overall recommendation remains **NO-GO**.

## Official contracts used

- [Vercel Function limits](https://vercel.com/docs/functions/limitations) and [streaming Functions](https://vercel.com/docs/functions/streaming-functions): streamed responses are exempt from the buffered 4.5 MB payload limit, but actual adapter/plan/runtime behavior must still be proven.
- [Amazon S3 GetObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html): exact VersionId, expected bucket owner and a single byte range. This implementation does not promise multipart ranges.

See the unchanged provider-readiness document for account-specific financial/hosting prerequisites. No private service was contacted to infer enablement.

## Final local verification results

| Check | Completed result |
| --- | --- |
| Focused Stage2A coverage | 217 cases across eight relevant suites pass within final validation; earlier standalone focused run also passed |
| `pnpm validate` | 66 pure tests + 1,934 route tests in 159 files; TypeScript and lint pass |
| Production build | Pass in credential-free copy, with 83 static pages generated; no production connectivity proof |
| Fresh isolated PostgreSQL foundation | 48 existing financial/publishing/payout safeguard groups pass through finalized migration 0044 |
| Focused isolated PostgreSQL | Nine deadline/ledger/checkpoint/concurrency/FAV-health groups pass |
| Actual database source comparison | All 45 migration hashes match; 539 indexes valid, zero invalid/not-ready |
| Offline Drizzle comparison | No schema changes / nothing to migrate beyond 0044 |
| Chrome browser/HTTP integration | Nine workflow groups pass, including desktop/mobile HLS and MP4 seeking, large responses and FAV health |
| Preservation | Six protected edits, eight Stage 1 files, 88 historical SQL/snapshot files, first 44 journal entries and dependency files unchanged |

Local filesystem/localhost measurements (not a hosted network benchmark):

| Workload | Result |
| --- | --- |
| Private PDF | 18,874,368 bytes, 291 received chunks; first byte 131 ms, complete 409 ms, exact hash |
| Private HLS segment | 10,800,976 bytes, 166 received chunks; first byte 265 ms, complete 429 ms, exact hash recorded |
| Cancelled original MP4 | Client stopped after 65,536 bytes; storage close statistics confirm an incomplete source read |
| Real 16-second H.264/AAC fixture | 28,842,948-byte MP4; Creator/learner HLS decode at 1280×720 and seek beyond 10 seconds; private MP4 seeks beyond 12 seconds |
| Representative HLS integrity check | Five objects; one PostgreSQL-backed verification pass in 365 ms |
| Interrupted maximum object-count recovery | 2,000 objects; 126,809 ms across 17 additional invocation attempts, including concurrent CAS recovery; complete manifest required |
| Slow course-provider test | Scaled 40 ms budget returned in 87 ms including local SQL cleanup; late 200 ms provider response granted no entitlement |

The 35-second course and 45-second media budgets are cooperative; SQL/connection shutdown and cleanup have bounded overhead. Large-source or poor-network transfer completion, real AWS throughput, maximum 4 GiB output latency and hosted cron capacity remain external checks. No peak-memory or real Vercel transfer measurement is claimed. A failed warm-page browser replay was corrected to wait for page hydration before selecting the lesson; only completed passing checks above are counted.

## Exact scoped changed-file manifest

- `app/api/admin/workspace/course-builds/[id]/media/[assetId]/access/route.ts`
- `app/api/admin/workspace/course-builds/[id]/media/[assetId]/stream/[name]/route.ts`
- `app/api/admin/workspace/publishing/[id]/revisions/[revisionId]/media/[assetId]/[name]/route.ts`
- `app/api/admin/workspace/publishing/[id]/revisions/[revisionId]/media/[assetId]/stream/[name]/route.ts`
- `app/api/courses/[courseId]/lessons/[lessonId]/media/[assetId]/[name]/route.ts`
- `app/api/courses/[courseId]/lessons/[lessonId]/media/[assetId]/stream/[name]/route.ts`
- `app/api/internal/course-payments/reconcile/route.ts`
- `app/api/internal/creator-bank-validations/reconcile/route.ts`
- `app/api/workspace/media/[id]/access/route.ts`
- `app/api/workspace/media/[id]/stream/[name]/route.ts`
- `app/api/workspace/publishing/[id]/revisions/[revisionId]/media/[assetId]/[name]/route.ts`
- `app/api/workspace/publishing/[id]/revisions/[revisionId]/media/[assetId]/stream/[name]/route.ts`
- `components/workspace/operations/Pages.tsx`
- `docs/creator-workspace-stage2a-acceptance.md`
- `docs/creator-workspace-stage2a-remediation.md`
- `drizzle/0044_workspace_launch_runtime_remediation.sql`
- `drizzle/meta/0044_snapshot.json`
- `drizzle/meta/_journal.json`
- `lib/async-budget.ts`
- `lib/commerce/service.ts`
- `lib/creator-payments/bank-validation/worker.ts`
- `lib/creator-payments/worker-provider.ts`
- `lib/creator-payments/worker.ts`
- `lib/db/schema.ts`
- `lib/workspace/media/delivery.ts`
- `lib/workspace/media/http.ts`
- `lib/workspace/media/processing-provider.ts`
- `lib/workspace/media/processing.ts`
- `lib/workspace/media/provider.ts`
- `lib/workspace/media/repository.ts`
- `lib/workspace/media/runtime.ts`
- `lib/workspace/media/service.ts`
- `lib/workspace/media/source-delivery.ts`
- `lib/workspace/media/streaming.ts`
- `lib/workspace/media/uploads.ts`
- `lib/workspace/media/verification-checkpoint.ts`
- `lib/workspace/media/worker.ts`
- `lib/workspace/operations/model.ts`
- `lib/workspace/operations/monitoring.ts`
- `lib/workspace/operations/worker.ts`
- `lib/workspace/payments/worker-database.ts`
- `lib/workspace/publishing/delivery.ts`
- `scripts/database-readonly-preflight-core.mjs`
- `scripts/database-readonly-queries.mjs`
- `scripts/stage2a-isolated-postgres.cjs`
- `scripts/stage2a-local-test.cjs`
- `scripts/stage2a-verify.cjs`
- `tests/postgres/stage2a-browser.cjs`
- `tests/postgres/stage2a-media-fixture.cjs`
- `tests/postgres/stage2a-verification.cjs`
- `tests/routes/database-readonly-preflight.test.ts`
- `tests/routes/stage2a-bank-worker-health.test.ts`
- `tests/routes/stage2a-course-worker-provider.test.ts`
- `tests/routes/stage2a-media-checkpoints.test.ts`
- `tests/routes/stage2a-streaming.test.ts`
- `tests/routes/workspace-media-http.test.ts`
- `tests/routes/workspace-media-processing-provider.test.ts`
- `tests/routes/workspace-media-provider.test.ts`
- `vercel.json`

The six protected unrelated files and eight Stage 1 packet files are excluded. Full baseline/current SHA256 evidence is in `baseline.json`, `changed-files.json` and `preservation.json` in the local evidence directory. Generated databases, temporary provider state, screenshots and logs are not part of the engineering commit.
