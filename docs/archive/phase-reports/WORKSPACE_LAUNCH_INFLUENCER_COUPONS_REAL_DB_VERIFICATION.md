# Workspace Major Launch Phase E.1 — real PostgreSQL verification

Date: 13 October 2026.

**INFLUENCER COUPONS VERIFICATION BLOCKED**

Failing stage: immutable influencer attribution history protection. Real PostgreSQL accepted `TRUNCATE workspace_influencer_history`; its row-level INSERT/UPDATE/DELETE trigger does not intercept statement-level TRUNCATE. The probe deliberately rolled back, preserving all history. E.1 §43 requires an additive migration for a schema defect and forbids applying an unreviewed correction in this task. Verification therefore stopped; subsequent financial/concurrency/browser PASS criteria are not claimed.

## A. Starting branch/worktree

Branch `codex/workspace-1.8-launch`; starting HEAD `eefb553`; worktree clean. Expected `d5e4c8c`, `3887136`, implementation report and 0023 source present. Git comparison found no applied SQL migration 0000–0022 edits. Journal had exactly 0000–0023; no Phase 1.9 migration. Frozen Phase 1.9 branch was not modified. Correction commit `e54df21`; final report/harness committed separately.

## B. Authorized database identity

Independent TCP using the configured exact `localhost:5433/airbharath_lms` target and `/tmp` Unix socket both returned:

| Property | TCP / socket result |
| --- | --- |
| Database | airbharath_lms |
| Database OID | 16384 |
| Server port | 5433 |
| PostgreSQL system identifier | 7680462735222304705 |

Identities matched each other and prior authorized evidence, before and after migration. `DATABASE_ENV=development`. No production/staging target or connection string used/reported. Sandbox required escalation for local database socket access; reviewed commands remained within the explicitly authorized target.

## C. Pre-migration ledger

23 actual rows: 0000–0022; last `0022_lethal_barracuda`. Each ledger SHA-256 and timestamp matched its journal entry and source bytes. Only 0023 pending. No unknown ledger row, ledger manipulation or baseline replacement.

## D. 0023 SQL integrity and migration application

Reviewed full 0023: two new influencer tables, nullable restrictive coupon link, actor/version/history guards, prospective influencer assignment and valid paid-redemption transition guards. No legacy LMS schema or historical row rewrite.

Applied **only** `0023_chubby_jimmy_woo.sql` with guarded `pnpm db:migrate`. Temporary process-only `ALLOW_DATABASE_MIGRATION=true`; no `.env` modification, schema push/reset or trigger disabling.

Actual SHA-256 before and after application:

`eb52bf03f803cf181d155483794f853e9d08c00240e29dd0ba3ace5cd1e7f910`

Application succeeded. Existing local collation-version warning (2.39 vs 2.43) was left untouched. PostgreSQL truncated one generated FK identifier to its normal 63-byte limit; catalogue recorded actual relationship.

## E. Post-migration ledger and no-op

24 actual rows: 0000–0023. Second guarded migration exited successfully, and full after/no-op ledger JSON (IDs, hashes, journal tags, timestamps and database identity) compared byte-for-byte equal. No correction migration applied. Pending source correction is now 0024.

## F. Actual schema/constraints/triggers

Catalogue inspected eight relevant tables: influencers, influencer history, coupons, applicability, redemption, membership orders, payment attempts and refund completions. Recorded 139 columns, 48 constraints, 21 user triggers, 28 indexes, and four influencer-related function definitions in private local evidence.

New columns agree with the Drizzle declarations: influencer identity has nine columns, history six, coupon link nullable with restrictive FK. Row history immutability, actor/version, coupon definition and paid-transition guards are installed. **Statement-level influencer history TRUNCATE protection is absent**, proven by execution. Source-only schema generation agrees with model snapshots; it does not verify trigger semantics.

## G. Historical coupon/data compatibility

All pre-existing coupon influencer links remain NULL, without guessed backfill. Only the new tagged synthetic coupon has a link. Every original coupon row's prior fields remained fingerprint-identical. Original reservations/payment/refund/agreement/member/course/notice/LMS data preserved. Full historical reporting was not executed after the schema stop.

