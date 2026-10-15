# Workspace Phase 1.6V verification

Status: PASS — Phase 1.6V complete on 8 October 2026. No product functionality added.

## A. Environment

Authorized local development/test target: localhost:5433/airbharath_lms. Runtime /tmp socket and migration TCP identity match: database airbharath_lms, port 5433, database OID 16384, PostgreSQL system identifier 7680462735222304705. No production/staging access. Temporary migration acknowledgement only; no environment-file edits.

## B. Ledger before

14 rows, all file hashes and journal timestamps matched. Corrected 0012 and 0013 present; 0014 pending.

| Migration | Hash | Timestamp |
| --- | --- | --- |
| 0000_regular_silk_fever | 244506bff67e0e4e102593d277f4959d7b6762345ea6d475764700f55bb8fb47 | 1789124954048 |
| 0001_careful_warhawk | 24c2bbabe9a8d16a6f027d09a13004dddea01c21113990a5939a642b0237c232 | 1790099480260 |
| 0002_silky_living_tribunal | 24033fb008c9e085cd515ff9c6321e518a8bb5e8995ef7ce22c19b9a98b7c2ad | 1790162267688 |
| 0003_lowly_justice | 5e2ada1b77d981fe1e27d321272f7f08fb2c7243067634b57c8213a0e785cc98 | 1790183727889 |
| 0004_dear_shocker | 0bf51a3afa92ba842b517fdf2c85af9fd73bc2827c7c374853cbe3a9199bea82 | 1790192348972 |
| 0005_sharp_grey_gargoyle | 588509617acbb775563f379101f8d5b34534bfbfbe536110682bbb22707f81f8 | 1790197129493 |
| 0006_great_kate_bishop | 0d6b625cca0a51c04d313a53c9a66ccd647927e9efda2959252cc11b2d95a9eb | 1790236152530 |
| 0007_lucky_wild_pack | f0312d81ee36aed56aa48ece4bd09cdf218a375e39879d55623ef9ec819f11aa | 1790924690885 |
| 0008_eager_energizer | ae6c3b89c04374d642a03f0097e3bc52a3b7c3e1ce6b8f752d7f9625135732ac | 1790935874838 |
| 0009_normal_baron_zemo | 6dc0436b50fa865ad5410dd2f95d48be569cd176f812abd47c144ad57ea359e5 | 1791274423029 |
| 0010_illegal_toxin | d806715b9b519bb50eaa3f6f60c9be1b02ea98ebed248a856a91ecd56f30c92e | 1791281066952 |
| 0011_workspace_coupon_audit_freshness | 92d9e796e3b2136e86f144c4a2ff099d81e6e26c12541999dd95a52e34485ec9 | 1791284353170 |
| 0012_useful_warhawk | 4e59a99a11347779b12c793df406727148ba7b6ef3f42764952f57f733274d97 | 1791286852175 |
| 0013_peaceful_spiral | 42b4fcf2ae41c84e5129f68fee5791283b293a8f576c5d694ac2f25825d39d05 | 1791368221505 |

## C. Migration 0014

Pre-application review: two separate private content tables, owner/profile composite foreign keys referencing the existing 0013 owner index, required content/status/currency/category/price/version/timestamp checks, idempotency uniqueness, immutable ownership/request context and no-delete/version-transition guard triggers. Shared PL/pgSQL guard accesses draft-only fields only inside its draft-table branch. No readiness correction identified.

SHA-256: 286e94347d50db660ce6bcae06c1e1b6eb0baed316b2f3d9d8aedd9af04d6598. Applied through guarded `pnpm db:migrate`: only 0014. Second guarded execution exited successfully with exactly the same ledger (no-op).

## D. Ledger after/no-op

15 rows, 0000–0014. Every hash and journal timestamp matched the actual Drizzle ledger; the first 14 rows are exactly those in section B. The added row is:

| Migration | Hash | Timestamp |
| --- | --- | --- |
| 0014_outgoing_freak | 286e94347d50db660ce6bcae06c1e1b6eb0baed316b2f3d9d8aedd9af04d6598 | 1791436807652 |

The second guarded migration produced no new row or changed hash/timestamp. Identity and all 15 file hashes were checked again after the entire verification. No applied migration, schema push, ledger manipulation, reset, or environment-file change occurred.

## E. Real schema

Actual `information_schema`, `pg_constraint`, `pg_indexes`, and `pg_trigger` inspection passed: 28 columns, 4 foreign keys, 10 checks, 6 indexes including primary keys, and 2 custom content-guard triggers. Full definitions were retained in the local execution artifact `/tmp/workspace16v-results.json`.

