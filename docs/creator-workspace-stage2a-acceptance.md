# Stage 2A founder local acceptance

Stage 2A fixes three local engineering blockers. Public launch remains **NO-GO**. Approval of this work does not authorize hosting activation, production migration, private AWS access, FAV, payments or payouts.

Read [the remediation report](creator-workspace-stage2a-remediation.md), the unchanged [Stage 1 runbook](creator-workspace-launch-runbook.md), and [provider prerequisites](creator-workspace-provider-readiness.md). The local evidence is under `output/audits/workspace-stage2a/`. It contains synthetic identities, generated media and screenshots. Never enter real bank details into this fixture.

## Review the current UI

The guarded synthetic server uses `http://127.0.0.1:3034` while its launcher is running. Ordinary application authentication still applies. The browser harness creates signed sessions only for the identity-checked disposable database; no shipping login bypass was added. `/tmp` fixtures and browser sessions are temporary.

Review these paired desktop/mobile screenshots in the evidence directory:

| Journey | Screenshot prefix | Acceptance |
| --- | --- | --- |
| Creator saved lesson preview | `creator-private-playback` | Existing lavender Studio and player; generated video decodes and seeks |
| Paid learner lesson | `learner-private-playback` | Existing LMS player, notes and resources; no direct storage URL |
| Worker health | `bank-worker-health` | Separate Creator bank verification card; last attempt/success and recorded counts |
| Missed worker run | `bank-worker-missed-run` | Simulated missing invocation displays Stale |
| Bank verification recovery | `bank-validation-backlog` | Pending/uncertain/blocked evidence links to original payee version |
| Membership | `membership-regression` | Existing current membership and renewal entry points |
| Secure bank settings | `bank-account-regression` | Existing masked bank details and verification controls |

## Focused acceptance checklist

- [ ] Creator and learner playback work at desktop and 390px mobile widths. Seeking to 10 seconds resumes playback. The generated H.264/AAC fixture proves decoding, not native browser compression or real MediaConvert operation.
- [ ] An 18 MiB private PDF and a segment larger than 4.5 MB transfer in chunks. Response bytes and hashes match the synthetic fixture. HEAD transfers no body; valid single ranges return 206; invalid/multiple/unsatisfiable ranges return 416.
- [ ] Anonymous users, another learner, expired enrollment and expired sessions cannot retrieve a resource, manifest, segment or original MP4. Creator and persisted Admin routes retain independent authorization. A revoked learner cannot make a new successful asset request.
- [ ] Interrupt a stream: storage reading stops. Unit evidence also covers upstream errors, truncation, hash failure, abort and authorization changes during a stream. Already-delivered bytes cannot be recalled; ongoing streams recheck access at most every five seconds and before their final chunk.
- [ ] Interrupted HLS verification retains the checked prefix. The 2,000-object synthetic PostgreSQL job resumes across bounded passes. Partial output cannot become Ready, evidence cannot be deleted, concurrent recovery does not dispatch another transcoding job, and the final manifest includes every required object.
- [ ] A slow payment provider reaches the cooperative deadline without granting access from a late response. Repeated and concurrent recovery eventually grants exactly one enrollment and one capture/fee ledger pair per valid purchase. Partial dispute scans retain their cursor and do not duplicate adjustments.
- [ ] Admin → Workspace → Launch operations shows Creator bank verification as its own worker. Its recovery link opens Bank verification. Last success survives a failed attempt. An intentionally missed run becomes Stale; uncertain/blocked/review records need attention.
- [ ] Existing two-Admin payout approval, exact validated beneficiary binding, original payout intent/idempotency, uncertain-response recovery, and provider-confirmed terminal settlement remain required. All test operations are synthetic.
- [ ] Confirm the changed-file manifest and preservation evidence: six protected edits and eight Stage 1 packet files remain byte-identical and uncommitted; historical migrations through 0043 remain unchanged.

## Reproduce locally

These commands are for the authorized isolated test fixture only. They do not use `.env` files or ambient `DATABASE_URL`. Use the declared pnpm version and existing dependencies. Run build/validation/browser work sequentially to avoid unnecessary local resource contention.

