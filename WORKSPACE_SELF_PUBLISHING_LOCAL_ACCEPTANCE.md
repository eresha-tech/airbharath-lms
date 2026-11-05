# Creator self-publishing — founder local acceptance

This guide supersedes the earlier approval/Trusted Creator publishing workflows. All eligible Creators publish and price their own courses. Admin moderation happens after publication. Financial payout approval remains separate. This change is an acceptance candidate; founder approval and the coordinated public launch are still pending. Do not start Phase 2.2.

## Recommended: isolated testing environment

Run from the repository root on this Linux development machine. Use the installed Node 22, pnpm 11.15.1, PostgreSQL 16, Chrome and existing Playwright runtime; no installation or dependency change is needed. Stop the previous acceptance server with Ctrl+C before starting another on port 3000. The PostgreSQL proxy uses loopback port 55443.

If the retained fixture and server are already running, skip creation and go straight to opening the test windows. To create a fresh fixture:

```bash
env -i PATH="$PATH" HOME="$HOME" DATABASE_ENV=test \
  SELF_PUBLISHING_ISOLATED_VERIFY=true SELF_PUBLISHING_KEEP_FIXTURE=true \
  ALLOW_DATABASE_MIGRATION=true ALLOW_DESTRUCTIVE_DB_OPERATION=true \
  node scripts/self-publishing-isolated-postgres.cjs

node scripts/self-publishing-safe-source.cjs source

env -i PATH="$PATH" HOME="$HOME" SELF_PUBLISHING_LOCAL_TEST=true \
  SELF_PUBLISHING_TEST_MEDIA=true node scripts/self-publishing-local-test.cjs
```

Leave the last command running. Open the role-separated browser windows from a second terminal:

```bash
SELF_PUBLISHING_OPEN_BROWSER=true node scripts/self-publishing-open-browser.cjs
```

This opens Creator, Admin and learner sessions at **http://localhost:3000**. Keep this second command running while testing. To reopen just one role after session expiry, use `... self-publishing-open-browser.cjs creator` (or `admin`, `learner`). These are temporary synthetic sessions, valid for two hours; there is no shared account password or shipping authentication bypass.

The setup automatically creates synthetic users, valid eligibility, accepted Creator terms, a complimentary Creator grant, an example published course and learner progress. The Admin is a separate user. The server uses a credential-free source copy at `/tmp/airbharath-self-publishing/source`, with payment and invoice adapters replaced **only in that copy**. Checkout is synthetic: no real charge, invoice delivery, membership payment, SMS or email occurs. Test browser windows block unrelated external requests. Do not use this server for real purchases.

Only the media opt-in reads locally saved `WORKSPACE_MEDIA_*` configuration. The launcher pins the previously authorized dedicated test bucket/account/region and MediaConvert role/queue. It refuses a different target and never substitutes generic LMS AWS credentials. Uploads and processing use real nonproduction AWS and may incur test usage. Omit `SELF_PUBLISHING_TEST_MEDIA=true` for text-only, entirely local testing. Test S3 objects remain for reviewed cleanup.

### Required nonproduction configuration for media

Keep existing values in the local environment files; never paste or commit secrets. No new AWS resources or IAM changes are required by this policy update.

| Variable | Required value/purpose |
| --- | --- |
| `WORKSPACE_MEDIA_STORAGE_ENABLED` | `true` |
| `WORKSPACE_MEDIA_PRIVATE_VERSIONED_BUCKET` | `true` |
| `WORKSPACE_MEDIA_AWS_ACCOUNT_ID` | Previously authorized test account `137068239266` |
| `WORKSPACE_MEDIA_AWS_REGION` | `ap-south-1` |
| `WORKSPACE_MEDIA_S3_BUCKET` | `airbharath-workspace-uat-dev01` |
| `WORKSPACE_MEDIA_AWS_ACCESS_KEY_ID` | Dedicated nonproduction Workspace identity; configured locally only |
| `WORKSPACE_MEDIA_AWS_SECRET_ACCESS_KEY` | Its corresponding secret |
| `WORKSPACE_MEDIA_AWS_SESSION_TOKEN` | Only if temporary credentials require it |
| `WORKSPACE_MEDIA_PROCESSING_ENABLED` | `true` |
| `WORKSPACE_MEDIA_MEDIACONVERT_ROLE` | `arn:aws:iam::137068239266:role/LMSMediaConvertTestRole` |
| `WORKSPACE_MEDIA_MEDIACONVERT_QUEUE` | `arn:aws:mediaconvert:ap-south-1:137068239266:queues/Default` |

The launcher supplies its synthetic database URL, session signing material, publication flag and media worker secret in memory. Do not add production credentials. It starts the existing loopback media worker automatically when media is enabled. Keep both app and worker running until uploaded videos finish processing; uploads alone are never playable.

### Existing persistent founder environment (alternative)

The existing founder database has **not** been migrated by this task. If you choose to use it instead of the disposable fixture, stop the isolated server first. Reuse the already pinned local PostgreSQL identity on loopback port 5433, `DATABASE_ENV=development` and the dedicated nonproduction media configuration. The guarded helper refuses another database identity. Review migration 0037 before running:

