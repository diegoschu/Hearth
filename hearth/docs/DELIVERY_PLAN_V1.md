# Hearth v1 Delivery Plan (1–2 Weeks)

**Target:** Ship a user-grade v1 for external demo users in **10 calendar days (2 work weeks)**, with a possible fast-path in 7 days if blockers are clear.

**Scope baseline (must-work flows):**
1. Google OAuth login
2. Family create/join via invite code
3. Source registration (WhatsApp/Gmail/GCal)
4. Feed review (pending/confirm/dismiss)
5. Calendar sync on confirm
6. Digest view
7. Production deployment (frontend + backend) + health/readiness + basic observability

---

## 1) Team Ownership Model

| Area | Owner | Primary Responsibilities | Backup |
|---|---|---|---|
| Frontend | **Frontend Owner** | UX polish, route guards, forms/errors, feed/calendar/digest views, mobile responsiveness | QA Owner |
| Backend | **Backend Owner** | API correctness, DB migrations, feed parsing flow, confirm/dismiss semantics, readiness/health | Auth-Integration Owner |
| Auth Integration | **Auth-Integration Owner** | Google OAuth end-to-end, JWT/session handling, environment/config correctness across local + prod | Backend Owner |
| QA | **QA Owner** | test matrix execution, bug triage, regression verification, release signoff evidence | Frontend Owner |

> If specific people are assigned later, replace role labels above with names.

---

## 2) Milestones and Timeline

## Milestone M0 — Planning Lock (Day 0)
**Goal:** Freeze v1 scope and acceptance criteria.

**Deliverables**
- v1 feature list frozen (in-scope vs out-of-scope)
- Environment checklist confirmed (Google OAuth, Railway, Vercel, DB)
- Ownership and daily check-in cadence confirmed

**Exit Criteria**
- No unresolved “what is v1?” questions
- All required credentials/config owners identified

---

## Milestone M1 — Core Product Hardening (Days 1–4)
**Goal:** Make critical flows reliably functional in local + staging.

**Frontend (Owner: Frontend)**
- Validate UX flow: login → family create/join → sources → feed actions → calendar/digest
- Add explicit loading/error/empty states on all core pages
- Ensure mobile-safe layout and no route dead-ends

**Backend (Owner: Backend)**
- Validate all endpoints in API spec for expected success + error behavior
- Enforce API input validation for family/source/feed actions
- Ensure feed confirm reliably writes calendar event + status transition
- Ensure readiness endpoint fails when DB unavailable

**Auth Integration (Owner: Auth-Integration)**
- Verify OAuth callback flow in local + deployed environments
- Validate token handling (`/auth/me`, protected routes)
- Validate allowed origins/redirect URIs and test-user setup

**QA (Owner: QA)**
- Draft and begin running the test matrix (happy path first)
- Open/triage defects by severity

**Exit Criteria**
- Happy-path E2E scenario passes in staging
- No Sev-1 defects open

---

## Milestone M2 — Integration + Stability (Days 5–7)
**Goal:** Reduce operational and integration risk before release candidate.

**Deliverables**
- Fixed top-priority defects from M1
- Staging smoke tests repeatable and documented
- Basic operational guardrails verified (rate limit behavior, health/readiness checks)
- Deployment runbook validated once end-to-end

**Exit Criteria**
- All core flows pass twice consecutively in staging
- Sev-1 = 0, Sev-2 either resolved or explicitly accepted with workaround

---

## Milestone M3 — Release Candidate + Go/No-Go (Days 8–10)
**Goal:** Produce release candidate and perform launch decision.

**Deliverables**
- Tagged release candidate commit
- Full regression pass (core + critical edge cases)
- Release checklist completed
- Rollback steps validated

**Exit Criteria (Go decision)**
- All blockers closed
- OAuth + deployment + health/readiness verified in production
- Monitoring checks green after deploy window

---

## 3) Detailed Work Breakdown by Owner

## Frontend Owner
- Ensure authentication gating and redirect behavior are correct
- Improve reliability states: loading, empty, recoverable error UI
- Validate family + source management UX copy and form validation
- Confirm feed action UX clearly communicates result (confirmed/dismissed)
- Verify mobile view for primary user journey

## Backend Owner
- Validate API contract against `docs/API_SPEC.md`
- Add/verify request validation and consistent error payloads
- Verify DB migration path is reproducible from clean state
- Confirm `/health` and `/ready` semantics are accurate
- Confirm production-safe config defaults (`ENABLE_POLLER=false` unless intended)

