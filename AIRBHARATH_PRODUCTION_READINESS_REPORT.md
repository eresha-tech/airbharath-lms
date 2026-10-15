# AirBharath release-candidate readiness

15 October 2026. **Preparation complete; production migration, deployment and public charging remain NO-GO.**

Release candidate: `845419a2e6057d20f2f2bf2a14646245ccbe9436`, branch `codex/workspace-1.8-launch`. The four founder-approved motion/header files were already committed separately at this HEAD. Starting worktree was clean. This task changes only the four readiness documents; no application, configuration, dependency or migration source changes.

## Evidence and release inventory

“Locally verified” is supported by retained reports/tests, not a claim of production configuration or founder acceptance. No database was connected during this preparation. Latest retained local evidence identifies `localhost:5433/airbharath_lms`, OID `16384`, system identifier `7680462735222304705`, 32 ledger entries through `0031`; these are not Neon identifiers. Production `0000–0006` is owner-reported only. If confirmed, the candidate suffix is **25 migrations, 0007–0031**; the actual suffix remains unknown.

| System | Existing production behavior to preserve | RC / local evidence | Early Access release boundary |
|---|---|---|---|
| Public LMS | Published AirBharath catalog, course details, pricing, practice, certificate verification | F.7/F.8C and final homepage report; later approved static hero/motion | Preserve existing LMS; claims need substantiation |
| Learner auth/dashboard | Phone OTP, account profile, learner progress and sessions | Normal local mock OTP/navigation and authorization regressions | Real MSG91 and Redis configuration required; local mock prohibited in hosting |
| LMS purchases/access | Separate LMS orders, bundle/course enrollments, invoices and certificates | Existing regressions; original enrollments preserved | Preserve economics/access; no new LMS refund policy or global 365-day conversion |
| Creator onboarding | New Workspace journey, separate from LMS purchasing | Phone OTP, contact email, evaluator, immutable decisions and independent agreements | No mandatory email-ownership OTP; contact syntax is not ownership proof |
| Activation/membership | New separate financial domain | Genuine Test purchase, webhook capture time, fulfillment and refund recorded locally | Public charging requires separate approval; independent grants remain valid sources of access |
| Profile/proposals/review | New Creator/Admin workflow | F.3–F.5/F.8 and route/access evidence | Profile, private proposals, submission, revisions and Admin review allowed |
| Private course builder | New approved-proposal text builder | F.8 ownership/access regressions and hydrated checks | Private modules/text lessons only; no media delivery, publication, selling or Creator-course learner access |
| Billing/refunds | Workspace full-refund workflow, separate from legacy LMS | Genuine full Test refund and paid-editing revocation; retained history/read access/grants preserved | Requires operational refund/reconciliation/notice readiness before charging |
| Admin | Existing LMS Admin plus Workspace settings, review, grants, finance and bounded lists | Persisted-role authorization and F.4/F.5 regressions | No automatic Admin role, publication or financial bypass |
| Workers/integrations | LMS AWS/CloudFront, MSG91, Mailercloud, Redis; new Workspace workers | Bounded authenticated worker routes exist; no versioned production schedule | Scheduler/operator/capacity ownership unconfirmed; no provider enabled here |

Retained genuine evidence: `AIRBHARATH_FINAL_LOCAL_CREATOR_PAYMENT_UAT.md` records **₹4,247**, one captured purchase, genuine signed capture/refund events, normal full refund and paid-editing revocation. Historical `provider_refund_http_400` is preserved and does not negate the later success. Do not relabel this as the unperformed ₹5,899 no-coupon scenario. Explicit founder acceptance of the complete local UAT journey is still not recorded in the reviewed reports.

## Hosting facts versus decisions

Public DNS/HTTPS inspection on this date, without private account access:

| Host | Root response | Certificate verification | Observation |
|---|---|---|---|
| `airbharath.in` | 308 → `https://www.airbharath.in/` | Passed; expires 12 January 2027 | Vercel response |
| `www.airbharath.in` | 200 | Passed; expires 12 January 2027 | Vercel; public title “AirBharath LMS - Premium Aviation & Technical Learning”, course/login/dashboard links |
| `lms.airbharath.in` | 307 → `https://www.airbharath.in/` | Passed; expires 1 December 2026 | Vercel; same public Vercel CNAME as www |

The current public LMS entry is therefore **www**. This does not identify the private Vercel project, branch mapping or deployment SHA. Only root redirects were checked; path/query preservation is unverified. Source `lib/public/metadata.ts`, invoices and certificate fallbacks still name **lms**. Recommendation: confirm www as canonical if that is the intended consolidated product, then separately approve the narrowly scoped origin/link correction and redirect tests. Alternatively restore an explicitly approved LMS host mapping. No hostname decision or DNS change was made here.

No tracked `vercel.json` or `.vercelignore`, no local `.vercel` attachment. An existing Vercel service is publicly observable; its account/team/project, Production branch, region, plan, Preview isolation, environment variables and rollback deployment are **unconfirmed**. CI validates PRs/main but is not evidence of Vercel mapping. Preserve Route 53/CloudFront and all Google Workspace MX/SPF/DKIM/DMARC records.

Source hosting configuration is Next.js 15.5.19, compression enabled, powered-by header disabled, 30-day image optimization cache, HTTPS image sources currently wildcarded, and client dynamic/static router reuse at 30/180 seconds. No configuration was changed. Retain private no-store/server authorization regardless of router reuse; review the image host allowlist/resource budget with the eventual hosting settings. Workspace same-origin helpers compare browser Origin to the request/Host authority when present; missing Origin is allowed. Verify proxy host/protocol forwarding and actual callback/CSRF behavior on the selected deployment rather than assuming localhost proves it.

