# Workspace Phase 1.4V — real local PostgreSQL verification

Verification date: 2026-10-06. Implementation baseline: `c884ab0`. Corrective commit: `3ad10ec27aa9e0e1358701c5771302544d8c71cf`.

**Phase 1.5 GO**, limited to readiness to begin that separately authorized phase. Phase 1.5 was not implemented.

## A. Environment

Only the explicitly authorized **local development/test** PostgreSQL target `localhost:5433/airbharath_lms` was used. Runtime socket `/tmp`, port 5433, and migration TCP connection returned identical database and server identities, matching Phase 1.3V:

| Property | Verified value |
| --- | --- |
| Database | airbharath_lms |
| Database OID | 16384 |
| System identifier | 7680462735222304705 |
| Postmaster start | 2026-10-05T06:02:46.695Z |
| PostgreSQL | 16.15, Ubuntu |
| Port | 5433 |

`DATABASE_ENV=development` was supplied to local database executions. `ALLOW_DATABASE_MIGRATION=true` was supplied only to guarded migration processes. No `.env` file was changed and no credentials or full connection strings were printed or copied into source/report files.

The real production Next.js build ran on loopback ports 4023 and 4024 using synthetic JWT credentials. Private service credentials and PostHog were disabled. Port 4024 used an intentionally unreachable synthetic loopback database for one failure test. No production/staging/Neon, Razorpay, messaging, email, Redis, or live analytics service was contacted.

## B. Ledger before

The actual `drizzle.__drizzle_migrations` ledger contained **10 rows**, exactly `0000–0009`, matching reviewed migration file SHA-256 hashes and journal timestamps. `0010` was pending. `0011` did not exist at this initial inspection; it was authored only after a reproduced defect.

| Final row | Migration | SHA-256 | Initial state |
| --- | --- | --- | --- |
| 1 | 0000_regular_silk_fever | 244506bff67e0e4e102593d277f4959d7b6762345ea6d475764700f55bb8fb47 | Applied |
| 2 | 0001_careful_warhawk | 24c2bbabe9a8d16a6f027d09a13004dddea01c21113990a5939a642b0237c232 | Applied |
| 3 | 0002_silky_living_tribunal | 24033fb008c9e085cd515ff9c6321e518a8bb5e8995ef7ce22c19b9a98b7c2ad | Applied |
| 4 | 0003_lowly_justice | 5e2ada1b77d981fe1e27d321272f7f08fb2c7243067634b57c8213a0e785cc98 | Applied |
| 5 | 0004_dear_shocker | 0bf51a3afa92ba842b517fdf2c85af9fd73bc2827c7c374853cbe3a9199bea82 | Applied |
| 6 | 0005_sharp_grey_gargoyle | 588509617acbb775563f379101f8d5b34534bfbfbe536110682bbb22707f81f8 | Applied |
| 7 | 0006_great_kate_bishop | 0d6b625cca0a51c04d313a53c9a66ccd647927e9efda2959252cc11b2d95a9eb | Applied |
| 8 | 0007_lucky_wild_pack | f0312d81ee36aed56aa48ece4bd09cdf218a375e39879d55623ef9ec819f11aa | Applied |
| 9 | 0008_eager_energizer | ae6c3b89c04374d642a03f0097e3bc52a3b7c3e1ce6b8f752d7f9625135732ac | Applied |
| 10 | 0009_normal_baron_zemo | 6dc0436b50fa865ad5410dd2f95d48be569cd176f812abd47c144ad57ea359e5 | Applied |
| 11 | 0010_illegal_toxin | d806715b9b519bb50eaa3f6f60c9be1b02ea98ebed248a856a91ecd56f30c92e | Pending / not yet authored |
| 12 | 0011_workspace_coupon_audit_freshness | 92d9e796e3b2136e86f144c4a2ff099d81e6e26c12541999dd95a52e34485ec9 | Pending / not yet authored |

## C. Migration applied

Reviewed `drizzle/0010_illegal_toxin.sql` before execution. First guarded `pnpm db:migrate` applied **only 0010**, adding three definition tables, audit coupon fields, immutable/deferred triggers, and the three approved v1 plans. No campaign coupon was seeded.

A later direct-SQL audit probe revealed a genuine Phase 1.4 defect, documented before correction (section T). A new custom, reviewed versioned migration, `0011_workspace_coupon_audit_freshness.sql`, was then applied through the same guarded local workflow. It replaces only two existing coupon trigger functions. Applied `0000–0010`, their snapshots, and their ledger hashes were preserved. No schema push, reset, seed command, ledger manipulation, or trigger disabling occurred.

## D. Ledger after/no-op

