# Phase 1.9 — founder testing

The founder confirmed the main workflows work locally. Final native-compression verification remains open; see **WORKSPACE_PHASE19_FINAL_CLOSEOUT.md**. No public release or Phase 2.0 work.

## Start

From this repository:

```bash
pnpm dev --media
```

This starts the guarded local app and media worker at http://localhost:3000. It verifies the established local PostgreSQL identity and disables financial, SMS, email, Redis and analytics providers. Migrations through 0033 and a synthetic complimentary Creator setup have already been prepared locally. It never migrates automatically at startup. If a server is already running from this session, use that server; do not start a second copy. Stop it with Ctrl+C in its terminal.

Open the prepared test accounts in two separate browser windows:

```bash
WORKSPACE_MEDIA_LOCAL_BROWSER=true node scripts/workspace-media-open-browser.cjs
```

This uses the installed Chrome/browser runtime. One window is **SYNTHETIC PHASE19 FOUNDER CREATOR** and the other is **SYNTHETIC PHASE19 FOUNDER ADMIN**. No phone OTP is needed for these CLI-opened local synthetic sessions. Sessions last two hours; rerun the command if they expire. The CLI verifies the local database identity and persisted synthetic account roles before signing a session. No web login bypass was added, no existing user was promoted, and tokens/secrets are not printed. Normal production authentication is unchanged.

- Creator Studio: http://localhost:3000/workspace/courses/6d763b35-a41b-422f-a5a0-d80313c23681/build
- Creator saved preview: http://localhost:3000/workspace/courses/6d763b35-a41b-422f-a5a0-d80313c23681/preview
- Admin inspection: http://localhost:3000/admin/workspace/course-builds/2a4a5951-2eb5-4dff-aae2-0cf97f52fc8c
- Synthetic grant expires: 2026-11-16T07:20:29.947Z.

These exact links require the matching local account window. Do not paste them into a signed-out or unrelated account and expect access.

## Media prerequisites

On 2 November 2026, all dedicated nonproduction AWS prerequisite checks passed after you applied the settings. The genuine browser test then passed all ten checks: real PUT/CORS and finalization, MediaConvert completion, explicit video selection, PDF/PNG/JPEG and caption uploads, SHA-256/version checks, conditional replay rejection, expired authorization rejection, decoded private HLS with active caption cues, matching downloaded bytes and other-user denial. No agent IAM/bucket changes or public access were used.

For an already populated working example, select **Real media integration 2026-11-02T08:19:16.920Z** in the Creator Studio. Press **Preview saved lesson** and enable English subtitles. This lesson contains the verified video, caption and three downloadable resources. Earlier integration attempts are retained as synthetic troubleshooting history; use this exact successful lesson. Perform your own creation/replacement tests in lessons 01/02 below.

The refined Studio production build, TypeScript and lint passed. Final closeout validation on 3 November: 55 Node tests and all 1,635 Vitest tests passed, with TypeScript and lint green. The membership test now uses its existing fixed fixture clock; production membership logic is unchanged. Eleven local refinement browser checks and ten genuine original-MP4 AWS browser checks passed. Native prepared-output verification remains open on an AAC-capable browser; Safari/native-HLS, callback relay transport and the manual replacement/revocation checklist still require appropriate testing. See WORKSPACE_PHASE19_STUDIO_REFINEMENT.md for current results.

## Refined Studio acceptance checklist

Generate/reuse synthetic samples with `node scripts/workspace-media-samples.cjs --compression`. Files are in **output/workspace-phase19-samples/**; the extra seven-second large-adaptive.mp4 is about 33 MiB. This uses the already installed ffmpeg and does not contact a provider.

1. Open the Creator Studio in its prepared account window. Confirm lavender panels, module/lesson hierarchy, selection, keyboard focus and a usable narrow/mobile layout. Add a private module/lesson if desired; existing approved course basics stay read-only.
2. Select **01 · Upload video and resources**, edit text and try the sidebar, another lesson and browser Back. Expect Stay / Discard changes and leave. Escape stays. Cancel changes restores saved text; Save persists it. Refresh/tab close may show the browser's supported unload warning, which browsers can suppress.
3. In lesson 02, choose Markdown, review current text and Save. Saved previews should reflect saved content. Unsaved text blocks media mutations.
4. Upload **01-flight-demo.mp4**. Expect validation then measured transfer, separate verification, and a verified source that is not yet playable. Small files should use their original bytes.
5. Upload **large-adaptive.mp4** in a separate lesson. A supported AAC-capable browser should prepare a smaller MP4 and show original/upload sizes and savings. Cancel during preparation and confirm no upload starts. On this Linux Chrome, expect the explicit original-MP4 fallback because compatible AAC encoding is unavailable. **Successful native compression and its real pipeline remain unverified until tested on a capable browser.** Export H.264/AAC MP4 for unsupported inputs; MOV/WebM or renamed files must be rejected.
6. If a prepared file is produced, use **Save prepared file for recovery**. Check picture, audio, duration, aspect and orientation. After reload, pending uploads need those exact prepared bytes; do not substitute or recompress the original.
7. During transfer, try the sidebar or lesson switch. Stay keeps the workflow. Cancel operation and leave stops local work, retaining the previous video and server intent. Interrupt the network, restore it, then retry finalization or **Resume same file**. The whole PUT restarts; no byte-range resume is promised. Check measured bytes/speed; no processing percentage should appear.
8. Reload after upload verification but before processing. The source should still offer **Start processing**. Start it, choose **Continue in background**, leave and return. Server processing must continue. Select the new ready video explicitly; only then should private playback become available. Check play, seek, speed, fullscreen and course preview.
9. Add **notes.pdf**, **diagram.png**, **photo.jpg** and attach each. Rename, reorder, download and detach them. Downloads must match and remain attachments; invalid.pdf must fail verification.
10. Upload **english.vtt**, language en, attach it to the selected video and enable captions. Expect visible cues. Replace video with **02-replacement.mp4**: the previous playable video must remain selected through preparation/upload/processing and failure. Explicitly selecting the ready blue replacement must detach old captions.
11. Test duplicate finalization, stale edits from another tab, expired intents and revoked/suspended access using only the synthetic environment. Expect controlled recovery/conflict/access errors and retained text/previous playable media. Do not modify real users or financial records.
12. In the Admin window, inspect the same lesson, play private media/captions and download resources. There must be no Save, upload, process, attach, detach, rename or reorder controls. Record pass/fail and explicitly approve only after your own successful tests.

The source, test results, exact changed files and remaining compression/device gates are documented in **WORKSPACE_PHASE19_STUDIO_REFINEMENT.md**. Provider success on original MP4 does not prove successful local compression. Publication remains a later coordinated release.

If storage fails, read the controlled error; saved text and previous selected video must remain intact. An interrupted PUT can be recovered with **Resume same file** or **Retry finalization**. Do not make the bucket public to fix access/CORS.

For the full security/recovery checklist and environment variable names, see WORKSPACE_PHASE19_LOCAL_ACCEPTANCE.md. All AWS credentials remain in your local environment files and are not copied into these instructions.
