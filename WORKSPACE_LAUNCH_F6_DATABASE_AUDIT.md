# Workspace F.6 database audit — read-only blocked checkpoint

**WORKSPACE F.6 DATABASE AUDIT BLOCKED.** The complete catalog inventory and classifications are recorded below. A serious retained-history protection gap, F6-01, prevents a clean completion recommendation. Further investigation stopped when that finding was identified, as required by the brief. Only final read-only preservation comparison and compilation of already collected evidence followed. No destructive probe, schema/data correction or production operation occurred.

## A. Branch/source/DB identity

Starting branch `codex/workspace-1.8-launch`, HEAD **cece1fc**, clean worktree. Audit date: 14 October 2026. The prior F.5 report is unchanged. Only authorized **localhost:5433/airbharath_lms**, DATABASE_ENV=development, was inspected. TCP and /tmp Unix-socket port 5433 independently matched database OID **16384**, system identifier **7680462735222304705**, server **PostgreSQL 16.15**, and transaction_read_only=on.

Ledger: **30 entries, 0000–0029**, matching every SQL SHA-256 and journal timestamp, ending 0029_workspace_grant_completion_record_fix. No migration generation, application, schema push or ledger manipulation was performed. Private connection strings/credentials were never exported.

## B. Database inventory summary

| Object | Actual inventory |
|---|---:|
| Public tables |61|
| Other inspected tables |3: migration ledger plus two retained D.1 test clones|
| Total tables examined |**64**|
| Public Workspace tables |40|
| Public non-Workspace tables |21, including shared users and unmanaged otps|
| Rows, public |**6,812**|
| Rows, all inspected tables |**6,871** =6,812 public +30 ledger +29 test-clone rows|
| Schemas |public, drizzle, wsd1_clock_682c6438a13747e59257533f1a55773d|
| Views/materialized views/foreign tables |0|
| Sequence |1: drizzle.__drizzle_migrations_id_seq|
| Indexes |172 total;166 public|
| Primary keys / unique constraints / foreign keys |64 /33 /106|
| Check constraints / constraint-trigger catalog entries |68 /14|
| User triggers |89 total;85 public; all enabled|
| Stored functions |57 total;54 public +3 isolated test functions|
| Enum types |3 Workspace enums|
| Extensions |plpgsql only|
| RLS/policies |No enabled application RLS/policies in this local catalog; server authorization remains authoritative|

Fresh measurement confirms the F.5 public count still matches; it was not assumed. Aggregate relation allocation is **9,519,104 bytes** across all tables, including indexes/TOAST; public allocation is **9,371,648 bytes**. This small, mostly synthetic database is not a production-size sample.

Complete definitions, columns, owners, privileges, indexes, constraints, triggers, functions, enums, sequences and metrics are in [catalog before](output/audits/workspace-f6/catalog-before.json), [catalog after](output/audits/workspace-f6/catalog-after.json), [supplemental metadata/plans](output/audits/workspace-f6/integrity-and-plans.json) and [joined table inventory](output/audits/workspace-f6/table-inventory.json). These contain schema metadata/aggregates, not row payloads or private dumps. Row fingerprints are retained only in private /tmp files.

## C. Complete table-by-table classification

**61 KEEP;3 REVIEW;0 UNKNOWN.** REVIEW comprises one No Current Code Reference table and two Potentially Obsolete test clones. No table is declared safe to drop. Every table below is included in the joined inventory with exact rows/sizes, primary key, outgoing/incoming FKs, uniqueness, all indexes/triggers, source references, provenance and retention rationale.

Functional categories:

- **A** — Legacy LMS curriculum, learning, media and course finance.
- **B** — Shared identity/phone authentication or unmanaged legacy auth evidence.
- **C** — Workspace manual applications and automated eligibility.
- **D** — Verified creator email/challenges, rate limits and recipient binding.
- **E** — Creator identity/details, proposals and approved private text builds.
- **F** — Immutable course-review snapshots/events and Admin audit.
- **G** — Versioned catalog, frozen membership orders and fulfilled terms.
- **H** — Workspace capture/refund financial truth and provider observations.
- **I** — Workspace promotions, capacity reservations and attribution history.
- **J** — Complimentary grants and matching immutable audit.
- **K** — Webhook inbox/reconciliation and transactional notification delivery.
- **L** — Versioned rules and immutable legal receipts.
- **M** — Migration metadata and isolated verification infrastructure.
- **N** — Existing LMS community/feed and jobs.

“Runtime” is source evidence, not a React-reference count. “DB dependency” includes outgoing/incoming FK or installed trigger dependence. A negative direct-code search cannot override database-side usage. All current and historical data remain retained.