After the initial migration: **11 rows, 0000–0010**. A second migration run succeeded with an exactly unchanged ledger: **no-op**.

After the corrective migration: **12 rows, 0000–0011**. Its second guarded migration run also succeeded with an exactly unchanged ledger. Final inspection matched all 12 recorded hashes/timestamps, including:

| Migration | Journal / ledger timestamp | SHA-256 |
| --- | --- | --- |
| 0010_illegal_toxin | 1791281066952 | d806715b9b519bb50eaa3f6f60c9be1b02ea98ebed248a856a91ecd56f30c92e |
| 0011_workspace_coupon_audit_freshness | 1791284353170 | 92d9e796e3b2136e86f144c4a2ff099d81e6e26c12541999dd95a52e34485ec9 |

## E. Plan schema/seeds

Inspected actual `pg_constraint`, `pg_indexes`, and `pg_trigger` catalogs: **16 constraints, 11 indexes, and 5 non-internal triggers** across the plan/coupon/applicability/audit tables. The coupon completeness trigger is actually `DEFERRABLE INITIALLY DEFERRED`.

Immediately after 0010, exactly three plan rows existed:

| Code | Version | Months | Base paise | GST bps | Currency | Current / available |
| --- | --- | --- | --- | --- | --- | --- |
| quarterly | 1 | 3 | 499900 | 1800 | INR | true / true |
| half_yearly | 1 | 6 | 899900 | 1800 | INR | true / true |
| yearly | 1 | 12 | 1699900 | 1800 | INR | true / true |

Real duplicate `(code, version)` and duplicate current-per-code inserts failed with `23505`. Invalid publisher FK failed with `23503`. Definition checks enforce supported code/duration pairs, positive bounded prices/version, GST 1800, INR, and bounded display names.

Actual indexes inspected:

- `workspace_audit_events_actor_key_idx`: CREATE UNIQUE INDEX workspace_audit_events_actor_key_idx ON public.workspace_audit_events USING btree (actor_id, request_key).
- `workspace_audit_events_coupon_created_idx`: CREATE INDEX workspace_audit_events_coupon_created_idx ON public.workspace_audit_events USING btree (coupon_id, created_at).
- `workspace_audit_events_pkey`: CREATE UNIQUE INDEX workspace_audit_events_pkey ON public.workspace_audit_events USING btree (id).
- `workspace_audit_events_settings_created_idx`: CREATE INDEX workspace_audit_events_settings_created_idx ON public.workspace_audit_events USING btree (settings_id, created_at).
- `workspace_coupon_plans_coupon_id_plan_code_pk`: CREATE UNIQUE INDEX workspace_coupon_plans_coupon_id_plan_code_pk ON public.workspace_coupon_plans USING btree (coupon_id, plan_code).
- `workspace_coupons_pkey`: CREATE UNIQUE INDEX workspace_coupons_pkey ON public.workspace_coupons USING btree (id).
- `workspace_coupons_scope_code_idx`: CREATE UNIQUE INDEX workspace_coupons_scope_code_idx ON public.workspace_coupons USING btree (scope, code).
- `workspace_coupons_status_created_idx`: CREATE INDEX workspace_coupons_status_created_idx ON public.workspace_coupons USING btree (status, created_at).
- `workspace_membership_plans_pkey`: CREATE UNIQUE INDEX workspace_membership_plans_pkey ON public.workspace_membership_plans USING btree (id).
- `workspace_plans_code_version_idx`: CREATE UNIQUE INDEX workspace_plans_code_version_idx ON public.workspace_membership_plans USING btree (code, version).
- `workspace_plans_current_idx`: CREATE UNIQUE INDEX workspace_plans_current_idx ON public.workspace_membership_plans USING btree (code) WHERE (is_current = true).

## F. Plan immutability

Direct updates to price, duration, tax, currency, and availability and direct deletion failed with **23514**. Availability is part of the immutable definition: changing it requires a successor plan version.

Allowed current-pointer changes and successor inserts succeeded. Real successor versions changed quote hashes; selecting the previous current ID failed with `stale_plan`. A real unavailable successor failed with `plan_unavailable`. Current pointers were restored to the three original v1 plans; synthetic successor history was retained without weakening triggers or deleting records.

## G. Coupon schema

Verified actual fixed Workspace membership scope, normalized uppercase 3–32-character code pattern, unique `(scope, code)`, active/paused/archived status, fixed/percentage type bounds, positive/null usage limits, ordered nullable timestamps, bounded campaign/source fields, source enum values, positive version, creator-user restrictive FK, and status/time index.

