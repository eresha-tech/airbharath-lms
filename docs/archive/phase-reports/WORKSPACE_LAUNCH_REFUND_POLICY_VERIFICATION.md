# Workspace Launch Blocker B.2 verification

Verification date: 12 October 2026. Local development database and Razorpay Test Mode only. Phase 1.9 remains frozen. **Result: REFUND SYSTEM REAL DB + RAZORPAY TEST VERIFICATION BLOCKED — genuine signed refund webhook delivery not observed.** Genuine payment, full provider refund, independent reconciliation and entitlement revocation have passed; this is not a full B.2 PASS yet.

## A. Git/worktree cleanup

Starting branch `codex/workspace-1.8-launch`, HEAD `e195e59`. Inspected the known accidental edit in `WORKSPACE_LAUNCH_REFUND_POLICY_IMPLEMENTATION.md`, proved removal of the pasted text restored byte equality with HEAD, and restored only that file. Starting worktree was empty. No cleanup commit. No unrelated edits, dependency changes, deployments or Phase 1.9 work.

## B. Database identity

TCP `localhost:5433/airbharath_lms` and runtime `/tmp` socket port 5433 independently reported database OID `16384` and PostgreSQL system identifier `7680462735222304705`. Both matched the previously authorized development target. No credentials or connection strings are included. Migration authorization was process-only.

## C. Pre-migration ledger

Actual ledger: 20 rows, `0000–0019`, ending `0019_workspace_creator_terms_v2`. Every applied hash and timestamp matched the committed journal/source. Creator Terms migrations 0018/0019 intact. Captured a baseline of all 44 public tables by original row IDs and sorted-row fingerprints: 209 Workspace orders, 70 memberships, 70 Creator Profiles, six retained WS15AVR orders, 101 captured orders with paidAt. Refund tables absent. Original LMS orders 1, enrollments 8, invoices 1, courses 6, certificates 0, legacy coupons 2. Original users 320; new tagged users are deliberately additional.

## D. Migration 0020 application

Applied only `0020_gigantic_mordo.sql` through guarded `pnpm db:migrate`, with `DATABASE_ENV=development` and temporary `ALLOW_DATABASE_MIGRATION=true`. Applied SQL SHA-256:

`1a37339ad50039807da846f63ce07c749d14037a1cb592ff75cbd257a775c3fb`

Migrations 0000–0019 byte-equal the reviewed base. No 0021 or Phase 1.9 migration. No schema push, reset, ledger manipulation or direct primary-schema fragments. PostgreSQL emitted ordinary long-identifier truncation notices; migration succeeded.

## E. Post-migration ledger

21 rows, `0000–0020`, ending `0020_gigantic_mordo`, hash above. Original 20-row prefix unchanged. Second guarded migration succeeded with identical ledger: **no-op**.

## F. Refund Policy catalogue/integrity

One uniquely current row: `workspace_refund_policy_2026_01`, effective `2026-10-12T09:28:09.000Z`, canonical SHA-256 `1f78a51d0488154e271d9f36ed1953e1c8db71e2679f71404020c54bb78a4637`. Actual text equals canonical source. Seven refund tables, 37 constraints, 20 relevant non-internal triggers, and four prospective order snapshot columns inspected. Creator Terms V1/V2 content/hash/current states unchanged.

## G. Database constraints/immutability

Rollback-only public PostgreSQL probes rejected policy text/hash/version/effective-time mutation, deletion and truncation; acceptance owner/version/hash/time mutation and deletion; refund request amount/owner/deadline mutation and deletion; completion amount/provider ID/hash mutation, deletion and truncation: `23514`. Cross-owner order acceptance FK rejected `23503`; a correctly hashed second-current policy rejected `23505`.

Additional probes rejected deferred approval without provider intent, attempt amount/ownership/payment identity/illegal completion transition, completion without proof, wrong owner, amount, currency, refund identity and partial evidence: `23514`. Public triggers/constraints never disabled.

Migration atomicity: replayed reviewed SQL only in rollback-only disposable schemas with isolated base tables and namespace-qualified foreign keys. Injected division-by-zero after statement 28 and after all 57 statements (`22012`); each entire namespace disappeared on rollback, including catalogue, acceptance/refund structures and prospective order guards. Public schema/ledger untouched.

