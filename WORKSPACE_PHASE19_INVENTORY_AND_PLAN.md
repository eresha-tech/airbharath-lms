# Creator Workspace: Phase 1.9 inventory and implementation plan

Recorded 31 October 2026. Planning only. Working branch: `feat/creator-workspace`.

## Outcome and evidence boundary

Finish the existing private Course Builder; retain the proposal/review/project ownership chain and reuse LMS rendering and media patterns through Creator-scoped adapters. Do not build a second learner LMS or expose admin endpoints to Creators. Phase 1.9 should deliver multimedia authoring, private preview and read-only Admin inspection. Publication, approved sale pricing, course-sales attribution, earnings and payouts are subsequent dependent milestones.

This inventory uses repository source and local Git snapshots, without fetching, querying a database, calling private services or inspecting environment credentials. The owner reports Phase 1.8 deployed. Local `main`, cached `origin/main` and `feat/creator-workspace` all resolve to `03785c2`; that establishes the inspected code baseline, not independent proof of the deployed commit or applied database ledger. Source journal ends at `0031_workspace_phone_only_onboarding` ([journal](drizzle/meta/_journal.json)). Prior verification reports are historical evidence, not checks rerun here.

Six pre-existing modifications were reported and the owner authorized continued inspection while preserving them: `app/(admin)/admin/workspace-refunds/[id]/page.tsx`, `app/(admin)/admin/workspace/access-grants/[id]/page.tsx`, `app/(admin)/admin/workspace/reports/page.tsx`, `app/api/workspace/payments/razorpay/webhook/route.ts`, `lib/workspace/admin/details.ts`, `tests/setup.ts`. They are outside this inventory's implementation scope. Conclusions about those paths use committed code where relevant.

## Branch inventory

| Ref | Local tip | Relevant finding / action |
| --- | --- | --- |
| `feat/creator-workspace`, `main`, `origin/main` | `03785c2` | Current common baseline; continue work on the owner-selected feature branch. |
| `codex/workspace-1.8-launch`, cached origin counterpart | `ff9441a` | Already an ancestor of main via launch PR #7; do not re-merge launch work. |
| `codex/workspace-phase19-wip` | `a9ea151` | Exactly one commit beyond its main merge base `f47b695`; six files, 251 insertions, one deletion. Partial media implementation only. Port selected work into the current schema/access model; avoid wholesale old-schema replacement or broad merge. |
| `feat/workspace-registration`, cached origin counterpart | `4166b30` | Only unique commit is the historical preregistration inventory document. No additional unfinished Studio implementation. |
| `feat/video-hosting`, `feat/video-captions`, `feat/markdown-content`, `feat/markdown`, `phase-24-video-captions`, `feat/course-bundles` | `39b1ed9`, `ea73d86`, `d2dc211`, `eb12c0a`, `eb12c0a`, `2cca49e` | These local tips are ancestors of main. Inspect/reuse their current main implementations rather than merging old feature branches. |

Evidence: `git branch --no-merged main`, `git log main..<ref>`, `git diff main...codex/workspace-phase19-wip`, and the frozen inventory at `feat/workspace-registration:WORKSPACE_PREREG_RELEASE_INVENTORY.md`. Cached refs may lag the server; no remote/deployment freshness claim is made.

## Feature inventory

“Implemented” means present in inspected code; it does not assert fresh production verification.