- Profile details: id, user_id, creator_profile_id, display_name, professional_headline, short_bio, primary_aviation_category, professional_profile_url, version, created_at, updated_at.
- Draft: id, user_id, creator_profile_id, request_key, creation_hash, title, category, description, target_learner, learning_outcomes, outline, tentative_price_paise, currency, status, version, created_at, updated_at.
- Each table has owner/profile composite consistency, private-content ownership, immutable identity and creation time, no hard deletion, and guarded version/timestamp transitions. Draft request key and creation hash are immutable; same-owner request key is unique.

Direct attempts to change IDs, owners, profile associations, draft request/hash, or creation time and to delete either content type failed with SQLSTATE **23514**. Invalid draft status/currency/category/price/version and timestamp reversal also failed with **23514**. Cross-owner composite references failed with **23503** on both tables. All failed statements ran in rolled-back transactions; no controls were weakened.

Application-only validation remains responsible for individual JSON content limits, text safety, and professional URL normalization. The database is not claimed to enforce every nested JSON element rule.

## F. Profile ownership/versioning

Actual creator service/repository saved profile version 0 → 1, trimmed display text, normalized an HTTPS URL by removing its fragment, and derived the correct user/profile from server context. Update 1 → 2 advanced updatedAt with ownership unchanged. Creator identity and eligibility history remained byte-equivalent. Forged owner fields and non-HTTPS professional URLs were rejected. Creator B could not access or modify A's private content.

## G. Profile concurrency

Two independent PostgreSQL connections submitted different edits at the same expected version. A third connection held the user row to force overlap. `pg_stat_activity` showed **two actual Lock waiters**. Exactly one save succeeded, one returned controlled conflict, and the final row was version N+1 with the winning content. No silent overwrite.

## H. Draft creation/idempotency

Actual service and authenticated API creation persisted server-derived ownership/profile, stable request key/hash, normalized content, structured outcomes/outline, optional integer paise, INR, private draft status, version 1, and timestamps. No LMS course was created.

Same request key plus identical normalized content recovered the same ID with one row. Two independent connections overlapped behind the held owner lock: both converged to one draft without a uniqueness leak. Repeating with different payloads gave one authoritative row and one controlled conflict. Both races had two observed PostgreSQL Lock waiters.

## I. Draft ownership

Creator B's read/update of A's ID returned not-found and left the row byte-equivalent. The direct Next.js page used the repository's custom 404/noindex view without private content; streaming rendered this with HTTP 200, while the API returned 404. Owner lists and profile APIs stayed owner-bound. Forged user/profile/status/currency fields were rejected; the server derived ownership.

Nineteen invalid draft service cases and invalid profile URL were rejected without invalid rows: bounded title/description/target, category, outcomes count/item length, outline count/order, extra ownership fields, HTML/control characters, and zero/negative/fractional/oversized prices. HTTP additionally rejected forged commands (400), oversized body (413), and cross-origin mutation (403).

## J. Draft stale-save concurrency

Two independent connections loaded version N and submitted different updates. Real overlap produced two PostgreSQL Lock waiters, one successful N+1 save, and one controlled conflict. Final content matched exactly the winner; immutable ownership/request context stayed unchanged.

## K. Expiry read-only behavior

Using a deterministic clock against actual PostgreSQL at **now = membership.endsAt**, Creator C retained profile/draft read access and identity. Create/edit/profile mutation returned controlled 403/restricted denial and did not change rows. Authenticated dashboard hid Create Course, showed the expiration/retention notice, and retained its draft count. Hydrated profile rendered saved details without a Save button; hydrated draft rendered retained content and price without editing controls. No end-of-day assumption was used.

## L. Early/active access

Early-access A could use dashboard/profile/create/edit with the official term start still **9 November 2026**. Plan, creator status, start/end and actual count were shown from persisted rows. Active-term edit capability was separately tested with a deterministic clock. No paid term was shifted.

## M. Suspended/terminated behavior

Separate persisted synthetic D (suspended) and E (terminated) were denied creator tools and APIs. Their content remained stored and available to persisted-admin read-only inspection. Eligibility-only, pending, held, and unpaid synthetic users were also denied creator tools.

## N. Authenticated dashboard/course/profile smoke

Actual local Next.js application, API handlers, Drizzle repository, and authorized PostgreSQL were exercised. Thirteen HTTP check groups passed, covering authenticated pages, owner-only list/detail, profile updates, stale conflicts, validation, expiry, anonymous isolation, admin protection, and legacy/public gates.

Hydrated browser results:

