# Workspace E.1 course-submission preservation diagnostic

13 October 2026. Starting branch/HEAD: `codex/workspace-1.8-launch@f65b91b`, clean worktree.

**E.1 DISCREPANCY EXPLAINED — HUMAN REVIEW REQUIRED BEFORE RESUME**

The differing fingerprint represents an audited `under_review` → `approved` lifecycle transition, not a demonstrated content/ownership loss. Reconstructing the prior lifecycle from immutable audit evidence and the installed lifecycle constraints exactly reproduces the original baseline hash. This task does not accept an exception, rebaseline, restore the row or resume E.1.

## A. Database identity and ledger

Independent TCP and `/tmp` Unix socket checks matched the authorized local development database:

- Database `airbharath_lms`, port `5433`, OID `16384`.
- PostgreSQL system identifier `7680462735222304705`.
- `DATABASE_ENV=development`, exact authorized localhost target.
- Ledger: 25 entries, 0000–0024. Every ledger hash/timestamp matched committed migration bytes and journal order; no pending/unknown migration.
- 0023 SHA-256: `eb52bf03f803cf181d155483794f853e9d08c00240e29dd0ba3ace5cd1e7f910`.
- 0024 SHA-256: `a43c81bc2dbe9cae06883946221e6487c51fd85d05ad2a49db38690250627f8e`.

Only SELECT/read-only metadata checks were performed. Diagnostic database sessions explicitly set `default_transaction_read_only=on`. No migration, fixture, provider request or database mutation occurred. Credentials/connection strings were not printed.

## B. Original baseline preservation

Original evidence inspected in place:

- `/tmp/wse1c-history-before.json`: 55 public tables / 3,725 original records; per-row canonical JSONB MD5 fingerprints and multiplicity. It contains no original row payloads or hash-to-UUID mapping.
- `/tmp/wse1c-preservation-diagnosis.json`: original discrepancy and table-level preservation results.
- `/tmp/wse1c-stage-a.json`: retained synthetic verification identity references.
- Older local preservation files likewise contain fingerprints/counts (some include row-ID sets), not the missing original field payload.

Original baseline file SHA-256, checked unchanged during this investigation:

`bd530ecf9f1c06242eb84868732b4117fcd98debfb5768a7e84cf8aa291b271b`

Original missing row fingerprint remains:

`55989a0858677f6f30a943cdb13d0cbc`

No original evidence file or baseline was replaced. New read-only results were saved separately under `/tmp/wse1-course-*`. Current comparison still shows exactly that one original mismatch: 3,724/3,725 original fingerprints match, with 78 submissions present. Financial/influencer/agreement/notice/legacy evidence remains preserved. This is not a claim that every original fingerprint stayed unchanged.

## C. Affected row identification

Stable submission UUID:

`8bc83bf8-8a07-42d8-aeb7-7c5668c42b66`

The current submission is the only current row whose fingerprint is absent from the original submission fingerprint set. Current hash:

`0cd8a0f385694445532ba3ea845e43b1`

Identification is strengthened by the audit-derived prior-state reconstruction: this same UUID produces the exact missing original fingerprint when its four lifecycle fields are restored *in a SELECT expression only*. No row position or table ordering was used. No title, course content, creator contact details or auth credentials were exposed.

## D. Changed columns, with independently supported prior values

A hash alone cannot reveal original column values. The baseline does not retain the original payload, so general old-value recovery from that hash is impossible. Here the immutable review events and installed lifecycle rules provide an independent candidate prior lifecycle. Its exact whole-row hash matches the preserved baseline, validating that reconstruction.

| Field | Prior lifecycle (audit/constraint-derived and hash-validated) | Current value |
| --- | --- | --- |
| `review_status` | `under_review` | `approved` |
| `version` | 2 | 3 |
| `review_completed_at` | NULL | 2026-10-13 10:52:21.519 +05:30 |
| `updated_at` | 2026-10-10 22:48:52.664 +05:30 | 2026-10-13 10:52:21.519 +05:30 |

Unchanged lifecycle fields include submitted/created time `2026-10-10 22:48:52.652 +05:30` and review start `2026-10-10 22:48:52.664 +05:30`. The reconstruction retains all current non-lifecycle fields and changes only the four entries above; its MD5 becomes exactly `55989a0858677f6f30a943cdb13d0cbc`. Thus the stored evidence supports no other prior/current field difference, subject to the existing MD5 fingerprint method's usual collision limitation.

Reproduction uses only read-only SQL. Conceptually:

```sql
SELECT md5((to_jsonb(s) || jsonb_build_object(
  'review_status', approval.from_status,
  'version', approval.transition_version - 1,
  'review_completed_at', NULL,
  'updated_at', s.review_started_at
))::text)
FROM workspace_course_submissions s
JOIN workspace_course_review_events approval
  ON approval.submission_id = s.id AND approval.transition_version = 3
WHERE s.id = '8bc83bf8-8a07-42d8-aeb7-7c5668c42b66';
```

This is a hash-checked reconstruction from retained evidence, not invented old content or a database restoration.

## E. Related audit/timestamp evidence

Two immutable review events exist:

| Event UUID | Action / transition | Version | Time (IST) |
| --- | --- | --- | --- |
| `fa4ef9cb-705e-455b-9651-e2f3187755a2` | review_started: submitted → under_review | 2 | 10 October 2026, 22:48:52.664 |
| `490a8ee6-2107-40a9-aeb5-13942bf93fb2` | approved: under_review → approved | 3 | 13 October 2026, 10:52:21.519 |

