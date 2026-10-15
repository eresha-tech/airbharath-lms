# Workspace Launch Blocker A.2 — Creator Terms real PostgreSQL verification

Result: **CREATOR TERMS REAL DB VERIFICATION PASS**.

Scope: authorized local development PostgreSQL only, on `codex/workspace-1.8-launch`, following source/content report `c66be77`. This is technical verification, not legal approval or public-launch authorization. Phase 1.9 remains frozen at `codex/workspace-phase19-wip@a9ea151`.

## A. Database identity

Before migration, the application's `/tmp` Unix-socket connection on port 5433 and the migration runner's TCP connection to `localhost:5433/airbharath_lms` returned identical identity:

| Property | Both connections |
| --- | --- |
| Database | `airbharath_lms` |
| Database OID | `16384` |
| Server port | `5433` |
| PostgreSQL system identifier | `7680462735222304705` |
| Execution classification | `DATABASE_ENV=development` |

An initial sandbox connection was denied; an initial permitted probe then found the server unavailable. A repository start attempt did not establish successful startup. Subsequent live identity checks established the authorized server was available. This task does not claim ownership of PostgreSQL startup and did not stop it.

## B. Pre-migration ledger

Actual ledger: **18 rows, 0000–0017**, ending at `0017_marvelous_captain_midlands` (row 18, journal timestamp `1791649837299`). Every applied hash and journal timestamp matched committed source. Migrations 0000–0017 were byte-identical to the verified Phase 1.8V source at `f47b695`.

The only pending migrations were `0018_ambiguous_khan` and `0019_workspace_creator_terms_v2`. No Phase 1.9 migration was present on this branch.

## C. Migration application

Applied only **0018, then 0019**, using guarded `pnpm db:migrate` against the verified local target. `ALLOW_DATABASE_MIGRATION=true` was supplied only to each migration process, not persisted in `.env`.

| Migration | Verified SQL SHA-256 |
| --- | --- |
| `0018_ambiguous_khan.sql` | `f96d3fba6b4234717d40f7325e4d1dea0e4c530175278dd7bfe27979c491ec53` |
| `0019_workspace_creator_terms_v2.sql` | `d7bee0d65cf2606a4ce72c5cf67f60bcddb61309097d1c894888d012764b7ff8` |

Both files matched committed `c66be77` source before execution and remained unchanged afterward. 0019 publishes V2 additively while preserving V1. No schema push, reset, ledger manipulation, backfill or manual migration shortcut was used.

## D. Post-migration ledger

Actual ledger: **20 rows, 0000–0019**, with no pending migration.

| New ledger row | Tag | Journal timestamp | Hash |
| --- | --- | --- | --- |
| 19 | `0018_ambiguous_khan` | `1791784683791` | `f96d3fba6b4234717d40f7325e4d1dea0e4c530175278dd7bfe27979c491ec53` |
| 20 | `0019_workspace_creator_terms_v2` | `1791788010129` | `d7bee0d65cf2606a4ce72c5cf67f60bcddb61309097d1c894888d012764b7ff8` |

The original 18-row prefix was unchanged. A second guarded `pnpm db:migrate` succeeded and the complete ledger was identical: **verified no-op**.

## E. Catalogue contents

Exactly two documents exist; only V2 is current.

| Version | State | Effective timestamp (UTC) |
| --- | --- | --- |
| `workspace_creator_terms_2026_01` | Historical draft, non-current | `2026-10-12T00:00:00.000Z` |
| `workspace_creator_terms_2026_02` | Uniquely current | `2026-10-12T06:51:32.000Z` |

Real stored canonical content, hashes and metadata matched the corresponding source documents. No duplicate current version remained after any probe.

## F. V1/V2 integrity

- V1 contractual SHA-256: `7263f236cc1b27df8f95ef69a2dcc706981ec2060d58758f788bfe40f6808bac`.
- V2 contractual SHA-256: `8e0c57baad0ebffb9223635c35f4ec9d490dbe9a3c3d1ee9100c70baa042fca8`.
- Archived `lib/workspace/terms/v1.ts` file SHA-256: `d9aa70389bcdcba3969e8c4cf1eedcb4faad98f249ead70872d5bb65d2685c16`.