| Feature | State | Evidence and remaining work |
| --- | --- | --- |
| Creator identity, profile, membership/complimentary access, retained read-only access | Implemented | [Capabilities](lib/workspace/creator/model.ts), [Creator persistence](lib/workspace/creator/repository.ts), [grants](lib/workspace/access/repository.ts), [page guard](lib/workspace/creator/pages.ts). Reuse current evidence and lock order in media. No new global Creator user role needed. |
| Private proposals, multiple courses, tentative INR price, outcomes/outline | Implemented | [Draft contracts](lib/workspace/creator/model.ts), [draft editor](components/workspace/creator/DraftEditor.tsx), [draft API](app/api/workspace/course-drafts/[id]/route.ts). Tentative price is a proposal, not an approved commercial price. |
| Proposal review, feedback, resubmission, immutable submitted context | Implemented | [Review service](lib/workspace/review/service.ts), [snapshot](lib/workspace/review/snapshot.ts), [review UI](components/workspace/review/History.tsx). Approval enables building, not publication. |
| Build from a specific approved submission | Implemented | [Builder service](lib/workspace/builder/service.ts), [repository](lib/workspace/builder/repository.ts), [0017 SQL](drizzle/0017_marvelous_captain_midlands.sql). Idempotent creation, approved source reference and ordered module bootstrap. |
| Module/lesson create, edit, adjacent reorder, delete, stale-save protection | Implemented | [Commands](lib/workspace/builder/model.ts), [Builder](components/workspace/builder/Builder.tsx). Empty modules only may be deleted; lessons reorder within their module. Explicit save and unsaved-text protection already exist. |
| Multimedia lessons | Partial | Main stores title/summary/plain text only, max 20,000 content characters; no media linkage. WIP adds a proposed asset model and service, but nothing usable end to end. |
| Video upload/replacement/status/retry | Missing on main; partial WIP | WIP implements MP4 intent/finalization/replacement ideas. No Creator routes, uploader, processing worker, HLS output or tests. |
| PDF/image resources, rename/order/detach | Missing on main; partial WIP | WIP proposes PDF/PNG/JPEG, 20 MiB each, ten resources per lesson. No UI or migration. These are proposed limits, not newly approved product policy. |
| Markdown/math authoring and formatted private preview | Missing in Creator; renderer available | [MarkdownContent](components/content/MarkdownContent.tsx) already serves LMS content; Creator renders escaped plain text. Add an explicit format contract, keep existing lessons plain, and apply private-content URL/image rules. |
| Captions | Missing in Creator; LMS implementation available | [Admin caption route](app/api/admin/videos/[id]/captions/route.ts), [learner caption route](app/api/videos/[id]/captions/route.ts), [overlay](components/video-player/CaptionOverlay.tsx). Needs Creator ownership, asset-version binding and private delivery. |
| Course cover/artwork, promo assets and editable publication metadata | Missing in Creator | Approved proposal metadata is read-only build context. LMS has thumbnail/marketing fields and an Admin thumbnail handler, but no owned Creator artwork workflow. Add publication metadata/artwork before storefront publication; it need not delay lesson multimedia authoring. |
| Private video/document/course preview | Missing | Admin can inspect saved text using the same Builder. Public [lesson preview](app/preview/[courseId]/lessons/[lessonId]/page.tsx) uses LMS identity/access; cannot substitute for private project preview. |
| Read-only Admin build inspection | Implemented for text | [Detail](app/(admin)/admin/workspace/course-builds/[id]/page.tsx), [GET API](app/api/admin/workspace/course-builds/[id]/route.ts). Add private media inspection without editing or publishing permissions. |
| Studio readiness/checklist | Missing | Current [dashboard summaries](lib/workspace/creator/dashboard.ts) count proposals/builds, not media or publication readiness. Add actionable computed findings, not an invented completion percentage. |
| Final-content review, revision snapshots, publishing, update/unpublish management | Missing | Project status is constrained to `building` in [schema](lib/db/schema.ts) and 0017. Existing review snapshots cover proposals only. |
| Standard/trusted publication authority, audited trust grant/revocation | Missing | Current capabilities concern Workspace access only. Membership and complimentary grants do not imply trusted publishing rights. |
| Sale-price proposal/approval and history | Partial input only | `tentativePricePaise` exists; no independent price approval/revision workflow or trusted-user restriction for commercial approval. |
| Public course promotion and Creator-to-LMS ownership/provenance | Missing | LMS courses/authors exist, but there is no publication binding from Workspace project/revision to LMS course/module/lesson/video IDs. |
| Creator sales, learners, earnings, holds, monthly payouts | Missing as Creator features | LMS orders/enrollments exist; Workspace billing/refunds concern memberships. Neither supplies a Creator course-sales earnings ledger or payout approval workflow. |
| Audio-specific lessons, live sessions, assessments, assignments, bulk import | Missing in Creator | LMS lesson fields include live scheduling; no equivalent Creator workflow. Keep these visibly on the later backlog. They are not prerequisites for the recommended text/video/resource Studio milestone and are not silently counted as delivered. |

