# Workspace Phase 1.7V — real PostgreSQL verification

Verified 9 October 2026. Scope: Phase 1.7 verification and one minimum application correction. **Phase 1.8 GO** for creator-platform development; public payment launch remains separately blocked by deferred commercial/webhook gates. No Phase 1.8 functionality implemented.

## A. Environment

Only the expressly authorized local development PostgreSQL `localhost:5433/airbharath_lms` was accessed. Before migration, `/tmp` Unix socket and TCP both returned database `airbharath_lms`, port `5433`, database OID `16384`, PostgreSQL system identifier `7680462735222304705`. Identity equality was rechecked after verification. `DATABASE_ENV=development`; `ALLOW_DATABASE_MIGRATION=true` was provided only to the two guarded migration executions. No `.env` modification, schema push, reset, ledger manipulation, staging/Neon/production query, deployment, or provider call.

Started the existing stopped local cluster through the repository `db:start` script. PostgreSQL reported its existing collation-version mismatch (created with 2.39; current OS 2.43). No collation metadata change or reindex was attempted.

Local authenticated smoke used isolated source copies on loopback port 4047, the authorized database, existing dependencies, cached fonts, process-only synthetic session signing, and blocked external browser/server requests. A file-driven deterministic clock was injected into the temporary source copies only to verify exact membership boundaries. The repository's authentication, role checks and capability logic remained active. UI fixture `UI` served as the dedicated creator for the requested A-style browser cycle; A/B separately exercised service races. No customer record was used.

## B. Ledger before

Actual ledger: **15 rows, 0000–0014**. Every applied SQL SHA-256 and journal timestamp matched, including corrected 0012, 0013 and 0014. Only 0015 was pending. The first fifteen rows of the ledger below are the exact before state.

## C. Migration 0015

Reviewed prerequisite draft composite unique-index ordering before the ownership FK, ownership relationships, numbering/idempotency/open indexes, lifecycle checks, immutable guards, deferred consistency and draft locks. No migration-readiness defect found. Applied **only `0015_warm_sprite.sql`** through guarded `pnpm db:migrate`, exit 0. Hash: `06fa5c3d985fc53978c87d84b4f4fb2bb3c4200bee73547a76d8508e49d49586`; journal timestamp `1791527685957`; ledger ID 16. Applied SQL was not edited.

## D. Ledger after/no-op

Actual after ledger: **16 rows, 0000–0015**, no pending migrations. Second guarded `pnpm db:migrate` exited 0; the identity/ledger/pending JSON was exactly equal to first-run after evidence. Final read-only ledger verification still matched every file hash and journal timestamp.