```sh
node scripts/stage2a-verify.cjs prepare validation
env -i PATH="$PATH" HOME="$HOME" STAGE2A_VERIFY=true node scripts/stage2a-verify.cjs validate
node scripts/stage2a-verify.cjs prepare build
env -i PATH="$PATH" HOME="$HOME" STAGE2A_VERIFY=true node scripts/stage2a-verify.cjs build
node scripts/stage2a-verify.cjs preservation
```

The build uses an unreachable loopback database target and synthetic signing material. It is a compile check, not production connectivity proof.

To create a **new** isolated fixture, first stop only the existing Stage2A launcher and its identity-checked PostgreSQL cluster. Retain its evidence. Move its inactive `/tmp/airbharath-stage2a/browser-source` copy aside; never overlay a running copy. The launcher intentionally refuses a second active fixture. Then run:

```sh
node scripts/stage2a-verify.cjs prepare browser-source
env -i PATH="$PATH" HOME="$HOME" STAGE2A_ISOLATED_VERIFY=true DATABASE_ENV=test ALLOW_DATABASE_MIGRATION=true ALLOW_DESTRUCTIVE_DB_OPERATION=true node scripts/stage2a-isolated-postgres.cjs
env -i PATH="$PATH" HOME="$HOME" STAGE2A_POSTGRES=true DATABASE_ENV=test ALLOW_DESTRUCTIVE_DB_OPERATION=true node tests/postgres/stage2a-verification.cjs
env -i PATH="$PATH" HOME="$HOME" STAGE2A_MEDIA_FIXTURE=true DATABASE_ENV=test ALLOW_DESTRUCTIVE_DB_OPERATION=true node tests/postgres/stage2a-media-fixture.cjs
env -i PATH="$PATH" HOME="$HOME" STAGE2A_LOCAL_TEST=true node scripts/stage2a-local-test.cjs
```

Keep that last terminal open. In another terminal run:

```sh
env -i PATH="$PATH" HOME="$HOME" STAGE2A_BROWSER=true DATABASE_ENV=test ALLOW_DESTRUCTIVE_DB_OPERATION=true node tests/postgres/stage2a-browser.cjs
```

The harness uses the installed Chrome/Playwright runtime, localhost-only browser requests, generated files and temporary provider transports. It exercises actual application routes and PostgreSQL guards. It never verifies a live bank account or transfer. A fresh fixture is required for repeating the destructive setup; do not rerun the foundation against a database containing retained acceptance data.

## External checks still required under separate authorization

1. Hosting owner: confirm the actual Vercel plan, Fluid/runtime support, region, request/response streaming and scheduler frequency. On an authorized private hosted test environment, repeat large GET/HEAD/Range, cancellation, slow connections and denied-access checks. Record first-byte time, full bytes, peak memory, timeout behavior and egress cost. The 50-second transfer deadline must fit representative client bandwidth; original MP4s can be up to 2 GiB and require Range-based seeking/resumption on slower links. Do not declare MEDIA-DELIVERY ready from localhost results.
2. AWS owner: verify real private/versioned bucket policy, expected owner, SSE/checksums, exact-version GET/HEAD permissions, MediaConvert role/queue/callback authenticity, immutable output inventory, largest supported duration/object count, lifecycle and retention. No real AWS assets were inspected here; MEDIA-AWS stays unverified.
3. Platform/on-call owner: prove actual authenticated cron deliveries, overlap/retry recovery, backlog throughput and missed-run alerts. Source declarations use media/FAV every minute and course recovery every five minutes. Validate connection capacity for dedicated worker pools and alerting independent of the application. JOB-DELIVERY stays unverified.
4. Finance/provider owner: keep real FAV/payout execution disabled until exact account capability, KYC, funding, charges, permissions and allowlisting are independently confirmed. Ticket #1221276 remains pending unless the founder supplies new confirmation. No money operation is part of this acceptance.
5. Database owner: review additive migration 0044 and the refreshed read-only preflight pins. Production application remains a separately approved release operation. Preserve checkpoint/financial evidence on rollback; do not drop tables or rewrite history to revert code.

Founder decision: approve or reject **Stage 2A local engineering only**, record residual limitations and the next authorized readiness gate. Public activation still requires the separate coordinated launch decision.
