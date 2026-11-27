# AI TUTOR — MATH 12 THREE-ROLE MASTER PLAN

> **Branch Baseline**: `feature/admin-first-fullstack` @ `8ec7cdc9` (built on `feature/backend-redesign-modular-monolith` @ `0143e2df`)
> **Protected Worktree**: `D:\TN` (`feature/p05-question-mapping-assessment-integrity`, 26 files preserved 100% untouched)
> **Scope**: **Toán lớp 12 ONLY** (6 official chapters; Grade 10/11 & non-Math subjects excluded from new learner/teacher/content UIs without physical deletion of legacy data)
> **Milestone**: `AI TUTOR — Math 12 Full-stack Completion` (GitHub Milestone #1)

## 1. Strategic Architecture & Dependencies

Execution order:
`ADMIN-R04` → `BASE` → `CONTENT` → `TEACHER` → `USER` → `E2E` → `RELEASE`

- **Frontend**: React 19, TypeScript, Vite, Bun, Lucide React, KaTeX, Recharts.
- **Backend**: .NET 10, ASP.NET Core, EF Core, SQL Server Clean Architecture.
- **Database Guard**: `StudyAIDb` untouched; all automated tests & E2E run strictly against `StudyAIDb_Clean_{GUID}`.
- **Dual-Agent**: Antigravity (Single-Writer Implementer) + Codex Local CLI (`gpt-6.1-sol` via `teamsoclo`, `read-only` sandbox).

## 2. Official Math 12 Curriculum Structure (6 Chapters)

1. **Chương 1**: Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số.
2. **Chương 2**: Vectơ và hệ tọa độ trong không gian.
3. **Chương 3**: Các số đặc trưng đo mức độ phân tán của mẫu số liệu ghép nhóm.
4. **Chương 4**: Nguyên hàm và tích phân.
5. **Chương 5**: Phương pháp tọa độ trong không gian.
6. **Chương 6**: Xác suất có điều kiện.

## 3. Master Workstream Ledger (42 Task Groups)

| Phase | Task Groups | Count | Current State |
|---|---|---|---|
| **ADMIN-R04** | `R03-01` .. `R03-10` | 10 | In Final Review (`#32`, Draft PR `#33`; ADM-04/05 gated) |
| **BASE** | `BASE-00` (Full Audit), `BASE-01` (Math 12 Foundation & Shared UI) | 2 | `IN_PROGRESS` |
| **CONTENT** | `CONTENT-01` .. `CONTENT-09` | 9 | `TODO` |
| **TEACHER** | `TEACHER-01` .. `TEACHER-08` | 8 | `TODO` |
| **USER** | `USER-01` .. `USER-10` | 10 | `TODO` |
| **E2E** | `E2E-01` (Academic Workflow), `E2E-02` (Admin & AI Workflow) | 2 | `TODO` |
| **RELEASE** | `RELEASE-01` (Full Quality Gates & Final Delivery Report) | 1 | `TODO` |
| **Total** | | **42** | |

## 4. Non-Negotiable Quality & Security Contracts

1. **Zero Runtime Mocks**: All dashboards, analytics, practice, exams, RAG, and AI tutors query real SQL Server / backend services. Missing modules return explicit unavailable/empty states.
2. **Strict RBAC & Ownership**: Enforced in ASP.NET Core controllers & services (`AdminOnly`, `ContentStaff`, `StaffOnly`, `LearnerOnly` + resource ownership checks).
3. **Assessment Integrity**: Backend-enforced timers, server-side grading, no answer leakage before submission/publish, pinned question snapshots so bank edits never mutate historical scores.
4. **Sidebar & UI Consistency**: Uniform sidebar structure across Content, Teacher, and User; empty bottom sidebar; account management in header avatar dropdown; no emoji icons; responsive at `1440×900`, `1280×800`, `768×1024`, `390×844`.
