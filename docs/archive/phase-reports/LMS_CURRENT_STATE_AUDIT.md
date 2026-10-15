# LMS Current-State Audit — AirBharath LMS

Audit date: **30 September 2026 (IST)**. Repository: `/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms`. Inspected revision: `fe8a296`, branch `feat/whatsapp-integration`.

## Audit scope and evidence conventions

This is a **static current-code audit**, supplemented by the repository's local validation suite. The starting working tree was clean. Application code, dependencies, migrations, and configuration were not changed. No database was queried, no application server was started, and no AWS, Redis, OTP, payment, email, analytics, or other private service was contacted. No deployment or destructive security testing was performed.

The audit inventoried the tracked repository, all 38 page entry points, all 37 API route files, the authoritative Drizzle schema and seven SQL migrations, shared services, major frontend components, scripts, tests, and CI configuration. Static call-site searches were used for absent/unused capabilities. This does not establish production deployment state or every possible runtime edge case. Exact repository-relative paths below resolve against the repository root above.

**Status definitions for the feature matrix:**

1. **Fully implemented**: the described narrow capability has a connected code path; this does not mean production-tested or defect-free.
2. **Partially implemented**: meaningful functionality exists, with missing behavior or material defects.
3. **UI only/incomplete**: a screen/control exists without the corresponding persistent or operational capability.
4. **Backend only**: service/model support exists without a verified complete UI workflow.
5. **Legacy/dead/unused**: disabled route, compatibility surface, or code with no current caller found.

Features with no implementation found are documented as **Absent**, outside these five existing-feature classifications. For live configuration, actual data, external infrastructure, and operational behavior not established by source inspection: **Not verified from the current codebase.** Security findings distinguish code evidence from conditional deployment risk.

## A. Executive Summary

AirBharath LMS is a single-academy course storefront and learner portal. A learner signs in with a mobile OTP, provides a name and email, buys a course or commercial course bundle, studies recorded lessons or follows external live-session links, reads notes and reference files, posts doubts, and manually marks lessons complete. Once all current lessons are complete and an administrator activates certificates for that course, the learner can claim a PDF certificate with a QR verification link. Administrators manage curriculum, video assets, learners' access, certificates, coupons, announcements, job listings, and operational reports.

The intended audience appears to include students, graduates, and working professionals seeking aviation, technical, and workplace skills. Public copy retains aviation language while the seed and pricing fallback describe AI skills, digital marketing/content creation, office skills, and entrepreneurship. These are product/content clues, not verified live offerings. Evidence: `app/(user)/about/page.tsx`, `scripts/seed.mjs`, `app/(user)/pricing/page.tsx`, `components/landing/`.

The platform is **learner- and admin-focused**. There are exactly two implemented privilege classes: `student` and `admin`. Instructor biographies exist as course content; no instructor permission model or institution tenancy was found. “Super Administrator” is an admin-sidebar label, not another role. Evidence: `lib/db/schema.ts`, `lib/auth-policy.ts`, `components/admin/AdminSidebar.tsx`.

Maturity assessment: a substantial course commerce/content-delivery application with an early learning-record model, rather than an advanced assessment or institutional LMS. The package identifies itself as `0.1.0-beta`. Core journeys are wired, but progress is self-reported, authorization has lesson-level gaps, several reports disagree with entitlement semantics, and some polished screens advertise future capabilities. Evidence: `package.json`, `app/api/progress/route.ts`, `lib/certificate-service.ts`, `app/(user)/practice/page.tsx`.

The most consequential findings are:

- Course/lesson identity is not consistently checked when rendering lesson notes and attachments.
- Any authenticated user can write their own completion records for released lessons without an enrollment check.
- Unreleased notes are included in full course objects passed to the client classroom layout despite the visible release lock.
- A paid order can remain paid without enrollment if the subsequent nontransactional operation fails; retries take the already-paid early return.
- No assessment, attempt, score, grading, skills, institutional, or AI execution engine was found.

## B. Architecture Summary

### Technology stack

| Area | Verified implementation | Evidence / limits |
|---|---|---|
| Web/frontend | Next.js **15.5.19** App Router, React declared `^19.2.8`; server components and client interaction islands | `package.json`, `app/` |
| Backend | Next.js route handlers plus direct server-component database reads; no separate API server or controller framework | `app/api/`, server pages |
| Languages/tooling | Strict TypeScript, TSX, JavaScript/MJS, SQL; Node 22; pnpm **11.15.1** | `tsconfig.json`, `.nvmrc`, `package.json` |
| Styling/UI | Tailwind CSS 3, Radix/shadcn-style UI, Lucide, next-themes; Google fonts | `tailwind.config.ts`, `components/ui/`, `app/layout.tsx` |
| Database | PostgreSQL via `postgres` driver; Neon is authoritative per repository rules | `lib/db/index.ts`, `AGENTS.md`; actual host not inspected |
| ORM/migrations | Drizzle ORM `^0.38.3`, drizzle-kit, seven versioned migrations `0000`–`0006` | `lib/db/schema.ts`, `drizzle/`, `scripts/migrate.mjs` |
| Authentication | Custom MSG91 mobile OTP; JOSE HS256 JWT in HttpOnly cookie `ab_session`, 30-day expiry | `lib/auth.ts`, `app/api/auth/` |
| Authorization | Persisted admin check; direct/bundle enrollment resolver; page middleware excludes APIs | `lib/admin-authorization.ts`, `lib/course-access.ts`, `middleware.ts` |
| Video/storage | AWS S3 raw/processed buckets, CloudFront signed HLS, hls.js, WebVTT | `lib/aws-video.ts`, `components/video-player/` |
| Transcoding/background | Upload assumes an external S3-triggered Lambda/MediaConvert pipeline; callback updates metadata; retranscode touches raw object | `app/api/admin/videos/[id]/retranscode/route.ts`, `app/api/videos/webhook/transcoded/route.ts`; external implementation not present |
| Other files | Lesson materials, thumbnails, certificate PDFs and invoice PDFs are stored as base64 data URLs in PostgreSQL | Upload routes, `lib/certificate-generator.ts`, `lib/invoice-generator.ts` |
| Payments | Razorpay one-time INR orders, server-calculated price, HMAC verification; coupons; invoice calculation assumes inclusive 18% GST | `app/api/payments/razorpay/`, `lib/razorpay-signature.ts`, invoice generator |
| Email | Mailercloud transactional enrollment-confirmation and certificate emails; errors are nonfatal | `lib/mailercloud.ts`, invoice/certificate services |
| Analytics | PostHog browser events/identity, server events, privileged HogQL aggregation | `instrumentation-client.ts`, `lib/analytics*.ts`, `lib/posthog-query.ts` |
| Caching | React request-scoped `cache`, client in-memory user cache, localStorage preferences, Next router stale times, image cache | Auth/dashboard services, `lib/user-session-client.ts`, `next.config.ts` |
| Redis | Upstash REST used for fail-closed OTP limits and incomplete playback concurrency tracking | `lib/otp-rate-limit.ts`, `lib/aws-video.ts` |
| Content rendering/PDF | react-markdown, GFM, KaTeX, math plugins; pdf-lib, qrcode, sharp | `components/content/MarkdownContent.tsx`, PDF generators |
| Tests | Node built-in test runner and Vitest Node route tests with mocked integrations | `tests/`, `vitest.config.mts` |
| CI/hosting | GitHub Actions validation on PRs and main pushes; `next build/start`; Vercel-related helper exists | `.github/workflows/validation.yml`, `lib/baseUrl.ts`; actual hosting/deployment not verified |
| AI/LLM | No executable provider integration, SDK, inference route, prompt service, or AI persistence found | `package.json`, `app/api/`, schema; Practice Lab is static preview |
| Legacy | Supabase SQL policy artifact; no current Supabase runtime client/dependency found | `supabase/lesson_materials.sql` |

Declared dependencies also include axios, react-player, styled-components, and Portable Text. Their presence does not establish active feature usage; no current product integration for Portable Text was found by source inspection. Dependency ranges describe declarations, not a claim that every installed transitive version was audited. No dependencies were installed or upgraded.

### How requests and data flow

```text
Browser
  ├─ public storefront / login
  ├─ learner dashboard / classroom
  └─ admin workspace
       │
       ├─ Next.js server pages → Drizzle → PostgreSQL
       └─ client fetch → Next.js API route → auth/access checks → services/Drizzle
                                             ├─ MSG91 + Upstash OTP limits
                                             ├─ Razorpay order/verification
                                             ├─ PDF generation + Mailercloud
                                             └─ AWS/Redis playback and uploads

Video browser upload → presigned S3 PUT → external transcoding pipeline (not in repo)
  → authenticated completion callback → videos metadata → signed CloudFront HLS

Browser/server events → PostHog → server HogQL query → admin behavioral panels
```

There is no general job queue, durable outbox, notification worker, scheduler, or first-party event-history table. Certificates and invoices are generated inside HTTP request processing; certificate bulk issuance loops synchronously. Evidence: `lib/certificate-service.ts`, `lib/invoice-generator.ts`, package and source inventory.

Most business pages explicitly use `force-dynamic`. React `cache()` deduplicates reads in a render/request; it is not a durable cross-request data cache. PostHog aggregation requests use `no-store` and an eight-second timeout. The public version endpoint is static, hourly cached, and returns literal `operational`; it does not probe dependencies. Evidence: `lib/dashboard-data.ts`, `lib/auth.ts`, `lib/posthog-query.ts`, `app/api/version/route.ts`, `lib/app-version.ts`.