The approval event's canonical row hash is `fa736cd98d3e9c538079f616df2862ee`. It is absent from the initial review-event baseline; current review-event count is 130 versus 129 originally. All original review-event fingerprints remain present. This is an added audit event, not a rewritten prior event.

Approval event and current submission tuple both have PostgreSQL `xmin = 8342`, supporting their update/insert occurring together in the same transaction. Event time exactly matches current submission update/completion time.

Recorded approval actor UUID: `6b852c18-a13d-4f7e-ad88-fc2fcebbc027`. Its current role is admin, and its complete user-row fingerprint existed in the pre-task baseline and remains unchanged. It is not the continuation harness's synthetic admin UUID. No person's name/contact is attributed. The database audit identifies a recorded actor, not the human/operator or transport that used it.

## F. Potential concurrent application activity

Relevant implementation paths inspected:

- `app/api/admin/workspace/course-reviews/[id]/route.ts`: PATCH requires persisted admin authorization.
- `lib/workspace/review/service.ts`: validates expected status; appends the immutable admin event, then transitions the submission in the same transaction.
- `lib/workspace/review/repository.ts`: locks persisted admin → draft → submission; lifecycle transition updates exactly status, version, update time and review completion time for approval.
- `lib/workspace/review/transaction.ts`: creator submission paths create new immutable snapshots or read history/status; they do not approve an existing submission.
- Installed `workspace_guard_course_submission`, `workspace_guard_course_review_event` and deferred `workspace_check_course_review_consistency`: enforce legal versioned transitions, immutable snapshot fields, persisted admin actor and paired event/update timestamps.

This observed transition matches an ordinary admin approval with those exact four fields. No background job or automatic timestamp-only updater of course submissions was found in application/scripts source. The timestamp is supplied by the review service, not a general database updatedAt hook.

The evidence explains *what* happened and the recorded actor. It cannot prove which browser, HTTP client or human initiated it. An equivalent direct SQL transaction satisfying the same guards cannot be distinguished from the normal API using these records alone. Idle session inventories are not attribution evidence and are not used to identify an editor.

## G. Migration/harness involvement analysis

Migration 0024 contains only the unconditional influencer TRUNCATE rejection function and two statement triggers. It has no course-submission UPDATE/INSERT, review-event append, background action or ordinary review dependency.

The continuation SQL harness loads influencer/membership services, creates clearly tagged influencer/coupon fixtures, and runs intentionally rolled-back invalid probes. It does not invoke the review service or issue committed course-submission/review-event mutations. Its synthetic admin is distinct from the recorded approval actor.

Influencer CASCADE truncation probes could traverse restrictive FK relationships into related Workspace tables. They abort under the statement-level guards and roll back; that is not a committed course-review transition or an audit-event creation path. Read-only catalogue comparison confirmed all three installed review trigger function bodies and the new influencer function body exactly match their committed migration bodies. The installed new function only raises 23514. Relevant submission triggers validate lifecycle/audit consistency; they do not initiate approvals automatically.

No committed path in 0024 or the inspected harness explains this approval. Detection after migration is not causation. Evidence instead records a distinct audited transaction under a pre-existing admin identity, consistent with concurrent review activity.

## H. Row and relational integrity

The submission still exists with valid approved/version-3 lifecycle:

- Owner user exists.
- Creator profile belongs to the same owner.
- Draft, user and creator-profile composite identity matches.
- Two review events retain coherent version/status sequence and timestamps.
- All actual submission constraints are validated; immutability and deferred consistency triggers are enabled.
- There is no associated approved builder project yet; project creation is separate from review approval, so this absence is not itself corruption.

Original draft/content and review records are retained. The affected row is a course-review record, not financial/coupon evidence. Full current preservation comparison shows no missing original financial, coupon, influencer, membership/profile, agreement, notice or legacy fingerprint.

## I. Evidence supporting or excluding data corruption

Supporting a legitimate lifecycle explanation: legal transition, matching version, immutable audit event, same transaction identity, exact matching timestamps, persisted admin actor, intact FKs and exact reconstructed prior-row fingerprint.

No actual evidence of immutable content/ownership corruption, financial/coupon mutation or lost course record was found. This does not prove the human initiated action was intended, nor certify every possible aspect of authorization beyond the available database/source evidence. The original row hash did change, as expected for the recorded approval; it must remain an explicitly reviewed exception rather than being ignored.

## J. Remaining uncertainties

- Original baseline carries no plaintext old row or per-field fingerprints. Prior lifecycle recovery relies on audit/constraints plus whole-row hash validation.
- Exact human/client origin and intent of the recorded admin approval are not retained in the inspected evidence.
- No human-approved preservation exception has been granted by this diagnostic task.
- E.1 financial concurrency/reporting and hydrated browser verification remain unexecuted.

Original baseline SHA-256 remained unchanged. No product code change, database write, migration, fixture, provider call, financial/browser verification or expensive test/build run occurred. Only this diagnostic report is committed; `git diff --check` is clean.

## K. Recommendation for E.1 resumption

**E.1 DISCREPANCY EXPLAINED — HUMAN REVIEW REQUIRED BEFORE RESUME**.

Recommend a human review of the recorded approval and explicit acceptance, if intended, of this narrowly identified exception: submission UUID, original/current fingerprints, four lifecycle fields, approval event UUID/time and transaction 8342. Keep the original baseline/report and append the approved exception separately; do not silently regenerate the baseline or revert the legitimate review.

Resume E.1 only after an explicit next-step decision. A resumed preservation comparison should retain the original baseline and apply only that approved, documented lifecycle exception while requiring all other originals to match. This task does not grant the exception or begin financial races/browser verification.