## H. Influencer identity/history

Actual application service with real PostgreSQL created one tagged stable influencer identity. Creation/replay produced one history row. Rename plus inactive/active transitions incremented versions to 3; three actor-attributed immutable snapshots retained the original name. Stale expected-version update rejected with service `conflict`.

Retained fixtures: two tagged users (admin and student), one influencer with three history versions, one influencer coupon with all three applicability links and its creation audit. Prefix `WSE1_<unique UUID>`. No real contact details, financial/provider IDs, paid records or creator grants were introduced.

## I. Admin authorization/audit

Actual service denied a persisted student, malformed empty-name creation and stale version. Coupon created through existing audited service. No auth bypass added. Real HTTP/JWT anonymous/creator/demoted-admin route verification was **not executed** after stop.

Rollback-only direct SQL results:

| Probe | Actual outcome |
| --- | --- |
| History UPDATE | Refused 23514 |
| History DELETE | Refused 23514 |
| Direct history INSERT | Refused 23514 |
| Influencer DELETE | Refused 23514 |
| Invalid version increment | Refused 23514 |
| Non-admin update actor | Refused 23514 |
| Coupon influencer reassignment | Refused 23514 |
| Coupon economics rewrite | Refused 23514 |
| History TRUNCATE | **Accepted; explicitly rolled back** |

After every probe, all three synthetic history rows remained present. No protected row deletion committed.

## J. Coupon pricing and GST

Existing integer pricing tests passed in full validation. Real DB coupon creation validated ₹500 fixed discount on all three current plans. Real quote/pricing fixture matrix was not executed after schema stop; no real-DB economics PASS claimed.

## K. Plan applicability/quote lifecycle

Synthetic coupon persisted all three plan links. Dedicated plan/quote lifecycle regression tests passed. Real eligibility/quote lifecycle and applicability matrix remained unexecuted.

## L. Coupon preview/capacity

Existing fake tests passed. Repeated real preview/no-reservation proof not executed.

## M. Two-session final-slot races

Not executed. No claim of real lock waits, final-slot success or burst-capacity verification.

## N. Same-user idempotency

Actual influencer-create replay converged. Financial request-key/same-user reservation races not executed. Existing fake regression checks passed.

## O. Provider uncertainty/capacity retention

Real DB uncertainty/release matrix not executed. No provider HTTP operation, fake financial mutation or genuine payment/refund was initiated. Global HTTP was blocked in the opt-in SQL harness.

## P. Held capture and redemption correction

0023 paid-transition trigger installed and inspected. Real held-capture SQL rejection and later-authoritative-transition verification not reached. Existing regression tests passed; this is not real-DB proof.

## Q. Authoritative paid conversion

Not exercised. No synthetic financial capture created during this stopped run.

## R. Fulfillment and membership attribution

Not exercised. No membership/profile/manual grant created.

## S. Full-refund attribution

Not exercised. Original genuine Test refund and historical evidence preserved.

## T. Real SQL financial reporting totals

Not executed; no auditable paid/refunded fixture totals exist for this run. Report accuracy remains a required continuation gate.

## U. Test/Live report segregation

Not executed. No fabricated Live records persisted or contacted. Test/Live source regression tests passed only.

## V. Historical held-redemption treatment

Original held/redemption rows preserved; their real reporting treatment remains unverified.

## W. Attribution stability

Influencer service history preserved original identity/name versions. Synthetic coupon reassignment/economic SQL updates refused 23514. Paid-attribution rename test not executed.

## X. Hydrated admin browser

Not started/executed because §43 schema-stop condition was reached first. No authenticated admin browser PASS claimed.

## Y. Hydrated customer checkout browser

Not executed. No isolated payment-enabled application started; normal public charging configuration untouched.

## Z. Mobile/privacy

Mobile overflow, browser source/network/privacy checks not executed. No session cookies/OTP/secrets created or exposed by this run. No real analytics ingestion or email delivery. Source tests continue verifying private/no-capture/default-disabled behavior.

## AA. Migration atomicity