| ID | Migration | Journal timestamp | SHA-256 |
|---|---|---|---|
| 1 | 0000_regular_silk_fever | 1789124954048 | `244506bff67e0e4e102593d277f4959d7b6762345ea6d475764700f55bb8fb47` |
| 2 | 0001_careful_warhawk | 1790099480260 | `24c2bbabe9a8d16a6f027d09a13004dddea01c21113990a5939a642b0237c232` |
| 3 | 0002_silky_living_tribunal | 1790162267688 | `24033fb008c9e085cd515ff9c6321e518a8bb5e8995ef7ce22c19b9a98b7c2ad` |
| 4 | 0003_lowly_justice | 1790183727889 | `5e2ada1b77d981fe1e27d321272f7f08fb2c7243067634b57c8213a0e785cc98` |
| 5 | 0004_dear_shocker | 1790192348972 | `0bf51a3afa92ba842b517fdf2c85af9fd73bc2827c7c374853cbe3a9199bea82` |
| 6 | 0005_sharp_grey_gargoyle | 1790197129493 | `588509617acbb775563f379101f8d5b34534bfbfbe536110682bbb22707f81f8` |
| 7 | 0006_great_kate_bishop | 1790236152530 | `0d6b625cca0a51c04d313a53c9a66ccd647927e9efda2959252cc11b2d95a9eb` |
| 8 | 0007_lucky_wild_pack | 1790924690885 | `f0312d81ee36aed56aa48ece4bd09cdf218a375e39879d55623ef9ec819f11aa` |
| 9 | 0008_eager_energizer | 1790935874838 | `ae6c3b89c04374d642a03f0097e3bc52a3b7c3e1ce6b8f752d7f9625135732ac` |
| 10 | 0009_normal_baron_zemo | 1791274423029 | `6dc0436b50fa865ad5410dd2f95d48be569cd176f812abd47c144ad57ea359e5` |
| 11 | 0010_illegal_toxin | 1791281066952 | `d806715b9b519bb50eaa3f6f60c9be1b02ea98ebed248a856a91ecd56f30c92e` |
| 12 | 0011_workspace_coupon_audit_freshness | 1791284353170 | `92d9e796e3b2136e86f144c4a2ff099d81e6e26c12541999dd95a52e34485ec9` |
| 13 | 0012_useful_warhawk | 1791286852175 | `4e59a99a11347779b12c793df406727148ba7b6ef3f42764952f57f733274d97` |
| 14 | 0013_peaceful_spiral | 1791368221505 | `42b4fcf2ae41c84e5129f68fee5791283b293a8f576c5d694ac2f25825d39d05` |
| 15 | 0014_outgoing_freak | 1791436807652 | `286e94347d50db660ce6bcae06c1e1b6eb0baed316b2f3d9d8aedd9af04d6598` |
| 16 | 0015_warm_sprite | 1791527685957 | `06fa5c3d985fc53978c87d84b4f4fb2bb3c4200bee73547a76d8508e49d49586` |

## E. Real schema

Inspected `information_schema.columns`, `pg_constraint`, `pg_indexes`, and `pg_trigger` in the real database: 53 columns across submissions (24), review events (12), drafts (17); 24 constraints, 13 indexes, six custom triggers. Verified composite draft/user/profile ownership FK, submission-number unique index, creator request-key unique index, actor/request-key and submission/transition-version event indexes, lifecycle non-null/status checks, partial open index and prerequisite draft composite unique index. PostgreSQL safely truncated the generated review-event submission FK identifier to `workspace_course_review_events_submission_id_workspace_course_s`; actual FK definition targets submissions and is present.

- `workspace_drafts_content_guard`: BEFORE row guard; enabled `O`.
- `workspace_drafts_review_lock`: BEFORE row guard; enabled `O`.
- `workspace_review_events_consistent`: DEFERRABLE INITIALLY DEFERRED; enabled `O`.
- `workspace_review_events_guard`: BEFORE row guard; enabled `O`.
- `workspace_submissions_consistent`: DEFERRABLE INITIALLY DEFERRED; enabled `O`.
- `workspace_submissions_guard`: BEFORE row guard; enabled `O`.

## F. Snapshot immutability

Direct committed-snapshot rewrites to all 16 requested immutable fields (draft, user, profile, number, draft version, hash, title, category, description, target learner, outcomes, outline, tentative price, currency, submittedAt, createdAt), plus deletion, rejected with **SQLSTATE 23514**. Approved snapshots were rechecked and rejected mutation with 23514. No invalid row committed.

## G. Review-event immutability

Actor, action, feedback, request key, timestamp rewrites and deletion all rejected with **23514**. Existing start/decision events remained byte-equivalent across creator edits and resubmission. Non-admin actor event insertion rejected.

## H. Deferred lifecycle/event consistency

Unaudited submitted→under_review UPDATE succeeded inside the transaction, then **COMMIT failed with 23514**. A syntactically valid event without corresponding status transition also reached COMMIT and failed with **23514**. From/to/action/version/submission/timestamp mismatches were rejected by immediate checks or deferred consistency; no divergent evidence committed. Both actual constraint triggers are DEFERRABLE INITIALLY DEFERRED and enabled.

## I. Creator submission/idempotency