## C. Current Feature Matrix

The frontend/backend cells name evidence anchors; detailed route inventories are in section M. “Fully implemented” retains the static-verification qualification above.

| Module | Feature | Status | Frontend | Backend | Notes |
|---|---|---|---|---|---|
| Public | Landing/about/terms/privacy | 1 — Fully implemented | `app/(user)/`, `components/landing/` | Landing reads published courses | Marketing/legal content is largely static; claims are not independent evidence |
| Public | Course catalog and text/category filters | 1 — Fully implemented | `courses/page.tsx`, `CourseCatalogClient.tsx` | Published-course read | Categories are derived badges/heuristics, not taxonomy entities |
| Public | Search route | 1 — Fully implemented | `search/[term]/page.tsx`, `SearchInput.tsx` | Published-title `ilike` query | `all`/`courses` are special search terms |
| Public | Course detail/SEO/curriculum/authors | 2 — Partially implemented | `courses/[slugOrId]/page.tsx`, `CourseDetailNav.tsx` | Course lookup by slug/UUID | Direct lookup does not enforce publication; slugs lack uniqueness/creation flow |
| Public | Pricing | 2 — Partially implemented | `pricing/page.tsx`, `PricingView.tsx` | Published-course read | Fallback prices/counts are fabricated defaults; zero DB price becomes 825 |
| Public | Free lesson preview | 2 — Partially implemented | `preview/[courseId]/lessons/[lessonId]/page.tsx` | Preview flag/release check; playback API | Anonymous page exists, but playback requires login; preview does not bind lesson to course |
| Public | FAQ/contact | 1 — Fully implemented for local FAQ/mail launch | `FAQView.tsx`, `ContactView.tsx` | None | Contact opens mailto; no inquiry persistence or verified delivery |
| Auth | OTP login/automatic student registration | 1 — Fully implemented | `app/(auth)/login/page.tsx` | `auth/send-otp`, `auth/verify-otp`, `lib/auth.ts` | Provider verification required; no password login |
| Auth | OTP resend/cooldown | 1 — Fully implemented | Login resend calls send endpoint | `lib/otp-rate-limit.ts` | Phone-hashed limits; unused separate `resendOTP` helper |
| Auth | Profile setup/edit | 2 — Partially implemented | Login/profile step, `SettingsView.tsx` | `auth/update-profile` | Name/email required; no email verification/format limits server-side |
| Auth | Session/current user/logout | 2 — Partially implemented | Headers/user menu | `auth/me`, `auth/logout`, JWT helpers | No token revocation; client cache invalidation differs by logout entry point |
| Learner | Dashboard statistics | 2 — Partially implemented | Dashboard and cards | `getStudentDashboardData` | Real data, but expired history omitted and total completion counts can exceed scoped totals |
| Learner | Continue learning | 2 — Partially implemented | `ContinueLearningCard.tsx` | Dashboard resume derivation | First incomplete lesson, not last watched position; sorting/release gaps |
| Learner | Enrolled courses/bundle groups | 2 — Partially implemented | `/my-courses`, `/dashboard/courses` | `getUserAccessSummary` | Two implementations; expired direct enrollment can mask valid bundle in display |
| Learner | Course outline and sequential navigation | 1 — Fully implemented | `ClassroomSidebar.tsx`, `LessonNavigation.tsx` | Classroom pages/layout | Sections/modules/orderIndex; no prerequisite progression enforcement |
| Learner | Video streaming/player controls | 2 — Partially implemented | `HlsPlayer.tsx` | Playback-session API, CloudFront | Quality/speed/seek/fullscreen/watermark; contextless release bypass and incomplete concurrency |
| Learner | Captions | 2 — Partially implemented | `HlsPlayer.tsx`, `CaptionOverlay.tsx` | Caption API, S3 | Preferences local; player selects English even if other-language tracks exist |
| Learner | Notes/summary/math formulas | 2 — Partially implemented | Lesson tabs, `MarkdownContent.tsx` | Lesson fields | Rendering works; parent-course check and scheduled payload protection incomplete |
| Learner | Reference documents/images | 2 — Partially implemented | Lesson reference tab | `lessonMaterials` | Data URL links; identity/upload-validation/storage concerns |
| Learner | Live sessions/upcoming list | 2 — Partially implemented | Lesson live card, `UpcomingSessionsCard.tsx` | Schedule/meeting URL fields, dashboard extraction | External meeting links only; no attendance, recording, or meeting-provider API |
| Learner | Recorded content release | 2 — Partially implemented | Locked view/sidebar | `getLessonAvailability`, route checks | Visible lock and playback context check; client payload and legacy playback branch gaps |
| Learner | Mark/unmark lesson completion | 2 — Partially implemented | `LessonCompleteButton.tsx` | `/api/progress` | Boolean toggle, no enrollment check or learning proof |
| Learner | Course/module progress | 2 — Partially implemented | Cards/sidebar | `courseProgress.ts`, page calculations | Derived current-curriculum counts; duplicated logic and rounding discrepancies |
| Learner | Learning history | 2 — Partially implemented | Dashboard/courses/certificates | Progress/enrollments | Current state only; no immutable attempts/activity history or watch-position history |
| Communication | Lesson doubts/replies/deletion | 2 — Partially implemented | `LessonComments.tsx` | `/api/comments` | Reads public; writes lack course entitlement; parent consistency unchecked |
| Communication | Admin doubt inbox | 1 — Fully implemented for comment moderation | `/admin/doubts` | `/api/admin/comments`, shared comments mutations | Answered state inferred from replies; no independent ticket lifecycle |
| Communication | Announcement/student feed | 1 — Fully implemented for publish/read/delete | `FeedClient.tsx`, `StudentFeedView.tsx` | `/api/admin/feed`, server feed read | Global admin posts; no persistent learner reactions or messaging engine |
| Communication | Direct messages | 5 — Legacy/dead/unused | `/dashboard/messages` returns null | None | Explicitly disabled route |
| Communication | Notification preference switches | 3 — UI only/incomplete | `SettingsView.tsx` | None | Only localStorage; services do not consume preferences |
| Communication | Transactional emails | 2 — Partially implemented | No delivery-status UI | Mailercloud, invoice/certificate services | No queue/retries/history; confirmation embeds fixed September 18, 2026 date |
| Career | Jobs list/search/external application | 1 — Fully implemented for listings/links | `JobsView.tsx`, placement card | Jobs reads/admin mutations | Applications/tracking outside LMS; no placement outcome model |
| Admin | Course create/edit/delete/publish | 2 — Partially implemented | New page, `CourseEditor.tsx`, course list | `/api/admin/courses` | Global admin access; limited validation; delete sequence nontransactional |
| Admin | Sections/modules/lessons and reorder | 2 — Partially implemented | `CourseEditor.tsx` | `/api/admin/curriculum` | No cross-course parent invariants or atomic reorder |
| Admin | Rich course descriptions/SEO | 1 — Fully implemented | Course editor/public sections | Course fields/update route | Markdown and optional overrides |
| Admin | Instructor/author biographies/order | 1 — Fully implemented as content | Course editor/instructor section | `/courses/[id]/authors` | Not accounts, permissions, or trainer assignments |
| Admin | Module practical task text | 2 — Partially implemented | Editor/public enrolled curriculum | `modules.practicalTask` | Instructions only; no submissions, assessment, or grading |
| Admin | Commercial bundles | 2 — Partially implemented | Bundle editor | Bundle route/access resolver | One-level entitlement expansion; delete/reinsert sequence; reporting incomplete |
| Admin | Thumbnail/material uploads | 2 — Partially implemented | Editor upload forms | Upload-thumbnail/lesson-material routes | 5/20 MB caps; MIME not actually restricted; base64 DB storage |
| Admin | Video direct upload/progress/status | 2 — Partially implemented | `VideoUploader.tsx` | Upload-url/status routes | UI 4 GB cap, XHR PUT; transcoder external and not verified |
| Admin | Reusable video library/linking/deletion | 2 — Partially implemented | Library client/modal/editor | `/api/admin/videos` | Usage checks/force delete; course-owned asset cascade and overloaded pointer |
| Admin | Retranscode | 2 — Partially implemented | Upload/library controls | Retranscode route | S3 same-key copy assumes ObjectCreated infrastructure; no job identity |
| Admin | Caption upload/list/delete | 2 — Partially implemented | Uploader/library | Admin captions route | Parsed VTT and 2 MB cap; uploader deletion query differs from API |
| Admin | Learner directory/dossier/access/progress | 2 — Partially implemented | `StudentsTable.tsx` | Admin students server reads | Full datasets; mostly direct-enrollment representation |
| Admin | Manual enrollment/extension | 1 — Fully implemented for admin access grants | Student dossier | Enroll-student/extend-access | No order required; weak date/duration validation remains |
| Admin | Order list/filter/detail/invoice links | 1 — Fully implemented for local order inspection | `OrdersTable.tsx` | Admin orders server reads | Displays local statuses, not fetched settlement/reconciliation status |
| Payments | Paid checkout/verification/enrollment | 2 — Partially implemented | `EnrollButton.tsx` | Razorpay order/verify routes | Strong signature/ownership gates; entitlement writes not atomic with paid status |
| Payments | Free enrollment | 3 — UI only/incomplete | Button says “Enroll Free” | Same Razorpay path | No zero-price direct enrollment branch |
| Payments | Coupons/create/list/delete/validation | 2 — Partially implemented | Coupon admin/checkout | Coupon routes | Used count never incremented; invalid checkout coupon can silently be ignored |
| Payments | Invoice PDF/download | 2 — Partially implemented | Orders/course invoice links | Invoice generator/download route | Owner/admin guard; missing paid-state gate, order uniqueness, retry discipline |
| Credentials | Student claim/PDF/QR | 2 — Partially implemented | `CertificatesView.tsx` | Claim service/generator | Exact all-lessons + active status + entitlement; integrity depends on insecure progress writes |
| Credentials | Admin activation/pause/bulk issuance | 2 — Partially implemented | Course editor/student dossier | Certificate admin APIs | Direct enrollments only for course list/allEligible; synchronous generation |
| Credentials | Verification by code/revoked display | 1 — Fully implemented for registry lookup | `/verify-certificate`, `/verify-certificate/[id]` | Certificate lookup | Public recipient/course/date/PDF; no cryptographic credential signing found |
| Credentials | Revocation management | 4 — Backend/model support only | Verification can display revoked | Certificate status field/service handling | No revoke mutation/UI found; existing revoked record blocks student re-claim |
| Credentials | Older certificate detail | 5 — Legacy surface still reachable | `/certificates/[id]` | UUID lookup | Any session can view; defaults can display success for missing/revoked record |
| Credentials | Compatibility generate endpoint | 5 — Legacy compatibility surface | No current caller found | `/api/certificates/generate` | Delegates to claim; not an eligibility bypass |
| Reporting | Executive dashboard/course progress/revenue | 2 — Partially implemented | `AdminDashboardClient.tsx` | Admin overview reads | Real DB data; current-state/direct-seat assumptions |
| Reporting | Analytics/date windows/cohorts/course rankings | 2 — Partially implemented | `AnalyticsClient.tsx` | Admin analytics reads | Mixed all-time/window metrics; rounded completion and bundle gaps |
| Reporting | Behavioral telemetry panels | 2 — Partially implemented | Analytics panels | PostHog query/helper/events | Config-dependent; raw event counts, not guaranteed unique learning sessions |
| Reporting | CSV export | 1 — Fully implemented for current aggregate export | `AnalyticsClient.handleExportCSV` | No separate export API | Course aggregates and summary, with timeframe caveats |
| Practice/AI | AI Roleplay/Challenges/Evaluator/Simulations | 3 — UI only/incomplete | `/practice` | None found | Four “Coming Soon” cards; no LLM calls |
| Practice | Business Scenarios/Case Studies/Task Challenges/Problem Solving | 3 — UI only/incomplete | `/practice` | None found | Four promotional concepts |
| Practice | Skill Checks/Quick Practice/Timed Challenges/Practice Paths | 3 — UI only/incomplete | `/practice` | None found | Four promotional concepts; sample classroom action disabled |
| Infrastructure | Version metadata | 1 — Fully implemented | Versions in navigation | `/api/version` | Constant operational label, not health check |
| Infrastructure | Playback concurrency verification | 4 — Backend helper only/incomplete | No enforcement caller found | `verifyPlaybackSession` | Redis write/overwrites do not revoke existing URLs |
| Legacy | Supabase materials SQL / old PDF helper / unused sections | 5 — Legacy/dead/unused | See J | `supabase/lesson_materials.sql`, `lib/pdf-generator.ts` | Not authoritative runtime paths |

