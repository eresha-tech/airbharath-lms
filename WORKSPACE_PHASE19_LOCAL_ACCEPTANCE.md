# Phase 1.9 — local founder acceptance

For the prepared founder environment and exact current test pages, start with **WORKSPACE_PHASE19_FOUNDER_START.md**. The Studio refinement and native-compression verification limit are documented in **WORKSPACE_PHASE19_STUDIO_REFINEMENT.md**; use its current results rather than treating the earlier original-MP4 provider pass as compression evidence.

**2 November 2026 verification update:** the dedicated test AWS prerequisite checks and genuine local Chrome integration have now passed, including real uploads, MediaConvert, HLS/captions, version/checksum evidence and private downloads. Local migrations through 0033 and synthetic Creator/Admin sessions have been prepared. See WORKSPACE_PHASE19_LOCAL_PREPARATION.md for actual results and remaining manual gates; it supersedes the original implementation-time pending statements below. Founder acceptance remains PENDING. Use the guarded prepared startup/setup commands in the founder guide rather than the generic migration example below.

Status: implementation supplied; acceptance PENDING. The founder must test the actual UI and explicitly approve Phase 1.9. Genuine nonproduction AWS verification is also pending the test configuration the founder will supply. This is not a public release; Creator Workspace launches as one coordinated release after all major phases.

## Start locally

Use the existing Node 22 and repository-declared pnpm 11.15.1. No new dependency is required.

1. Use a confirmed disposable/local PostgreSQL database, with synthetic accounts. Never reuse a production/staging DATABASE_URL or credentials. The existing `dev:uat` launcher verifies the established local database's identity (localhost:5433/airbharath_lms); it refuses any different identity. Its startup does not migrate or seed anything.
2. Review and apply versioned migrations through **0033** to that confirmed local target, using the repository's migration/acknowledgement guards (`DATABASE_ENV=development ALLOW_DATABASE_MIGRATION=true pnpm db:migrate`, with the independently verified local DATABASE_URL already exported). This implementation did not migrate the founder's established local database. If it has not been separately authorized for migration, arrange that local-only step first. Do not use schema push. Preserve historical learner data.
3. Put only nonproduction configuration in the local environment. Keep credentials out of chat, source, screenshots and commits. Next loads local environment files; check that none point to production. `DATABASE_ENV=development` and a strong local `JWT_SECRET` are required. The existing launcher uses `NEXT_PUBLIC_BASE_URL=http://localhost:3000` and disables SMS, Redis and development analytics.
4. For text/UI-only testing, run `pnpm dev:uat`. For actual private media testing after the configuration below is supplied, run **`pnpm dev:uat --media`**. The media mode validates dedicated configuration and starts the private polling worker. Other provider modes cannot be combined with `--media`. The default UAT mode explicitly disables media providers.
5. Open `http://localhost:3000`. Stop with Ctrl+C; the launcher stops its worker. No deployment, public course or enrollment is involved.

The temporary implementation verification used a separate `/tmp` cluster and credential-free source copy, not the established founder database. Its test JWTs are ephemeral and are not founder login credentials. A webpack development fallback (`pnpm exec next dev --hostname 127.0.0.1 --port 3000`) is available if testing a temporary source copy whose dependency symlink Turbopack refuses; normal repository startup remains unchanged.

## Nonproduction media variables

| Variable | Required value/purpose |
| --- | --- |
| `WORKSPACE_MEDIA_STORAGE_ENABLED` | `true` for provider use (`--media` sets this in its child). |
| `WORKSPACE_MEDIA_PRIVATE_VERSIONED_BUCKET` | `true`, acknowledging the dedicated private/versioned bucket; actual bucket privacy/versioning is checked by the adapter. |
| `WORKSPACE_MEDIA_AWS_REGION` | Test bucket/MediaConvert region, e.g. `ap-south-1`. |
| `WORKSPACE_MEDIA_S3_BUCKET` | Dedicated nonproduction bucket name. No LMS/default bucket fallback. |
| `WORKSPACE_MEDIA_AWS_ACCOUNT_ID` | Expected 12-digit test AWS account. |
| `WORKSPACE_MEDIA_AWS_ACCESS_KEY_ID` | Dedicated least-privilege nonproduction identity. |
| `WORKSPACE_MEDIA_AWS_SECRET_ACCESS_KEY` | Corresponding secret, configured locally only. |
| `WORKSPACE_MEDIA_AWS_SESSION_TOKEN` | Required if the dedicated identity uses temporary credentials. |
| `WORKSPACE_MEDIA_PROCESSING_ENABLED` | `true` for MediaConvert (`--media` sets this). |
| `WORKSPACE_MEDIA_MEDIACONVERT_ROLE` | Role ARN in that same test account, trusted by MediaConvert. |
| `WORKSPACE_MEDIA_MEDIACONVERT_QUEUE` | Queue ARN in that same region/account. |
| `WORKSPACE_MEDIA_WORKER_SECRET` | At least 32 random characters; media UAT generates one in memory if absent. Same value is required by an external callback relay. |