Applicability uses a restrictive coupon FK and primary key `(coupon_id, plan_code)`, with a supported stable plan-code check. It intentionally references stable codes, not individual version IDs; the deferred trigger verifies selected current plan existence and a positive paid base at creation. No legacy course-coupon FK or shared scope was introduced.

## H. Coupon creation/validation

Actual services created synthetic fixed, percentage, and all-three-plan coupons. Lowercase/uppercase equivalent creation returned controlled `conflict`; the database uniqueness rule was exercised. Repeating an identical command returned the original coupon with one creation audit.

The service rejected all requested invalid definitions: zero/negative fixed discount, percentage zero or >=100%, fixed discount >= applicable base, zero/negative usage limit, end <= start, invalid source, unsupported/empty plan applicability, and malformed code. The fixed-base case returned `discount_invalid`; the other malformed definitions returned `validation`.

Direct SQL could not bypass enforcement: invalid amounts, percentage bounds, usage limits, timestamps, source, scope, lowercase code, status, version, unsupported plan and empty applicability failed with **23514**. An invalid creator FK failed with **23503**. Missing creation audit failed with **23514**. Deferred failures were observed after the transaction callback returned and PostgreSQL attempted commit, not inferred from mocked services.

## I. Coupon lifecycle/immutability

Direct changes to code, discount, campaign, source name/type, usage limit, start/expiry dates, and deletion failed with **23514**. Applicability update/delete and adding applicability after creation audit also failed with **23514**.

Actual lifecycle commands succeeded for active → paused → active → archived. Archived → active failed at the service (`conflict`) and database (`23514`). Retried commands did not create additional audit events. The post-correction real regression also rejects equal lifecycle timestamps.

## J. Audit behavior

Actual creation and status events contained the synthetic persisted admin actor, correct coupon target, action, before/after status, request key, and timestamp. A lifecycle with creation and three transitions produced exactly **four** events, despite retries. Creation audits use null before-status and active after-status; status audits match their predecessor and successor.

Direct audit updates/deletes failed with **23514**. Missing status audit failed at the deferred constraint. After 0011, lifecycle timestamps must increase strictly, and matching audit timestamps must equal the command timestamp. A mismatched later timestamp now fails with **23514**. Application commands already insert their event inside the same transaction with this exact timestamp.

Existing settings-publication audit shape and append-only behavior remained valid. Four synthetic settings publications across the initial and post-correction passes succeeded and retained old versions/configuration/results.

## K. Applicability constraint

Valid single-plan and all-three-plan creation transactions committed. Empty applicability, unknown plan and fixed discount eliminating the selected base failed with **23514**, including commit-time failures. Creation without audit and status changes without fresh matching evidence failed. Relation mutation after definition publication was rejected.

The three checked-in opt-in PostgreSQL regression tests roll back all their fixtures. Before 0011: **1 passed, 2 failed**, reproducing same-timestamp audit reuse and mismatched future audit acceptance. After 0011: **3 passed, 0 failed**. These are actual PostgreSQL trigger/constraint executions.

## L. Quote service results

Actual service and authenticated HTTP quote generation used persisted synthetic eligible users. Amounts below are integer paise:

| Case | Base | Discount | Taxable | GST | Total |
| --- | --- | --- | --- | --- | --- |
| Quarterly, no coupon | 499900 | 0 | 499900 | 89982 | 589882 |
| Half-Yearly, no coupon | 899900 | 0 | 899900 | 161982 | 1061882 |
| Yearly, no coupon | 1699900 | 0 | 1699900 | 305982 | 2005882 |
| Quarterly, fixed 109900 | 499900 | 109900 | 390000 | 70200 | 460200 |
| Quarterly, 1234 bps | 499900 | 61688 | 438212 | 78878 | 517090 |
| Quarterly, exact half-paise tie at 50 bps | 499900 | 2500 | 497400 | 89532 | 586932 |
| Half-Yearly, exact half-paise tie at 50 bps | 899900 | 4500 | 895400 | 161172 | 1056572 |
| Yearly, exact half-paise tie at 50 bps | 1699900 | 8500 | 1691400 | 304452 | 1995852 |

Every successful quote was advisory and unreserved. Pre-GST discounts and integer half-up rounding were verified through actual database-backed services. Quotes did not create financial state.

## M. Quote timing/status/hash

Controlled server clocks verified before start → `not_started`, exact start → valid, immediately before expiry → valid, exact expiry → `expired`, and null bounds → valid without start/expiry restrictions. Active was valid; paused, archived, wrong-plan, unknown, expired and future coupons produced explicit failures. Explicit coupon removal restored the standard full-price quote; failures did not silently return a quote.