**Absent implementations:** assessments/quizzes/question banks, submission workflows, score/pass/fail, SCORM/xAPI/LTI, subscriptions/refunds, trainer dashboards, institution/college management, competencies, gamification, AI execution, interview engine, first-party communication evaluation, mobile native/offline app. Evidence: schema, routes, dependencies, and source searches; promotional text does not count as implementation.

## D. User Roles & Permissions

| Actor | Screens/actions | Restrictions and enforcement |
|---|---|---|
| Anonymous visitor (not a persisted role) | Home, informational pages, catalog/search/pricing, course details, Practice Lab preview, certificate-code verification; free preview page notes | Protected pages redirected by middleware; payment/progress/claims require session. Preview video currently needs session despite public page |
| `student` | Dashboard, effective enrolled courses, notes/materials/video for entitled classroom, own completion records, doubts, feed/jobs, own profile, claim certificates | Admin pages blocked by middleware and persisted admin layout guard; admin APIs use persisted DB role. Classroom entitlement is direct enrollment or containing bundle; important exceptions in I |
| `admin` | All admin navigation, all course CRUD/curriculum, all learner/order access, manual access grants, coupons/jobs/feed, videos/captions, certificate controls/reporting; course-access bypass | No course ownership boundaries, tenant isolation, granular permission scopes, or distinct super-admin layer |

`users.role` is unconstrained text with default student; `sessionRoleFromPersistedRole` maps only exact admin to admin and all other values to student at login. Registration inserts student and ignores request-supplied privilege. Admin mutations use `getAuthorizedAdminSession()` which verifies the current database role and fails closed on lookup errors. The admin layout also checks the persisted role. Middleware uses the JWT role only for navigation gating. Evidence: `lib/auth-policy.ts`, `lib/admin-authorization.ts`, `app/(admin)/layout.tsx`, `middleware.ts`, admin route inventory.

`hasCourseAccess` checks UUID inputs, persisted admin status for admin/unspecified role, then direct enrollment with status active and no elapsed expiry, then active unexpired enrollment in a parent bundle. Bundle expansion is one level. It does not require course publication. Expired bundle-only denial can be returned with `isExpired: false` because that flag is derived only from a direct record. `getUserAccessSummary` represents active entitlements, not complete enrollment history. Evidence: `lib/course-access.ts`.

No instructor login role, content-manager role, institution-admin role, group membership, per-course instructor authorization, or user-facing role management API was found. `courses.instructorId` is set to the creating admin; `courseAuthors` is biographical content. The current scope of authorization is academy-wide administration plus learner entitlements.

## E. User Journey Map

### 1. Account entry and profile

`/login → phone → POST /api/auth/send-otp → OTP → POST /api/auth/verify-otp → profile step if new/no name → POST /api/auth/update-profile → callbackUrl or /dashboard (/admin for admin)`.

OTP attempts consume hashed-phone Upstash counters; MSG91 validates OTP. Verification looks up normalized phone and inserts a student if absent, then sets a 30-day JWT cookie. Profile updates the users row and cookie. Callback URL sanitization rejects external/protocol-relative/backslash forms. The session is issued before profile completion; other APIs do not require a complete profile. Existing authenticated visits to login redirect immediately, so an abandoned incomplete profile can skip the onboarding step on return. No email ownership verification exists. Evidence: login page, `lib/auth.ts`, auth routes.

### 2. Discover, purchase, and access

`/ or /courses or /search/[term] → /courses/[slugOrId] → login callback if needed → optional coupon validation → POST /api/payments/razorpay/order → Razorpay browser checkout → POST /api/payments/razorpay/verify → classroom`.

Server derives price from the course and coupon; creates provider order and local pending `orders` row. Verify authenticates signature and local order ownership, atomically claims the pending-to-paid transition, creates/updates enrollment, calculates expiry from accessDays, emits server events, and attempts invoice generation/email. Bundle purchase enrolls the bundle container; member-course access is derived, not a new enrollment for every member. Evidence: `EnrollButton.tsx`, payment routes, `lib/course-access.ts`.

Completion condition: valid signed checkout confirmation and successful entitlement creation. Failure gap: paid transition precedes enrollment, without one transaction; later failure is not repaired by the already-paid retry branch. Browser abandonment after successful payment also lacks an implemented payment-webhook reconciliation path. Free and 100%-discounted courses still use the payment gateway, with no direct free-enrollment branch. Actual Razorpay zero-amount behavior: **Not verified from the current codebase.**

### 3. Learn and mark completion

`/dashboard → continue/my courses → /dashboard/courses/[courseId] → first ordered lesson → /dashboard/courses/[courseId]/lessons/[lessonId] → notes/files/doubts/video or live link → POST /api/progress → next lesson`.

Layout checks the requested course's entitlement. Bundle entry redirects to the first included course. First lesson routing uses section/module/orderIndex; it need not skip an unreleased lesson. Lesson page reads lesson and materials separately, determines release state, and displays live-session or HLS UI. Playback POST creates a signed URL, writes Redis state, and inserts a playback_sessions row. Completion toggles a progress boolean. Resume is the first incomplete lesson rather than recorded playhead; no watch-position persistence, assessment, or attendance requirement exists. Evidence: classroom layout/page, lesson page, `lib/dashboard-data.ts`, `LessonCompleteButton.tsx`.

Broken/confusing steps: missing course-to-lesson relationship check; static notes can render from a different course under a course the user owns; scheduled lesson content remains in the client course payload; text-only recorded lessons still attempt video by falling back to lesson ID. UI request failures in the completion button can leave no visible error. Progress endpoint authorization is weaker than the classroom.

### 4. Scheduled/live learning

Admin sets deliveryType/live schedule/duration/meeting URL or recorded releaseAt in course editor → curriculum API → upcoming learner dashboard items → lesson route.

Recorded lessons release by comparing server current time; there is no scheduled database job. Live lessons are always accessible according to availability, regardless of scheduledAt, with an external meeting link if provided. Learners can mark live lessons complete before attending. No meeting integration, attendance record, cancellation lifecycle, reminder dispatch, or automatic recording conversion was found. Evidence: `lib/lesson-availability.ts`, curriculum API, lesson page, dashboard data.

### 5. Certificate claim and verification

`All current lessons marked complete → /dashboard/certificates → claim if course issuance active → POST /api/certificates/claim → eligibility read → PDF/QR stored → optional email → PDF download /verify-certificate/[certificateCode]`.

