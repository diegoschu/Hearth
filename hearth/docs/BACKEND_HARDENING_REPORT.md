# Backend Hardening Report

Date: 2026-02-25
Scope: `backend/` production-demo hardening only (no frontend changes)

## What was hardened

### 1) Startup, env validation, and health/readiness
- Refactored backend bootstrap in `backend/src/index.js` to expose:
  - `createApp()`
  - `start()`
  - `validateStartupEnv()`
  - `maybeAutoMigrate()`
- Added `require.main === module` guard so tests can import app/bootstrap utilities without auto-starting the server.
- Kept explicit required env validation at startup (`JWT_SECRET`, `FRONTEND_URL`, `DATABASE_URL`) with clear fatal logs.
- Improved `/health` and `/ready` payloads:
  - include DB status and readiness checks
  - return 503 with structured data on degradation

### 2) Database config hardening
- Updated `backend/src/config/database.js` to avoid throwing at module-import time.
- Added safer lazy behavior:
  - exports `isDbConfigured`
  - `query()` throws structured `AppError` (`DB_NOT_CONFIGURED`) when DB is missing.
- This improves testability and avoids brittle startup failures caused by import side effects.

### 3) Migration/idempotency reliability
- Added advisory lock around schema application in both:
  - `backend/src/config/migrate.js`
  - startup auto-migration in `backend/src/index.js`
- Lock used: `pg_advisory_xact_lock(hashtext('hearth_schema_migration'))`
- Result: safer concurrent deploy starts and idempotent schema application behavior.

### 4) Route stabilization and error handling
Hardened route validation and failure modes for the requested backend areas:

- `family.routes.js`
  - validate family name on create
  - prevent creating a second family when user already belongs to one
  - validate invite code presence
  - explicit `FAMILY_NOT_FOUND` path

- `source.routes.js`
  - enforce structured errors via `AppError`
  - normalize label
  - `DELETE /:id` returns `SOURCE_NOT_FOUND` when no row deleted

- `feed.routes.js`
  - family-less users get safe empty feed response
  - validate `status` filter enum
  - clamp pagination bounds (`limit`, `offset`)
  - validate confirm date/time format
  - `dismiss` returns `NOT_FOUND` when no row updated

- `calendar.routes.js`
  - family-less users get safe empty calendar response on GET
  - `sync` requires family context (`FAMILY_REQUIRED`)
  - validates date query format (`YYYY-MM-DD`)

- `settings.routes.js`
  - validate autonomy category and level with explicit error codes

- `digest.routes.js`
  - require family membership (`FAMILY_REQUIRED`)

## Tests added/expanded

Added new hardening tests:

- `backend/src/routes/routes.hardening.test.js`
  - validates route-level error handling and input checks for:
    - family
    - sources
    - feed
    - calendar
    - settings
    - digest

- `backend/src/index.hardening.test.js`
  - validates startup env enforcement behavior
  - validates migration advisory lock execution sequence

Existing test retained:
- `backend/src/services/parser.service.test.js`

## Test run result

Command:
- `cd backend && npm test -- --runInBand`

Result:
- Test Suites: **3 passed, 3 total**
- Tests: **11 passed, 11 total**

## Files changed

- `backend/src/index.js`
- `backend/src/config/database.js`
- `backend/src/config/migrate.js`
- `backend/src/routes/family.routes.js`
- `backend/src/routes/source.routes.js`
- `backend/src/routes/feed.routes.js`
- `backend/src/routes/calendar.routes.js`
- `backend/src/routes/settings.routes.js`
- `backend/src/routes/digest.routes.js`
- `backend/src/routes/routes.hardening.test.js` (new)
- `backend/src/index.hardening.test.js` (new)
- `backend/package.json` (dev dependency)
- `backend/package-lock.json`
- `docs/BACKEND_HARDENING_REPORT.md` (new)
