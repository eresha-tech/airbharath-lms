# Phase 2.0 — founder local acceptance

**Internal milestone only. Phase 2.0 is not accepted until the founder tests it and explicitly approves.** Phase 1.9 core Studio acceptance stands. No public launch, deployment or Phase 2.1 is part of this work.

## Start your existing founder environment

Use the repository root and the existing dedicated **nonproduction** Workspace AWS configuration. Do not substitute an LMS bucket, generic AWS credential, staging URL or production URL.

1. If the existing local PostgreSQL is stopped, run `pnpm db:start`.
2. Confirm local configuration: `DATABASE_ENV=development`, the existing `airbharath_lms` database on loopback port **5433**, and its existing local-only credentials. If configured, `DATABASE_LOCAL_SOCKET_PATH=/tmp` must stay paired with this exact target. The migration helper also checks its database OID, PostgreSQL system ID and repository data directory; another target is refused.
3. Apply the guarded **local-only** upgrade to 0035:

   ```bash
   ALLOW_DATABASE_MIGRATION=true node scripts/workspace-media-local-migrate.cjs
   ```

   This command was prepared for your existing founder environment. During development, actual upgrade/concurrency verification used a separate disposable `/tmp` cluster; your existing founder database was not migrated by this task.
4. Reuse your existing synthetic Creator/Admin setup. If it needs preparing, the existing guarded setup is:

   ```bash
   ALLOW_DESTRUCTIVE_DB_OPERATION=true node scripts/workspace-media-local-setup.cjs
   ```

   This creates/reuses synthetic identities, eligibility, accepted terms and a complimentary Creator grant. It does not purchase a membership or create a paid order.
5. Start the app and private media worker:

   ```bash
   WORKSPACE_PUBLICATION_ENABLED=true pnpm dev --media
   ```

   Publishing is disabled unless this flag is explicitly true. Keep it disabled in production until the coordinated release is authorized. The local wrapper disables payment, mail, SMS, analytics and Redis integrations.
6. In another terminal, open separately authenticated local test windows:

   ```bash
   WORKSPACE_MEDIA_LOCAL_BROWSER=true node scripts/workspace-media-open-browser.cjs
   ```

   Sessions last two hours. Run with `creator` or `admin` at the end to reopen just that role after being logged out. No session token or provider credential needs to be pasted or shared.

## Required nonproduction media configuration

Keep the already configured values under these exact names:

- `WORKSPACE_MEDIA_STORAGE_ENABLED=true`
- `WORKSPACE_MEDIA_PROCESSING_ENABLED=true`
- `WORKSPACE_MEDIA_AWS_REGION`
- `WORKSPACE_MEDIA_AWS_ACCOUNT_ID`
- `WORKSPACE_MEDIA_S3_BUCKET`
- `WORKSPACE_MEDIA_AWS_ACCESS_KEY_ID`
- `WORKSPACE_MEDIA_AWS_SECRET_ACCESS_KEY`
- `WORKSPACE_MEDIA_AWS_SESSION_TOKEN` only when temporary credentials require it
- `WORKSPACE_MEDIA_MEDIACONVERT_ROLE`
- `WORKSPACE_MEDIA_MEDIACONVERT_QUEUE`
- `WORKSPACE_PUBLICATION_ENABLED=true` for local acceptance

The existing media wrapper supplies the local worker secret when needed. Existing S3 privacy, AES256 encryption, versioning, conditional/checksum uploads and localhost:3000 CORS settings remain required. No new AWS infrastructure or IAM changes are needed for Phase 2.0. Do not rename or copy generic LMS credentials. Refer to `docs/workspace-phase19-aws/README.md` for the previously reviewed test setup.

## Where to go

- Creator: **My Courses → your approved proposal → Continue Building Course → Review & publish**.
- Direct Creator page: `/workspace/courses/<DRAFT_ID>/publishing`.
- Studio: `/workspace/courses/<DRAFT_ID>/build`.
- Admin: `/admin/workspace/course-builds` → **Final review & publishing queue** → select the course.
- Direct Admin review: `/admin/workspace/publishing/<PROJECT_ID>`.
- Published course: use **View published course** on the publishing page.
- Existing enrolled learner: `/dashboard/courses/<LMS_COURSE_ID>`; use the lesson links already provided by the LMS.

