# Changelog

All notable changes to AirBharath LMS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-09-22

### Added
- **Authentication & User Management**:
  - Phone OTP verification login system with MSG91 SMS gateway integration.
  - JWT session management via signed, secure `httpOnly` cookies (`jose`).
  - Role-based authorization (`student` and `admin`) with middleware protection.
  - Redis-backed active session management and limits.
- **Curriculum & Video Pipeline**:
  - Course catalog, detail overview, and curriculum syllabus modules.
  - AWS MediaConvert transcode pipeline producing multi-bitrate HLS streams (`.m3u8`).
  - HLS.js video player with adaptive bitrate, playback speed controls, keyboard shortcuts, and full-screen support.
  - Dynamic student watermarking overlay (phone/email) to prevent content piracy.
  - Granular lesson progress tracking and lesson completion verification.
- **E-Commerce & Billing**:
  - Razorpay payment order creation and webhook/client verification.
  - Automated GST-compliant PDF invoice generation (`pdf-lib`) and download routes.
  - Discount coupon creation, validation, and usage tracking.
- **Certificate Lifecycle Architecture**:
  - Two-tier certificate eligibility requiring 100% curriculum completion.
  - Course-level certificate state controls (`disabled`, `active`, `paused`).
  - Lazy student self-service claim workflows with Mailercloud email delivery.
  - Admin individual and bulk certificate issuance.
  - Public certificate verification page (`/verify-certificate/[id]`) with QR code generation.
- **Product & Learning Analytics**:
  - PostHog client and server-side product telemetry integration.
  - 7-stage full-lifecycle conversion funnel (*Course Viewed* $\rightarrow$ *Certificate Claimed*).
  - Learning analytics with neutral syllabus completion rankings.
  - Multi-range date filtering (`7d`, `30d`, `90d`, `all`) and CSV export.
  - Resilient query fallback displaying database truth when telemetry is unavailable.
- **Administrative & Student Workspaces**:
  - Student learning dashboard with progress stats, enrolled courses, doubts Q&A, and community feed.
  - Dedicated admin portal with course editor, video uploader, student directory, doubts management, and jobs board.
- **Application Versioning**:
  - Canonical version source of truth in `package.json` exposed via `lib/app-version.ts`.
  - Cache-safe public health endpoint at `GET /api/version`.
  - Subtle application version indicators in student and admin navigation surfaces.

---

## Versioning Policy

AirBharath LMS follows Semantic Versioning (`MAJOR.MINOR.PATCH`):

- **MAJOR (`X.0.0`)**: Incompatible API changes, major product re-architectures, or breaking database schema migrations.
- **MINOR (`0.X.0`)**: Backward-compatible new features, new portal sections, or major workflow additions.
- **PATCH (`0.0.X`)**: Backward-compatible bug fixes, security patches, minor UI refinements, and performance tuning.

---

## Release Workflow

When cutting a new release:

1. **Update Version**: Bump `"version"` in `package.json` to the target SemVer tag (e.g. `0.2.0`).
2. **Update Changelog**: Add release notes under a new version heading in `CHANGELOG.md` (`Added`, `Changed`, `Fixed`, `Security`).
3. **Validate Codebase**:
   ```bash
   npx tsc --noEmit
   npm run lint
   npm run build
   ```
4. **Tag Release**:
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   ```
5. **Deploy & Verify**:
   - Verify deployment build status.
   - Test `GET /api/version` endpoint to confirm updated version metadata.
