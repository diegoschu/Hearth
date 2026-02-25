# Hearth Product Plan v1

**Version:** v1 (Family Demo-Ready)  
**Date:** 2026-02-25  
**Owner:** Product (Hearth)

---

## 1) Product Summary

Hearth helps families turn noisy parent communications (especially WhatsApp school/activity chats) into a shared, trustworthy action feed and family calendar.

For v1, Hearth should feel:
- **Safe for real families** (never “mystery auto-actions”)
- **Reliable enough to trust daily** (clear status, resilient ingestion, obvious errors)
- **Easy to start in minutes** (Google sign-in, create/join family, connect first source)
- **Demo-polished** (clean UX, understandable value in first 3 minutes)

Current app already includes core plumbing:
- Google OAuth
- Family create/join
- Source registration
- Message ingest + parse pipeline
- Feed review (confirm/dismiss)
- Calendar write-back + digest endpoints

v1 focuses on making this coherent, dependable, and presentable for family usage.

---

## 2) Target User & Use Cases

### Primary users
- **Two-parent households** coordinating kids’ school + activities
- One “planner parent” + one “support parent”
- Mobile-first usage (quick check-ins)

### Primary jobs-to-be-done
1. “Did we miss anything important from school/activity chats?”
2. “What needs review right now?”
3. “Can I confirm this event to calendar in one tap?”
4. “Who owns this event and do we have conflicts?”

### v1 use cases (must work)
- Parent logs in, creates family, shares invite code, second parent joins
- Parent connects one WhatsApp group source
- New message gets parsed into feed item
- Parent confirms item into calendar (or dismisses)
- Family sees conflict signal in calendar/digest
- Parent understands autonomy behavior and trust boundaries

---

## 3) v1 Product Principles

1. **Trust before automation**
   - Co-pilot behavior by default, explain why actions are/aren’t automatic.
2. **Clarity over completeness**
   - Show source, confidence, status, and next action plainly.
3. **Fast first value**
   - Time-to-first-meaningful-item under 10 minutes from signup.
4. **Reliability is a feature**
   - Fail loudly and helpfully; never silent data loss.
5. **Demo ≈ real experience**
   - Demo path should use real flows, not hidden/manual hacks.

---

## 4) Scope Definition

## In scope for v1
- OAuth sign-in and stable session boot
- Family lifecycle: create/join/view members
- Source lifecycle: list/add/remove + basic status/error visibility
- Poll + parse + dedupe + feed ingest
- Feed moderation: confirm/dismiss + optional adjustments
- Calendar write-through + unified view
- Daily digest endpoint + feed summary
- Autonomy settings UX with understandable labels
- Basic production readiness (health/readiness, migration safety, graceful error handling)
- Demo mode fixtures/seeding for predictable walkthrough

## Explicitly out of scope (v1)
- Native mobile apps
- Multi-language NLP tuning
- Rich notification center / push infra
- Purchasing/financial automations
- Advanced role/permission systems beyond family membership
- Full Gmail/GCal source ingestion parity beyond existing scaffolding

---

## 5) Current-State Gaps (from code + docs review)

1. **Onboarding UX is technical/minimal**
   - Frontend exposes raw JSON blocks; no guided setup flow.
2. **Autonomy model mismatch**
   - Docs describe category model (school/medical/etc.), DB defaults include unrelated categories (meals, inventory), and runtime logic reads per-user category in a way that may not map to parsed categories.
3. **Reliability observability gaps**
   - Source errors are stored but not surfaced in user-friendly status language.
4. **Feed trust UI gaps**
   - Confidence, parse quality, and reason for requiring review are not clearly presented.
5. **Demo polish gaps**
   - No clear first-run checklist, no success empty states, no “what happened” activity timeline.
6. **Missing INSTRUCTIONS.md**
   - Referenced file does not exist; product/engineering operating guidance should be consolidated.

---

## 6) v1 Experience Requirements