## Reuse map and minimum architectural seam

| Existing files | Reuse | Required boundary |
| --- | --- | --- |
| `lib/workspace/builder/{model,service,repository,http}.ts`; `components/workspace/builder/Builder.tsx` | Existing structure, per-item versions, save/error/selection behavior, ownership and access locks | Extend selected-lesson payloads and small child panels. Avoid loading every lesson body or signed URL in the tree. Preserve independent saves and strict command fields. |
| `lib/workspace/creator/model.ts`; `lib/workspace/access/repository.ts`; `lib/workspace/activation/repository.ts` | Current access policy and evidence | All media operations use the same current paid/grant/refund/suspension rules, rechecked after awaits. Persisted Admin authorization remains separate. |
| `components/content/MarkdownContent.tsx` | Markdown/GFM/math rendering and visual conventions | Add a narrow private-content configuration/wrapper for link/image policy; arbitrary external images can disclose private page visits. Do not accept raw HTML or persist signed links. |
| `components/admin/VideoUploader.tsx` | Direct browser upload progress, processing/status/retry and captions UX patterns | Its calls are hardwired to `/api/admin/videos/...` and the global LMS library. Extract only useful presentation pieces if needed; use Creator endpoints, no global media browsing. |
| `lib/aws-video.ts` | S3 signing and CloudFront/HLS/session mechanics as reference | Module has LMS bucket defaults and Redis session coupling. Workspace storage must fail closed with explicit configuration. Share a small explicit-config helper only where this actually reduces duplication safely; do not import defaults into new Creator paths. |
| `components/video-player/HlsPlayer.tsx`; `CaptionOverlay.tsx` | Controls, adaptive streaming, caption display | Player obtains sessions and deletes them through `/api/videos/[id]/playback-session` and emits LMS analytics. Add a narrow optional playback transport/telemetry boundary retaining existing defaults, then supply private Creator routes and suppress content telemetry. A signed URL alone is not a drop-in current prop. |
| `app/api/videos/webhook/transcoded/route.ts`; `app/api/admin/videos/[id]/status/route.ts` | Processing status and callback conventions | Existing callback updates LMS `videos` by LMS course/video IDs. Creator jobs require separate asset/job provenance, version binding, authenticated idempotent transitions and retries; old-job callbacks cannot restore detached/replaced assets. |
| `app/api/admin/lesson-materials/route.ts` | Labels and existing 20 MiB UI precedent | It stores data URLs in LMS rows and includes SVG/other formats. Do not reuse this handler/storage mechanism for Creator private uploads. |
| `app/api/admin/upload-thumbnail/route.ts`; `lib/lesson-availability.ts` | Artwork requirements and learner release-state semantics | Add project-owned private artwork when publication metadata is implemented; reuse release helpers after publication mapping. Neither Admin thumbnail authorization nor learner release state grants Creator access. |
| `lib/course-access.ts`; learner course layout/lesson pages; `lib/courseProgress.ts` | Learner enrollment, bundles, release/access checks and progress after publication | Workspace authoring access is independent. No enrollment or progress writes during authoring/preview. Later promotion must preserve stable learner IDs. |
| `components/admin/CourseEditor.tsx`; LMS `courses/modules/lessons/videos/videoCaptions/lessonMaterials/courseAuthors` schema | Field mapping and existing learner delivery model | Do not expose the multipurpose Admin editor to Creators. Add a reviewed publication adapter later; public author presentation is not authorization or revenue ownership. |