Actual service/repository created submission 1 from authoritative saved content/version/owner/profile, deterministic snapshot hash, submittedAt and submitted status, with zero initial review events. Same-key retries recovered the same ID. Changed expected version with an already used key returned controlled conflict. Cross-owner submit/history returned non-enumerating not_found. No client content override is accepted.

## J. Submission-number/open-review constraints

Live duplicate numbering and second-open attempts in submitted and under_review states rejected with **23514** from the preceding submission guard. Real catalog shows the valid `(draft_id, submission_number)` unique index and partial `workspace_submissions_open_idx`. To separately observe the PostgreSQL index engine without disabling live guards, a session-local TEMP `LIKE ... INCLUDING ALL` copy retained the actual index definitions; duplicate number and open-row probes both failed with **23505**. This is an index-engine probe on a temporary mirror, not a claim that the live partial index emitted 23505 before its BEFORE trigger. Live one-open protection and concurrent service serialization passed with all guards enabled.

## K. Draft review locks

Actual creator update service denied submitted, under_review and approved drafts. Direct SQL draft content updates in all three states rejected with **23514**. Approved resubmission returned already_approved. Database guards protect persisted content; membership, persisted role, command validation, ownership-scoped read APIs and friendly idempotency errors additionally remain service responsibilities.

## L. Changes-requested unlock/edit

Actual admin request_changes recorded a matching event/lifecycle timestamp and normalized plain feedback, retaining review-start evidence. Valid entitled creator edit succeeded, incrementing optimistic draft version. Old submission and event rows were byte-equivalent afterward. Blank, whitespace, <10, >2000, unsafe HTML/control feedback and unexpected fields were denied with no persisted transition/event. changes_requested→submitted/under_review/approved direct attempts rejected with 23514; service attempt conflicted.

## M. Resubmission/versioning

No-change and version-only-save resubmission returned no_changes_to_resubmit. Actual content edit generated submission 2 with number 2, saved draft version, new content hash and submitted status. Submission 1 retained changes_requested and identical feedback/events. Concurrent same/different-key resubmissions allocated exactly [1,2], with no skipped committed number or duplicate open row. Eleven real submissions on one synthetic draft verified page 1 returns [11..2] with hasNext, page 2 returns [1] without hasNext; historical feedback remained attached to submission 1. Hydrated older-history page still showed latest approval and no edit/resubmit controls.

## N. Admin review transitions

Persisted admins performed submitted→under_review (version 2, reviewStartedAt, one review_started event), then changes_requested/approved (version 3, reviewCompletedAt, one terminal event). Optional approval note and feedback were normalized. Identical actor/request-key commands recovered one authoritative event; incompatible action, feedback or cross-submission reuse conflicted without overwrite.

## O. Real creator submission races

Two independent PostgreSQL connections were deliberately blocked behind a held row lock until both were observed waiting (`pg_stat_activity`, wait_event_type=Lock). Same-key first submit and resubmit converged to one ID; different keys produced one saved result and review_in_progress, one open snapshot and no numbering duplication. Core harness passed twice (separate clearly identified synthetic fixture runs).

## P. Real admin review races

All core races below observed two lock waiters and used independent service/SQL connections. Terminal races produced exactly one terminal event. Additional distinct-feedback two-admin race returned saved/conflict; losing feedback never overwrote winning feedback. Same actor/key across different submissions serialized on the persisted actor, returning one saved result and one controlled conflict with one actor/key event.

| Scenario | Two connection outcomes | Observed lock waiters |
|---|---|---|
| creator_same_key_first_submission | saved, saved | 2 |
| two_admin_start_review | saved, conflict | 2 |
| same_key_resubmission | saved, saved | 2 |
| different_key_first_submission | saved, review_in_progress | 2 |
| different_key_resubmission | saved, review_in_progress | 2 |
| approve_vs_changes | saved, conflict | 2 |
| two_approvals | conflict, saved | 2 |
| two_changes | saved, conflict | 2 |
| same_admin_key_same_submission | saved, saved | 2 |
| same_admin_key_cross_submission | saved, conflict | 2 |

