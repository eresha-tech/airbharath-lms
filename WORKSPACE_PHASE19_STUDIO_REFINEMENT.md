# Phase 1.9 Studio UI refinement — implementation report

Phase 1.9 remains **unaccepted**. Founder testing and explicit approval are required; no Phase 2.0 or public launch has started.

## Implemented behavior

The Studio reuses the Admin editor's Button, Input, Textarea and Badge primitives, rounded panel hierarchy, curriculum sidebar, responsive forms and explicit save feedback. The lavender Workspace theme is retained. Modules and lessons have distinct hierarchy and selection states; the editor focuses its heading after selection. Save/Cancel actions, text/Markdown preview, readiness, course preview, empty state and loading feedback remain private. Admin inspection retains read-only controls.

`components/media/UploadStatus.tsx` is shared by the Admin uploader's transfer display and Creator media workflows. It separates validation, optional preparation, transfer, verification, server processing, verified source, ready output, failure and cancellation. Only measured local preparation/transfer work receives a percentage. Transfer reports actual bytes and elapsed-time average speed. Server processing has no invented percentage. Admin mutation endpoints and its original upload/processing behavior are unchanged.

Native adaptive preparation inspects actual MP4 header bytes before accepting input. It tries explicitly supported H.264/AAC MP4 recording profiles; it never silently substitutes MP4/Opus, MOV or WebM. It avoids compression for small/efficient videos and bounds input size, duration, pixels, output memory, wall time and mobile use. Native asynchronous MediaRecorder handles encoding; canvas drawing is bounded to 24 fps and at most 921,600 pixels, without a WASM/download dependency. Audio routes to a recording destination, not the speakers. Output must decode, preserve aspect/duration and save at least 20%; otherwise the original MP4 is retained. Cancellation never falls through into an upload. Object URLs, tracks, animation callbacks and audio contexts are released.

The upload intent size and SHA-256 are computed from the final selected file, after preparation. Exactly that File and its authorized headers are passed to XHR. The original stays available in the current workflow. A prepared file can be downloaded for recovery; after reload a pending prepared upload requires that exact prepared file, rather than a nondeterministic recompression of its original. Completed objects can be finalized without a new transfer; conditional replay and processing remain governed by the existing server contract. A single PUT restarts from the beginning; this is not byte-range/multipart resume.

Navigation protection covers same-tab links (including the Workspace sidebar), lesson/module switching, supported Navigation API transitions and beforeunload. The dialog offers Stay or explicitly cancel/discard and leave; Escape stays. Processing can continue in the background because it belongs to the server. Selection IDs are restored from session storage and content is reloaded from authoritative APIs; private lesson text is not stored in browser storage. Browser unload prompts remain subject to platform restrictions. Media polling no longer cancels a live upload merely because its callback or media revision changes. An abandoned lesson cannot clear the busy state of a subsequent lesson through a late refresh callback.

No financial, entitlement, ownership, CSRF, pricing, publishing or learner access rules changed. No migration, dependency installation, lockfile change, production operation, IAM mutation, deployment, push or merge was performed.

## Validation and actual integration