Primary 0023 migration completed successfully through guarded transactional workflow. Separate injected-failure disposable-schema proof not executed after stop. Invalid history probe transactions demonstrably rolled back without data loss; that is not a substitute for migration atomicity testing.

## AB. Original-row preservation

Actual baseline: **53 public tables / 3,712 original rows**, not the older D.1 baseline. MD5 fingerprints of each canonical original row plus duplicate multiplicity compared after verification. All originals preserved; legacy non-Workspace tables unchanged (users allow only tagged additions).

For `workspace_coupons`, the new nullable `influencer_id` field is excluded when comparing prior JSON row shape; separately verified every pre-existing coupon link remains NULL. All prior column values remain unchanged. No history reset or cleanup deletion. Synthetic evidence retained.

## AC. Validation/build

- Full `pnpm validate`: PASS — five pure test files; 78 Vitest files / 964 tests; TypeScript and lint.
- Opt-in real PostgreSQL integrity harness: **BLOCKED** — intended financial-history bulk-deletion regression failed, all invalid probes rolled back.
- Payment-disabled isolated production build: PASS; no `.env` or provider credentials, fake unreachable database, cached fonts; task-owned isolated build copy removed.
- Repository `pnpm db:generate --custom --name workspace_influencer_history_truncate_guard`: generated unapplied correction with Drizzle snapshot/journal.
- Subsequent source-only `pnpm db:generate`: no schema changes/drift.
- `git diff --check`: clean.

Safe validation/build use scrubbed process environment, unreachable fake DB for offline checks, no provider credentials and cached build fonts. No dependency/lockfile edits.

## AD. Corrections/commits

Applied 0023 is **unchanged**. Generated additive unapplied correction:

`drizzle/0024_workspace_influencer_history_truncate_guard.sql`

SHA-256: `a43c81bc2dbe9cae06883946221e6487c51fd85d05ad2a49db38690250627f8e`.

It adds a rejecting statement-level function and BEFORE TRUNCATE triggers on both influencer identity/history tables, including cascaded truncation. No data rewrite or existing function/trigger weakening. Correction was **not applied or executed** in this task; its real behavior requires separate review/authorization and re-run. Commit `e54df21` contains migration, snapshot/journal and source regression pinning the exact applied 0023 bytes and required statement guards.

Files changed in E.1:

- `drizzle/0024_workspace_influencer_history_truncate_guard.sql`
- `drizzle/meta/0024_snapshot.json`
- `drizzle/meta/_journal.json`
- `tests/routes/workspace-influencer-history-migration.test.ts`
- `tests/postgres/workspace-influencer-integrity-verification.cjs`
- `WORKSPACE_LAUNCH_INFLUENCER_COUPONS_REAL_DB_VERIFICATION.md`

No application service/UI code changed.

## AE. Test/Live capacity operational recommendation

Implementation globally shares capacity across modes; this run did not prove the interaction in real SQL. Operational implication: a Test reservation/redemption on the same coupon can consume slots intended for commercial Live sales. Recommend distinct Test and Live campaign codes as the launch operating rule unless a separately approved future environment-scoping design replaces it. This is a recommendation, not a business-rule change.

## AF. Remaining launch blockers

Review and separately authorize unapplied 0024; apply guarded workflow, verify no-op and rerun history/identity truncation and preservation checks. Then complete all remaining E.1 financial concurrency, authoritative held/paid/fulfillment/refund, actual reporting totals/segregation/snapshot, admin/JWT, migration atomicity, hydrated admin/customer and mobile/privacy tests. Existing notice/email and other commercial gates remain separate. No Phase F integration, Phase 1.9 or public charging enabled.

## AG. Recommendation

**INFLUENCER COUPONS VERIFICATION BLOCKED** — immutable attribution audit history can be bulk-deleted by TRUNCATE under applied schema 0023. No history was actually lost. The unapplied additive correction and regression are reviewable; this run stops without claiming financial/browser verification or public-launch readiness.

## Ledger evidence

The following source/journal rows were independently matched to actual database ledger hashes/timestamps. Before: rows 0000–0022. After/no-op: additionally 0023, with all earlier rows unchanged.