Minimum model: keep Workspace projects/modules/lessons as private authoring authority; add owned assets (and processing/caption records as needed) with immutable storage identity and versioned attachment. Reuse existing LMS display code through explicit authorization/transport boundaries. Introduce the Workspace revision → LMS publication binding in the publication phase, not by creating unpublished LMS courses during media upload.

## Frozen WIP: salvage and reconcile

The exact source files are available through `git show a9ea151:<path>`: `lib/db/schema.ts` plus `lib/workspace/media/{model,service,repository,provider,runtime}.ts`.

Useful ideas: owner-scoped object keys; request-key/context hashing; expected bucket owner; private versioned object identity; short-lived PUT/GET authorization; byte/MIME/header checks; finalize outside provider-held database locks with a subsequent access recheck; replacement preserving the current video until successful finalization; metadata receipts that omit storage keys and credentials.

Required corrections/completion before use:

1. WIP repository does not load current complimentary grant evidence or refund completion, unlike today's builder repository. Service capability calls omit grants. Port current evidence and access serialization; do not copy old entitlement behavior.
2. `ready` currently means the MP4 header/size checks passed. It does not prove decoding, completed HLS conversion, clean resources or successful playback. Separate uploaded/verified/processing/playable/failed outcomes and bind the selected video to validated outputs. Do not label raw upload as playable readiness.
3. Resource positions use immediate uniqueness in the proposed schema, but adjacent reorder updates rows individually. Use reviewed deferred uniqueness or another collision-free transactional ordering strategy; prove it with real PostgreSQL later.
4. New restrictive asset→lesson FKs would make existing hard lesson deletion fail even after detachment. Specify a consistent explicit deletion rule: recommend refusing deletion with attached/pending media, and retiring detached metadata separately from lesson association so historical/orphan accounting is retained. Update UI/error behavior and migration constraints together; no destructive object delete from a save handler.
5. Bind reused request keys to the same lesson/project and complete command context. WIP lookup is user-wide and an identical replay can outlive its original lifecycle; refresh/recovery must not return expired or wrong-parent upload authorization. Bound abandoned intents and storage budgets as well as attached-resource counts.
6. No migration/snapshot/journal entry or DB lifecycle/identity guards exist for this asset model. Generate from the current schema head in a separately authorized implementation task; preserve all prior migration SQL and custom 0017 ordering/approval guards. Do not reuse obsolete migration numbers.
7. No HTTP/body/origin/privacy adapter, UI, tests, cleanup/reconciliation worker, captions, processing dispatch or provider proof exists. Header sniffing is one validation signal, not a full file-safety check. Specify resource quarantine/validation before inline viewing.

These are bounded Phase 1.9 implementation work, not evidence that the existing LMS needs redesign.

## Dependency-ordered Phase 1.9 work packages

Paths below are proposed additions unless marked existing. No application implementation or migration is authorized by this plan alone.

### 1.9A — Contracts and owned persistence

Files: new `lib/workspace/media/model.ts`, `service.ts`, `repository.ts`, `runtime.ts`; existing `lib/db/schema.ts`, `lib/workspace/builder/{model,service,repository}.ts`; new versioned `drizzle/<next>_workspace_course_media.sql`, matching snapshot and journal entry during implementation. Add focused `tests/routes/workspace-media-{model,service,repository}.test.ts`.

Define explicit content format with backward-compatible plain-text default; lesson media relationships; attachment/replacement versions; bounded video/resource limits; upload and processing states; unique request context; storage/job provenance; caption association; deletion and resource ordering rules. Reuse current owner/grant/refund/Admin checks. Keep object identity out of client write contracts and list responses. Use lesson media revision or an equivalent monotonic revision for coherent previews and later content snapshots.