A learner needs current direct/bundle access, nonempty curriculum, exact all-lesson completion, active certificate configuration, and no issued/revoked existing certificate. Existing issued claim returns the record; revoked claim is rejected. Public verification queries by code and displays recipient/course/date/status/PDF. Admin issuance uses `/api/admin/certificates/issue` for selected students or direct-enrollment allEligible, with eligibility/access rechecks. No automatic certificate on the final progress write. Evidence: `lib/certificate-service.ts`, certificate routes, generator, verification pages.

### 6. Doubts, announcements, career opportunities, contact

Lesson doubts GET/POST/DELETE use `/api/comments`; admin inbox lists global comments through `/api/admin/comments` and replies using the same comment POST with parentId. Feed/jobs originate in admin create/delete routes and are read by server dashboard pages; job apply is an external link. Contact form launches a local email client through mailto and stores nothing. No actual learner-to-learner inbox or notification delivery associated with replies exists. Evidence: `LessonComments.tsx`, admin doubts page, feed/jobs components, `ContactView.tsx`.

### 7. Admin content operations

`/admin/courses/new → POST courses → /admin/courses/[id] → sections/modules/lessons via curriculum API → notes/practical-task text/authors → thumbnail/material uploads or video selection/upload → publication → certificate activation/issuance`.

Video upload creates metadata before upload succeeds, issues a 600-second presigned URL, and may assign the lesson pointer immediately; browser XHR uploads bytes to S3 and polls status. External pipeline must transcode and call the shared-secret callback. Deletion can remove linked assets after force confirmation. No versioned content approval or curriculum snapshot is taken. Evidence: course editor, `VideoUploader.tsx`, video/admin APIs.

## F. Database/Data Model

The authoritative schema is `lib/db/schema.ts`; seven migrations are under `drizzle/`. These define **20 persisted entities**. Runtime schema synchronization with a live database: **Not verified from the current codebase.**

| Entity / SQL table | Important data and relationships |
|---|---|
| `users` | UUID, unique nullable phone, email/name/avatar, text role, createdAt; no password, institution, or permission memberships |
| `courses` | Descriptions/SEO, nullable slug, numeric price, nullable accessDays, published/bundle booleans, instructor FK, certificate status/activation actor/time |
| `course_sections` | Course FK, title/description/order/timestamps; deleting course cascades |
| `modules` | Course FK, optional section FK set null on section deletion, description/practicalTask/order |
| `lessons` | Module FK; summary/content/formulas, overloaded videoUrl text, preview flag/order, delivery type/schedule/release/duration/meeting URL |
| `course_authors` | Course FK; names/photos/designation/bio/profile/order; not user accounts |
| `course_bundle_items` | Bundle course FK and child course FK, order; unique pair; both cascade with course deletion |
| `lesson_materials` | Lesson FK, title/fileUrl/fileType/fileSize; fileUrl can contain whole base64 document |
| `enrollments` | User↔course unique pair, enrolledAt/expiresAt/status active or expired by convention |
| `progress` | User↔lesson unique pair, isCompleted boolean, updatedAt; mutable current state |
| `orders` | User/course optional FKs, unique provider order ID, payment ID, amount, status pending/paid/failed, createdAt |
| `invoices` | Order/user FKs, unique invoiceNumber, taxable/GST/total, PDF URL/data; orderId is not unique |
| `certificates` | User/course FKs, unique pair and certificateCode, PDF, issued/revoked status, optional issuedBy, issuedAt |
| `feed_posts` | Global announcement content/image URL, optional author FK, createdAt |
| `jobs` | Global job title/company/location/description/link, optional postedBy FK |
| `coupons` | Unique code, type/value/expiry/usageLimit/usedCount; no redemption/order relation |
| `lesson_comments` | Lesson/user FKs, content, parentId UUID with **no self FK**, createdAt |
| `videos` | Owning course FK cascade, optional lesson FK set null, status/raw key/processed prefix/duration/error/timestamps |
| `playback_sessions` | User/video FKs, startedAt/expiresAt/active; no stored Redis sessionId or watched duration |
| `video_captions` | Video FK, language/label/S3 key/status/timestamps, unique video+language |

```text
User → Enrollment → Course → [optional Section] → Module → Lesson
User → Progress ─────────────────────────────────────────→ Lesson
User → LessonComment → Lesson; comment.parentId is an unchecked reply pointer
User → Order → Course; Order → Invoice
User → Certificate → Course; issuedBy → User
Course (bundle) → BundleItem → Course (learning course)
Course → Author biography
Course → Video ← Lesson.videoUrl (text convention, not FK)
Video → Caption; User → PlaybackSession → Video
Admin User → FeedPost / Job
```

Many-to-many relations: users/courses via enrollments, users/lessons via progress, bundle courses/child courses via bundle items. A bundle enrollment does not create member enrollment rows. Optional sections group modules while modules also belong directly to the course; these two references are not constrained to agree. Evidence: schema and `lib/course-access.ts`.

### Progress and completion engine — exact current logic

1. **Lesson:** `/api/progress POST` reads the existing user+lesson record and writes the opposite isCompleted; absent means insert true. It blocks future-release recorded lessons for nonadmins, but does not require enrollment, parent course correspondence, lesson existence validation, attendance, video end, minimum watch duration, or an assessment. DB FKs reject nonexistent IDs at write time. `courseId` is used only to calculate the returned certificate eligibility. A repeated POST reverses state; it is not an idempotent “set complete” operation.
2. **Module:** `ClassroomSidebar` checks `moduleTotalCount > 0 && moduleCompletedCount === moduleTotalCount`. This is a derived display flag, not a stored module-completion event. Empty modules are not complete.
3. **Course percentage:** `calculateCourseProgress` counts completed IDs belonging to current module lessons and returns `min(100, round(done / total * 100))`; empty course returns zero. Dashboard/certificate pages repeat this calculation. All current lessons count, including live and future-release lessons; no weighting or assessed competency.
4. **Course completion:** cards/admin reports often use rounded `percent === 100`. Certificate service uses **total > 0 and completed >= total**, so percentage can show 100 before certificate qualification for large courses (e.g. 200/201 rounds to 100).
5. **Certificate eligibility:** `getCertificateEligibility` scopes completed=true progress to current course lesson IDs. Exact completion + active course certificate status → eligible. Exact completion + disabled → completed_pending; + paused → completed_paused. Otherwise in_progress. Existing issued/revoked record is returned before recalculating curriculum, with progressPercent 100, total/completed zero, isEligible false, and issued/revoked lifecycle state.
6. **Issuance:** claim requires entitlement before eligibility; generation is lazy, on request. Generator checks existing record, generates code/PDF/QR, inserts certificate, and recovers concurrent unique conflict by fetching the user/course record. Certificate does not automatically disappear if completion is later toggled off or lessons added.
7. **Assessment/pass/fail:** no logic or persisted score exists. “With distinction” in the PDF is static text, not evidence of a grade.

Evidence: `app/api/progress/route.ts`, `lib/courseProgress.ts`, `components/classroom/ClassroomSidebar.tsx`, `lib/certificate-service.ts`, `lib/certificate-generator.ts`, dashboard/certificate pages.

### Data-model constraints and weaknesses

- Roles/statuses/delivery/discount types are text conventions, without database enums/check constraints. Numeric/date invariants and cross-course ancestry are largely application-dependent.
- No curriculum version, immutable completion record, assessment attempt, score, rubric, skill taxonomy, cohort, institution, or notification entity exists.
- `lessons.videoUrl` stores video UUIDs but is named URL and has no video FK. `videos.lessonId` is a second association, potentially inconsistent. Reusable assets remain course-owned, so deleting their originating course cascades video metadata even if another course references its UUID.
- `courses.slug` is nullable and not unique; normal admin course create/update do not write it. Seed assigns slugs. Duplicate slugs can produce ambiguous lookups.
- `lesson_comments.parentId` has no self FK or same-lesson guarantee; deleting a parent does not automatically remove descendants.
- No coupon-redemption ledger; no immutable purchased price/access/curriculum snapshot beyond order amount; invoice regeneration uses current course/user information.
- Invoice orderId lacks uniqueness; invoice numbers use last six timestamp digits, with collision risk under concurrency/time reuse. Certificate codes use a short time component plus Math.random; not a signed credential and collision retry is limited.
- Base64 blobs add roughly one-third encoding overhead and appear in server/client payloads. Whole-table reads compound this problem.
- Unique pair indexes exist, but dedicated reporting/date/course-FK indexes are sparse in schema/migrations. Query performance under realistic volume: **Not verified from the current codebase.**

## G. Assessment Capability

**No working assessment system was found.** Evidence: all current schema entities, all APIs/pages, and source searches for quiz/assessment/attempt/rubric/score-related implementations.

| Requested capability | Current state |
|---|---|
| Quiz types / question types / question bank | Absent; no question/quiz entities or renderer |
| Attempts / retakes / limits | Absent; completion toggle is not an attempt |
| Scores / passing criteria / pass-fail | Absent; certificates are completion-based |
| Timers / randomization | Absent; Timed Challenges is a static Practice Lab card |
| Automated grading / manual grading | Absent; admin comment replies are not grading |
| Feedback / explanations | Doubt replies and authored notes exist; no response-specific scored feedback |
| Results storage / assessment analytics | Absent; progress boolean and PostHog playback milestones are not assessment results |
| Assignments | Module practicalTask instructions exist; no submission/file answer/rubric/grader/result flow |
| AI evaluation / simulations | Coming Soon preview cards; no provider calls, run records, or evaluations |
| SCORM/xAPI imports/runtime | No parser, package storage, runtime API, or standards tracking found |