| Migration | Ledger timestamp | SHA-256 |
| --- | --- | --- |
| 0000_regular_silk_fever | 1789124954048 | 244506bff67e0e4e102593d277f4959d7b6762345ea6d475764700f55bb8fb47 |
| 0001_careful_warhawk | 1790099480260 | 24c2bbabe9a8d16a6f027d09a13004dddea01c21113990a5939a642b0237c232 |
| 0002_silky_living_tribunal | 1790162267688 | 24033fb008c9e085cd515ff9c6321e518a8bb5e8995ef7ce22c19b9a98b7c2ad |
| 0003_lowly_justice | 1790183727889 | 5e2ada1b77d981fe1e27d321272f7f08fb2c7243067634b57c8213a0e785cc98 |
| 0004_dear_shocker | 1790192348972 | 0bf51a3afa92ba842b517fdf2c85af9fd73bc2827c7c374853cbe3a9199bea82 |
| 0005_sharp_grey_gargoyle | 1790197129493 | 588509617acbb775563f379101f8d5b34534bfbfbe536110682bbb22707f81f8 |
| 0006_great_kate_bishop | 1790236152530 | 0d6b625cca0a51c04d313a53c9a66ccd647927e9efda2959252cc11b2d95a9eb |
| 0007_lucky_wild_pack | 1790924690885 | f0312d81ee36aed56aa48ece4bd09cdf218a375e39879d55623ef9ec819f11aa |
| 0008_eager_energizer | 1790935874838 | ae6c3b89c04374d642a03f0097e3bc52a3b7c3e1ce6b8f752d7f9625135732ac |
| 0009_normal_baron_zemo | 1791274423029 | 6dc0436b50fa865ad5410dd2f95d48be569cd176f812abd47c144ad57ea359e5 |
| 0010_illegal_toxin | 1791281066952 | d806715b9b519bb50eaa3f6f60c9be1b02ea98ebed248a856a91ecd56f30c92e |
| 0011_workspace_coupon_audit_freshness | 1791284353170 | 92d9e796e3b2136e86f144c4a2ff099d81e6e26c12541999dd95a52e34485ec9 |
| 0012_useful_warhawk | 1791286852175 | 4e59a99a11347779b12c793df406727148ba7b6ef3f42764952f57f733274d97 |
| 0013_peaceful_spiral | 1791368221505 | 42b4fcf2ae41c84e5129f68fee5791283b293a8f576c5d694ac2f25825d39d05 |
| 0014_outgoing_freak | 1791436807652 | 286e94347d50db660ce6bcae06c1e1b6eb0baed316b2f3d9d8aedd9af04d6598 |
| 0015_warm_sprite | 1791527685957 | 06fa5c3d985fc53978c87d84b4f4fb2bb3c4200bee73547a76d8508e49d49586 |
| 0016_tired_prowler | 1791632016797 | fbdad83667fe5785b54d86ade9487cf42d71eca2d84382d44b52196dad232e35 |
| 0017_marvelous_captain_midlands | 1791649837299 | ef7c2ef68287770bc7942fdec9b3b286907aa0e27c6d7d842a596cc0aee740f3 |
| 0018_ambiguous_khan | 1791784683791 | f96d3fba6b4234717d40f7325e4d1dea0e4c530175278dd7bfe27979c491ec53 |
| 0019_workspace_creator_terms_v2 | 1791788010129 | d7bee0d65cf2606a4ce72c5cf67f60bcddb61309097d1c894888d012764b7ff8 |
| 0020_gigantic_mordo | 1791794762975 | 1a37339ad50039807da846f63ce07c749d14037a1cb592ff75cbd257a775c3fb |
| 0021_workspace_live_financial_modes | 1791816179271 | 761f5926b78ed41293c8d58139df69a752ad322b8905191280f1e29ad6542421 |
| 0022_lethal_barracuda | 1791830175876 | 050382a0cacd25693074ef5eeead51cf24c6ca20624fed1266f220d198e4226b |
| 0023_chubby_jimmy_woo | 1791863010586 | eb52bf03f803cf181d155483794f853e9d08c00240e29dd0ba3ace5cd1e7f910 |