Draft, project and LMS course identities differ. Use the links above; do not replace one identifier with another.

## Standard Creator acceptance checklist

Use the lavender Creator window and a separate Admin window. Saved data is private until you explicitly publish an approved course. Use **Refresh decisions** after another role changes an approval.

1. Open [My Courses](http://localhost:3000/workspace/courses), then **Propose a course idea**. Complete the idea form and submit it for approval. Admin approves the **course idea** first. Return to the Creator and **Create course**. This starts Course details; it does not create an LMS learner course yet.
2. Follow the five visible steps: **Course details → Build lessons → Preview → Price approval → Publish**. Enter learner-facing details. **Upload course cover** directly here, before creating any lesson. Choose PNG/JPEG up to 20 MiB (recommended 1200 × 675). Check preview and **Save course details**. Try Replace/Remove, then navigate away: **Stay here** keeps unsaved edits; **Discard changes and leave** preserves the previously saved cover.
3. Choose **Build lessons**. The empty course explains that a lesson is needed for videos, notes and resources. **Add Lesson** starts with a module name when none exists, then opens the first lesson form. Name and save it. Existing text lessons remain plain text; Markdown is explicit. Reorder modules and lessons and check the saved order.
4. In that saved lesson, choose Video and select an MP4. Check preparation, measured upload percentage/bytes, verification, then prominent animated processing. Processing has no invented percentage. Navigate away using **Continue in background**, then return; processing continues on the server.
5. Once ready, click **Use this video**. A ready upload alone is not selected. Upload a replacement and check the old video stays selected until **Replace lesson video**. A failed job must keep the old video and offer a safe new upload after dismissal.
6. Attach a PDF/image resource and source-bound WebVTT caption, rename/reorder resources, and check private downloads. For an interrupted cover upload, use **Retry verification** if transfer finished; otherwise **Dismiss upload** and choose the file again.
7. Open **Preview**. Use the actual AirBharath player: play/pause, seek, speed, volume/mute, fullscreen and captions. Check Markdown, text, lesson navigation and resource downloads. No public learner enrollment is needed for authoring preview.
8. Open **Price approval**, propose an INR price (for example `1499.00`). This never approves its own price. Admin opens **Workspace → Course publishing**, selects the course and **Approve price**. Content approval and price approval are independent.
9. Open **Publish** and **Submit course for approval**. Creator sees **Awaiting approval**; publishing stays disabled. Admin inspects the submitted cover, lessons, actual player, captions/resources, enters feedback and **Request changes**. Creator refreshes, reads feedback, saves changes and resubmits. Prior submitted versions remain immutable in history.
10. Admin chooses the latest submitted version and **Approve content**. Creator refreshes and **Publish course**. It now appears in the existing LMS with approved details, artwork, curriculum and price. A proposed replacement price must not change the published price until independently approved and explicitly applied by publication.
11. Use an enrolled synthetic learner. Play video/captions, read text/Markdown, download resources, and **Mark Lesson Complete**. An unrelated account must be denied private media. Publish a content update and confirm the same course/surviving lesson IDs and saved completion remain.
12. **Unpublish course** stops public visibility and new purchases, retaining enrolled access/progress. Admin **Emergency suspend** blocks actual learner media; **Restore to unpublished** restores retained access without putting the course on sale.
13. Repeat dashboard, My Courses, details, Studio and publishing on a phone/tablet-sized window. Check readable cards/forms, usable curriculum/actions, no page-wide horizontal overflow, keyboard labels/focus, and saved/unsaved/error messages.

A stale command must return a conflict instead of silently overwriting newer decisions. Refresh retains unsaved course details for deliberate review. Read-only Admin Studio inspection must expose no Creator upload/edit controls.

## Trusted Creator acceptance checklist

1. Admin enters a reason and grants **Trusted Creator**. Confirm the history entry.
2. Creator refreshes, changes saved content/details and submits an updated course for approval. With the current Admin-approved price, the Creator can publish this ready submitted revision without a new content approval.
3. Confirm Trusted status does not expose price approval, financial operations, Admin controls or incomplete/unprocessed media. An active Admin review/change request still prevents bypassing that revision’s review.
4. Admin revokes Trusted status with a reason. Creator refreshes. Future self-publication of unapproved content must stop; previously published content and enrolled learner access remain until an explicit unpublish/suspension action.
5. A new price always needs another Admin’s approval, including for Trusted Creators or an Admin who owns a Creator course.

## Already prepared disposable verification environment

The implementation also includes an isolated test environment, separate from your existing founder database. During this run it used a fresh PostgreSQL 16 cluster under `/tmp/airbharath-media-pg-phase20-*`, a new synthetic database and test-only complimentary grants/enrollments. Its fixture is `/tmp/phase20-browser-fixture.json` and no private database credentials are used. Test AWS objects are retained for reviewed cleanup.

While that disposable cluster exists, regenerate the credential-free browser source copy from the recorded source manifest, then start `WORKSPACE_PUBLISHING_LOCAL_TEST=true WORKSPACE_PUBLISHING_TEST_COPY=/tmp/airbharath-phase20-browser node scripts/workspace-publishing-local-test.cjs`. This helper refuses production classification and any other database/account/bucket. It starts only loopback:3000 plus a loopback PostgreSQL proxy to its verified Unix socket and a local media polling client. It never loads generic provider credentials into Next. The fixture path and copy are ephemeral; use the existing founder environment above for persistent acceptance.

To open its already prepared separate Creator/Admin/learner windows, use:

```bash
WORKSPACE_PUBLISHING_LOCAL_TEST=true node scripts/workspace-publishing-open-browser.cjs
```

Use `creator`, `admin` or `learner` at the end to reopen one window. This uses synthetic fixture sessions only and does not provide an application authentication bypass. The synthetic learner’s enrollment exists only in that disposable database. Some private Studio originals were intentionally detached to verify frozen publication delivery; the published learner video still plays. Upload a new source when testing further Studio submissions. Do not seed learner enrollment or financial records in your founder database just to run this fixture.

## Limits and acceptance

- Successful **native browser H.264/AAC compression** on a capable device remains **NOT VERIFIED** from Phase 1.9. Original MP4 fallback, S3 checksum/version identity, real MediaConvert output and decoded private HLS/captions are verified. Server-generated test MP4s do not prove browser-native compression.
- Course artwork uploads directly as a private project-owned PNG/JPEG; an existing authorized lesson image is optional. Creator/Admin preview and published artwork are re-encoded to bounded PNGs; raw untrusted resources are never exposed inline.
- Publication and audit records are retained. There is no destructive published-course delete or automatic media cleanup.
- Review queues show the latest 100 projects; histories show the latest 100 audit entries on a project. Durable revisions and price versions remain in PostgreSQL.
- Reviews/ratings/discovery ranking, sales attribution, revenue sharing, earnings, payouts and analytics are Phase 2.1+ work. Membership accounting remains separate.

Please explicitly approve Phase 2.0 only after completing the local standard and Trusted Creator checks. The complete Workspace still launches publicly as one coordinated release.

The UX refinement also prepared a separate synthetic Creator journey in `/tmp/workspace-ux-browser-fixture.json`, preserving the original Phase 2.0 fixture and all existing local founder data. It exercised direct cover upload before the first lesson, automatic processing, replacement failure/recovery, and the revised approval flow.

To open the **new refined-UX course** in the running disposable environment, preserving the original fixture:

```bash
WORKSPACE_PUBLISHING_LOCAL_TEST=true WORKSPACE_UX_BROWSER_FIXTURE=true node scripts/workspace-publishing-open-browser.cjs
```

Append `creator`, `admin` or `learner` to open only that role. These are separate local synthetic sessions, not passwords; rerun after expiry. The helper verifies the same disposable database/root and refuses non-synthetic users. Open [Dashboard](http://localhost:3000/workspace/dashboard) and [My Courses](http://localhost:3000/workspace/courses) in the Creator window to start another course idea or inspect the prepared course.