The Practice Lab page contains twelve named previews, grouped in the feature matrix. These should not be treated as partially working assessments. “Practical assignments” in landing copy describes an aspiration/instruction surface rather than a submission engine. Evidence: `app/(user)/practice/page.tsx`, `components/landing/CoursesSection.tsx`, `modules.practicalTask`.

## H. Reporting & Analytics Capability

| Report/surface | Actual source and calculation | Limits |
|---|---|---|
| Learner dashboard | Effective course IDs + current lesson booleans; average course percentage, lessons, certificates, upcoming sessions/jobs | Mostly active entitlement set; historical expired courses disappear; certificate count includes all statuses |
| Learner course list | Current accessible courses, completed IDs, paid orders, certificates, expiry | Display can prefer expired direct row over active bundle access; resume not watch history |
| Admin overview | Whole users/enrollments/orders/lessons/modules/courses plus completed progress; in-browser aggregation | No pagination/server aggregates; enrollment seats mostly direct |
| Admin students dossier | Whole student/curriculum/enrollment/certificate/order/progress sets | Not bundle-complete cohort model; large PII/PDF payloads to admin browser |
| Course certificates | Direct enrollments; per-student eligibility, issued/eligible/completed totals | Omits bundle-only learners; issued branch not counted in totalCompleted; revoked counted in totalIssued |
| Admin analytics | Paid order revenue/AOV/growth, registrations/enrollments, current progress cohorts, course rankings, monthly trends, certificate totals | Mixed time windows/all-time scope; not financial settlement or refund ledger |
| Product behavior | PostHog raw event counts grouped by course/slug in chosen range | Config-dependent; client events can be blocked/repeated/spoofed; not server-authoritative completion |
| CSV | Course summary rows plus overall metrics | Row totals often all-time while summary/date filename refer to selected window; no learner-level assessed-results export |

Evidence: `lib/dashboard-data.ts`, dashboard pages, `app/(admin)/admin/{page,analytics/page,students/page}.tsx`, `components/admin/AnalyticsClient.tsx`, course certificate API.

**Captured in PostgreSQL:** user creation, enrollment/expiry/status, local payment status/amount/provider IDs, mutable completion state/update time, comment/feed/job records, issued credentials/invoices, video metadata, playback authorization starts/expiry. No reliable active-session end, time-on-task, watch position, full event history, login history, attendance, assignment result, or competency evidence is stored. Playback DELETE releases Redis but does not mark DB active=false. Evidence: schema, playback route.

**Captured through PostHog call sites:** pageviews, sign-in/out, course views/search/filter, enrollment/checkout start, lesson start, playback milestones 25/50/75/90/100, manual lesson/course completion, certificate claim interactions, feed opens, job opens; server payment/enrollment and selected admin creation/certificate/bundle events. Evidence: `lib/analytics.ts`, `lib/analytics-server.ts`, player/button/catalog/feed/jobs components and admin mutation routes.

`HlsPlayer` milestones use **current playback position / duration**, so seeking past milestones can emit them; they do not establish watched time. Completion events are emitted by the button after toggling. No persistent evidence binds those events to certificate eligibility. `queryPostHogBehavioralMetrics` adds both certificate_claim_started and certificate_claimed to one count, so a successful claim can count twice. “All” behavior queries use 3,650 days, not truly unlimited history.

`AnalyticsClient` active learners means unique users with currently completed progress records updated in the window; no progress means no activity, and unmarking removes a record from that report input. Cohort buckets use direct seats with rounded percentage: 0, 1–24, 25–99, 100. Pending eligible counts do not check course issuance state or active entitlement. Course revenues/cohorts are all-time while header period revenues/enrollments are windowed. Bundles inflate seats on the commercial container and undercount child-course learners. Certificates lists/counts often omit revocation status. These are interpretation defects, not hardcoded random metrics.

Instructor, institution, assessment, interview, communication-evaluation, and skill-proficiency reports are absent. Production PostHog project configuration, delivery completeness, retained events, and actual metrics: **Not verified from the current codebase.**

## I. Security Findings

Severity reflects plausible impact of the inspected code path. Findings were not exploited against a running service. **No Critical issue was established by this audit.** This is not a guarantee that none exists.

| ID | Severity | Finding / code evidence | Impact and remediation needed (not implemented) |
|---|---|---|---|
| S1 | **High** | Lesson page fetches by lessonId independently, authorizes URL courseObj, and never rejects currentLessonIdx=-1: `app/(dashboard)/dashboard/courses/[courseId]/lessons/[lessonId]/page.tsx` | Learner owning course A can request a released private lesson B under A and receive B notes/materials/title/live link. Contextual playback/caption gates may still block B video. Bind lesson→module→actual course before reads/rendering |
| S2 | **High** | `/api/progress POST` only session + future-release restriction; no `hasCourseAccess` or lesson/course ancestry check | Any signed-in user can premark other released courses and later claim after obtaining access, undermining completion integrity. Authorize actual lesson course, validate identifiers, and define trusted completion requirements |
| S3 | **High** | Classroom server layout passes full `courseObj` modules/sections/lessons via spread to client `ClassroomLayout` | Recorded future lessons' content/summary/formulas/video pointers are serialized despite UI lock. Projection to safe outline metadata and server-only protected content is needed |
| S4 | **Medium** | Playback POST branch with neither requestedLessonId nor requestedCourseId authorizes origin course access without checking origin release | Enrolled learner can omit context to obtain signed playback before recorded release. Require an authorized released lesson association in every branch |
| S5 | **Medium** | `app/api/comments/route.ts GET` public; POST only authenticated; unchecked parentId | Anonymous comment content/name (email fallback) disclosure for known lesson IDs, unenrolled posting, unrelated reply attachment, spam. Apply entitlement/preview rules, parent consistency, content caps, throttling |
| S6 | **Medium** | Public course detail/metadata lookup and Razorpay order route do not check isPublished; preview route does not verify course ancestry/publication | Known draft IDs/slugs can be browsed/purchased; publication does not consistently act as exposure gate. Define and enforce draft/public access policy |
| S7 | **Medium** | `getCloudFrontSignedPlaybackUrl` falls back to unsigned URL on missing signing config | Application does not fail closed. Actual access depends on CloudFront policy; public distribution would expose content, private one fails playback. Reject incomplete signing config; private distribution configuration not verified |
| S8 | **Medium** | `verifyPlaybackSession` has no current caller; Redis functions allow missing/error state, player ignores returned sessionId | Claimed one-session protection is ineffective; old signed URLs last two hours, deletion removes user's key without matching a session. Implement enforceable session semantics or stop relying on current mechanism |
| S9 | **Medium** | Lesson material type uses `ALLOWED_TYPES[file.type] || 'pdf'`; thumbnail accepts arbitrary type | Allowlist does not reject unknown MIME; SVG is accepted, file magic not verified, large data blobs in DB. Validate type/content/size at boundaries and use controlled storage. No executable-upload exploit established |
| S10 | **Medium** | Many CRUD routes return `error.message`; limited UUID/string/amount/date validation; profile checks only nonempty strings | Malformed requests can expose internal diagnostics; invalid links/numbers/dates and overlong content can be stored. Typed validation and stable public errors needed |
| S11 | **Medium** | HS256 JWT valid 30 days, no session ID/revocation store; `getSession` does not check persisted user for ordinary routes | Logout clears only that browser cookie; copied valid tokens remain valid. Admin demotion is guarded by persisted-role checks. Add required session revocation/expiry policy if needed |
| S12 | **Medium** | Invoice download authorizes ownership/admin but never requires paid status; generator also lacks status check | Authenticated owner can generate tax invoice and enrollment-confirmation email for pending/failed order. Require correct paid state and make generation idempotent |
| S13 | **Medium** | PostHog identification sends name/email; sanitizer only removes top-level forbidden keys; pageview sends full URL | PII reaches analytics; nested secrets are not recursively stripped. Session recording disabled, but URL/query exposure and PII policy still need review. No actual secret exfiltration established |
| S14 | **Low** | OTP route phone checks len≥10 and verify only presence; rate limits by phone only | Weak type/format/length handling; no aggregate IP/device abuse cap; provider/timeouts inconsistent. Current phone limits still fail closed |
| S15 | **Low** | Email HTML interpolates user fullName/course title without HTML escaping | User-controlled text can alter rendered transactional email content; does not establish browser XSS. Escape template values |
| S16 | **Low** | No custom security headers/CSP or explicit CSRF token/Origin policy found in Next config/handlers | SameSite=Lax and JSON request patterns provide mitigations, but multipart/admin and state-changing GET invoice path need deliberate policy. No working cross-site exploit established; hosting headers not verified |
| S17 | **Low** | Public certificate codes use short time + three-digit random suffix; public verification exposes name/course/date/PDF | Codes are identifiers rather than secrets/cryptographic proofs; no rate limiter/consent model found. Protect public lookup according to intended disclosure policy |

### Existing positive controls