- 14 focused preparation/transfer/status tests passed: small-file bypass, valid reduction, unsupported encoder, failure/inefficient/invalid-output fallback, cancellation, resource limits, duration/aspect checks, final-byte/header identity, interrupted/cancelled PUT and conditional replay.
- Three Admin upload / LMS HLS-caption presentation regressions passed. Existing Builder/media/service/repository/security tests ran in the full suite.
- Local browser refinement verification passed eleven checks, including unsupported-source rejection, actual installed-browser encoder fallback with final-byte checksum identity, unsaved/sidebar/lesson/Back protection, keyboard Stay/Cancel, reload before processing, processing after leaving, persisted job failure, cancelled transfer restart, mobile overflow/focus, cancel-new-lesson without creating a record, and revoked-access errors. These media-route interceptions prove UI behavior, not provider authorization.
- `pnpm validate`: 55 Node tests passed; 1,634 Vitest tests passed and one existing membership test failed. Its fixture expires on 1 November 2026 but one case uses the live clock and expects stale_plan instead of eligibility_required. The unrelated test/business logic remains unchanged. Full validation is therefore not green.
- TypeScript and lint passed. The production build passed in the credential-free source copy with synthetic unreachable database settings, including all 70 static pages.
- The refined Studio passed all ten checks in the genuine authorized nonproduction S3 → MediaConvert → private HLS/captions/download browser suite. This used original MP4 bytes and does not satisfy the prepared-output gate below. Evidence: output/audits/workspace-phase19-local/ui-real-browser.log and real-browser.json. The final local refinement suite is recorded in refinement-browser.json.
- Preservation hashes for the six unrelated files and historical migration/snapshot files passed. Existing 0032/0033 are unchanged. `git diff --check` and new script syntax checks passed.

### Genuine compression verification gate

The installed Linux Chrome reports all supported H.264/AAC MP4 MediaRecorder profiles unavailable. Its MP4/Opus option is intentionally rejected: [MediaConvert's MP4 input table](https://docs.aws.amazon.com/mediaconvert/latest/ug/reference-codecs-containers-input.html) does not include Opus audio. The actual browser test verified fallback to unchanged original bytes. Successful local encoding is covered with injected-engine unit tests, but **native prepared-output audio/quality and its complete S3 → MediaConvert → HLS contract have not been genuinely verified on an AAC-capable browser**. This remains a real acceptance gate, not a claimed pass.

On a capable browser, use large-adaptive.mp4; expect a separate preparation stage and a smaller prepared MP4. Save that file, verify its picture/audio/duration/orientation, then run the real private pipeline and compare playback. The opt-in refinement runner verifies native encoding and ffprobe audio/video/duration when the runtime supports it. Safari/native-HLS and other device behavior still require founder/device testing.

Native API references: [MediaRecorder capability checks](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static), [MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder). Capability checks alone do not guarantee adequate resources or successful output; runtime validation and fallback remain mandatory.

## Files changed in this refinement

- `components/admin/VideoUploader.tsx`
- `components/media/UploadStatus.tsx`
- `components/workspace/builder/Builder.tsx`
- `components/workspace/builder/LessonMedia.tsx`
- `components/workspace/builder/NavigationProtection.tsx`
- `lib/workspace/media/prepare-video.ts`
- `lib/workspace/media/video-preparation-browser.ts`
- `lib/workspace/media/upload-transfer.ts`
- `scripts/workspace-media-samples.cjs`
- `tests/routes/workspace-media-preparation.test.ts`
- `tests/routes/workspace-media-presentation.test.ts`
- `tests/postgres/workspace-media-refinement-browser.cjs`
- `tests/postgres/workspace-media-founder-browser.cjs`
- `WORKSPACE_PHASE19_FOUNDER_START.md`
- `WORKSPACE_PHASE19_LOCAL_ACCEPTANCE.md`
- `WORKSPACE_PHASE19_STUDIO_REFINEMENT.md`

Ignored test evidence/sample files remain under output/audits/workspace-phase19-local and output/workspace-phase19-samples. Earlier synthetic test attempts/objects are retained for separately reviewed cleanup.

## Required complete-launch roadmap (not implemented here)

Publishing/LMS discovery milestones must include shared LMS/Creator course reviews: 1–5 stars and written reviews, enrollment/engagement eligibility, one review per learner/course, own-review edits/deletes, published aggregates, verified learner labels and moderation. Discovery/ranking must include relevance/interests, Bayesian ratings, popularity, engagement/completion, quality, freshness, fair new-course exposure, configurable weights and abuse protection.

The previously approved revenue share (rate TBD), price proposal/Admin approval, trusted publishing safeguards, Admin-reviewed monthly payouts and finalized refund/earnings hold policy remain required. Creator Workspace launches once as a coordinated release after all major phases; these features were not added to this refinement.