Acceptance: existing text-only courses load unchanged; wrong owner/parent denied; grants and paid access behave like the builder; refunded/expired/suspended access follows current policy; independent lessons save without overwriting; one selected video, contiguous resource ordering and race-safe replacement; stale detach/reorder/delete fails cleanly. Schema guards and model agree. No LMS catalog/enrollment/payment writes.

Depends on: current branch baseline only. Monetary percentage/earnings-hold policy is not needed.

### 1.9B — Upload lifecycle and private resources

Files: new `lib/workspace/media/provider.ts`, `http.ts`; `app/api/workspace/media/route.ts` (scoped listing/intent), `app/api/workspace/media/[id]/route.ts` (metadata mutation), `app/api/workspace/media/[id]/finalize/route.ts`, `app/api/workspace/media/[id]/access/route.ts`; separate Admin GET-only media inspection route under `app/api/admin/workspace/course-builds/[id]/media/route.ts`. Add provider/HTTP tests.

Implement direct private storage uploads, server object verification, idempotent finalize, safe download names, version-specific reads, bounded timeouts and short authorization lifetimes. Define explicit storage target/configuration; preserve disabled-storage metadata/read-text behavior. Allow safe resource viewing only after validation; force attachment for formats requiring it. Prevent arbitrary object-key/URL selection.

Acceptance: mismatched bytes/type/owner/key/version rejected; expired intents recover predictably; replay/failure does not attach twice; failed replacement retains the old ready video; unauthorized users obtain no URL; expired bearer URLs fail and known maximum lifetime is documented; no private URLs/names enter telemetry or logs. Provider calls do not hold DB locks. Provider verification requires separately approved nonproduction resources; fakes alone do not close that gate.

Depends on: 1.9A.

### 1.9C — Processing, captions and recovery

Files: new `lib/workspace/media/processing.ts`, `worker.ts`, `captions.ts`; job/outbox additions in `lib/db/schema.ts` and reviewed migration as required; authenticated Creator-specific callback under `app/api/workspace/media/transcoded/route.ts`, status/caption endpoints under `app/api/workspace/media/[id]/`; secured internal worker route following `app/api/internal/workspace/` conventions. Reuse bounded VTT parsing rules from existing caption routes. Add processing/caption/recovery tests.

Use existing AWS HLS output conventions where compatible with explicit Workspace asset prefixes and configuration. Persist dispatch/retry intent before external processing; correlate job ID, input object version and output prefix. Separate upload completion from processing readiness. Support readable failures, bounded retry/reconciliation and abandoned-intent/orphan reporting; deletion/lifecycle actions need an approved retention policy and explicit operational authorization.

No tracked Lambda/MediaConvert processing implementation was identified by filename inspection. The existing application callback is not the job dispatcher. Confirm the external pipeline's metadata/prefix contract through its reviewed source/configuration in the authorized media-integration step; until then, treat compatibility as unverified rather than assuming an S3 prefix automatically starts a valid Workspace job.

Acceptance: reload reflects durable status; duplicate/out-of-order/wrong-job callbacks cannot revive stale media; processing failure is recoverable; expired access prevents new creator mutations; captions are validated, attached to the correct video revision and available privately; no orphan intent causes unlimited reservations. Authorized nonproduction transcode→callback→private HLS and caption playback proven before operational completion.

Depends on: 1.9A/B. If a small internal upload-only checkpoint precedes this, label it incomplete for full multimedia Studio.

### 1.9D — Integrated Studio editing and inspection

Files: existing `components/workspace/builder/Builder.tsx`; new child panels `LessonMedia.tsx`, `MediaUploader.tsx`, `LessonContentEditor.tsx`; existing build page `app/(workspace)/workspace/(creator)/courses/[id]/build/page.tsx` and Admin build detail; existing `lib/workspace/builder/{service,repository,http}.ts` for selected-lesson media metadata as needed. Add rendered-page and state/route tests.

Retain structure navigation and explicit-save behavior. Add text/Markdown selection, video upload/progress/processing/retry/replacement, resources attach/rename/reorder/detach, caption management and clear saved/unsaved states. Keep unsigned metadata fetching separate from ephemeral preview authorization. Admin sees private media through read-only controls.

