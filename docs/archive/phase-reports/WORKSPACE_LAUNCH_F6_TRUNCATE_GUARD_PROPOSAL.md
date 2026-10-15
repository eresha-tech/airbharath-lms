# Workspace F.6R — retained-history TRUNCATE guard proposal

Proposal only. **0030 was not applied to the retained development database.** The F.6 report and its committed evidence remain unchanged. No production/staging access, real provider calls, public charging, deployment or F.7 work occurred.

## A. Starting branch/HEAD and DB identity

- Branch: `codex/workspace-1.8-launch`; starting HEAD: `d5ec548`. Worktree was clean before generating the proposal.
- Authorized retained target: `localhost:5433/airbharath_lms`, `DATABASE_ENV=development`.
- Database OID: `16384`; system identifier: `7680462735222304705`; PostgreSQL `16.15`.
- Fresh TCP and application `/tmp` socket identity checks agree on the database, port, OID, server identity/version and read-only state.
- Actual fresh inventory: **64 tables, 6,871 rows** (61 public tables, of which 40 are Workspace; one migration table and two retained isolated D.1 tables). These counts were measured again, not assumed from F.6.
- Retained connections used `default_transaction_read_only=on`, bounded timeouts and repeatable-read read-only snapshots. Credentials and row payloads were not exported to committed evidence.

## B. Exact F6-01 root cause