```bash
DATABASE_ENV=development ALLOW_DATABASE_MIGRATION=true node scripts/workspace-media-local-migrate.cjs
DATABASE_ENV=development ALLOW_DESTRUCTIVE_DB_OPERATION=true node scripts/workspace-media-local-setup.cjs
WORKSPACE_PUBLICATION_ENABLED=true pnpm dev --media
```

Then use the existing `WORKSPACE_MEDIA_LOCAL_BROWSER=true node scripts/workspace-media-open-browser.cjs` workflow. This path preserves existing local data and prepares/reuses the original synthetic Creator/Admin accounts; use the isolated path above for the verified synthetic course checkout. Never replace the pinned target with a staging/production URL. The public publication flag remains opt-in.

## Simple manual acceptance checklist

1. **Create without approval.** In the Creator window open `/workspace/courses/new`, enter the title, aviation category, description, target learner and outcomes, then **Save Draft**. Expect course details in the six-step flow, with no proposal submission or approval request. No learner LMS course exists until publication.
2. **Course details and artwork.** Save learner-facing course details and upload a PNG/JPEG cover. Expect a private verified preview and successful save. A failed upload must remain recoverable without publishing incomplete artwork.
3. **Build lessons.** Select **Build lessons**. Add a module and a text/Markdown lesson, save and refresh. Optionally upload a small H.264/AAC MP4, PDF/image resource and valid captions. Expect resources/private preview to work and video readiness only after processing. Replace a video: the previous verified attachment stays until replacement verification succeeds.
4. **Set price.** Select **Set price**, enter an INR amount (for example ₹999.00) and **Save price**. Expect the current amount and immutable price history immediately, without an Admin price queue. Invalid amounts/currency fail server validation. Current platform bounds are ₹0.01–₹10,00,000.00; zero/free pricing is not introduced here.
5. **Preview.** Select **Preview**, inspect the saved content/resources/media, navigate away and back. Expect private authenticated access and preserved saved work. Other users must not gain authoring access.
6. **Guidelines and publish.** Before acknowledgment, publishing must be blocked. Select **Accept guidelines**, read the explicit interim publishing acknowledgment, check the box and save it. Detailed founder guidelines are pending; a later version will require a new acknowledgment. Select **Publish** and **Publish course**. Expect publication without any Admin decision or Trusted status. The published course must appear in the existing `/courses` catalog.
7. **Immutable publication/update.** Inspect the published version, edit/save lesson content in Studio, and publish an update. Expect a new version while the previous version remains inspectable. Republishing an unchanged snapshot must not manufacture content changes. Existing learner lesson IDs and saved completion remain stable.
8. **Price changes and purchases.** In the synthetic browser environment, buy the course as a separate learner. Then change the Creator price. Expect future checkout to use the new amount; the existing order, tax evidence, enrollment and completion retain their original values. The automated PostgreSQL tests cover concurrent price writes and changes during provider order creation. No real Razorpay charge is verified by this environment.
9. **Admin flag/corrections.** In the Admin window open `/admin/workspace/publishing`, select the course, enter a documented reason and **Flag course** or **Request corrections**. Expect audit history and a saved Creator notification. The course remains live for these non-withdrawal actions. In the Creator window refresh publishing, submit corrections and an appeal; expect both in history and in Admin inspection.
10. **Admin withdrawal/suspension.** Enter a reason and **Unpublish for moderation**. Expect future sales stopped and owner republication blocked until resolution; retained learner access remains. Repeat with **Suspend course**: expect delivery blocked too. Creator corrections/appeals must not lift the restriction.
11. **Resolution and recovery.** Admin enters a resolution reason and **Resolve restriction**. Expect notification/history; a suspended course becomes unpublished. Creator explicitly republishes it. Existing learner enrollment and progress must survive. A Creator’s own unpublish stops new sales without erasing learner access.
12. **Authorization/history.** A Creator cannot use Admin moderation routes, change another Creator’s course, or publish after access is revoked. Old proposal/content-review/price approval records remain read-only history, with no active approval buttons or Trusted publishing permission. Membership accounting and Admin payout approval remain separate.
13. **Responsive navigation.** Repeat dashboard → My courses → details → Studio → price → preview → guidelines → publish on a narrow window. Expect usable navigation, internal horizontal scrolling for the step bar, saved-state recovery and no page overflow.

Creator pages use `/workspace/courses/<DRAFT_ID>/build`, `/preview`, and `/publishing?stage=details|pricing|guidelines|publish`. Admin inspection uses `/admin/workspace/publishing/<PROJECT_ID>`. Learner playback remains `/dashboard/courses/<LMS_COURSE_ID>`. The helper opens the prepared course automatically.

## Verification limits and decision

The final-policy browser run verified real dedicated S3 cover upload/verification/private delivery and the independent publishing/pricing/moderation UI. Course payment capture was synthetic. Existing accepted Phase 1.9 media code and its regression tests remain in place; a new end-to-end MediaConvert/HLS/caption run was not performed for this policy-only change. Successful native adaptive H.264/AAC compressed output on a capable device remains **NOT VERIFIED**; the previously verified unsupported-browser original-MP4 fallback remains supported.

Publishing notifications are saved in-app; this task does not send email/SMS. Detailed publishing guidelines still require founder input. Record the founder’s acceptance or requested corrections after the checklist. Do not mark accepted or proceed to Phase 2.2 without explicit approval.