Acceptance: desktop/mobile/keyboard flows work; navigation warns about unsaved text and active upload; upload failure leaves text intact; stale version/revocation leaves copyable work and controlled errors; resource delete and lesson delete follow the same lifecycle contract; no global media library or Admin mutation call is exposed. Format changes require deliberate preview, not silent conversion.

Depends on: 1.9A/B/C (panels may be developed against fakes while backend finishes).

### 1.9E — Private learner-style preview and readiness

Files: new `components/workspace/builder/Preview.tsx`, `readiness.ts` under `lib/workspace/builder/`, Creator preview page `app/(workspace)/workspace/(creator)/courses/[id]/preview/page.tsx`, Creator playback route under `app/api/workspace/media/[id]/playback-session/route.ts`; narrow optional transport/privacy extension in existing `components/video-player/HlsPlayer.tsx`; private wrapper around `components/content/MarkdownContent.tsx`; existing dashboard/list summary files only where needed. Extend `lib/workspace/analytics-privacy.ts` for new dynamic paths. Add preview/privacy tests.

Use the same renderer as eventual learner delivery with a Workspace authorization transport. Preview saved content and explicitly label unsaved text preview if supplied locally. Show missing lesson content, failed/pending media, empty modules and other concrete readiness findings. Report authoring readiness separately from content approval and approved pricing; no publish button or public visibility yet.

Acceptance: video seek/fullscreen/rates and captions work on supported desktop/mobile browsers; PDF/image downloads/viewing use short private authorization; cross-user/Admin-demotion tests pass; draft data never enters public preview/catalog APIs, enrollment/progress or telemetry; new routes are no-store/noindex/no-capture. Existing LMS player behavior and authorization continue to pass regression tests.

Depends on: 1.9C/D.

### 1.9V — Completion evidence

Files: new `tests/postgres/workspace-media-verification.cjs`, `workspace-media-browser.cjs` following existing local harness conventions; focused tests under `tests/routes/`; a new phase implementation/verification report.

Run declared `pnpm@11.15.1` with Node 22; no installs/lockfile changes. Run `pnpm validate`, appropriate build and existing Creator/builder/review/LMS playback regressions in a credential-scrubbed local setup. In a separately authorized isolated PostgreSQL target, rehearse empty install and upgrade from current source migration head, real two-connection replacement/order/access-revocation races, constraints, rollback and preservation. Exercise hydrated Creator/Admin desktop/mobile preview and failed-upload recovery. Perform real AWS checks only against specifically approved nonproduction resources. Record completed versus pending gates separately.

Acceptance: 1.9A–E criteria evidenced; prior drafts/approvals/modules/lesson text and membership history preserved; no production operation; every changed file and actual validation result reported. Stop before publication implementation.

Depends on: 1.9A–E. Safe local implementation checks can run incrementally; database/provider authorization is a verification gate, not permission inferred from this plan.

## Subsequent dependencies for the full Creator platform

These are ordered work packages, not claims of an already approved numeric phase schedule.