For a separately started local worker: `DATABASE_ENV=development`, `WORKSPACE_MEDIA_LOCAL_WORKER_ENABLED=true`, optional `WORKSPACE_MEDIA_LOCAL_APP_URL=http://localhost:3000`, plus the same worker secret. Start with `node --env-file=<dedicated-nonproduction-env-file> scripts/workspace-media-local-worker.mjs`. This script refuses non-loopback application URLs. The media UAT launcher starts it automatically.

The bucket must have all four S3 public-access-block settings enabled, versioning enabled, default AES256 encryption, no public object policy and a CORS rule restricted to the exact local application origin. Allow PUT and the signed content type, conditional `If-None-Match`, checksum, encryption, expected-owner and `x-amz-meta-workspace-*` headers returned by authorization. Browser Content-Length is supplied by the browser. Do not make the bucket public to fix CORS.

The dedicated application identity needs bucket privacy/versioning inspection, prefix-scoped ListBucket, source/version reads, source conditional PutObject and worker staging CopyObject (GetObjectVersion + PutObject), processed-version reads, MediaConvert CreateJob/GetJob, and narrowly scoped iam:PassRole for the configured MediaConvert role. The MediaConvert role needs read access to `workspace/*/jobs/*/input.mp4` and output writes under the matching `workspace/*/processed/` prefixes. Creators receive only a conditional, checksum-bound source PUT capability valid for at most ten minutes, never staging/output permissions. No ACLs, bucket, CORS, IAM or queue were provisioned by this change.

Processing stages the verified source version into a worker-only job key because MediaConvert's HTTP input disallows query parameters ([AWS requirements](https://docs.aws.amazon.com/mediaconvert/latest/ug/http-input-requirements.html)). The output contract is one H.264/AAC 720p segmented HLS rendition with private manifests/segments. See [AWS output naming](https://docs.aws.amazon.com/mediaconvert/latest/ug/output-file-names-and-paths.html). Input staging and output objects must remain writable only by the dedicated worker/processor identities.

## Creator and Admin setup

Use the existing local UAT student demo accounts/OTP flow (the owner-designated allowlist is in `lib/local-uat-otp.ts`); do not add a production authentication bypass. Admin testing requires an existing authenticated local Admin session and persisted Admin role. The demo OTP provider deliberately refuses Admin accounts; it does not grant or bootstrap privileges. If that local Admin session/account is unavailable, prepare it through the separately authorized existing local authentication/session setup before founder testing. Automated verification used short-lived synthetic sessions in its disposable database, without changing application authentication. Create a distinct Creator user, complete eligibility and current Creator terms, then use an audited **complimentary Creator Workspace grant** from Admin access grants. Use development grant environment for the founder's development UAT; the synthetic automated harness uses test grants and test runtime classification. A grant is separate from paid membership and creates no Razorpay operation.

As Creator, create a proposal, submit it; as Admin, start its review and approve it. As Creator, open that approved course and start/continue its course build. Add a module and lessons. Admin inspection is under Workspace → course builds → the matching private project. Keep another Creator/ordinary user available for wrong-owner checks. Existing suspended profiles cannot be re-enabled by fulfillment or direct fixture updates; use separate synthetic identities for destructive revocation scenarios.

## Manual acceptance checklist

1. Sign in as Creator. Open an existing plain-text lesson and confirm its exact content and order remain intact. Add/edit/move modules and lessons; save explicitly and reload.
2. Type unsaved text. Try changing media or navigating to another lesson. Confirm media edits are blocked, navigation warns, and your text stays copyable. Deliberately change to Markdown, review its text preview, save and reload. Confirm plain text is never silently converted. External Markdown images/links do not load or navigate in the private preview.
3. Upload a small real MP4. Observe hashing and upload progress, verification, then **Start processing**. Reload while processing. Confirm it is not playable or attachable before the actual MediaConvert job completes. The local worker must be running.
4. After readiness, select the ready video. Open saved preview and the private course preview page. Test play/pause, seeking, native fullscreen, rates, narrow/mobile view and keyboard access. Check audio. Repeat with a silent MP4. Confirm no learner enrollment/progress/public course was created.
5. Upload a replacement. The previous video/captions must keep playing until processing succeeds and you explicitly select the replacement. Cancel/fail a replacement and confirm the previous selection survives. Switch the ready replacement and confirm old captions detach.
6. Upload PDF, PNG and JPEG resources. Attach them, rename, reorder, reload and detach. Confirm contiguous ordering, correct names and forced downloads; original files never open inline through media access. Verify mismatched extensions, invalid/truncated/encrypted PDFs and invalid images are rejected without exposing provider details. Observe documented limits.
7. Add a plain WebVTT caption with language code to the selected video. Finalize and attach; enable its subtitle track during playback. Reject markup/CSS/malformed timing. Replace the video and confirm captions do not silently follow a different source. Detach the old caption before adding the same language again.
8. Interrupt a PUT, reload, then use **Resume same file** or **Retry finalization**. If PUT reports 412 after an ambiguous response, finalize the existing conditional object. Duplicate finalization must not attach twice. Expired/failed intents require a new reservation; detached history remains retained.
9. Use two Creator tabs to replace/reorder the same media. Confirm stale revisions fail with a reload instruction and no lost text. A lesson with any media history refuses deletion; detach does not erase provenance.
10. As another user, attempt the copied metadata/download/HLS/caption paths. Confirm denial. Sign out and repeat. With separate test identities, revoke the grant, expire access, suspend the profile and demote Admin; confirm current policy is rechecked. Retained read access follows existing Builder policy; new writes are denied where appropriate.
11. As persisted Admin, inspect the build, preview video/captions and download resources. Confirm there are no upload, rename, attach, detach, process, save or publish controls. Ordinary metadata must omit storage keys, source versions and permanent URLs.
12. Test disabled storage, CORS failure, missing object, wrong checksum and failed transcode. Saved text and previous playable attachments must survive. A failed job uses a new upload intent; an ambiguous dispatch requires the exact authenticated provider-job callback or cancellation/new upload.
13. Confirm no private filenames, lesson text, source versions, signed PUT URLs or credentials enter telemetry/console logs. Save the observed browser/device results and explicitly approve Phase 1.9 only after the real media tests pass. Publication/pricing approval is separate.