## Q. Approval behavior

Submission 2 approval persisted a single event and terminal status. Direct attempts to return approved→submitted/under_review/changes_requested rejected with 23514. Creator UI rendered **AirBharath Course Review Approved**, immutable history and read-only saved content. No Publish, approved selling price, public slug, enrollment, LMS conversion or regulatory approval was created. Copy expressly distinguishes private AirBharath review from publication, membership and DGCA/airline/government/regulatory approval.

## R. Membership expiry/suspension behavior

At Creator C's exact membership end, existing submission/history/feedback stayed readable and admin could start review and request changes. Creator edit/resubmit failed closed. Suspended D and terminated E could not mutate; admins retained history access and could continue review without automatically cancelling/approving/rejecting it. Clock injection was limited to verification copies; no membership window was rewritten.

## S. Creator authenticated flow

Hydrated real-browser synthetic creator cycle: owned draft v1→confirmation→submit→refresh/read-only Submitted→admin feedback→refresh/edit title→Save Draft→confirmation explicitly v2→resubmit→approved refresh. Real persisted rows confirm submission 1 changes_requested (draftVersion 1), submission 2 approved (draftVersion 2), differing titles and immutable prior feedback. Final DOM asserted approval/feedback/approval note, ph-no-capture and noindex, with no Save Draft/resubmit button. Older page 2 also remained approved/read-only. Synthetic UI draft: `f155766b-0ed6-495a-9115-1d6cb7cfd2f3`; submissions `8ceeb236-1294-4d04-a102-5127e29b77b6` and `f7bfb024-a664-4a90-9c92-7e8f73ed7ec6`.

## T. Admin authenticated flow

Hydrated persisted admin session opened queue/detail immutable v1 snapshot, Start Review, supplied creator-visible feedback, Request Changes; then opened resubmitted v2 from queue, Start Review, supplied approval note, and confirmed approval. Refreshes showed persisted events/status. No course content editor or Publish control. Real queue filter HTML checked against the same authoritative sort and 20-row boundary as the repository.

## U. Cross-user/admin authorization

Anonymous creator/admin pages redirected without private content; creator mutation 401, admin mutation 403. Cross-owner pages/API returned non-enumerating not-found without A's content. Creators could not list/review/admin-detail or mutate reviews. Persisted admin demotion while retaining stale JWT denied queue, detail and mutation; synthetic admin role restored afterward. Exact-expiry/suspended/terminated authenticated mutations denied. No session-role/cache authorization fallback.

## V. Snapshot-vs-live-draft proof

After A edited the live draft, old submission 1 admin detail continued to show its original title/content and feedback; new submission 2 showed updated content. Compared actual snapshot rows and authenticated rendered HTML, not migration text or repository mocks.

## W. Privacy/noindex

Creator/admin review HTML and hydrated creator DOM had ph-no-capture and noindex protection; terminal/private-regulatory wording verified. Focused analytics/privacy regression tests verified canonicalized dynamic creator/admin IDs and forbidden content fields. No live PostHog account/configuration call was made; no analytics content delivery is claimed. Browser/server external requests were blocked in isolated smoke. Development-only blocked asset/HMR console errors did not prevent hydrated mutations or persistence; they were not treated as proof of production failure.

## X. LMS/storefront isolation

Fingerprinted original row IDs before synthetic work and rechecked after all service/HTTP/browser activity. All 20 table fingerprints matched, including LMS courses/authors/enrollments/orders/coupons/progress/certificates and prior Workspace evidence. Catalog, real search page and sitemap contained no synthetic private course IDs/content. A public course URL supplied with a private draft ID rendered the existing Course Not Found state (HTTP 200) and no private course content; the requested ID itself can appear in Next.js routing metadata. Checkout/publication is absent from this review workflow. New fixtures exercised only legitimate synthetic development eligibility/finance/mock-provider/fulfillment capability paths before review; approval itself created no profile/membership/LMS course/paid entitlement.