## Ranked blockers and next actions

| Priority / gate | Finding | Required action |
|---|---|---|
| P0 — any DB-dependent rollout | Exact Neon identity, ledger, catalog, TLS/timeouts and privileges not independently inspected | Authorize restricted SELECT-only preflight for an exact owner-attested project/branch/direct endpoint/database/role; follow Neon runbook |
| P0 — migration | Backup/recovery point, isolated restoration and 25-migration compatibility rehearsal unproved | Separately approve protected backup/isolated branch work; require preservation and measured recovery evidence |
| P0 — migration | CLI bypasses application target/TLS/timeout factory; authorization flag alone is insufficient | Review explicit verified-TLS direct execution and negative TLS/target tests in isolation; fail-closed runner hardening is recommended as separate work |
| P0 — deployment | Host/canonical mismatch and private Vercel/branch/Preview mapping unknown | Confirm hostname/project/branch, protect Preview from live DB/providers, verify redirects, sessions, callbacks, webhook host and rollback |
| P0 — public charging | Complete founder local UAT acceptance and operational/commercial sign-off not recorded | Record explicit acceptance; do not repeat genuine transactions just for this report |
| P0 — public charging | Phone-only onboarding leaves sensitive refund notices blocked for unverified recipients | Approve a legal/operational communication procedure; preserve fail-closed email proof and notice bindings, not a contact-email bypass |
| P0 — auth/release | Production Redis, MSG91 and aggregate database budget unverified | Real phone OTP/rate-limit delivery smoke requires separate authorization; local Redis bypass is not production readiness |
| P1 — charging/operations | No demonstrated production worker schedule, monitoring owner, retry/replay procedure or alert delivery | Assign owner and bounded authenticated schedules; rehearse recovery and alarms before accepting money |
| P1 — customer/privacy review | Legacy invoice/certificate senders use `users.email` without Workspace ownership-proof checks; recipient/error text may enter logs | Owner/security/legal decision on existing channels; propose a separate scoped protection plan, preserve current commercial behavior here |
| P1 — release marketing | Masterclass artwork says “1000+ Students Trained”; no supporting founder evidence found | Obtain substantiation or separately approve replacement artwork; also substantiate AI/VR innovation claims without implying universal course availability |
| P1 — packaging | 270 tracked evidence/artifact files; ignored local DB/private directories exist in checkout | Approve exclusions and inspect actual upload/runtime artifact; do not delete evidence or upload the workspace wholesale |

After schema readiness, separately publish production eligibility **12 months / 1 day (24 elapsed hours) / 7-day cooldown** through `/admin/workspace/settings`. Local version 10 does not transfer to production; migration 0009 seeds 24 months / 30 days / 7 days. Preserve all other settings and prior decisions/deadlines. Exact publication/retry procedure is in the Neon runbook.

## Verification completed now

- Source-pin loader accepts all **32 SQL migrations and 66 schema/journal/snapshot source files**. Manifest `e9494753700c4df15ce57261e7431ba8d0451c1e41d46db485a7d55886f6eaf8`; source-file pin `2fed961b801f528b8c92c2f200d312e4abb9d95a22e1cffa40a27b289d6b9ba9`.
- `0000–0030` SQL is unchanged from F.9A commit `c37f9cc`; only additive `0031` and its journal/snapshot follow it. Two files differ from their first Git drafts: 0012 corrected FK ordering in `51a7645`, and 0020 corrected an explicitly unapplied policy timestamp in `728dce6`. Neither changed in this task; production must match the reviewed full hashes, never assumed draft hashes.
- **212 focused Vitest tests / 11 files** passed: read-only preflight, DB configuration/runtime, Live gating, financial worker, notice delivery, phone-only UI/local OTP, financial migration prerequisites, account navigation and public landing. **12 Node database-safety tests** passed. Tests used mocks/synthetic configuration, not a DB/provider.
- Prior full baseline: **1,391 Vitest tests / 116 files + 43 Node checks**, TypeScript/lint/build in `AIRBHARATH_FINAL_HOMEPAGE_AND_ACCOUNT_NAVIGATION.md`. Later hero-only work passed 59 focused tests, TypeScript/lint and desktop/mobile browser checks; no backend/financial source changed afterward.
- Fresh payment-disabled release-candidate build: **PASS**, including TypeScript, lint and optimized production compilation/page generation. It excludes dotenv/private artifacts, uses an unreachable dummy DB and no provider credentials; original cached fonts are supplied only for offline build verification. This is not production connectivity proof or an artifact approved for upload. Its 175 dependency traces contained no checked env/AWS/local-DB/evidence paths; the disabled, null-rendering `/dashboard/messages` route is statically rendered, while the checked data-bearing private routes are dynamic.
- `git diff --check`: **PASS** before documentation commit. Only these four documents will be committed; no push or deployment.

## Next authorization

Approve **only** SELECT-only inspection of the exact Neon target using securely provisioned restricted credentials. Supply the non-secret project/branch/direct hostname/database/role mapping and optional independently known production OID, not a connection string in chat. This does not authorize grants/role creation, backups, branch creation, migration, deployment, provider calls or charging. Those remain separate later gates. See `AIRBHARATH_NEON_MIGRATION_RUNBOOK.md`, `AIRBHARATH_DEPLOYMENT_RUNBOOK.md` and `AIRBHARATH_REPOSITORY_CLEANUP_PLAN.md`.