- A created a draft with two outcomes, one outline item and ₹3,456.78; navigation to the saved editor and refresh retained all content. Editing title persisted version 2. Final SQL confirmed owner/profile, winning title, 345678 paise, INR and private draft status.
- Two tabs loaded the same draft version. The stale tab received conflict, kept its unsaved title and disabled Save. Explicit Reload saved version restored the winner and re-enabled Save. SQL confirmed no stale overwrite.
- A separate fresh synthetic UI creator saved profile first time, updated it, and refreshed successfully. Invalid HTTP professional URL showed bounded field validation and retained the entered value without saving it.
- Two profile tabs also verified stale conflict, unsaved headline retention, and explicit reload recovery. Final SQL confirmed profile version 3, normalized HTTPS URL and winning headline.

Test setup was isolated in `/tmp/workspace16v-app`: synthetic HS256 sessions used a deliberately non-secret local test signing key; actual persisted user/role checks remained in force. A development-only loopback bootstrap route and clock-file seam existed only in that temporary copy, never in repository/product code. JWT expiration continued using real time. Provider credentials and telemetry keys were removed. Standard Next.js dev mode was used because Turbopack rejected the external node_modules symlink; dependencies were not changed.

## O. Admin authorization/demotion

Persisted synthetic admin inspected list/detail read-only. No Approve/Reject/Publish/Edit controls or creator mutation route was added. Normal creator was denied admin pages. Demoting the persisted admin while keeping the old admin JWT denied both draft admin pages and the existing financial orders API (403). The synthetic admin role was restored in finally and confirmed by final SQL.

## P. Public/storefront isolation

Anonymous creator pages redirected to login and APIs returned 401 without private content. Catalog rendered successfully and did not expose new draft titles. Source inspection confirmed catalog/search query published LMS `courses` only; no sitemap implementation or draft public slug path was added. All original LMS courses/authors/enrollments/orders/coupons/progress/certificates and user rows remained byte-equivalent (section R). Phase 1.6 writes remain in separate private tables; no public course row, storefront ownership, checkout entitlement, sitemap/public slug, course submission/review/publication, resource/video/quiz or AI functionality was introduced.

## Q. Privacy

Actual creator/admin HTML included `ph-no-capture`; hydrated DOM confirmed capture-protected ancestors for private profile bio and retained draft heading/content. No live PostHog calls were required: safe app configuration omitted analytics credentials. Existing sanitizer/privacy tests passed as part of full validation, including `/workspace/courses/<uuid>` and `/admin/workspace/course-drafts/<uuid>` canonicalization to `[id]` and content field filtering.

Private content necessarily appears in the authorized owner's/admin's HTML. Privacy verification concerns authorization and capture exclusion, not removing intended content from the authorized page. No bio, URL, title, outcomes, outline, tentative price or raw dynamic ID was added to analytics events.

## R. Legacy fingerprints

Two independent baselines were rechecked after HTTP/browser writes: original data before the first synthetic attempt, and data present before the completed core run. Every original-ID row count and MD5 of ordered `to_jsonb` rows matched exactly. This includes complete original user records, stronger than role-only comparison. Original baseline:

| Table | Original rows | Before/after fingerprint (unchanged) |
| --- | ---: | --- |
| users | 226 | e1e6c667d42b200f733ca43b7e8541f6 |
| courses | 6 | cef4418037672762abdbda8c6bb34131 |
| course_authors | 2 | b8a4a1b0dcaeaea248595800ce5079a0 |
| enrollments | 8 | 7e3fc19081bec5f82cde082a8ad2a435 |
| orders | 1 | 87cb8e3412fa824cddcb8a3d79efd89e |
| coupons | 2 | 1e273d3747ae6744237cabdbf57876dd |
| progress | 2 | 0a5b30117691c7eff5cbe105006a8002 |
| certificates | 0 | d751713988987e9331980363e24189ce |
| workspace_creator_profiles | 20 | ebe53d319123136979a2a328f3a50430 |
| workspace_memberships | 20 | b2502c8bb5d9253e207951999b8128ca |
| workspace_membership_orders | 146 | 828041e3f474f25c86833c6c11924db0 |
| workspace_eligibility_attempts | 172 | cc10f63f01042bbe8f02383ea58d09ba |
| workspace_course_drafts | 0 | d751713988987e9331980363e24189ce |
| workspace_creator_profile_details | 0 | d751713988987e9331980363e24189ce |

Retained synthetic verification data: **29 clearly labeled WS16V users**, including 11 in the completed run, and **23 private drafts** across completed/partial harness and HTTP/browser attempts. These include synthetic eligibility, financial evidence and fulfillment records generated through actual local services with an in-process fake provider. They are development fixtures, not real provider payments. Immutable histories were deliberately retained; no reset, delete, trigger weakening or ledger alteration occurred.

## S. Held Razorpay fixture safety