Hashes stayed stable for identical economics/context despite different generated/expiry timestamps. They changed under real plan versions, coupon identities/definitions, discount types/amounts, settings versions/launch dates, historical policy acceptance/eligibility attempt context, and the exact launch boundary. A synthetic append-only historical-policy fixture kept amounts unchanged while changing accepted policy/attempt context and hash.

Current policy versions other than the supported v1 deliberately fail closed with `unavailable`; no quote/hash was generated under an unsupported current policy. Current policy pointer was restored. Start-rule identifier remains `workspace-membership-start-v1`; no new start rule was implemented. Hash is an advisory consistency marker, not a reservation or payment authorization.

## N. Authenticated activation smoke

Used standard HS256 `ab_session` cookies signed with the isolated app's synthetic secret and persisted synthetic users; actual session verification, authorization, route handlers, server pages and PostgreSQL ran without auth mocks.

Eligible `/workspace/activate`: **200**, three plans, initial quote, disabled “Payment activation coming next” action. Authenticated quote: **200**, standard 589882 and normalized fixed-code total 460200; `Cache-Control: no-store`.

Expired user redirected to `/workspace/apply`; cooldown user to `/workspace/eligibility-result`. These were Next streamed `NEXT_REDIRECT` responses with HTTP 200, verified by destination, not mistaken for successful activation. Anonymous response: **307**, fixed `/login?callbackUrl=%2Fworkspace%2Fapply`.

Anonymous quote → **401**; never/expired/cooldown quote → **403 eligibility_required**. Injected account fields → **400**; cross-origin mutation → **403**; unknown code → **422 invalid_code**, with no quote. Eligibility journey retained both capability flags false.

These are authenticated HTTP/server-rendered page and API smoke tests. Interactive OTP delivery and browser click-through login were not exercised; no live messaging provider was authorized.

## O. Admin authorization/concurrency

Actual persisted synthetic admin: coupon/settings pages and coupon/plan APIs **200**. Create **201**; inspect returned the correct target/applicability; duplicate normalized code **409**. Pause/reactivate/archive and idempotent retries succeeded with exactly four events; terminal reactivation **409**.

Demoting that persisted admin while keeping its old admin JWT caused GET, POST and PATCH APIs to return **403**, and the admin page to redirect to login. Fixture role was restored afterwards. Student admin requests returned **403**.

Two independent PostgreSQL connections plus a third blocking connection were used for both normalized-code creation and same-predecessor lifecycle races. `pg_stat_activity` observed **two lock waiters** before release in each test. Each race produced one successful commit and one controlled `conflict`; one definition/creation audit and one authoritative transition/audit respectively. Both races passed again after 0011. No redemption/final-slot test was performed.

## P. Legacy coupon regression

Legacy `coupons` whole-row fingerprints and count remained unchanged (**2 rows**). Snapshot comparison confirmed all pre-existing tables except the intentional audit extension were unchanged by 0010; 0011 adds no table/schema changes. Legacy admin, validation and payment-order route sources are unchanged from the Phase 1.3V baseline and still reference `db.query.coupons`, not Workspace coupons.

Actual legacy admin list/page succeeded independently. A Workspace coupon was rejected as invalid by `/api/coupons/validate`; a legacy coupon was rejected by Workspace quoting. Legacy manual Workspace page and admin application list still returned **200**. No live checkout/payment creation, manual application mutation, or email delivery was performed, and no unrelated legacy defect was changed.

## Q. No-financial-state verification

Compared whole-row fingerprints before/after all synthetic verification; all these data remained byte-equivalent under a canonical row-JSON aggregate:

| Table | Unchanged rows |
| --- | --- |
| orders | 1 |
| courses | 6 |
| course_authors | 2 |
| enrollments | 8 |
| workspace_applications | 2 |
| coupons | 2 |

Public table catalog was unchanged after the definition migration. No Workspace membership order, payment, Razorpay record, redemption, creator profile, membership, paid entitlement, invoice, or course ownership was introduced. Actual service and HTTP journey responses reported `hasCreatorAccess=false`, `hasPaidEntitlement=false`; eligible users remained students.

Clearly marked development fixtures were retained: **30 users, 27 Workspace coupons, 19 eligibility attempts, 45 audit events** under `WS14V SYNTHETIC` labels. This includes harmless fixtures from temporary harness retries. Synthetic historical plan/policy rows also remain. No history was deleted/reset; regression and prohibited-write transactions rolled back normally. Current plans are the original three v1 definitions; current settings are **v9** with original approved configuration; current policy is the original supported v1.

## R. Privacy/analytics

Analytics remained disabled. No safe live test project was established, so live capture/delivery is **unverified**.