| Order | Scope and proposed files | Acceptance boundary |
| --- | --- | --- |
| After Studio: content revisions and final review | New `lib/workspace/publication/{model,service,repository,http}.ts`; `components/workspace/publication/`; Creator submit/review-status routes; Admin final-content review pages/APIs; versioned schema/migration. Reuse review event/idempotency patterns without mixing proposal and final-content review records. Add editable publication metadata and project-owned artwork via the media service. | Immutable snapshot covers metadata/artwork, ordered content, format, resource/video object versions and captions. Editing after submission creates a new revision or invalidates readiness; approval cannot publish changed content. Standard Creator requires final content approval. |
| Parallel preparation: price approvals and trust | New `lib/workspace/pricing/` and `lib/workspace/trust/`, scoped Creator pricing UI/API, Admin price/trust pages/APIs and audit records. Extend capabilities narrowly. | Creator proposes; persisted Admin approves price/version. Explicit standard/trusted status, automated safeguard results and Admin revocation. Trusted status bypasses content review only; never price approval or finance controls. Recheck trust and price at publication commit. Proposal approval is not retroactively commercial approval. |
| Publication and management | New `lib/workspace/publication/promote.ts`; versioned Workspace revision ↔ LMS course/module/lesson/asset mappings in schema; scoped publish/update/unpublish APIs/UI; smallest necessary learner delivery adapter changes. | Publish only the authorized revision with approved pricing and readiness; idempotent retries; stable learner IDs/progress; creator identity/provenance; prior live course remains consistent on failure. Handle subsequent content edits without mutating a reviewed/live revision in place. No ad hoc dual writes during upload. |
| Course sales and Creator learner reporting | New `lib/workspace/sales/` and `/workspace/sales` pages/APIs; inspect and minimally extend existing `app/api/payments/razorpay/order/route.ts`, `app/api/payments/razorpay/verify/route.ts`, `app/api/invoices/download/[orderId]/route.ts` and LMS coupon/enrollment paths. | Server-approved price snapshot and durable order→course publication→Creator attribution. Verified collected payments, discounts, taxes and refunds reconcile idempotently; enrollment remains LMS authority. Creator sees only authorized course/customer fields. Do not reuse Workspace membership orders or influencer-membership reporting as course-sales revenue. |
| Earnings | New `lib/workspace/earnings/{model,service,repository}.ts`, Creator earnings read pages/APIs, versioned share-policy/hold/ledger tables and Admin review views. | One standard rate with versioned effective policy; eligible collected course revenue after discounts/refunds excluding applicable indirect taxes. Integer monetary arithmetic, immutable attribution/policy snapshots, refund adjustments, pending/held/available balances and reconciliation. Exact rate and finalized hold/refund policy required before live accrual/release. No invented rate, fee deduction or membership revenue in basis. |
| Monthly payouts | New `lib/workspace/payouts/`, Admin monthly batch/detail/approval APIs/UI, Creator payout history and necessary audit/schema. | Monthly cutoff, Admin review/approval, idempotent payment evidence, failed/uncertain recovery, no double payment, refund adjustments after payout tracked. Trusted status confers no finance rights. Operational payout method and required payee information decided before execution. |

The sales paths above are existing future touchpoints, not changes made in this task. Audio/live/assessment/import features remain explicit follow-on Studio capabilities; decide their priority after completing the common private media lifecycle rather than inventing parallel storage/playback systems.

## Genuine blockers and decisions

No architectural blocker prevents starting Phase 1.9 implementation on the current branch.

1. **Private asset identity versus LMS delivery identity:** existing LMS upload/playback expects LMS courses/lessons, while private builds intentionally have neither. Resolve with the owned asset model and narrow preview transport now, then an explicit revision/publication mapping later. This is necessary integration work; creating fake LMS courses or weakening Admin/enrollment checks is not a solution.
2. **Approved content versus mutable authoring:** publication needs a revision/snapshot boundary; a single `isPublished` flag on the mutable project would not implement standard/trusted review safeguards. Build the media-version identities now; final snapshots belong to the publication phase.

Other gates are not architecture blockers: explicit nonproduction media configuration and provider verification gate operational media acceptance; rate/hold-policy decisions gate earnings; exact deployed commit/ledger verification gates release planning. They do not block private Studio implementation. MP4/resource limits, Markdown behavior and caption support are proposed 1.9 scope/defaults above, not financial-policy questions. Historical completed audits and commercial launch reports are not reopened.

## This task's validation and change boundary

Source/branch inspection only. No application tests, build, database checks or provider operations were run; no implementation is claimed. Documentation whitespace/link-path checks are recorded at handoff. Only new deliverable: this file. Preserve the six initial modified files. No migrations generated/applied, dependencies installed, commits, merges, deployments or production changes. Stop at inventory and plan.
