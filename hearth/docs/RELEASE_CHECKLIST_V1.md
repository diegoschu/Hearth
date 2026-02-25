# Hearth v1 Release Checklist

Use this checklist for **Release Candidate** and **Production Launch**.  
Mark each item as ✅ done, ⚠️ accepted risk, or ❌ blocked.

---

## A) Scope & Freeze

- [ ] v1 scope confirmed (no new features after freeze)
- [ ] All in-scope user flows mapped to test cases
- [ ] Open issues triaged by severity (Sev-1/2/3)
- [ ] No unresolved product-critical decisions

## B) Code & Quality Gates

- [ ] Backend tests pass (`cd backend && npm test`)
- [ ] Frontend build passes (`cd frontend && npm run build`)
- [ ] DB migration runs cleanly on fresh DB (`npm run migrate`)
- [ ] API contract spot-check vs `docs/API_SPEC.md` completed
- [ ] No Sev-1 defects open
- [ ] Sev-2 issues either fixed or explicitly accepted with workaround

## C) Auth & Security

- [ ] Google OAuth redirect URIs configured (local + prod)
- [ ] Authorized JS origins configured (local + prod)
- [ ] OAuth consent test users include all demo users (if in Testing mode)
- [ ] JWT secret is strong and set in production
- [ ] CORS `FRONTEND_URL` matches deployed frontend domain
- [ ] Protected routes reject unauthenticated requests (401)

## D) Environment & Configuration

## Backend (Railway or equivalent)
- [ ] `NODE_ENV=production`
- [ ] `PORT` configured/injected
- [ ] `FRONTEND_URL` set correctly
- [ ] `JWT_SECRET` set
- [ ] `DATABASE_URL` set and reachable
- [ ] `GOOGLE_CLIENT_ID` set
- [ ] `GOOGLE_CLIENT_SECRET` set
- [ ] `GOOGLE_REDIRECT_URI` set to production callback
- [ ] `ENABLE_POLLER` intentionally set (default false unless needed)
- [ ] Optional integrations set as intended (`RAPIDAPI_KEY`, `OPENAI_API_KEY`, etc.)

## Frontend (Vercel or equivalent)
- [ ] `VITE_API_BASE_URL` points to deployed backend
- [ ] Build output (`dist`) generated successfully

## E) Functional Smoke Tests (Production URL)

- [ ] Login via Google succeeds
- [ ] User can create family
- [ ] Second user can join family with invite code
- [ ] Source can be added and listed
- [ ] Feed shows items (or expected empty state)
- [ ] Confirm feed item updates status and creates calendar event
- [ ] Dismiss feed item updates status correctly
- [ ] Calendar page loads and shows expected events
- [ ] Digest page loads with valid summary
- [ ] Logout/session expiry behavior is sane

## F) Operational Readiness

- [ ] `GET /health` returns healthy
- [ ] `GET /ready` returns ready with DB connected
- [ ] Error logs reviewed for auth/db/integration failures
- [ ] Basic rate limiting behavior verified (no accidental lockout)
- [ ] Team has owner on-call for first 24h post-release

## G) Release Execution

- [ ] Release commit merged to `main`
- [ ] Release tag created (e.g., `v1.0.0` or `v1.0.0-rc1`)
- [ ] Backend deployed and validated
- [ ] Frontend deployed and validated
- [ ] Post-deploy smoke test rerun and passed

## H) Rollback Preparedness

- [ ] Prior known-good backend release identified
- [ ] Prior known-good frontend release identified
- [ ] Rollback steps documented and tested once
- [ ] Data migration rollback/forward-only strategy confirmed

## I) Signoff

- [ ] Frontend Owner signoff
- [ ] Backend Owner signoff
- [ ] Auth-Integration Owner signoff
- [ ] QA Owner signoff
- [ ] Final Go/No-Go decision recorded (timestamp + approver)

---

## Release Notes Template (fill before launch)

**Release version:**  
**Date/time (ET):**  
**Summary of shipped scope:**  
**Known issues / accepted risks:**  
**Rollback plan:**  
**Approvers:**
- Frontend:
- Backend:
- Auth-Integration:
- QA:
