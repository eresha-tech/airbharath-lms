# Creator Workspace Phase 1.9B — private uploads and resources

31 October 2026. Implemented on `feat/creator-workspace`, retaining Phase 1.9A contracts/schema and migration 0032. No schema or migration artifact changed in this phase.

## Delivered backend

- Added an explicit Workspace S3 adapter with dedicated credentials/region/bucket/account configuration, expected bucket owner, encryption, conditional writes, SHA-256 checksums, pinned object versions, bounded reads and timeouts. Ambient LMS credentials/buckets and configured endpoint overrides are not used. Before signing, inspecting or downloading, the adapter verifies enabled bucket versioning and all four bucket public-access-block settings.
- Upload authorization is a checksum-bound conditional PUT, valid for at most 600 seconds and never past the original 24-hour intent deadline. Existing owner-scoped reservations, context hashing, limits and resource ordering remain authoritative. Signing and storage calls occur outside database transactions; current access/state is checked again afterward.
- Finalization verifies storage-reported size, MIME type, encryption, version, identity metadata and S3 SHA-256 evidence. Resource bytes are additionally hashed and structurally validated with PDF parsing or bounded image decoding (40-million-pixel ceiling and five-second image processing timeout). Invalid evidence produces a retained failed asset; missing objects and transient provider failures preserve a recoverable intent. Duplicate/concurrent finalization converges without reattaching or advancing the revision twice.
- Resources become `ready`, then use the existing explicit versioned attachment command. Every download requires current Creator or persisted Admin authorization, a ready attached resource, the accepted verification policy, the pinned object version and matching checksum. Downloads are proxied with `application/octet-stream`, forced attachment, no-store, nosniff, sandbox CSP and same-origin resource policy. Original PDFs/images are never served inline. Structural verification is not a malware certification.
- Videos finalize only to `verified`, remain unattached, and cannot be downloaded through resource access. The prior playable video and its captions remain selected. Actual processing, playable output, caption upload and switching the selected video after processing belong to Phase 1.9C.
- Added strict JSON/body/query validation, origin and cross-site checks, controlled error responses, metadata allowlists and separate GET-only Admin inspection. The existing membership/grant/refund/suspension/retained-access policy and lock order are reused, including access rechecks after provider work. Ordinary metadata contains no storage keys, credentials, source versions, provider evidence or permanent object URLs.

## API workflow