- OTP has no development bypass; missing provider config and nonverified responses fail. New users are persisted as students. `lib/auth.ts`, `lib/auth-policy.ts`.
- OTP Upstash errors/missing config return unavailable/503; send uses 30-second cooldown and five/hour, verify ten/ten minutes. `lib/otp-rate-limit.ts` and route tests.
- Session cookie HttpOnly, Secure in production, SameSite=Lax; secret required, expiry enforced by JOSE. `lib/auth.ts`.
- All current admin route files use shared persisted-role authorization; fail-closed admin-role checks prevent relying solely on a stale token claim. `lib/admin-authorization.ts`, admin policy tests.
- Razorpay verification validates body/signature shape, fails missing secret, uses timing-safe HMAC comparison, checks local order owner/status/payment identity, and atomically claims payment transition. `lib/razorpay-signature.ts`, verify route/tests. It does not make the downstream enrollment transaction atomic.
- Video webhook requires configured shared secret, uses timing-safe comparison, validates UUID/event shape and video/course correspondence, and avoids late ERROR downgrading ready. `lib/webhook-auth.ts`, callback/tests. No job-id freshness/replay identity tracked across retranscodes.
- Captions endpoint checks session, actual lesson/module/course, release and entitlement, and uses private/no-store/nosniff response. Admin VTT upload parses cues and caps file size. Caption legacy association checks differ from playback association.
- Drizzle parameterized query builders are used; raw SQL found in guarded seed operations, not user-supplied query concatenation.
- Migration/seed wrappers require explicit environment and acknowledgment; destructive seed restricted to development/test. No script was executed.

### Secrets, database access, CORS, and operational limits

No confirmed live secret was found in the limited tracked-file credential-pattern inspection. `.env` exists as ignored local configuration; contents were not printed or used. `.env.example` includes a **placeholder** CloudFront private-key marker, not proof of a valid leaked key. No claim is made about all ignored files, credential history, production rotation, or a complete secret scan. Actual secrets/permissions: **Not verified from the current codebase.**

Examples document JWT/MSG91/Razorpay/AWS/CloudFront/Upstash/Mailercloud/PostHog/database variable names. Code additionally expects `AWS_WEBHOOK_SECRET` and optional PostHog personal query credentials not listed in that example; `RAZORPAY_WEBHOOK_SECRET` is documented but no payment webhook handler exists. Evidence: `.env.example`, services and API inventory.

No permissive application CORS header found. Direct S3/CloudFront playback requires externally configured browser CORS; those settings are outside the repository. `next.config.ts` allows HTTPS optimized images from any hostname; this is a broad fetch surface but no proven private-network exploit was established. No dependency vulnerability scanner/advisory service was run.

`lib/db/index.ts` has local fallback connection configuration and a broad string-contains-5433 branch that discards URL host/user/password in favor of a local socket. This should not be treated as target validation. There is no authoritative Neon RLS setup in the versioned migrations; Supabase auth.uid() policies are legacy and must not be credited to current JWT/Postgres authorization. Runtime grants, RLS, SSL enforcement, backups and infrastructure policies: **Not verified from the current codebase.**

## J. Technical Debt

1. **Large multipurpose client modules.** At this revision: `CourseEditor.tsx` 4,647 lines; `StudentsTable.tsx` 2,081; `AnalyticsClient.tsx` 1,604; public course detail 1,300; `HlsPlayer.tsx` 1,294; `CouponsClient.tsx` 1,105; `OrdersTable.tsx` 1,022; `VideoUploader.tsx` 995. Content editing, commerce, certificates, rendering and mutation state share these surfaces; adding assessment state raises change/review risk.
2. **Repeated learning/access calculations.** Dashboard service, both course-list pages, learner certificates page, feed sidebar, admin analytics/overview, and student dossier each reconstruct progress. Shared `courseProgress` is used by classroom but not universally. Exact vs rounded completion and bundle/direct differences already show divergence.
3. **Whole-table/client-side reporting.** Admin overview/analytics/students and comments/video library read broad datasets, then map/filter in JS; certificate-course list repeatedly calls eligibility for each learner. No realistic scale verification, pagination boundary or server-side aggregation layer exists.
4. **Nontransactional side effects.** Payment paid flag then enrollment, course deletion across records, bundle flag/delete/reinsert, reorder loops, caption S3+DB, and video storage deletion all have partial-failure windows. Source has no general Drizzle transaction usage found in these paths.
5. **History is not modeled.** Boolean progress overwritten, no curriculum versions, immutable course completion, attendance, admin action journal, email delivery log, or payment paidAt/refund state. `issuedBy` and certificate activation metadata are narrow attribution, not a comprehensive audit trail.
6. **Storage and asset ownership.** Materials/thumbnails/PDFs stored as text blobs; reusable video pointer is text; video ownership is tied to originating course. Course deletion deletes certificate registry rows and nulls order course FK before removing course; historical purchase/credential meaning is lost, and S3 assets can outlive cascade deletion.
7. **Conventions/config drift.** camelCase ORM values repeatedly remapped to snake_case frontend shapes; practicalTask/practical_task accepted together; inconsistent caption deletion query names; hardcoded combo slug/coupon, invoice branding/tax rate/domain/start date, generic faculty/access defaults. `scripts/seed.mjs` is a development destructive fixture, not production state proof.
8. **Legacy/unused candidates.** `lib/pdf-generator.ts` has no source caller; `components/dashboard/stats-card.tsx`, `components/landing/ChallengesSection.tsx`, `OutcomesSection.tsx` have no import found. Admin `Sidebar.tsx` and dashboard `Sidebar.tsx` are compatibility reexports, not independent layouts. `lib/posthog.ts` is compatibility reexport; `resendOTP`, `verifyPlaybackSession`, `lib/baseUrl.ts` have no operative call site found. Static search is not runtime proof of dead-code elimination.
9. **Unused dependency candidates.** Portable Text/react-player/axios/styled-components/MediaConvert SDK do not establish working integrations; no MediaConvert job submission exists in app code. Dependency reduction was not performed or recommended as a prerequisite without actual usage/build analysis.
10. **Testing covers gates, not the entire product.** Five pure test files and six route files cover auth policy, database safety, admin authorization, signatures, OTP limits, and video callback; no browser/E2E, real DB integration, course-access/progress/certificate/display regression tests found. Passing mocks do not validate hosted services or the security defects above.
11. **Tooling drift.** `pnpm validate` passes, but `next lint` reports deprecation. Node 22/pnpm 11.15.1 are documented and CI pinned. There is no production build/deploy job in the current workflow.

No significant TODO/FIXME backlog was established by targeted search; explicit disabled/Coming Soon screens and concrete inconsistencies provide stronger evidence of unfinished work.

## K. UX/Product Gaps

- Anonymous preview promises playback but the player receives 401 from authenticated playback API. Public preview should not be read as working anonymous HLS. Preview also uses caller courseId directly, so slug context can mismatch the UUID backend requirement.
- “Enroll Free” still opens Razorpay; no working direct zero-price flow found.
- `/my-courses` and `/dashboard/courses` independently display the same concept with different grouping/resume/data assumptions. Expired-only enrollments disappear from active-course sets; feed sidebar separately ignores expiry/bundle expansion.
- Classroom completed count uses **all supplied completedLessonIds.length** even though its percentage filters to current course. The layout supplies all the user's completed lessons; count can exceed the displayed course's total.
- Resume calculation can select unreleased content. `lib/dashboard-data.ts` globally sorts flattened lessons by lesson orderIndex, which is local to a module; course page uses section→module→lesson order. `/my-courses` lessons are not explicitly ordered in its query.
- Text-only lessons fall back to lesson ID video initialization rather than a clear no-video state; UI implies video content even when no asset exists.
- Practice Lab cards say Coming Soon and its integration action is disabled, but “Practice Available,” simulated lesson examples, rubric descriptions and “assignments” copy can be mistaken for working capabilities.
- Settings notification toggles show saved state while only writing unscoped localStorage; no actual lesson/reply/job notifications are implemented or preference-aware emails sent.
- “Student Portal” link from admin points at `/dashboard`, whose page redirects admins back to `/admin`; admins can access other learner routes but that switch does not land as labeled.
- Certificates learner/admin mappings omit revoked status in some surfaces; older `/certificates/[id]` renders generic success on missing record and ignores revoked. Verification page correctly distinguishes revoked but still offers the original PDF.
- Registry copy says “cryptographically registered” and certificate PDF says “with distinction”; the generator creates a database record and QR URL without a signature or assessed grade.
- Pricing fallback uses invented counts/prices if DB read fails/returns empty; real zero price becomes 825. Home faculty/lifetime values can be replaced by generic faculty/365-day defaults. Links to fallback course slugs may not resolve to a real course.
- Confirmation emails always reference September 18, 2026, already past on this audit date; lesson availability is independently configured. Confusing timing is a code fact, not a tested live email.
- Several catch paths render empty lists/not-found UI for database errors, masking outages as empty product state. Completion failures only console-log or return silently.

Frontend organization: public pages share `Header`/`Footer`; learner and admin use separate wrapper/sidebar/header/mobile-sheet components; classroom has its own collapsible outline and hides normal dashboard shell on classroom routes. State uses React hooks/context, router refresh and fetch; no Redux/React Query/SWR global data layer found. LocalStorage persists theme/sidebar/caption/notification preferences, while `user-session-client` deduplicates `/api/auth/me` requests. Forms are native inputs/Radix plus manual handler validation, not a shared typed form/schema framework. Evidence: layouts, `components/providers/`, `StudentLayoutWrapper.tsx`, `AdminLayoutWrapper.tsx`, UI/components/services.

Responsive implementation exists in Tailwind breakpoint grids, mobile sheets/nav, scrollable tables, and HLS control sizing. Actual mobile-browser playback, accessibility, keyboard/screen-reader behavior, contrast, slow-network use, and visual layout were **Not verified from the current codebase.** No native application, PWA/offline service worker, or offline content sync was found.