V1 was preserved; V2 text, hash and effective date were not rewritten. A source-V1/database-V2 mismatch probe returned acceptance `unavailable`, order `terms_required`, and zero orders. It did not silently accept stale content or mutate the catalogue.

## G. Immutability probes

Real PostgreSQL rejected controlled invalid operations. Every invalid-mutation probe ran inside a rollback transaction; triggers and constraints were not disabled.

| Probe | Observed SQLSTATE |
| --- | --- |
| V1/V2 content, hash, version or effective-date mutation; document deletion | `23514` |
| Second current document | `23505` |
| Acceptance ownership, version, hash or timestamp mutation; deletion | `23514` |
| Plain catalogue/acceptance TRUNCATE blocked by referencing FK | `0A000` |
| TRUNCATE CASCADE blocked by immutable-history guard | `23514` |
| Non-current V1 or malformed-hash acceptance | `23514` |
| Order terms snapshot mutation | `23514` |

## H. Acceptance persistence

Synthetic eligible development users exercised the actual evaluator, Creator Terms service and repository. V2 acceptance persisted authenticated ownership, the exact version/hash, authoritative `acceptedAt` and `createdAt`.

The real acceptance table has exactly six columns: `id`, `user_id`, `terms_version`, `terms_content_hash`, `accepted_at`, `created_at`. No IP, user agent, fingerprint, contact copies or raw telemetry metadata was stored there. Direct cross-user order evidence failed its ownership FK.

Clearly tagged `WSCTA2_<UUID>_...` synthetic fixtures are retained as development evidence, including earlier harness attempts. They were not removed by resetting the database or weakening immutable-history controls.

## I. Idempotency

Accepting V2 twice for one user returned the same acceptance ID and authoritative timestamp with exactly one row. Simultaneous acceptance also converged without duplicate evidence or deadlock. Reload did not create another acceptance.

## J. PostgreSQL concurrency

These tests used genuine PostgreSQL sessions and observed database lock waits, not merely an in-memory Promise race.

| Scenario | Observed lock waiters | Result |
| --- | --- | --- |
| Two same-user acceptance sessions behind a real user row lock | 2 | Same acceptance ID/time after release; one row; no deadlock |
| Uncommitted acceptance versus concurrent order | 1 | Other session could not see acceptance or commit an order before release; after commit, normal order succeeded |
| Uncommitted current-version publication versus acceptance | 1 | Catalogue lock serialized selection; publication rollback restored V2, then acceptance succeeded |
| Order commit boundary versus concurrent publication | 1 | Order's catalogue SHARE lock blocked publisher UPDATE until governed order committed; publisher changes then rolled back |

The final catalogue remained V2 current. No temporary publication change was retained.

## K. Purchase enforcement

Normal new-order acceptance for an eligible user without current terms returned `terms_required`, with no order, coupon reservation or provider call. Historical V1 acceptance did not satisfy a new V2-governed purchase.

With matching V2 acceptance, both normal no-coupon and existing-valid-coupon paths stored the exact immutable acceptance identity/version/hash/time. Coupon business logic was unchanged.

The hydrated browser user's saved V2 receipt was subsequently recognized by the normal financial service: its Quarterly order stored the correct snapshot and **589882 paise** total. It remained unpaid, with no provider call, membership, creator profile or premature creator access; role remained student. Public payment routes stayed disabled.

## L. DB insert guards

Direct new-order insertion was rejected for null/partial terms evidence, V1, mismatched hash or invalid future acceptance time (`23514`). Cross-user acceptance ownership failed the composite/FK guard (`23503`). All four order snapshot fields rejected mutation (`23514`). These tests demonstrate protection against service bypass while retaining pre-feature null snapshots.

## M. Historical payment compatibility