| Exact table | Category | Current usage | DB dependency | Retention | Classification | Reason |
|---|---|---|---|---|---|---|
| `drizzle.__drizzle_migrations` |M|Migrator, indirect|No declared FK/trigger|Migration|KEEP — Required|Installed Drizzle migrator uses ledger indirectly; reviewed migration identity and ordering are required.|
| `public.certificates` |A|Yes|Yes|Business history|KEEP — Required|Active runtime model and business relationships|
| `public.coupons` |A|Yes|No declared FK/trigger|Business history|KEEP — Required|Active runtime model and business relationships|
| `public.course_authors` |A|Yes|Yes|Business history|KEEP — Required|Active runtime model and business relationships|
| `public.course_bundle_items` |A|Yes|Yes|Business history|KEEP — Required|Active runtime model and business relationships|
| `public.course_sections` |A|Yes|Yes|Business history|KEEP — Required|Active runtime model and business relationships|
| `public.courses` |A|Yes|Yes|Business history|KEEP — Required|Active runtime model and business relationships|
| `public.enrollments` |A|Yes|Yes|Business history|KEEP — Required|Active runtime model and business relationships|
| `public.feed_posts` |N|Yes|Yes|Business history|KEEP — Required|Active runtime model and business relationships|
| `public.invoices` |A|Yes|Yes|Business history|KEEP — Required|Active runtime model and business relationships|
| `public.jobs` |N|Yes|Yes|Business history|KEEP — Required|Active runtime model and business relationships|
| `public.lesson_comments` |A|Yes|Yes|Business history|KEEP — Required|Active runtime model and business relationships|
| `public.lesson_materials` |A|Yes|Yes|Business history|KEEP — Required|Active runtime model and business relationships|
| `public.lessons` |A|Yes|Yes|Business history|KEEP — Required|Active runtime model and business relationships|
| `public.modules` |A|Yes|Yes|Business history|KEEP — Required|Active runtime model and business relationships|
| `public.orders` |A|Yes|Yes|Business history|KEEP — Required|Active runtime model and business relationships|
| `public.otps` |B|None found|No declared FK/trigger|Security|REVIEW — No Current Code Reference|Unmanaged table absent from Drizzle/journal and tracked runtime references. Current phone auth uses MSG91 and Redis limiting. Origin and any external operational use remain unverified.|
| `public.playback_sessions` |A|Yes|Yes|Business history|KEEP — Required|Active runtime model and business relationships|
| `public.progress` |A|Yes|Yes|Business history|KEEP — Required|Active runtime model and business relationships|
| `public.users` |B|Yes|Yes|Business history|KEEP — Required|Active runtime model and business relationships|
| `public.video_captions` |A|Yes|Yes|Business history|KEEP — Required|Active runtime model and business relationships|
| `public.videos` |A|Yes|Yes|Business history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_access_grant_events` |J|Yes|Yes|Evidence/history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_access_grants` |J|Yes|Yes|Evidence/history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_applications` |C|Yes|Yes|Business history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_audit_events` |F|Yes|Yes|Evidence/history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_coupon_plans` |I|Yes|Yes|Evidence/history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_coupon_redemptions` |I|Yes|Yes|Evidence/history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_coupons` |I|Yes|Yes|Evidence/history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_course_drafts` |E|Yes|Yes|Private work|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_course_lessons` |E|Yes|Yes|Private work|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_course_modules` |E|Yes|Yes|Private work|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_course_projects` |E|Yes|Yes|Private work|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_course_review_events` |F|Yes|Yes|Evidence/history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_course_submissions` |F|Yes|Yes|Evidence/history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_creator_profile_details` |E|Yes|Yes|Private work|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_creator_profiles` |E|Yes|Yes|Private work|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_creator_terms_acceptances` |L|Yes|Yes|Evidence/history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_creator_terms_versions` |L|Yes|Yes|Evidence/history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_eligibility_attempts` |C|Yes|Yes|Business history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_eligibility_settings` |L|Yes|Yes|Evidence/history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_email_challenges` |D|Yes|Yes|Security|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_email_notice_bindings` |D|Yes|Yes|Security|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_email_rate_limits` |D|Yes|No declared FK/trigger|Security|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_influencer_history` |I|Trigger-maintained|Yes|Evidence/history|KEEP — Required|No direct JS runtime reference, but installed AFTER INSERT/UPDATE capture trigger writes immutable influencer snapshots; required audit evidence.|
| `public.workspace_influencers` |I|Yes|Yes|Evidence/history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_membership_orders` |G|Yes|Yes|Evidence/history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_membership_plans` |G|Yes|Yes|Evidence/history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_memberships` |G|Yes|Yes|Evidence/history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_payment_attempts` |H|Yes|Yes|Evidence/history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_payment_events` |K|Yes|Yes|Evidence/history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_policy_versions` |L|Yes|Yes|Evidence/history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_refund_attempts` |H|Yes|Yes|Evidence/history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_refund_completions` |H|Yes|Yes|Evidence/history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_refund_notice_deliveries` |K|Yes|Yes|Evidence/history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_refund_notice_delivery_attempts` |K|Yes|Yes|Evidence/history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_refund_notices` |K|Yes|Yes|Evidence/history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_refund_observations` |H|Yes|Yes|Evidence/history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_refund_policy_acceptances` |L|Yes|Yes|Evidence/history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_refund_policy_versions` |L|Yes|Yes|Evidence/history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_refund_requests` |H|Yes|Yes|Evidence/history|KEEP — Required|Active runtime model and business relationships|
| `public.workspace_verified_emails` |D|Yes|Yes|Security|KEEP — Required|Active runtime model and business relationships|
| `wsd1_clock_682c6438a13747e59257533f1a55773d.workspace_refund_notice_deliveries` |M|Test only|Yes|Test history|REVIEW — Potentially Obsolete|Retained D.1 isolated-clock notification-test clone, explicitly created via search_path in tests/postgres/workspace-notice-worker-verification.cjs. No production runtime use proven; dependencies/evidence prohibit automatic disposal.|
| `wsd1_clock_682c6438a13747e59257533f1a55773d.workspace_refund_notice_delivery_attempts` |M|Test only|Yes|Test history|REVIEW — Potentially Obsolete|Retained D.1 isolated-clock notification-test clone, explicitly created via search_path in tests/postgres/workspace-notice-worker-verification.cjs. No production runtime use proven; dependencies/evidence prohibit automatic disposal.|

KEEP does **not** mean every guard/index is complete; F6-01 remains a blocker on several required tables. It means the table and its history must remain.

## D. Schema ownership and migration provenance

public is owned by pg_database_owner; the ledger/test schema and all inspected tables/functions are owned by postgres. The only non-system login role observed is local postgres, superuser/bypass-RLS. Production runtime/migrator roles were not inspected and must not be inferred from this local setup.

The latest Drizzle 0029 snapshot models **60 public tables**. Column sets/types/nullability, FK targets/key columns/actions and named uniqueness/check/PK/index presence match semantically after identifier normalization. PostgreSQL's63-byte identifier truncation explains long generated Workspace FK names. **Five shorter legacy FK names still differ from the snapshot**:

| Table | Snapshot name | Installed name | Semantics |
|---|---|---|---|
|`certificates`|`certificates_issued_by_users_id_fk`|`certificates_issued_by_fkey`|Same columns, target and delete/update rules; validated|
|`course_sections`|`course_sections_course_id_courses_id_fk`|`course_sections_course_id_fkey`|Same columns, target and delete/update rules; validated|
|`courses`|`courses_certificate_activated_by_users_id_fk`|`courses_certificate_activated_by_fkey`|Same columns, target and delete/update rules; validated|
|`modules`|`modules_section_id_course_sections_id_fk`|`modules_section_id_fkey`|Same columns, target and delete/update rules; validated|
|`video_captions`|`video_captions_video_id_videos_id_fk`|`video_captions_video_id_fkey`|Same columns, target and delete/update rules; validated|

