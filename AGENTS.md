# AirBharath LMS Agent Rules

## Project

AirBharath LMS is a Next.js 15 App Router application using strict TypeScript, PostgreSQL, Drizzle ORM, AWS integrations, Upstash Redis, Razorpay, MSG91, Mailercloud, and PostHog.

## Working discipline

- Inspect the existing implementation before editing. Prefer the smallest change that satisfies the task.
- Preserve user changes. If the working tree contains unexpected modifications, stop and report them; never overwrite them.
- Keep work within the requested phase. Do not redesign unrelated systems or silently fix unrelated findings.
- At phase end, review `git diff`, report every changed file, validations actually run, and unresolved issues, then stop.

## Production and external-service safety

Treat every environment and service target as potentially production-sensitive. Unless the current task explicitly authorizes the exact operation, do not:

- access production databases or run production queries;
- push schemas, migrate, seed, reset, truncate, or run destructive SQL against production;
- deploy, change DNS or infrastructure, or modify production AWS or Redis resources;
- access production Razorpay, MSG91, Mailercloud, Supabase, Meta/WhatsApp, or other private services;
- rotate credentials or expose secrets.

Keep network access restricted by default. Contact external/private services only when the task requires it and approval has been granted.

## Database safety

- Neon PostgreSQL and Drizzle ORM are authoritative. Treat Supabase artifacts as legacy and unverified.
- Treat `DATABASE_URL` as production-sensitive; never assume or invent a safe database target.
- Database operations require explicit task authorization. Seed and other destructive operations also require the repository's environment and acknowledgement guards.
- Use reviewed, versioned Drizzle migrations. Production migrations require explicit human authorization; direct schema push is not the production workflow.

## Secrets

- Treat tracked and ignored files as sensitive. Never print, report, copy, move, or commit secret values.
- Never commit `.env` files or copy credentials into source files.
- Protect tokens, passwords, API keys, cookies, service-role keys, and private keys.
- If a credential is discovered, report only its file/location and credential type, with the value redacted.

## Dependencies

- Use the repository-declared pnpm version; do not use npm, yarn, or bun for dependency operations.
- Do not install, remove, or upgrade dependencies or regenerate `pnpm-lock.yaml` without explicit authorization.
- Run `pnpm validate` before reporting implementation work complete when the task permits local validation.

## Git

Read-only inspection commands such as `git status`, `git diff`, `git log`, `git show`, and `git branch --show-current` are allowed.

Commit, push, merge, rebase, reset, clean, checkout over user changes, tag, and force-push operations require explicit authorization.

## Application security

Security-sensitive behavior must fail closed, including authentication, authorization, payment and webhook verification, and admin actions. Never weaken a security control to simplify development.

## Validation

Use repository-provided validation commands during implementation phases. Report only checks that actually completed successfully. If a check cannot be run safely, report that limitation explicitly.
