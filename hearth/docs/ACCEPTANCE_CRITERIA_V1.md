# Hearth v1 Acceptance Criteria

**Version:** v1  
**Date:** 2026-02-25  
**Companion doc:** `docs/PRODUCT_PLAN_V1.md`

---

## 1) Acceptance Rules

- “Done” means criteria are testable and pass in a clean environment.
- P0 items are release-blocking.
- All user-facing errors must be understandable without reading logs.

---

## 2) P0 Acceptance Criteria (Release Blocking)

## AC-P0-01 — Guided onboarding checklist exists and is usable
**Given** a newly authenticated user with no family  
**When** they land in the app  
**Then** they see a step-by-step setup checklist for:
1) Create/join family, 2) Connect source, 3) Review first feed item, 4) Confirm first event.

**Pass conditions**
- Checklist progress updates after each completed step.
- User can complete all steps without leaving app context.
- Completion state persists after refresh.

---

## AC-P0-02 — Family creation/join flow is complete
**Given** User A logged in  
**When** User A creates a family  
**Then** an invite code is displayed and stored.

**Given** User B logged in  
**When** User B joins with a valid invite code  
**Then** both members are visible in family view.

**Pass conditions**
- Invalid invite code returns friendly error message.
- Family membership reflects immediately on reload.

---

## AC-P0-03 — Source registration and health visibility
**Given** a family member on Sources screen  
**When** they add a supported source (whatsapp/gmail/gcal)  
**Then** source appears with status metadata.

**Pass conditions**
- Source row includes type, name, status, last polled, and last error (if any).
- Error state uses human-readable message (not raw stack trace).
- Removing a source removes it from list on reload.

---

## AC-P0-04 — Feed card trust + action UX
**Given** parsed feed items exist  
**When** user opens Feed  
**Then** each item is shown as readable card (not raw JSON blob).

**Pass conditions**
- Card displays source, raw message preview, parsed summary, confidence, and status.
- Pending items show Confirm + Dismiss actions.
- Non-pending items show disabled/alternate state with final status.

---

## AC-P0-05 — Confirm and dismiss actions are reliable
**Given** a pending feed item  
**When** user confirms it  
**Then** calendar event is created and feed status updates.

**Given** a pending feed item  
**When** user dismisses it  
**Then** status becomes dismissed and item is removed from pending count.

**Pass conditions**
- Confirm endpoint returns calendar event id.
- Pending count decreases correctly after action.
- Duplicate confirm action does not create duplicate calendar event.

---

## AC-P0-06 — Autonomy model is consistent across docs, DB, runtime
**Given** category-based autonomy settings  
**When** parsed event category is evaluated  
**Then** effective level follows one shared taxonomy and rule set.

**Pass conditions**
- Settings categories align with parser categories (or clear mapping exists and is documented).
- Runtime logic does not depend on orphan categories unrelated to parser output.
- Medical and low-confidence guardrails are enforced as documented.

---

## AC-P0-07 — Reliability/error handling baseline
**Given** a backend/API failure (e.g., external provider timeout)  
**When** user performs affected action  
**Then** they receive actionable recovery guidance.

**Pass conditions**
- No silent failures in key flows (onboarding, source add, feed actions, calendar sync).
- `/health` and `/ready` both return success in healthy environment.
- Retries/timeouts for upstream WhatsApp calls are in place and non-retryable auth errors are marked clearly.

---

## AC-P0-08 — Demo seed path supports predictable walkthrough
**Given** a clean demo environment  
**When** operator runs seed/setup instructions  
**Then** at least 3 representative feed items and 1 conflict scenario are available.

**Pass conditions**
- Demo script documented in repo.
- Seeded data supports full 3–5 minute narrative end-to-end.

---

## 3) P1 Acceptance Criteria (Post-v1 target)

## AC-P1-01 — Assignment in confirm flow
- User can assign confirmed event to self or another family member before calendar write.
- Assignment is visible in feed and calendar owner display.

## AC-P1-02 — Conflict guidance is actionable
- Conflict cards provide at least one specific suggested resolution.
- User can apply suggestion or defer.

## AC-P1-03 — Digest is user-grade
- Digest renders as readable summary sections (Today / Needs Attention / This Week).
- Not presented as raw JSON in primary UI.

## AC-P1-04 — Audit/activity trail
- System surfaces key actions with timestamp and actor (“auto-confirmed”, “dismissed by”).

---

## 4) P2 Acceptance Criteria (Future)

## AC-P2-01 — Gmail parity onboarding
- Gmail source can be connected and appears in same health model.

## AC-P2-02 — Notification preferences
- Family users can set daily digest and urgent conflict notification preferences.

## AC-P2-03 — Advanced parser confidence UX
- UI exposes “why confidence is low” hints and enables better correction loops.

---

## 5) QA Test Matrix (Minimum)

- Fresh user onboarding (no family)
- Existing user with family but no sources
- Existing user with source errors
- Confirm/dismiss with intermittent network failure
- Calendar sync with expired Google tokens
- Duplicate raw message ingestion scenario
- Multi-member family visibility scenario

All P0 criteria must pass across local + deployed demo environment.