All **six** previously retained WS15AVR fixtures are byte-equivalent to baseline. The **three captured** orders remain held_for_review with null paidAt/refund deadline and zero memberships/creator profiles. Their evidence does not grant creator tools. No real Razorpay call, activation, recapture, refund or webhook operation occurred.

## T. Public-payment gate

Normal app displayed **Payment activation coming next**. Membership order POST remained disabled (503); no Razorpay Checkout script or renewal checkout was offered. No payment/test authorization flag or migration acknowledgement was persisted in `.env`.

## U. Failure paths

Transaction fault injection threw after actual INSERT/UPDATE and before commit. Create left zero rows, update left row/version byte-equivalent, and retry persisted exactly once with the expected version. Triggers stayed enabled.

A separate production-built local app on port 4044 used an intentionally unreachable loopback database, with all real credentials removed. Three creator APIs returned bounded 503; three server-rendered creator routes failed closed without edit controls or credential/SQL stack leakage. Hydrated browser displayed **Workspace is temporarily unavailable** and Try again, without creator content/actions. Streaming SSR can retain HTTP 200 or return 500 before the error boundary hydrates; successful status alone was not treated as successful access.

Legacy manual application page remained HTTP 200. No live OTP, email/SMS, AWS/Redis or other private service was contacted.

## V. Tests/validation

Completed successfully:

- Opt-in real PostgreSQL creator harness: **40 check groups**, actual independent connections and observed database lock waits.
- Actual authenticated loopback HTTP harness: **13 check groups**.
- Six unavailable-database HTTP checks plus hydrated unavailable-state verification.
- Final original-row fingerprints, held-fixture digests, persisted browser content/version, restored admin role, and migration identity/15 hash/timestamp checks.
- `node --check` on both new CommonJS harnesses.
- Full `pnpm validate`: **5 pure tests, 573 Vitest tests in 46 files**, TypeScript and lint passed. Includes creator model/service/repository/routes/pages/access/boundaries/privacy and analytics coverage.
- Production `pnpm build` completed successfully in `/tmp/workspace16v-build`, using credential-scrubbed environment and existing cached-font mock. No ignored environment files copied, dependency installation or lockfile change.
- `git diff --check` passed.

Execution evidence is in `/tmp/workspace16v-{results,http-results,final-results,ledger-before,ledger-after,unavailable-results}.json` and corresponding core/HTTP/migration/validation/build logs. These temporary artifacts are local evidence, not committed secrets or a durable artifact storage service.

Re-execution: the core harness requires `WORKSPACE_CREATOR_PG_VERIFY=true`, `DATABASE_ENV=development`, and exactly the authorized localhost:5433/airbharath_lms target. It retains marked fixtures. The HTTP harness additionally requires a test-only loopback application at 127.0.0.1:4043, the same synthetic signing key, the generated complete `/tmp/workspace16v-results.json`, and the deterministic `/tmp/workspace16v-clock` seam described in section N. Neither opt-in harness is run automatically by normal validation or accepts a production target. Do not run them using production credentials.

## W. Defects/corrections

**No genuine Phase 1.6 product/schema defect found. No corrective migration or product correction.** Applied 0000–0014 remain unchanged; 0015 was not created.

Verification-only corrections: actual column count is 28; owner-FK bypass fixture must avoid an already-used profile's uniqueness constraint; rollback tests need an editable deterministic clock; cross-owner page uses the custom streaming 404/noindex view; header/footer forms do not imply editable creator content. The temporary browser bootstrap needed a non-underscore route directory and a fixed loopback redirect host. These were harness assumptions/setup corrections, not relaxed assertions about security or product behavior. Partial synthetic attempts remain marked and retained.

## X. Remaining limitations

This verifies authorized local PostgreSQL and local app only. It does not certify deployed production/staging infrastructure, real payment capture/webhook delivery, commercial launch, live PostHog ingestion or public course commerce. Existing commercial/provider/public-payment gates remain launch blockers. Safe cached-font build verifies compilation without external font availability. Test-only session/clock seams are excluded from product code.

## Y. Recommendation

**Phase 1.7 GO** for further creator-platform development: real persistence, ownership, versioning, observed PostgreSQL concurrency, expiry retention, authenticated hydrated saves and isolation passed. Public-payment/commercial launch remains gated separately.

Phase 1.6V ends here. No Phase 1.7 implementation, payment activation, provider call or deployment was performed.

Changed repository files: this report; `tests/postgres/workspace-creator-verification.cjs`; `tests/postgres/workspace-creator-http-verification.cjs`. No product-source, migration, dependency or environment file changed.

Local verification harness commit: `7e0eb4f`. The report is committed separately; its hash is returned in the completion message. Temporary verification browser tabs were closed and both owned local app servers stopped.