## L. Future Feature Readiness

This section evaluates existing foundations only; it is not a feature design or implementation plan.

| Area | Classification | Current-code reason |
|---|---|---|
| Existing course content/notes/author extensions | **READY** for modest extensions | Course/module/lesson/biography editor and Markdown rendering exist; security/invariant defects still apply |
| Advanced assessments | **MAJOR ARCHITECTURAL WORK** | No questions, attempts, submissions, grading, scores or curriculum assessment mapping; progress/certificates only count lessons |
| AI-powered learning | **MAJOR ARCHITECTURAL WORK** | Promotional preview only; no inference service, run record, provider credentials/cost controls, or learning context boundary |
| AI evaluation | **MAJOR ARCHITECTURAL WORK** | No submissions/rubrics/evaluation results or reviewed human grading workflow |
| Interview simulations | **MAJOR ARCHITECTURAL WORK** | No session/transcript/audio response/scenario/evaluation persistence |
| Communication training | **MAJOR ARCHITECTURAL WORK** for interactive evaluation | Could host existing content/live links; no measured speaking/writing practice or feedback engine |
| Skills/competency tracking | **MAJOR ARCHITECTURAL WORK** | No skill taxonomy, proficiency evidence, mapping or competency rules |
| Institutional dashboards | **MAJOR ARCHITECTURAL WORK** | Single academy; no tenant, institution, cohort memberships, scoped admin or isolation |
| Trainer dashboards | **MAJOR ARCHITECTURAL WORK** | Instructor biographies are not accounts; admin is global, no assigned-course permissions |
| Detailed learner analytics | **NEEDS MODIFICATION** | Existing progress/PostHog helps, but no reliable watch history/activity ledger and reporting/bundle/timeframe semantics disagree |
| Gamification | **MAJOR ARCHITECTURAL WORK** | No points/streaks/badges/reward evidence or immutable trusted learning events |
| Mobile-first web learning | **NEEDS MODIFICATION** | Responsive shell/player exists; preview, errors, resume, payload volume and real-device verification unresolved |
| Native/offline mobile learning | **MAJOR ARCHITECTURAL WORK** | No native code, offline model, sync/download authorization or mobile token/session design |
| External integrations | **NEEDS MODIFICATION** | Existing outbound service helpers and one inbound video callback; no stable public API, scoped credentials, durable retry/events or standards support |

Evidence: `lib/db/schema.ts`, route inventory, Practice Lab page, role/access services, player/dashboard and analytics code. “Ready” means a relevant interface/data foundation exists, not that production reliability has been established.

## M. Important Code/File Map

### Core files/directories

| Concern | Exact repository path | Purpose |
|---|---|---|
| Authentication | `lib/auth.ts`; `lib/auth-policy.ts`; `app/(auth)/login/page.tsx`; `app/api/auth/` | OTP provider, cookie JWT, student default, onboarding/profile |
| OTP protection | `lib/otp-rate-limit.ts` | Hashed-phone Upstash windows and fail-closed response |
| Admin permissions | `lib/admin-authorization.ts`; `app/(admin)/layout.tsx`; `middleware.ts` | Current persisted admin guard and page navigation checks |
| Learner entitlement | `lib/course-access.ts` | Direct/bundle/admin resolver, access summary, bundle contents |
| User management | `app/(admin)/admin/students/page.tsx`; `components/admin/StudentsTable.tsx` | Learner directory, dossier, enrollment/extension/issuance |
| Learner dashboards | `lib/dashboard-data.ts`; `app/(dashboard)/dashboard/page.tsx`; `components/dashboard/` | Dashboard derivations, cards, course/feed/jobs/certificates/settings |
| Public course catalog/detail | `app/(user)/courses/page.tsx`; `app/(user)/courses/[slugOrId]/page.tsx`; `components/courses/`; `components/CourseCard.tsx` | Published catalog, detail/SEO, author/practical task/curriculum rendering |
| Course admin/editor | `app/(admin)/admin/courses/`; `components/admin/CourseEditor.tsx`; `app/api/admin/courses/route.ts` | Course CRUD/publishing and curriculum editor |
| Curriculum | `app/api/admin/curriculum/route.ts`; `lib/db/schema.ts` | Section/module/lesson CRUD/reordering and content fields |
| Classroom/lessons | `app/(dashboard)/dashboard/courses/[courseId]/layout.tsx`; `app/(dashboard)/dashboard/courses/[courseId]/lessons/[lessonId]/page.tsx`; `components/classroom/` | Entitlement, lesson view and outline/navigation |
| Public previews | `app/preview/[courseId]/lessons/[lessonId]/page.tsx` | Preview flag/release-controlled lesson page |
| Release/live logic | `lib/lesson-availability.ts`; `components/dashboard/UpcomingSessionsCard.tsx` | Availability rules and IST display |
| Assessment placeholder | `app/(user)/practice/page.tsx` | Static Practice Lab preview; no assessment service |
| Progress | `app/api/progress/route.ts`; `lib/courseProgress.ts`; `components/LessonCompleteButton.tsx` | Mutable completion toggle and derived percentages |
| Discussion | `components/LessonComments.tsx`; `app/api/comments/route.ts`; `app/(admin)/admin/doubts/page.tsx` | Lesson threads/admin reply UI |
| Video | `lib/aws-video.ts`; `components/video-player/HlsPlayer.tsx`; `components/admin/VideoUploader.tsx`; `components/admin/VideoLibraryClient.tsx` | S3/signing/Redis, HLS controls, upload/library |
| Captions | `components/video-player/CaptionOverlay.tsx`; `app/api/videos/[id]/captions/route.ts`; `app/api/admin/videos/[id]/captions/route.ts` | Preferences/rendering, guarded S3 text retrieval and VTT management |
| Certificates | `lib/certificate-service.ts`; `lib/certificate-generator.ts`; `components/dashboard/CertificatesView.tsx`; `app/verify-certificate/` | Eligibility, issuance PDF/QR, learner claims, public registry |
| Payments | `lib/razorpay.ts`; `lib/razorpay-signature.ts`; `components/EnrollButton.tsx`; `app/api/payments/razorpay/` | Provider setup, signed verification and checkout |
| Invoices/email | `lib/invoice-generator.ts`; `lib/mailercloud.ts`; `app/api/invoices/download/[orderId]/route.ts` | Tax PDF, transactional email, download |
| Analytics | `instrumentation-client.ts`; `lib/analytics.ts`; `lib/analytics-server.ts`; `lib/posthog-query.ts`; `components/admin/AnalyticsClient.tsx` | Event capture, identity, query aggregation/report/export |
| Admin shell | `components/admin/AdminSidebar.tsx`; `AdminMobileNav.tsx`; `AdminHeader.tsx`; `AdminLayoutWrapper.tsx` | Desktop/mobile navigation/layout |
| Schema/database | `lib/db/schema.ts`; `lib/db/index.ts`; `drizzle/`; `drizzle.config.ts` | Authoritative Postgres mapping and versioned migrations |
| Safety scripts | `scripts/database-safety.mjs`; `scripts/migrate.mjs`; `scripts/seed.mjs` | Explicit target/acknowledgment; destructive development fixtures |
| Validation | `tests/`; `vitest.config.mts`; `tests/setup.ts`; `.github/workflows/validation.yml` | Local/CI pure and mocked route tests, typecheck/lint |
| Configuration | `package.json`; `pnpm-lock.yaml`; `pnpm-workspace.yaml`; `.nvmrc`; `next.config.ts`; `tsconfig.json`; `.env.example` | Version/toolchain, dependencies, runtime/config contract |
| Shared UI/content | `components/ui/`; `components/content/MarkdownContent.tsx`; `components/theme-provider.tsx`; `app/globals.css` | Styled primitives, safe Markdown/math, theme |
| Legacy | `supabase/lesson_materials.sql`; `lib/pdf-generator.ts`; `app/(dashboard)/dashboard/messages/page.tsx` | Unused policy/helper and disabled inbox |

### Complete page route inventory

Route-group folder names do not appear in browser URLs.

| Route group / exact directory | Browser routes / purpose |
|---|---|
| `app/(user)/` | `/`, `/about`, `/contact`, `/faq`, `/terms`, `/privacy`, `/pricing`, `/practice`; public marketing/support/practice-preview |
| `app/(user)/courses/` | `/courses`, `/courses/[slugOrId]`; catalog/detail |
| `app/(user)/search/[term]/` | `/search/[term]`; title search |
| `app/(user)/my-courses/` | `/my-courses`; alternate entitled course listing |
| `app/(user)/certificates/[id]/` | `/certificates/[id]`; older credential detail, session gated by middleware |
| `app/(auth)/login/` | `/login`; OTP/profile |
| `app/(dashboard)/dashboard/` | `/dashboard`, `/dashboard/courses`, `/dashboard/courses/[courseId]`, `/dashboard/courses/[courseId]/lessons/[lessonId]`, `/dashboard/certificates`, `/dashboard/feed`, `/dashboard/jobs`, `/dashboard/settings`, `/dashboard/messages` (disabled) |
| `app/(admin)/admin/` | `/admin`, `/admin/analytics`, `/admin/courses`, `/admin/courses/new`, `/admin/courses/[id]`, `/admin/videos`, `/admin/doubts`, `/admin/students`, `/admin/orders`, `/admin/coupons`, `/admin/jobs`, `/admin/feed` |
| `app/preview/[courseId]/lessons/[lessonId]/` | Public free-preview lesson |
| `app/verify-certificate/` | `/verify-certificate`, `/verify-certificate/[id]`; code search/detail |