Executed actual privacy sanitizer with synthetic raw code, campaign/source/influencer strings, exact money, quote ID/hash, user ID, profile URL, course idea and experience answer. All were removed. Output allowed only controlled plan/outcome values and anonymous technical context; URLs lost query values and person processing was false. Autocapture, identify, exception and unknown coupon event names were suppressed. The membership privacy tests also verified client helper payloads and blocked telemetry independence.

## S. Validation

Completed:

- Relevant Phase 1.4 suite before correction: **7 files / 90 tests passed**; migration regression after correction: **4 tests passed**.
- Checked-in real local PostgreSQL regression: **3 passed**, none skipped, after correction; before correction, two failed as expected.
- Full post-correction `pnpm validate`: **5 Node tests + 29 Vitest files / 338 tests passed**, TypeScript `tsc --noEmit` passed, lint passed with no warnings/errors. The command prints Next.js's existing deprecation notice for `next lint`.
- Final post-correction isolated production build: **passed** — successful compilation, type/lint checks, and **55 static pages**.
- `git diff --check`: passed.

Validation/build wrappers blanked private service variables and used a synthetic unreachable database except explicitly authorized real database tests. The production test build's public origin was set to loopback **at build time**, since Next inlines public environment values. The first blank-origin build correctly rejected mutations with 403; correcting that temporary build configuration made the real HTTP tests pass. No repository environment setting or application origin control was weakened.

## T. Defects/corrections

**Real defect, documented before editing:** audited active → paused → active, then an unaudited active → paused with an unchanged timestamp could reuse older status audit evidence. A separate mismatched future audit timestamp also satisfied the original `>=` predicate. All defect probes/regressions rolled back.

Minimum correction: `0011_workspace_coupon_audit_freshness.sql` requires `NEW.updated_at > OLD.updated_at` and matching `created_at = NEW.updated_at`. It replaces two functions while preserving existing triggers, tables, protected definitions, and history. Application commands already obey these timestamp requirements, so no UI/API/business scope change was needed.

Regression evidence: before correction **1 pass / 2 failures**; afterwards **3 passes**. The full database service, quote, lifecycle, audit, concurrency, authenticated HTTP, demotion, legacy and failure-path checks passed again.

Correction committed separately: `3ad10ec27aa9e0e1358701c5771302544d8c71cf` — `fix(workspace): enforce fresh coupon lifecycle audit timestamps`.

Temporary harness adjustments (response-field names, JSON/timestamp serialization, page-heading assertions and compiled loopback origin) were test setup issues; they required no product change.

## U. Remaining limitations

Verification applies only to the authorized local development database and synthetic users/coupons. It does not assert production/staging readiness, real OTP/email/Redis behavior, live PostHog capture, Razorpay behavior, payment activation, reservation/redemption concurrency, or future policy/start-rule compatibility. Unsupported current policy versions were verified to fail closed.

No production migration is authorized. Production operators must separately review and apply the complete versioned chain, **including corrective 0011**; applying 0010 alone retains the reproduced audit weakness. Migration authorization was not persisted.

Temporary comprehensive harnesses and raw JSON evidence are under `/tmp/workspace14v-*`; the report preserves their results. The targeted real PostgreSQL regression is checked in at `tests/postgres/workspace-coupon-audit-freshness.mjs`. It skips unless explicitly opted in, requires `DATABASE_ENV=development` and the exact authorized loopback database, and always rolls fixtures back. Run through the same safe local environment wrapper with `WORKSPACE_LOCAL_DATABASE_VERIFICATION=true`; do not point it at production or an unapproved target.

Both temporary production servers were stopped. No dependencies, lockfile, `.env`, external-service settings or deployment were changed.

## V. Recommendation

**Phase 1.5 GO** based on completed local Phase 1.4V verification **with corrective migration 0011 applied**. Phase 1.4 definitions, advisory quotes, authorization, immutable history, audit evidence, concurrency and legacy isolation passed their real local checks. Phase 1.5 remains unimplemented and requires its own scope/authorization.

Changed repository files in this verification phase:

1. `drizzle/0011_workspace_coupon_audit_freshness.sql` — minimum database correction.
2. `drizzle/meta/0011_snapshot.json` — new custom migration metadata; table/enum definitions match 0010.
3. `drizzle/meta/_journal.json` — append 0011 only.
4. `tests/postgres/workspace-coupon-audit-freshness.mjs` — three opt-in real PostgreSQL regressions.
5. `tests/routes/workspace-membership-migration.test.ts` — migration-chain and correction checks.
6. `WORKSPACE_PHASE14V_VERIFICATION.md` — this report.