Twenty Workspace tables had row/state guards but no TRUNCATE guard. Manual applications and email rate-limit counters also had none. Seven retained history leaves had no incoming FK protection. PostgreSQL TRUNCATE does not invoke DELETE triggers; incoming FKs reject a lone RESTRICT statement but do not replace explicit retention protection when referencing tables are jointly named or CASCADE is used. BEFORE TRUNCATE triggers run before table truncation, and transactional failure rolls the operation back. [PostgreSQL 16 TRUNCATE documentation](https://www.postgresql.org/docs/16/sql-truncate.html).

The isolated reproduction inserted one synthetic payment event into a fresh database, successfully truncated it before 0030, then deliberately rolled back that transaction. The original retained history was never a destructive-test target.

## C. Complete 40-table classification and selected targets

**21 new guards + 18 existing equivalent guards = 39 explicitly protected Workspace tables after the proposed migration.** One operational counter table is excluded.

The FK column counts incoming relationships in the real retained catalog. Such relationships are incidental RESTRICT protection only. For every row below, the inspected local role is `postgres`, owner/superuser with TRUNCATE privilege; no ordinary Workspace application service needs TRUNCATE. No documented Workspace bulk-cleanup workflow was found in application/worker source. These role facts are recorded separately in `output/audits/workspace-f6r/retained-role-review.json`; production privileges remain unverified.

| Table | Retention classification | Incoming FKs | Decision | Rationale |
| --- | --- | ---: | --- | --- |
| `workspace_access_grant_events` | immutable audit | 0 | EXISTING | Complimentary grant creation and closure audit. Existing unconditional BEFORE TRUNCATE statement guard (workspace_grant_guard); preserve without duplication. |
| `workspace_access_grants` | retained entitlement state | 1 | EXISTING | Admin-authorized complimentary access, controlled expiry/revocation and historical ownership. Existing unconditional BEFORE TRUNCATE statement guard (workspace_grant_guard); preserve without duplication. |
| `workspace_applications` | mutable retained application | 0 | ADD | Manual applications retain declarations, consent and review/contact context; no documented bulk cleanup. |
| `workspace_audit_events` | immutable audit | 0 | ADD | Append-only decisions and administrative financial context. |
| `workspace_coupon_plans` | immutable attribution | 0 | ADD | Versioned coupon-to-plan eligibility evidence. |
| `workspace_coupon_redemptions` | retained financial state | 0 | ADD | Reserved/redeemed/released coupon capacity and paid evidence. |
| `workspace_coupons` | versioned retained catalog | 4 | ADD | Accepted coupon pricing and influencer attribution referenced by orders. |
| `workspace_course_drafts` | mutable retained creator work | 1 | ADD | Owned proposals, including locked submitted revisions; preserve normal draft edits. |
| `workspace_course_lessons` | mutable retained creator work | 0 | ADD | Private lesson content; supported individual lesson deletion remains allowed. |
| `workspace_course_modules` | mutable retained creator work | 1 | ADD | Private curriculum structure; supported empty-module deletion remains allowed. |
| `workspace_course_projects` | mutable retained approved work | 1 | ADD | Approved submission ownership and private builder provenance. |
| `workspace_course_review_events` | immutable review | 0 | ADD | Append-only administrator decisions and feedback. |
| `workspace_course_submissions` | retained review state | 2 | ADD | Immutable proposal snapshots with controlled review transitions. |
| `workspace_creator_profile_details` | mutable retained creator work | 0 | ADD | Persisted professional profile content; preserve ordinary versioned saves. |
| `workspace_creator_profiles` | retained creator identity | 5 | ADD | Stable creator ownership across paid fulfillment, grants and historical reads. |
| `workspace_creator_terms_acceptances` | immutable legal receipt | 1 | EXISTING | Creator Terms acceptance evidence. Existing unconditional BEFORE TRUNCATE statement guard (workspace_terms_history_guard); preserve without duplication. |
| `workspace_creator_terms_versions` | versioned immutable legal document | 2 | EXISTING | Source-controlled legal content with current marker. Existing unconditional BEFORE TRUNCATE statement guard (workspace_terms_history_guard); preserve without duplication. |
| `workspace_eligibility_attempts` | immutable eligibility | 2 | ADD | Persisted evaluation decisions and declarations referenced by activation. |
| `workspace_eligibility_settings` | versioned immutable policy | 4 | ADD | Historical evaluator settings; only current marker publication transitions allowed. |
| `workspace_email_challenges` | retained security state | 1 | EXISTING | Challenge hash, send/consume/expiry transitions and proof provenance. Existing unconditional BEFORE TRUNCATE statement guard (workspace_email_binding_immutable); preserve without duplication. |
| `workspace_email_notice_bindings` | immutable recipient evidence | 0 | EXISTING | Verified recipient identity bound to refund communication. Existing unconditional BEFORE TRUNCATE statement guard (workspace_email_binding_immutable); preserve without duplication. |
| `workspace_email_rate_limits` | mutable window counters | 0 | EXCLUDE | Pseudonymous abuse budgets, not authoritative proof or legal/financial history. No current TRUNCATE workflow; any future expiry cleanup needs separate policy review. |
| `workspace_influencer_history` | immutable attribution audit | 0 | EXISTING | Influencer creation and update snapshots. Existing unconditional BEFORE TRUNCATE statement guard (workspace_influencer_reject_truncate); preserve without duplication. |
| `workspace_influencers` | retained attribution state | 2 | EXISTING | Stable influencer identity and administrative changes. Existing unconditional BEFORE TRUNCATE statement guard (workspace_influencer_reject_truncate); preserve without duplication. |
| `workspace_membership_orders` | retained financial state | 8 | ADD | Frozen accepted prices, legal receipts, capture and activation history. |
| `workspace_membership_plans` | versioned immutable catalog | 2 | ADD | Historical plan terms referenced by accepted orders. |
| `workspace_memberships` | immutable entitlement | 0 | ADD | Originating-order entitlement and membership term history. |
| `workspace_payment_attempts` | retained financial evidence | 0 | ADD | Capture winner, authoritative timing and provider observation history. |
| `workspace_payment_events` | retained financial evidence | 0 | ADD | Durable webhook identities/evidence and processing state. |
| `workspace_policy_versions` | versioned immutable policy | 2 | ADD | Historical eligibility policy identifiers and receipts. |
| `workspace_refund_attempts` | retained financial intent | 0 | EXISTING | Durable submission/recovery intent for provider refunds. Existing unconditional BEFORE TRUNCATE statement guard (workspace_refund_history_guard); preserve without duplication. |
| `workspace_refund_completions` | immutable financial evidence | 0 | EXISTING | Verified full refund and entitlement consequence. Existing unconditional BEFORE TRUNCATE statement guard (workspace_refund_history_guard); preserve without duplication. |
| `workspace_refund_notice_deliveries` | retained communication state | 1 | EXISTING | Recipient delivery intent, scheduling and controlled retry state. Existing unconditional BEFORE TRUNCATE statement guard (workspace_refund_history_guard); preserve without duplication. |
| `workspace_refund_notice_delivery_attempts` | immutable communication evidence | 0 | EXISTING | Provider delivery attempt and ambiguity evidence. Existing unconditional BEFORE TRUNCATE statement guard (workspace_refund_history_guard); preserve without duplication. |
| `workspace_refund_notices` | immutable communication evidence | 3 | EXISTING | Required creator refund notice body and decision context. Existing unconditional BEFORE TRUNCATE statement guard (workspace_refund_history_guard); preserve without duplication. |
| `workspace_refund_observations` | immutable provider evidence | 0 | EXISTING | Append-only provider refund observations. Existing unconditional BEFORE TRUNCATE statement guard (workspace_refund_history_guard); preserve without duplication. |
| `workspace_refund_policy_acceptances` | immutable legal receipt | 1 | EXISTING | Exact refund policy receipt accepted before order creation. Existing unconditional BEFORE TRUNCATE statement guard (workspace_refund_policy_history_guard); preserve without duplication. |
| `workspace_refund_policy_versions` | versioned immutable legal document | 1 | EXISTING | Source-controlled refund policy document versions. Existing unconditional BEFORE TRUNCATE statement guard (workspace_refund_policy_history_guard); preserve without duplication. |
| `workspace_refund_requests` | retained financial workflow | 1 | EXISTING | Timely refund submission and controlled admin decision/processing states. Existing unconditional BEFORE TRUNCATE statement guard (workspace_refund_history_guard); preserve without duplication. |
| `workspace_verified_emails` | retained ownership evidence | 1 | EXISTING | Verified email proof, supersession and revocation history. Existing unconditional BEFORE TRUNCATE statement guard (workspace_email_binding_immutable); preserve without duplication. |

Exact new attachments:

- `public.workspace_applications`
- `public.workspace_audit_events`
- `public.workspace_coupon_plans`
- `public.workspace_coupon_redemptions`
- `public.workspace_coupons`
- `public.workspace_course_drafts`
- `public.workspace_course_lessons`
- `public.workspace_course_modules`
- `public.workspace_course_projects`
- `public.workspace_course_review_events`
- `public.workspace_course_submissions`
- `public.workspace_creator_profile_details`
- `public.workspace_creator_profiles`
- `public.workspace_eligibility_attempts`
- `public.workspace_eligibility_settings`
- `public.workspace_membership_orders`
- `public.workspace_membership_plans`
- `public.workspace_memberships`
- `public.workspace_payment_attempts`
- `public.workspace_payment_events`
- `public.workspace_policy_versions`

All seven originally identified leaves receive dedicated guards. Additional selected tables retain frozen financial/policy context, stable creator identity, manual consent/application evidence and private creator work. Mutable retained tables are not thereby declared fully append-only: their supported row operations keep their current semantics.

## D. Exclusions and documented maintenance

The 18 EXISTING rows already have enabled BEFORE TRUNCATE statement triggers with unconditional refusal before any row-record branch. They are not duplicated or rewritten. Existing trigger functions are `workspace_grant_guard`, `workspace_email_binding_immutable`, `workspace_influencer_reject_truncate`, `workspace_refund_history_guard`, `workspace_refund_policy_history_guard` and `workspace_terms_history_guard`. All 18 tables were also tested with CASCADE in the disposable database and rejected with SQLSTATE `23514`.

`workspace_email_rate_limits` holds pseudonymous key/window counters. It is not the authoritative verified-email proof, challenge evidence, financial history or legal receipt. Keeping expiry maintenance policy open is reasonable; no cleanup or TRUNCATE privilege is introduced here. Clearing live windows could still weaken abuse budgets, so ordinary runtime privileges should exclude TRUNCATE on this table too. Any future cleanup requires separate retention/security review.

The repository's guarded legacy seed at `scripts/seed.mjs:44` uses TRUNCATE for LMS tables. Its reviewed FK cascade closure contains 16 LMS tables and **no Workspace tables**. The seed was not executed. No claimed seed compatibility depends on deleting Workspace history.

## E. Proposed 0030 SQL scope and SHA-256

Generated using the installed supported workflow:

```text
pnpm db:generate --custom --name workspace_retained_history_truncate_guards
```

File: `drizzle/0030_workspace_retained_history_truncate_guards.sql`.

SHA-256:

```text
f34c190f4e7877d5b0f3fab03c89874b825ef0f2cfebca520c1dc40adfbd5bd2
```

Only one new function and 21 statement-trigger attachments are introduced. Drizzle generated the journal entry and logical-schema-identical snapshot. Migration files 0000–0029 are byte-for-byte unchanged. No backfill, ledger edit, column/index/FK change, cleanup, payment or access rule change is present.

Complete SQL:

```sql
-- Additive retained-history protection. Ordinary row operations retain their existing guards.
-- Privileged object owners can disable/drop triggers; runtime-role separation remains required.
CREATE FUNCTION public.workspace_retained_history_reject_truncate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION 'Workspace retained history cannot be truncated' USING ERRCODE = '23514';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER workspace_applications_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_applications
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_audit_events_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_audit_events
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_coupon_plans_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_coupon_plans
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_coupon_redemptions_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_coupon_redemptions
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_coupons_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_coupons
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_course_drafts_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_course_drafts
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_course_lessons_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_course_lessons
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_course_modules_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_course_modules
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_course_projects_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_course_projects
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_course_review_events_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_course_review_events
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_course_submissions_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_course_submissions
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_creator_profile_details_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_creator_profile_details
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_creator_profiles_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_creator_profiles
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_eligibility_attempts_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_eligibility_attempts
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_eligibility_settings_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_eligibility_settings
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_membership_orders_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_membership_orders
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_membership_plans_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_membership_plans
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_memberships_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_memberships
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_payment_attempts_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_payment_attempts
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_payment_events_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_payment_events
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
--> statement-breakpoint
CREATE TRIGGER workspace_policy_versions_retained_truncate_guard
BEFORE TRUNCATE ON public.workspace_policy_versions
FOR EACH STATEMENT EXECUTE FUNCTION public.workspace_retained_history_reject_truncate();
```

## F. Existing trigger/function compatibility

The function is schema-qualified, `SECURITY INVOKER`, with `search_path=pg_catalog`. It performs only an unconditional RAISE (`23514`) and has no OLD/NEW record use, query, environment switch or application privilege exception. The function is owned by the migration object creator, and performs no elevated access. Runtime roles should not own this function or its tables.

All identifiers fit PostgreSQL's 63-byte identifier limit. Installed disposable catalog flags were `tgtype=34` (BEFORE, TRUNCATE, statement), `tgenabled=O`, `prosecdef=false`, and `proconfig=[search_path=pg_catalog]` for all 21 attachments.

Ordinary row trigger definitions are untouched. Supported private lesson and empty-module deletion remains available. There is no trigger disablement, constraint drop or financial/state-machine rewrite.

## G. Single-table, multi-table and cascade risk assessment

A new explicit guard catches leaf truncation and a parent truncation that includes its referencing closure. Existing FKs still reject lone RESTRICT attempts on 11 selected parents before trigger dispatch; that outcome is recorded separately, not mislabeled as the new trigger firing.

A multi-table statement with the unguarded rate-limit table first and a guarded payment-events table second was refused; both tables and all other synthetic rows remained unchanged. Course-project, course-draft and membership-order CASCADE cases were refused. The new guards emitted the dedicated error in selected-table tests; existing equivalent guards remained effective.

All refused commands were run within transactions. Before/after JSON-normalized row-hash multisets for every public table and the disposable ledger matched. A missing final target during installation rolled back the function and every earlier attachment. No partial statement or partial failed installation remained.

This does not protect against an object owner/superuser deliberately disabling/dropping triggers, changing replication execution settings or destroying the database. Runtime-role separation, operational permissions and backups remain independent requirements.

## H. Disposable testing environment identity

Final successful run:

- Database: `workspace_f6r_disposable_0c74a40f7698abce`.
- Database OID: `32169` (different from retained OID 16384).
- Server system identifier: `7680462735222304705`; local server port 5433.
- Created from `template0`, locale C; no template copy of retained project rows.
- Reviewed 0000–0029 migrations installed using the installed Drizzle migrator; then 0030 installed **only here**. Migration seeds plus newly created synthetic fixtures only.
- Strict bootstrap/local assertions, a maintenance connection to `postgres`, and a distinct uniquely named database URL. The harness never opened a retained-data connection.
- Application repository modules received the explicit disposable Drizzle connection through the existing test loader's `@/lib/db` override. The application's unsafe URL substring connection factory was not imported.
- Temporary role: `workspace_f6r_runtime_0c74a40f7698abce`; NOLOGIN/NOSUPERUSER/NOINHERIT/NOCREATEDB/NOCREATEROLE/NOREPLICATION. Public DML, sequence use and test-only SELECT on the disposable migration metadata; no TRUNCATE, schema creation or object ownership.
- Both task-created database and role were removed successfully without FORCE, trigger disablement or retained fixture cleanup. Each earlier harness attempt also removed its own disposable database and role.

Reproducible harness: `tests/postgres/workspace-truncate-guards-verification.cjs`, explicit opt-in `WORKSPACE_F6R_DISPOSABLE_VERIFY=true`. It requires the exact authorized local bootstrap, development classification and both payment/test-authorization flags false. Do not run it against another server/environment.

## I. Actual destructive-test results (disposable only)

**70 completed checks**, including **56 refused statements**:

| Case | Actual result |
| --- | --- |
| Original leaf gap | Synthetic event truncation succeeded before 0030; deliberate rollback restored it |
| Missing target installation | `42P01`; prior function/attachments rolled back |
| Raw duplicate installation | `42723`; existing installed proposal retained |
| Normal installed migrator second run | No-op; disposable ledger remains 31 |
| Every selected table | All 21 emit dedicated `23514` refusal; 11 parent cases use CASCADE to exercise the trigger |
| Lone selected parents with inbound FKs | 11 RESTRICT refusals, `0A000` |
| Existing equivalent guards | All 18 CASCADE refusals, `23514` |
| Additional multi-table/cascade cases | Five `23514` refusals, including unguarded-first atomicity |
| Non-owner TRUNCATE | `42501`, independently of the trigger |
| Non-owner trigger disable attempt | `42501`; trigger remained enabled |
| Row preservation after every refused statement | Every public/ledger row-hash multiset unchanged |
| Cleanup | Task-created DB and role absent after close/drop |

The 56 refused statements comprise 44 trigger refusals, 11 FK refusals and one privilege refusal. The separate missing-audit commit and non-owner DDL refusal are additional checks. These are synthetic database proofs, not genuine provider/webhook verification.

## J. Ordinary application write compatibility

Normal existing services ran after installing 0030, under the temporary non-owner role:

- Normal eligibility evaluation and persisted declarations.
- Complimentary grant, matching creation audit and subsequent normal paired revocation; no financial order for the grant recipient.
- An otherwise valid grant closure without its matching audit was rejected at commit by the existing deferred constraint (`23514`), with all rows unchanged.
- Verified email request/confirmation using an in-memory test sender and secret; no email provider request or OTP value in evidence.
- Normal Creator Terms and Refund Policy acceptance receipts.
- Coupon creation and plan association; reserved capacity → exact single redemption through accepted order and reconciliation.
- Accepted order, durable provider intent, payment attempt, event ingestion/processing and real membership fulfillment services, using in-memory synthetic provider observations.
- Paid and complimentary Creator Profile saves, proposal create/update, normal submission/admin review/approval, approved private builder start and lesson create/update/read/delete; normal empty-module create/delete.
- Entitled cross-owner private draft read denied (`not_found`); unpaid private read denied (`restricted`).
- Normal refund request/approval, synthetic provider refund reconciliation and completion: refunded creator retains historical read access but loses editing; independent grant access remains valid until its own normal revocation.
- LMS `orders` and `enrollments` remained empty in the synthetic database.

No manual product backdoor, paidAt injection, genuine provider payment/refund or real message was used. Test-only fake observations are confined to the harness. No production service files changed.

## K. Role and privilege findings

Actual retained local credential is `postgres`, superuser and owner of all 40 Workspace tables with TRUNCATE capability. This is not a least-privilege production role. No retained ACL or role was modified.

The disposable non-owner could run the required service DML but could not truncate or disable a trigger. It is deliberately a broad functional DML test role, not a certified production grant manifest. The successful owner-trigger tests demonstrate ordinary command refusal even when TRUNCATE permission exists; they do not prove resistance to malicious administrative DDL.

Production application-role privileges, deployment ownership, schema ACLs and migration-role separation need separate environment-specific verification.

## L. Retained database read-only preservation

Fresh before/after identity, ledger, counts, row-hash multisets and structural definitions match exactly:

- 64 tables and 6,871 rows unchanged.
- All installed schema, functions, triggers, indexes, constraints, privileges, views, enums and retained ledger unchanged.
- No new synthetic retained evidence, no retained DDL/DML, no TRUNCATE test against retained public/LMS/D.1 history.
- Normalized private fingerprint baseline SHA-256 equals after SHA-256: `49127060609b2e8117a45752ed05c3b4ab0b04351a36fcf13a29e86edcb207e2`.
- Structural SHA-256: `d0e9dfba8259443cc07ccdbf2cbbcdda5338b022b6f3c4aa76dc4bc9af51c81c`.
- Fresh private baseline was never replaced; prior F.6 private baselines and all ten committed F.6 report/artifact files remain unchanged.

Committed evidence contains safe counts, ledger hashes, structure/baseline digests and unchanged artifact digests, not individual retained row payloads or per-row hash exports: `output/audits/workspace-f6r/retained-preservation.json`.

## M. Retained migration ledger remains 0000–0029

Before: **30 entries**, exact reviewed source hashes and journal timestamps through `0029_workspace_grant_completion_record_fix`.

After: **the same 30 entries** and hashes/timestamps. No ledger update, schema push or retained migration command occurred.

Source journal: **31 entries**, with `0030_workspace_retained_history_truncate_guards` pending. The custom snapshot has identical logical schema to 0029 apart from generated snapshot IDs. Successful generation/no-drift does not mean this pending SQL has been applied.

**Do not run the retained `pnpm db:migrate` command until 0030 receives separate owner authorization.**

## N. Full regressions and build results

- Targeted migration/security source regressions: **4/4 PASS**.
- Full `pnpm validate`: **1,092 Vitest tests across 90 files PASS**, plus **five pure Node checks PASS**.
- Included existing grants/history, financial migration, payments/provider gating, activation, coupons/pricing, refunds/notices, eligibility, terms/policy, verified email, private creator/review/builder, privacy/security and relevant LMS suites.
- TypeScript: PASS. Lint: PASS, no ESLint warnings/errors (existing Next lint deprecation notice).
- CJS harness syntax check: PASS.
- `pnpm db:generate`: PASS, “No schema changes, nothing to migrate”; no additional migration generated.
- `git diff --check`: PASS.
- Production build: not run in F.6R. Only SQL migration/metadata, tests and audit/report artifacts changed; no application source/bundling change. The brief makes the payment-disabled build conditional on source changes justifying it. No new build result is claimed.
- Both payment enablement and Razorpay Test authorization stayed false in verification commands. All external HTTP was forbidden; actual provider calls: **zero**. `.env` and the lockfile were untouched.

## O. Exact corrections, changed files and commits

Product correction: pending additive 0030 only. No existing financial, legal, grant, creator or review implementation changed.

Two isolated harness corrections preceded the passing run: (1) read-only permission to its own migration metadata for fingerprint assertions; (2) unpaid reads correctly return `restricted`, so cross-owner checks now use another entitled creator and separately assert the unpaid denial. Both failed disposable attempts cleaned up safely. No retained invariant was weakened.

Proposal/evidence commit: `bb818523f3cda35f1cb5dd4d0178e08c739798d2`.

This report is committed separately after that proposal. Its own commit hash is returned to the owner to avoid a self-referential hash.

Changed files (complete list):

- `drizzle/0030_workspace_retained_history_truncate_guards.sql` — new reviewed function/21 attachments.
- `drizzle/meta/0030_snapshot.json` — custom migration snapshot, logical schema unchanged.
- `drizzle/meta/_journal.json` — pending 0030 entry only.
- `tests/postgres/workspace-truncate-guards-verification.cjs` — opt-in isolated executable proof/cleanup.
- `tests/routes/workspace-retained-history-truncate-migration.test.ts` — four source/security regressions.
- `output/audits/workspace-f6r/coverage-review.json` — all 40 responsibilities, decisions, prior hashes and legacy seed closure.
- `output/audits/workspace-f6r/disposable-verification.json` — real isolated checks, installed guard metadata, role/cleanup results.
- `output/audits/workspace-f6r/retained-role-review.json` — read-only actual local privilege findings.
- `output/audits/workspace-f6r/retained-preservation.json` — fresh safe before/after counts/ledger/digests and prior artifact preservation.
- `output/audits/workspace-f6r/validation.json` — completed validation and precise limitations.
- `WORKSPACE_LAUNCH_F6_TRUNCATE_GUARD_PROPOSAL.md` — this review/report and exact SQL.

## P. Outstanding F6-02 through F6-07

No unrelated finding was fixed or reclassified as launch-ready:

| Finding | Still requires separate handling |
| --- | --- |
| F6-02 | Local libc collation mismatch 2.39 → 2.43; no collation maintenance performed |
| F6-03 | Five legacy FK name discrepancies; semantic match does not resolve migration naming concerns |
| F6-04 | Broad connection URL substring matching and pool/timeouts; **correct and verify target parsing before production-sensitive connection/migration workflows rely on it** |
| F6-05 | Potential FK/index/search/count scaling concerns; no speculative index/performance changes |
| F6-06 | Retention policy and three REVIEW tables, including unmanaged `otps` and two D.1 copies; none deleted |
| F6-07 | Invoice PDF base64 storage growth; no storage rewrite |

F6-01 also remains present in the retained schema until separately approved application of 0030.

## Q. Production portability concerns

SQL does not depend on row counts, fixture contents, runtime environment flags or historical provider payload variants. Schema-qualified existing table names and short unique trigger names were reviewed against the actual 0029 catalog. Drizzle runs migrations transactionally; an unexpected missing target and duplicate function fail safely, as tested.

Production itself was not inspected. Before any separately approved application, verify target/environment, exact 0000–0029 source/ledger correspondence, all expected ordinary tables and existing guards, absence of conflicting proposed object names, supported PostgreSQL version/language, migration-role ownership/CREATE/TRIGGER permissions, safe runtime-role separation and an acceptable bounded lock window. A divergent production catalog is a blocker to investigate, not a reason to rename/drop objects or bypass the ledger.

TRUNCATE and trigger DDL take locks; operational contention on a real deployment was not benchmarked. No superuser-adversary, crash/recovery, production backup/restore or genuine provider claim is made from these isolated tests.

## R. Next authorization required

0030 is ready for **separate, explicit local application approval** using the repository's guarded versioned migration workflow. That future authorization must identify the exact local target and approved SQL hash, repeat identity/ledger/source checks, apply only the pending migration, verify second-run no-op/installed guards and preserve retained histories without destructive retained-table probes.

This proposal verdict is not permission to migrate the retained DB or deploy. Production migration/role/operations review and F6-02–F6-07 remain independent work. No next phase was started.

## S. Final verdict

**WORKSPACE F.6R TRUNCATE GUARD PROPOSAL READY FOR APPROVAL**

All seven initial leaves and the remaining 40-table responsibilities are addressed explicitly; isolated negative/positive checks and source regressions pass. Retained rows, schema and its 30-entry ledger are unchanged. Migration 0030 remains **pending and unapplied** to `airbharath_lms`.