Loading/error/not-found entry points and skeleton components exist across major route groups. No standalone institution or trainer route tree exists. Navigation evidence: `components/Header.tsx`, `components/dashboard/SidebarNav.tsx`, `components/admin/AdminSidebar.tsx` and their mobile companions.

### Complete API inventory and protection

Every path below maps to the exact file `app` + API URL + `/route.ts`, with bracket parameters preserved. **Admin** means `getAuthorizedAdminSession` (persisted role), not merely middleware.

| API path | Methods | Protection / purpose |
|---|---|---|
| `/api/auth/send-otp` | POST | Public; OTP phone limits/provider |
| `/api/auth/verify-otp` | POST | Public; verify limits/provider, create cookie/student |
| `/api/auth/update-profile` | POST | Session; own name/email |
| `/api/auth/me` | GET | Own DB user/session or null |
| `/api/auth/logout` | POST | Clears cookie |
| `/api/progress` | GET, POST | GET own completion/default false; POST session, release-only gate |
| `/api/comments` | GET, POST, DELETE | Public GET; session POST; owner/persisted-admin DELETE |
| `/api/coupons/validate` | POST | Public; displayed discount validation |
| `/api/payments/razorpay/order` | POST | Session; course/coupon price and provider order |
| `/api/payments/razorpay/verify` | POST | Session + signature + local owner/status |
| `/api/invoices/download/[orderId]` | GET | Order owner/admin; can generate/email on read |
| `/api/certificates/claim` | POST | Session + actual entitlement/eligibility service |
| `/api/certificates/generate` | POST | Same claim service, compatibility response |
| `/api/videos/[id]/playback-session` | POST, DELETE | POST session + contextual entitlement/release branches; DELETE releases user lock |
| `/api/videos/[id]/captions` | GET | Session + actual lesson/course association/preview/release/access |
| `/api/videos/webhook/transcoded` | POST | Shared secret + strict event/UUID/video-course validation |
| `/api/version` | GET | Public cacheable metadata |
| `/api/admin/courses` | POST, PUT, DELETE | Admin; course create/edit/delete |
| `/api/admin/curriculum` | POST, DELETE | Admin; typed operations for sections/modules/lessons/reorder |
| `/api/admin/courses/[id]/bundle` | GET, PUT | Admin; bundle membership/configuration |
| `/api/admin/courses/[id]/authors` | GET, POST, PUT, DELETE | Admin; biography CRUD/order |
| `/api/admin/courses/[id]/certificates` | GET, PATCH | Admin; direct-enrollment eligibility list/issuance activation |
| `/api/admin/certificates/issue` | POST | Admin; bulk/selected issuance |
| `/api/admin/enroll-student` | POST | Admin; manual entitlement |
| `/api/admin/extend-access` | POST | Admin; expiry extension/lifetime change |
| `/api/admin/upload-thumbnail` | POST | Admin; multipart image/data URL |
| `/api/admin/lesson-materials` | POST, DELETE | Admin; multipart attachment/delete |
| `/api/admin/comments` | GET | Admin; whole-table doubts list |
| `/api/admin/feed` | GET, POST, DELETE | Admin; announcements |
| `/api/admin/jobs` | GET, POST, DELETE | Admin; jobs |
| `/api/admin/coupons` | GET, POST, DELETE | Admin; coupons |
| `/api/admin/analytics/behavioral` | GET | Admin; validated range PostHog query |
| `/api/admin/videos` | GET, DELETE | Admin; usage-aware library/storage delete |
| `/api/admin/videos/upload-url` | POST | Admin; presigned upload + metadata/pointer |
| `/api/admin/videos/[id]/status` | GET | Admin; processing status |
| `/api/admin/videos/[id]/retranscode` | POST | Admin; S3 touch/reprocess |
| `/api/admin/videos/[id]/captions` | GET, POST, DELETE | Admin; validated VTT metadata/S3 |

There is no public REST course-list API: many reads live in server pages. There is no payment webhook, assessment endpoint, public integration API-key layer, notification API, or WhatsApp/Meta runtime implementation in the current source. The branch name alone does not establish an integration.

## N. Top 10 Issues Worth Addressing

These are findings for later prioritization, **not automatically fixed**.

| Priority | Issue | Why it matters / evidence |
|---|---|---|
| 1 | Bind lesson identity to the authorized course | Private notes/materials/live links can cross course boundaries; S1, lesson page |
| 2 | Authorize progress writes and clarify completion evidence | Current certificate integrity depends on self-written booleans without entitlement; S2, progress route/service |
| 3 | Remove protected future lesson fields from client outline payload | UI lock does not prevent client-data disclosure; S3, classroom layout |
| 4 | Make payment fulfillment recoverable/consistent | Paid flag can outlive failed enrollment; payment verify route and absence of webhook recovery |
| 5 | Consolidate completion/report/entitlement semantics | Bundle learners, expired access, rounding and certificate counts disagree across product/reporting; F/H/K |
| 6 | Enforce release and signing/session policy on every playback path | Legacy context omission, unsigned fallback and unused session verifier; S4/S7/S8 |
| 7 | Protect discussion reads/writes and validate replies/uploads | Known IDs expose discussions; unenrolled posting and weak attachment allowlist; S5/S9 |
| 8 | Make credential/invoice history and status truthful | Revoked/missing success screens, pending invoices, short/colliding identifiers, course deletion history loss; S12/F/J/K |
| 9 | Establish a data foundation before advanced learning features | No assessment/skills/attempt/tenant entities; previews can mislead future planning; G/L |
| 10 | Address payload/reporting scale and core journey test coverage | Full datasets/blobs, large modules, no E2E or DB integration coverage; J and validation appendix |

## O. Architecture Constraints for Future Development

1. **Current authentication identity is mobile OTP and a 30-day custom JWT.** It is not Supabase Auth or a role/permission framework. Admin guards requery persisted roles; future APIs must enforce their own checks because middleware excludes `/api/`.
2. **Commercial entitlement differs from learning enrollment.** Bundles are course rows containing other course rows; access is derived one level, not materialized child enrollment. Institution/trainer/course reports cannot count only enrollments and still represent effective learners accurately.
3. **A lesson completion bit is not a competency or assessment result.** Certificates currently mean all mutable current lesson bits true plus admin activation. Watch milestones and live schedules are not completion evidence; a later assessment engine cannot silently inherit grade semantics from these fields.
4. **Curriculum is mutable and unversioned.** Adding/deleting lessons changes current percentages and new eligibility; issued certificates keep prior qualification by existence. There is no frozen completion requirement or history to reconstruct past qualifications.
5. **Multiple routes currently implement policy.** Availability is centralized as a helper but repeated in playback/progress/preview branches; course identity and entitlement are inconsistently applied. A new screen using an existing API can inherit weaker gates than the page.
6. **Tenant isolation and trainer scopes are absent.** All admin capabilities are global. Author biographies and instructorId metadata do not provide isolation or an instructor working context.
7. **S3/MediaConvert provisioning is external.** Callback URL, shared secret, event wiring, job metadata, signing requirements, CORS, IAM and CDN policy must be established before assuming uploads/retranscodes/secure streaming function. No infrastructure definitions in this repository verify them.
8. **Assets have two storage models and fragile ownership.** Videos/captions are AWS assets; thumbnails/materials/PDFs are database data URLs. Videos are reusable by text pointer yet tied to an owning course cascade. Large future content/submissions will interact with these constraints.
9. **Side effects execute in web requests.** Bulk certificates/email/PDF/payment entitlement have no durable worker/outbox/retry history. Existing success state is not proof that every downstream operation succeeded.
10. **Reports are snapshots plus optional telemetry.** PostgreSQL current state and PostHog event counts have different trust/history/timeframe semantics. Report labels should not become specifications for future analytics without checking actual formulas.
11. **Application/database configuration is sensitive.** Neon/Drizzle is authoritative; legacy Supabase policies do not secure the current system. Versioned migrations and explicit human authorization govern database changes; `.env`/DATABASE_URL must never be presumed a safe test target.
12. **Tooling and validation are pinned.** Node 22, pnpm 11.15.1, existing dependency graph and local test suite are current constraints; no dependency/schema/service changes are authorized by this audit.

### Validation and audit closure

Executed locally, using the declared toolchain:

- `node --version`: `v22.23.1`.
- `pnpm --version`: `11.15.1`.
- **`pnpm validate` — passed (exit 0).** Five pure-test files passed; six Vitest route-test files with **52 tests** passed; `tsc --noEmit` passed; lint reported no warnings/errors. The lint command additionally printed the Next lint deprecation notice.
- Test safety inspected first: `tests/setup.ts` clears sensitive environment variables and blocks fetch unless explicitly mocked; route tests mock DB/service calls. These are local gate tests, not real integration verification.
- Read-only git status/inventory and source/call-site searches completed; initial tree clean. No dependency operation, DB query/migration/seed, build, deployment, browser acceptance test, private-service request, or destructive security probe was run.

**Changed file:** `LMS_CURRENT_STATE_AUDIT.md` only. Application source and configuration unchanged. Remaining limitations: actual DB state and migrated revision, live course offerings/users/role assignments, provider readiness, CDN/IAM/CORS/RLS settings, email/payment delivery, production deployment/performance, and browser/mobile journeys are **Not verified from the current codebase.** Findings remain unresolved by design. Audit ends here; no improvements were implemented.