## H. Policy acceptance

Actual service/repository against PostgreSQL converged repeated current acceptance to the same ID and acceptedAt. Actual six columns: ID, owner, policy version, content hash, acceptedAt, createdAt; no copied email/phone/IP/UA/fingerprint. New genuine-run account explicitly saved both agreements in the hydrated UI. Browser receipts expose only permitted agreement evidence.

## I. Both-agreement purchase gate

Creator Terms only: `refund_policy_required`; Refund Policy only: `terms_required`; both current: normal order acceptance. No provider call during DB-only probes. Prospective direct SQL cannot omit snapshots, substitute hash/version/owner/time or bypass Creator Terms. Old nullable order snapshots preserved.

## J. 72-hour real PostgreSQL boundaries

Actual public request guard definition executed in a rollback-only isolated schema. Only schema/function identity and `clock_timestamp()` binding were changed to an isolated SQL clock using an anchor derived from PostgreSQL `clock_timestamp()`; public function untouched. The copied real order/payment fixture was aged within isolation. INSERT overrode caller-supplied old requestedAt/createdAt.

| Request time versus deadline | Result |
| --- | --- |
| −1 ms | Allowed; authoritative SQL timestamp replaces client time |
| Exact deadline | Allowed; authoritative SQL timestamp replaces client time |
| +1 ms | Rejected, `23514` |

This proves the actual SQL inclusive predicate under a controlled database clock; it does not claim wall-clock scheduling precision on a public live INSERT. Switching the isolated clock back to real PostgreSQL time allowed a persisted admin to review a timely request one day after its deadline. All isolation rolled back.

## K. Refund request persistence/idempotency

Actual PostgreSQL service requests converge to one case; changed payload with reused request identity conflicts; another owner cannot read/request the order; terminal rejection retains the canonical case and paid access. Genuine request submitted through `/workspace/refunds`, reason Purchased by mistake and clearly synthetic note. One case, amount 589882 paise, requestedAt within exact stored deadline.

## L. PostgreSQL concurrency

| Scenario | Real observed evidence | Result |
| --- | --- | --- |
| Duplicate creator request | Two separate sessions; two Lock waiters | Both commit same case ID |
| Admin approve vs reject | Two separate sessions; two Lock waiters | One terminal decision; other conflicts |
| Duplicate admin approval | Two separate sessions; two Lock waiters | One durable intent and one fake provider mutation |
| Completion commit/access read | Separate writer, blocker and reader; one writer Lock waiter | Reader sees paid access before completion commit, revoked after commit; historical read preserved |

These are actual PostgreSQL sessions, not Promise-only unit tests. Provider facts in these synthetic races are explicitly fake; no external HTTP.

## M. Genuine Razorpay Test payment

One new tagged synthetic account; normal server-side eligibility evaluator returned eligible, with no pre-existing membership/profile/payment. Eligibility service used directly because isolated app intentionally has no private Upstash/SMS credentials; the public eligibility HTTP limiter was not bypassed or weakened. Both current agreements then saved through actual browser UI. Quarterly order accepted and provider order created by real Checkout; no coupon, total 589882 paise, INR. Payment `pay_…BN9D3` succeeded through official Razorpay Test Checkout and its mock bank Success page. No real card, bank login, QR transfer or real money.

