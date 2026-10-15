# AirBharath LMS

## Local tooling

- Use Node.js 22 and pnpm 11.15.1. Other package managers are not supported.
- Install the locked dependency graph with `pnpm install --frozen-lockfile`.
- Run the local security tests, typecheck, and lint with `pnpm validate`.

Database commands and integrations with external services require explicit authorization and environment-specific configuration. Do not run seeds or migrations, or contact production/private services, as part of routine validation.

## Continuous integration

Pull requests and pushes to `main` run a validation-only GitHub Actions workflow. CI installs with `pnpm install --frozen-lockfile`, runs `pnpm validate`, and intentionally receives no production or application credentials.