This is real naming drift, not missing referential enforcement. Its origin is not proven by the current repository. Matching migration-ledger hashes do not explain historical out-of-band DDL. A future generated constraint rename/drop may fail if it assumes the snapshot name. Inventory and reconcile under a separately authorized compatibility correction; do not alter ledger hashes or rename constraints in F.6.

The extra public.otps table is unmodeled/unversioned in this repository. The two clock-test tables are explicit unversioned harness clones of 0022, not extra applied journal entries. All 54 public stored-function bodies match the last reviewed CREATE/REPLACE body in the migration chain. Complete comparison evidence: [schema comparison](output/audits/workspace-f6/schema-comparison.json), [function/index analysis](output/audits/workspace-f6/index-analysis.json).

Per-table measured rows/allocation and provenance (sizes are heap/index/total KiB; total includes TOAST):

| Exact table | Rows | Heap/index/total KiB | Primary key columns | Introduced by |
|---|---:|---:|---|---|
|`drizzle.__drizzle_migrations`|30|8.0/16.0/32.0|`id`|Drizzle-created migration ledger|
|`public.certificates`|0|0.0/24.0/32.0|`id`|0000_regular_silk_fever.sql|
|`public.coupons`|2|8.0/32.0/48.0|`id`|0000_regular_silk_fever.sql|
|`public.course_authors`|2|8.0/16.0/32.0|`id`|0006_great_kate_bishop.sql|
|`public.course_bundle_items`|4|8.0/32.0/72.0|`id`|0003_lowly_justice.sql|
|`public.course_sections`|4|8.0/16.0/32.0|`id`|0002_silky_living_tribunal.sql|
|`public.courses`|6|8.0/16.0/48.0|`id`|0000_regular_silk_fever.sql|
|`public.enrollments`|8|8.0/32.0/48.0|`id`|0000_regular_silk_fever.sql|
|`public.feed_posts`|2|8.0/16.0/32.0|`id`|0000_regular_silk_fever.sql|
|`public.invoices`|1|8.0/32.0/1056.0|`id`|0000_regular_silk_fever.sql|
|`public.jobs`|4|8.0/16.0/32.0|`id`|0000_regular_silk_fever.sql|
|`public.lesson_comments`|0|0.0/8.0/16.0|`id`|0000_regular_silk_fever.sql|
|`public.lesson_materials`|0|0.0/8.0/16.0|`id`|0000_regular_silk_fever.sql|
|`public.lessons`|25|16.0/16.0/80.0|`id`|0000_regular_silk_fever.sql|
|`public.modules`|15|8.0/16.0/32.0|`id`|0000_regular_silk_fever.sql|
|`public.orders`|1|8.0/32.0/48.0|`id`|0000_regular_silk_fever.sql|
|`public.otps`|6|8.0/16.0/32.0|`id`|Unmanaged/unknown origin|
|`public.playback_sessions`|15|8.0/16.0/24.0|`id`|0000_regular_silk_fever.sql|
|`public.progress`|2|8.0/32.0/40.0|`id`|0000_regular_silk_fever.sql|
|`public.users`|780|200.0/160.0/400.0|`id`|0000_regular_silk_fever.sql|
|`public.video_captions`|0|8.0/32.0/48.0|`id`|0005_sharp_grey_gargoyle.sql|
|`public.videos`|5|8.0/16.0/32.0|`id`|0000_regular_silk_fever.sql|
|`public.workspace_access_grant_events`|57|32.0/64.0/128.0|`id`|0028_workspace_creator_access_grants.sql|
|`public.workspace_access_grants`|52|40.0/96.0/168.0|`id`|0028_workspace_creator_access_grants.sql|
|`public.workspace_applications`|3|8.0/80.0/96.0|`id`|0007_lucky_wild_pack.sql|
|`public.workspace_audit_events`|169|72.0/80.0/184.0|`id`|0009_normal_baron_zemo.sql|
|`public.workspace_coupon_plans`|193|16.0/32.0/80.0|`coupon_id, plan_code`|0010_illegal_toxin.sql|
|`public.workspace_coupon_redemptions`|130|24.0/64.0/120.0|`id`|0012_useful_warhawk.sql|
|`public.workspace_coupons`|133|48.0/48.0/136.0|`id`|0010_illegal_toxin.sql|
|`public.workspace_course_drafts`|180|112.0/128.0/272.0|`id`|0014_outgoing_freak.sql|
|`public.workspace_course_lessons`|514|72.0/80.0/184.0|`id`|0017_marvelous_captain_midlands.sql|
|`public.workspace_course_modules`|78|16.0/48.0/96.0|`id`|0017_marvelous_captain_midlands.sql|
|`public.workspace_course_projects`|27|8.0/64.0/80.0|`id`|0017_marvelous_captain_midlands.sql|
|`public.workspace_course_review_events`|163|48.0/48.0/128.0|`id`|0015_warm_sprite.sql|
|`public.workspace_course_submissions`|101|80.0/112.0/232.0|`id`|0015_warm_sprite.sql|
|`public.workspace_creator_profile_details`|32|8.0/48.0/64.0|`id`|0014_outgoing_freak.sql|
|`public.workspace_creator_profiles`|271|24.0/72.0/128.0|`id`|0013_peaceful_spiral.sql|
|`public.workspace_creator_terms_acceptances`|312|72.0/184.0/288.0|`id`|0018_ambiguous_khan.sql|
|`public.workspace_creator_terms_versions`|2|8.0/48.0/176.0|`terms_version`|0018_ambiguous_khan.sql|
|`public.workspace_eligibility_attempts`|671|384.0/200.0/616.0|`id`|0009_normal_baron_zemo.sql|
|`public.workspace_eligibility_settings`|9|16.0/48.0/96.0|`id`|0009_normal_baron_zemo.sql|
|`public.workspace_email_challenges`|179|48.0/48.0/136.0|`id`|0027_workspace_verified_creator_email.sql|
|`public.workspace_email_notice_bindings`|18|8.0/16.0/24.0|`notice_id`|0027_workspace_verified_creator_email.sql|
|`public.workspace_email_rate_limits`|553|80.0/96.0/208.0|`key, window_at`|0027_workspace_verified_creator_email.sql|
|`public.workspace_influencer_history`|97|40.0/32.0/104.0|`id`|0023_chubby_jimmy_woo.sql|
|`public.workspace_influencers`|84|32.0/16.0/80.0|`id`|0023_chubby_jimmy_woo.sql|
|`public.workspace_membership_orders`|443|616.0/576.0/1232.0|`id`|0012_useful_warhawk.sql|
|`public.workspace_membership_plans`|9|8.0/48.0/64.0|`id`|0010_illegal_toxin.sql|
|`public.workspace_memberships`|224|40.0/64.0/128.0|`id`|0013_peaceful_spiral.sql|
|`public.workspace_payment_attempts`|308|128.0/176.0/344.0|`id`|0012_useful_warhawk.sql|
|`public.workspace_payment_events`|46|24.0/48.0/112.0|`id`|0012_useful_warhawk.sql|
|`public.workspace_policy_versions`|4|8.0/48.0/64.0|`id`|0009_normal_baron_zemo.sql|
|`public.workspace_refund_attempts`|31|16.0/80.0/128.0|`id`|0020_gigantic_mordo.sql|
|`public.workspace_refund_completions`|23|32.0/48.0/112.0|`id`|0020_gigantic_mordo.sql|
|`public.workspace_refund_notice_deliveries`|99|24.0/48.0/112.0|`id`|0022_lethal_barracuda.sql|
|`public.workspace_refund_notice_delivery_attempts`|100|24.0/32.0/88.0|`id`|0022_lethal_barracuda.sql|
|`public.workspace_refund_notices`|133|16.0/32.0/80.0|`id`|0020_gigantic_mordo.sql|
|`public.workspace_refund_observations`|72|32.0/32.0/96.0|`id`|0020_gigantic_mordo.sql|
|`public.workspace_refund_policy_acceptances`|256|48.0/144.0/224.0|`id`|0020_gigantic_mordo.sql|
|`public.workspace_refund_policy_versions`|1|8.0/48.0/80.0|`policy_version`|0020_gigantic_mordo.sql|
|`public.workspace_refund_requests`|87|32.0/80.0/144.0|`id`|0020_gigantic_mordo.sql|
|`public.workspace_verified_emails`|66|24.0/64.0/120.0|`id`|0027_workspace_verified_creator_email.sql|
|`wsd1_clock_682c6438a13747e59257533f1a55773d.workspace_refund_notice_deliveries`|10|8.0/48.0/64.0|`id`|Unversioned retained D.1 clone of 0022_lethal_barracuda.sql|
|`wsd1_clock_682c6438a13747e59257533f1a55773d.workspace_refund_notice_delivery_attempts`|19|8.0/32.0/48.0|`id`|Unversioned retained D.1 clone of 0022_lethal_barracuda.sql|