All writes use same-origin authenticated JSON. IDs are existing private project/lesson/asset UUIDs, never LMS course IDs.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/workspace/media?lessonId=...` | Owned lesson asset metadata and media revision; storage may be disabled. |
| `POST /api/workspace/media` | Reserve using the existing 1.9A command, including request key and expected media revision; returns 201 or idempotent 200. Caption reservation is not exposed here. |
| `GET /api/workspace/media/[id]` | Recover saved owned asset metadata/state. |
| `POST /api/workspace/media/[id]/upload` | Body `{ "checksumSHA256": "<64 lowercase hex characters>" }`; returns ephemeral PUT URL, method, required headers and expiry. The checksum is an upload-authorization parameter; storage's verified checksum becomes immutable finalization evidence. |
| Browser PUT to that authorization | Send the exact file Blob and returned headers. Browser supplies the signed Content-Length. The URL signs the SHA-256 header and metadata; `If-None-Match: *` prevents overwriting an existing source. |
| `POST /api/workspace/media/[id]/finalize` | Body `{}` only; client cannot supply storage evidence, status or verification fields. Returns saved metadata and revision. |
| `PATCH /api/workspace/media/[id]` | Existing `attach`, `rename`, `move` or `detach` command with expected asset version and media revision. Video cannot attach before processing readiness. |
| `GET /api/workspace/media/[id]/access` | Authenticated attached-resource download; no redirect or signed GET URL. |
| `GET /api/admin/workspace/course-builds/[id]/media?lessonId=...` | Read-only private project media metadata with persisted Admin authorization. |
| `GET /api/admin/workspace/course-builds/[id]/media/[assetId]/access` | Read-only resource download, rechecking persisted Admin role and attachment after provider read. |

Recovery: refresh upload authorization only while the original intent remains pending/unexpired. If the conditional PUT returns 412 after an ambiguous upload response, try finalization; do not overwrite the source. Missing object returns controlled 409; expired intent returns 410; failed verification returns 422. Failed/expired intents require detachment where applicable and a new reservation key. No automatic storage deletion, lifetime reset, global library or learner enrollment was introduced.

Configuration names: `WORKSPACE_MEDIA_STORAGE_ENABLED`, `WORKSPACE_MEDIA_PRIVATE_VERSIONED_BUCKET`, `WORKSPACE_MEDIA_AWS_REGION`, `WORKSPACE_MEDIA_S3_BUCKET`, `WORKSPACE_MEDIA_AWS_ACCOUNT_ID`, `WORKSPACE_MEDIA_AWS_ACCESS_KEY_ID`, `WORKSPACE_MEDIA_AWS_SECRET_ACCESS_KEY`, optional `WORKSPACE_MEDIA_AWS_SESSION_TOKEN`. No values or credentials were added. The dedicated identity needs bucket privacy/versioning inspection, conditional PutObject and object/version read permissions. Browser CORS must allow the exact application origin, PUT and returned headers. No bucket, IAM or CORS configuration was changed here.

S3 semantics were checked against primary documentation: [conditional writes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html), [presigned URLs and checksums](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html), [version-specific GetObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html). A returned PUT URL is a bearer capability until expiry; subsequent finalization and resource access always recheck current application access.

## Actual validation

- Focused media suites: **106 tests across seven files passed**.
- Final `pnpm validate`: **PASS — 51 Node tests; 1,587 Vitest tests across 123 files; TypeScript; lint without errors/warnings.** Includes existing Creator, Builder, review, LMS access, payment and refund regressions.
- Final production `pnpm build`: **PASS**, including compilation, type/lint checks, page-data collection and static generation. Tests/build used installed pnpm 11.15.1 and Node 22 in a temporary source copy without environment files or private credentials. Build classification was staging only to satisfy the existing production-build guard; the configured target was synthetic/unreachable, not a staging database.
- `node --check tests/postgres/workspace-media-ephemeral-verification.cjs`: **PASS**.
- `git diff --check` and preservation hashes: **PASS**. All six unrelated modified files, Phase 1.9A reports, schema, journal and every migration/snapshot including 0032 remain byte-for-byte unchanged.

## Isolated PostgreSQL verification

Created a fresh PostgreSQL 16 cluster under a random `/tmp/airbharath-media-pg-*` directory, with TCP disabled, its own Unix socket and no private credentials. The opt-in harness verifies the server data directory, socket-only identity and explicit migration/destructive-test acknowledgement guards before creating a fresh randomly named database. It never accepts a private database URL. Initial harness runs exposed fixture serialization/validation errors; those fixtures were corrected without changing application guards or migrations.

**Final harness passed 17 checks:** empty installation through 0031; real synthetic eligibility/terms/complimentary grant setup; 0031→0032 upgrade plus repeat no-op; unchanged legacy plain-text fields/defaults; real resource attachment/deferred swap/contiguous detachment; rejection of position gaps, provenance deletion and truncation; protected lesson deletion; rejection of unprocessed video readiness; competing replacements on independent connections with both observed waiting on the owner lock and one winner; verified replacement preserving the prior attachment; rejection of ownership reassignment/revision rewind; derived media/Builder version advancement; current profile suspension denial; persisted Admin demotion denial; unchanged historical learner course rows.

The fixture simulates a prior processing result using synthetic SQL evidence solely to test replacement behavior. No processing adapter/worker was implemented. The database uses real repositories, services, grants and constraints; storage is a deterministic test adapter, not AWS. Result artifact: `/tmp/phase19b-postgres-results.json`. The disposable PostgreSQL server was stopped after verification.

Remaining integration gate: real conditional PUT/CORS, bucket privacy/versioning permissions, Head/Get checksum/version behavior and resource download must be proven against a separately authorized nonproduction Workspace S3 target. No genuine AWS operation was performed and this report does not claim that gate passed. No production/staging database was accessed.

## Every file changed in Phase 1.9B

Modified:

- `lib/workspace/media/model.ts`
- `lib/workspace/media/service.ts`
- `lib/workspace/media/repository.ts`
- `lib/workspace/media/runtime.ts`
- `tests/admin-route-authorization-policy.test.mjs` — expected route count 39→41; persisted-role assertions unchanged.

New:

- `lib/workspace/media/provider.ts`
- `lib/workspace/media/verification.ts`
- `lib/workspace/media/uploads.ts`
- `lib/workspace/media/http.ts`
- `app/api/workspace/media/route.ts`
- `app/api/workspace/media/[id]/route.ts`
- `app/api/workspace/media/[id]/upload/route.ts`
- `app/api/workspace/media/[id]/finalize/route.ts`
- `app/api/workspace/media/[id]/access/route.ts`
- `app/api/admin/workspace/course-builds/[id]/media/route.ts`
- `app/api/admin/workspace/course-builds/[id]/media/[assetId]/access/route.ts`
- `tests/routes/workspace-media-upload-fixtures.ts`
- `tests/routes/workspace-media-uploads.test.ts`
- `tests/routes/workspace-media-provider.test.ts`
- `tests/routes/workspace-media-http.test.ts`
- `tests/postgres/workspace-media-ephemeral-verification.cjs`
- `WORKSPACE_PHASE19B_IMPLEMENTATION.md`

No dependency/lockfile, historical migration, payment/financial workflow, learner delivery code, public publishing or UI was changed. No deployment, push or merge. Stop before Phase 1.9C.