| Existing table | Original rows | Before/after fingerprint |
|---|---|---|
| users | 256 | `352e191af002b35b4e6287085562a2eb` unchanged |
| courses | 6 | `cef4418037672762abdbda8c6bb34131` unchanged |
| course_authors | 2 | `b8a4a1b0dcaeaea248595800ce5079a0` unchanged |
| enrollments | 8 | `7e3fc19081bec5f82cde082a8ad2a435` unchanged |
| orders | 1 | `87cb8e3412fa824cddcb8a3d79efd89e` unchanged |
| coupons | 2 | `1e273d3747ae6744237cabdbf57876dd` unchanged |
| progress | 2 | `0a5b30117691c7eff5cbe105006a8002` unchanged |
| certificates | 0 | `d751713988987e9331980363e24189ce` unchanged |
| workspace_creator_profiles | 39 | `52e64d78d184952c235cefe96f043267` unchanged |
| workspace_memberships | 39 | `00d2a70bc97c2511ad30c471e4d39a41` unchanged |
| workspace_membership_orders | 172 | `63eabf7d95d48627afad075f046d2bd4` unchanged |
| workspace_course_drafts | 23 | `d1ef256ac3c5306f0016f2962512eb85` unchanged |
| workspace_creator_profile_details | 12 | `6151facb35a67c661050a99d756eb16a` unchanged |
| workspace_eligibility_attempts | 199 | `de94d8b4e88f29278c7822cc9ab8d62f` unchanged |
| workspace_payment_events | 26 | `24e1112853ef861dccf7e10ad47970a0` unchanged |
| workspace_payment_attempts | 109 | `86f8385dc0a958490590ecd2491b8b28` unchanged |
| workspace_coupons | 48 | `d905d4aaf4b86d8e088ae5a4fbc87e4c` unchanged |
| workspace_coupon_redemptions | 68 | `d135808133127362ef6b45e4103a4555` unchanged |
| workspace_course_submissions | 0 | `d751713988987e9331980363e24189ce` unchanged |
| workspace_course_review_events | 0 | `d751713988987e9331980363e24189ce` unchanged |

## Y. Payment/Razorpay fixture isolation

All six retained WS15AVR genuine-provider verification fixture orders remained byte-equivalent. The three captured ones remain held_for_review, paidAt null, refund deadline null, no membership/profile from those orders; actual creator overview still denied tools for these three. Their IDs/data/credentials were not printed. Original payment evidence/coupons/orders and new review-fixture financial/membership rows matched their before fingerprints, including start/end windows and entitlement source. Public activation preview remained disabled with current non-launch wording and no Checkout script; order creation returned 503. Manual application page returned 200. No test payment authorization persisted and no Razorpay request occurred.

## Z. Failure/rollback paths

Injected real SQL division-by-zero **22012** after snapshot INSERT and separately after event INSERT/lifecycle UPDATE, before COMMIT. Entire transactions rolled back (no submission/event, original status retained); identical retries succeeded once. Unavailable-DB check used a separately isolated production build on loopback with intentionally unreachable synthetic configuration, never real credentials. Creator submit API returned 503; admin mutation 403; creator page streamed a bounded generic error (HTTP 200 because shell already streamed); admin queue/detail 307 login redirects. No SQL/connection target/private course content appeared. This is fail-closed behavior, not a promise that streamed page failures return HTTP 503.

## AA. Tests/validation

- Real PostgreSQL core harness: 65 checks passed initially and 65 passed after correction; ten forced-overlap races in each run.
- Supplemental/final PostgreSQL harness: history pagination, distinct-feedback race, incompatible admin keys, approved terminal/snapshot guards, browser persistence, original/financial fingerprints, held creator-tools denial passed.
- Authenticated local HTTP checks: 12 passed after correction; hydrated creator/admin complete cycle and older-history DOM checks passed.
- Focused Phase 1.7/creator-boundary/analytics suite: **73 tests passed** across seven files.
- Full `pnpm validate`: **5 pure tests; 634 Vitest tests across 51 files; TypeScript; lint**, all exit 0. Full prior Workspace regression suite included.
- Production `pnpm build`: exit 0 in isolated source copy, existing dependencies and safe cached-font responses; no .env copied or external font/service request needed.
- `git diff --check`: passed. No dependencies or lockfile changed.