Razorpay documents this Test-bank flow in [Test integration documentation](https://razorpay.com/docs/server-integration/python/test-app/).

## N. Paid membership/creator activation

Genuine HMAC-verified `payment.captured` stored durably and processed using scoped provider fetch. `paidAt = 2026-10-12T10:29:34.000Z`; deadline `2026-10-15T10:29:34.000Z`, exactly 259200 seconds. Source `razorpay_payment_captured_event_v1`. Callback/fetch alone did not set paidAt. `order.paid` initially retained `needs_review/capture_time_unverified`; later captured event established financial timing safely.

Normal fulfillment created exactly one membership and Creator Profile; role remains student. Membership start `2026-11-08T18:30:00.000Z`, end `2027-02-08T18:30:00.000Z`. Browser dashboard showed Early Access Active and paid term begins 9 November 2026. No LMS enrollment created.

## O. Genuine creator refund request

Hydrated refunds page showed Quarterly, ₹5898.82, successful payment and deadline. One normal authenticated request recorded on 12 October at 16:03 IST, with authoritative PostgreSQL requestedAt. Access remained paid/editable. No injected payment timing or manual creator/membership grant.

## P. Real admin approval

Persisted development admin opened `/admin/workspace-refunds`, reviewed correct account/order/plan/no-coupon amount/time/reason, confirmed and clicked Approve & initiate refund once. HTTP 200. Separate real DB observer saw committed `approved/prepared`, then claimed `uncertain`, then provider-attached `processing`, all with actual paid entitlement/edit access true and no completion. Core real repository test proved provider fake sees committed intent and caller backend outside transaction; service sends HTTP after transaction commit.

## Q. Genuine Razorpay Test refund

Exactly one provider mutation for the new payment, original captured total 589882 paise. Refund `rfnd_…pIsVo` independently fetched as processed, INR, matching original payment. Stable attempt UUID is provider idempotency key; opaque internal request/attempt notes only. No custom amount UI. No second genuine refund issued. Initial immediate fetch remained uncertain; access stayed enabled until later full proof.

## R. Genuine webhook evidence

Temporary Workspace Test endpoint:

`https://physician-mileage-spec-dts.trycloudflare.com/api/workspace/payments/razorpay/webhook`

Task-owned tunnel forwards isolated dev app port 4049. User confirmed Test Mode events payment.captured/refund.created/refund.processed and updated this exact URL. Same Workspace secret; no LMS/Live webhook changes. Genuine `order.paid` and `payment.captured` returned 202 and entered inbox. Payment capture HMAC/account/routing validated.

**Refund events not yet received at report preparation.** Requested user resend of genuine refund.created/refund.processed for this new Test refund and delivery HTTP status. Synthetic signatures are not substituted for genuine delivery. Full PASS is blocked on this evidence.

## S. Independent reconciliation

Separate real provider GETs proved original account/Test context, original payment/order, captured total 589882, INR, `amount_refunded=589882`, refund_status full, exactly one matching nonfailed refund, same payment, exact refund amount, processed status. Actual admin Reconcile provider state performed normal reconciliation with `razorpay_full_refund_fetch_v1`. HTTP 200/provider event name alone never established completion.

## T. Full-refund completion

One append-only completion, one request, one attempt, exact 589882 paise. Attempt completed. Original financial capture/fulfilled state, paidAt and refund deadline retained; completion-derived financial projection is fully_refunded. Repeated approve and two repeated reconciliations converged to one request/attempt/completion; provider methods explicitly forbidden and invoked zero times.

## U. Membership revocation/data retention

Before completion: requested/approved/prepared/processing/uncertain states observed with paid entitlement and editing true. After completion: resolver state refunded, hasCreatorAccess false, hasPaidEntitlement false, canEditWorkspace false, canViewCreatorWorkspace true. Profile, membership and one minimal private tagged draft retained. Dashboard says Membership refunded and saved profile/drafts available to read. Draft GET 200; new paid draft mutation 403. No submission/review/builder content was created for the genuine account; pre-existing originals fingerprint-identical, and regression suite covers retained access rules.

## V. Coupon invariant

Genuine order had no coupon. Separate actual PostgreSQL/service synthetic completion with fake provider evidence retained its redeemed coupon row byte-identically, consumed capacity and same-user uniqueness. Its discounted full total 589764 paise is distinct from genuine no-coupon total. No influencer coupon modifications.

## W. Historical compatibility

All 44 original-ID sorted-row fingerprints still match after migration and genuine payment/refund. Includes previous genuine E2E order/provider/capture/membership, six WS15AVR fixtures, held/captured history, Creator Terms catalogue and acceptances, original orders/profiles/memberships and all legacy LMS rows. All 209 historical order policy snapshots remain null. Only clearly tagged additional B.2 synthetic records created; partial failed harness fixtures retained, never reset/deleted.

## X. Privacy/security

Hydrated refunds response: `no-store, must-revalidate`, robots `noindex, nofollow`, sensitive/no-capture container. No PostHog host requests; private credentials absent and live analytics ingestion separately untested. No real email sent; notices contain opaque order ID/kind only. Creator admin action denied 403; admin injected amount/provider refund ID rejected 400; service cross-owner denial and persisted-role protection verified. API secrets, signature, session cookies/OTP and raw webhook payloads not committed.

## Y. Failure behavior

Real unreachable PostgreSQL connection made request/admin operations fail without successful persistence. Rollback-only missing current catalogue made actual repository refuse acceptance/read; two-current policy rejected 23505. Actual service/real DB with fake provider facts rejected wrong account/payment/order/amount/currency, missing provider and mismatched scope (approval rolled back), uncertain mutation refused blind retry. External partial observation retained paid access and made zero remainder mutations; external full matching fake evidence converged through real completion path. Existing passing provider/route tests cover bounded responses, safe 503 errors, wrong webhook/refund identity and processed response without aggregate proof. No genuine provider transaction intentionally broken.

## Z. Validation/build

`pnpm validate` passed: five pure test files/32 assertions, 65 route test files/846 assertions, TypeScript and lint. Includes policy/refund service/provider/event/routes, Creator Terms, orders/payments/coupons/membership/activation/creator/drafts/review/builder/privacy/security. Isolated production `pnpm build` passed with payments disabled, no private service credentials and cached fonts. All six new opt-in CJS harnesses pass `node --check`. `git diff --check` passed at report preparation. No migration regeneration after application.

## AA. Corrections

No Phase B product implementation defect discovered. No application/schema correction and no 0021. Temporary harness corrections only: actual table names, driver timestamp/JSON serialization, required request hash, persistent browser controller, and deterministic SQL-clock binding for late review. Failed isolated probes rolled back; earlier tagged core fixtures retained.

Verification source added: core PostgreSQL probes, isolated boundary tests, invariants/completion-read race, migration atomicity, failure probes and provider-fake safety probes. These are opt-in via `WORKSPACE_REFUND_PG_VERIFY=true` and require the explicit authorized development target and retained `/tmp/wsb2-*` baseline/core evidence; they are not automatic production tests. Atomicity/boundaries fully roll back; core/invariant fixtures intentionally remain. Changed files (verification only):

- `tests/postgres/workspace-refund-verification.cjs`
- `tests/postgres/workspace-refund-atomicity.cjs`
- `tests/postgres/workspace-refund-boundaries.cjs`
- `tests/postgres/workspace-refund-invariants.cjs`
- `tests/postgres/workspace-refund-failures.cjs`
- `tests/postgres/workspace-refund-provider-safety.cjs`
- `WORKSPACE_LAUNCH_REFUND_POLICY_VERIFICATION.md`

Verification harness commit: `dc92321`. No product correction commit. Report committed separately.

## AB. Operational cleanup

Task-owned port4049 app, temporary tunnel and browser stopped. Temporary JWT signing secret, synthetic session files and browser profile removed; own dev/build copies removed after successful build logs retained. No immutable database evidence deleted. Existing user app port3000 and earlier user tunnel are untouched. Payment flags exist only in task process environment, never persisted true. The Test Dashboard still points to the now-stopped temporary endpoint to the extent last confirmed by the user; dashboard cleanup has not been performed by the agent. The user must disable/remove that Test webhook or repoint it to a separately authorized active Test receiver. Do not resend to the stopped URL. Resume genuine refund delivery verification only with an active authorized receiver, using the SAME existing Test payment/refund and no new financial mutation. Ordinary app port3000 authenticated activation returned 200 and displayed Payments not yet enabled / Workspace payments are awaiting launch verification, with no Test Checkout. Verified no persisted enablement flags true. No Live changes.

## AC. Remaining launch blockers

Genuine signed refund webhook receipt remains for B.2. Public production charging remains independently disabled. Live credential/configuration/migration authorization, commercial release and operational scheduler/documentation/final smoke gates remain separate. Local PostgreSQL emits a pre-existing collation-version warning; no unrequested maintenance performed. Phase 1.9 remains frozen.

## AD. Recommendation

**REFUND SYSTEM REAL DB + RAZORPAY TEST VERIFICATION BLOCKED.** Exact failing stage: no genuine signed `refund.created` or `refund.processed` delivery reached the configured Test receiver. Payment, full refund, independent completion, entitlement revocation/data retention and validation/build passed. Do not treat this report as production payment authorization or begin the next phase.