## E. Source-code references and dependency mapping

The scan covered **683 tracked code/SQL files**, searching physical names and corresponding Drizzle symbols across routes, services/repositories, Admin/Creator code, workers, scripts, tests and historical migrations. Schema declarations are separated from runtime references. The [source map](output/audits/workspace-f6/source-map.json) records file and line for every lexical candidate. Aliases/indirect calls and trigger paths were reviewed separately; broad words in UI copy are not independently treated as proof of database use.

Representative authoritative paths:

- LMS courses/sections/modules/lessons/authors/bundles: curriculum/course routes and lib/course-access.ts; media/captions/playback use their own API routes. Playback sessions remain active audit writes even though Redis handles concurrent-session limits.
- Shared users/roles: lib/auth.ts and persisted Admin authorization; current phone OTP uses MSG91 and Redis rate limiting, not public.otps.
- Manual applications: Workspace application routes; automatic eligibility: lib/workspace/eligibility/service.ts. They serve distinct user journeys and permissions.
- Creator details/drafts: lib/workspace/creator/repository.ts; submitted snapshots/review events: lib/workspace/review/repository.ts; projects/modules/text lessons: lib/workspace/builder/repository.ts.
- Catalog/coupons/attribution: membership/service.ts, membership/reporting.ts, membership/influencers.ts. Installed workspace_influencer_capture trigger writes influencer_history even with no direct runtime symbol reference.
- Orders/captures/webhooks: payments/repository.ts and worker.ts; fulfillment: activation/repository.ts; refunds: refunds/repository.ts; notice delivery: refund-notifications/repository.ts and worker.ts.
- Email ownership/challenges/rate windows/bindings: email/repository.ts and refund-notification recipient queries. Legal versions/receipts: terms/refund-policy repositories and frozen checkout FKs.
- Complimentary grants/events: access/repository.ts, persisted-role locks, shared access resolver and Admin projections. They create no LMS purchase or enrollment.
- Ledger usage is indirect through the installed Drizzle migrator, not application UI imports. The clock-test schema is used by the opt-in notice-worker harness through search_path; current default search_path is "$user",public and does not include it.

No application source or business logic was changed by this audit.

## F. Possible redundant/obsolete tables

| Candidate | Evidence | Uncertainty / decision |
|---|---|---|
| public.otps |6 rows, all past expires_at; phone/otp/verified timestamp fields; no FK/trigger dependencies; absent from Drizzle/journal and tracked runtime search; auth currently uses MSG91 |REVIEW — No Current Code Reference. Origin, external scripts, production presence and retention are unknown. OTP contents were not read/exported. No removal authorized.|
| wsd1_clock_682c6438a13747e59257533f1a55773d.workspace_refund_notice_deliveries |10 retained rows; test harness line71 copies0022 under a private clock/search_path |REVIEW — Potentially Obsolete outside verification. Keeps D.1 evidence and references public refund notices. No automatic disposal.|
| Same schema.workspace_refund_notice_delivery_attempts |19 retained attempt rows, FK to the copied delivery table; test-only source path |Same REVIEW classification; dependencies and evidentiary retention require an approved fixture/backup strategy.|