Final comparisons matched original-row fingerprints across **42 public tables**. All **204 pre-feature Workspace orders** retained null values in all four new terms fields; all other original order values remained unchanged. **70 original memberships** were unchanged.

Original genuine Razorpay Test E2E evidence was preserved, including provider/capture identity, `paidAt` and refund deadline. No historical financial state was reinterpreted or backfilled.

All **six WS15AVR retained orders** were preserved. Their **three captured held fixtures** remained `held_for_review`, with null `paidAt`/refund deadline and no membership. Seven legacy LMS table counts remained unchanged: courses, orders, coupons, course authors, enrollments, progress and certificates.

## N. Membership/creator compatibility

An existing early-access creator whose historical order has no terms snapshot and who has no current acceptance still resolved `hasCreatorAccess=true` and `hasPaidEntitlement=true` in the authorized development environment. Current acceptance is enforced prospectively for new purchases, not ongoing access reads.

Actual profile/details, draft, submission/review history and approved builder/module/lesson reads succeeded, including persisted lesson text. No production entitlement guard was relaxed to grant Test Mode memberships. No Phase 1.9 work was performed.

## O. Browser flow

A fully hydrated Chrome/Playwright check used the actual migrated database and an isolated local production build with payments disabled. Authentication used an ephemeral synthetic local session, without OTP/service access.

Verified:

- Activation checkbox starts unchecked; payment CTA remains disabled with `Payments not yet enabled`.
- Exact V2 link opens the correct terms with effective date and entity/address details.
- Checking alone makes zero acceptance POST requests.
- Explicit save returns 200 and persists real acceptance.
- Reload represents the recorded agreement correctly, while leaving the checkbox unchecked.
- A stale V1 precondition returns 409 and requests current review/refresh.
- Anonymous current, exact V1 draft and exact V2 pages render correctly.
- Unknown version renders a safe not-found page with `noindex` and no substituted contractual content. In the observed Next.js streamed response, the shell HTTP status was **200**, not a hard 404; the brief's fail-safe alternative is satisfied.
- Mobile 390 × 844 has no horizontal overflow.
- Anonymous acceptance returns 401; disabled payment-order route returns 503.
- The browser user's normal order-service path recognizes V2 as described in K.

The first browser run exposed the reload-status defect documented in S; the corrected hydrated run passed all ten browser checks. No screenshot artifact is claimed.

## P. Privacy

Acceptance storage is minimized to the six evidence columns described in H. Source inspection and the safe browser run found no acceptance telemetry path carrying terms text, identity, contact data, acceptance ID or application answers.

PostHog was disabled in the isolated safe configuration; the browser observed **zero analytics requests**. External requests and local image-proxy requests were blocked to prevent private-service access. This proves behavior in that configuration; no live analytics project ingestion or production analytics delivery was tested. No credentials, session tokens, OTP values or full phone numbers were added to source or this report.

## Q. Failure behavior

- Real current catalogue missing inside rollback-only probe: service returned `unavailable`, without false acceptance.
- Source/DB version mismatch: acceptance `unavailable`, purchase `terms_required`, zero orders.
- Injected acceptance storage exception (`22012`) inside rollback-only transaction: repository failed without persisting acceptance; probe trigger was absent afterward.
- Authenticated HTTP acceptance against an intentionally unavailable local DB: **503 / `unavailable` in 84 ms**, no false success.
- Isolated disposable transactional replays of the reviewed migration statements, with only schema qualification adapted, injected `22012`: 0018 left no partial schema/catalogue; 0019 rolled back the staged publication entirely. Public schema and ledger were untouched by these atomicity probes.

Final inspection found no temporary probe trigger or disposable atomicity schema. Provider calls throughout the service harnesses were **zero**.

Task-owned receivers on ports 4047/4048/4049 were stopped, database/browser connections closed, and temporary session/signing files deleted. Existing PostgreSQL, the user's app and tunnel were left intact. `.env` was not edited; no payment authorization flag was persisted true.

## R. Validation/build

Completed successfully after the corrective change:

| Validation | Result |
| --- | --- |
| Focused Creator Terms/repository/membership routing tests | 26 tests across 3 files |
| Full `pnpm validate` | 732 Vitest tests across 59 files; five pure tests; TypeScript; lint |
| Production build | Passed with payments disabled, private environment excluded and cached-font mocks |
| `git diff --check` | Passed |
| Real primary PostgreSQL harness | 51 recorded checks, complete, zero provider calls |
| Publication commit-boundary harness | Passed; one observed lock waiter |
| Corrected hydrated browser harness | 10 checks, complete |
| Final real PostgreSQL compatibility/order harness | 6 checks, complete, zero provider calls |
| Separate source/DB mismatch and unavailable-DB HTTP probes | Passed |

Full regression coverage includes payment/order, coupons, membership/activation, creator/profile, drafts, review and builder. Lint emitted the existing Next.js command deprecation notice but no ESLint warnings or errors. No dependency installation, lockfile change or migration regeneration occurred.

Local execution evidence was retained under `/tmp/wsta2-*`, including ledger/identity, SQL integrity, primary/publication/browser/final results, mismatch/failure results and validation/build logs. These transient files are not repository artifacts or permanent evidence dependencies; repeatable guarded harnesses are committed.

## S. Corrections, if any

**Genuine defect:** saving acceptance worked, but reloading activation lost the displayed recorded-agreement status even though DB evidence remained. The original hydrated probe observed `represented=false` with the checkbox unchecked.

**Minimum correction (`2fe30a3`):** a private server-side read verifies the owner's existing receipt against the current locked catalogue and projects only version/hash/acceptedAt to activation. UI restores recorded status without prechecking the checkbox. New orders still independently enforce current acceptance. No schema, migration, contractual content, payment enablement or integrity guard changed. Regression coverage was added, and the repeated real browser probe observed `represented=true`, checkbox unchecked, one acceptance row.

Verification harness commit: **`fbaf8b3`**. Earlier test-only transaction bridge and overly strict unknown-page HTTP assumptions were corrected in the harness, without changing product semantics.

All files changed by A.2 relative to `c66be77`:

1. `app/(user)/workspace/activate/page.tsx`
2. `components/workspace/ActivationPreview.tsx`
3. `components/workspace/CreatorTermsAcceptance.tsx`
4. `lib/workspace/terms/repository.ts`
5. `tests/routes/workspace-creator-terms-repository.test.ts`
6. `tests/routes/workspace-creator-terms.test.ts`
7. `tests/routes/workspace-membership-routing.test.ts`
8. `tests/postgres/workspace-creator-terms-verification.cjs`
9. `tests/postgres/workspace-creator-terms-publication.cjs`
10. `tests/postgres/workspace-creator-terms-browser.cjs`
11. `tests/postgres/workspace-creator-terms-final-verification.cjs`
12. `WORKSPACE_LAUNCH_CREATOR_TERMS_VERIFICATION.md`

The report commit is recorded in Git history and the completion response; it cannot embed its own hash. No push or deployment was performed.

## T. Remaining blockers

No unresolved A.2 technical verification blocker remains. Separate public-launch gates remain: final legal review/approval, Refund Policy and its acknowledgement work, production configuration and migration authorization, operational/worker readiness and release smoke. This verification does not establish those gates or authorize public charging.

Public Workspace payments remain disabled; no Live credentials were added or payment configuration changed. Phase 1.9 remains frozen. Analytics behavior with an enabled live project was not exercised, and unknown-version streaming status is documented in O.

## U. Recommendation

**CREATOR TERMS REAL DB VERIFICATION PASS** for the authorized local development environment. The Creator Terms implementation passed migrations, real database integrity/ownership/concurrency, prospective purchase enforcement, historical compatibility, hydrated browser flow and complete regression/build validation after the separately committed reload-status correction.

Stop at Launch Blocker A.2. Do not implement Refund Policy, enable public/Live payments, deploy or resume Phase 1.9 as part of this task.
