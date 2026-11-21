# ADR: Support Workspace & Customer Support Ticketing Scope Boundary (Phase L02 vs. L03)

- **Status:** Accepted
- **Date:** 2026-11-21
- **Deciders:** STUDY_AI Core Architecture Team
- **Context:** Phase L02 Math 10–12 Integrated Delivery & Post-L02 Hardening

---

## 1. Context and Problem Statement

During the development of STUDY_AI Phase 18 and earlier vertical slices, several prototype files referenced a "Support Workspace" (e.g., `/support`, `/support/tickets`, `/admin/support-monitor`) with simulated localStorage ticket queues, hardcoded mock customer issues, and fake status transitions.

In Phase L02 (Math 10–12 Integrated Learner AI Fullstack), our mandate is to eliminate all mock data, prototype fixtures, and fake simulation states on authenticated routes, ensuring that every user-facing surface reflects authoritative SQL Server truth with strict role-based access control (RBAC).

We needed an explicit architectural decision on whether the Support Ticketing workspace belongs to Phase L02 or should be formally deferred to a subsequent phase, and how routes targeting `/support/*` must be governed.

---

## 2. Decision Drivers

1. **Pedagogical Core Priority:** Phase L02 focuses on delivering the high-school mathematics curriculum (Toán 10, 11, 12 GDPT 2018), authentic assessment engines, adaptive learning pathways, teacher classroom assignments, content review/rollback workflows, and administrative account governance.
2. **Zero Mock Invariant:** AGENTS.md mandates that no authenticated route may present fabricated statistics or mock fallback state as official data. Implementing a half-baked mock support ticketing system violates assessment and platform integrity.
3. **Database Schema & Separation of Concerns:** Database tables for learner attempts, lesson progress, content hierarchy, staff audit logs, and classrooms are fully implemented in `StudyAIDb_E2E`. A dedicated customer ticketing schema with SLA tracking, attachment scanning, and ticket routing is not part of the L02 database migrations.

---

## 3. Decision

1. **Defer Support Ticketing to Phase L03:**
   - The standalone Support Workspace and ticketing lifecycle (ticket submission, queue triage, canned responses, SLA metrics) are declared **OUT OF SCOPE for Phase L02**.
   - They are scheduled for implementation in **Phase L03 (Platform Customer Support & Ticketing Lifecycle)** upon completion of a full schema migration and security audit.

2. **Clean Fail-Closed Route Handling:**
   - All client routes matching `/support` or `/support/*` in `frontend/src/App.tsx` are configured to cleanly redirect to `/dashboard` using `<Navigate to="/dashboard" replace />`.
   - The legacy admin subroute `support-monitor` in `frontend/src/routes/adminRoutes.tsx` safely redirects to `/admin`.
   - Navigation menus (Learner, Teacher, Content, Admin) do not display non-functional support links.
   - Learner feedback and contextual inquiries are directed through the authentic **AI Tutor** (`/ai-tutor`) and verified learning context mechanisms.

---

## 4. Consequences

### Positive
- **Zero Mock Purity:** No fake ticket queues or simulated localStorage mutations exist in production or authenticated staff builds.
- **Security & Integrity:** Eliminates the risk of false success where support requests appear "submitted" or "resolved" without an authoritative database record.
- **Focus:** Concentrates system verification on the GDPT 2018 mathematics curriculum, live teacher assignments, and content governance.

### Negative / Trade-offs
- Users navigating directly to `/support` URLs will be smoothly redirected to `/dashboard` rather than seeing a dedicated ticketing helpdesk until Phase L03 is implemented.