Deliberate domain separation is **not redundancy**: LMS versus Workspace coupons/orders, identity versus mutable profile details, editable proposal versus immutable submission/review, approved project versus LMS published course, and refund notice versus delivery/attempt/binding each serve different authority or audit purposes. Old catalog/legal versions remain referenced history. Influencer history is KEEP despite the direct-runtime-search negative. Empty captions/comments/material/certificate tables still have active routes and dependencies.

## G. Historical/financial/legal retention requirements

Retain accepted order economics, plan/rule snapshots, GST/discount/attribution, provider observations/events, winning capture, null-time held captures, refund request/decision/completion, reservations/redemptions, membership terms, creator identity, grants and matching events, legal version/receipt hashes, verified-email ownership and recipient binding, submission/review snapshots and historical LMS enrollment/invoice/certificate records. Synthetic origin does not make protected rows disposable.

Application updates to mutable operational state are distinct from immutable evidence. Challenge expiration does not erase consumed proof history; a coupon checkout deadline does not by itself prove safe reservation release; a sent/uncertain notice must not be resent/deleted merely because it is old. Legacy finance/certificates lack Workspace-style immutability triggers, which reinforces the need for controlled roles/retention rather than permission to remove them.

**F6-01 shows bulk-operation protection is incomplete on some retained-history tables; do not claim blanket immutability from row-level guards.** No cleanup is permitted by this report.

## H. Foreign keys, triggers and integrity

All 64 tables have primary keys. All 106 FKs are validated; bounded orphan checks returned zero. All 68 check predicates returned zero violations;13 additional aggregate checks found zero financial/ownership/history anomalies: fulfilled membership ownership/order state, approved project source, grant creation/closure events, capture winner count, full refund owner/amount, exact72-hour deadline, held null-time safety, email proof/challenge relationship, and unconstrained LMS comment/section/video relationships.

All 172 indexes are valid/ready and all 89 user triggers enabled. Delete actions across106 FKs:73 RESTRICT,11 NO ACTION,17 CASCADE and5 SET NULL. There are **no Workspace ON DELETE CASCADE FKs**; legacy curriculum/session cascades and manual reviewer SET NULL behave differently by design. Constraint triggers and composite ownership relationships remain installed. Current values pass checks; no destructive trigger tests were authorized in F.6.

### Serious finding F6-01 — retained-history TRUNCATE guard gap

These seven required history leaf tables have installed row/state guards but **no ON TRUNCATE trigger and no incoming declared FK**:

- `public.workspace_audit_events` — `workspace_audit_events_immutable`.
- `public.workspace_coupon_plans` — `workspace_coupon_plans_immutable`.
- `public.workspace_coupon_redemptions` — `workspace_coupon_paid_evidence_guard`, `workspace_financial_redemption_complete`, `workspace_financial_redemptions_guard`.
- `public.workspace_course_review_events` — `workspace_review_events_consistent`, `workspace_review_events_guard`.
- `public.workspace_memberships` — `workspace_membership_complete`, `workspace_membership_refund_insert_guard`, `workspace_memberships_guard`.
- `public.workspace_payment_attempts` — `workspace_capture_event_time_guard`, `workspace_financial_payment_complete`, `workspace_financial_payments_guard`.
- `public.workspace_payment_events` — `workspace_financial_events_guard`.

Catalog evidence covers 20 Workspace tables with triggers but no TRUNCATE trigger in total; not every one is fully immutable. Two additional retained-work leaves are course_lessons and creator_profile_details. The complete40-table coverage matrix is in [retention-guard finding](output/audits/workspace-f6/retention-guard-finding.json).

