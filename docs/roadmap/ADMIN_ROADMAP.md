# AI TUTOR — ADMIN FIRST FULLSTACK ROADMAP

> Branch: `feature/admin-first-fullstack` (isolated worktree `D:\TN-admin-first`, branched from `feature/backend-redesign-modular-monolith` @ `0143e2df`)
> P05 changes in `D:\TN` are 100% preserved and untouched.

## 1. Strategic Priority Shift: Admin First

Role **Administrator** is prioritized before remaining learner/teacher/content phases so that all platform governance, user/RBAC management, real-time telemetry, AI provider governance, subscription entitlement, support operations, and curriculum oversight are backed by real `.NET 10 + EF Core + SQL Server` endpoints and `React 19 + TypeScript` enterprise UI.

## 2. Workstreams & Approval Gates

| Phase | Scope | Design Approval Gate | Dependencies | Target State |
|---|---|---|---|---|
| **ADM-00** | Admin Design System & Navigation | No | None | Standardized layout, sidebar groups (`Tổng quan`, `Người dùng`, `Học tập`, `Dịch vụ`, `Hệ thống`), UI primitives (`AdminDetailDrawer`, `IconButton`, `SearchInput`, `StatusBadge`, `FormField`, `ErrorState`, `LoadingState`) |
| **ADM-01** | Dashboard Rebuild | No | ADM-00 | Real aggregated SQL metrics (users, learning, practice, assessments, AI usage/tokens/error rate, support tickets, recent activities), bar charts, `7d`/`30d`/`90d`/custom date range, explicit "Chưa có dữ liệu" for unimplemented billing/subscription |
| **ADM-02** | User Management | No | ADM-00 | Compact DataTable + DetailDrawer, server-side search/filter/sort/pagination, CRUD, role change, lock/unlock, password reset request, last-admin protection, audit log |
| **ADM-03** | Role & Permission Matrix | No | ADM-02 | Matrix UI grouped by domain, FE/BE RBAC alignment, role-level vs ownership/resource-level clarity, core admin protection, session revocation on role change, cross-role auth tests |
| **ADM-04** | API & AI Provider Management | **REQUIRED (Design Mockup First)** | ADM-00 | Phase A: Mockup UI (Provider List, Config, Usage Analytics) for owner approval. Phase B (post-approval): Encrypted secret storage, SSRF-safe Base URL, connection test, primary/fallback, rate limit, budget |
| **ADM-05** | Subscription & Quota Management | **REQUIRED (Design Mockup First)** | ADM-00 | Phase A: Mockup UI (Free 0đ/10 lượt, Plus 49k/100 lượt, Pro 99k/300 lượt) for owner approval. Phase B (post-approval): Plans, entitlements, atomic quota checks, history |
| **ADM-06** | Support Center (Fullstack) | No | ADM-00, ADM-02 | `SupportTicket` & `SupportTicketMessage` entities + EF migration, User ticket creation/reply/history (strict ownership), Admin triage/assign/priority/status/reply + audit |
| **ADM-07** | Curriculum & Content Oversight | No | ADM-00 | Audit & polish Math 10–12 chapters/lessons/question bank/import/AI review/publish without breaking P05 question mapping or non-Math scope |
| **ADM-08** | System Administration | No | ADM-00 | Audit logs, system announcements, AI usage & provider health monitoring, system settings, CSV/JSON report export |

## 3. Non-Negotiable Safety & Quality Rules

- **Database Guard**: Never write, migrate, seed, or test against `StudyAIDb` or `StudyAIDb_E2E`. All automated tests run strictly on disposable `StudyAIDb_Clean_{GUID}`.
- **No Production Mocks**: Zero hardcoded production metrics or fake success states. Unavailable modules return explicit `null` / `isAvailable: false` and render honest empty/unavailable states.
- **Dual-Agent Workflow**: Antigravity is the single-writer implementer; Codex CLI (`gpt-6.1-sol` via `teamsoclo`, `read-only` sandbox) performs independent review per logical changeset.