### A) Onboarding (first 10 minutes)
- After login, user sees a guided checklist:
  1) Create or join family
  2) Connect first source
  3) Verify first parsed item
  4) Confirm first calendar event
- Show clear completion states and next-step hints.

### B) Family operations core loop
- Feed is default landing view.
- Each item shows:
  - Source name/type
  - Raw message preview
  - Parsed event summary (title/date/time/location/category)
  - Confidence badge + status
  - Primary CTA (Confirm / Dismiss)
- Confirm flow allows light edits before write.

### C) Reliability & trust UX
- Source health visible (Connected / Delayed / Error + last poll).
- “Last successful sync” surfaced for feed/calendar.
- Any API failure returns user-readable recovery text.

### D) Calendar and conflict clarity
- Unified day/week list with owner labels.
- Conflicts shown with human suggestion text.
- Calendar sync action gives clear success/failure feedback.

### E) Demo polish
- Demo dataset script/seed path for predictable run.
- UI copy tuned for non-technical family audience.
- Empty states explain value and next step.

---

## 7) Prioritized Backlog (P0 / P1 / P2)

## P0 (Must-have before v1 signoff)
1. **Guided onboarding flow** (family + source + first feed action)
2. **Feed card redesign** (human-readable cards, confidence/status, strong CTAs)
3. **Source health panel** (status, last polled, last error humanized)
4. **Autonomy consistency fix** (taxonomy + settings + runtime logic aligned)
5. **Reliable error surfaces** (frontend banners + actionable backend error messages)
6. **Demo seed path** (scripted sample messages + calendar fixtures)
7. **Basic reliability guardrails**
   - idempotent poll processing maintained
   - retries and timeout handling visible
   - health/ready endpoints validated in deploy docs

## P1 (Should-have soon after v1)
1. **Assignment UX** in confirm flow (assign to parent before calendar write)
2. **Conflict resolution prompts** with suggested reassignment actions
3. **Digest view polish** (human summary, not raw JSON)
4. **Activity timeline/audit hints** (“Added by Hearth at 7:12 AM”)
5. **Better empty states + contextual education**

## P2 (Could-have / later)
1. Gmail source onboarding parity
2. Notification channel preferences
3. Household-level autonomy presets
4. Advanced parsing improvements (recurring events, inferred reminders)
5. Multi-family admin/switcher patterns

---

## 8) Non-Functional Requirements for v1

- **Availability target (demo/prod-lite):** 99% monthly API uptime for core endpoints
- **Latency target:** p95 < 1.5s for feed/calendar reads under normal load
- **Data safety:** no duplicate event creation from duplicate raw messages
- **Security baseline:** JWT auth on all `/api/*` routes, env var validation at boot
- **Operational readiness:** `/health` and `/ready` green before demo

---

## 9) v1 Success Metrics

### Activation
- ≥70% of new users complete onboarding checklist
- Median time-to-first-confirmed-event < 10 minutes

### Reliability
- <2% source polls end in unhandled error state
- 0 critical data-loss incidents in pilot/demos

### Product value
- ≥60% of parsed relevant items reviewed (confirm/dismiss) within 24h
- Positive qualitative trust signal: “I’d rely on this for school/event tracking” from pilot families

---

## 10) Release Readiness Checklist

- P0 backlog complete and accepted
- Acceptance criteria document fully passed
- Demo script tested end-to-end on fresh account
- Railway + Vercel production env vars validated
- Rollback plan documented (disable poller, preserve manual review mode)

---

## 11) Demo Narrative (3–5 min)

1. Log in with Google
2. Create family + show invite code/joined member
3. Connect WhatsApp source
4. Show new parsed feed item
5. Confirm to calendar (with optional edit)
6. Show conflict insight and digest summary
7. Show autonomy setting and explain trust boundary

**Takeaway line:** “Hearth turns chaotic family messages into a reliable review-and-calendar workflow you can trust.”
