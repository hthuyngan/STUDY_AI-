# TASK — ChatGPT → Antigravity

- Task ID: **P20-001**
- Title: **Phase 20 — Teacher, Classroom, Assignment & Submission Backend + Frontend Integration**
- Status: **READY — USER APPROVED**
- Owner: Antigravity
- Baseline: `9b7c3b94f95aaa052bad16c60fd29ceb4d5a1287` (verify latest origin/main before coding)
- Workspace: `E:\AI_tutor`
- Predecessor: P20-000 **APPROVED WITH DATABASE BASELINE FOLLOW-UP** in `REVIEW.md`
- Stop gate: no Phase 21; no unrelated changes.

## 0. Mandatory preflight / DB safety
1. Check git status, branch, remote and HEAD. Do not reset/clean/force-push or overwrite local changes; fetch/pull --ff-only only if safe.
2. Read `ai-collaboration/README.md`, `STATUS.md`, `REPORT.md`, `REVIEW.md`, current task, and inspect existing backend/frontend code and schema.
3. **Read-only reconciliation**: prior protected `StudyAIDb` baseline was **97 users**, latest Antigravity report says **119**. Identify whether these refer to the same SQL instance/database/time, review available read-only audit/backup history and sanitized aggregate metadata. Report what is proven, unknown, and whether 22 additional accounts are explainable. Never alter/delete accounts or claim 'zero writes' from user count alone. Do not expose user records, credentials or personal data.
4. **Never write/migrate/seed/reset/restore `StudyAIDb`**, nor alter the 15 historical accidental accounts or `DatabaseSafetyGuard`. Test writes/migrations only to `StudyAIDb_E2E` or `StudyAIDb_Clean_{GUID}`, after verifying effective connection strings, target SQL instance, database guard and permissions. If isolation cannot be proven, STOP and report BLOCKED before any write.
5. No automatic production migrations, no credentials committed, no hardcoded test accounts in application code.

## 1. Discovery & design
- Inspect existing teacher/classroom/assignment/submission pages, services, mocks, routes, backend controllers/services/entities/DTOs, DbContext, migrations, auth/RBAC, and conventions.
- Inventory implemented vs mocked vs missing functionality; reuse existing APIs/schema where possible; avoid duplicate entities or breaking Phase 18/19.
- Define minimal data model and API contract before implementing; keep a concise design note in `docs/phase-20.md`.
- Use ASP.NET Core .NET 10, EF Core, SQL Server, React 19/TypeScript/Vite, existing JWT/session and role enforcement.

## 2. Classroom
- Teacher create/list/detail/edit classes they own; manage enrollment (add/list/remove learner), reject duplicate enrollment; learner lists only enrolled classes.
- Validate IDs, roles, permissions, membership, ownership, pagination/limits as appropriate. Deny cross-class access (403/404 as existing convention).

## 3. Assignment
- Teacher create/list/detail/edit assignments for owned classes, set title, description, due date and open/closed state.
- Learner list/detail assignments only for enrolled classes; show due date and status.
- Define consistent policy for deadline, closing and edits after submissions. Do not delete/overwrite submitted learner work inadvertently.

## 4. Submission & grading
- Learner submit **text** response only to enrolled, open, eligible assignments; store submitted timestamp and content.
- Define and test duplicate submission/resubmission and late-submission policy; avoid race-condition duplicates via DB constraints/transaction where relevant.
- Teacher sees submissions for owned classes and grades with bounded score and feedback; learner sees **only their own** result.
- Prevent learner grade manipulation, teacher cross-class grading and data leakage.
- Keep this phase simple: no file uploads, plagiarism detection, auto-grading, microservices or queues.

## 5. Frontend
- Integrate existing Teacher/Classroom/Assignment screens with real authenticated API. Replace relevant authenticated mock/localStorage data flows; tests/demo can use explicit mocks.
- Add loading/empty/error states, validation, role-aware routing, stale-state refresh and persistence across reload.
- Preserve working UI and P20-000 auth/menu behavior. Keep necessary functional buttons (create/save/submit/grade); do not reintroduce duplicate auth/admin navigation.
- Backend remains authority for permissions; frontend route guards are not sufficient.

## 6. Tests and evidence
- Backend unit/integration: classroom ownership, enrollment uniqueness, role validation, assignment deadline/status, submission duplication, grading permissions, learner privacy, cross-class denial, 401/403/404.
- Frontend Vitest: authenticated API loading, forms, validation, error states, learner/teacher views, no silent mock fallback.
- Playwright real FE+BE+SQL test DB: teacher login → create class → enroll learner → create assignment → learner login → submit → teacher grades → learner sees score/feedback → reload confirms persistence; include negative authorization cases.
- Run dotnet build, backend unit/integration tests, frontend lint/Vitest/build, E2E and GitHub Actions. Mark unrun tests NOT RUN or BLOCKED; preserve screenshots/manifest under `docs/visual-qa/phase-20/`.
- Record database name/instance and sanitized pre/post safety evidence; never assert main DB untouched solely from count.

## 7. Handoff
- Implement incrementally, commit and push safely to main per repository conventions; do not overwrite unrelated work.
- Update `docs/phase-20.md`, `ai-collaboration/REPORT.md`, `STATUS.md`, append `HISTORY.md`.
- **Do not edit `TASK.md` or `REVIEW.md`** (ChatGPT-owned).
- REPORT must contain task ID, actual root findings, entities/migrations/endpoints, changed files, mock removal, test counts, CI URL/SHA, E2E artifacts, DB isolation verification, 97→119 reconciliation status, limitations and blockers.
- Stop after P20-001 and await ChatGPT review; do not self-approve or start Phase 21.

**Start P20-001 now. If DB safety preflight is blocked, report without performing DB writes.**