## Genuine provider verification and callback recovery

The opt-in runner `tests/postgres/workspace-media-provider-verification.cjs` is supplied but **has not run against AWS**. It requires the disposable fixture created by the opt-in PostgreSQL harness in browser-fixture mode, `DATABASE_ENV=test`, the dedicated media variables, `WORKSPACE_MEDIA_NONPRODUCTION_VERIFY=true`, and exact `WORKSPACE_MEDIA_NONPRODUCTION_BUCKET_ACK` / `WORKSPACE_MEDIA_NONPRODUCTION_ACCOUNT_ACK` matching the authorized test target. It refuses a production runtime and checks the task cluster's data directory/database identity before writing synthetic course content. It generates a three-second synthetic MP4 using the already installed `/usr/bin/ffmpeg`, performs real conditional PUT/checksum/version verification, MediaConvert processing, private HLS/segment delivery, PDF download and source-bound caption delivery. It can incur small test AWS costs and retains remote objects for separately reviewed cleanup. Never enable it before authorizing/configuring that exact nonproduction target. Do not run it against the founder's normal database.

Separately prove actual browser PUT/CORS, signed URL expiry, real image downloads, native HLS/captions on supported browsers and callback transport. A trusted nonproduction EventBridge/Lambda relay may POST `{ "assetId": "<Workspace asset UUID>", "jobId": "<MediaConvert job ID>" }` to `/api/workspace/media/transcoded` with `Authorization: Bearer <WORKSPACE_MEDIA_WORKER_SECRET>`. The application queries MediaConvert itself; it never accepts callback-supplied readiness, keys or output evidence. Configure the relay to forward only the dedicated Workspace jobs (`UserMetadata.workspaceAsset` / `workspaceJob`) and never log secrets. Normal submitted jobs are also reconciled by polling. An uncertain dispatch is not automatically re-created after the provider's short idempotency window ([AWS deduplication behavior](https://docs.aws.amazon.com/mediaconvert/latest/apireference/idempotency.html)). No callback relay/infrastructure was deployed here.

## Limits and remaining gates

- Real AWS target/configuration, IAM/CORS, transcode, callback transport and actual HLS/caption playback verification remain open until supplied. Automated browser testing with disabled storage is not provider evidence. Founder acceptance is pending. A valid existing local Admin session is a setup prerequisite; demo OTP does not authenticate Admins.
- Single 720p H.264/AAC rendition; MP4 source ≤2 GiB, ten PDF/PNG/JPEG resources ≤20 MiB each, sixteen plain WebVTT captions ≤1 MiB, 200 retained asset records per lesson. Processing verifies at most 2,000 output files, 4 GiB aggregate and 32 MiB per segment. Larger/unsupported output fails closed.
- Private playback proxies pinned manifests/segments through authenticated application routes, buffering each bounded segment. No public CDN delivery, DRM, learner progress, publication, sales or earnings. Production capacity/CDN work belongs to release preparation.
- Resource structural checks are not malware certification; originals stay download-only. Captions support plain cues without HTML/CSS/regions. External Markdown links/images are intentionally inert in private preview.
- Processing failures require a new upload; dispatch ambiguity is retained for callback recovery/cancellation. Worker reports uncertain/detached jobs and expired intents as counts; no automatic S3 deletion or unapproved retention policy is introduced.
- Automated tests and build are implementation evidence. They do not constitute founder approval or authorize a public launch.