PostgreSQL documents that TRUNCATE does not invoke DELETE triggers, requires its own privilege, and rejects external referencing FKs unless those tables are included. Thus the leaf-table row guards do not protect history from an otherwise authorized bulk truncation. This is a catalog-backed inference about native semantics, **not a claim that a destructive command was tested or that data was lost**. The local owner/superuser setup cannot supply least-privilege protection; production permissions remain unknown. [PostgreSQL TRUNCATE documentation](https://www.postgresql.org/docs/16/sql-truncate.html).

The gap affects membership/capture/webhook/review/audit preservation independently of UI authorization. No customer-facing truncate endpoint was found. It is nevertheless serious enough to prevent the requested clean audit recommendation. Further audit investigation stopped; no correction or migration was generated.

### Isolated corrective proposal — separately authorize, do not execute from this report

1. Scope a retained-history bulk-operation hardening change. Review the 40-table guard matrix, distinguishing mutable retained work from fully immutable financial/legal/audit evidence.
2. Design a dedicated unconditional rejecting BEFORE TRUNCATE statement guard for the agreed retained tables. Do not blindly reuse row-oriented functions that depend on OLD/NEW. Preserve every existing row-transition, FK, financial rule and history relationship.
3. Generate a reviewed next migration only in that newly authorized correction; F.6 generates none. Do not modify prior SQL/hash/ledger entries. Add source regressions and an isolated disposable database/schema test plan that proves single-table, multi-table and cascade variants fail atomically; protect genuine/retained fixtures. Do not issue test truncations on this retained local database without explicit bounded authorization.
4. Review application/worker/migration role privileges; production runtime should not own tables or possess TRUNCATE/DDL capabilities. DB triggers complement permissions and do not protect against a deliberate superuser disabling them.
5. After explicit migration/testing authorization, verify all rows and history unchanged, guard coverage complete and normal grant/payment/refund/review operations preserved. Resume F.6 only under owner direction. Keep this correction separate from FK-name reconciliation, collation maintenance, pool changes or cleanup.

## I. Index/query/performance findings

No exact duplicate-index candidate was found in the collected key/method/predicate/uniqueness comparison. **72 of 106 FK relationships lack a complete nonpartial leading-key index** by a deliberately conservative test. 18 have subset-prefix support and one has partial full-prefix support; these are not 72 automatic index recommendations. Composite equality can benefit from an existing subset index, and immutable parent history is rarely deleted. Unique indexes enforce correctness even when scans are zero. FKs do not automatically create child indexes. [PostgreSQL constraints](https://www.postgresql.org/docs/16/ddl-constraints.html).

Prioritize workload review of hot legacy child lookups (lessons.module_id, modules.course_id/section_id, lesson_materials.lesson_id, orders.user_id/course_id, invoices.order_id/user_id, playback_sessions.user_id/video_id), grant latest-owner queries and bounded event/notification/recovery queues. Workspace actor/version FKs are often cold restrictive evidence references; do not add all of them without representative plans/write-cost review.

Eight EXPLAIN-only plans used fixed synthetic constants, with no query execution/ANALYZE. They are representative projections, not full authenticated route benchmarks:

| Projection | Observed nodes | Planning implication |
|---|---|---|
|creator_owned_drafts|Limit, Index Only Scan (workspace_drafts_owner_updated_idx)|Planner estimates only; local small-data choice|
|latest_eligibility|Limit, Incremental Sort, Index Scan (workspace_eligibility_attempts_user_decided_idx)|Planner estimates only; local small-data choice|
|grant_resolver|Limit, Sort, Seq Scan|Planner estimates only; local small-data choice|
|email_latest_challenge|Limit, Index Scan (workspace_email_challenge_user_created_idx)|Planner estimates only; local small-data choice|
|legacy_module_lessons|Limit, Sort, Seq Scan|Planner estimates only; local small-data choice|
|payment_event_queue|Limit, Sort, Seq Scan|Planner estimates only; local small-data choice|
|notification_queue|Limit, Sort, Hash Join, Seq Scan, Hash, Seq Scan|Planner estimates only; local small-data choice|
|admin_order_cursor_projection|Limit, Sort, Seq Scan|Planner estimates only; local small-data choice|

Owner-scoped drafts and email latest challenge use the existing indexes; latest eligibility uses an incremental tie-break sort. Sequential scans on small grant/lesson/queue tables do not establish slowness. Admin cursor projections date_trunc the timestamp, sort computed states/names and always execute a matching exact count; cursor stability does not eliminate count/join/full-search cost. Leading-wildcard ILIKE and lower(name) sorting generally need a separate search/index strategy at scale. No extension/index was installed.

At the first snapshot 44 indexes had zero scans,748 estimated dead tuples, no recorded deadlocks/temp files, and stats_reset was null. Developer tests include intentional failures; rollback counts are not a production-health conclusion. Cumulative counters are not per-request telemetry and can change as reads occur. No VACUUM/ANALYZE/REINDEX or EXPLAIN ANALYZE was run. [PostgreSQL statistics](https://www.postgresql.org/docs/16/monitoring-stats.html), [EXPLAIN](https://www.postgresql.org/docs/16/sql-explain.html).

The one-row invoices table allocates about1MiB including TOAST/indexes; source lib/invoice-generator.ts stores a base64 PDF data URL and the download route decodes it. This is evidence for reviewing PDF storage growth separately, not justification to move/delete historical invoices here. Exact table/index allocations and all candidate indexes remain in the artifacts.

## J. Collation mismatch analysis

Actual database provider **libc**, LC_COLLATE/LC_CTYPE **en_US.UTF-8**, recorded version **2.39**, current **2.43**. Both connections reported the warning. There are 38 version-mismatched named catalog collations and no explicit dependent objects reported for them. That does not cover implicit database-default usage: **45 application indexes** have a default-collated key, **34 unique**. Candidate names are enumerated in index-analysis.json; this is an impact inventory, not proof each index is damaged.

Collation controls text comparison/sort and some character operations. A changed provider can invalidate previously assumed ordering; a warning alone does not demonstrate corrupted customer data. UUID/timestamp-only indexes are not in the 45-key candidate set, but text expressions/predicates and uniqueness require review. [PostgreSQL collation support](https://www.postgresql.org/docs/16/collation.html).

No actual index corruption was demonstrated; no amcheck extension is installed and no structural maintenance test was authorized. Checked relational/logical counts passed. REFRESH VERSION records the new version; it does not rebuild or validate objects. The database-default refresh command is distinct from a named-collation refresh. [ALTER COLLATION](https://www.postgresql.org/docs/16/sql-altercollation.html), [ALTER DATABASE](https://www.postgresql.org/docs/16/sql-alterdatabase.html).

Separately reviewable maintenance plan: authorize the exact environment; identify affected objects; take a protected backup and prove restore independently; plan disk/time/locks and a service window; quiesce writers as required; rebuild reviewed dependent indexes/objects under explicit maintenance authorization; validate ordering/uniqueness/constraints and application behavior; only then refresh recorded versions; compare ledger/row preservation and resume service. Failure/uniqueness conflicts require investigation and backup recovery planning, not forced record deletion. Nothing in this plan was executed. Production collation must be measured independently; the local mismatch must not be assumed there.

## K. Connection pooling/capacity concerns

Local max_connections=**100**, superuser_reserved_connections=**3**, reserved_connections=**0**, DB connection_limit=-1. Regular-role capacity is therefore at most97 before other clients. At the snapshot only the audit connection was present, with no idle-in-transaction/waiting client; current pools or historical high-water marks cannot be reconstructed from that sample.

lib/db/index.ts creates a module-level postgres.js client, prepare=false, with no explicit pool max/idle/application-name or session timeout configuration. Installed postgres.js3.4.9 defaults in src/index.js are max 10 for ordinary Node, max3 for Cloudflare, idle_timeout=null, connect_timeout 30, max_lifetime randomized 30–60minutes. Separately bundled Next dev modules, processes or serverless instances can each create a pool; the earlier local incident is consistent with aggregate pool growth, not proof of production capacity. A ten-pool envelope already exceeds regular local slots before workers/other clients. Prepared-statement disabling does not disable pooling.

Dedicated financial/refund-notice worker pools already use max 1, connect 5s, idle 5s, statement 5s, lock 2s, idle-transaction 5s and close in finally. Shared web transactions have no equivalent explicit deadline; review queue concurrency/instance budgets and the real production pooler/limits before release. Connection settings are server capacity limits, not a safe per-instance budget by themselves. [PostgreSQL connection settings](https://www.postgresql.org/docs/16/runtime-config-connection.html).

**F6-04 configuration-routing risk:** the shared web helper tests connectionString.includes('5433'), so an unrelated remote URL/credential/path containing those digits can select the fixed local /tmp server rather than its parsed target. Workers already use exact parsed localhost/port/database matching. Propose a separate small shared-helper correction and explicit instance-aware pool/timeout configuration; do not change it in this audit. No production target was contacted, and current authorized TCP/socket identity matched.

## L. Operational retention and growth

At inspection:179 email challenges, all past their short expiry;66 consumed,83 accepted,24 superseded,3 expired and3 exhausted. Persisted state labels can remain accepted after time expiry; status/confirm guards evaluate actual expires_at, so this count is not an authorization bypass. Challenge/proof/binding history has retention guards. Old rate windows are0 beyond one day in this snapshot; no retention job was found in the inspected email path. Approve window-only cleanup bounds/monitoring separately, never delete linked proof history as a TTL convenience.

Coupon reservations:72 reserved,36 redeemed,22 released. Conservative provider-uncertainty rules prevent automatic expiry-based release. Payment inbox:2 pending,4 retry,12 needs_review,19 processed,9 ignored. Notice deliveries:80 blocked,7 uncertain,12 accepted. These are local/synthetic operational records, not production backlogs or commercial statistics. Review eventual worker/scheduler readiness and operator handling; do not run workers/providers or purge evidence in F.6.

Immutable review/audit/legal/payment/grant evidence needs owner-approved retention, backup and possibly compliant archival policy. Mutable queue leases/retry projections and pseudonymous rate counters need explicit bounded growth policy; status expiration is not deletion authorization. Legacy otps has6 expired rows and unclear retention/origin. Growth trends cannot be inferred from one small snapshot.

## M. Legacy LMS isolation

Shared users are intentional. LMS courses/orders/invoices/coupons/enrollments/certificates and AWS media remain distinct from Workspace private proposals, membership orders/terms, promotions and capture/refund history. Workspace joins to LMS financial/learning tables were not found in the reviewed financial/grant/builder services; their FKs target shared users and Workspace models, not LMS orders/course ownership.

Creator Access Grants call their existing audited repository, not LMS enrollment APIs. Private proposals/projects are not published LMS courses. Retention/orphan/ownership aggregates pass for existing LMS relationships. Every original LMS row is unchanged in final preservation. No LMS migration, route, purchase or entitlement was modified. Legacy FK-name drift and unmodeled otps require portability review, not repair or domain merging here.

## N. Production portability risks

No production/staging access occurred. Do not copy this fixture-rich local database into production or assume production is at0029. Separately authorize a read-only production preflight that verifies:

1. Exact target identity/environment and migration ledger/source hashes; installed tables, columns, constraint names/actions, functions/triggers and any unmanaged objects.
2. Migration preconditions:0026 explicitly requires the reviewed three current plan v1 catalog before inserting v2; legal/rule/catalog identities and existing historical orders may differ. Never force a precondition by rewriting history.
3. PostgreSQL version/extensions, schema owners and least-privilege runtime/worker/migrator roles; TRUNCATE/DDL permissions and guard coverage.
4. Actual locale/provider/version, candidate indexes and collation maintenance need; assess independently from this local mismatch.
5. Real data sizes, index/query plans, growth/rate-window/backlog metrics, connection-pooler/serverless concurrency budgets, timeouts and long transactions.
6. Protected backup, restore rehearsal, maintenance/rollback plan and migration service-interruption budget; exclude local clock-test schemas and fixtures from production readiness assumptions.
7. All unresolved release gates and financial/legal/email/ownership invariants, plus a separately approved final production smoke.

This is a checklist/proposal, not permission to run it.

## O. Recommended future cleanup/optimization candidates

The first future action is isolated F6-01 hardening, **not cleanup**. Subsequent separately scoped reviews: reconcile the five FK names; address collation maintenance after backup planning; correct shared target parsing/pool budgets; evaluate hot legacy child and queue indexes with representative workload; plan invoice-PDF storage growth; approve rate-counter retention; establish disposition policy for unmodeled OTP/test-clone objects. Any removal needs proven production/operational use, dependent-object review, retention decision, protected backup and rollback. No object is safe-to-drop based on this report.

## P. Work that must NOT be changed

Do not delete/rewrite captured payments, held fixtures, reservations/redemptions, memberships/creator identity, accepted snapshots, Terms/Refund Policy receipts, verified-email/proof/binding data, grant/review/audit history, legacy financial/learning records or D.1 retained evidence. Do not manipulate migration history, disable guards, merge financial domains, change business rules, force release of uncertain capacity, run maintenance, touch production, publish courses, merge frozen Phase 1.9, deploy or enable public charging.

## Q. Prioritized actions with supporting evidence

| ID / priority | Finding | Evidence | Next scope |
|---|---|---|---|
|F6-01 /P1 serious blocker|Retained-history bulk truncation bypasses row guards|Seven history leaves, no TRUNCATE trigger/incoming FK; native PostgreSQL semantics|Separate reviewed guard/least-privilege correction; stop current audit investigation|
|F6-02 /P1 readiness|Local libc version mismatch|2.39→2.43;45 candidate indexes/34 unique|Separately authorized backup/rebuild/validation/refresh plan; do not infer production mismatch|
|F6-03 /P1 portability|Five legacy FK names differ|Equivalent validated semantic FKs, different installed identifiers|Read-only production preflight then isolated compatibility correction|
|F6-04 /P1 configuration|Broad shared target heuristic and pool envelope|lib/db/index.ts substring branch; postgres.js defaults; local100slots|Exact parsed target and instance-aware pool/timeout review under separate authorization|
|F6-05 /P2 scale|Conservative missing FK prefixes, computed cursor/search/count cost|72 flags, existing subset support;8 small-data plans; Admin projection source|Representative workload plan before selective indexes/search/count changes|
|F6-06 /P2 policy|Retention and duplicate-test/unmanaged-auth objects|179 expired challenges, unmanaged6-row otps,29 test-clone rows; history constraints|Retention/backup/fixture policy; no automatic erasure|
|F6-07 /P2 growth|Invoice PDF allocation|1row/~1MiB plus base64 generator/download source|Storage review preserving immutable commercial evidence|

No evidence of current orphan/check violations or data loss was found. The serious gap remains uncorrected. No P0 data-loss incident is asserted.

## R. Read-only preservation verification

Startup connections used default_transaction_read_only=on, max 1, statement_timeout=10s, lock_timeout=1.5s, idle-transaction=20s and connect_timeout=5s. Catalog/data work ran in repeatable-read READ ONLY transactions. The audit imported no application service/provider module; all clients were closed. Plain counts, metadata, checked predicates, hashes and EXPLAIN-only projections caused no row/schema writes.

A fresh 64-table baseline was captured once; prior F.5/D.1 baselines remain untouched. Before and after are identical across DB identity, all table counts, every multiset row fingerprint and structural hash, including ledger, columns, indexes, constraints, enabled triggers and function definitions. **6,871 original rows preserved ; 0 additions/deletions/updates detected; no concurrent original-row change observed.** Read statistics can advance and are excluded from structural equality.

Baseline/after canonical SHA-256:

`49127060609b2e8117a45752ed05c3b4ab0b04351a36fcf13a29e86edcb207e2`

Structural SHA-256:

`d0e9dfba8259443cc07ccdbf2cbbcdda5338b022b6f3c4aa76dc4bc9af51c81c`

The first strict JavaScript comparison rejected Postgres.js Result-array prototypes against parsed JSON arrays. Canonicalizing arrays produced the exact same before/after hash; the baseline was never replaced. The initial supplemental query used the wrong reservation-column assumption and was corrected to the catalog-confirmed coupon_redemptions.status, then rerun successfully inside READ ONLY. Failed tool runs are not counted as successful verification. [Preservation evidence](output/audits/workspace-f6/preservation.json).

## S. Checks/tests performed

- Complete 64-table catalog inventory, 61-public-table/60-modeled-table comparison and 106 validated FK orphan checks.
- 68 CHECK scans, 13 aggregate logical relationships, 54 latest reviewed function-body matches, valid/ready indexes and enabled triggers.
- 8 EXPLAIN-only estimates; no ANALYZE, mutation probe, worker/provider call or production connection.
- Exact before/after 64-table row/schema/ledger preservation, with private hashes excluded from committed exports.
- Audit JavaScript node --check and Python AST syntax checks; machine-readable JSON coverage/consistency assertions; git diff --check.
- Full final **pnpm validate PASS: 1,088 Vitest tests / 89 files plus five pure Node checks; TypeScript and lint pass.** It ran with unreachable synthetic DB and payment flags off, without provider credentials.

No production build was rerun: only opt-in audit tooling, metadata output and Markdown changed; application build inputs/business logic/schema remained unchanged. The F.5 payment-disabled build remains the previous build evidence. No migration-generation command ran. PostgreSQL statistics are development-only; production capacity and corruption certification are not claimed.

Read-only tools require explicit WORKSPACE_F6_READONLY_AUDIT=true, DATABASE_ENV=development and securely supplied local DATABASE_URL; they reject any other target/identity. The fresh before-baseline must never be overwritten. The output excludes OTP values, contacts, cookies/tokens, actual provider IDs/secrets, private lesson contents and raw financial payloads. Functions/constraint definitions are schema metadata matching repository SQL, not a data dump.

## T. Remaining 13-point requirements

All 13 owner-agreed improvements remain mandatory before paid Phase 1.8. F.5's UI closure is preserved; **F.6 is not closed** because F6-01 needs separate corrective authorization and verification. F.7/F.7A main landing-page audit/owner-approved improvements remain mandatory pre-launch work, not optional/post-launch. No other phase started.

## U. Remaining production-release gates

F6-01 hardening, separately measured production compatibility/collation/pool/role/backup readiness, mandatory remaining owner improvements, prior unresolved genuine provider/webhook evidence, production credentials/configuration, separately authorized migrations, scheduler/worker/notification operations, documentation and final release smoke remain gates. Public payments were never enabled by F.6; no deployment, tunnel/provider operation or production/staging access occurred.

The report does not authorize its proposals. No table/index/function/trigger/row, legal text, financial rule, env file or existing phase report was changed. Stop here pending owner-directed correction; do not begin F.7A or cleanup.

## V. PASS/BLOCKED conclusion

**WORKSPACE F.6 DATABASE AUDIT BLOCKED** — F6-01, missing bulk-operation guards on retained-history leaves. Current rows, declared integrity and source hash checks are intact, and every table is classified, but blanket history protection cannot be certified. The isolated proposal in H is concrete and unapplied. No destructive test or schema/data change was used to establish this finding.

Audit/evidence commit: **65af780**. This report is committed separately; its resulting hash is returned to the owner. Complete changed-file manifest relative to cece1fc (15 files):

- `output/audits/workspace-f6/catalog-after.json`
- `output/audits/workspace-f6/catalog-before.json`
- `output/audits/workspace-f6/index-analysis.json`
- `output/audits/workspace-f6/integrity-and-plans.json`
- `output/audits/workspace-f6/preservation.json`
- `output/audits/workspace-f6/retention-guard-finding.json`
- `output/audits/workspace-f6/schema-comparison.json`
- `output/audits/workspace-f6/source-map.json`
- `output/audits/workspace-f6/table-inventory.json`
- `scripts/audits/workspace-f6-analyze.py`
- `scripts/audits/workspace-f6-database-audit.cjs`
- `scripts/audits/workspace-f6-integrity-and-plans.cjs`
- `scripts/audits/workspace-f6-source-map.py`
- `scripts/audits/workspace-f6-table-inventory.py`
- `WORKSPACE_LAUNCH_F6_DATABASE_AUDIT.md`

STOP after this F.6 blocked checkpoint.
