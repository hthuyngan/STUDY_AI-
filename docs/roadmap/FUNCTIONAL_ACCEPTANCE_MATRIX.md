# FUNCTIONAL ACCEPTANCE MATRIX — AI TUTOR MATH 12 (ROUND 05)

> Updated: 2026-11-28 (Asia/Bangkok)

| Group | Scope | Status | Evidence & Notes |
|---|---|---|---|
| **ADMIN-R04** | `R03-01..03, 05, 08..10` | `VERIFIED` | Draft PR `#33`, `AdminFirstIntegrationTests`, `ADMIN_ROUND04_REPORT.md` |
| **ADM-04** | API Provider & Key Management | `BLOCKED (Design Gate)` | Preview UI isolated; awaiting owner approval |
| **ADM-05 / USER-09** | Subscriptions & Payments | `BLOCKED (Design Gate)` | Honest gated placeholder `LearnerSubscriptionsPage.tsx`; no real payment |
| **BASE-00 / BASE-01** | Math 12 6-Chapter Scope & Sidebars | `VERIFIED` | `math12Scope.ts`, `Sidebar.tsx`, `workspaceNavigation.ts`, Live E2E |
| **CONTENT-01..09** | Content Workspace Fullstack | `VERIFIED` (with `CONTENT-002` P2 noted) | 12 endpoints, `Math12ContentWorkspaceTests`, `ContentWorkspacePages.test.tsx`, Codex R2 `CONTENT-001` PASS |
| **TEACHER-01..08** | Teacher Workspace Fullstack | `IMPLEMENTED_UNVERIFIED` (R2 Codex `ERROR`) | 10 endpoints, `Math12TeacherWorkspaceTests` (incl. source+question publish gate), `TeacherWorkspacePages.test.tsx`, Live E2E |
| **USER-01..08, 10** | Learner Workspace Fullstack | `IMPLEMENTED_UNVERIFIED` (R2 Codex `ERROR`) | 3 endpoints, `CompletedAt != null` + `PublishResults` guard, `MyNotesPage.test.tsx`, `Math12UserWorkspaceTests`, Live E2E |
| **E2E-01..02** | Live 4-Role Browser E2E | `VERIFIED` | Playwright Chromium on Vite + .NET 10 + `StudyAIDb_Clean_{GUID}` (`0` console/page/5xx, `0` overflow) |