## AB. Defects/corrections

Recorded before editing: creator page helper awaited persisted authentication DB lookup outside its bounded error handling. Unreachable synthetic DB reproduced the raw rejected error. Added a focused failing regression proving auth-read errors must be bounded and content must never be read; minimum correction wraps only that lookup and rethrows the existing generic Workspace error. Regression passed (4 creator-page tests), full validation and affected authenticated/production-unavailable checks passed. Correction committed separately: **de5648a**. Authentication still fails closed. No schema defect, no additive 0016, no applied migration edit.

Next.js development RSC diagnostics can serialize the original rejected promise even after an application catch; the production build was therefore tested explicitly and emitted no connection details. The correction bounds the application error; it does not claim to disable framework development diagnostics.

Verifier-only issues fixed while gathering evidence: synthetic clock propagation required explicit temporary source injection; database Result wrapper needed JSON normalization when comparing saved JSON; queue filter assertions needed the real 20-item page boundary; DOM historical labels needed textContent rather than innerText whitespace; public-route checks had to distinguish reflected request metadata and the existing Course Not Found screen from private disclosure. These were not product defects or weakened controls.

## AC. Remaining limitations

Local verification does not authorize production migration/deployment or establish live PostHog/provider operation. Collation-version maintenance remains outside this phase. Live partial-index violations are preempted by the stronger BEFORE guard, so isolated exact-index engine probes are reported separately. Synthetic signing and clock files are temporary private verification artifacts, not production configuration; no secrets committed. Immutable synthetic users, memberships, orders, drafts, submissions and review events are intentionally retained with run identifiers `a2846b26-7dbc-486b-a7da-bdba145f80c1` and `98d5ccb6-06b3-4074-897d-e2e9e339dc49`; the first run including browser/pagination/supplemental checks retained 9 users, 19 drafts, 31 submissions and 51 review events, and the core rerun retained its own nine users and capability fixtures; no cleanup weakened guards. Public payment/webhook/commercial launch gates remain deferred.

## AD. Recommendation

**Phase 1.8 GO** for creator-platform development: migration, immutable evidence, commit-time consistency, real two-connection creator/admin races, authenticated hydrated review flow and LMS/payment isolation all passed. This does not approve public payments, publication, deployment or production migrations. Stop after Phase 1.7V.

Verification entry points: opt-in `WORKSPACE_REVIEW_PG_VERIFY=true` and `DATABASE_ENV=development`, with a securely supplied DATABASE_URL matching the authorized local target. Run `node tests/postgres/workspace-review-ledger-verification.cjs before` only for the original pending state; `final` verifies the applied state. Run the core harness first; authenticated HTTP and final harness consume its temporary fixture/session files and the isolated app described above. The core harness blocks external fetch and creates retained synthetic fixtures; never run these against another target. Private generated session files are intentionally not committed.

Commits: `de5648a` — minimum application correction and regression; `95d0459` — real local PostgreSQL/HTTP verification harnesses; this report is committed separately. Final post-HTTP read-only checks confirmed original row fingerprints, six held fixtures, and both synthetic runs’ order/membership evidence remained unchanged. Verification browser and isolated app processes were closed; the authorized local PostgreSQL cluster remains running.

Changed files: `lib/workspace/creator/pages.ts`; `tests/routes/workspace-creator-access-pages.test.ts`; `tests/postgres/workspace-review-verification.cjs`; `tests/postgres/workspace-review-http-verification.cjs`; `tests/postgres/workspace-review-final-verification.cjs`; `tests/postgres/workspace-review-ledger-verification.cjs`; this report. Generated Playwright output was kept outside the repository. No Phase 1.8 implementation.