## Auth-Integration Owner
- Validate Google OAuth app config (origins, redirect URI)
- Verify callback and JWT flow across local/staging/prod
- Test non-authorized/test-user errors and ensure clear messaging
- Confirm secrets and env variable completeness in deploy platforms

## QA Owner
- Maintain test matrix and test evidence
- Own severity tagging and defect triage cadence
- Run full regression at RC phase
- Provide final release recommendation with evidence links

---

## 4) Risk Register

| ID | Risk | Probability | Impact | Mitigation | Owner | Trigger / Signal |
|---|---|---:|---:|---|---|---|
| R1 | OAuth misconfiguration (redirect/origin/test users) blocks login | Med | High | Validate config day 1 in staging + production dry-run | Auth-Integration | Login callback errors / 4xx from Google |
| R2 | DB migration drift or schema mismatch | Med | High | Run clean migration test in CI-like environment; freeze schema late week 1 | Backend | Migrate fails on fresh DB |
| R3 | Feed confirm does not create calendar event reliably | Med | High | Add integration tests + manual E2E checklist for confirm flow | Backend | Confirm returns success but no event in calendar |
| R4 | External adapters (WhatsApp/Gmail/GCal) unstable or rate-limited | Med | Med/High | Retry/backoff strategy + graceful error states + fallback demo data | Backend | Source sync failures spike |
| R5 | Frontend mobile UX breakage hurts demo usability | Med | Med | Device-width smoke tests and responsive fixes by M2 | Frontend | Core CTA inaccessible on phone |
| R6 | Release regressions due to short timeline | High | High | Strict smoke + regression gates, no unscoped features after M1 | QA | New defects in previously passing flows |
| R7 | Environment secret/config mismatch between Railway/Vercel | Med | High | Env var checklist with 4-eyes verification pre-release | Auth-Integration | Prod health/readiness fail after deploy |

---

## 5) Test Matrix (Execution-Oriented)

| Area | Scenario | Type | Owner | Priority | Pass Criteria |
|---|---|---|---|---|---|
| Auth | OAuth login success (local/staging/prod) | E2E | Auth-Integration + QA | P0 | User receives JWT and lands in app |
| Auth | Unauthorized access to protected route | API/UI | Backend + Frontend | P0 | 401 + redirect/login prompt |
| Family | Create family and retrieve details | API/E2E | Backend + QA | P0 | Family persisted; invite code returned |
| Family | Join family with valid/invalid invite code | API/E2E | Backend + QA | P0 | Valid joins; invalid gives clear error |
| Sources | Register/list/delete source | API/E2E | Backend + Frontend | P0 | Source lifecycle works without data corruption |
| Feed | Feed list pagination + status filtering | API/UI | Backend + Frontend | P1 | Correct counts/items by status |
| Feed | Confirm item creates calendar event | Integration/E2E | Backend + QA | P0 | Status changes + calendar event exists |
| Feed | Dismiss item hides from pending list | Integration/E2E | Backend + QA | P0 | Status transitions to dismissed |
| Calendar | Calendar range query + conflict surfacing | API/UI | Backend + Frontend | P1 | Events grouped by date, conflicts visible |
| Digest | Digest endpoint renders expected summary | API/UI | Backend + Frontend | P1 | Non-empty valid payload for active family |
| Ops | `/health` + `/ready` with DB up/down | Ops/API | Backend | P0 | Correct liveness/readiness behavior |
| Deploy | Railway + Vercel deploy from main | Release | Backend + Frontend + QA | P0 | Public app usable end-to-end |

**Severity policy:**
- **Sev-1:** blocks login/core flow, data loss/corruption, crash
- **Sev-2:** major degradation with workaround
- **Sev-3:** minor issue, cosmetic, non-blocking

---

## 6) Delivery Cadence (Recommended)

- **Daily 15-minute standup:** blockers, defect burndown, risk updates
- **Daily build check:** backend tests + frontend build must stay green
- **Triage twice daily:** prioritize Sev-1/Sev-2
- **Scope freeze after M1:** only bug fixes and release hardening

---

## 7) Definition of Done for v1

v1 is done when:
1. All P0 scenarios in test matrix pass in production
2. Sev-1 defects = 0 and accepted Sev-2 documented
3. Release checklist completed and signed by owners
4. Rollback path documented and verified
5. Demo users can complete full journey on phone without operator intervention

---

## 8) Out of Scope for v1 (to protect schedule)

- Advanced autonomy tuning beyond current settings endpoints
- Deep analytics/reporting dashboards
- Non-critical UI redesigns
- New source types beyond current planned adapters

Keep v1 focused on reliability, not breadth.
